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
 */

export interface ParsedMapsLink {
  lat: number;
  lng: number;
}

const SHORT_LINK_HOSTS = new Set(['maps.app.goo.gl', 'goo.gl', 'g.co']);

function isValidCoords(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

/** True for anything worth treating as a Google Maps link, short or full. */
export function isGoogleMapsUrl(text: string): boolean {
  const trimmed = text.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    const host = new URL(trimmed).hostname.replace(/^www\./, '');
    return host === 'maps.google.com' || host === 'google.com' || SHORT_LINK_HOSTS.has(host);
  } catch {
    return false;
  }
}

function isShortLink(url: URL): boolean {
  return SHORT_LINK_HOSTS.has(url.hostname.replace(/^www\./, ''));
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

  // https://www.google.com/maps/@26.39,50.15,17z or /place/Name/@26.39,50.15,17z
  const atMatch = url.pathname.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (isValidCoords(lat, lng)) return { lat, lng };
  }

  // Embedded data param: !3d<lat>!4d<lng> (appears on /maps/place/ links)
  const dataMatch = rawUrl.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (dataMatch) {
    const lat = parseFloat(dataMatch[1]);
    const lng = parseFloat(dataMatch[2]);
    if (isValidCoords(lat, lng)) return { lat, lng };
  }

  return null;
}

/**
 * Resolve any pasted Google Maps link (full or short) to coordinates.
 * Returns null if the text isn't a Google Maps link, or the link doesn't
 * carry a resolvable pin.
 */
export async function resolveGoogleMapsLink(text: string): Promise<ParsedMapsLink | null> {
  const trimmed = text.trim();
  if (!isGoogleMapsUrl(trimmed)) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (!isShortLink(url)) {
    return extractCoordsFromExpandedUrl(trimmed);
  }

  try {
    const { data } = await api.get<{ url: string }>('/geocoding/resolve-maps-link', {
      params: { url: trimmed },
    });
    return extractCoordsFromExpandedUrl(data.url);
  } catch (err) {
    console.warn('[googleMapsLink] failed to resolve short link', err);
    return null;
  }
}
