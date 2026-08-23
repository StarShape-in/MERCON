-- CreateTable
CREATE TABLE "RateCardPriceHistory" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rateCardId" UUID NOT NULL,
    "old_base_price" DECIMAL(12,2),
    "new_base_price" DECIMAL(12,2),
    "old_default_trip_charge" DECIMAL(12,2),
    "new_default_trip_charge" DECIMAL(12,2),
    "changed_by_user_id" UUID,
    "changed_by_name" TEXT,
    "reason" TEXT,
    "source" TEXT NOT NULL DEFAULT 'RATE_CARD_MODULE',
    "trip_id" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateCardPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RateCardPriceHistory_rateCardId_idx" ON "RateCardPriceHistory"("rateCardId");

-- CreateIndex
CREATE INDEX "RateCardPriceHistory_createdAt_idx" ON "RateCardPriceHistory"("createdAt");

-- AddForeignKey
ALTER TABLE "RateCardPriceHistory" ADD CONSTRAINT "RateCardPriceHistory_rateCardId_fkey" FOREIGN KEY ("rateCardId") REFERENCES "RateCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;
