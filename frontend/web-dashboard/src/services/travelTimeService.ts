/**
 * Driving travel-time estimate between two points, via the Google Maps
 * Routes API (`computeRoutes`, REST). Used by the Create Trip workflow to
 * calculate Estimated Delivery from Truck Arrival Time + route duration —
 * the dispatcher never types a delivery time by hand.
 *
 * Deliberately NOT the legacy `google.maps.DistanceMatrixService` (Maps
 * JavaScript API): this project's Cloud key is provisioned for the "New"
 * family of Maps APIs (same reason `addressSearch.ts` uses Places API (New)
 * instead of the legacy Places library) — the legacy Distance Matrix API is
 * not enabled on it and answers every request with `REQUEST_DENIED`. The
 * Routes API is a plain authenticated fetch, so it also skips loading the
 * Maps JS bootstrap entirely for this one lookup.
 *
 * Returns `null` — never a guess — when the key is missing, the API call
 * fails, or Google can't route between the two points. Callers must show an
 * explicit "unavailable" state rather than inventing a duration.
 */

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const COMPUTE_ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

export interface TravelTimeEstimate {
  /** Drive duration in minutes, rounded. */
  durationMinutes: number;
  /** Human-readable duration text, e.g. "4h 35m". */
  durationText: string;
  /** Drive distance in kilometers, rounded. */
  distanceKm: number;
}

let unavailable = false;

function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

/**
 * Estimate driving time and distance between two coordinates.
 * Resolves to `null` on any failure — missing key, network error, no route.
 */
export async function estimateTravelTime(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<TravelTimeEstimate | null> {
  if (!API_KEY || unavailable) return null;

  try {
    const res = await fetch(COMPUTE_ROUTES_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        // Exactly these two fields — Routes API bills by response field mask.
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters',
      },
      body: JSON.stringify({
        origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
        destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
        travelMode: 'DRIVE',
      }),
    });

    if (!res.ok) throw new Error(`Routes API request failed: ${res.status}`);

    const data: { routes?: Array<{ duration?: string; distanceMeters?: number }> } = await res.json();
    const route = data.routes?.[0];
    if (!route?.duration || route.distanceMeters == null) return null;

    // Duration comes back as a Protobuf Duration string, e.g. "16620s".
    const seconds = parseInt(route.duration.replace(/s$/, ''), 10);
    if (!Number.isFinite(seconds)) return null;

    const durationMinutes = Math.round(seconds / 60);
    return {
      durationMinutes,
      durationText: formatDuration(durationMinutes),
      distanceKm: Math.round(route.distanceMeters / 1000),
    };
  } catch (err) {
    console.warn('[travelTimeService] estimate failed', err);
    unavailable = true;
    return null;
  }
}
