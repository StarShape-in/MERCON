import { api } from '@/lib/api';

/**
 * Recognize and decode a pasted Google Maps link so an operator can paste a
 * link straight into an address search box instead of re-typing the address.
 *
 * Two shapes exist:
 *  - Full links (maps.google.com/maps?q=..., google.com/maps/@lat,lng,...,
 *    google.com/maps/place/Name/@lat,lng,...) already carry the coordinates
 *    in the URL — parsed entirely client-side.
 *  - Short links (maps.app.goo.gl/..., goo.gl/maps/..., g.co/...) carry no
 *    coordinates at all; they only resolve after Google's redirect. A browser
 *    can't read a cross-origin redirect's target, so those go through the
 *    backend's `/geocoding/resolve-maps-link` endpoint, which follows the
 *    redirect server-side and hands back the expanded URL.
 *
 * Links are found as a *substring* of whatever was pasted, not by requiring
 * the whole field to be one clean URL — "Jubail HUB location
 * https://maps.app.goo.gl/xyz" (link copied alongside a label, a very common
 * way these get shared over WhatsApp/email) must still resolve.
 */

export interface ParsedMapsLink {
  lat: number;
  lng: number;
}

const SHORT_LINK_HOSTS = new Set(['maps.app.goo.gl', 'goo.gl', 'g.co']);

/**
 * Any Google country domain, not just google.com — a phone set to Saudi
 * Arabia shares `google.com.sa` / `maps.google.com.sa` links, which is the
 * form most customer-sent pins actually arrive in here. Anchored at both ends
 * and capped at two suffix parts so `google.com.evil.com` cannot match.
 */
const GOOGLE_HOST_RE = /^(maps\.)?google(\.[a-z]{2,3}){1,2}$/;

function isValidCoords(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

function hostOf(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function isMapsHost(host: string): boolean {
  return SHORT_LINK_HOSTS.has(host) || GOOGLE_HOST_RE.test(host);
}

/**
 * A bare `lat, lng` pair pasted with no link around it — the other common way
 * a customer sends a pin, especially forwarded out of a chat app.
 *
 * Both numbers must carry a decimal point. Real shared coordinates always do,
 * and requiring it keeps ordinary address text ("Gate 5, 12") from being read
 * as a location.
 */
export function parseRawCoordinates(text: string): ParsedMapsLink | null {
  const m = text.trim().match(/^\(?\s*(-?\d+\.\d+)\s*[, ]\s*(-?\d+\.\d+)\s*\)?$/);
  if (!m) return null;
  const lat = parseFloat(m[1]);
  const lng = parseFloat(m[2]);
  return isValidCoords(lat, lng) ? { lat, lng } : null;
}

/**
 * Pull the first Google Maps link out of arbitrary pasted text, normalized
 * to include a scheme. Handles a bare `https://...` URL, a URL buried inside
 * a longer sentence, and a protocol-less link (some paste sources drop it).
 */
export function findGoogleMapsUrl(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Scheme-prefixed URL anywhere in the text.
  const withScheme = trimmed.match(/https?:\/\/[^\s]+/gi);
  if (withScheme) {
    for (const raw of withScheme) {
      const cleaned = raw.replace(/[),.;]+$/, '');
      const host = hostOf(cleaned);
      if (host && isMapsHost(host)) return cleaned;
    }
  }

  // Bare short link with no scheme, e.g. "maps.app.goo.gl/PxkXa9omWQyTzz7R6".
  const bare = trimmed.match(/\b(?:maps\.app\.goo\.gl|goo\.gl\/maps|g\.co)\/\S+/gi);
  if (bare) {
    const cleaned = bare[0].replace(/[),.;]+$/, '');
    return `https://${cleaned}`;
  }

  return null;
}

/**
 * True if the pasted text holds a location we can resolve — a Google Maps
 * link (short or full) or a bare `lat, lng` pair.
 */
export function isGoogleMapsUrl(text: string): boolean {
  return findGoogleMapsUrl(text) !== null || parseRawCoordinates(text) !== null;
}

/**
 * Whether resolving this paste needs the backend round trip. Callers use it to
 * decide if the wait is worth announcing — a full link or a raw coordinate
 * pair resolves synchronously and needs no "expanding…" state at all.
 */
export function needsRemoteResolution(text: string): boolean {
  if (parseRawCoordinates(text)) return false;
  const url = findGoogleMapsUrl(text);
  if (!url) return false;
  const host = hostOf(url);
  return !!host && SHORT_LINK_HOSTS.has(host);
}

function isShortLink(url: string): boolean {
  const host = hostOf(url);
  return !!host && SHORT_LINK_HOSTS.has(host);
}

/** Pull `lat,lng` out of a full (already-expanded) Google Maps URL, or null. */
export function extractCoordsFromExpandedUrl(rawUrl: string): ParsedMapsLink | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  // https://maps.google.com/maps?q=26.39,50.15&z=17  (and the plain q=lat,lng form)
  const q = url.searchParams.get('q');
  if (q) {
    const m = q.match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (isValidCoords(lat, lng)) return { lat, lng };
    }
  }

  // https://www.google.com/maps/ll=26.39,50.15
  const ll = url.searchParams.get('ll');
  if (ll) {
    const m = ll.match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);
    if (m) {
      const lat = parseFloat(m[1]);
      const lng = parseFloat(m[2]);
      if (isValidCoords(lat, lng)) return { lat, lng };
    }
  }

  // !3d<lat>!4d<lng> on /maps/place/ links — checked before `@` because these
  // are the *pin's* coordinates while `@` is only the map viewport centre.
  // On an expanded short link the two differ by a few hundred metres, which on
  // a delivery stop is the difference between the gate and the road outside.
  const dataMatch = rawUrl.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (dataMatch) {
    const lat = parseFloat(dataMatch[1]);
    const lng = parseFloat(dataMatch[2]);
    if (isValidCoords(lat, lng)) return { lat, lng };
  }

  // https://www.google.com/maps/@26.39,50.15,17z or /place/Name/@26.39,50.15,17z
  const atMatch = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (isValidCoords(lat, lng)) return { lat, lng };
  }

  return null;
}

/**
 * What a paste pointed at. Links shared from the Google Maps *app* (the
 * `g_st=ipc` form) expand to a URL carrying only the place's name and a
 * feature id — no coordinates in any of the shapes above — so a pasted
 * location cannot always be reduced to a lat/lng on its own. Those come back
 * as a `place` for the caller to look up by name.
 */
export type PastedLocationTarget =
  | { kind: 'coords'; lat: number; lng: number }
  | { kind: 'place'; query: string };

/**
 * The human-readable place a coordinate-less Maps URL points at, taken from
 * `?q=` or from the `/maps/place/<Name>/` path segment.
 */
export function extractPlaceQueryFromExpandedUrl(rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }

  const q = url.searchParams.get('q');
  // A `q` holding coordinates is handled as coordinates, not as a name.
  if (q && !/^-?\d+(?:\.\d+)?,\s*-?\d+(?:\.\d+)?$/.test(q.trim())) {
    return q.trim();
  }

  const placeSegment = url.pathname.match(/\/maps\/place\/([^/@]+)/);
  if (placeSegment) {
    const name = decodeURIComponent(placeSegment[1].replace(/\+/g, ' ')).trim();
    // `/place/26°59'47.6"N+49°37'27.4"E` is a coordinate readout, not a name.
    if (name && !/^\d+°/.test(name)) return name;
  }

  return null;
}

/**
 * Resolve anything a customer might have sent as a location — a Google Maps
 * link (full or short, anywhere in the pasted text) or a bare `lat, lng`
 * pair. Returns coordinates when the link carries them, a place name when it
 * only names somewhere, or null when the text holds no location at all.
 */
export async function resolvePastedLocation(
  text: string
): Promise<PastedLocationTarget | null> {
  const raw = parseRawCoordinates(text);
  if (raw) return { kind: 'coords', ...raw };

  const url = findGoogleMapsUrl(text);
  if (!url) return null;

  let expanded = url;
  if (isShortLink(url)) {
    try {
      const { data } = await api.get<{ url: string }>('/geocoding/resolve-maps-link', {
        params: { url },
      });
      expanded = data.url;
    } catch (err) {
      console.warn('[googleMapsLink] failed to resolve short link', err);
      return null;
    }
  }

  const coords = extractCoordsFromExpandedUrl(expanded);
  if (coords) return { kind: 'coords', ...coords };

  const query = extractPlaceQueryFromExpandedUrl(expanded);
  return query ? { kind: 'place', query } : null;
}

/**
 * Resolve any pasted Google Maps link (full or short, anywhere in the pasted
 * text) to coordinates. Returns null if no Google Maps link is present, or
 * the link doesn't carry a resolvable pin — callers should tell the user
 * when a link they detected still comes back null, rather than fail silently.
 */
export async function resolveGoogleMapsLink(text: string): Promise<ParsedMapsLink | null> {
  const raw = parseRawCoordinates(text);
  if (raw) return raw;

  const url = findGoogleMapsUrl(text);
  if (!url) return null;

  if (!isShortLink(url)) {
    return extractCoordsFromExpandedUrl(url);
  }

  try {
    const { data } = await api.get<{ url: string }>('/geocoding/resolve-maps-link', {
      params: { url },
    });
    return extractCoordsFromExpandedUrl(data.url);
  } catch (err) {
    console.warn('[googleMapsLink] failed to resolve short link', err);
    return null;
  }
}

/**
 * Extract city name from full address string or place name.
 */
export function extractCityFromAddress(address: string, name?: string): string {
  if (!address && !name) return '';
  const text = `${name || ''} ${address || ''}`;

  const saudiCities = [
    'Riyadh', 'Jeddah', 'Dammam', 'Khobar', 'Al Khobar', 'Dhahran',
    'Jubail', 'Al Jubail', 'Mecca', 'Makkah', 'Medina', 'Madinah',
    'Tabuk', 'Abha', 'Khamis Mushait', 'Buraidah', 'Unaizah', 'Hail',
    'Najran', 'Jizan', 'Gizan', 'Yanbu', 'Taif', 'Al Ahsa', 'Hofuf',
    'Rabigh', 'Neom', 'Ras Tanura', 'Al Kharj', 'Kharj'
  ];

  for (const city of saudiCities) {
    const regex = new RegExp(`\\b${city}\\b`, 'i');
    if (regex.test(text)) {
      return city;
    }
  }

  // Fallback heuristic: split address by comma and inspect parts
  if (address) {
    const parts = address.split(/[,،]/).map((p) => p.trim()).filter(Boolean);
    const filtered = parts.filter(
      (p) => !/Saudi Arabia|KSA|Province|Region|\d{5}/i.test(p)
    );
    if (filtered.length > 0) {
      return filtered[filtered.length - 1];
    }
  }

  return '';
}

export interface ParsedAddressFields {
  name: string;
  address: string;
  city: string;
  postalCode?: string;
  country?: string;
}

/**
 * Auto-allocate text address string (e.g. "الصناعية الثانية، Hail 55411, Saudi Arabia")
 * into structured location form fields: name, address, city, postalCode, country.
 */
export function parsePastedAddressText(text: string): ParsedAddressFields {
  const trimmed = text.trim();
  if (!trimmed) {
    return { name: '', address: '', city: '' };
  }

  // If text is a Google Maps link or raw URL, never treat URL string as location name, address, or city
  if (isGoogleMapsUrl(trimmed) || /^https?:\/\//i.test(trimmed) || findGoogleMapsUrl(trimmed)) {
    return { name: '', address: '', city: '' };
  }

  // Extract 5-digit postal code if present (e.g., 55411)
  const postalCodeMatch = trimmed.match(/\b\d{5}\b/);
  const postalCode = postalCodeMatch ? postalCodeMatch[0] : '';

  // Extract city using existing extractCityFromAddress
  const city = extractCityFromAddress(trimmed);

  // Extract country if present
  let country = '';
  if (/Saudi Arabia|KSA|المملكة العربية السعودية/i.test(trimmed)) {
    country = 'Saudi Arabia';
  }

  // Extract location name from first comma-separated segment (English ',' or Arabic '،')
  const commaParts = trimmed.split(/[,،]/).map((p) => p.trim()).filter(Boolean);
  let name = trimmed;
  if (commaParts.length > 1) {
    name = commaParts[0];
  } else if (trimmed.length > 40) {
    name = trimmed.substring(0, 40) + '...';
  }

  return {
    name,
    address: trimmed,
    city,
    postalCode,
    country,
  };
}
