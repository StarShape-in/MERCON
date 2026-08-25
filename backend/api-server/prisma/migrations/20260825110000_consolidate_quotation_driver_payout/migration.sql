-- Migration: 20260825110000_consolidate_quotation_driver_payout
-- Ensure driver_payout column exists, backfill from default_trip_charge if column exists, then drop default_trip_charge.

ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "driver_payout" DECIMAL(12,2);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='Quotation' AND column_name='default_trip_charge'
  ) THEN
    UPDATE "Quotation"
    SET "driver_payout" = "default_trip_charge"
    WHERE "driver_payout" IS NULL AND "default_trip_charge" IS NOT NULL;

    ALTER TABLE "Quotation" DROP COLUMN "default_trip_charge";
  END IF;
END $$;
