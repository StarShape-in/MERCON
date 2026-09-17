/**
 * Address search — one neutral interface, two providers behind it.
 *
 * Google Places (New) is used when a Maps key was inlined at build time;
 * otherwise, and whenever Google fails at runtime, this falls back to the
 * OpenStreetMap Nominatim search the app used before. Callers never learn
 * which one answered — that is the whole point of this module, and the reason
 * every `google.maps.*` reference in the codebase lives in this one file.
 *
 * Deliberately NOT used here: the Geocoding API. Place Details already returns
 * both the formatted address and the coordinates, so geocoding would be a
 * second billed call for data we are handed by the first.
 */

import { api } from '@/lib/api';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

/** One row in the "Search an address…" dropdown. */
export interface AddressSuggestion {
  /** Opaque handle — pass it back to `resolve()`. Also the React key. */
  id: string;
  /** What the operator reads in the dropdown. */
  label: string;
}

/** A picked address, already shaped like the fields a TripStop stores. */
export interface ResolvedAddress {
  /** → `location_name`: the short label reports group routes by. */
  name: string;
  /** → `location_address`: the full postal address the driver's app shows. */
  address: string;
  /** → `location_lat` */
  lat: number;
  /** → `location_lng` */
  lng: number;
}

/**
 * One address-search interaction: the keystrokes, and the single pick that
 * ends them. Sessions are single-use — after `resolve()` the caller must
 * create a new one, because Google bills a session token exactly once and
 * reusing a spent token would silently start charging per request.
 */
export interface AddressSearchSession {
  search(query: string): Promise<AddressSuggestion[]>;
  resolve(id: string): Promise<ResolvedAddress | null>;
}

/* ------------------------------------------------------------------ *
 * Nominatim / MERCON Backend Proxy — server-cached address fallback.
 * ------------------------------------------------------------------ */

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
}

export function placeNameFrom(displayName: string): string {
  const parts = displayName.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length > 1 && /^\d+[A-Za-z]?$/.test(parts[0])) return `${parts[0]} ${parts[1]}`;
  return parts[0];
}

function createNominatimSession(): AddressSearchSession {
  const byId = new Map<string, NominatimResult>();

  return {
    async search(query) {
      try {
        const res = await api.get('/geocoding/search', { params: { q: query } });
        const suggestions: Array<{ id: string; display_name: string; lat: number; lon: number }> = res.data?.suggestions || [];
        return suggestions.map((r) => {
          const id = r.id;
          byId.set(id, { display_name: r.display_name, lat: String(r.lat), lon: String(r.lon) });
          return { id, label: r.display_name };
        });
      } catch (err) {
        console.warn('[addressSearch] Proxy search failed, using direct fallback', err);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&limit=8&countrycodes=sa&viewbox=34.0,32.5,55.8,16.0&bounded=1&q=${encodeURIComponent(query)}`
          );
          const data: NominatimResult[] = await res.json();
          return data.map((r, i) => {
            const id = `osm-${i}-${r.lat},${r.lon}`;
            byId.set(id, r);
            return { id, label: r.display_name };
          });
        } catch {
          return [];
        }
      }
    },

    async resolve(id) {
      const r = byId.get(id);
      if (!r) return null;
      return {
        name: placeNameFrom(r.display_name),
        address: r.display_name,
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
      };
    },
  };
}

const reverseGeocodeCache = new Map<string, string | null>();

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (reverseGeocodeCache.has(key)) return reverseGeocodeCache.get(key) ?? null;

  try {
    const res = await api.get('/geocoding/reverse', { params: { lat, lng, zoom: 14 } });
    const name = res.data?.display_name ? placeNameFrom(res.data.display_name) : null;
    reverseGeocodeCache.set(key, name);
    return name;
  } catch (err) {
    console.warn('[addressSearch] reverse geocode failed', err);
    reverseGeocodeCache.set(key, null);
    return null;
  }
}

export interface ReverseGeocodedPlace {
  name: string;
  address: string;
  addressEn: string | null;
  addressAr: string | null;
}

const reverseGeocodeDetailedCache = new Map<string, ReverseGeocodedPlace | null>();

async function fetchReverseDisplayName(
  lat: number,
  lng: number,
  language: 'en' | 'ar'
): Promise<string | null> {
  try {
    const res = await api.get('/geocoding/reverse', { params: { lat, lng, zoom: 18, language } });
    return res.data?.display_name ?? null;
  } catch {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&accept-language=${language}`
    );
    if (!res.ok) throw new Error(`Nominatim reverse geocode failed: ${res.status}`);
    const data: { display_name?: string } = await res.json();
    return data.display_name ?? null;
  }
}

/**
 * Reverse geocode for a pin the *user* just dropped by pasting a Google Maps
 * link — as opposed to `reverseGeocode` above, which labels vehicle telemetry.
 *
 * Three deliberate differences from that one, and the reason this is a
 * separate function rather than a flag on it:
 *  - `zoom=18` asks for a street-level result. A pasted link points at a gate
 *    or a yard, and the `zoom=14` the telemetry caller wants answers with the
 *    city instead.
 *  - the whole `display_name` is kept as the address, not just its leading
 *    segment. The short segment is the right *label*, but storing it as the
 *    address is what would hand a driver "Jubail" and nothing to navigate to.
 *  - the place is fetched in English *and* Arabic. Nominatim renders one
 *    language per request and defaults to the local one, so a Saudi pin comes
 *    back Arabic-only unless asked otherwise — but `location_address` is a
 *    single column, so the operator has to be able to see both and pick which
 *    one the driver receives.
 *
 * The two requests run one after the other rather than together: Nominatim's
 * usage policy caps the public instance at one request per second, and the
 * pin is already placed by the time these run, so the extra latency is not on
 * the operator's critical path. Results are cached per coordinate, so
 * re-pasting the same link costs nothing.
 *
 * Same free, keyless endpoint throughout, so this costs no billed call.
 */
export async function reverseGeocodeDetailed(
  lat: number,
  lng: number
): Promise<ReverseGeocodedPlace | null> {
  const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
  if (reverseGeocodeDetailedCache.has(key)) return reverseGeocodeDetailedCache.get(key) ?? null;

  try {
    const addressEn = await fetchReverseDisplayName(lat, lng, 'en');
    let addressAr: string | null = null;
    try {
      addressAr = await fetchReverseDisplayName(lat, lng, 'ar');
    } catch (err) {
      // The Arabic rendering is an enhancement, not the result — losing it
      // must not discard an English address we already hold.
      console.warn('[addressSearch] Arabic reverse geocode failed', err);
    }

    const preferred = addressEn ?? addressAr;
    const place = preferred
      ? { name: placeNameFrom(preferred), address: preferred, addressEn, addressAr }
      : null;
    reverseGeocodeDetailedCache.set(key, place);
    return place;
  } catch (err) {
    console.warn('[addressSearch] detailed reverse geocode failed', err);
    reverseGeocodeDetailedCache.set(key, null);
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Google Places (New), loaded through the Maps JavaScript API.
 * ------------------------------------------------------------------ */

/**
 * Hand-written, minimal shapes for the slice of the Places library we touch.
 *
 * `@types/google.maps` would cover this, but it is a new dependency for three
 * call sites — and a wrong local type fails the build here just as loudly as a
 * wrong one from the package would.
 */
interface GoogleLatLng {
  lat(): number;
  lng(): number;
}

interface GooglePlace {
  displayName?: string | null;
  formattedAddress?: string | null;
  location?: GoogleLatLng | null;
  fetchFields(request: { fields: string[] }): Promise<{ place: GooglePlace }>;
}

interface PlacePrediction {
  placeId: string;
  text: { toString(): string };
  /** Present on the new API; used only to build the dropdown label. */
  mainText?: { toString(): string } | null;
  secondaryText?: { toString(): string } | null;
  toPlace(): GooglePlace;
}

interface PlacesLibrary {
  AutocompleteSessionToken: new () => object;
  AutocompleteSuggestion: {
    fetchAutocompleteSuggestions(request: {
      input: string;
      sessionToken?: object;
      includedRegionCodes?: string[];
    }): Promise<{ suggestions: Array<{ placePrediction: PlacePrediction | null }> }>;
  };
}

interface MapsWindow extends Window {
  google?: {
    maps?: {
      importLibrary?: (name: string) => Promise<unknown>;
    };
  };
  /** Readiness signal named in the bootstrap URL — see `loadMapsScript`. */
  __merconGoogleMapsReady?: () => void;
}

const MAPS_SCRIPT_ID = 'mercon-google-maps-js';
const MAPS_CALLBACK_NAME = '__merconGoogleMapsReady';

let placesLibrary: Promise<PlacesLibrary> | null = null;

/**
 * Once Google has failed to load or answer, stop trying for the rest of the
 * page's life. Without this, every keystroke would re-attempt a script that is
 * blocked or a key that is rejected, and the operator would feel each failure
 * as a pause before the Nominatim results they were always going to get.
 */
let googleUnavailable = false;

function loadMapsScript(key: string): Promise<void> {
  const w = window as MapsWindow;
  if (w.google?.maps?.importLibrary) return Promise.resolve();

  const existing = document.getElementById(MAPS_SCRIPT_ID) as HTMLScriptElement | null;
  const script = existing ?? document.createElement('script');

  const settled = new Promise<void>((resolve, reject) => {
    // Resolve when Google says it is ready, NOT on the script's load event.
    // `loading=async` means no JavaScript is triggered by that event: the
    // bootstrap file finishes executing before the API has attached
    // `importLibrary`, so reading the namespace at `load` finds nothing and
    // throws — which is precisely how this shipped, and why every search fell
    // through to Nominatim in production while `google.maps.importLibrary`
    // looked fine from the console a moment later.
    w[MAPS_CALLBACK_NAME] = () => resolve();
    script.addEventListener(
      'error',
      () => reject(new Error('Google Maps JavaScript API failed to load')),
      { once: true }
    );
  });

  if (!existing) {
    script.id = MAPS_SCRIPT_ID;
    script.async = true;
    // `libraries` is omitted on purpose, because importLibrary fetches places
    // on demand.
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&callback=${MAPS_CALLBACK_NAME}`;
    document.head.appendChild(script);
  }

  return settled;
}

function getPlacesLibrary(key: string): Promise<PlacesLibrary> {
  if (!placesLibrary) {
    placesLibrary = loadMapsScript(key)
      .then(() => {
        const importLibrary = (window as MapsWindow).google?.maps?.importLibrary;
        if (!importLibrary) throw new Error('google.maps.importLibrary is unavailable');
        return importLibrary('places') as Promise<PlacesLibrary>;
      })
      .catch((err) => {
        // Let this attempt reject, but clear the cache so a later interaction
        // can retry — a transient network blip should not be permanent.
        placesLibrary = null;
        throw err;
      });
  }
  return placesLibrary;
}

function createGoogleSession(key: string): AddressSearchSession {
  /**
   * One token for the whole interaction: minted on the first keystroke, sent
   * with every subsequent one, and spent by the Place Details call that ends
   * the session. That is what makes the autocomplete requests bill as a single
   * session rather than individually.
   *
   * The Maps JS library mints this token itself — it is the library's
   * equivalent of the UUID v4 the REST endpoint asks callers to generate, and
   * `fetchAutocompleteSuggestions` accepts only the token object, not a string.
   */
  let token: object | null = null;
  /**
   * Every prediction this session has shown, and deliberately not just the
   * latest batch. Searches overlap — a slow response can land after a faster
   * later one — so clearing this would let an out-of-order response drop the
   * very predictions the operator is looking at, turning their click into a
   * lookup miss. Keeping them all makes any visible row resolvable, whatever
   * order the responses arrived in. A session is one interaction, so this
   * holds a few dozen entries at most and dies with the session.
   */
  const byId = new Map<string, PlacePrediction>();

  return {
    async search(query) {
      const places = await getPlacesLibrary(key);
      if (!token) token = new places.AutocompleteSessionToken();

      const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: query,
        sessionToken: token,
        includedRegionCodes: ['sa'],
      });

      const rows: AddressSuggestion[] = [];
      for (const s of suggestions) {
        const p = s.placePrediction;
        if (!p) continue; // query predictions ("restaurants near me") have no place
        const main = p.mainText?.toString();
        const secondary = p.secondaryText?.toString();
        byId.set(p.placeId, p);
        rows.push({
          id: p.placeId,
          label: main ? [main, secondary].filter(Boolean).join(', ') : p.text.toString(),
        });
      }
      return rows;
    },

    async resolve(id) {
      const prediction = byId.get(id);
      if (!prediction) return null;

      // Exactly these three fields, and no more. Each extra field can move the
      // call into a higher-billed tier for data the trip stop has nowhere to put.
      const { place } = await prediction.toPlace().fetchFields({
        fields: ['displayName', 'formattedAddress', 'location'],
      });
      const p = place as any;

      const lat = p.location?.lat();
      const lng = p.location?.lng();
      if (lat == null || lng == null) return null;

      const address = p.formattedAddress ?? '';
      return {
        name: p.displayName ?? placeNameFrom(address),
        address,
        lat,
        lng,
      };
    },
  };
}

/* ------------------------------------------------------------------ *
 * The provider the component actually talks to.
 * ------------------------------------------------------------------ */

/**
 * Start one address-search interaction.
 *
 * Tries Google when a key exists, and drops to Nominatim on any failure —
 * missing key, blocked script, rejected referrer, API error. The fallback is
 * per-call, so a Google outage degrades the dropdown rather than emptying it.
 */
export function createAddressSearchSession(): AddressSearchSession {
  const key = API_KEY;
  if (!key || googleUnavailable) return createNominatimSession();

  const google = createGoogleSession(key);
  const nominatim = createNominatimSession();
  let usedFallback = false;

  return {
    async search(query) {
      if (!usedFallback) {
        try {
          return await google.search(query);
        } catch (err) {
          console.warn('[addressSearch] Google unavailable, falling back to Nominatim', err);
          googleUnavailable = true;
          usedFallback = true;
        }
      }
      return nominatim.search(query);
    },

    // Resolve against whichever provider produced the suggestions the operator
    // is looking at. Routing this by `usedFallback` (rather than trying Google
    // first) keeps a Google place id from being looked up in Nominatim's map.
    async resolve(id) {
      if (usedFallback) return nominatim.resolve(id);
      try {
        return await google.resolve(id);
      } catch (err) {
        console.warn('[addressSearch] Google Place Details failed', err);
        googleUnavailable = true;
        return null;
      }
    },
  };
}
