import { Request, Response } from 'express';

/**
 * Hosts allowed as the *starting* URL for link resolution. Google's own
 * short-link services only ever redirect to google.com — restricting the
 * input to these hosts is what keeps this from being an open SSRF proxy.
 */
const ALLOWED_SHORT_LINK_HOSTS = new Set(['maps.app.goo.gl', 'goo.gl', 'g.co']);
const MAX_REDIRECTS = 5;

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
      const response = await fetch(current.toString(), { method: 'GET', redirect: 'manual' });
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
