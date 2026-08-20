# Migrations

This directory is the schema's history. `prisma migrate deploy` runs on every
API container start (see the `CMD` in `backend/api-server/Dockerfile`) and
applies anything not yet recorded in the database's `_prisma_migrations` table.

Before this existed, the container ran `prisma db push --accept-data-loss`,
which reconciled the database to whatever `schema.prisma` said at the time —
with no history, no reviewable diff, and no way back.

## Adding a schema change

1. Edit `prisma/schema.prisma`.
2. `npx prisma migrate dev --name short_description` against your **local**
   database. This writes a new folder here and applies it locally.
3. Commit the generated folder together with the schema change. Never edit a
   migration that has already been applied anywhere — write a new one.

Do not run `prisma db push` against a database that has migrations. It changes
the schema without recording anything, and the next `migrate deploy` will then
disagree with reality.

## ⚠️ One-time baseline — required before the first deploy of this change

`migrate deploy` expects a `_prisma_migrations` table. A database that was
previously managed by `db push` does not have one, so on the first run Prisma
sees zero applied migrations, tries to apply `0_init`, and fails with
`relation "User" already exists`. Because the schema step is fatal, that
correctly stops the deploy — but it means **production must be baselined once,
before `main` next deploys.**

`0_init` was generated from the schema as it stood on `main`, so it describes
exactly what production already has. Baselining tells Prisma so; it writes one
bookkeeping row and touches no table:

```bash
# On the VPS, against the production database:
docker compose exec mercon-api npx prisma migrate resolve --applied 0_init
```

Then confirm only the delta is left to run:

```bash
docker compose exec mercon-api npx prisma migrate status
# expected: "1 migration has not yet been applied: 20260821000000_indexes_and_location_codes"
```

That second migration is additive only — `ADD COLUMN` (all nullable or
defaulted) and `CREATE INDEX`. Nothing is dropped and no data is rewritten.

Any other environment built by `db push` — a teammate's local database, a
staging copy — needs the same one-time `migrate resolve --applied 0_init`.
A database created fresh from scratch does not: it applies both migrations
normally.

**This bit `dev.mercon.tech` within hours of the Dockerfile change landing**,
because `dev` auto-deploys on every push to the `dev` branch
(`.github/workflows/ci-cd-dev.yml`) — the baseline note above only mentioned
`main`, and nobody baselined `dev-postgres` before the new `CMD` shipped to it.
`dev-api` crash-looped on `Error: P3005` for several minutes until this was
caught and fixed by hand. Two lessons that generalize to any future
`db push`-tracked environment (a new client stack, anything stood up before
this migration setup existed):

1. **Baseline every long-lived environment before merging a change to this
   Dockerfile, not just production.** `dev` needed the identical
   `migrate resolve --applied 0_init` production needs — it was just as
   unbaselined, and it deploys automatically, so it hit the failure first.

2. **`0_init` describes what `main` looked like when it was generated — not
   necessarily what any given `db push`-tracked database currently holds.**
   `dev`'s database had been kept in sync with the `dev` branch (which was
   ahead of `main`) the whole time it ran `db push`, so it already had 9
   `Customer` columns `0_init` doesn't know about. Baselining to `0_init` alone
   was correct, but the delta migration then failed on those columns
   (`column "avatar_url" of relation "Customer" already exists`) because they
   pre-dated it. Recovery was: `migrate resolve --rolled-back` on the delta,
   apply by hand only the pieces that were genuinely missing (checked column-
   by-column and index-by-index against `information_schema` / `pg_indexes`
   first), then `migrate resolve --applied` on the delta. A database that has
   *only* ever run migrations (freshly created, or `main`/production once
   baselined) won't hit this — it can only happen to a `db push`-tracked
   database whose branch had already drifted past `0_init`'s source schema.

   Before baselining any environment, it's worth checking whether its schema
   actually matches `0_init` (`main`'s schema) or has already drifted further
   — a mismatch means the delta migration needs the same manual reconciliation
   `dev` did, not a plain `migrate resolve --applied 0_init` followed by a
   clean `migrate deploy`.
