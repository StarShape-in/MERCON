-- AlterTable
ALTER TABLE "TripStop" ADD COLUMN IF NOT EXISTS "leg_index" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "QuotationStop" ADD COLUMN IF NOT EXISTS "leg_index" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TripStop_tripId_leg_index_idx" ON "TripStop"("tripId", "leg_index");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "TripStop_tripId_stop_sequence_idx" ON "TripStop"("tripId", "stop_sequence");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "QuotationStop_quotationId_leg_index_idx" ON "QuotationStop"("quotationId", "leg_index");
