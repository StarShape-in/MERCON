-- One-time fix for existing deployments: grants isSuperAdmin to the 'admin'
-- account. Needed because prisma/seed.ts's upsert deliberately never
-- touches an existing user's fields (see its own header comment) — so a
-- production 'admin' row created before isSuperAdmin existed stays
-- isSuperAdmin=false forever unless set here. A brand-new deployment's seed
-- already sets this on create and does not need this script.
--
-- Safe to re-run: a no-op once the target is already a superadmin.
--
-- Usage: psql "$DATABASE_URL" -f grant-superadmin.sql
-- To grant a different account instead of 'admin', edit the username below.

UPDATE "User" SET "isSuperAdmin" = true WHERE username = 'admin';
