-- CreateTable
CREATE TABLE IF NOT EXISTS "ProviderRateCard" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "origin_city" TEXT NOT NULL,
    "destination_city" TEXT NOT NULL,
    "originLocationId" UUID,
    "destinationLocationId" UUID,
    "vehicle_class" TEXT NOT NULL,
    "line_type" TEXT NOT NULL,
    "operation_type" TEXT,
    "pricing_basis" TEXT NOT NULL DEFAULT 'Per Trip',
    "cost" DECIMAL(12,2) NOT NULL,
    "valid_from" TIMESTAMPTZ,
    "valid_to" TIMESTAMPTZ,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_by" UUID,
    "updated_by" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "ProviderRateCard_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX IF NOT EXISTS "ProviderRateCard_providerId_idx" ON "ProviderRateCard"("providerId");
CREATE INDEX IF NOT EXISTS "ProviderRateCard_lane_vehicle_idx" ON "ProviderRateCard"("origin_city", "destination_city", "vehicle_class", "line_type", "pricing_basis");
CREATE INDEX IF NOT EXISTS "ProviderRateCard_status_deletedAt_idx" ON "ProviderRateCard"("status", "deletedAt");

-- AddForeignKey constraints defensively
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProviderRateCard_providerId_fkey') THEN
        ALTER TABLE "ProviderRateCard" ADD CONSTRAINT "ProviderRateCard_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ThirdPartyProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProviderRateCard_originLocationId_fkey') THEN
        ALTER TABLE "ProviderRateCard" ADD CONSTRAINT "ProviderRateCard_originLocationId_fkey" FOREIGN KEY ("originLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProviderRateCard_destinationLocationId_fkey') THEN
        ALTER TABLE "ProviderRateCard" ADD CONSTRAINT "ProviderRateCard_destinationLocationId_fkey" FOREIGN KEY ("destinationLocationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
