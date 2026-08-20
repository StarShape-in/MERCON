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
