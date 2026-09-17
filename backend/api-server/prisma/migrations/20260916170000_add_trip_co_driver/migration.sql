-- AlterTable
ALTER TABLE "Trip" ADD COLUMN "co_driver_id" UUID;
ALTER TABLE "Trip" ADD COLUMN "co_driver_payout" DECIMAL(12,2) NOT NULL DEFAULT 0.0;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_co_driver_id_fkey" FOREIGN KEY ("co_driver_id") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
