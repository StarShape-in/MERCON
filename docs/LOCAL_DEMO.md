# Running MERCON locally with demo data

For demoing the Delay Report (or any screen) with a populated database, without
touching production.

Production starts empty for delay reporting by design: a trip only appears once
it has both a planned arrival time and a recorded actual arrival, and reliable
arrival recording began with the delay-reporting deploy. Real data accumulates
as trips run. This gets you two years of it immediately, locally.

---

## 1. Prerequisites

- Node 18+
- Postgres running locally, **or** Docker

## 2. Install

```bash
git pull
npm install          # from the repo root — installs all workspaces
```

## 3. Database

Either use a local Postgres you already have, or start one with Docker:

```bash
docker run --name mercon-local -e POSTGRES_USER=mercon \
  -e POSTGRES_PASSWORD=mercon_local_dev -e POSTGRES_DB=mercon_db \
  -p 5432:5432 -d postgres:15-alpine
```

Then point the API at it and create the schema:

```bash
cd backend/api-server
export DATABASE_URL="postgresql://mercon:mercon_local_dev@localhost:5432/mercon_db"
export JWT_SECRET="local-dev-only"

npx prisma db push        # creates the tables
```

## 4. Load the demo data

```bash
DEMO_RESET=yes npm run seed:demo    # from backend/api-server
```

`DEMO_RESET=yes` is what clears the tables first. Without it the seeder only
adds — deleting is never inferred, because production's database hostname
(`postgres-db`) is the same compose service name a laptop uses and says
nothing about which database is on the other end.

Roughly 3,100 trips across two years — 7 customers, 12 drivers, 10 trucks,
10 routes. The data is patterned, not random, so the report has real findings:
one route (Khamis Sorting Center → Edabi) degrades steadily, one stays
reliable, summer runs worse, and one driver and one truck are clear outliers.

> `seed:demo` refuses to run unless `DATABASE_URL` points at localhost (or you
> explicitly opt in — see below). It is not the production seed: that is
> `prisma/seed.ts`, which only creates the two accounts and is safe on every
> deploy.

## 5. Run it

Two terminals:

```bash
# terminal 1 — API
cd backend/api-server
DATABASE_URL="postgresql://mercon:mercon_local_dev@localhost:5432/mercon_db" \
JWT_SECRET="local-dev-only" PORT=3000 npm run dev
```

```bash
# terminal 2 — dashboard
cd frontend/web-dashboard
VITE_API_URL=http://127.0.0.1:3000 npm run dev
```

Open the URL Vite prints and log in:

```
operator / demo1234      (or admin / demo1234)
```

Then go to **Reports → Delay Report**.

---

## What to look at

**Log** — one row per late arrival. Routes read as place names; delays as clock
time. Rows with no reason are flagged; click one to open the trip and record it.

**On-time grid** — the scorecard. Switch *Rows* between Route / Driver /
Company / Truck to ask a different question of the same data. On **Year**, the
Khamis → Edabi row visibly declines across the months.

**Analysis** — KPIs, the hours-lost trend, and four leaderboards, each figure
carrying its change against the preceding period. The bar behind each
leaderboard row shows magnitude at a glance.

The period buttons (Today / Week / Month / Quarter / Year) and the company
filter apply to all three views at once — pick a company and everything narrows
together.

## Resetting

`DEMO_RESET=yes npm run seed:demo` again. It clears and regenerates from a fixed random seed,
so you get the same history every time.

---

## Seeding a hosted database (pre-launch only)

Sometimes the demo needs to be on the real URL rather than a laptop. That is
only reasonable while the database is still empty — before anyone's real
customers, trips or invoices are in it.

```bash
DEMO_ALLOW_REMOTE=yes-i-understand npm run seed:demo
```

Against a non-local database the script behaves differently, on purpose:

- **Nothing is deleted.** Clearing tables requires `DEMO_RESET=yes` on its own,
  never inferred from the hostname. The difference between "reset my dev box"
  and "drop the customer table" should not come down to remembering which
  terminal you are in.
- **Every row is tagged** with a marker in `created_by` — invisible in the UI,
  but it makes removal exact.

### Removing it again

```bash
npm run demo:purge
```

Deletes only tagged rows. Anything a real operator created carries a real user
id (or null) and is left alone — verified by seeding, adding an untagged
record, purging, and confirming the untagged record survived.

**Run the purge before real operations begin.** Demo trips left in place will
otherwise land in the client's first real reports, and MERCON has been here
before: `PROGRESS.md` still lists fake rows from an earlier deploy as needing
manual cleanup.
