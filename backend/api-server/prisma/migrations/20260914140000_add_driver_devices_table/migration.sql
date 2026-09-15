-- CreateTable
CREATE TABLE IF NOT EXISTS "driver_devices" (
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
CREATE UNIQUE INDEX IF NOT EXISTS "driver_devices_token_key" ON "driver_devices"("token");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "driver_devices_driverId_isActive_idx" ON "driver_devices"("driverId", "isActive");

-- AddForeignKey
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'driver_devices_driverId_fkey') THEN
        ALTER TABLE "driver_devices" ADD CONSTRAINT "driver_devices_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

