import { Request, Response } from 'express';
import { prisma } from '../index';
import { logger } from '../utils/logger';
import { TripStatus, DocType } from '@prisma/client';
import { isValidTransition, completeTripAndInvoice, stampStopTransition, stampWorkflowTransition, type DelayDetection } from '../services/tripLifecycle';
import { notifyOperatorsOfDelay } from './notificationController';
import { getDrivingRoute, RoutingUnavailableError } from '../services/routing/routeProvider';

/**
 * Everything the driver's app needs about a trip, in one shape.
 *
 * Defined once because every endpoint here returns a trip and they used to
 * each build their own include — some with `stops: true`, which returns the
 * stop's columns but not its Location, so which endpoint the app happened to
 * call decided whether the driver saw a route or a pair of coordinates.
 *
 * Stops carry both halves of "where": `location` is the lane endpoint
 * ("Jeddah"), while location_name/location_address/lat/lng are the exact yard
 * inside it that the driver actually drives to.
 */
const tripInclude = {
  customer: true,
  vehicle: true,
  stops: {
    orderBy: { stop_sequence: 'asc' as const },
    include: { location: { select: { id: true, name: true, address: true } } },
  },
};

export const getCurrentTrip = async (req: Request, res: Response) => {
  const driverId = (req as any).user?.driver_id;
  if (!driverId) return res.status(403).json({ success: false, error: { message: 'Driver not authenticated' } });

  const include = tripInclude;

  try {
    // Prefer an in-progress / dispatched trip.
    let trip = await prisma.trip.findFirst({
      where: {
        driverId,
        deletedAt: null,
        status: {
          in: [TripStatus.Draft, TripStatus.Scheduled, TripStatus.Loading, TripStatus.InTransit, TripStatus.Delayed]
        }
      },
      include,
      orderBy: { updatedAt: 'desc' },
    });

    // Otherwise show the next upcoming trip that's assigned but not yet dispatched
    // (created for this driver in the operator panel).
    if (!trip) {
      trip = await prisma.trip.findFirst({
        where: { driverId, deletedAt: null, status: { in: [TripStatus.Draft, TripStatus.Scheduled] } },
        include,
        orderBy: [{ planned_start: 'asc' }, { createdAt: 'asc' }],
      });
    }

    res.json({ success: true, data: trip ?? null });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
};

/**
 * Past trips for the logged-in driver: finished, invoiced, or cancelled,
 * newest first. Supports ?limit (default 30, max 100).
 */
export const getTripHistory = async (req: Request, res: Response) => {
  const driverId = (req as any).user?.driver_id;
  if (!driverId) return res.status(403).json({ success: false, error: { message: 'Driver not authenticated' } });

  const parsedLimit = parseInt(String(req.query.limit ?? ''), 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 100) : 30;

  try {
    const trips = await prisma.trip.findMany({
      where: {
        driverId,
        deletedAt: null,
        status: { in: [TripStatus.Completed, TripStatus.Invoiced, TripStatus.Cancelled] },
      },
      include: tripInclude,
      orderBy: [{ actual_end: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });

    res.json({ success: true, data: trips });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
};

/** Scheduled/upcoming trips for the logged-in driver. */
export const getScheduledTrips = async (req: Request, res: Response) => {
  const driverId = (req as any).user?.driver_id;
  if (!driverId) return res.status(403).json({ success: false, error: { message: 'Driver not authenticated' } });

  try {
    const trips = await prisma.trip.findMany({
      where: {
        driverId,
        deletedAt: null,
        status: { in: [TripStatus.Draft, TripStatus.Scheduled] },
      },
      include: tripInclude,
      orderBy: [{ planned_start: 'asc' }, { createdAt: 'asc' }],
      take: 20,
    });

    res.json({ success: true, data: trips });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
};

/** Fetch details for a specific trip by ID for the logged-in driver. */
export const getMobileTripDetails = async (req: Request, res: Response) => {
  const idStr = String(req.params.id || '');

  try {
    const trip = await prisma.trip.findFirst({
      where: {
        OR: [
          { id: idStr },
          { ref_id: idStr },
        ],
        deletedAt: null,
      },
      include: tripInclude,
    });

    if (!trip) {
      return res.status(404).json({ success: false, error: { message: 'Trip not found' } });
    }

    res.json({ success: true, data: trip });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
};

export const updateTripStatus = async (req: Request, res: Response) => {
  const driverId = (req as any).user?.driver_id;
  const id = req.params.id as string;
  const { status, driver_workflow_state, reason } = req.body;

  if (!driverId) return res.status(403).json({ success: false, error: { message: 'Driver not authenticated' } });
  
  if (!Object.values(TripStatus).includes(status)) {
    return res.status(400).json({ success: false, error: { message: 'Invalid status' } });
  }

  try {
    const trip = await prisma.trip.findFirst({
      where: { id, driverId, deletedAt: null }
    });

    if (!trip) {
      return res.status(404).json({ success: false, error: { message: 'Trip not found or not assigned to you' } });
    }
    if (!isValidTransition(trip.status, status)) {
      return res.status(400).json({ success: false, error: { message: 'That status change is not allowed from the trip\'s current state' } });
    }

    if (status === TripStatus.Completed) {
      const updatedTrip = await prisma.$transaction(async (tx) => {
        await stampWorkflowTransition(tx, id, driver_workflow_state ?? 'COMPLETED');
        const ut = await completeTripAndInvoice(tx, id, null);
        return tx.trip.update({
          where: { id: ut.id },
          data: {
            driver_workflow_state: driver_workflow_state ?? 'COMPLETED',
          },
        });
      });
      const full = await prisma.trip.findUnique({
        where: { id: updatedTrip.id },
        include: tripInclude,
      });
      return res.json({ success: true, data: full });
    }

    let delay: DelayDetection | null = null;
    const updatedTrip = await prisma.$transaction(async (tx) => {
      if (driver_workflow_state) {
        await stampWorkflowTransition(tx, id, driver_workflow_state);
      }
      delay = await stampStopTransition(tx, id, status as TripStatus);
      return tx.trip.update({
        where: { id },
        data: {
          status,
          driver_workflow_state: driver_workflow_state !== undefined ? driver_workflow_state : undefined,
          notes: reason ? `[DELAY REPORT]: ${reason}` : undefined,
          actual_start: status === TripStatus.InTransit && !trip.actual_start ? new Date() : undefined,
        },
        include: tripInclude
      });
    });

    // This is the path the GPS geofence takes, so it is where most real
    // delays surface. Fired post-commit, and never allowed to fail the
    // driver's status update.
    if (delay) await notifyOperatorsOfDelay(delay);

    res.json({ success: true, data: updatedTrip });
  } catch (error: any) {
    logger.error({ err: error }, 'updateTripStatus error:');
    res.status(500).json({ success: false, error: { message: error?.message || 'Failed to update trip status' } });
  }
};

import { compressUploadedImage } from '../services/imageCompressor';

/**
 * Upload a trip photo (cargo at pickup, or POD at delivery) and attach it to the
 * trip as a Document. Expects multipart form-data: file field "file" + "kind".
 */
export const uploadTripPhoto = async (req: Request, res: Response) => {
  const driverId = (req as any).user?.driver_id;
  const id = req.params.id as string;
  const kind = req.body?.kind === 'pod' ? 'pod' : 'cargo';

  if (!driverId) return res.status(403).json({ success: false, error: { message: 'Driver not authenticated' } });
  if (!req.file) return res.status(400).json({ success: false, error: { message: 'No photo uploaded' } });

  try {
    const trip = await prisma.trip.findFirst({ where: { id, driverId, deletedAt: null } });
    if (!trip) return res.status(404).json({ success: false, error: { message: 'Trip not found or not assigned to you' } });

    const { location_lat, location_lng, captured_at, leg_index, operation } = req.body || {};
    const notes = (location_lat && location_lng)
      ? `📍 [GPS: ${location_lat}, ${location_lng}] Captured: ${captured_at || new Date().toISOString()}`
      : undefined;

    // Compress image if photo (compressUploadedImage safely skips videos and PDFs)
    await compressUploadedImage(req.file.path);

    const ext = (req.file.originalname || req.file.filename).split('.').pop()?.toLowerCase() || '';
    let mimeType = req.file.mimetype;
    if (!mimeType || mimeType === 'application/octet-stream') {
      if (ext === 'mp4') mimeType = 'video/mp4';
      else if (ext === 'mov') mimeType = 'video/quicktime';
      else if (ext === 'webm') mimeType = 'video/webm';
      else if (ext === 'jpg' || ext === 'jpeg') mimeType = 'image/jpeg';
      else if (ext === 'png') mimeType = 'image/png';
      else mimeType = 'image/jpeg';
    }

    const userId = (req as any).user?.id;
    const isValidUuid = typeof userId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

    const document = await prisma.document.create({
      data: {
        entity_type: 'Trip',
        entity_id: id,
        // No dedicated "cargo photo" enum value; POD for delivery, Waybill for pickup cargo.
        doc_type: kind === 'pod' ? DocType.POD : DocType.Waybill,
        file_url: `/uploads/${req.file.filename}`,
        mime_type: mimeType,
        ocr_raw_text: notes,
        ai_extracted_json: {
          gps: (location_lat && location_lng) ? { latitude: location_lat, longitude: location_lng, captured_at } : undefined,
          leg_index: leg_index !== undefined ? Number(leg_index) : undefined,
          operation: operation || undefined,
        },
        created_by: isValidUuid ? userId : undefined,
      },
    });

    res.status(201).json({ success: true, data: document });
  } catch (error: any) {
    logger.error({ err: error }, 'uploadTripPhoto error:');
    res.status(500).json({ success: false, error: { message: error?.message || 'Failed to upload photo' } });
  }
};

/**
 * The road route from the driver's current position to the stop they are
 * heading for.
 *
 * The destination is derived here, not accepted from the caller. That is
 * deliberate: an endpoint that routed to arbitrary coordinates would turn
 * MERCON into a free routing proxy for anyone holding a driver token, and the
 * driver app never needed that freedom — it only ever asks for the stop the
 * trip says is next.
 *
 * Which stop that is mirrors the app: a Dispatched trip is still heading to
 * the pickup, anything later is heading to the dropoff.
 */
export const getTripRoute = async (req: Request, res: Response) => {
  const driverId = (req as any).user?.driver_id;
  const id = req.params.id as string;

  if (!driverId) {
    return res.status(403).json({ success: false, error: { message: 'Driver not authenticated' } });
  }

  const fromLat = Number(req.query.from_lat);
  const fromLng = Number(req.query.from_lng);
  if (!Number.isFinite(fromLat) || !Number.isFinite(fromLng)) {
    return res.status(400).json({
      success: false,
      error: { message: 'from_lat and from_lng are required' },
    });
  }

  try {
    // Same ownership check every other mobile trip endpoint uses: a trip that
    // is not this driver's is indistinguishable from one that does not exist.
    const trip = await prisma.trip.findFirst({
      where: { id, driverId, deletedAt: null },
      select: {
        status: true,
        stops: {
          select: { stop_sequence: true, stop_type: true, location_lat: true, location_lng: true, actual_arrival: true },
          orderBy: { stop_sequence: 'asc' },
        },
      },
    });

    if (!trip) {
      return res.status(404).json({
        success: false,
        error: { message: 'Trip not found or not assigned to you' },
      });
    }

    const target = trip.stops.find((s) => s.actual_arrival === null);

    if (!target || target.location_lat == null || target.location_lng == null) {
      return res.status(404).json({
        success: false,
        error: { message: 'That stop has no coordinates to route to' },
      });
    }

    const route = await getDrivingRoute(
      { lat: fromLat, lng: fromLng },
      { lat: target.location_lat, lng: target.location_lng },
    );

    return res.json({ success: true, data: route });
  } catch (error) {
    // A routing outage is not a MERCON outage. 503 tells the app to carry on
    // without a drawn route, which is exactly what it did when the old direct
    // OSRM call failed — the driver keeps the map, the marker and the distance.
    if (error instanceof RoutingUnavailableError) {
      return res.status(503).json({
        success: false,
        error: { message: 'Routing is temporarily unavailable' },
      });
    }
    return res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
};
