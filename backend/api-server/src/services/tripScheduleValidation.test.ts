import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { validateTripSchedule, validateTripStops } from './tripValidationService';

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

describe('Multi-Stop Round Trip Architecture Tests', () => {
  describe('validateTripStops', () => {
    it('accepts valid single-leg stops (all leg_index = 0)', () => {
      const stops = [
        { stop_sequence: 1, leg_index: 0, stop_type: 'Pickup', location_name: 'Riyadh DC' },
        { stop_sequence: 2, leg_index: 0, stop_type: 'Dropoff', location_name: 'Al Kharj Depot' },
        { stop_sequence: 3, leg_index: 0, stop_type: 'Dropoff', location_name: 'Dammam Port' },
      ];
      const res = validateTripStops(stops);
      assert.equal(res.isValid, true);
      assert.equal(res.error, undefined);
    });

    it('accepts asymmetric round-trip stops with independent Outbound (leg 0) and Return (leg 1)', () => {
      const stops = [
        // Outbound: Riyadh -> Al Baha -> Abha -> Al Ahsa
        { stop_sequence: 1, leg_index: 0, stop_type: 'Pickup', location_name: 'Riyadh' },
        { stop_sequence: 2, leg_index: 0, stop_type: 'Dropoff', location_name: 'Al Baha' },
        { stop_sequence: 3, leg_index: 0, stop_type: 'Dropoff', location_name: 'Abha' },
        { stop_sequence: 4, leg_index: 0, stop_type: 'Dropoff', location_name: 'Al Ahsa' },
        // Return: Al Ahsa -> Jeddah -> Taif -> Riyadh
        { stop_sequence: 5, leg_index: 1, stop_type: 'Pickup', location_name: 'Al Ahsa' },
        { stop_sequence: 6, leg_index: 1, stop_type: 'Dropoff', location_name: 'Jeddah' },
        { stop_sequence: 7, leg_index: 1, stop_type: 'Dropoff', location_name: 'Taif' },
        { stop_sequence: 8, leg_index: 1, stop_type: 'Dropoff', location_name: 'Riyadh' },
      ];
      const res = validateTripStops(stops);
      assert.equal(res.isValid, true);
      assert.equal(res.error, undefined);
    });

    it('rejects stops if leg_index reverts from leg 1 back to leg 0', () => {
      const stops = [
        { stop_sequence: 1, leg_index: 0, stop_type: 'Pickup', location_name: 'Riyadh' },
        { stop_sequence: 2, leg_index: 1, stop_type: 'Pickup', location_name: 'Dammam' },
        { stop_sequence: 3, leg_index: 0, stop_type: 'Dropoff', location_name: 'Jeddah' },
      ];
      const res = validateTripStops(stops);
      assert.equal(res.isValid, false);
      assert.match(res.error || '', /cannot revert to leg 0 after leg 1/i);
    });

    it('rejects negative leg_index', () => {
      const stops = [
        { stop_sequence: 1, leg_index: -1, stop_type: 'Pickup', location_name: 'Riyadh' },
      ];
      const res = validateTripStops(stops);
      assert.equal(res.isValid, false);
      assert.match(res.error || '', /invalid negative leg_index/i);
    });

    it('rejects empty stops array', () => {
      const res = validateTripStops([]);
      assert.equal(res.isValid, false);
      assert.match(res.error || '', /at least one stop/i);
    });
  });

  describe('Legacy [RETURN: ...] parsing and leg_index assignment', () => {
    it('assigns leg_index 0 to outbound stops and leg_index 1 to return stops without reversing', () => {
      const originStr = 'Riyadh';
      const destinationStr = 'Al Baha → Abha → Al Ahsa [RETURN: Al Ahsa → Jeddah → Taif → Riyadh]';

      const stopsList: Array<{ stop_sequence: number; leg_index: number; stop_type: string; location_name: string }> = [];
      let seq = 1;
      stopsList.push({ stop_sequence: seq++, leg_index: 0, stop_type: 'Pickup', location_name: originStr });

      const parts = destinationStr.split(/\[RETURN:\s*/i);
      const outboundStr = parts[0].trim();
      const returnStr = parts[1].replace(']', '').trim();

      const splitChain = (str: string) => str.split(/\s*(?:→|->|-->)\s*/).map(s => s.trim()).filter(Boolean);

      splitChain(outboundStr).forEach((item) => {
        stopsList.push({ stop_sequence: seq++, leg_index: 0, stop_type: 'Dropoff', location_name: item });
      });

      const returnItems = splitChain(returnStr);
      stopsList.push({ stop_sequence: seq++, leg_index: 1, stop_type: 'Pickup', location_name: returnItems[0] });
      returnItems.slice(1).forEach((item) => {
        stopsList.push({ stop_sequence: seq++, leg_index: 1, stop_type: 'Dropoff', location_name: item });
      });

      assert.equal(stopsList.length, 8);
      // Outbound stops
      assert.deepEqual(
        stopsList.filter(s => s.leg_index === 0).map(s => s.location_name),
        ['Riyadh', 'Al Baha', 'Abha', 'Al Ahsa']
      );
      // Return stops
      assert.deepEqual(
        stopsList.filter(s => s.leg_index === 1).map(s => s.location_name),
        ['Al Ahsa', 'Jeddah', 'Taif', 'Riyadh']
      );
      // Sequence numbers strictly continuous 1..8
      assert.deepEqual(
        stopsList.map(s => s.stop_sequence),
        [1, 2, 3, 4, 5, 6, 7, 8]
      );
    });
  });
});

