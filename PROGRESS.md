# MERCON — Project Progress (Living Status)

**This is the single source of truth for "where is the project."**
Last updated: **2026-07-26** (site-wide semi-curved corners) · Owner: Hysam (solo dev + AI) · Deadline: ~1 month from July 2026

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

**One-line status:** Backend and web are basically finished. On **mobile**, the whole **driver
side is real** — navigation, full trip flow, notifications, profile, documents, vehicle, emergency,
and foreground **live GPS** streaming. Remaining: the **operator mobile screens** (all 8 static),
GPS background hardening + device verification, then real-phone testing + release builds.

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
| Structured logging (Pino), collision-safe reference IDs | ✅ (`d816736`, `f32cbca`) |
| `JWT_SECRET` rotated → GitHub Actions secret, leaked fallback removed | ✅ (2026-07-12) |

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

### Mobile app (`frontend/mobile-app/mercon-app`) — Expo, Driver + Operator
| Piece | State |
|---|---|
| App entry fixed (`expo-router/entry`), 24 screens type-check (tsc 349→0) | ✅ |
| Runtime packages installed (axios, socket.io-client, expo-secure-store, expo-location, expo-image-picker) | ✅ |
| API client (JWT interceptor) + SecureStore auth context (auto-login) | ✅ |
| **Unified login** (single form, auto-detects driver vs operator by credentials — no mode toggle) + **role routing** (`app/index.tsx`); redesigned UI (real logo, input icons, password show/hide, compact card) — hero background image pending | ✅ |
| Driver **Home**: real current trip, status updates, cargo + POD photos (camera), photo-gated status | ✅ (`fee951d`, `dd184c1`) |

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
- ✅ `DestinationReachedScreen` → `InTransit → AtDelivery` (expo-router `/trip/arrived`, Home routes in)
- ✅ `TripCompletedScreen` → real summary of the latest completed trip (`/trip/completed`)
- ✅ `TripsScreen` (history) — real Active/Upcoming/Completed tabs
- ✅ `NotificationsScreen` — real feed + mark read / mark all
- ✅ `ProfileScreen` — real identity/license/vehicle + working logout
- ✅ `DocumentsScreen` → `GET /mobile/documents` (real docs, expiry status, open file)
- ✅ `AssignedVehicleScreen` → `GET /mobile/vehicle` (active-trip vehicle + honest empty state)
- ✅ `EmergencyScreen` → `POST /mobile/emergency` (incident type + notes; photos & GPS deferred to M2)
- ✅ `SettingsScreen` — real logout (toggles are local-only); reachable (`/settings`)
- ⬜ `LiveNavigationScreen` / `ReplacementDriverScreen` / `SplashScreen` (as needed)

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
| DestinationReachedScreen (arrived → AtDelivery) | driver | ✅ |
| PickupVerificationScreen (cargo photo → InTransit) | driver | ✅ |
| DeliveryVerificationScreen (POD photo → Completed) | driver | ✅ |
| TripCompletedScreen (completion summary) | driver | ✅ |
| SettingsScreen (logout) | driver | ✅ |
| DocumentsScreen (real docs + expiry) | driver | ✅ |
| AssignedVehicleScreen (active-trip vehicle) | driver | ✅ |
| LiveNavigation/ReplacementDriver/Splash | driver | ⬜ static (secondary) |
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

**Driver trip flow — fully wired end to end** via expo-router (`src/app/trip/*`):
Dispatched →(inline)→ AtPickup →`/trip/pickup` (cargo photo)→ InTransit →`/trip/arrived`→
AtDelivery →`/trip/delivery` (POD photo)→ Completed →`/trip/completed` (summary). Home routes
into each step by status and refetches on focus.

---

## 5. Verification & ops status
- Backend `tsc`: clean · Web `tsc -b && vite build`: clean · Mobile `tsc --noEmit`: 0 errors (as of last session).
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
