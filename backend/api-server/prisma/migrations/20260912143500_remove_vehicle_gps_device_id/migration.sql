-- Drop obsolete gps_device_id column from Vehicle table
ALTER TABLE "Vehicle" DROP COLUMN IF EXISTS "gps_device_id";
