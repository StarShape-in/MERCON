/**
 * Parses the fleet telemetry the ICCES web application serves from
 * `/track/Track?page_cmd=mapupd` into something MERCON can use.
 *
 * **This is not the API described in the vendor's integration PDF.** That
 * document specifies `POST /iccWebService1.2` with `reportType=EVENT_DETAILS`,
 * which returns HTTP 404 on the live service even with valid credentials —
 * verified against production. The endpoint parsed here is what the ICCES
 * dashboard itself calls, and is the only interface currently known to return
 * live positions. It is undocumented, so treat its shape as observed rather
 * than promised, and keep asking ICCES for a supported API.
 *
 * ## The response
 *
 * One call returns the whole fleet — 27 devices in the captured sample — as
 * `JMapData.DataSets[]`. Each dataset carries a `Points` array whose entries
 * are **pipe-delimited strings**, not objects:
 *
 *   "911909900|2541 UDA|1786184094|2026/08/08|13:14:54|GMT+03:00|STOPPED|2|…"
 *
 * ## Why the column list cannot be trusted
 *
 * The response also carries a `DataColumns` header naming 14 fields:
 *
 *   Desc|Epoch|Date|Time|Tmz|Stat|Icon|Lat|Lon|#Sats|kph|Heading|Alt|Addr
 *
 * A point has **28** fields. `DataColumns` describes the columns ICCES's own
 * screen renders, not the wire format, and mapping it positionally is wrong:
 * it puts speed at index 10, which is `0` for every vehicle in every capture —
 * so every truck would read as permanently stationary.
 *
 * The indices below were instead derived from evidence and cross-checked
 * against physical reality across two captures 52 seconds apart:
 *
 *   - a vehicle moved 1.264 km in 52 s → 87.5 km/h measured, field 14 read 90.0
 *   - its bearing measured 17.3°, field 15 read 13.0
 *   - altitude reads ~2042 m for a truck in Abha (a mountain city) and ~85 m
 *     for one in Jeddah (on the coast)
 *   - field 14 is 0.0 for every STOPPED vehicle and non-zero for every MOVING
 *     one, across all 27 devices in three separate captures
 *
 * Fields 10, 11, 12, 18, 19 and 25 remain unidentified. They are deliberately
 * left unmapped rather than guessed at.
 */

/** Indices verified against live data — see the note above. */
const IDX = {
  deviceKey: 0,
  description: 1,
  epochSeconds: 2,
  status: 6,
  latitude: 8,
  longitude: 9,
  satellites: 13,
  speedKph: 14,
  headingDeg: 15,
  altitudeM: 16,
  odometerKm: 17,
  address: 20,
} as const;

/** One position report for one vehicle, in MERCON's own terms. */
export interface IccesTelemetry {
  /** `DataSets[].id` — the ICCES device id, and the only safe join key.
   *  Matches `Vehicle.icces_device_id`. Never join on the plate: ICCES writes
   *  it "2541 UDA" while the MERCON vehicle master writes it "UDA-2541". */
  deviceId: string;
  /** `Points[0]`. Stable per device across captures, distinct from `deviceId`.
   *  Carried through for traceability; not used for matching. */
  deviceKey: string | null;
  /** Plate as ICCES renders it. For display and diagnostics only. */
  description: string | null;
  /** When the reading was taken. `Points[2]` is Unix **seconds**, not ms. */
  recordedAt: Date;
  /** ICCES's own vocabulary: MOVING, IDLE, STOPPED, TAMPER_WEIGHT,
   *  DEVICE_NO_SIGNAL, DEVICE_NOT_WORKING, ACCIDENT, COMMAND, ALERT, UNKNOWN.
   *  Passed through unchanged — MERCON does not reinterpret it. */
  status: string | null;
  latitude: number;
  longitude: number;
  speedKph: number | null;
  headingDeg: number | null;
  altitudeM: number | null;
  odometerKm: number | null;
  satellites: number | null;
  /** Arabic street address, decoded. See `decodeAddress`. */
  address: string | null;
  /** From `ignState` on the dataset: "1" engine on, "0" off, else unknown. */
  ignitionOn: boolean | null;
  batteryLevel: number | null;
}

/** A device that could not be parsed. One bad record must not lose the fleet. */
export interface IccesParseError {
  deviceId: string | null;
  reason: string;
}

export interface IccesParseResult {
  telemetry: IccesTelemetry[];
  errors: IccesParseError[];
  /** `JMapData.Time` — when ICCES built the response, distinct from when any
   *  individual device last reported. The gap between them is how stale a
   *  given vehicle's position is. */
  capturedAt: Date | null;
  timezone: string | null;
}

/**
 * Optional numeric fields return `null` when absent or unparseable — never 0.
 * A truck with no speed reading and a truck reading 0 km/h are different
 * facts, and collapsing them would invent telemetry that was never sent.
 */
function num(fields: string[], index: number): number | null {
  const raw = fields[index];
  if (raw === undefined || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * The address arrives doubly encoded: wrapped in literal quote characters, and
 * holding literal `\uXXXX` escape sequences rather than the characters they
 * denote (the payload escapes them a second time, so `JSON.parse` leaves them
 * alone). Without both steps the dashboard would display `حي` where
 * it should read حي.
 */
function decodeAddress(raw: string | undefined): string | null {
  if (raw === undefined) return null;
  const unquoted = raw.trim().replace(/^"|"$/g, '');
  if (unquoted === '') return null;
  return unquoted.replace(/\\u([0-9a-fA-F]{4})/g, (_m, hex) =>
    String.fromCharCode(parseInt(hex, 16)),
  );
}

function parseIgnition(raw: unknown): boolean | null {
  if (raw === '1') return true;
  if (raw === '0') return false;
  return null;
}

/** Rejects epochs outside 2000–2100 — a clock that far out is a fault, not a
 *  position, and silently trusting it would place a truck in 1970. */
function parseRecordedAt(fields: string[]): Date | null {
  const seconds = num(fields, IDX.epochSeconds);
  if (seconds === null || !Number.isFinite(seconds)) return null;
  const ms = seconds * 1000;
  const date = new Date(ms);
  const year = date.getUTCFullYear();
  if (Number.isNaN(date.getTime()) || year < 2000 || year > 2100) return null;
  return date;
}

function parseDevice(dataset: any): IccesTelemetry | IccesParseError {
  const deviceId = typeof dataset?.id === 'string' ? dataset.id.trim() : '';
  if (!deviceId) return { deviceId: null, reason: 'dataset has no id' };

  const points = dataset?.Points;
  if (!Array.isArray(points) || points.length === 0) {
    return { deviceId, reason: 'no Points — device reported nothing' };
  }
  // `limType=last` yields exactly one point per device. Take the first rather
  // than the last: with a single element they are the same, and if ICCES ever
  // returns several, the points carry no field that orders them reliably.
  const raw = points[0];
  if (typeof raw !== 'string') {
    return { deviceId, reason: 'Points[0] is not a string' };
  }

  const fields = raw.split('|');
  if (fields.length <= IDX.address) {
    return { deviceId, reason: `malformed point: ${fields.length} fields, expected at least ${IDX.address + 1}` };
  }

  const recordedAt = parseRecordedAt(fields);
  if (recordedAt === null) return { deviceId, reason: 'missing or implausible timestamp' };

  const latitude = num(fields, IDX.latitude);
  const longitude = num(fields, IDX.longitude);
  if (latitude === null || longitude === null) {
    return { deviceId, reason: 'missing latitude or longitude' };
  }
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { deviceId, reason: `coordinates out of range: ${latitude}, ${longitude}` };
  }

  const status = (fields[IDX.status] ?? '').trim();

  return {
    deviceId,
    deviceKey: (fields[IDX.deviceKey] ?? '').trim() || null,
    description: (fields[IDX.description] ?? '').trim() || null,
    recordedAt,
    status: status || (typeof dataset.Status === 'string' ? dataset.Status : null),
    latitude,
    longitude,
    speedKph: num(fields, IDX.speedKph),
    headingDeg: num(fields, IDX.headingDeg),
    altitudeM: num(fields, IDX.altitudeM),
    odometerKm: num(fields, IDX.odometerKm),
    satellites: num(fields, IDX.satellites),
    address: decodeAddress(fields[IDX.address]),
    ignitionOn: parseIgnition(dataset.ignState),
    batteryLevel: dataset.batteryLevel === undefined ? null : (Number.isFinite(Number(dataset.batteryLevel)) ? Number(dataset.batteryLevel) : null),
  };
}

function isError(v: IccesTelemetry | IccesParseError): v is IccesParseError {
  return (v as IccesParseError).reason !== undefined;
}

/**
 * Turns one `/track/Track` response into telemetry plus a list of what could
 * not be read.
 *
 * A single unreadable device is reported and skipped, never thrown: one truck
 * with a faulty tracker must not blank the map for the other twenty-six.
 */
export function parseTrackResponse(payload: unknown): IccesParseResult {
  const map = (payload as any)?.JMapData;
  if (!map || typeof map !== 'object') {
    return {
      telemetry: [],
      errors: [{ deviceId: null, reason: 'response has no JMapData — not an ICCES fleet payload' }],
      capturedAt: null,
      timezone: null,
    };
  }

  const capturedSeconds = Number(map.Time?.timestamp);
  const capturedAt = Number.isFinite(capturedSeconds) ? new Date(capturedSeconds * 1000) : null;
  const timezone = typeof map.Time?.timezone === 'string' ? map.Time.timezone : null;

  const datasets = Array.isArray(map.DataSets) ? map.DataSets : [];
  const telemetry: IccesTelemetry[] = [];
  const errors: IccesParseError[] = [];

  for (const dataset of datasets) {
    const parsed = parseDevice(dataset);
    if (isError(parsed)) errors.push(parsed);
    else telemetry.push(parsed);
  }

  return { telemetry, errors, capturedAt, timezone };
}

/** Index by device id, ready to join against `Vehicle.icces_device_id`. */
export function byDeviceId(telemetry: IccesTelemetry[]): Map<string, IccesTelemetry> {
  return new Map(telemetry.map((t) => [t.deviceId, t]));
}
