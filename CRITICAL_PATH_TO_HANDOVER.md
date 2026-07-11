# MERCON — Critical Path to Handover

**Purpose:** Identify the absolute minimum viable work to ship to production in 4 weeks.  
**Audience:** Engineering leads, project manager  
**Last Updated:** July 2026

---

## 🎯 MVP Scope (Critical Path)

Not everything in HANDOVER_MASTER_PLAN.md is required for launch. Below is the **critical path** — work that blocks client usage.

### ✅ Already Done (Ship As-Is)

```
✅ Backend API (all routes working)
✅ Web Dashboard (all pages exist)
✅ Driver Mobile App (screens exist)
✅ Operator Mobile App (screens exist)
✅ Database schema (Prisma)
✅ JWT auth + RBAC
✅ Socket.io telemetry (architecture)
✅ ICCES integration (workers exist)
✅ Docker Compose (ready)
✅ CI/CD pipeline (exists)
```

### ⚠️ Must Fix Before Launch (Critical Path)

| Priority | Task | Effort | Blocker? | Notes |
|----------|------|--------|----------|-------|
| 🔴 P0 | Fix backend input validation (prevent crashes) | 2 days | YES | New routes fail on bad input |
| 🔴 P0 | Replace mobile icon placeholders with lucide-react-native | 1 day | YES | Looks unfinished otherwise |
| 🔴 P0 | Finalize mobile photo upload (retry logic) | 2 days | YES | Core UX path |
| 🔴 P0 | End-to-end test: operator creates trip → driver completes | 2 days | YES | Smoke test main workflow |
| 🔴 P0 | Fix database constraints (referential integrity) | 1 day | YES | Data corruption risk |
| 🔴 P0 | Production SSL setup (Let's Encrypt + Certbot) | 1 day | YES | Cannot go live without HTTPS |
| 🟠 P1 | Create/test backup & restore procedure | 1 day | MEDIUM | Disaster recovery |
| 🟠 P1 | Implement rate limiting on auth endpoints | 1 day | MEDIUM | Brute force protection |
| 🟠 P1 | Add logging to critical operations | 1 day | MEDIUM | Debugging production issues |
| 🟠 P1 | Test WebSocket under 50+ concurrent drivers | 2 days | MEDIUM | Stability at scale |
| 🟠 P1 | Seed real test data (customers, routes, vehicles) | 2 days | MEDIUM | Realistic UAT |
| 🟡 P2 | Admin dashboard: User Management page | 3 days | LOW | Nice-to-have; manual DB edits work around it |
| 🟡 P2 | Advanced reporting (PDF export) | 2 days | LOW | Basic JSON export sufficient |
| 🟡 P2 | Push notifications (FCM/APNs) | 3 days | LOW | In-app notifications work around it |
| 🟡 P2 | Mapbox integration (optional, use simple map) | 5 days | LOW | Can launch with basic geolocation |

---

## 📊 Effort Estimate

### Critical Path (Must Fix)
- Backend validation & logging: 3 days
- Mobile icons & photo upload: 3 days  
- E2E testing (create → complete trip): 2 days
- Database integrity & backup: 2 days
- Production setup (SSL, deployment): 2 days
- WebSocket load testing: 2 days
- Test data seeding: 2 days

**Total: ~16 days (2.3 weeks) for 1 FTE**

### With Standard Testing (Recommended)
- Add unit tests for critical paths: +5 days
- Add E2E tests for all workflows: +5 days
- UAT + bug fixes: +5 days

**Total: ~31 days (4.4 weeks) for 1 FTE**

---

## 🚀 Fast-Track Launch Plan (4 Weeks)

### Week 1 — Stabilization & Fixes
```
Mon-Wed: Backend validation, error handling, logging
  [ ] Add schema validation to all POST/PUT routes (prevent crashes)
  [ ] Add logging for auth, trips, payments
  [ ] Test with invalid inputs (negative quantities, missing fields, SQL injection attempts)
  [ ] Fix any crashes or weird behavior

Wed-Fri: Mobile app hardening
  [ ] Replace Feather icons with lucide-react-native (~20 screens)
  [ ] Finalize photo upload: retry queue, compression, progress indicator
  [ ] Test on real Android & iOS devices (5+ each)
  [ ] Fix any crashes in photo workflow
```

**Acceptance Criteria:** API handles bad input gracefully; mobile app doesn't crash; icons look professional.

---

### Week 2 — Testing & Data
```
Mon-Tue: E2E workflow test
  [ ] Manual end-to-end: Operator logs in → creates trip → assigns driver → driver accepts → photos → delivers → trip closes
  [ ] Repeat 5× with different scenarios (payment override, emergency, reassignment)
  [ ] Document any bugs in Linear; prioritize by severity

Wed-Fri: Test data & infrastructure
  [ ] Create seed data: 10 customers, 20 routes, 10 drivers, 5 vehicles
  [ ] Test fresh database setup (Dockerfile perspective)
  [ ] Test backup & restore (seed → backup → restore → verify)
  [ ] Load test API (1000 location updates/min, 50 concurrent trips)
  [ ] Load test WebSocket (100 drivers, 10 Hz updates)
```

**Acceptance Criteria:** Main workflow works end-to-end; test data exists; backups/restore works; performance baseline documented.

---

### Week 3 — Staging & UAT
```
Mon: Deploy to staging
  [ ] Deploy docker-compose to staging VPS
  [ ] Verify all services healthy (API, WebSocket, PostgreSQL, Nginx)
  [ ] Run smoke tests (login, create trip, track live)

Tue-Wed: UAT with MERCON
  [ ] Invite operators, dispatchers, drivers to test on staging
  [ ] Provide scenario list (20 workflows to test)
  [ ] Document bugs in Linear (high/medium/low priority)
  [ ] Fix HIGH priority bugs within 24 hours

Thu-Fri: Bug fixes & re-test
  [ ] Fix all HIGH & MEDIUM priority bugs
  [ ] Re-test fixed workflows
  [ ] Prepare for production deployment
```

**Acceptance Criteria:** MERCON team has tested all 3 apps; all blocking issues fixed; no crashes reported.

---

### Week 4 — Production Launch
```
Mon: Final checks
  [ ] Production VPS ready (IP, firewall, monitoring)
  [ ] SSL certificate issued & auto-renewal tested
  [ ] All secrets rotated & stored securely
  [ ] Backup schedule configured
  [ ] Monitoring & alerting active

Tue: Production deployment
  [ ] Deploy docker-compose to production
  [ ] Run smoke tests (login, create trip, track)
  [ ] Monitor for errors (first 2 hours critical)
  [ ] Have rollback plan ready

Wed-Fri: Immediate post-launch
  [ ] Monitor logs & alerts continuously
  [ ] Fix any critical bugs within 2 hours
  [ ] Distribute mobile apps to MERCON team via TestFlight/Google Play
  [ ] Brief MERCON on common issues & troubleshooting
```

**Acceptance Criteria:** Production live, stable, no crashes for 72 hours, MERCON team able to operate independently.

---

## 🛑 Non-MVP (De-Scope for Launch)

The following can ship **after** launch without blocking revenue:

```
❌ Mapbox/Google Maps integration (use basic geolocation instead)
❌ Admin audit dashboard (manual DB queries work-around)
❌ Advanced PDF reports (export JSON, users do manual formatting)
❌ Push notifications / FCM (in-app notifications sufficient)
❌ Geofence radius calibration (use 500m default, tune later)
❌ Performance dashboards & metrics UI (monitor via logs & Nginx)
❌ Operator mobile app (driver & web dashboard sufficient for MVP)
❌ Multi-language support (English only at launch)
❌ Dark mode (one theme sufficient)
```

---

## 📋 Launch Readiness Checklist

### Code Quality
- [ ] No console.error or throw in critical paths (proper error handling)
- [ ] No hardcoded secrets in code (use env vars)
- [ ] No API keys/credentials in git history
- [ ] All external APIs (ICCES) have timeout & retry logic
- [ ] Database queries have indexes for common filters (trips.status, drivers.id)

### Testing
- [ ] Manual end-to-end test: create trip → track → complete ✓
- [ ] Manual test: mobile photo upload with poor network
- [ ] Manual test: WebSocket reconnect after network loss
- [ ] Manual test: API with 500+ concurrent requests (load test)
- [ ] Manual test: Database backup & restore

### Infrastructure
- [ ] SSL certificate active (HTTPS only)
- [ ] Firewall configured (80/443 open, SSH restricted)
- [ ] Monitoring active (CPU, memory, disk, error rate alerts)
- [ ] Backup schedule running (daily automated backups)
- [ ] Nginx reverse proxy routing /api to backend, / to frontend
- [ ] Database connection pooling configured

### Documentation
- [ ] Environment variables documented (.env.example)
- [ ] Deployment procedure documented (how to deploy updates)
- [ ] Troubleshooting guide for common issues
- [ ] MERCON team knows who to contact for emergency support

### Training
- [ ] Operators trained on web dashboard (trip creation, tracking, reports)
- [ ] Drivers trained on mobile app (login, trip workflow, photo upload)
- [ ] Admin trained on system settings & audit (if applicable)
- [ ] IT trained on deployment & emergency procedures

---

## 🎯 Success Metrics (First 30 Days)

After launch, measure:

- **Uptime:** > 99% (no more than 1 hour/month downtime)
- **Response Time:** API p95 < 500ms, p99 < 1s
- **WebSocket Latency:** Location updates delivered within 2s of emission
- **Mobile Crashes:** < 1 crash per 100 active drivers
- **Data Integrity:** Zero corruption incidents (backup test confirms integrity)
- **User Satisfaction:** MERCON team rating ≥ 4/5 stars
- **Bug Discovery:** < 5 critical bugs in first month (indicates good testing)

---

## 🆘 Launch Day Runbook

**Time: 8:00 AM**  
Deploy to production. Full team online (dev + ops + support).

```
08:00 — Deploy docker-compose to production VPS
08:05 — Wait 30s for containers to start
08:10 — Run health checks (curl API, test WebSocket)
08:15 — Notify MERCON: "Production is live"
08:15–09:00 — Monitor logs continuously
         ERROR log → Slack notification → Team assesses
         If CRITICAL error → Rollback (revert docker image to previous)

09:00–10:00 — MERCON tests login (operator + driver mobile)
        Report any issues to dev team

10:00–12:00 — Monitor metrics (API latency, errors, WebSocket connections)
        If issues → fix & redeploy (less urgent than 08:15–09:00 window)

12:00 PM — Production is "stable" (no major issues for 4+ hours)
           Declare launch successful
           Enter "24/7 monitoring" mode
           Have on-call person for next 72 hours
```

---

## 📞 Emergency Procedures

| Scenario | Response Time | Action |
|----------|----------------|--------|
| **API crashes (500 errors)** | 5 min | Check logs, restart service, if persists rollback |
| **Database connection lost** | 5 min | Check DB status, restart pool, if persists rollback |
| **WebSocket not updating GPS** | 10 min | Check Socket.io logs, reconnect test clients, if persists fallback to polling |
| **Nginx not routing /api correctly** | 5 min | Check nginx.conf, reload Nginx, verify routing |
| **Data corruption detected** | 15 min | Stop application, restore from latest backup, notify MERCON |
| **SSL certificate expired** | 1 hour | Issue new cert via Let's Encrypt, update Nginx |

---

## 🔄 Post-Launch (First Week)

- [ ] Daily standup (15 min) to review logs & issues
- [ ] Weekly deep-dive with MERCON (1 hour) to discuss usage & feedback
- [ ] Monitor error rates; fix non-critical bugs as they appear
- [ ] Adjust database indexes if slow queries detected
- [ ] Fine-tune WebSocket message frequency (currently every 10s)
- [ ] Celebrate launch! 🎉

---

## 📊 Risk Summary

| Risk | Likelihood | If It Happens | Mitigation |
|------|-----------|---------------|-----------|
| Mobile app crashes | 🟠 Medium | Rollback app version | Test on 10+ devices before launch |
| WebSocket drops under load | 🟠 Medium | Location updates stop | Load test with 100 drivers; increase worker threads if needed |
| Database runs out of space | 🟡 Low | App stops working | Monitor disk usage; plan storage upgrade schedule |
| SSL certificate expires | 🟡 Low | Users get cert error | Certbot auto-renewal; monitor renewal logs |
| API exposed to DDOS | 🟡 Low | Service degradation | Rate limiting on auth; Cloudflare DDoS protection (consider) |

---

## ✅ Sign-Off

Once all items in this checklist are green:

- **Engineering:** "Ready to launch" (CEO/tech lead)
- **QA:** "All tests pass" (QA lead)
- **Operations:** "Infrastructure ready" (DevOps lead)
- **Product:** "Features meet spec" (Product manager)
- **Client:** "Ready to go live" (MERCON stakeholder)

Then: **Deploy to production. Watch for 72 hours. Celebrate.**

