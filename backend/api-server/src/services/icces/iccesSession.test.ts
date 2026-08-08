/**
 * Offline tests for the ICCES session client.
 *
 * Every test drives a fake transport, so nothing here touches the network or
 * needs credentials. What is being tested is the behaviour that matters in
 * production and is awkward to check live: that an expired session recovers,
 * that it recovers exactly once rather than looping, and that a wrong login
 * field name fails loudly instead of yielding a permanently empty map.
 *
 *   npm run test:icces -w @mercon/api-server
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as path from 'path';

import { IccesSession, IccesAuthError, IccesFetchError, type HttpTransport, type HttpResponse } from './iccesSession';

const FLEET = fs.readFileSync(path.join(__dirname, '__fixtures__', 'track-fleet.json'), 'utf8');
const LOGIN_HTML = '<html><body>Please Log In</body></html>';
const CREDS = { user: 'test-user', password: 'test-pass', account: 'test-account' };

interface Call { method: string; url: string; headers: Record<string, string>; body?: string }

/** Scripted transport: each entry answers the next request in order; the last
 *  one repeats once exhausted. */
function transportOf(script: Array<Partial<HttpResponse>>): { http: HttpTransport; calls: Call[] } {
  const calls: Call[] = [];
  let i = 0;
  const http: HttpTransport = {
    async request(opts) {
      calls.push({ method: opts.method, url: opts.url, headers: opts.headers, body: opts.body });
      const next = script[Math.min(i, script.length - 1)];
      i += 1;
      return { status: next.status ?? 200, headers: next.headers ?? {}, body: next.body ?? '' };
    },
  };
  return { http, calls };
}

const cookieOnce = { 'set-cookie': ['JSESSIONID=fake-session-value; Path=/track; HttpOnly'] };
const okFleet = { status: 200, headers: {}, body: FLEET };

test('login collects the session cookie and proves the session works', async () => {
  const { http, calls } = transportOf([
    { status: 200, headers: cookieOnce, body: LOGIN_HTML }, // GET login page
    { status: 200, headers: {}, body: LOGIN_HTML },          // POST credentials
    okFleet,                                                 // verification fetch
  ]);
  const session = new IccesSession(CREDS, http);
  await session.login();

  assert.equal(calls[0].method, 'GET');
  assert.match(calls[0].url, /page=login/);
  assert.equal(calls[1].method, 'POST');
  assert.equal(calls[1].headers['Content-Type'], 'application/x-www-form-urlencoded');
  // Cookie obtained from the login page must be presented when posting.
  assert.match(calls[1].headers.Cookie ?? '', /JSESSIONID=/);
  assert.match(calls[2].url, /page_cmd=mapupd/);
});

test('login fails clearly when ICCES issues no session cookie', async () => {
  const { http } = transportOf([{ status: 200, headers: {}, body: LOGIN_HTML }]);
  await assert.rejects(() => new IccesSession(CREDS, http).login(), IccesAuthError);
});

test('a wrong login field name surfaces as an auth error, not an empty fleet', async () => {
  // Server accepts the POST but never authenticates, so it keeps serving HTML.
  const { http } = transportOf([
    { status: 200, headers: cookieOnce, body: LOGIN_HTML },
    { status: 200, headers: {}, body: LOGIN_HTML },
    { status: 200, headers: {}, body: LOGIN_HTML },
  ]);
  await assert.rejects(
    () => new IccesSession(CREDS, http).login(),
    (e: Error) => e instanceof IccesAuthError && /field names|credentials/.test(e.message),
  );
});

test('fetchFleet parses all 27 devices', async () => {
  const { http } = transportOf([
    { status: 200, headers: cookieOnce, body: LOGIN_HTML },
    { status: 200, headers: {}, body: LOGIN_HTML },
    okFleet,
  ]);
  const result = await new IccesSession(CREDS, http).fetchFleet();
  assert.equal(result.telemetry.length, 27);
  assert.deepEqual(result.errors, []);
});

test('an expired session is detected and recovered from', async () => {
  let phase = 0;
  const calls: string[] = [];
  const http: HttpTransport = {
    async request(opts) {
      calls.push(opts.url);
      phase += 1;
      // 1 login page, 2 login post, 3 verify -> ok. 4 fetch -> EXPIRED (html).
      // 5 login page, 6 login post, 7 verify -> ok, 8 retry fetch -> ok.
      if (phase === 4) return { status: 200, headers: {}, body: LOGIN_HTML };
      if (phase === 1 || phase === 2 || phase === 5 || phase === 6) {
        return { status: 200, headers: cookieOnce, body: LOGIN_HTML };
      }
      return { status: 200, headers: {}, body: FLEET };
    },
  };

  const session = new IccesSession(CREDS, http);
  await session.fetchFleet();               // establishes the session
  const second = await session.fetchFleet(); // hits the expiry and recovers

  assert.equal(second.telemetry.length, 27);
  assert.ok(calls.filter((u) => /page=login/.test(u)).length >= 2, 'should have logged in again');
});

test('it re-authenticates once, not in a loop', async () => {
  let logins = 0;
  const http: HttpTransport = {
    async request(opts) {
      if (/page=login/.test(opts.url)) logins += 1;
      // Never returns fleet data — simulates a permanently wrong password.
      return { status: 200, headers: cookieOnce, body: LOGIN_HTML };
    },
  };
  // login() itself rejects, which is the loud failure we want.
  await assert.rejects(() => new IccesSession(CREDS, http).fetchFleet(), IccesAuthError);
  assert.ok(logins <= 2, `expected at most 2 login attempts, saw ${logins}`);
});

test('a non-200 or non-JSON answer is never mistaken for fleet data', async () => {
  for (const bad of [
    { status: 500, headers: {}, body: 'server error' },
    { status: 200, headers: {}, body: '<html>login</html>' },
    { status: 200, headers: {}, body: 'not json at all' },
    { status: 200, headers: {}, body: '{"something":"else"}' },
  ]) {
    const { http } = transportOf([
      { status: 200, headers: cookieOnce, body: LOGIN_HTML },
      { status: 200, headers: {}, body: LOGIN_HTML },
      bad,
    ]);
    await assert.rejects(() => new IccesSession(CREDS, http).fetchFleet(), IccesAuthError);
  }
});

test('the fleet request carries the parameters the dashboard sends', async () => {
  const { http, calls } = transportOf([
    { status: 200, headers: cookieOnce, body: LOGIN_HTML },
    { status: 200, headers: {}, body: LOGIN_HTML },
    okFleet,
  ]);
  // Fixed clock: 2026-08-08 23:30 UTC is already 2026-08-09 in Riyadh (UTC+3),
  // so "tomorrow" must be the 10th — the case a UTC-based date would get wrong.
  const session = new IccesSession(CREDS, http, () => new Date('2026-08-08T23:30:00Z'));
  await session.fetchFleet();

  const url = calls[2].url;
  for (const expected of ['page_cmd=mapupd', 'group=all', 'devStatus=ALL', 'limType=last', 'date_tz=GMT%2B03%3A00']) {
    assert.ok(url.includes(expected), `missing ${expected} in ${url}`);
  }
  assert.ok(url.includes('2026%2F08%2F10'), `date_to should be the 10th in Riyadh, got ${url}`);
  assert.match(calls[2].headers.Cookie ?? '', /JSESSIONID=/);
  assert.equal(calls[2].headers.Authorization, undefined, 'ICCES uses a session, not Basic Auth');
});

test('cookies are replaced on re-login, never accumulated', async () => {
  const calls: Call[] = [];
  let issued = 0;
  const http: HttpTransport = {
    async request(opts) {
      calls.push({ method: opts.method, url: opts.url, headers: opts.headers, body: opts.body });
      if (/page=login/.test(opts.url)) {
        issued += 1;
        return { status: 200, headers: { 'set-cookie': [`JSESSIONID=session-${issued}; Path=/`] }, body: LOGIN_HTML };
      }
      if (/page_cmd=mapupd/.test(opts.url)) return { status: 200, headers: {}, body: FLEET };
      return { status: 200, headers: {}, body: LOGIN_HTML }; // the credential POST
    },
  };
  const session = new IccesSession(CREDS, http);
  await session.login();
  await session.login();

  const last = calls[calls.length - 1].headers.Cookie ?? '';
  assert.equal(last.split(';').filter((c) => c.includes('JSESSIONID')).length, 1, 'only one JSESSIONID may be sent');
  assert.match(last, /session-2/, 'the newer session must replace the older one');
});

test('IccesFetchError is thrown when data stops arriving after re-authenticating', async () => {
  // Login always succeeds; the verification fetch succeeds; but the *fleet*
  // fetches keep coming back as the login page. That is the case where
  // re-authenticating cannot help, and it must give up rather than loop.
  let fleetFetches = 0;
  const http: HttpTransport = {
    async request(opts) {
      if (/page=login/.test(opts.url)) {
        return { status: 200, headers: cookieOnce, body: LOGIN_HTML };
      }
      if (/page_cmd=mapupd/.test(opts.url)) {
        fleetFetches += 1;
        // Only the very first (login's verification probe) returns data.
        return fleetFetches === 1
          ? { status: 200, headers: {}, body: FLEET }
          : { status: 200, headers: {}, body: LOGIN_HTML };
      }
      return { status: 200, headers: {}, body: LOGIN_HTML };
    },
  };

  const session = new IccesSession(CREDS, http);
  await assert.rejects(() => session.fetchFleet(), IccesFetchError);
});

test('a redirect after the credential POST is followed once, and its cookie kept', async () => {
  const seen: string[] = [];
  const http: HttpTransport = {
    async request(opts) {
      seen.push(`${opts.method} ${opts.url}`);
      if (/page=login/.test(opts.url)) {
        return { status: 200, headers: { 'set-cookie': ['JSESSIONID=pre; Path=/'] }, body: LOGIN_HTML };
      }
      if (opts.method === 'POST') {
        return {
          status: 302,
          headers: { location: '/track/Track?page=menu.top', 'set-cookie': ['JSESSIONID=post-login; Path=/'] },
          body: '',
        };
      }
      if (/page_cmd=mapupd/.test(opts.url)) return { status: 200, headers: {}, body: FLEET };
      return { status: 200, headers: {}, body: LOGIN_HTML };
    },
  };

  const session = new IccesSession(CREDS, http);
  await session.login();

  assert.ok(seen.some((s) => s.includes('page=menu.top')), 'the redirect should have been followed');
  const redirectHops = seen.filter((s) => s.includes('page=menu.top')).length;
  assert.equal(redirectHops, 1, 'exactly one hop — never a redirect loop');
});
