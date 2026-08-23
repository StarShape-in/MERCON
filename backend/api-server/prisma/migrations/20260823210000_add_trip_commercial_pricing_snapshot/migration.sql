-- Migration: 20260823210000_add_trip_commercial_pricing_snapshot

-- 1. Add Commercial Pricing Snapshot columns to Trip
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "quotation_line_type" TEXT;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "quotation_billing_type" TEXT;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "quotation_pricing_basis" TEXT;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "applied_rate" DECIMAL(12, 2);
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "quotation_vehicle_class" TEXT;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "quotation_source_vehicle_label" TEXT;

-- 2. Backfill snapshot fields for Trips linked to an explicit Quotation
UPDATE "Trip" t
SET 
  "quotation_line_type" = q."line_type",
  "quotation_billing_type" = q."billing_type",
  "quotation_pricing_basis" = q."pricing_basis",
  "applied_rate" = q."rate",
  "quotation_vehicle_class" = q."vehicle_class",
  "quotation_source_vehicle_label" = q."source_vehicle_label"
FROM "Quotation" q
WHERE t."quotationId" = q."id";

-- 3. Backfill snapshot line/billing/vehicle fields from existing legacy Trip columns where quotationId IS NULL
UPDATE "Trip"
SET
  "quotation_line_type" = COALESCE("quotation_line_type", "rate_category"),
  "quotation_billing_type" = COALESCE("quotation_billing_type", "billing_type"),
  "quotation_source_vehicle_label" = COALESCE("quotation_source_vehicle_label", "vehicle_type")
WHERE "quotationId" IS NULL;
