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
