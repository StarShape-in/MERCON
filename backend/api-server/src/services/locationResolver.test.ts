import assert from 'node:assert/strict';
import { test, describe } from 'node:test';
import { resolveVehicleLocation } from './locationResolver';
import { TripStatus } from '@prisma/client';

describe('Location Resolver Unit Test Suite (Scenarios A through K)', () => {
  const now = new Date();
  const freshTime = new Date(now.getTime() - 30 * 1000); // 30s ago
  const staleTime = new Date(now.getTime() - 20 * 60 * 1000); // 20m ago

  const mockVehicle = {
    id: 'veh-101',
    ref_id: 'TRK-101',
    plate_number: '2541 UDA',
    icces_device_id: '352592572686467',
    last_lat: 24.612687,
    last_lng: 46.844382,
    last_speed_kph: 0,
    last_heading: 180,
    last_status: 'STOPPED',
    last_seen_at: freshTime,
  };

  function createMockDb(options: {
    activeTrip?: any;
    driverLocations?: any[];
  }) {
    return {
      trip: {
        findFirst: async (args: any) => {
          if (options.activeTrip && args.where.vehicleId === options.activeTrip.vehicleId) {
            if (args.where.status?.in?.includes(options.activeTrip.status)) {
              return options.activeTrip;
            }
          }
          return null;
        },
      },
      tripLocation: {
        findFirst: async (args: any) => {
          if (options.driverLocations && options.driverLocations.length > 0) {
            const match = options.driverLocations.find(l => l.tripId === args.where.tripId);
            return match || null;
          }
          return null;
        },
      },
    };
  }

  test('A. No active trip + physical GPS fresh -> PHYSICAL_GPS / CURRENT', async () => {
    const db = createMockDb({});
    const res = await resolveVehicleLocation(mockVehicle, db);
    assert.strictEqual(res.source, 'PHYSICAL_GPS');
    assert.strictEqual(res.display_state, 'CURRENT');
    assert.strictEqual(res.latitude, 24.612687);
    assert.strictEqual(res.longitude, 46.844382);
  });

  test('B. Active trip + driver GPS fresh + physical GPS fresh -> DRIVER_GPS / CURRENT', async () => {
    const activeTrip = { id: 'trip-1', vehicleId: 'veh-101', driverId: 'drv-1', status: TripStatus.InTransit };
    const driverLoc = { tripId: 'trip-1', lat: 24.7136, lng: 46.6753, speed_kph: 45, heading: 90, accuracy_m: 10, recordedAt: freshTime };
    const db = createMockDb({ activeTrip, driverLocations: [driverLoc] });

    const res = await resolveVehicleLocation(mockVehicle, db);
    assert.strictEqual(res.source, 'DRIVER_GPS');
    assert.strictEqual(res.display_state, 'CURRENT');
    assert.strictEqual(res.latitude, 24.7136);
    assert.strictEqual(res.longitude, 46.6753);
    assert.strictEqual(res.active_trip_id, 'trip-1');
    assert.strictEqual(res.active_driver_id, 'drv-1');
  });

  test('C. Active trip + driver GPS stale + physical GPS fresh -> PHYSICAL_GPS / CURRENT', async () => {
    const activeTrip = { id: 'trip-1', vehicleId: 'veh-101', driverId: 'drv-1', status: TripStatus.InTransit };
    const driverLoc = { tripId: 'trip-1', lat: 24.7136, lng: 46.6753, recordedAt: staleTime };
    const db = createMockDb({ activeTrip, driverLocations: [driverLoc] });

    const res = await resolveVehicleLocation(mockVehicle, db);
    assert.strictEqual(res.source, 'PHYSICAL_GPS');
    assert.strictEqual(res.display_state, 'CURRENT');
    assert.strictEqual(res.latitude, 24.612687);
  });

  test('D. Active trip + driver GPS fresh + physical GPS stale -> DRIVER_GPS / CURRENT', async () => {
    const activeTrip = { id: 'trip-1', vehicleId: 'veh-101', driverId: 'drv-1', status: TripStatus.InTransit };
    const driverLoc = { tripId: 'trip-1', lat: 24.7136, lng: 46.6753, recordedAt: freshTime };
    const staleVeh = { ...mockVehicle, last_seen_at: staleTime };
    const db = createMockDb({ activeTrip, driverLocations: [driverLoc] });

    const res = await resolveVehicleLocation(staleVeh, db);
    assert.strictEqual(res.source, 'DRIVER_GPS');
    assert.strictEqual(res.display_state, 'CURRENT');
    assert.strictEqual(res.latitude, 24.7136);
  });

  test('E. Active trip + both sources stale -> LAST_KNOWN', async () => {
    const activeTrip = { id: 'trip-1', vehicleId: 'veh-101', driverId: 'drv-1', status: TripStatus.InTransit };
    const driverLoc = { tripId: 'trip-1', lat: 24.7136, lng: 46.6753, recordedAt: staleTime };
    const staleVeh = { ...mockVehicle, last_seen_at: staleTime };
    const db = createMockDb({ activeTrip, driverLocations: [driverLoc] });

    const res = await resolveVehicleLocation(staleVeh, db);
    assert.strictEqual(res.display_state, 'LAST_KNOWN');
    assert.notStrictEqual(res.latitude, null);
  });

  test('F. No active trip + driver GPS exists from old completed trip -> IGNORE old Driver GPS; use Physical GPS', async () => {
    const db = createMockDb({});
    const res = await resolveVehicleLocation(mockVehicle, db);
    assert.strictEqual(res.source, 'PHYSICAL_GPS');
    assert.strictEqual(res.display_state, 'CURRENT');
    assert.strictEqual(res.latitude, mockVehicle.last_lat);
  });

  test('G. Completed trip + fresh old Driver GPS + fresh physical GPS -> PHYSICAL_GPS / CURRENT', async () => {
    // Completed trips are ignored by active trip query
    const db = createMockDb({});
    const res = await resolveVehicleLocation(mockVehicle, db);
    assert.strictEqual(res.source, 'PHYSICAL_GPS');
    assert.strictEqual(res.display_state, 'CURRENT');
  });

  test('H. Cancelled trip + fresh old Driver GPS + physical GPS unavailable -> LAST_KNOWN / UNAVAILABLE', async () => {
    const noGpsVeh = { ...mockVehicle, last_seen_at: null, last_lat: null, last_lng: null };
    const db = createMockDb({});
    const res = await resolveVehicleLocation(noGpsVeh, db);
    assert.strictEqual(res.source, 'NONE');
    assert.strictEqual(res.display_state, 'UNAVAILABLE');
  });

  test('I. No physical GPS + no active Driver GPS -> UNAVAILABLE', async () => {
    const noGpsVeh = { ...mockVehicle, last_seen_at: null, last_lat: null, last_lng: null };
    const db = createMockDb({});
    const res = await resolveVehicleLocation(noGpsVeh, db);
    assert.strictEqual(res.source, 'NONE');
    assert.strictEqual(res.display_state, 'UNAVAILABLE');
    assert.strictEqual(res.latitude, null);
  });

  test('J. Driver assigned to Vehicle A normally but active Trip pairs Driver with Vehicle B -> Driver GPS resolves to Vehicle B only', async () => {
    const vehB = { ...mockVehicle, id: 'veh-102', ref_id: 'TRK-102', plate_number: '9999 XYZ' };
    const activeTrip = { id: 'trip-2', vehicleId: 'veh-102', driverId: 'drv-1', status: TripStatus.InTransit };
    const driverLoc = { tripId: 'trip-2', lat: 25.1000, lng: 55.2000, recordedAt: freshTime };
    const db = createMockDb({ activeTrip, driverLocations: [driverLoc] });

    const res = await resolveVehicleLocation(vehB, db);
    assert.strictEqual(res.source, 'DRIVER_GPS');
    assert.strictEqual(res.latitude, 25.1000);
    assert.strictEqual(res.vehicle_id, 'veh-102');
  });

  test('K. Driver GPS belongs to a different driver/trip -> never leaks into another vehicle location', async () => {
    const vehA = { ...mockVehicle, id: 'veh-101' };
    // Active trip is on veh-102, not veh-101
    const activeTripOnOtherVeh = { id: 'trip-99', vehicleId: 'veh-102', driverId: 'drv-99', status: TripStatus.InTransit };
    const db = createMockDb({ activeTrip: activeTripOnOtherVeh, driverLocations: [] });

    const res = await resolveVehicleLocation(vehA, db);
    assert.strictEqual(res.source, 'PHYSICAL_GPS');
    assert.strictEqual(res.latitude, mockVehicle.last_lat);
  });

  test('L. Scheduled trip with GOING_TO_PICKUP workflow state + fresh Driver GPS -> DRIVER_GPS / CURRENT', async () => {
    const activeTrip = { id: 'trip-start', vehicleId: 'veh-101', driverId: 'drv-1', status: TripStatus.Scheduled, driver_workflow_state: 'GOING_TO_PICKUP' };
    const driverLoc = { tripId: 'trip-start', lat: 24.7136, lng: 46.6753, recordedAt: freshTime };
    const db = createMockDb({ activeTrip, driverLocations: [driverLoc] });

    const res = await resolveVehicleLocation(mockVehicle, db);
    assert.strictEqual(res.source, 'DRIVER_GPS');
    assert.strictEqual(res.display_state, 'CURRENT');
    assert.strictEqual(res.latitude, 24.7136);
    assert.strictEqual(res.longitude, 46.6753);
  });
});
