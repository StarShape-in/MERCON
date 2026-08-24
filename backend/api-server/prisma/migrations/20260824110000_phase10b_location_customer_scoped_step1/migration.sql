-- AlterTable Location: Add customerId, code, city, postalCode as nullable, drop codes array, drop global unique on slug
ALTER TABLE "Location" DROP CONSTRAINT IF EXISTS "Location_slug_key";
DROP INDEX IF EXISTS "Location_slug_key";

ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "customerId" UUID;
ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "postalCode" TEXT;
ALTER TABLE "Location" DROP COLUMN IF EXISTS "codes";

-- Add ForeignKey for customerId
ALTER TABLE "Location" ADD CONSTRAINT "Location_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add Index for customerId
CREATE INDEX IF NOT EXISTS "Location_customerId_idx" ON "Location"("customerId");

-- AlterTable TripStop: Make location_lat and location_lng nullable
ALTER TABLE "TripStop" ALTER COLUMN "location_lat" DROP NOT NULL;
ALTER TABLE "TripStop" ALTER COLUMN "location_lng" DROP NOT NULL;
