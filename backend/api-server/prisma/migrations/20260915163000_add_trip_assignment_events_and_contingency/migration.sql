-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "AssignmentType" AS ENUM ('PRIMARY', 'BACKUP', 'TEMPORARY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "DriverTripRole" AS ENUM ('PRIMARY', 'CO_DRIVER', 'RELIEVER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AssignmentEntityType" AS ENUM ('DRIVER', 'VEHICLE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable Trip
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "is_contingency_dispatch" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "original_vehicle_id" UUID;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "original_driver_id" UUID;
ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "contingency_reason" TEXT;

-- AlterTable TripStop
ALTER TABLE "TripStop" ADD COLUMN IF NOT EXISTS "executorDriverId" UUID;

-- AlterTable Document
ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "executorDriverId" UUID;

-- CreateTable DriverVehicleAssignment
CREATE TABLE IF NOT EXISTS "DriverVehicleAssignment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "driverId" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "assignmentType" "AssignmentType" NOT NULL DEFAULT 'PRIMARY',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMPTZ,
    "effectiveTo" TIMESTAMPTZ,
    "notes" TEXT,
    "created_by" UUID,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverVehicleAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable TripAssignmentEvent
CREATE TABLE IF NOT EXISTS "TripAssignmentEvent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tripId" UUID NOT NULL,
    "entityType" "AssignmentEntityType" NOT NULL,
    "fromId" UUID,
    "toId" UUID,
    "reason" TEXT NOT NULL,
    "changedBy" UUID,
    "changedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripAssignmentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE UNIQUE INDEX IF NOT EXISTS "DriverVehicleAssignment_driverId_vehicleId_assignmentType_key" ON "DriverVehicleAssignment"("driverId", "vehicleId", "assignmentType");
CREATE INDEX IF NOT EXISTS "DriverVehicleAssignment_driverId_isActive_idx" ON "DriverVehicleAssignment"("driverId", "isActive");
CREATE INDEX IF NOT EXISTS "DriverVehicleAssignment_vehicleId_isActive_idx" ON "DriverVehicleAssignment"("vehicleId", "isActive");
CREATE INDEX IF NOT EXISTS "TripAssignmentEvent_tripId_idx" ON "TripAssignmentEvent"("tripId");

-- AddForeignKeys
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Trip_original_vehicle_id_fkey') THEN
        ALTER TABLE "Trip" ADD CONSTRAINT "Trip_original_vehicle_id_fkey" FOREIGN KEY ("original_vehicle_id") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Trip_original_driver_id_fkey') THEN
        ALTER TABLE "Trip" ADD CONSTRAINT "Trip_original_driver_id_fkey" FOREIGN KEY ("original_driver_id") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TripStop_executorDriverId_fkey') THEN
        ALTER TABLE "TripStop" ADD CONSTRAINT "TripStop_executorDriverId_fkey" FOREIGN KEY ("executorDriverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Document_executorDriverId_fkey') THEN
        ALTER TABLE "Document" ADD CONSTRAINT "Document_executorDriverId_fkey" FOREIGN KEY ("executorDriverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DriverVehicleAssignment_driverId_fkey') THEN
        ALTER TABLE "DriverVehicleAssignment" ADD CONSTRAINT "DriverVehicleAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DriverVehicleAssignment_vehicleId_fkey') THEN
        ALTER TABLE "DriverVehicleAssignment" ADD CONSTRAINT "DriverVehicleAssignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TripAssignmentEvent_tripId_fkey') THEN
        ALTER TABLE "TripAssignmentEvent" ADD CONSTRAINT "TripAssignmentEvent_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TripAssignmentEvent_changedBy_fkey') THEN
        ALTER TABLE "TripAssignmentEvent" ADD CONSTRAINT "TripAssignmentEvent_changedBy_fkey" FOREIGN KEY ("changedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
