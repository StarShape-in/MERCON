# Google Maps setup — address entry

**Status: connected.** `frontend/web-dashboard/src/services/addressSearch.ts` is
the only file that calls Google, and it answers with Nominatim whenever the key
is absent or Google fails. This document is what has to be set up in Google
Cloud for the Google path to be the one that actually runs.

## What we used before, and why it had to change

| Job | Today | Problem |
|---|---|---|
| Address search when creating a trip or a location | **Nominatim** (`nominatim.openstreetmap.org`) | Free community service. Its usage policy caps you at ~1 request/second, requires an identifying User-Agent, and forbids heavy commercial use. A dispatcher typing an address fires a request per keystroke (debounced 400ms) — that is exactly the pattern the policy prohibits. |
| Map tiles (web + driver app) | **OpenStreetMap raster tiles** | Fine, and staying. Free, no key, no quota problem at our volume. |
| Driver turn-by-turn route | **`router.project-osrm.org`** | A public *demo* server run for testing. No SLA, no support, and it can be rate-limited or taken down without notice. A driver mid-route depends on it. |
| Truck position | **ICCES GPS devices** (`services/icces/fleetPoller.ts`) | Already ours, already working. Unrelated to Google — this is the hardware in the trucks, and it stays. |

**Decision (2026-08-09):** move **address entry only** to Google. Map display
stays on OpenStreetMap tiles, because Google bills per map load and we render
maps on the tracking page, trip details and several KPI cards — that is a large
recurring cost for no gain over the tiles we already show.

The OSRM driver routing is a separate known risk. It is *not* covered by this
change; see "Still outstanding" below.

## What to enable in Google Cloud

1. Create a project at <https://console.cloud.google.com/> (or reuse one).
2. **Enable billing on the project.** Maps APIs return an error on every request
   without it, even inside the free monthly credit.
3. Enable exactly these two APIs — nothing else, so a mistake can't quietly bill
   you for Directions or Map Loads:
   - **Places API (New)** — the address autocomplete dropdown
   - **Maps JavaScript API** — how the browser reaches Places. The app loads
     the Places library through `google.maps.importLibrary("places")`, which is
     served by this API. It does **not** render a Google map: tiles stay on
     OpenStreetMap, so no Dynamic Maps load is billed.

   **Geocoding API is deliberately not enabled.** Place Details already returns
   the formatted address *and* the coordinates in the same response, so
   geocoding would be a second billed call for data we were already handed.
4. Create an API key under *APIs & Services → Credentials*.
5. **Restrict the key** before using it. An unrestricted Maps key found in a
   public JS bundle gets scraped and billed to you:
   - *Application restrictions*: **HTTP referrers**, set to `https://mercon.tech/*`
     (add `http://localhost:*` while developing).
   - *API restrictions*: **Restrict key** → tick only Places API (New) and
     Maps JavaScript API.
6. Set a **budget alert** on the project (*Billing → Budgets & alerts*). Google
   does not cap spend by default; an alert is the only thing that tells you if
   something starts looping.

## Where the key goes

The address search runs in the browser, so this is a **frontend** variable. It
ships in the JS bundle — which is normal and expected for a Maps key, and is
exactly why the referrer restriction in step 5 is not optional.

```
# frontend/web-dashboard/.env
VITE_GOOGLE_MAPS_API_KEY=your-key-here
```

Add the same variable as a build argument in `docker-compose.yml` for the
web-dashboard service, since Vite inlines env vars at **build** time — setting
it only at runtime on the container has no effect.

## How the app uses it

`LocationPickerMap`'s "Search an address…" box is the only consumer, and it
talks to `services/addressSearch.ts` rather than to Google directly.

- **Autocomplete.** Each keystroke (debounced 400ms) calls
  `AutocompleteSuggestion.fetchAutocompleteSuggestions`.
- **Session token.** One token is minted on the first keystroke of an
  interaction and reused for every later keystroke, then spent by the Place
  Details call that ends it. That is what makes a whole interaction bill as one
  session instead of per request — so abandoning a search without picking
  anything is the expensive shape, not a long one.
- **Place Details** requests exactly three fields: `displayName`,
  `formattedAddress` and `location`. This terminates the session using a
  request containing a Pro-tier field; the exact SKU of that terminating
  request is governed by Google's current Places pricing. Adding fields can
  move it into a higher tier, which is why the list is fixed.
- **What gets stored.** `displayName` → `location_name` (the short label reports
  group routes by), `formattedAddress` → `location_address` (what the driver's
  app shows), `location.lat/lng` → `location_lat` / `location_lng` (the pin).
- **Fallback.** With no key, the Google branch is statically dead and the
  bundler drops it entirely — the build ships Nominatim only. With a key that
  fails at runtime (blocked script, rejected referrer, API error) the module
  falls back to Nominatim for the rest of the page's life and logs a warning.
  Local development without a key stays fully usable.

## Still outstanding

- **Driver routing on the OSRM demo server.** Moving it to Google Directions API
  is a separate decision with a separate per-request cost, and was explicitly
  scoped out of the "addresses only" choice. Until then the driver's blue route
  line depends on a free demo server with no SLA.
- **Trips created before this change** have no address on their stops, so the
  driver app shows the location name and coordinates only. There is no backfill
  — the addresses were never captured, so there is nothing to backfill from.
  Re-enter them on the trip if a driver needs one.
