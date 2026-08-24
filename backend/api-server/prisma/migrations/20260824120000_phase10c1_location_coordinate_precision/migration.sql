-- CreateEnum
CREATE TYPE "CoordinatePrecision" AS ENUM ('EXACT', 'APPROXIMATE', 'UNKNOWN');

-- AlterTable Location
ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "coordinate_precision" "CoordinatePrecision" NOT NULL DEFAULT 'UNKNOWN';

-- AlterTable TripStop
ALTER TABLE "TripStop" ADD COLUMN IF NOT EXISTS "location_coordinate_precision" "CoordinatePrecision";

-- Data Classification Backfill:
-- Existing coordinates (if any lat/lng present) -> APPROXIMATE unless exact facility confirmed.
-- Existing locations without coordinates -> UNKNOWN.
UPDATE "Location"
SET "coordinate_precision" = 'APPROXIMATE'
WHERE "lat" IS NOT NULL AND "lng" IS NOT NULL;

UPDATE "Location"
SET "coordinate_precision" = 'UNKNOWN'
WHERE "lat" IS NULL OR "lng" IS NULL;
