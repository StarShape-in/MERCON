-- Defensive migration for driver_payout rename, workshopId addition, and obsolete column removal

-- 1. Rename trip_charges to driver_payout safely if trip_charges exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Trip' AND column_name = 'trip_charges'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'Trip' AND column_name = 'driver_payout'
    ) THEN
        ALTER TABLE "Trip" RENAME COLUMN "trip_charges" TO "driver_payout";
    END IF;
END $$;

-- 2. Drop obsolete legacy Trip columns safely
ALTER TABLE "Trip" DROP COLUMN IF EXISTS "waiting_labor_charges";
ALTER TABLE "Trip" DROP COLUMN IF EXISTS "additional_stop_charges";

-- 3. Add workshopId to MaintenanceRecord if not exists
ALTER TABLE "MaintenanceRecord" ADD COLUMN IF NOT EXISTS "workshopId" TEXT;
