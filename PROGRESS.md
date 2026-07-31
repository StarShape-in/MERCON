# MERCON — Project Progress (Living Status)

**This is the single source of truth for "where is the project."**
Last updated: **2026-07-31** (added dedicated Vehicle Maintenance & Renewals page `/maintenance` with full CRUD, start/end dates, work done, status, and cost expense tracking; integrated Full Vehicle Financial & Profitability Report P&L + maintenance history ledger on `/vehicles/:id`) · Owner: Hysam (solo dev + AI) · Deadline: ~1 month from July 2026

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
| **Mobile app** (Driver + Operator) | 🔄 Driver side ~done (nav + full trip flow + all core screens); operator side now navigable + wired (Home/Trips/TripDetails/CreateTrip/Drivers/Vehicles/Invoices/VehicleRenewals all real); only secondary Replacement/Splash screens left static; live GPS pending | ~72% |
| **Live GPS tracking** (driver → web) | 🔄 Foreground streaming wired (socket emit); background + device verification pending | ~60% |
| **Testing / builds / handover** | ❌ Not started (no real-phone run yet) | 0% |

**One-line status:** Backend and web are basically finished. Trips can no longer be created without
a driver + vehicle (auto-dispatched immediately, driver notified). On **mobile**, the whole **driver
side is real** — navigation, a straight-through trip flow (photo → live map with GPS auto-arrival →
POD → done), notifications, profile, documents, vehicle, emergency, and foreground **live GPS**
streaming. The **operator side is now navigable and wired**: Admin logs into the same operator nav
as Operator, `/operator/{trips,trip-details,create-trip,drivers,vehicles,invoices,vehicle-renewals}`
routes exist, the bottom nav + FAB actually go somewhere, trip cards tap through to a real
trip-details screen (real timeline/cargo/driver/vehicle, call-driver, "coming soon" for live
tracking/edit), Create Trip posts to `POST /trips` against real customers/available drivers/vehicles,
and Vehicle Renewals (reachable from the Home "docs expiring" alert) shows real expiring vehicle
documents. Remaining: GPS background hardening + device verification, then real-phone testing +
release builds.

---

## 2. ✅ Completed

### Backend (`backend/api-server`)
| Piece | State |
|---|---|
| 18 controllers (auth, users, drivers, vehicles, customers, trips, invoices, rate cards, documents, maintenance, notifications, reports, tracking, uploads + 2 mobile) | ✅ real DB logic |
| Prisma schema (11 models, 10 enums), PostgreSQL, idempotent seed (admin + operator accounts only — see §6, fake demo data seeding was added and removed same day) | ✅ (2026-07-29) |
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
- ✅ `EmergencyScreen` → `POST /mobile/emergency` (incident type + notes + GPS location now attached; reachable via SOS button on Home + Live Navigation — was previously unwired/unreachable); photo capture UI still local-only — backend has no attachment endpoint for emergency reports yet (needs a `DocType`/schema decision, flagged separately)
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

### Milestone 3 — Operator mobile screens
- ✅ `_layout.tsx` shows `OperatorBottomNav` for both `Operator` and `Admin` roles (was Operator-only, so Admin got the driver nav — fixed)
- ✅ `src/app/operator/{trips,trip-details,create-trip,drivers,vehicles,invoices}.tsx` route files created; registered in the root `Stack` and `TAB_ROUTES`
- ✅ `OperatorBottomNav` — Trips/Drivers tabs and the FAB now navigate to real routes (previously Drivers→`/documents`, Trips→driver `/trips`, FAB did nothing)
- ✅ `HomeScreen` (dashboard metrics) — real KPIs via `/reports/summary` + active trips via `/trips`
- ✅ `TripListScreen` — real `/trips` with status filters, KPI chips, search; cards tap through to `TripDetailsScreen`
- ✅ `TripDetailsScreen` — real trip via `GET /trips/:id` (timeline built from status + stop timestamps, cargo, driver, vehicle); "Call Driver" opens the dialer; "Track Live" / "Edit Trip" show a "coming soon" alert (no map/edit screen yet)
- ✅ `CreateTripScreen` — real customers (`GET /customers`) + available drivers/vehicles (`GET /drivers|vehicles?status=Available`); posts `POST /trips` with pickup/dropoff lat-lng (plain numeric inputs, no map picker yet)
- ✅ `DriverListScreen` — real `/drivers` (status filters, search, tap-to-call)
- ✅ `VehicleListScreen` — real `/vehicles` (status filters, stats, search)
- ✅ `VehicleRenewalScreen` — real vehicle documents via `GET /documents?entity_type=Vehicle` joined with `GET /vehicles` for plate numbers; due/critical/overdue buckets derived from `expiry_date` (no fake doc types/costs — uses the real `DocType`/`DocStatus` enums); reachable from the Home KPI "documents expiring soon" alert → `/operator/vehicle-renewals`; "Renew Now" shows a "coming soon" alert (no re-upload flow yet)
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
| TripListScreen (filters + KPI chips + search, tap→details) | operator | ✅ |
| TripDetailsScreen (real trip, timeline, call driver) | operator | ✅ |
| CreateTripScreen (real customers/drivers/vehicles, POST /trips) | operator | ✅ |
| DriverListScreen (filters + search + call) | operator | ✅ |
| VehicleListScreen (filters + stats + search) | operator | ✅ |
| InvoiceListScreen (filters + stats + search) | operator | ✅ |
| VehicleRenewalScreen (real doc expiry tracker, reachable from Home alert) | operator | ✅ |

**Wired: 21 / 24 screens** (all core driver screens + all operator screens except the secondary
driver Replacement/Splash screens). Operator nav now actually reaches every wired operator screen —
Admin included.

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

## 6. Full-stack audit remediation (2026-07-29)

A full audit (backend/web/mobile/deploy) found 6 critical, ~13 high, ~10 medium, and
several low-severity issues. Fixing in phases per `~/.claude/plans/hidden-painting-deer.md`
(local plan file, not in repo). Status:

- ✅ **Phase 0 — Credential rotation (code)**: `docker-compose.yml` now requires
  `POSTGRES_USER`/`POSTGRES_PASSWORD` as GitHub secrets (was hardcoded `mercon_user`/
  `mercon_password`), Postgres port bound to `127.0.0.1` only (was public on `15432`),
  `ci-cd.yml` passes the new secrets through with the same abort-if-unset guard as
  `JWT_SECRET`. **Owner action still needed**: generate a real password, add
  `POSTGRES_USER`/`POSTGRES_PASSWORD`/`SEED_ADMIN_PASSWORD` as GitHub Actions secrets
  before the next deploy, or the container will fail to start.
- ✅ **Phase 1 — Critical, item 1**: `prisma/seed.ts` rewritten to seed only the two
  canonical accounts (`admin`, `operator`) per this file's own rules — no more fake
  customers/drivers/vehicles/trips/invoices seeded into production on every deploy.
  **Not done yet**: already-seeded fake rows already in the production DB are untouched;
  owner needs to review and manually clean those up.
- ✅ **Phase 1, item 2**: `POST/PUT /users` now Zod-validates `role` to `Admin|Operator`
  only — previously any string was accepted, so an Admin could set `role: "Driver"`
  through User Management, contradicting the "Driver users must not be creatable there"
  rule.
- ✅ **Phase 1, item 3**: Socket.IO now requires a valid JWT in the connection handshake
  (was fully open — anyone could connect and listen to every live GPS/notification
  event). Sockets auto-join a private room by identity; trip GPS relay validated against
  the sending driver's own assigned trip and scoped to a `trip:<id>` room; dashboards/
  drivers must `join:trip` (authorized server-side) to receive it.
- ✅ **Phase 1, item 4**: Driver `EmergencyScreen` was fully built but unreachable (no
  route, no nav entry) and used a stale `navigation` prop that would have silently no-op'd
  even if reachable. Fixed: converted to `expo-router`'s `useRouter`, added a
  `/trip/emergency` route, added an SOS button on the driver Home screen header and on
  `LiveNavigationScreen`'s top bar, and `send()` now attaches the device's current GPS
  coordinates.
- ✅ **Follow-up (owner-approved)**: `TripTrackingPage.tsx` (web) was found to no longer
  use a real socket connection — it rendered simulated telemetry
  (`useSimulatedTelemetry`/`PREDEFINED_ROUTES`) instead of live GPS, with fabricated
  "Riyadh Dry Port"/"Jeddah Islamic Port" location names and a fake ETA/progress bar on
  every trip regardless of actual route. Rewired to the real authenticated Socket.IO
  connection (`join:trip`, listens on `trip:location_update:<id>`), shows real pickup/
  dropoff coordinates instead of hardcoded port names, and a real "LIVE"/"DISCONNECTED"
  status + "last update" timestamp instead of the always-green fake indicator. Verified
  end-to-end locally (simulated a driver GPS emit over an authenticated socket, confirmed
  the truck marker/speed/timestamp updated on the dashboard in real time).
- ✅ **Follow-up (owner-approved)**: Emergency incident photos now actually reach the
  backend — added `DocType.Emergency` to `schema.prisma` (additive enum value, pushed
  locally via `prisma db push`, will auto-apply on next production deploy per this repo's
  existing `prisma db push --accept-data-loss` deploy step), added multipart upload
  (`upload.array('photos', 4)`) to `POST /mobile/emergency`, and the endpoint now creates
  a `Document` per photo linked to the driver's active trip. Verified end-to-end via curl
  (uploaded a real file, confirmed the `Document` row was created with the right
  `entity_id`/`doc_type`).
- ✅ **Phase 2 (High) — items 11–17 (session continued)**:
  - **Item 11** (mobile global 401 handling): `api.ts` response interceptor now clears
    SecureStore + routes to `/login` on any 401 — done in previous session.
  - **Item 12** (duplicate photo upload on retry): `PickupVerificationScreen` and
    `DeliveryVerificationScreen` now track uploaded-photo indices in a `useRef<Set<number>>`;
    a retry only re-uploads photos that failed, not those already successfully sent. Also
    added a `inFlight` ref to prevent double-tap re-entrancy (React state updates are async,
    so a ref guard is needed in addition to the `submitting` state). Also fixed
    `camera.ts` which had been accidentally doubled (all functions declared twice) — removed
    the stale second copy; the first copy (with `expo-image-manipulator` resize to 1280px)
    is the correct one.
  - **Item 13** (web 401 vs 403 split): `src/lib/api.ts` now only force-clears the session
    on 401 (expired/revoked token). A 403 (authorised user, wrong role) is now rejected
    as a normal error so the calling page can show an inline "You don't have permission"
    message instead of silently logging the operator out.
  - **Item 14** (block expired-license driver onboarding): `AddDriverPage.tsx` now includes
    `isExpiryValid` in `isFormValid` and in `handleSubmit`, blocking onboarding when the
    license is already expired. Same check added to `CreateDriverModal.tsx` (the inline
    "Add Driver" modal on Create Trip page).
  - **Item 15** (cargo type field): `CreateTripPage.tsx` now has a real "Cargo Type"
    dropdown (General Goods / Refrigerated / Hazmat / Oversized / Liquid Bulk / Dry Bulk)
    instead of a hardcoded `'General Goods'`; the live KPI card now shows the selected
    type, with a HAZMAT badge when that flag is also set.
  - **Item 16** (time ordering check): `CreateTripPage.tsx` now validates
    `dropoffTime > pickupTime` before submission and shows a clear error with the form
    switching back to the Route tab.
  - **Item 17** (invoice subtotal from rate card): `CreateInvoicePage.tsx` now fetches the
    selected customer's active rate card on trip selection and auto-fills the subtotal from
    `base_price`. The field stays editable; an "Auto-filled from rate card — editable" badge
    appears and the input gets a green border when auto-filled.
- ✅ **Phase 3 (Medium) — completed (session continued)**:
  - **Item 20** (sendBulkCommunication): UI updated to clearly state "Not connected to SMS provider" to avoid user confusion.
  - **Item 21** (Reports pagination): Modified `reportsController`, `reportsService`, `FleetPerformancePage`, and `DriverPerformancePage` to handle pagination properly and extract data array.
  - **Item 22** (isError handling/banners): Systematically updated `DataTable.tsx` references across all major list pages (Drivers, Vehicles, Trips, Invoices, Rate Cards, Customers, User Management) and `DashboardPage` to handle errors correctly.
  - **Item 23** (Sidebar notification badge): Wired `Sidebar.tsx` to use react-query and `notificationService` to display real unread notification counts instead of a hardcoded value.
  - **Item 24** (Trip-status transition guard): Implemented transition guard in `TripListPage.tsx` to prevent selecting invalid statuses for a trip, mirroring the backend validation. (`TripDetailsPage.tsx` was verified to already be safe).
  - **Item 25** (Attach JWT to Socket.IO in TripTracking): Verified `TripTrackingPage.tsx` already attaches JWT to `auth.token` and has a live status indicator.
  - **Item 26** (CI/CD health-check for docker): Added `pg_isready` healthcheck to `postgres-db` and `curl` healthcheck to `mercon-api` in `docker-compose.yml`.
  - **Items 27 & 28** (TLS/HSTS and tighten CORS): Installed `helmet`, configured HSTS, and restricted CORS to specific dashboard origins in `backend/api-server/src/index.ts`.
- ✅ **Phase 4 (Low/Cleanup) — completed (session continued)**:
  - **Item 29** (Add Zod to createMaintenanceRecord): Added Zod schema validation to `maintenanceController.ts`.
  - **Item 30** (Consolidate multer configs): Removed duplicate `multer` config from `uploadController.ts` and reused the one in `middlewares/upload.ts`.
  - **Item 31** (Add index on Trip): Added `@@index([vehicleId, driverId])` to the `Trip` model in `schema.prisma`.
  - **Item 32** (Dead code removal): Confirmed unused routes (like trackingRoutes) are deleted.
  - **Item 33** (Replace implicit any): Replaced `any` with `Prisma.TripWhereInput` in `tripController.ts`.
  - **Item 34** (Improve mobile NavigationCard UI padding): Improved bottom padding on the `LiveNavigationScreen` to handle safe area constraints gracefully.
  - **Item 35** (Standardize error response shape): Refactored `uploadController.ts` to follow the standard `error: { code: '...', message: '...' }` pattern.

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
