-- Migration: 20260823190000_refactor_rate_card_to_pricing_rule

-- 1. Rename table RateCard to PricingRule
ALTER TABLE "RateCard" RENAME TO "PricingRule";

-- 2. Rename columns on PricingRule
ALTER TABLE "PricingRule" RENAME COLUMN "rate_category" TO "line_type";
ALTER TABLE "PricingRule" RENAME COLUMN "base_price" TO "rate";

-- 3. Add new columns to PricingRule
ALTER TABLE "PricingRule" ADD COLUMN "pricing_basis" TEXT;
ALTER TABLE "PricingRule" ADD COLUMN "vehicle_class" TEXT;
ALTER TABLE "PricingRule" ADD COLUMN "source_vehicle_label" TEXT;
ALTER TABLE "PricingRule" ADD COLUMN "valid_from" TIMESTAMPTZ;
ALTER TABLE "PricingRule" ADD COLUMN "valid_to" TIMESTAMPTZ;
ALTER TABLE "PricingRule" ADD COLUMN "source_type" TEXT;
ALTER TABLE "PricingRule" ADD COLUMN "source_reference" TEXT;

-- 4. Map line_type values
UPDATE "PricingRule" SET "line_type" = 'SINGLE_TRIP' WHERE "line_type" ILIKE 'Single Trip' OR "line_type" = 'SINGLE_TRIP';
UPDATE "PricingRule" SET "line_type" = 'ROUND_TRIP' WHERE "line_type" ILIKE 'Round Trip' OR "line_type" = 'ROUND_TRIP';
UPDATE "PricingRule" SET "line_type" = '10_HRS' WHERE "line_type" ILIKE '10 Hrs Duty' OR "line_type" = '10_HRS';
UPDATE "PricingRule" SET "line_type" = '12_HRS' WHERE "line_type" ILIKE '12 Hrs Duty' OR "line_type" = '12_HRS';

-- 5. Map billing_type values
UPDATE "PricingRule" SET "billing_type" = 'MONTHLY' WHERE "billing_type" ILIKE 'Monthly' OR "billing_type" = 'MONTHLY';
UPDATE "PricingRule" SET "billing_type" = 'EXTRA' WHERE "billing_type" ILIKE 'Extra' OR "billing_type" = 'EXTRA';

-- 6. Populate pricing_basis: do NOT infer from billing_type; leave as NULL for historical rows unless explicitly established
UPDATE "PricingRule" SET "pricing_basis" = NULL;

-- 7. Vehicle pricing representation
UPDATE "PricingRule" SET "source_vehicle_label" = "vehicle_type";

UPDATE "PricingRule" SET "vehicle_class" = '3-4 TON' WHERE "vehicle_type" ILIKE '%3-4 TON%' OR "vehicle_type" ILIKE '%3TON/4TON%' OR "vehicle_type" ILIKE '%3 TON%' OR "vehicle_type" ILIKE '%4 TON%' OR "vehicle_type" ILIKE '%DYNA%';
UPDATE "PricingRule" SET "vehicle_class" = '5 TON' WHERE "vehicle_class" IS NULL AND ("vehicle_type" ILIKE '%5 TON%' OR "vehicle_type" ILIKE '%5TON%');
UPDATE "PricingRule" SET "vehicle_class" = '10 TON' WHERE "vehicle_class" IS NULL AND ("vehicle_type" ILIKE '%10 TON%' OR "vehicle_type" ILIKE '%10TON%' OR "vehicle_type" ILIKE '%LORRY%');
UPDATE "PricingRule" SET "vehicle_class" = '20 TON' WHERE "vehicle_class" IS NULL AND ("vehicle_type" ILIKE '%20 TON%' OR "vehicle_type" ILIKE '%20TON%');
UPDATE "PricingRule" SET "vehicle_class" = '40 FEET' WHERE "vehicle_class" IS NULL AND ("vehicle_type" ILIKE '%40 FEET%' OR "vehicle_type" ILIKE '%40FT%');

ALTER TABLE "PricingRule" DROP COLUMN IF EXISTS "vehicle_type";
ALTER TABLE "PricingRule" DROP COLUMN IF EXISTS "default_trip_charge";

-- 8. Create PricingRuleStop table
CREATE TABLE "PricingRuleStop" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pricingRuleId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "locationId" UUID,
    "stop_type" "StopType" NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingRuleStop_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PricingRuleStop_pricingRuleId_idx" ON "PricingRuleStop"("pricingRuleId");
CREATE INDEX "PricingRuleStop_locationId_idx" ON "PricingRuleStop"("locationId");

ALTER TABLE "PricingRuleStop" ADD CONSTRAINT "PricingRuleStop_pricingRuleId_fkey" FOREIGN KEY ("pricingRuleId") REFERENCES "PricingRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PricingRuleStop" ADD CONSTRAINT "PricingRuleStop_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrate existing route endpoints into PricingRuleStop rows:
INSERT INTO "PricingRuleStop" ("pricingRuleId", "sequence", "locationId", "stop_type")
SELECT "id", 1, "originLocationId", 'Pickup'::"StopType"
FROM "PricingRule"
WHERE "originLocationId" IS NOT NULL;

INSERT INTO "PricingRuleStop" ("pricingRuleId", "sequence", "locationId", "stop_type")
SELECT "id", 2, NULL, 'Rest'::"StopType"
FROM "PricingRule"
WHERE "via_location" IS NOT NULL AND TRIM("via_location") != '';

INSERT INTO "PricingRuleStop" ("pricingRuleId", "sequence", "locationId", "stop_type")
SELECT "id", CASE WHEN "via_location" IS NOT NULL AND TRIM("via_location") != '' THEN 3 ELSE 2 END, "destinationLocationId", 'Dropoff'::"StopType"
FROM "PricingRule"
WHERE "destinationLocationId" IS NOT NULL;

ALTER TABLE "PricingRule" DROP COLUMN IF EXISTS "route_origin";
ALTER TABLE "PricingRule" DROP COLUMN IF EXISTS "route_destination";
ALTER TABLE "PricingRule" DROP COLUMN IF EXISTS "via_location";
ALTER TABLE "PricingRule" DROP COLUMN IF EXISTS "originLocationId";
ALTER TABLE "PricingRule" DROP COLUMN IF EXISTS "destinationLocationId";

-- 9. Update references in Trip
ALTER TABLE "Trip" RENAME COLUMN "rateCardId" TO "pricingRuleId";

-- 10. Update references in SurchargeRule
ALTER TABLE "SurchargeRule" RENAME COLUMN "rateCardId" TO "pricingRuleId";

-- 11. Rename RateCardPriceHistory to PricingRuleHistory
ALTER TABLE "RateCardPriceHistory" RENAME TO "PricingRuleHistory";
ALTER TABLE "PricingRuleHistory" RENAME COLUMN "rateCardId" TO "pricingRuleId";
ALTER TABLE "PricingRuleHistory" RENAME COLUMN "old_base_price" TO "old_rate";
ALTER TABLE "PricingRuleHistory" RENAME COLUMN "new_base_price" TO "new_rate";
ALTER TABLE "PricingRuleHistory" DROP COLUMN IF EXISTS "old_default_trip_charge";
ALTER TABLE "PricingRuleHistory" DROP COLUMN IF EXISTS "new_default_trip_charge";
ALTER TABLE "PricingRuleHistory" ADD COLUMN IF NOT EXISTS "changed_by" TEXT;
