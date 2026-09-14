-- CreateTable
CREATE TABLE "driver_devices" (
    "id" UUID NOT NULL,
    "driverId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "driver_devices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "driver_devices_token_key" ON "driver_devices"("token");

-- CreateIndex
CREATE INDEX "driver_devices_driverId_isActive_idx" ON "driver_devices"("driverId", "isActive");

-- AddForeignKey
ALTER TABLE "driver_devices" ADD CONSTRAINT "driver_devices_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
