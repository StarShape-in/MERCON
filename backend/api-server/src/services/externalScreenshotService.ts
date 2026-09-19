import path from 'path';
import { prisma } from '../db';
import { logger } from '../utils/logger';
import { TripStatus, DocType } from '@prisma/client';
import {
  isValidTransition,
  completeTripAndInvoice,
  stampStopTransition,
  stampWorkflowTransition,
  resolveAuthoritativeActiveStop,
  type DelayDetection,
} from './tripLifecycle';
import { notifyOperatorsOfDelay } from '../controllers/notificationController';
import { compressUploadedImage } from './imageCompressor';
import { analyzeExternalScreenshotWithAI, ExternalScreenshotResult } from './ocrService';

export const tripInclude = {
  customer: true,
  vehicle: true,
  quotation: {
    select: {
      id: true,
      name: true,
      line_type: true,
      operation_type: true,
      rate: true,
      driver_payout: true,
      stops: {
        orderBy: { sequence: 'asc' as const },
        include: { location: { select: { id: true, name: true, address: true, code: true } } },
      },
    },
  },
  stops: {
    orderBy: { stop_sequence: 'asc' as const },
    include: { location: { select: { id: true, name: true, address: true, code: true } } },
  },
};

export const formatMobileTrip = (trip: any) => {
  if (!trip) return trip;
  const rawPayout = trip.driver_payout ?? trip.driver_charge ?? trip.trip_charges ?? trip.quotation?.driver_payout;
  const payout = rawPayout != null ? Number(rawPayout) : 0;
  return {
    ...trip,
    driver_payout: payout,
    driver_charge: payout,
    trip_charges: payout,
  };
};

export const attachTripDocuments = async (trip: any) => {
  if (!trip) return trip;
  let docs: any[] = [];
  try {
    docs = await prisma.document.findMany({
      where: { entity_type: 'Trip', entity_id: trip.id, deletedAt: null },
      select: {
        id: true,
        doc_type: true,
        file_url: true,
        mime_type: true,
        createdAt: true,
        ai_extracted_json: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  } catch (e) {
    logger.warn({ err: e }, 'Failed to attach trip documents:');
  }
  const authoritative_active_stop = resolveAuthoritativeActiveStop(
    trip.stops,
    trip.driver_workflow_state,
    trip.status,
  );
  return formatMobileTrip({ ...trip, documents: docs, authoritative_active_stop });
};

export interface ProcessExternalScreenshotParams {
  tripId: string;
  filePath: string;
  mimeType?: string;
  userId?: string | null;
  driverId?: string | null;
  autoApply?: boolean;
}

export interface ProcessExternalScreenshotResponse {
  document_id: string;
  extraction_status: 'SUCCESS' | 'NEEDS_REVIEW' | 'FAILED';
  event_type: string | null;
  event_timestamp: string | null;
  stop_location_name: string | null;
  external_reference: string | null;
  detected_text: string | null;
  is_wrong_trip: boolean;
  extraction_error: string | null;
  confidence: number;
  applied: boolean;
  can_confirm: boolean;
  target_status: TripStatus | null;
  target_workflow_state: string | null;
  notes: string | null;
  validation_reason: string | null;
  trip: any | null;
}

/**
 * Shared External App Screenshot Processing Service
 * Used by both Mobile Driver App endpoints and future Web Dashboard endpoints.
 */
export async function processExternalScreenshot(
  params: ProcessExternalScreenshotParams
): Promise<ProcessExternalScreenshotResponse> {
  const { tripId, filePath, mimeType, userId, driverId, autoApply = true } = params;

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, deletedAt: null },
    include: tripInclude,
  });

  if (!trip) {
    const error: any = new Error('Trip not found');
    error.statusCode = 404;
    throw error;
  }

  // Driver authorization check (if driverId is supplied by caller context)
  if (driverId && trip.driverId !== driverId) {
    const error: any = new Error('Driver is not assigned to this trip');
    error.statusCode = 403;
    throw error;
  }

  if (trip.driver_workflow !== 'EXTERNAL_APP') {
    const error: any = new Error('This trip does not use the EXTERNAL_APP driver workflow');
    error.statusCode = 400;
    throw error;
  }

  // 1. Compress image
  let localFilePath = filePath;
  try {
    localFilePath = await compressUploadedImage(filePath);
  } catch (compressErr) {
    logger.warn({ err: compressErr }, 'Failed to compress screenshot image, using raw file');
  }

  const fileName = path.basename(localFilePath);
  const fileUrl = `/uploads/${fileName}`;

  // 2. Run Gemini Vision screenshot extraction with expected trip context
  const firstStop = trip.stops?.[0];
  const lastStop = trip.stops?.[trip.stops.length - 1];
  const aiResult: ExternalScreenshotResult = await analyzeExternalScreenshotWithAI(localFilePath, {
    ref_id: trip.ref_id || undefined,
    waybill_number: (trip as any).waybill_number || undefined,
    customer_name: trip.customer?.name,
    origin: firstStop?.location_name || firstStop?.location?.name || undefined,
    destination: lastStop?.location_name || lastStop?.location?.name || undefined,
  });

  // 3. Validation and lifecycle transition logic
  let applied = false;
  let canConfirm = false;
  let transitionReason: string | null = null;
  let delayNotification: DelayDetection | null = null;
  let targetStatus: TripStatus | null = null;
  let targetWorkflowState: string | null = null;

  const detectedEvent = aiResult.detected_event_type;
  const confidence = aiResult.confidence ?? 0;
  const isWrongTrip = aiResult.is_wrong_trip || false;
  const hasAiError = Boolean(aiResult.extraction_error);

  const getExpectedMilestoneForStatus = (st: TripStatus) => {
    if (st === TripStatus.Scheduled || st === TripStatus.Draft) return 'Arrived at Pickup or Loading Completed';
    if (st === TripStatus.Loading) return 'Departed Pickup (In Transit)';
    if (st === TripStatus.InTransit) return 'Arrived at Delivery or Delivery Completed';
    if (st === TripStatus.Completed || st === TripStatus.Invoiced) return 'Trip already completed';
    return 'Next operational milestone';
  };

  if (hasAiError) {
    if (aiResult.extraction_error === 'INVALID_GEMINI_API_KEY' || aiResult.notes?.includes('API key')) {
      transitionReason = 'Invalid Gemini API Key: The server has an invalid GEMINI_API_KEY configured in environment settings. Please set a valid Google AI Studio key starting with AIzaSy...';
    } else {
      transitionReason = `AI Processing Error: ${aiResult.notes || 'Unable to process image via Gemini AI. Please upload a clear screenshot.'}`;
    }
  } else if (isWrongTrip) {
    transitionReason = `Wrong trip screenshot! Screenshot shows reference (${aiResult.external_reference || 'other order'}) which does not match current trip TRP-${trip.ref_id}. Please upload screenshot for this trip only.`;
  } else if (detectedEvent && confidence >= 0.70) {
    if (detectedEvent === 'ARRIVED_AT_PICKUP') {
      targetStatus = TripStatus.Loading;
      targetWorkflowState = 'ARRIVED_AT_PICKUP';
    } else if (detectedEvent === 'LOADING_COMPLETED') {
      targetStatus = TripStatus.Loading;
      targetWorkflowState = 'LOADING_COMPLETED';
    } else if (detectedEvent === 'DEPARTED_PICKUP') {
      targetStatus = TripStatus.InTransit;
      targetWorkflowState = 'IN_TRANSIT';
    } else if (detectedEvent === 'ARRIVED_AT_DELIVERY') {
      targetStatus = TripStatus.InTransit;
      targetWorkflowState = 'ARRIVED_AT_DELIVERY';
    } else if (detectedEvent === 'DELIVERY_COMPLETED') {
      targetStatus = TripStatus.Completed;
      targetWorkflowState = 'COMPLETED';
    } else if (detectedEvent === 'DELAYED') {
      targetStatus = TripStatus.Delayed;
      targetWorkflowState = trip.driver_workflow_state || 'DELAYED';
    }

    if (targetStatus && isValidTransition(trip.status, targetStatus)) {
      const nextStatus = targetStatus;
      const nextWorkflowState = targetWorkflowState || 'IN_TRANSIT';
      canConfirm = true;
      if (autoApply) {
        try {
          delayNotification = await prisma.$transaction(async (tx) => {
            let delay: DelayDetection | null = null;
            if (nextStatus === TripStatus.Completed) {
              await stampWorkflowTransition(tx, trip.id, 'COMPLETED', undefined);
              await completeTripAndInvoice(tx, trip.id, userId || null);
              await tx.trip.update({
                where: { id: trip.id },
                data: {
                  driver_workflow_state: 'COMPLETED',
                  updated_by: userId || null,
                },
              });
            } else {
              delay = await stampStopTransition(tx, trip.id, nextStatus);
              await stampWorkflowTransition(tx, trip.id, nextWorkflowState, undefined);
              await tx.trip.update({
                where: { id: trip.id },
                data: {
                  status: nextStatus,
                  driver_workflow_state: nextWorkflowState,
                  updated_by: userId || null,
                },
              });
            }
            return delay;
          });
          applied = true;
        } catch (txErr: any) {
          logger.error({ err: txErr }, 'Failed to apply extracted lifecycle transition:');
          transitionReason = `Lifecycle execution error: ${txErr?.message || 'Unknown error'}`;
          canConfirm = false;
        }
      }
    } else {
      transitionReason = `Out-of-sequence milestone: Screenshot shows '${detectedEvent.replace(/_/g, ' ')}', but the trip is currently in '${trip.status}' state. Expected milestone for this stage: ${getExpectedMilestoneForStatus(trip.status)}.`;
    }
  } else if (detectedEvent && confidence < 0.70) {
    transitionReason = `Low AI confidence score (${Math.round(confidence * 100)}%). Text in screenshot was not clear enough to automatically verify.`;
  } else {
    transitionReason = `No operational milestone recognized: The screenshot does not show clear status text like "Arrived at Pickup", "Cargo Loaded", "In Transit", "Arrived at Delivery", or "Delivery Completed". Expected milestone for this stage: ${getExpectedMilestoneForStatus(trip.status)}.`;
  }

  // 4. Save Document record
  const extraction_status = applied ? 'SUCCESS' : (hasAiError ? 'FAILED' : (isWrongTrip ? 'FAILED' : (canConfirm ? 'NEEDS_REVIEW' : 'FAILED')));
  const docTypeVal = detectedEvent === 'DELAYED' ? DocType.Emergency : DocType.POD;

  const document = await prisma.document.create({
    data: {
      entity_type: 'Trip',
      entity_id: trip.id,
      doc_type: docTypeVal,
      file_url: fileUrl,
      mime_type: mimeType || 'image/jpeg',
      created_by: userId || null,
      executorDriverId: driverId || null,
      status: applied ? 'Verified' : 'PendingReview',
      ai_extracted_json: {
        ...aiResult,
        applied,
        canConfirm,
        targetStatus,
        targetWorkflowState,
        extraction_status,
        validation_reason: transitionReason,
        uploaded_at: new Date().toISOString(),
      },
    },
  });

  if (delayNotification) {
    notifyOperatorsOfDelay(delayNotification).catch((err) =>
      logger.warn({ err }, 'Failed to send delay notification for screenshot transition:')
    );
  }

  // 5. Fetch updated trip state
  const updatedTrip = await prisma.trip.findFirst({
    where: { id: trip.id, deletedAt: null },
    include: tripInclude,
  });
  const enrichedTrip = updatedTrip ? await attachTripDocuments(updatedTrip) : null;

  return {
    document_id: document.id,
    extraction_status,
    event_type: aiResult.detected_event_type ?? null,
    event_timestamp: aiResult.event_timestamp ?? null,
    stop_location_name: aiResult.stop_location_name ?? null,
    external_reference: aiResult.external_reference ?? null,
    detected_text: aiResult.detected_text ?? null,
    is_wrong_trip: isWrongTrip,
    extraction_error: aiResult.extraction_error || null,
    confidence: aiResult.confidence,
    applied,
    can_confirm: canConfirm,
    target_status: targetStatus,
    target_workflow_state: targetWorkflowState,
    notes: aiResult.notes || null,
    validation_reason: transitionReason,
    trip: enrichedTrip,
  };
}
