# MERCON — The Real Plan to Handover

**Date:** July 11, 2026
**Who is building this:** One developer (Hysam), using AI to build everything.
**This document replaces the old plans. It is based on reading the actual code, not the docs.**

---

## Part 1: Where the project really stands today

### ✅ Backend API — DONE (about 90%)

This part is real and working. It is deployed at `mercon.tech` with Docker.

- 16 controllers with real database logic (trips, drivers, vehicles, customers, invoices, rate cards, documents, reports, notifications, users, auth)
- Login with JWT + role checks (Admin / Operator / Driver)
- Live GPS relay with Socket.io (receives `driver:location_update`, broadcasts to the dashboard)
- ICCES vehicle-tracker polling (3 background jobs: live fallback, odometer sync, alarm sync)
- File uploads (photos, documents)
- Database schema (Prisma + PostgreSQL) with seed script

**What is missing in the backend (for the driver app):**
- Only 3 mobile endpoints exist: driver login, get current trip, update trip status
- No mobile endpoints yet for: trip history, driver notifications, emergency alert, driver profile, linking uploaded photos to a trip step

### ✅ Web Dashboard (Operator) — DONE (about 95%)

This is genuinely finished and connected to the real API. 46 routes, all pages fetch real data.

- Dashboard, Trips (create/track/complete), Drivers, Vehicles, Customers, Invoices, Rate cards, Documents, Reports, Notifications, Settings
- Live trip tracking over WebSockets
- Role-based access (admin-only pages)

**Small things left:**
- The user list in Settings still shows fake data (`MOCK_USERS` in `UserListPage.tsx`) — needs to be connected to the real `/users` API
- The tracking map is basic (no Google Maps / Mapbox yet)

### ❌ Mobile App — NOT BUILT (only the design exists)

**This is the honest truth: the mobile app is a picture, not an app.**

There are 24 screens (16 driver + 8 operator) that look finished, but:
- No screen talks to the API — there is no axios/fetch anywhere in the app
- Login button does nothing (`onPress={() => {}}`)
- All data on every screen is hardcoded (fake names, fake trips)
- No login token is saved anywhere (no AsyncStorage / SecureStore)
- No GPS package installed (no expo-location)
- No camera package installed (no expo-camera / image picker)
- No socket connection (no socket.io-client)
- Screens are not even connected to each other with real navigation

So the mobile work is not "polish" — it is **the main remaining build**.

---

## Part 2: The plan (in order)

The one big goal: **turn the driver app from a mockup into a working app.**
My recommendation: **drop the operator mobile app from version 1.** The web dashboard already does everything an operator needs. Building two apps alone will double your time for little gain.

### Phase 1 — Driver app skeleton (≈ 1 week)
Make the app "alive": screens connected, login working for real.

1. Install the needed packages: axios, socket.io-client, expo-secure-store, expo-location, expo-image-picker, react-navigation (or wire up expo-router properly)
2. Build a small API client (base URL, attach token to every request)
3. Real login: call `POST /api/mobile/auth/login` (phone + license number), save the token, auto-login on app start
4. Real navigation: splash → login → home → trip screens, with the token deciding where you land

### Phase 2 — Trip workflow (≈ 1–1.5 weeks)
The heart of the app: a driver can actually do a trip.

1. Home screen: load the real current trip from `GET /api/mobile/trips/current`
2. Start trip / arrive / deliver: call `POST /api/mobile/trips/:id/status`
3. Cargo photos at pickup + delivery photos (POD): camera → upload to the existing upload endpoint
4. **Backend work needed:** new endpoints for trip history, emergency alert, driver notifications, and linking photos to trips

### Phase 3 — Live GPS (≈ 1 week)
1. When a trip is active, read GPS with expo-location every 10 seconds
2. Send `driver:location_update` over socket.io (backend already handles it — this connects the last wire)
3. Test it end to end: drive around, watch the truck move on the web dashboard
4. Handle the hard parts: app in background, phone locked, network drops

### Phase 4 — Remaining driver screens (≈ 1 week)
Trip history, notifications, emergency button, profile, documents, settings — each one: replace fake data with a real API call.

### Phase 5 — Real phone testing + release build (≈ 1 week)
1. Test on real Android phones (and iPhone if needed — see questions below)
2. Fix crashes, slow screens, GPS battery drain
3. Build the release APK with EAS (the GitHub Action for this already exists)
4. Decide distribution: direct APK to drivers, or Google Play

### Phase 6 — Finish the web + handover (≈ 1 week)
1. Connect the fake user list in Settings to the real API
2. (Optional) proper map (Google Maps / Mapbox) on the tracking page
3. Full end-to-end test: operator creates trip on web → driver does it on the phone → invoice appears
4. Database backup set up and tested once
5. Rotate the JWT secret on the server (the old one was in git)
6. A short user guide (a few pages with screenshots) for the operator and the drivers
7. Hand it over

### Total: about 6–7 weeks of solo work

Could be faster with AI doing the heavy lifting, but phone testing, GPS-in-background, and photo upload always eat more time than expected. Plan for 6–7, be happy at 5.

---

## Part 3: What NOT to do (to protect your time)

- ❌ Don't build the operator mobile app now — the web dashboard covers it
- ❌ Don't add push notifications (FCM) in v1 — the app checks for its trip when opened; that is enough to start
- ❌ Don't write a big automated test suite now — one solo dev, changing code daily; test the main flow by hand instead
- ❌ Don't add OTP SMS login — phone + license number login already exists and works
- ❌ Don't chase the icon TODOs in the mobile screens until the app actually works

---

## Part 4: Decisions made (July 11, 2026)

| Question | Decision |
|---|---|
| Deadline | **~1 month** — tight, so Phase 4 is trimmed (see below) |
| Phones | **Android + iPhone** (Expo builds both from one codebase) |
| Operator mobile app | **Cut from v1** — web dashboard covers it |
| Map | **Keep the basic map** for v1, upgrade later |

**Because of the 1-month deadline, these move to *after* handover:**
- Notifications screen, Documents screen, profile editing (profile becomes view-only)
- Map upgrade, push notifications, operator mobile app

**Do these TODAY (they take calendar days, not work days):**
- [ ] Enroll in the Apple Developer Program ($99/year) — verification takes 1–2 days
- [ ] Rotate `JWT_SECRET` on the VPS (the old one is in git history)

## Part 5: The 4-week schedule

| Week | Goal | Done when… |
|---|---|---|
| **1** | App skeleton: packages, API client, real login, real navigation | I can log in as a driver on a phone and land on a real home screen |
| **2** | Trip workflow: current trip, status updates, cargo + POD photos (+ the missing backend endpoints) | A driver can do a full trip from the phone, photos show on the web |
| **3** | Live GPS over socket.io + trip history + emergency button | The truck moves on the web dashboard map while I drive around |
| **4** | Real-phone testing (Android + iPhone), EAS release builds, fix the mock user list on web, backup test, mini user guide | MERCON can use it without me in the room |

## Part 6: Questions still open (answer when you can)

1. **Do you have real ICCES credentials?** The code uses demo values (`demo`/`demo123`). Without real ones, the vehicle-tracker fallback stays untested at handover.
2. **How will drivers install the app?** Direct APK link for Android (fast, free) — but iPhone needs TestFlight either way. Google Play can come later.
3. **Who creates the drivers in the system?** I assume: operator creates them on the web dashboard, then drivers just log in on the phone — confirm.

---

*Next step: start Week 1 (Phase 1) — driver app skeleton.*
