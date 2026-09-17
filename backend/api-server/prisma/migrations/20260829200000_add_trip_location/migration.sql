-- CreateTable
CREATE TABLE "TripLocation" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "speed_kph" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "accuracy_m" DOUBLE PRECISION,
    "recordedAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripLocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TripLocation_tripId_recordedAt_idx" ON "TripLocation"("tripId", "recordedAt");

-- AddForeignKey
ALTER TABLE "TripLocation" ADD CONSTRAINT "TripLocation_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
