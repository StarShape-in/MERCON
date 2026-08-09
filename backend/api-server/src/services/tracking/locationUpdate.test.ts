import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeMobileLocationUpdate,
  trackerLocationUpdate,
} from './locationUpdate';

const NOW = new Date('2026-08-09T12:00:00.000Z');

describe('normalizeMobileLocationUpdate', () => {
  it('accepts a well-formed reading and tags it as mobile', () => {
    const out = normalizeMobileLocationUpdate(
      { lat: 24.7136, lng: 46.6753, speed: 88, heading: 270, accuracy: 12 },
      NOW,
    );
    assert.ok(out);
    assert.equal(out.lat, 24.7136);
    assert.equal(out.lng, 46.6753);
    assert.equal(out.speed, 88);
    assert.equal(out.heading, 270);
    assert.equal(out.accuracy, 12);
    assert.equal(out.source, 'mobile');
    assert.equal(out.ingestedAt, NOW.toISOString());
  });

  // The whole point of the module: these used to reach operators' maps.
  for (const bad of [
    { name: 'null lat', raw: { lat: null, lng: 46.6 } },
    { name: 'string lat', raw: { lat: '24.7', lng: 46.6 } },
    { name: 'NaN lat', raw: { lat: NaN, lng: 46.6 } },
    { name: 'Infinity lng', raw: { lat: 24.7, lng: Infinity } },
    { name: 'missing lng', raw: { lat: 24.7 } },
    { name: 'lat out of range', raw: { lat: 91, lng: 46.6 } },
    { name: 'lng out of range', raw: { lat: 24.7, lng: 181 } },
    { name: 'boolean lat', raw: { lat: true, lng: 46.6 } },
    { name: 'empty object', raw: {} },
  ]) {
    it(`rejects ${bad.name}`, () => {
      assert.equal(normalizeMobileLocationUpdate(bad.raw as any, NOW), null);
    });
  }

  it('rejects null and undefined payloads', () => {
    assert.equal(normalizeMobileLocationUpdate(null, NOW), null);
    assert.equal(normalizeMobileLocationUpdate(undefined, NOW), null);
  });

  it('keeps latitude 0, which is a real coordinate', () => {
    const out = normalizeMobileLocationUpdate({ lat: 0, lng: 0 }, NOW);
    assert.ok(out);
    assert.equal(out.lat, 0);
    assert.equal(out.lng, 0);
  });

  it('treats an absent or negative speed as stationary, not as missing data', () => {
    assert.equal(normalizeMobileLocationUpdate({ lat: 1, lng: 1 }, NOW)!.speed, 0);
    assert.equal(normalizeMobileLocationUpdate({ lat: 1, lng: 1, speed: -5 }, NOW)!.speed, 0);
  });

  it('drops an out-of-range heading rather than reporting a wrong one', () => {
    assert.equal(normalizeMobileLocationUpdate({ lat: 1, lng: 1, heading: 400 }, NOW)!.heading, null);
    assert.equal(normalizeMobileLocationUpdate({ lat: 1, lng: 1, heading: 360 }, NOW)!.heading, null);
    assert.equal(normalizeMobileLocationUpdate({ lat: 1, lng: 1, heading: 0 }, NOW)!.heading, 0);
  });

  it('ignores a client timestamp that is wildly out of step with the server', () => {
    const skewed = normalizeMobileLocationUpdate(
      { lat: 1, lng: 1, recordedAt: '2027-01-01T00:00:00.000Z' },
      NOW,
    );
    assert.equal(skewed!.recordedAt, NOW.toISOString());
  });

  it('honours a plausible client timestamp', () => {
    const t = '2026-08-09T11:59:30.000Z';
    const out = normalizeMobileLocationUpdate({ lat: 1, lng: 1, recordedAt: t }, NOW);
    assert.equal(out!.recordedAt, t);
  });

  it('never reports an accuracy the phone did not give', () => {
    assert.equal(normalizeMobileLocationUpdate({ lat: 1, lng: 1 }, NOW)!.accuracy, null);
  });
});

describe('trackerLocationUpdate', () => {
  const reading = {
    latitude: 21.4225,
    longitude: 39.8262,
    speedKph: 64,
    headingDeg: 180,
    status: 'MOVING',
    recordedAt: new Date('2026-08-09T11:58:00.000Z'),
  };

  it('tags tracker readings as tracker and preserves the device timestamp', () => {
    const out = trackerLocationUpdate(reading, NOW);
    assert.equal(out.source, 'tracker');
    assert.equal(out.lat, 21.4225);
    assert.equal(out.lng, 39.8262);
    assert.equal(out.status, 'MOVING');
    assert.equal(out.recordedAt, reading.recordedAt.toISOString());
    // Distinct from recordedAt: a reading two minutes old must not look fresh.
    assert.equal(out.ingestedAt, NOW.toISOString());
    assert.notEqual(out.recordedAt, out.ingestedAt);
  });

  it('reports no accuracy rather than inventing one', () => {
    assert.equal(trackerLocationUpdate(reading, NOW).accuracy, null);
  });

  it('handles a tracker that reports no speed or heading', () => {
    const out = trackerLocationUpdate(
      { ...reading, speedKph: null, headingDeg: null, status: null },
      NOW,
    );
    assert.equal(out.speed, 0);
    assert.equal(out.heading, null);
    assert.equal(out.status, null);
  });
});

describe('the two sources are distinguishable', () => {
  it('emits the same field set from both, differing only in provenance', () => {
    const mobile = normalizeMobileLocationUpdate({ lat: 1, lng: 2, speed: 10 }, NOW)!;
    const tracker = trackerLocationUpdate(
      { latitude: 1, longitude: 2, speedKph: 10, headingDeg: null, status: null, recordedAt: NOW },
      NOW,
    );
    assert.deepEqual(Object.keys(mobile).sort(), Object.keys(tracker).sort());
    assert.notEqual(mobile.source, tracker.source);
  });

  it('keeps the wire fields the dashboard already reads', () => {
    const out = normalizeMobileLocationUpdate({ lat: 1, lng: 2, speed: 10 }, NOW)!;
    for (const key of ['lat', 'lng', 'speed']) {
      assert.ok(key in out, `missing backward-compatible field: ${key}`);
    }
  });
});
