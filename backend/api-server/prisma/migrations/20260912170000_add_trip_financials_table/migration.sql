-- CreateTable
CREATE TABLE IF NOT EXISTS "TripFinancials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tripId" UUID NOT NULL,
    "quotationId" UUID,
    "applied_rate" DECIMAL(12,2),
    "quotation_line_type" TEXT,
    "quotation_billing_type" TEXT,
    "quotation_pricing_basis" TEXT,
    "quotation_vehicle_class" TEXT,
    "quotation_source_vehicle_label" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TripFinancials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TripFinancials_tripId_key" ON "TripFinancials"("tripId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TripFinancials_quotationId_idx" ON "TripFinancials"("quotationId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TripFinancials_tripId_fkey'
    ) THEN
        ALTER TABLE "TripFinancials" ADD CONSTRAINT "TripFinancials_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'TripFinancials_quotationId_fkey'
    ) THEN
        ALTER TABLE "TripFinancials" ADD CONSTRAINT "TripFinancials_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Backfill TripFinancials for any existing Trip rows safely
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Trip' AND column_name='applied_rate') THEN
        INSERT INTO "TripFinancials" ("id", "tripId", "quotationId", "applied_rate", "quotation_line_type", "quotation_billing_type", "quotation_pricing_basis", "quotation_vehicle_class", "quotation_source_vehicle_label", "createdAt", "updatedAt")
        SELECT
            gen_random_uuid(),
            t."id",
            t."quotationId",
            t."applied_rate",
            t."quotation_line_type",
            t."quotation_billing_type",
            t."quotation_pricing_basis",
            t."quotation_vehicle_class",
            t."quotation_source_vehicle_label",
            t."createdAt",
            t."updatedAt"
        FROM "Trip" t
        WHERE NOT EXISTS (
            SELECT 1 FROM "TripFinancials" tf WHERE tf."tripId" = t."id"
        );
    ELSE
        INSERT INTO "TripFinancials" ("id", "tripId", "quotationId", "createdAt", "updatedAt")
        SELECT
            gen_random_uuid(),
            t."id",
            t."quotationId",
            t."createdAt",
            t."updatedAt"
        FROM "Trip" t
        WHERE NOT EXISTS (
            SELECT 1 FROM "TripFinancials" tf WHERE tf."tripId" = t."id"
        );
    END IF;
END $$;
