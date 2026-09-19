import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../db';
import { isValidTransition } from './tripLifecycle';
import { analyzeExternalScreenshotWithAI } from './ocrService';
import { TripStatus } from '@prisma/client';

describe('External Driver Workflow — Complete Test Suite', () => {

  describe('DATABASE / SNAPSHOT TESTS', () => {
    it('1. Customer defaults to NATIVE workflow', async () => {
      const customer = await prisma.customer.create({
        data: { name: `Test Customer Default ${Date.now()}`, contact_phone: '+966500000001' },
      });
      assert.equal(customer.driver_workflow, 'NATIVE');
    });

    it('2. Customer supports EXTERNAL_APP workflow', async () => {
      const customer = await prisma.customer.create({
        data: { name: `Test Customer External ${Date.now()}`, contact_phone: '+966500000002', driver_workflow: 'EXTERNAL_APP' },
      });
      assert.equal(customer.driver_workflow, 'EXTERNAL_APP');
    });

    it('3 & 4. Trip snapshots customer.driver_workflow at creation time', async () => {
      const custNative = await prisma.customer.create({
        data: { name: `Customer Native ${Date.now()}`, contact_phone: '+966500000003', driver_workflow: 'NATIVE' },
      });
      const custExternal = await prisma.customer.create({
        data: { name: `Customer Ext ${Date.now()}`, contact_phone: '+966500000004', driver_workflow: 'EXTERNAL_APP' },
      });

      const tripNative = await prisma.trip.create({
        data: {
          ref_id: `TRP-NAT-${Date.now()}`,
          customerId: custNative.id,
          driver_workflow: custNative.driver_workflow,
          status: TripStatus.Scheduled,
        },
      });

      const tripExternal = await prisma.trip.create({
        data: {
          ref_id: `TRP-EXT-${Date.now()}`,
          customerId: custExternal.id,
          driver_workflow: custExternal.driver_workflow,
          status: TripStatus.Scheduled,
        },
      });

      assert.equal(tripNative.driver_workflow, 'NATIVE');
      assert.equal(tripExternal.driver_workflow, 'EXTERNAL_APP');
    });

    it('5. Customer workflow changes do not mutate existing Trip workflow snapshots', async () => {
      const cust = await prisma.customer.create({
        data: { name: `Customer Snap ${Date.now()}`, contact_phone: '+966500000005', driver_workflow: 'NATIVE' },
      });

      const trip = await prisma.trip.create({
        data: {
          ref_id: `TRP-SNAP-${Date.now()}`,
          customerId: cust.id,
          driver_workflow: cust.driver_workflow,
          status: TripStatus.Scheduled,
        },
      });

      assert.equal(trip.driver_workflow, 'NATIVE');

      // Update customer workflow to EXTERNAL_APP
      await prisma.customer.update({
        where: { id: cust.id },
        data: { driver_workflow: 'EXTERNAL_APP' },
      });

      // Existing trip must remain NATIVE
      const reFetchedTrip = await prisma.trip.findUnique({ where: { id: trip.id } });
      assert.equal(reFetchedTrip?.driver_workflow, 'NATIVE');
    });
  });

  describe('LIFECYCLE TRANSITION GUARDS', () => {
    it('15. Valid ARRIVED_AT_PICKUP transition from Scheduled to Loading', () => {
      assert.equal(isValidTransition(TripStatus.Scheduled, TripStatus.Loading), true);
    });

    it('16. Valid DEPARTED_PICKUP transition from Loading to InTransit', () => {
      assert.equal(isValidTransition(TripStatus.Loading, TripStatus.InTransit), true);
    });

    it('17. Valid ARRIVED_AT_DELIVERY transition in InTransit state', () => {
      assert.equal(isValidTransition(TripStatus.InTransit, TripStatus.InTransit), true);
    });

    it('18. Valid DELIVERY_COMPLETED transition from InTransit to Completed', () => {
      assert.equal(isValidTransition(TripStatus.InTransit, TripStatus.Completed), true);
    });

    it('19. Invalid direct completion from Draft status', () => {
      assert.equal(isValidTransition(TripStatus.Draft, TripStatus.Completed), false);
    });

    it('20 & 21. Duplicate transition checks', () => {
      // Completed -> Completed is allowed as no-op update
      assert.equal(isValidTransition(TripStatus.Completed, TripStatus.Completed), true);
    });
  });

  describe('AI SCREENSHOT PARSER FALLBACKS', () => {
    it('13. Handles missing file cleanly with FILE_NOT_FOUND error', async () => {
      const res = await analyzeExternalScreenshotWithAI('/non/existent/path.png');
      assert.equal(res.detected_event_type, null);
      assert.equal(res.extraction_error, 'FILE_NOT_FOUND');
    });
  });

  describe('DELIVERY_COMPLETED & completeTrip SIDE EFFECTS', () => {
    it('completeTrip stamps dropoff timestamps, completes trip, and releases driver/vehicle', async () => {
      const cust = await prisma.customer.create({
        data: { name: `Cust SideEffects ${Date.now()}`, contact_phone: '+966500000007' },
      });
      const driver = await prisma.driver.create({
        data: {
          first_name: 'Driver',
          last_name: 'Test',
          phone_primary: `+96655${Math.floor(Math.random() * 1000000)}`,
          license_number: `LIC-${Date.now()}`,
          license_expiry: new Date('2030-01-01'),
          status: 'OnTrip',
        },
      });
      const vehicle = await prisma.vehicle.create({
        data: {
          plate_number: `V-${Date.now()}`,
          asset_type: 'Flatbed',
          capacity_kg: 10000,
          status: 'OnTrip',
        },
      });

      const trip = await prisma.trip.create({
        data: {
          ref_id: `TRP-COMP-${Date.now()}`,
          customerId: cust.id,
          driverId: driver.id,
          vehicleId: vehicle.id,
          driver_workflow: 'EXTERNAL_APP',
          status: TripStatus.InTransit,
          stops: {
            create: [
              { stop_sequence: 1, stop_type: 'Pickup', location_name: 'Riyadh Yard' },
              { stop_sequence: 2, stop_type: 'Dropoff', location_name: 'Jeddah Yard' },
            ],
          },
        },
      });

      const { completeTrip } = await import('./tripLifecycle');
      await prisma.$transaction(async (tx) => {
        await completeTrip(tx, trip.id, null);
      });

      const updatedTrip = await prisma.trip.findUnique({
        where: { id: trip.id },
        include: { stops: true, driver: true, vehicle: true },
      });

      assert.equal(updatedTrip?.status, 'Completed');
      assert.ok(updatedTrip?.actual_end);
      assert.equal(updatedTrip?.driver?.status, 'Available');
      assert.equal(updatedTrip?.vehicle?.status, 'Available');

      const dropoffStop = updatedTrip?.stops.find((s) => s.stop_type === 'Dropoff');
      assert.ok(dropoffStop?.actual_arrival);
      assert.ok(dropoffStop?.actual_departure);
    });
  });

  describe('DOCUMENT PERSISTENCE ON LOW CONFIDENCE / AI FAILURE', () => {
    it('Persists document evidence even when extraction is unapplied or low confidence', async () => {
      const cust = await prisma.customer.create({
        data: { name: `Cust DocEvid ${Date.now()}`, contact_phone: '+966500000008' },
      });
      const trip = await prisma.trip.create({
        data: {
          ref_id: `TRP-DOC-${Date.now()}`,
          customerId: cust.id,
          driver_workflow: 'EXTERNAL_APP',
          status: TripStatus.Scheduled,
        },
      });

      const doc = await prisma.document.create({
        data: {
          entity_type: 'Trip',
          entity_id: trip.id,
          doc_type: 'POD',
          file_url: '/uploads/screenshot-unapplied.jpg',
          status: 'PendingReview',
          ai_extracted_json: {
            detected_event_type: null,
            confidence: 0.3,
            applied: false,
            extraction_status: 'NEEDS_REVIEW',
            validation_reason: 'Low confidence score (30%) requires manual verification',
          },
        },
      });

      assert.ok(doc.id);
      assert.equal(doc.status, 'PendingReview');

      // Canonical trip state remains untouched
      const freshTrip = await prisma.trip.findUnique({ where: { id: trip.id } });
      assert.equal(freshTrip?.status, 'Scheduled');
    });
  });

  describe('ZOD SCHEMA & AI EXTRACTION CONTRACT SUITE', () => {
    const { validateExternalScreenshotExtraction } = require('../schemas/externalScreenshotSchema');

    it('1. ARRIVED_AT_PICKUP payload', () => {
      const input = {
        detected_event_type: 'ARRIVED_AT_PICKUP',
        event_timestamp: '2026-09-19T10:00:00Z',
        external_reference: 'WB-1001',
        stop_location_name: 'Riyadh Depot',
        is_wrong_trip: false,
        confidence: 0.95,
        notes: 'Driver app status reads Arrived at Pickup',
        detected_text: 'WB-1001 | Arrived at Pickup | 10:00',
      };
      const res = validateExternalScreenshotExtraction(input);
      assert.equal(res.schema_valid, true);
      assert.equal(res.detected_event_type, 'ARRIVED_AT_PICKUP');
      assert.equal(res.external_reference, 'WB-1001');
      assert.equal(res.confidence, 0.95);
      assert.equal(res.is_wrong_trip, false);
    });

    it('2. LOADING_COMPLETED payload', () => {
      const input = {
        detected_event_type: 'LOADING_COMPLETED',
        event_timestamp: '2026-09-19T10:30:00Z',
        external_reference: 'WB-1001',
        stop_location_name: 'Riyadh Depot',
        is_wrong_trip: false,
        confidence: 0.92,
        notes: 'Status badge displays Loading Completed',
        detected_text: 'WB-1001 | Loaded',
      };
      const res = validateExternalScreenshotExtraction(input);
      assert.equal(res.schema_valid, true);
      assert.equal(res.detected_event_type, 'LOADING_COMPLETED');
    });

    it('3. DEPARTED_PICKUP payload', () => {
      const input = {
        detected_event_type: 'DEPARTED_PICKUP',
        event_timestamp: '2026-09-19T10:45:00Z',
        external_reference: 'WB-1001',
        stop_location_name: 'Riyadh Depot',
        is_wrong_trip: false,
        confidence: 0.90,
        notes: 'Status shows En Route / Departed',
        detected_text: 'En Route to Jeddah',
      };
      const res = validateExternalScreenshotExtraction(input);
      assert.equal(res.schema_valid, true);
      assert.equal(res.detected_event_type, 'DEPARTED_PICKUP');
    });

    it('4. ARRIVED_AT_DELIVERY payload', () => {
      const input = {
        detected_event_type: 'ARRIVED_AT_DELIVERY',
        event_timestamp: '2026-09-19T14:00:00Z',
        external_reference: 'WB-1001',
        stop_location_name: 'Jeddah Yard',
        is_wrong_trip: false,
        confidence: 0.91,
        notes: 'Status badge shows Arrived at Destination',
        detected_text: 'At Destination',
      };
      const res = validateExternalScreenshotExtraction(input);
      assert.equal(res.schema_valid, true);
      assert.equal(res.detected_event_type, 'ARRIVED_AT_DELIVERY');
    });

    it('5. DELIVERY_COMPLETED payload', () => {
      const input = {
        detected_event_type: 'DELIVERY_COMPLETED',
        event_timestamp: '2026-09-19T14:30:00Z',
        external_reference: 'WB-1001',
        stop_location_name: 'Jeddah Yard',
        is_wrong_trip: false,
        confidence: 0.98,
        notes: 'POD screen confirmed with signature',
        detected_text: 'Delivered Successfully',
      };
      const res = validateExternalScreenshotExtraction(input);
      assert.equal(res.schema_valid, true);
      assert.equal(res.detected_event_type, 'DELIVERY_COMPLETED');
    });

    it('6. DELAYED payload', () => {
      const input = {
        detected_event_type: 'DELAYED',
        event_timestamp: '2026-09-19T11:00:00Z',
        external_reference: 'WB-1001',
        stop_location_name: null,
        is_wrong_trip: false,
        confidence: 0.88,
        notes: 'Traffic delay alert displayed in driver app UI',
        detected_text: 'Heavy Traffic Delay +45m',
      };
      const res = validateExternalScreenshotExtraction(input);
      assert.equal(res.schema_valid, true);
      assert.equal(res.detected_event_type, 'DELAYED');
    });

    it('7. No identifiable event payload (valid extraction, null event)', () => {
      const input = {
        detected_event_type: null,
        event_timestamp: null,
        external_reference: 'WB-1001',
        stop_location_name: null,
        is_wrong_trip: false,
        confidence: 0.20,
        notes: 'No status badge or operational milestone text found',
        detected_text: 'Welcome Driver John',
      };
      const res = validateExternalScreenshotExtraction(input);
      assert.equal(res.schema_valid, true);
      assert.equal(res.detected_event_type, null);
    });

    it('8. Blurry or invalid payload structure', () => {
      const input = {
        detected_event_type: 'INVALID_EVENT_STRING',
        confidence: 0.1,
      };
      const res = validateExternalScreenshotExtraction(input);
      assert.equal(res.schema_valid, false);
      assert.equal(res.detected_event_type, null);
    });

    it('9. Wrong-trip reference payload', () => {
      const input = {
        detected_event_type: 'DELIVERY_COMPLETED',
        event_timestamp: '2026-09-19T12:00:00Z',
        external_reference: 'WB-OTHER-9999',
        stop_location_name: 'Damman Port',
        is_wrong_trip: true,
        confidence: 0.95,
        notes: 'Waybill number WB-OTHER-9999 does not match expected trip TRP-1042',
        detected_text: 'Order WB-OTHER-9999 Delivered',
      };
      const res = validateExternalScreenshotExtraction(input);
      assert.equal(res.schema_valid, true);
      assert.equal(res.is_wrong_trip, true);
    });

    it('10. Missing timestamp payload', () => {
      const input = {
        detected_event_type: 'ARRIVED_AT_PICKUP',
        event_timestamp: null,
        external_reference: 'WB-1001',
        stop_location_name: null,
        is_wrong_trip: false,
        confidence: 0.85,
        notes: 'Status clear but no timestamp displayed in screenshot',
        detected_text: 'Arrived at Pickup',
      };
      const res = validateExternalScreenshotExtraction(input);
      assert.equal(res.schema_valid, true);
      assert.equal(res.detected_event_type, 'ARRIVED_AT_PICKUP');
      assert.equal(res.event_timestamp, null);
    });

    it('11. Missing external reference payload', () => {
      const input = {
        detected_event_type: 'LOADING_COMPLETED',
        event_timestamp: '2026-09-19T10:15:00Z',
        external_reference: null,
        stop_location_name: 'Pickup Yard A',
        is_wrong_trip: false,
        confidence: 0.80,
        notes: 'Loading completed badge visible without order reference',
        detected_text: 'Loaded',
      };
      const res = validateExternalScreenshotExtraction(input);
      assert.equal(res.schema_valid, true);
      assert.equal(res.external_reference, null);
    });

    it('12. Invalid Gemini raw output format (non-object or missing mandatory fields)', () => {
      const res = validateExternalScreenshotExtraction({ unexpected_field: 12345 });
      assert.equal(res.schema_valid, false);
      assert.equal(res.detected_event_type, null);
    });

    it('13. Confidence value above 1.0 triggers schema validation failure', () => {
      const inputBadConfidence = {
        detected_event_type: 'DEPARTED_PICKUP',
        confidence: 5.5, // invalid > 1.0
      };
      const res = validateExternalScreenshotExtraction(inputBadConfidence);
      assert.equal(res.schema_valid, false);
      assert.equal(res.confidence, 0.0);
    });

    it('14. Wrong-trip boolean validation and preservation', () => {
      const input = {
        detected_event_type: 'ARRIVED_AT_DELIVERY',
        is_wrong_trip: true,
        confidence: 0.90,
      };
      const res = validateExternalScreenshotExtraction(input);
      assert.equal(res.schema_valid, true);
      assert.equal(res.is_wrong_trip, true);
    });

    it('15. Generic UI text without explicit milestone returns valid null-event extraction', () => {
      const inputGeneric = {
        detected_event_type: null,
        event_timestamp: null,
        external_reference: 'TRP-100',
        stop_location_name: null,
        is_wrong_trip: false,
        confidence: 0.5,
        notes: 'UI displays generic text: "Trip Active" without milestone badge',
        detected_text: 'Trip Active',
      };
      const res = validateExternalScreenshotExtraction(inputGeneric);
      assert.equal(res.schema_valid, true);
      assert.equal(res.detected_event_type, null);
    });

    it('16. Invalid event type string triggers schema validation failure', () => {
      const inputInvalidEvent = {
        detected_event_type: 'UNKNOWN_CUSTOM_MILESTONE',
        confidence: 0.8,
      };
      const res = validateExternalScreenshotExtraction(inputInvalidEvent);
      assert.equal(res.schema_valid, false);
      assert.equal(res.detected_event_type, null);
    });

    it('17. Invalid field type for confidence triggers schema validation failure', () => {
      const inputWrongType = {
        detected_event_type: 'DELIVERY_COMPLETED',
        confidence: 'INVALID_STRING_CONFIDENCE',
      };
      const res = validateExternalScreenshotExtraction(inputWrongType);
      assert.equal(res.schema_valid, false);
      assert.equal(res.confidence, 0.0);
    });
  });
});
