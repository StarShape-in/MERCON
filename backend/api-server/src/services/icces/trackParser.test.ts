/**
 * Offline tests for the ICCES fleet parser.
 *
 * The fixture is a real, unedited `/track/Track?page_cmd=mapupd` response
 * captured from the client's live ICCES account on 2026-08-08 — 27 devices,
 * genuine positions. Testing against invented data would only prove the parser
 * agrees with our assumptions; the point is to prove it agrees with ICCES.
 *
 * No network, no credentials, no database. Run with:
 *   npm run test:icces -w @mercon/api-server
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';

import { parseTrackResponse, byDeviceId } from './trackParser';

const fixture = JSON.parse(
  fs.readFileSync(path.join(__dirname, '__fixtures__', 'track-fleet.json'), 'utf8'),
);

/** TRK-101 / UDA-2541 in the MERCON vehicle master; "2541 UDA" in ICCES. */
const TRK_101_DEVICE = '352592572686467';

test('A — parses the whole fleet with no errors', () => {
  const { telemetry, errors, capturedAt, timezone } = parseTrackResponse(fixture);

  assert.equal(telemetry.length, 27, 'expected 27 devices');
  assert.deepEqual(errors, [], 'real ICCES data should parse cleanly');
  assert.ok(capturedAt instanceof Date);
  assert.equal(timezone, 'GMT+03:00');

  // Every record must carry the fields the fleet map depends on.
  for (const t of telemetry) {
    assert.ok(t.deviceId, 'deviceId missing');
    assert.ok(t.recordedAt instanceof Date, `bad timestamp for ${t.deviceId}`);
    assert.ok(Number.isFinite(t.latitude), `bad latitude for ${t.deviceId}`);
    assert.ok(Number.isFinite(t.longitude), `bad longitude for ${t.deviceId}`);
  }
});

test('B — the known vehicle resolves to the right device', () => {
  const { telemetry } = parseTrackResponse(fixture);
  const trk101 = byDeviceId(telemetry).get(TRK_101_DEVICE);

  assert.ok(trk101, `device ${TRK_101_DEVICE} not found`);
  // ICCES writes the plate reversed relative to the MERCON master
  // (master: "UDA-2541"), which is exactly why the device id is the join key.
  assert.equal(trk101!.description, '2541 UDA');
  assert.equal(trk101!.status, 'STOPPED');
  assert.equal(trk101!.latitude, 24.612687);
  assert.equal(trk101!.longitude, 46.844382);
});

test('C — a moving vehicle carries real speed and heading', () => {
  const { telemetry } = parseTrackResponse(fixture);
  const moving = telemetry.filter((t) => t.status === 'MOVING');

  assert.ok(moving.length > 0, 'fixture should contain moving vehicles');
  for (const t of moving) {
    assert.ok(t.speedKph !== null && t.speedKph > 0, `${t.description} MOVING but speed ${t.speedKph}`);
    assert.ok(t.headingDeg !== null, `${t.description} has no heading`);
    assert.ok(t.headingDeg! >= 0 && t.headingDeg! <= 360, `heading out of range: ${t.headingDeg}`);
  }
});

test('D — a stopped vehicle reads zero, not null', () => {
  const { telemetry } = parseTrackResponse(fixture);
  const stopped = telemetry.filter((t) => t.status === 'STOPPED');

  assert.ok(stopped.length > 0);
  for (const t of stopped) {
    // ICCES genuinely sends "0.0" here. Zero is a reading; null would mean
    // "not reported" — the parser must not blur the two.
    assert.equal(t.speedKph, 0, `${t.description} STOPPED but speed ${t.speedKph}`);
  }
});

test('E — ICCES status vocabulary is preserved verbatim', () => {
  const { telemetry } = parseTrackResponse(fixture);
  const seen = new Set(telemetry.map((t) => t.status));

  for (const expected of ['MOVING', 'STOPPED', 'TAMPER_WEIGHT', 'DEVICE_NO_SIGNAL']) {
    assert.ok(seen.has(expected), `expected status ${expected} in fixture`);
  }
  // No invented values: everything present must be an ICCES token.
  for (const s of seen) assert.match(s!, /^[A-Z_]+$/);
});

test('F — Unix seconds become the right instant', () => {
  const { telemetry } = parseTrackResponse(fixture);
  const trk101 = byDeviceId(telemetry).get(TRK_101_DEVICE)!;

  // Points[2] = 1786184094 seconds. Read as milliseconds it would land in 1970.
  assert.equal(trk101.recordedAt.getTime(), 1786184094 * 1000);
  assert.equal(trk101.recordedAt.getUTCFullYear(), 2026);
});

test('G — one malformed device does not lose the fleet', () => {
  const broken = JSON.parse(JSON.stringify(fixture));
  broken.JMapData.DataSets[3].Points = ['nonsense|not|enough|fields'];
  broken.JMapData.DataSets[7].Points = [];
  broken.JMapData.DataSets[11].Points[0] =
    broken.JMapData.DataSets[11].Points[0].replace(/\|24\.\d+\|46\.\d+\|/, '|not-a-number|also-not|');

  const { telemetry, errors } = parseTrackResponse(broken);

  assert.equal(telemetry.length + errors.length, 27, 'every device accounted for');
  assert.ok(errors.length >= 2, 'malformed devices should be reported');
  assert.ok(telemetry.length >= 24, 'the healthy majority must still parse');
  for (const e of errors) assert.ok(e.reason.length > 0, 'errors must explain themselves');
});

test('H — missing optional fields become null, never zero', () => {
  const one = JSON.parse(JSON.stringify(fixture));
  one.JMapData.DataSets = [one.JMapData.DataSets[0]];
  const fields = one.JMapData.DataSets[0].Points[0].split('|');
  fields[14] = '';   // speed not reported
  fields[17] = '';   // odometer not reported
  fields[20] = '';   // address not reported
  one.JMapData.DataSets[0].Points[0] = fields.join('|');
  one.JMapData.DataSets[0].ignState = 'unexpected';

  const { telemetry, errors } = parseTrackResponse(one);

  assert.deepEqual(errors, []);
  assert.equal(telemetry[0].speedKph, null, 'absent speed must not become 0');
  assert.equal(telemetry[0].odometerKm, null);
  assert.equal(telemetry[0].address, null);
  assert.equal(telemetry[0].ignitionOn, null, 'unrecognised ignState must not become false');
});

test('I — the Arabic address is decoded, not passed through escaped', () => {
  const { telemetry } = parseTrackResponse(fixture);
  const trk101 = byDeviceId(telemetry).get(TRK_101_DEVICE)!;

  assert.ok(trk101.address, 'address missing');
  assert.ok(!trk101.address!.includes('\\u'), 'escape sequences left undecoded');
  assert.ok(!trk101.address!.startsWith('"'), 'wrapping quotes left in place');
  assert.match(trk101.address!, /[؀-ۿ]/, 'expected Arabic characters');
});

test('J — a payload that is not an ICCES response is rejected, not thrown on', () => {
  for (const junk of [null, undefined, {}, { JMapData: null }, 'a string', 42]) {
    const { telemetry, errors } = parseTrackResponse(junk);
    assert.equal(telemetry.length, 0);
    assert.equal(errors.length, 1);
  }
});

test('K — ignition state maps only from the values ICCES sends', () => {
  const { telemetry } = parseTrackResponse(fixture);
  for (const t of telemetry) {
    assert.ok(t.ignitionOn === true || t.ignitionOn === false, `${t.description} ignition unresolved`);
  }
  assert.ok(telemetry.some((t) => t.ignitionOn === true));
  assert.ok(telemetry.some((t) => t.ignitionOn === false));
});
