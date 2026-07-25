# MERCON — Project Progress (Living Status)

**This is the single source of truth for "where is the project."**
Last updated: **2026-07-25** · Owner: Hysam (solo dev + AI) · Deadline: ~1 month from July 2026

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
| **Mobile app** (Driver + Operator) | 🔄 Login + driver trip flow real; rest is static UI | ~25% |
| **Live GPS tracking** (driver → web) | ❌ Packages installed, no tracking code yet | 0% |
| **Testing / builds / handover** | ❌ Not started (no real-phone run yet) | 0% |

**One-line status:** Backend and web are basically finished. The remaining build is the
**mobile app** — unified login and the driver trip screen are real; the other 22 screens,
live GPS, and 4 mobile backend endpoints are still to do, then real-phone testing + release builds.

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

### Mobile app (`frontend/mobile-app/mercon-app`) — Expo, Driver + Operator
| Piece | State |
|---|---|
| App entry fixed (`expo-router/entry`), 24 screens type-check (tsc 349→0) | ✅ |
| Runtime packages installed (axios, socket.io-client, expo-secure-store, expo-location, expo-image-picker) | ✅ |
| API client (JWT interceptor) + SecureStore auth context (auto-login) | ✅ |
| **Unified login** with Driver/Operator toggle + **role routing** (`app/index.tsx`) | ✅ (`81b2987`) |
| Driver **Home**: real current trip, status updates, cargo + POD photos (camera), photo-gated status | ✅ (`fee951d`, `dd184c1`) |

### Mobile backend endpoints (`/api/mobile/*`)
| Endpoint | State |
|---|---|
| `POST /mobile/login` (unified, returns role) | ✅ |
| `GET /mobile/trips/current` | ✅ |
| `POST /mobile/trips/:id/status` | ✅ |
| `POST /mobile/trips/:id/photo` | ✅ |
| `GET /mobile/trips/history` (past trips, `?limit`) | ✅ |

---

## 3. 🔜 What's next (remaining work)

Legend: ⬜ not started · 🔄 in progress · ✅ done

### Milestone 1 — Finish driver trip workflow
**Backend endpoints (missing):**
- ✅ `GET /mobile/trips/history` — driver's past trips
- ⬜ `GET /mobile/notifications` — driver notifications
- ⬜ `POST /mobile/emergency` — emergency alert
- ⬜ `GET /mobile/profile` — driver profile

**Wire driver screens (currently static UI):**
- ⬜ `PickupVerificationScreen` → status + cargo photo
- ⬜ `DeliveryVerificationScreen` → status + POD photo
- ⬜ `DestinationReachedScreen`
- ⬜ `TripCompletedScreen`
- ✅ `TripsScreen` (history) — real Active/Upcoming/Completed tabs
- ⬜ `NotificationsScreen`
- ⬜ `ProfileScreen`
- ⬜ `DocumentsScreen`
- ⬜ `AssignedVehicleScreen`
- ⬜ `EmergencyScreen`
- ⬜ `SettingsScreen` (logout)
- ⬜ `LiveNavigationScreen` / `ReplacementDriverScreen` / `SplashScreen` (as needed)

### Milestone 2 — Driver live GPS
- ⬜ `expo-location` foreground tracking while a trip is active (~10s)
- ⬜ `socket.io-client` connect + emit `driver:location_update` (backend already receives it)
- ⬜ Handle background / locked screen / network drops
- ⬜ End-to-end: truck moves live on the operator's web map

### Milestone 3 — Operator mobile screens (all 8 static)
- ⬜ `HomeScreen` (dashboard metrics)
- ⬜ `TripListScreen`
- ⬜ `TripDetailsScreen` + live tracking map (socket)
- ⬜ `CreateTripScreen` (multi-step form)
- ⬜ `DriverListScreen`
- ⬜ `VehicleListScreen`
- ⬜ `VehicleRenewalScreen`
- ⬜ `InvoiceListScreen`

### Milestone 4 — Testing, builds, handover
- ⬜ Real-phone test, both roles (Android + iPhone)
- ⬜ EAS builds — APK (Android) + TestFlight (iOS)
- ⬜ Database backup set up + tested once
- ⬜ Short user guide (operator + driver, with screenshots)
- ⬜ Full end-to-end acceptance: create trip → driver runs it → invoice appears

### Deferred (not v1)
- Push notifications (FCM) · map upgrade (Google/Mapbox) · OTP SMS login · big automated test suite · ICCES live creds (env vars pending)

---

## 4. Screen wiring tracker (mobile)

| Screen | Role | Wired? |
|---|---|---|
| LoginScreen | shared | ✅ |
| HomeScreen (trip flow + photos) | driver | ✅ |
| TripsScreen (history + active/upcoming tabs) | driver | ✅ |
| Pickup/Delivery/DestinationReached/TripCompleted/Notifications/Profile/Documents/AssignedVehicle/Emergency/Settings/LiveNavigation/ReplacementDriver/Splash | driver | ⬜ static |
| Home/TripList/TripDetails/CreateTrip/DriverList/VehicleList/VehicleRenewal/InvoiceList | operator | ⬜ static |

**Wired: 3 / 24 screens.**

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
