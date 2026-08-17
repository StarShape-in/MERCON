/**
 * Driving travel-time estimate between two points, via the Google Maps
 * Distance Matrix service. Used by the Create Trip workflow to calculate
 * Estimated Delivery from Truck Arrival Time + route duration — the
 * dispatcher never types a delivery time by hand.
 *
 * Same key as `addressSearch.ts` (`VITE_GOOGLE_MAPS_API_KEY`), loaded through
 * the same `importLibrary` bootstrap. Kept in its own module because it loads
 * a different library ('routes') than Places, and because callers here only
 * ever want one thing: "how long will this drive take."
 *
 * Returns `null` — never a guess — when the key is missing, the API is
 * unreachable, or Google can't route between the two points. Callers must
 * show an explicit "unavailable" state rather than inventing a duration.
 */

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export interface TravelTimeEstimate {
  /** Drive duration in minutes, rounded. */
  durationMinutes: number;
  /** Google's own human-readable duration text, e.g. "4 hours 35 mins". */
  durationText: string;
  /** Drive distance in kilometers, rounded. */
  distanceKm: number;
}

interface MapsWindow extends Window {
  google?: {
    maps?: {
      importLibrary?: (name: string) => Promise<unknown>;
    };
  };
  __merconGoogleMapsTravelTimeReady?: () => void;
}

const MAPS_SCRIPT_ID = 'mercon-google-maps-js';
const MAPS_CALLBACK_NAME = '__merconGoogleMapsReady';

let routesLibrary: Promise<any> | null = null;
let unavailable = false;

function loadMapsScript(key: string): Promise<void> {
  const w = window as MapsWindow;
  if (w.google?.maps?.importLibrary) return Promise.resolve();

  // Reuse the script tag `addressSearch.ts` may have already injected — same
  // id, same callback name — so the two modules never load the bootstrap twice.
  const existing = document.getElementById(MAPS_SCRIPT_ID) as HTMLScriptElement | null;
  const script = existing ?? document.createElement('script');

  const settled = new Promise<void>((resolve, reject) => {
    if (w.google?.maps?.importLibrary) {
      resolve();
      return;
    }
    (w as any)[MAPS_CALLBACK_NAME] = () => resolve();
    script.addEventListener('error', () => reject(new Error('Google Maps JavaScript API failed to load')), { once: true });
  });

  if (!existing) {
    script.id = MAPS_SCRIPT_ID;
    script.async = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=${MAPS_CALLBACK_NAME}`;
    document.head.appendChild(script);
  }

  return settled;
}

function getRoutesLibrary(key: string): Promise<any> {
  if (!routesLibrary) {
    routesLibrary = loadMapsScript(key)
      .then(() => {
        const importLibrary = (window as MapsWindow).google?.maps?.importLibrary;
        if (!importLibrary) throw new Error('google.maps.importLibrary is unavailable');
        return importLibrary('routes');
      })
      .catch((err) => {
        routesLibrary = null;
        throw err;
      });
  }
  return routesLibrary;
}

/**
 * Estimate driving time and distance between two coordinates.
 * Resolves to `null` on any failure — missing key, blocked script, no route.
 */
export async function estimateTravelTime(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number }
): Promise<TravelTimeEstimate | null> {
  if (!API_KEY || unavailable) return null;

  try {
    await getRoutesLibrary(API_KEY);
    const g = (window as any).google;
    const service = new g.maps.DistanceMatrixService();

    const response: any = await new Promise((resolve, reject) => {
      service.getDistanceMatrix(
        {
          origins: [new g.maps.LatLng(origin.lat, origin.lng)],
          destinations: [new g.maps.LatLng(destination.lat, destination.lng)],
          travelMode: g.maps.TravelMode.DRIVING,
          unitSystem: g.maps.UnitSystem.METRIC,
        },
        (result: any, status: string) => {
          if (status === 'OK') resolve(result);
          else reject(new Error(`Distance Matrix request failed: ${status}`));
        }
      );
    });

    const element = response?.rows?.[0]?.elements?.[0];
    if (!element || element.status !== 'OK') return null;

    return {
      durationMinutes: Math.round(element.duration.value / 60),
      durationText: element.duration.text,
      distanceKm: Math.round(element.distance.value / 1000),
    };
  } catch (err) {
    console.warn('[travelTimeService] estimate failed', err);
    unavailable = true;
    return null;
  }
}
