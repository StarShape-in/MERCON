/**
 * Holds a logged-in session against the ICCES web application and fetches the
 * fleet from it.
 *
 * ## Why this is a session client and not an API client
 *
 * The vendor's integration PDF documents Basic Auth against
 * `/iccWebService1.2`. That endpoint returns 404 for the documented POST even
 * with valid credentials, so it is not usable. The interface that does work is
 * the one the ICCES dashboard itself calls, and it authenticates the way a
 * browser does: a form login that sets a `JSESSIONID` cookie, which every
 * later request must carry. There is no `Authorization` header and no CSRF
 * token — confirmed from a captured browser request.
 *
 * That makes this, honestly, a screen-scraper wearing a tie. It works, and it
 * is the only thing that currently does. It also carries no promise from the
 * vendor: if ICCES changes their login page, this breaks with no notice and no
 * deprecation period. Treat it as a bridge, and keep asking ICCES for a
 * supported API.
 *
 * ## The one unverified input
 *
 * The login form shows three fields labelled Account, User and Password. Their
 * placeholder text is confirmed; their underlying HTML `name` attributes were
 * never captured, because the browser tool does not record document-level
 * POSTs. `LOGIN_FIELDS` below is therefore the single guessed value in this
 * file, and it is isolated and overridable for exactly that reason.
 *
 * A wrong guess fails loudly rather than silently: `login()` verifies that the
 * session actually works by fetching real data, so a bad field name surfaces
 * as an authentication error at startup, not as an empty map at 3am.
 *
 * To confirm: DevTools → Network → tick Preserve log → log in → open the POST
 * to /track/Track → Payload. The parameter names are all that is needed; the
 * values must never be recorded.
 */
import { parseTrackResponse, type IccesParseResult } from './trackParser';

const BASE = 'https://fleet.icces.com:8443/track/Track';

/** Form parameter names. See the note above — these are the unverified part. */
const LOGIN_FIELDS = {
  account: 'account',
  user: 'user',
  password: 'password',
} as const;

/** ICCES reports in Saudi local time; deriving dates in UTC would ask for the
 *  wrong day between midnight and 03:00 local. */
const ICCES_TZ = 'GMT+03:00';

export interface IccesCredentials {
  user: string;
  password: string;
  account: string;
}

/** The subset of HTTP this client needs, injectable so tests never touch the
 *  network and never need credentials. */
export interface HttpResponse {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}
export interface HttpTransport {
  request(opts: {
    method: 'GET' | 'POST';
    url: string;
    headers: Record<string, string>;
    body?: string;
  }): Promise<HttpResponse>;
}

export class IccesAuthError extends Error {}
export class IccesFetchError extends Error {}

/** `2026/08/09/23:59` — the format the dashboard sends, one day ahead so the
 *  window always covers "now" in Riyadh regardless of the server's own clock. */
function endOfTomorrowRiyadh(now: Date): string {
  const riyadh = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  riyadh.setUTCDate(riyadh.getUTCDate() + 1);
  const y = riyadh.getUTCFullYear();
  const m = String(riyadh.getUTCMonth() + 1).padStart(2, '0');
  const d = String(riyadh.getUTCDate()).padStart(2, '0');
  return `${y}/${m}/${d}/23:59`;
}

/** Keeps only the cookie name=value pairs, discarding attributes. Values are
 *  never logged: a JSESSIONID is a live key to the client's fleet account. */
function collectCookies(setCookie: string | string[] | undefined, jar: Map<string, string>): void {
  if (!setCookie) return;
  const list = Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const raw of list) {
    const pair = raw.split(';')[0];
    const eq = pair.indexOf('=');
    if (eq > 0) jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
  }
}

/**
 * A response is only fleet data if it parses as JSON carrying `JMapData`.
 * ICCES answers an expired session with the login page — HTTP 200 and HTML —
 * so status codes alone cannot tell "here is your fleet" from "log in again".
 */
function readFleetPayload(body: string): unknown | null {
  const trimmed = body.trim();
  if (!trimmed.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === 'object' && 'JMapData' in parsed ? parsed : null;
  } catch {
    return null;
  }
}

export class IccesSession {
  private readonly cookies = new Map<string, string>();
  private loggedIn = false;

  constructor(
    private readonly credentials: IccesCredentials,
    private readonly http: HttpTransport,
    private readonly now: () => Date = () => new Date(),
  ) {}

  private cookieHeader(): string {
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    const h: Record<string, string> = {
      Accept: '*/*',
      // The dashboard sends both; some session apps reject requests without a
      // same-origin Referer, and the cache headers defeat stale responses.
      Referer: `${BASE}?page=map.device.new`,
      'Cache-Control': 'max-age=0',
      'If-Modified-Since': 'Sat, 1 Jan 2000 00:00:00 GMT',
      ...extra,
    };
    const cookie = this.cookieHeader();
    if (cookie) h.Cookie = cookie;
    return h;
  }

  /**
   * Signs in and proves it worked by fetching real data. Returning without
   * throwing means the session genuinely works — not merely that the server
   * answered 200, which it does for the login page too.
   */
  async login(): Promise<void> {
    await this.authenticate();

    // Prove the session works. If the field names are wrong, or the password
    // has changed, this is where it surfaces — with a clear reason.
    const probe = await this.fetchFleetOnce();
    if (probe === null) {
      this.loggedIn = false;
      throw new IccesAuthError(
        'Logged in but ICCES did not return fleet data. Most likely the login ' +
          'form field names differ from LOGIN_FIELDS, or the credentials are wrong.',
      );
    }
  }

  /**
   * The credential exchange on its own, without the verification fetch.
   *
   * Re-authenticating mid-poll uses this rather than `login()`: the caller is
   * about to fetch anyway, so probing first would double every request and —
   * because a probe and a real fetch are the same call — would make "the
   * session is fine but ICCES stopped returning data" impossible to report
   * separately from "the credentials are wrong".
   */
  private async authenticate(): Promise<void> {
    this.cookies.clear();
    this.loggedIn = false;

    // Fetch the login page first: the server issues the session cookie here,
    // and the browser presents that same cookie when it posts credentials.
    const page = await this.http.request({
      method: 'GET',
      url: `${BASE}?page=login`,
      headers: this.headers(),
    });
    collectCookies(page.headers['set-cookie'], this.cookies);

    const form = new URLSearchParams({
      [LOGIN_FIELDS.account]: this.credentials.account,
      [LOGIN_FIELDS.user]: this.credentials.user,
      [LOGIN_FIELDS.password]: this.credentials.password,
    }).toString();

    const res = await this.http.request({
      method: 'POST',
      url: BASE,
      headers: this.headers({ 'Content-Type': 'application/x-www-form-urlencoded' }),
      body: form,
    });
    collectCookies(res.headers['set-cookie'], this.cookies);

    // Redirects are not followed automatically — see axiosTransport for why.
    // A login that answers 3xx is following the ordinary post/redirect/get
    // pattern, and the session cookie may be issued on either hop, so follow
    // one and collect from it too. One hop only: a redirect loop must not
    // become an infinite request loop against the vendor.
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers['location'];
      const target = Array.isArray(location) ? location[0] : location;
      if (target) {
        const followed = await this.http.request({
          method: 'GET',
          url: new URL(target, BASE).toString(),
          headers: this.headers(),
        });
        collectCookies(followed.headers['set-cookie'], this.cookies);
      }
    }

    if (this.cookies.size === 0) {
      throw new IccesAuthError('ICCES issued no session cookie during login');
    }
    this.loggedIn = true;
  }

  /** One attempt. Returns null when ICCES answered with something that is not
   *  fleet data — which is how an expired session presents. */
  private async fetchFleetOnce(): Promise<unknown | null> {
    const params = new URLSearchParams({
      page: 'map.device.new',
      page_cmd: 'mapupd',
      _uniq: String(Math.random()),
      date_fr: '',
      date_to: endOfTomorrowRiyadh(this.now()),
      date_tz: ICCES_TZ,
      group: 'all',
      devStatus: 'ALL',
      limType: 'last',
    });

    const res = await this.http.request({
      method: 'GET',
      url: `${BASE}?${params.toString()}`,
      headers: this.headers(),
    });
    collectCookies(res.headers['set-cookie'], this.cookies);

    if (res.status !== 200) return null;
    return readFleetPayload(res.body);
  }

  /**
   * Fetches the whole fleet, logging in first if needed and re-logging in once
   * if the session has lapsed.
   *
   * Sessions expire on ICCES's schedule, which is not documented anywhere we
   * have. So expiry is detected by behaviour rather than by a timer: if a
   * request comes back as anything other than fleet data, log in again and
   * retry exactly once. Once, not in a loop — a wrong password would otherwise
   * hammer the vendor's login endpoint every thirty seconds.
   */
  async fetchFleet(): Promise<IccesParseResult> {
    if (!this.loggedIn) await this.login();

    let payload = await this.fetchFleetOnce();
    if (payload === null) {
      await this.authenticate();
      payload = await this.fetchFleetOnce();
    }
    if (payload === null) {
      throw new IccesFetchError('ICCES returned no fleet data after re-authenticating');
    }
    return parseTrackResponse(payload);
  }
}
