-- One-time cleanup: removes the fake demo customers/trips/invoices that
-- seedDefaultBillingLedgerData() (removed from prisma/seed.ts) was creating
-- on every container start. Redeploying does NOT undo this data — run this
-- manually against the production database once.
--
-- Safe to re-run: every DELETE is scoped to the exact ref_id/name patterns
-- the removed function used, so it only ever touches the specific fake rows
-- it created (or is a no-op if they're already gone).
--
-- Usage: psql "$DATABASE_URL" -f cleanup-fake-seed-data.sql

BEGIN;

-- Invoices created for the fake trips
DELETE FROM "Invoice" WHERE ref_id LIKE 'INV-2026-TODAY-%'
  OR ref_id LIKE 'INV-2026-WEEK-%'
  OR ref_id LIKE 'INV-2026-TMONTH-%'
  OR ref_id LIKE 'INV-2026-LMONTH-%'
  OR ref_id LIKE 'INV-2026-OLD-%';

-- Trip stops for the fake trips
DELETE FROM "TripStop" WHERE "tripId" IN (
  SELECT id FROM "Trip" WHERE ref_id LIKE 'TRP-2026-TODAY-%'
    OR ref_id LIKE 'TRP-2026-WEEK-%'
    OR ref_id LIKE 'TRP-2026-TMONTH-%'
    OR ref_id LIKE 'TRP-2026-LMONTH-%'
    OR ref_id LIKE 'TRP-2026-OLD-%'
);

-- The fake trips themselves
DELETE FROM "Trip" WHERE ref_id LIKE 'TRP-2026-TODAY-%'
  OR ref_id LIKE 'TRP-2026-WEEK-%'
  OR ref_id LIKE 'TRP-2026-TMONTH-%'
  OR ref_id LIKE 'TRP-2026-LMONTH-%'
  OR ref_id LIKE 'TRP-2026-OLD-%';

-- The fake customers, but only if they have no remaining real trips/invoices
-- (in case an operator has since created genuine records against one of these
-- names — extremely unlikely given the names, but this keeps the script safe).
DELETE FROM "Customer" c
WHERE c.name IN (
  'Aramco Logistics Solutions',
  'SABIC Global Supply Chain',
  'Al-Marai Cold Chain Distribution',
  'Olayan Freight & Cargo',
  'BinZagur Logistics Co.',
  'Panda Retail Logistics'
)
AND NOT EXISTS (SELECT 1 FROM "Trip" t WHERE t."customerId" = c.id)
AND NOT EXISTS (SELECT 1 FROM "Invoice" i WHERE i."customerId" = c.id)
AND NOT EXISTS (SELECT 1 FROM "RateCard" r WHERE r."customerId" = c.id);

COMMIT;
