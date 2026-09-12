-- Drop obsolete customer columns
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "tax_number";
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "credit_limit";
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "default_pickup_lat";
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "default_pickup_lng";
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "default_dropoff_lat";
ALTER TABLE "Customer" DROP COLUMN IF EXISTS "default_dropoff_lng";
