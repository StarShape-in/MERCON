-- CreateTable: TripSubcontract
CREATE TABLE IF NOT EXISTS "TripSubcontract" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tripId" UUID NOT NULL,
    "providerId" UUID,
    "driverName" TEXT,
    "driverPhone" TEXT,
    "vehiclePlate" TEXT,
    "vehicleType" TEXT,
    "cost" DECIMAL(12,2) DEFAULT 0.0,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripSubcontract_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "TripSubcontract_tripId_key" ON "TripSubcontract"("tripId");
CREATE INDEX IF NOT EXISTS "TripSubcontract_providerId_idx" ON "TripSubcontract"("providerId");

-- AddForeignKey constraints
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TripSubcontract_tripId_fkey') THEN
        ALTER TABLE "TripSubcontract" ADD CONSTRAINT "TripSubcontract_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TripSubcontract_providerId_fkey') THEN
        ALTER TABLE "TripSubcontract" ADD CONSTRAINT "TripSubcontract_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ThirdPartyProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- DATA MIGRATION: Copy existing third-party values from Trip into TripSubcontract before dropping columns
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Trip' AND column_name = 'third_party_driver_name') THEN
        INSERT INTO "TripSubcontract" (
            "id", "tripId", "providerId", "driverName", "driverPhone", "vehiclePlate", "vehicleType", "cost", "createdAt", "updatedAt"
        )
        SELECT
            gen_random_uuid(),
            t."id",
            t."thirdPartyProviderId",
            t."third_party_driver_name",
            t."third_party_driver_phone",
            t."third_party_vehicle_plate",
            t."third_party_vehicle_type",
            COALESCE(t."third_party_cost", 0.0),
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        FROM "Trip" t
        WHERE (
            t."is_third_party" = true
            OR t."thirdPartyProviderId" IS NOT NULL
            OR t."third_party_driver_name" IS NOT NULL
            OR t."third_party_vehicle_plate" IS NOT NULL
        )
        AND NOT EXISTS (
            SELECT 1 FROM "TripSubcontract" ts WHERE ts."tripId" = t."id"
        );
    END IF;
END $$;

-- Safely drop old columns from Trip
ALTER TABLE "Trip" DROP COLUMN IF EXISTS "thirdPartyProviderId";
ALTER TABLE "Trip" DROP COLUMN IF EXISTS "third_party_driver_name";
ALTER TABLE "Trip" DROP COLUMN IF EXISTS "third_party_driver_phone";
ALTER TABLE "Trip" DROP COLUMN IF EXISTS "third_party_vehicle_plate";
ALTER TABLE "Trip" DROP COLUMN IF EXISTS "third_party_vehicle_type";
ALTER TABLE "Trip" DROP COLUMN IF EXISTS "third_party_cost";
