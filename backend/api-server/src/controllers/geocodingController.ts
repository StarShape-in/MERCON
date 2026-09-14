import { Request, Response } from 'express';

/**
 * Hosts allowed as the *starting* URL for link resolution. Google's own
 * short-link services only ever redirect to google.com — restricting the
 * input to these hosts is what keeps this from being an open SSRF proxy.
 */
const ALLOWED_SHORT_LINK_HOSTS = new Set(['maps.app.goo.gl', 'goo.gl', 'g.co']);
const MAX_REDIRECTS = 5;
/** Per-hop cap, so a hung Google response can't hold a socket open forever. */
const HOP_TIMEOUT_MS = 5000;

/**
 * Expand a Google Maps short link (maps.app.goo.gl/..., goo.gl/maps/...) to
 * its final URL by following redirects server-side. Browsers can't do this
 * themselves — a cross-origin redirect response is opaque to `fetch`, so the
 * coordinates embedded in the final URL are invisible to client JS.
 */
export const resolveMapsLink = async (req: Request, res: Response) => {
  const raw = String(req.query.url || '');
  let current: URL;
  try {
    current = new URL(raw);
  } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  if (!ALLOWED_SHORT_LINK_HOSTS.has(current.hostname)) {
    return res.status(400).json({ error: 'URL host is not a supported Google Maps short link' });
  }

  try {
    for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
      const response = await fetch(current.toString(), {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(HOP_TIMEOUT_MS),
      });
      const location = response.headers.get('location');
      if (!location) {
        return res.json({ url: current.toString() });
      }
      current = new URL(location, current);
      if (current.protocol !== 'http:' && current.protocol !== 'https:') {
        return res.status(400).json({ error: 'Redirect target is not http(s)' });
      }
    }
    return res.json({ url: current.toString() });
  } catch (err) {
    return res.status(502).json({ error: 'Failed to resolve link' });
  }
};

/**
 * Server-side address search proxy & cache.
 * Avoids client browser CORS / 429 rate limit issues by querying Nominatim
 * server-to-server with proper User-Agent header and 1-hour TTL cache.
 */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const SEARCH_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const searchCache = new Map<string, CacheEntry<any>>();
const reverseCache = new Map<string, CacheEntry<any>>();

export const searchAddress = async (req: Request, res: Response) => {
  const query = String(req.query.q || '').trim();
  if (!query || query.length < 2) {
    return res.json({ suggestions: [] });
  }

  const cacheKey = query.toLowerCase();
  const cached = searchCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json({ suggestions: cached.data });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=8&countrycodes=sa&viewbox=34.0,32.5,55.8,16.0&bounded=1&q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MERCON-Logistics-Platform/1.0 (https://mercon.tech; ops@mercon.tech)',
        'Accept-Language': 'en,ar',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      console.warn(`[geocodingController] Nominatim search returned HTTP ${response.status}`);
      return res.json({ suggestions: [] });
    }

    const data: any[] = await response.json();
    const suggestions = (data || []).map((r: any, i: number) => ({
      id: `osm-${i}-${r.lat},${r.lon}`,
      display_name: r.display_name,
      lat: parseFloat(r.lat),
      lon: parseFloat(r.lon),
    }));

    searchCache.set(cacheKey, {
      data: suggestions,
      expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
    });

    return res.json({ suggestions });
  } catch (err) {
    console.error('[geocodingController] Address search proxy error:', err);
    return res.json({ suggestions: [] });
  }
};

export const reverseGeocode = async (req: Request, res: Response) => {
  const lat = parseFloat(String(req.query.lat || ''));
  const lng = parseFloat(String(req.query.lng || req.query.lon || ''));
  const zoom = parseInt(String(req.query.zoom || '18'), 10);
  const language = String(req.query.language || 'en');

  if (isNaN(lat) || isNaN(lng)) {
    return res.status(400).json({ error: 'Valid lat and lng query params are required' });
  }

  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)},z${zoom},${language}`;
  const cached = reverseCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return res.json(cached.data);
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=${zoom}&accept-language=${language}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'MERCON-Logistics-Platform/1.0 (https://mercon.tech; ops@mercon.tech)',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Reverse geocode failed' });
    }

    const data = await response.json();
    reverseCache.set(cacheKey, {
      data,
      expiresAt: Date.now() + SEARCH_CACHE_TTL_MS,
    });

    return res.json(data);
  } catch (err) {
    console.error('[geocodingController] Reverse geocode proxy error:', err);
    return res.status(502).json({ error: 'Reverse geocode failed' });
  }
};

