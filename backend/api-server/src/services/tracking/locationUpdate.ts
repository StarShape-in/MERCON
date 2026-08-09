/**
 * One shape for a live position, whatever produced it.
 *
 * MERCON has two GPS sources and they arrive by different routes: the ICCES
 * poller pulls tracker readings on a timer, and the driver app pushes phone
 * readings over a socket. Both end up in the same trip room, on the same event,
 * feeding the same marker — but until now they did not agree on a shape, and
 * only one of them said which source it was.
 *
 * The phone path was also relayed verbatim. Whatever the client emitted reached
 * every operator watching that trip, so a bug in the app — or a driver running
 * a modified build — could put `lat: null` or a string on an operator's map.
 * Authentication was checked; the payload never was.
 *
 * This module is the one place that decides what a valid position looks like.
 *
 * Scope note: normalising the wire format deliberately does NOT persist phone
 * positions. Today only tracker readings are written to `Vehicle.last_*`, and
 * that stays true here — the physical tracker remains the source of record.
 * What changes is that a position now says where it came from, so persisting
 * the phone later is a decision someone makes on purpose rather than a silent
 * overwrite.
 */

/** Which of MERCON's two GPS sources produced a reading. */
export type LocationSource = 'tracker' | 'mobile';

/**
 * What every `trip:location_update:<id>` event carries.
 *
 * `lat`, `lng` and `speed` keep the names both existing producers already used,
 * so dashboards reading those fields are unaffected. Everything else is added.
 */
export interface TripLocationUpdate {
  lat: number;
  lng: number;
  /** km/h. Zero rather than null: a stationary truck is not an absent reading. */
  speed: number;
  /** Degrees clockwise from north, or null when the source cannot say. */
  heading: number | null;
  /**
   * Reported accuracy radius in metres, or null. Phones know this and it varies
   * hugely — a 500 m fix and a 5 m fix are not equally trustworthy. Trackers do
   * not report it, which is itself worth being able to tell apart.
   */
  accuracy: number | null;
  /** The source's own vocabulary (ICCES: MOVING, IDLE, …). Passed through. */
  status: string | null;
  source: LocationSource;
  /** When the position was measured, per the source. */
  recordedAt: string;
  /**
   * When MERCON accepted it. Distinct from `recordedAt` on purpose: a reading
   * can be minutes old by the time it arrives, and without both timestamps a
   * stale tracker is indistinguishable from a parked truck.
   */
  ingestedAt: string;
}

/** Anything a client could send. Nothing here is trusted. */
export interface RawMobileLocationUpdate {
  tripId?: unknown;
  driverId?: unknown;
  lat?: unknown;
  lng?: unknown;
  speed?: unknown;
  heading?: unknown;
  accuracy?: unknown;
  recordedAt?: unknown;
}

function finiteNumber(value: unknown): number | null {
  // Number.isFinite rejects NaN and Infinity; the typeof guard rejects the
  // numeric strings and booleans that `Number()` would happily coerce.
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function latitude(value: unknown): number | null {
  const n = finiteNumber(value);
  return n !== null && n >= -90 && n <= 90 ? n : null;
}

function longitude(value: unknown): number | null {
  const n = finiteNumber(value);
  return n !== null && n >= -180 && n <= 180 ? n : null;
}

/** Negative speeds are meaningless; absent ones are simply "not moving". */
function speed(value: unknown): number {
  const n = finiteNumber(value);
  return n !== null && n >= 0 ? n : 0;
}

function heading(value: unknown): number | null {
  const n = finiteNumber(value);
  return n !== null && n >= 0 && n < 360 ? n : null;
}

function accuracy(value: unknown): number | null {
  const n = finiteNumber(value);
  return n !== null && n >= 0 ? n : null;
}

/**
 * How far out of step with the server a client clock may be before its
 * timestamp is discarded. A phone with a wrong clock should not be able to
 * stamp a position into next week.
 */
const MAX_CLOCK_SKEW_MS = 24 * 60 * 60 * 1000;

function recordedAt(value: unknown, now: Date): string {
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    const ms = parsed.getTime();
    if (Number.isFinite(ms) && Math.abs(ms - now.getTime()) <= MAX_CLOCK_SKEW_MS) {
      return parsed.toISOString();
    }
  }
  // No usable client timestamp: the moment we received it is the best we know.
  return now.toISOString();
}

/**
 * Turn whatever the driver app sent into a position, or reject it.
 *
 * Returns null when the reading has no usable coordinates — the caller should
 * drop it rather than forward it. Callers are still responsible for
 * authorisation; this decides only whether the numbers are real.
 */
export function normalizeMobileLocationUpdate(
  raw: RawMobileLocationUpdate | null | undefined,
  now: Date = new Date(),
): TripLocationUpdate | null {
  if (!raw || typeof raw !== 'object') return null;

  const lat = latitude(raw.lat);
  const lng = longitude(raw.lng);
  if (lat === null || lng === null) return null;

  return {
    lat,
    lng,
    speed: speed(raw.speed),
    heading: heading(raw.heading),
    accuracy: accuracy(raw.accuracy),
    status: null,
    source: 'mobile',
    recordedAt: recordedAt(raw.recordedAt, now),
    ingestedAt: now.toISOString(),
  };
}

/** The tracker-side fields this module needs, kept structural so the ICCES
 *  parser and this module are not bound to each other. */
export interface TrackerReading {
  latitude: number;
  longitude: number;
  speedKph: number | null;
  headingDeg: number | null;
  status: string | null;
  recordedAt: Date;
}

/**
 * Build the same shape from a tracker reading.
 *
 * Trackers report no accuracy, so it is null rather than invented — the point
 * of the field is to distinguish "±5 m" from "unknown".
 */
export function trackerLocationUpdate(
  reading: TrackerReading,
  now: Date = new Date(),
): TripLocationUpdate {
  return {
    lat: reading.latitude,
    lng: reading.longitude,
    speed: speed(reading.speedKph),
    heading: heading(reading.headingDeg),
    accuracy: null,
    status: reading.status,
    source: 'tracker',
    recordedAt: reading.recordedAt.toISOString(),
    ingestedAt: now.toISOString(),
  };
}
