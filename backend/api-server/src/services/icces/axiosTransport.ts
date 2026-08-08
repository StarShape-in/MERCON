/**
 * The real HTTP layer for `IccesSession`, kept separate so every test can run
 * against a fake and never touch the network or need credentials.
 *
 * Two settings here are load-bearing rather than incidental:
 *
 * **`maxRedirects: 0`.** ICCES answers `/track/Track` (no trailing slash) with
 * a 302 to `/track/Track/`. Axios follows redirects by default, and its
 * redirect library downgrades a POST to a GET on a 302 — silently discarding
 * the request body. The previous integration hit exactly this: its login and
 * tracking POSTs arrived as bodyless GETs. Handling redirects explicitly keeps
 * the method and body intact, and lets the session read `Set-Cookie` off the
 * redirect response itself, which is where ICCES issues the session.
 *
 * **`validateStatus: () => true`.** The session decides what a response means
 * by looking at it; an expired session comes back as HTTP 200 carrying the
 * login page, so throwing on status codes would both miss that and turn
 * ordinary 3xx/4xx into exceptions the retry logic never sees.
 */
import axios from 'axios';

import type { HttpTransport, HttpResponse } from './iccesSession';

const REQUEST_TIMEOUT_MS = 20_000;

export function createAxiosTransport(): HttpTransport {
  return {
    async request({ method, url, headers, body }): Promise<HttpResponse> {
      const res = await axios.request({
        method,
        url,
        headers,
        data: body,
        timeout: REQUEST_TIMEOUT_MS,
        maxRedirects: 0,
        validateStatus: () => true,
        // Responses are JSON or HTML and must be inspected as text; letting
        // axios parse JSON would make "is this the login page?" harder to ask.
        responseType: 'text',
        transformResponse: [(d) => d],
      });

      return {
        status: res.status,
        headers: res.headers as Record<string, string | string[] | undefined>,
        body: typeof res.data === 'string' ? res.data : String(res.data ?? ''),
      };
    },
  };
}
