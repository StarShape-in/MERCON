import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { validateTripSchedule } from './tripValidationService';

describe('validateTripSchedule', () => {
  describe('Valid Trip Schedules', () => {
    it('accepts same-day schedule with planned_end strictly after planned_start', () => {
      const start = new Date('2026-09-05T05:00:00.000Z');
      const end = new Date('2026-09-05T17:00:00.000Z');
      const result = validateTripSchedule(start, end);
      assert.equal(result.isValid, true);
      assert.equal(result.error, undefined);
    });

    it('accepts multi-day schedule with planned_end days after planned_start', () => {
      const start = new Date('2026-09-05T05:00:00.000Z');
      const end = new Date('2026-09-06T17:00:00.000Z');
      const result = validateTripSchedule(start, end);
      assert.equal(result.isValid, true);
    });

    it('accepts a trip where planned_end is omitted/undefined', () => {
      const start = new Date('2026-09-05T05:00:00.000Z');
      const result = validateTripSchedule(start, undefined);
      assert.equal(result.isValid, true);
    });

    it('accepts stops with valid chronological progression within trip window', () => {
      const start = new Date('2026-09-05T05:00:00.000Z');
      const stop1 = new Date('2026-09-05T08:00:00.000Z');
      const stop2 = new Date('2026-09-05T12:00:00.000Z');
      const end = new Date('2026-09-05T17:00:00.000Z');

      const stops = [
        { sequence: 1, stop_type: 'Pickup', planned_arrival: stop1 },
        { sequence: 2, stop_type: 'Dropoff', planned_arrival: stop2 },
      ];

      const result = validateTripSchedule(start, end, stops);
      assert.equal(result.isValid, true);
    });

    it('accepts valid stop departure >= stop arrival', () => {
      const start = new Date('2026-09-05T05:00:00.000Z');
      const stopArrival = new Date('2026-09-05T08:00:00.000Z');
      const stopDeparture = new Date('2026-09-05T09:00:00.000Z');
      const end = new Date('2026-09-05T17:00:00.000Z');

      const stops = [
        { sequence: 1, planned_arrival: stopArrival, planned_departure: stopDeparture },
      ];

      const result = validateTripSchedule(start, end, stops);
      assert.equal(result.isValid, true);
    });
  });

  describe('Invalid Trip Schedules (Must Be Rejected)', () => {
    it('rejects schedule where drop-off date is days before start date (Sep 5 05:00 AM -> Sep 1 05:00 PM)', () => {
      const start = new Date('2026-09-05T05:00:00.000Z');
      const end = new Date('2026-09-01T17:00:00.000Z');
      const result = validateTripSchedule(start, end);
      assert.equal(result.isValid, false);
      assert.ok(result.error?.includes('strictly later than planned start time'));
    });

    it('rejects same-day schedule where drop-off is 1 minute before start (Sep 5 05:00 AM -> Sep 5 04:59 AM)', () => {
      const start = new Date('2026-09-05T05:00:00.000Z');
      const end = new Date('2026-09-05T04:59:00.000Z');
      const result = validateTripSchedule(start, end);
      assert.equal(result.isValid, false);
      assert.ok(result.error?.includes('strictly later than planned start time'));
    });

    it('rejects schedule where planned_end is identical to planned_start (zero duration)', () => {
      const start = new Date('2026-09-05T05:00:00.000Z');
      const end = new Date('2026-09-05T05:00:00.000Z');
      const result = validateTripSchedule(start, end);
      assert.equal(result.isValid, false);
      assert.ok(result.error?.includes('strictly later than planned start time'));
    });

    it('rejects invalid Date objects (NaN timestamps)', () => {
      const start = new Date('invalid-date');
      const end = new Date('2026-09-05T17:00:00.000Z');
      const result = validateTripSchedule(start, end);
      assert.equal(result.isValid, false);
      assert.ok(result.error?.includes('Invalid planned start'));
    });

    it('rejects stop arrival that occurs before trip planned_start', () => {
      const start = new Date('2026-09-05T08:00:00.000Z');
      const end = new Date('2026-09-05T17:00:00.000Z');
      const earlyStop = new Date('2026-09-05T06:00:00.000Z');

      const stops = [
        { sequence: 1, planned_arrival: earlyStop },
      ];

      const result = validateTripSchedule(start, end, stops);
      assert.equal(result.isValid, false);
      assert.ok(result.error?.includes('cannot be before the trip planned start time'));
    });

    it('rejects stop arrival that occurs after trip planned_end', () => {
      const start = new Date('2026-09-05T08:00:00.000Z');
      const end = new Date('2026-09-05T17:00:00.000Z');
      const lateStop = new Date('2026-09-05T18:00:00.000Z');

      const stops = [
        { sequence: 1, planned_arrival: lateStop },
      ];

      const result = validateTripSchedule(start, end, stops);
      assert.equal(result.isValid, false);
      assert.ok(result.error?.includes('cannot be after the trip planned end time'));
    });

    it('rejects out-of-order stop arrivals (stop 2 earlier than stop 1)', () => {
      const start = new Date('2026-09-05T05:00:00.000Z');
      const end = new Date('2026-09-05T17:00:00.000Z');
      const stop1 = new Date('2026-09-05T12:00:00.000Z');
      const stop2 = new Date('2026-09-05T09:00:00.000Z');

      const stops = [
        { sequence: 1, planned_arrival: stop1 },
        { sequence: 2, planned_arrival: stop2 },
      ];

      const result = validateTripSchedule(start, end, stops);
      assert.equal(result.isValid, false);
      assert.ok(result.error?.includes('cannot be earlier than previous stop'));
    });

    it('rejects stop departure earlier than stop arrival', () => {
      const start = new Date('2026-09-05T05:00:00.000Z');
      const end = new Date('2026-09-05T17:00:00.000Z');
      const stopArrival = new Date('2026-09-05T10:00:00.000Z');
      const stopDeparture = new Date('2026-09-05T09:00:00.000Z');

      const stops = [
        { sequence: 1, planned_arrival: stopArrival, planned_departure: stopDeparture },
      ];

      const result = validateTripSchedule(start, end, stops);
      assert.equal(result.isValid, false);
      assert.ok(result.error?.includes('cannot be earlier than its planned arrival'));
    });
  });
});
