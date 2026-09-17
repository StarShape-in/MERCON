import assert from 'node:assert/strict';
import { test, describe } from 'node:test';

/**
 * Unit tests for Driver GPS location validation logic.
 * Ensures location updates adhere to active trip lifecycle and security rules.
 */

describe('Driver GPS Location Logic Validation', () => {
  const ACTIVE_STATUSES = ['Loading', 'InTransit', 'Delayed'];
  const INACTIVE_STATUSES = ['Scheduled', 'Draft', 'Completed', 'Cancelled', 'Invoiced'];

  function validateCoordinates(latRaw: any, lngRaw: any): boolean {
    const lat = parseFloat(latRaw);
    const lng = parseFloat(lngRaw);
    if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
      return false;
    }
    return true;
  }

  function canRecordLocation(trip: { driverId: string; status: string } | null, authenticatedDriverId: string): { allowed: boolean; reason?: string } {
    if (!trip) {
      return { allowed: false, reason: 'TRIP_NOT_FOUND' };
    }
    if (trip.driverId !== authenticatedDriverId) {
      return { allowed: false, reason: 'UNAUTHORIZED_DRIVER' };
    }
    if (!ACTIVE_STATUSES.includes(trip.status)) {
      return { allowed: false, reason: 'TRIP_INACTIVE' };
    }
    return { allowed: true };
  }

  test('accepts valid coordinates on an active InTransit trip owned by the driver', () => {
    const trip = { driverId: 'driver-123', status: 'InTransit' };
    const res = canRecordLocation(trip, 'driver-123');
    assert.strictEqual(res.allowed, true);
    assert.strictEqual(validateCoordinates(24.612687, 46.844382), true);
  });

  test('accepts valid coordinates on a Loading trip', () => {
    const trip = { driverId: 'driver-123', status: 'Loading' };
    const res = canRecordLocation(trip, 'driver-123');
    assert.strictEqual(res.allowed, true);
  });

  test('accepts valid coordinates on a Delayed trip', () => {
    const trip = { driverId: 'driver-123', status: 'Delayed' };
    const res = canRecordLocation(trip, 'driver-123');
    assert.strictEqual(res.allowed, true);
  });

  test('rejects location submissions when driver ID does not match trip owner', () => {
    const trip = { driverId: 'driver-123', status: 'InTransit' };
    const res = canRecordLocation(trip, 'driver-999');
    assert.strictEqual(res.allowed, false);
    assert.strictEqual(res.reason, 'UNAUTHORIZED_DRIVER');
  });

  test('rejects location submissions for Completed trips', () => {
    const trip = { driverId: 'driver-123', status: 'Completed' };
    const res = canRecordLocation(trip, 'driver-123');
    assert.strictEqual(res.allowed, false);
    assert.strictEqual(res.reason, 'TRIP_INACTIVE');
  });

  test('rejects location submissions for Cancelled trips', () => {
    const trip = { driverId: 'driver-123', status: 'Cancelled' };
    const res = canRecordLocation(trip, 'driver-123');
    assert.strictEqual(res.allowed, false);
    assert.strictEqual(res.reason, 'TRIP_INACTIVE');
  });

  test('rejects location submissions for Scheduled / Draft trips before work starts', () => {
    for (const status of ['Scheduled', 'Draft']) {
      const trip = { driverId: 'driver-123', status };
      const res = canRecordLocation(trip, 'driver-123');
      assert.strictEqual(res.allowed, false);
      assert.strictEqual(res.reason, 'TRIP_INACTIVE');
    }
  });

  test('validates coordinate range constraints', () => {
    assert.strictEqual(validateCoordinates(95.0, 46.0), false);  // lat > 90
    assert.strictEqual(validateCoordinates(-91.0, 46.0), false); // lat < -90
    assert.strictEqual(validateCoordinates(24.0, 185.0), false); // lng > 180
    assert.strictEqual(validateCoordinates(24.0, -185.0), false); // lng < -180
    assert.strictEqual(validateCoordinates('abc', 46.0), false); // NaN
  });
});
