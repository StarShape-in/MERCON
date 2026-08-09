# Google Maps setup — address entry

**Status: not connected yet.** Nothing in the codebase calls Google. This
document is what the owner needs to do to enable it, and what will change once
the key exists.

## What we use today, and why it has to change

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
   - **Geocoding API** — turning a chosen address into coordinates
4. Create an API key under *APIs & Services → Credentials*.
5. **Restrict the key** before using it. An unrestricted Maps key found in a
   public JS bundle gets scraped and billed to you:
   - *Application restrictions*: **HTTP referrers**, set to `https://mercon.tech/*`
     (add `http://localhost:*` while developing).
   - *API restrictions*: **Restrict key** → tick only Places API (New) and
     Geocoding API.
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

## What changes in the app once the key is set

- `LocationPickerMap`'s "Search an address…" box switches from Nominatim to
  Google Places Autocomplete. Same field, better and legally usable results.
- Picking a suggestion fills, as it does now: the pin coordinates, the short
  **location name**, and the full **address** — the last of which is what the
  driver's app displays.
- Adding a place from the location dropdown geocodes the typed name, so a
  `Location` gets a real verified address and coordinates instead of only a name.
- **Fallback:** if `VITE_GOOGLE_MAPS_API_KEY` is absent, the search must keep
  working on Nominatim rather than breaking. Local development and any
  environment without the key has to stay usable.

## Still outstanding

- **Driver routing on the OSRM demo server.** Moving it to Google Directions API
  is a separate decision with a separate per-request cost, and was explicitly
  scoped out of the "addresses only" choice. Until then the driver's blue route
  line depends on a free demo server with no SLA.
- **Trips created before this change** have no address on their stops, so the
  driver app shows the location name and coordinates only. There is no backfill
  — the addresses were never captured, so there is nothing to backfill from.
  Re-enter them on the trip if a driver needs one.
