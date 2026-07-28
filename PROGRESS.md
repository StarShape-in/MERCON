# MERCON — Project Progress (Living Status)

**This is the single source of truth for "where is the project."**
Last updated: **2026-07-28** (trip creation now requires driver+vehicle & auto-dispatches; web location picker; mobile driver flow goes straight through to a real live-map screen with auto arrival detection) · Owner: Hysam (solo dev + AI) · Deadline: ~1 month from July 2026

> ⚠️ **Keep this file honest.** It is written from reading the actual code, not the
> docs (the `docs/` folder describes the *planned* product and overstates progress).
> See the **[Update protocol](#update-protocol)** at the bottom — this file must be
> updated in the same change as any code/schema/endpoint/screen change.

---

## 1. TL;DR — where we are

| Area | Status | Done |
|---|---|---|
| **Backend API** | ✅ Working, deployed at mercon.tech | ~90% |
| **Web dashboard** (Admin/Operator) | ✅ Done, all pages on real data | ~95% |
| **Mobile app** (Driver + Operator) | 🔄 Driver side ~done (nav + full trip flow + all core screens); operator side static; live GPS pending | ~50% |
| **Live GPS tracking** (driver → web) | 🔄 Foreground streaming wired (socket emit); background + device verification pending | ~60% |
| **Testing / builds / handover** | ❌ Not started (no real-phone run yet) | 0% |

**One-line status:** Backend and web are basically finished. Trips can no longer be created without
a driver + vehicle (auto-dispatched immediately, driver notified). On **mobile**, the whole **driver
side is real** — navigation, a straight-through trip flow (photo → live map with GPS auto-arrival →
POD → done), notifications, profile, documents, vehicle, emergency, and foreground **live GPS**
streaming. Remaining: the **operator mobile screens** (all 8 static), GPS background hardening +
device verification, then real-phone testing + release builds.

---

## 2. ✅ Completed

### Backend (`backend/api-server`)
| Piece | State |
|---|---|
| 18 controllers (auth, users, drivers, vehicles, customers, trips, invoices, rate cards, documents, maintenance, notifications, reports, tracking, uploads + 2 mobile) | ✅ real DB logic |
| Prisma schema (11 models, 10 enums), PostgreSQL, idempotent seed | ✅ |
| JWT auth + **RBAC** `authorizeRoles` on all feature routes | ✅ (`ddbe688`) |
| Exactly 3 roles: Admin / Operator / Driver (Prisma enum + shared-types) | ✅ locked |
| Live GPS relay (Socket.io: receives `driver:location_update`, broadcasts to web) | ✅ |
| ICCES vehicle-tracker polling (3 background jobs) | ✅ (creds not provided yet) |
| File uploads (photos, documents) | ✅ |
| Zod request validation on write + list routes | ✅ (`79d4cd4`) |
| `POST /trips` requires `driver_id` + `vehicle_id` (no driverless trips); creates directly as `Dispatched` (same availability checks + `OnTrip` flip + driver notification as `dispatchTrip`), 400s if driver/vehicle isn't `Available` | ✅ (2026-07-28) |
| Structured logging (Pino), collision-safe reference IDs | ✅ (`d816736`, `f32cbca`) |
| `JWT_SECRET` rotated → GitHub Actions secret, leaked fallback removed | ✅ (2026-07-12) |
| Driver fixes: validate `PATCH /drivers/:id` (fixes "Failed to update"), free phone number on delete so it can be reused | ✅ (`a217c59`, `029cee7`) |

### Web dashboard (`frontend/web-dashboard`) — Admin + Operator
| Piece | State |
|---|---|
| 44 pages, all wired to the real API (no mock data left) | ✅ |
| 11 service modules (auth, customer, driver, invoice, notification, rateCard, reports, trip, user, vehicle, document) | ✅ |
| Live trip tracking over WebSocket | ✅ |
| Role-gated pages (`RequireRole`) + User Management (Admin-only, web users only) | ✅ |
| Operator-driven password reset + "notify my operator" flow | ✅ |
| Debounced server-side search across list pages | ✅ (`0546e0f`) |
| Brand/semantic color tokens as Tailwind utilities | ✅ (`12fa35b`) |
| Site-wide semi-curved corners (replaced 224 `rounded-none` overrides → `rounded-lg`; shadcn primitives use idiomatic radii) | ✅ |
| Create Trip: driver + vehicle now required (no "leave unassigned"); pickup/dropoff lat/lng number inputs replaced with `LocationPickerMap` (address search via OpenStreetMap Nominatim + click/drag pin on a Leaflet map, no API key) | ✅ (2026-07-28) |
| Login page redesign: full-bleed logistics background image (`login-bg.png`), no center divider, logo pinned top-right, centered "Welcome back" heading + boxed sign-in card | ✅ (PR #2 → `a09fa8d`) |

### Mobile app (`frontend/mobile-app/mercon-app`) — Expo, Driver + Operator
| Piece | State |
|---|---|
| App entry fixed (`expo-router/entry`), 24 screens type-check (tsc 349→0) | ✅ |
| Runtime packages installed (axios, socket.io-client, expo-secure-store, expo-location, expo-image-picker) | ✅ |
| API client (JWT interceptor) + SecureStore auth context (auto-login) | ✅ |
| **Unified login** (single form, auto-detects driver vs operator by credentials — no mode toggle) + **role routing** (`app/index.tsx`); redesigned UI (real logo, hero background image `login-hero.png`, simplified Username/Password inputs — driver: phone/license, no welcome heading, centered compact card, notify-operator button below card) | ✅ (`c3c83cf`) |
| Driver **Home**: real current trip, status updates, cargo + POD photos (camera), photo-gated status | ✅ (`fee951d`, `dd184c1`) |
| Bottom nav redesign (driver + operator): lucide icons, orange "capsule" active indicator (springs in on page switch), sized like a standard app bar, dropped lower | ✅ |
| Profile header redesign: larger avatar left, name + driver ID + status badge stacked to its right | ✅ |
| **App-wide emoji → lucide icon sweep**: every driver + operator screen, shared `SearchInput`, and the `docIcon`/`notificationIcon` helpers now use lucide icons (no emojis anywhere in the UI) | ✅ |
| Active-trip card redesign (Home): fixed edge-clipping (DarkCard padding) + route timeline, divider, tidy meta row | ✅ |
| Home screen: trip section (empty banner or active-trip card) now centers vertically in the remaining page space; full-screen faded truck/route background image (`home-bg.png`) behind header + content | ✅ |
| Photo upload: camera **or** gallery (`choosePhoto` chooser) on pickup/delivery/home; pickup checklist removed, larger confirm button | ✅ |
| Driver trip flow now goes straight through, no detour back to Home: pickup cargo photo → real live map (`react-native-maps` + OSM tiles, no API key) with the dropoff pin → GPS geofence auto-detects arrival (200m) and jumps straight to POD → complete. `DestinationReachedScreen` (manual "confirm arrival" screen) removed; `LiveNavigationScreen` replaced (was a fake placeholder) and wired at `/trip/navigate` | ✅ (2026-07-28) |

### Mobile backend endpoints (`/api/mobile/*`)
| Endpoint | State |
|---|---|
| `POST /mobile/login` (unified, returns role) | ✅ |
| `GET /mobile/trips/current` | ✅ |
| `POST /mobile/trips/:id/status` | ✅ |
| `POST /mobile/trips/:id/photo` | ✅ |
| `GET /mobile/trips/history` (past trips, `?limit`) | ✅ |
| `GET /mobile/notifications` + `POST /:id/read` (driver, keyed by `Notification.driverId`) | ✅ |
| Driver "Trip Assignment" notification on dispatch + driver-replace | ✅ delivers |
| `GET /mobile/profile` (identity, license, phone, active-trip vehicle) | ✅ |
| `POST /mobile/emergency` (alerts all active Admins + Operators) | ✅ |
| `GET /mobile/documents` (driver's own docs) + `GET /mobile/vehicle` (active-trip vehicle) | ✅ |

---

## 3. 🔜 What's next (remaining work)

Legend: ⬜ not started · 🔄 in progress · ✅ done

### Milestone 1 — Finish driver trip workflow
**Backend endpoints (missing):**
- ✅ `GET /mobile/trips/history` — driver's past trips
- ✅ `GET /mobile/notifications` (+ `POST /:id/read`) — driver notifications
- ✅ `POST /mobile/emergency` — emergency alert (notifies operators/admins)
- ✅ `GET /mobile/profile` — driver profile

**Wire driver screens (currently static UI):**
- ✅ `PickupVerificationScreen` → cargo photo + `AtPickup → InTransit` (`/trip/pickup`)
- ✅ `DeliveryVerificationScreen` → POD photo + `AtDelivery → Completed` (`/trip/delivery`); receiver-name/signature dropped (no schema field — owner decision)
- ✅ `LiveNavigationScreen` → real map + GPS geofence auto-detects `InTransit → AtDelivery` (expo-router `/trip/navigate`, replaces the old manual `DestinationReachedScreen`/`/trip/arrived`)
- ✅ `TripCompletedScreen` → real summary of the latest completed trip (`/trip/completed`)
- ✅ `TripsScreen` (history) — real Active/Upcoming/Completed tabs
- ✅ `NotificationsScreen` — real feed + mark read / mark all
- ✅ `ProfileScreen` — real identity/license/vehicle + working logout
- ✅ `DocumentsScreen` → `GET /mobile/documents` (real docs, expiry status, open file)
- ✅ `AssignedVehicleScreen` → `GET /mobile/vehicle` (active-trip vehicle + honest empty state)
- ✅ `EmergencyScreen` → `POST /mobile/emergency` (incident type + notes; photos & GPS deferred to M2)
- ✅ `SettingsScreen` — real logout (toggles are local-only); reachable (`/settings`)
- ⬜ `ReplacementDriverScreen` / `SplashScreen` (as needed)

### Milestone 2 — Driver live GPS
- ✅ `expo-location` foreground tracking while a trip is active (~10s / 20m) — plugin added to `app.json`
- ✅ `socket.io-client` connect + emit `driver:location_update` (shared socket, backend receives it)
- ⬜ Handle background / locked screen / network drops (foreground done; background is a hardening step)
- 🔄 End-to-end: truck moves live on the operator's web map — code complete, needs real-device verification

**How it's wired:** `src/lib/socket.ts` (shared connection), `use-live-tracking.ts` (watch + emit),
`DriverLiveTracking.tsx` (headless, polls current trip) rendered on the driver landing. Streams
`{ tripId, driverId, lat, lng, speed }`; the web `TripTrackingPage` already listens on
`trip:location_update:<tripId>`.

### Milestone 3 — Operator mobile screens (all 8 static)
- ✅ `HomeScreen` (dashboard metrics) — real KPIs via `/reports/summary` + active trips via `/trips`; operator nav/quick-actions pending
- ✅ `TripListScreen` — real `/trips` with status filters, KPI chips, search (nav to details pending)
- ⬜ `TripDetailsScreen` + live tracking map (socket)
- ⬜ `CreateTripScreen` (multi-step form)
- ✅ `DriverListScreen` — real `/drivers` (status filters, search, tap-to-call)
- ✅ `VehicleListScreen` — real `/vehicles` (status filters, stats, search)
- ⬜ `VehicleRenewalScreen`
- ✅ `InvoiceListScreen` — real `/invoices` (status filters, stat cards, search)

### Milestone 4 — Testing, builds, handover
- ⬜ Real-phone test, both roles (Android + iPhone)
- ⬜ EAS builds — APK (Android) + TestFlight (iOS)
- ⬜ Database backup set up + tested once
- ⬜ Short user guide (operator + driver, with screenshots)
- ⬜ Full end-to-end acceptance: create trip → driver runs it → invoice appears

### Schema note — driver notifications (resolved 2026-07-25, Option A)
`Notification` now has a nullable `userId` **or** `driverId` recipient (added `driverId`,
made `userId` optional). Web notifications still key off `userId`; driver notifications
key off `driverId`. `createDriverNotification()` + the trip-assignment trigger use it.
**Schema change deploys via `prisma db push --accept-data-loss` — additive/widening, no data loss.**

### Deferred (not v1)
- Push notifications (FCM) · map upgrade (Google/Mapbox) · OTP SMS login · big automated test suite · ICCES live creds (env vars pending)

---

## 4. Screen wiring tracker (mobile)

| Screen | Role | Wired? |
|---|---|---|
| LoginScreen | shared | ✅ |
| HomeScreen (trip flow + photos) | driver | ✅ |
| TripsScreen (history + active/upcoming tabs) | driver | ✅ |
| NotificationsScreen (feed + mark read/all) | driver | ✅ |
| ProfileScreen (identity/license/vehicle + logout) | driver | ✅ |
| EmergencyScreen (alert → operators/admins) | driver | ✅ |
| LiveNavigationScreen (live map, GPS auto-arrival → AtDelivery) | driver | ✅ |
| PickupVerificationScreen (cargo photo → InTransit) | driver | ✅ |
| DeliveryVerificationScreen (POD photo → Completed) | driver | ✅ |
| TripCompletedScreen (completion summary) | driver | ✅ |
| SettingsScreen (logout) | driver | ✅ |
| DocumentsScreen (real docs + expiry) | driver | ✅ |
| AssignedVehicleScreen (active-trip vehicle) | driver | ✅ |
| ReplacementDriver/Splash | driver | ⬜ static (secondary) |
| HomeScreen (dashboard KPIs + active trips) | operator | ✅ |
| TripListScreen (filters + KPI chips + search) | operator | ✅ |
| DriverListScreen (filters + search + call) | operator | ✅ |
| VehicleListScreen (filters + stats + search) | operator | ✅ |
| InvoiceListScreen (filters + stats + search) | operator | ✅ |
| TripDetails/CreateTrip/VehicleRenewal | operator | ⬜ static |

**Wired: 18 / 24 screens** (all core driver screens + operator dashboard, trips, drivers, fleet & invoices; operator nav still needed to reach the operator screens).

**Driver navigation now works** (expo-router): the bottom nav (Home/Trips/Profile) and Profile's
quick actions + Notifications link actually navigate — so the already-wired Trips, Notifications,
and Profile screens are reachable in the running app for the first time. Routes live at
`src/app/{trips,profile,notifications,documents,vehicle,settings}.tsx`.

**Driver trip flow — fully wired end to end, straight-through** via expo-router (`src/app/trip/*`):
Dispatched →(inline)→ AtPickup →`/trip/pickup` (cargo photo)→ InTransit →`/trip/navigate`
(live map, GPS auto-detects arrival within 200m, manual "I've Arrived" fallback)→
AtDelivery →`/trip/delivery` (POD photo)→ Completed →`/trip/completed` (summary). No more
detour back to Home between pickup and delivery. Home still routes into each step by status
and refetches on focus (for a driver who backgrounds the app mid-flow).

---

## 5. Verification & ops status
- Backend `tsc`: clean · Web `tsc --noEmit`: clean · Mobile `tsc --noEmit`: 0 errors (as of last session).
- Trip creation (driver required, auto-dispatch, availability conflict, driver notification) verified end-to-end against a local Postgres + running API (manual curl pass, test rows cleaned up).
- Web location picker (Nominatim address search + Leaflet pin drop/drag, recenter-on-search) verified in-browser.
- `react-native-maps` added (mobile) for the new live-map screen; not yet run in a simulator/device — see below.
- ❌ **Not yet run on a real phone against the live server** — this is the next real check.
- Git identity reminder: ensure commits use `sayedhysampm@gmail.com`.

---

## Update protocol

**This file is the project's status memory. Update it in the SAME change that alters reality:**

1. **When code/schema/endpoint/screen changes** — flip the matching ⬜/🔄/✅, move rows
   between §2 (Completed) and §3 (Next), and update the §1 TL;DR percentages if an area
   crossed a threshold.
2. **When a step is finished** — mark it ✅ and add the commit hash where useful.
3. **Always bump `Last updated`** at the top to today's date.
4. Keep it honest — verify against code, never mark ✅ from intent alone.

Detailed session narratives go in `docs/progress/<date>.md`. The forward-looking plan
and locked decisions live in `PLAN.md`. **This file = current state at a glance.**
