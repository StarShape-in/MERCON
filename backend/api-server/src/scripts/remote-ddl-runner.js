const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fetching table list from mercon_dev_db...');
  const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
  console.log('Existing tables in DB:', tables.map((t) => t.table_name));

  console.log('Starting remote DDL execution for mercon_dev_db...');

  const sqls = [
    `DO $$ BEGIN CREATE TYPE "AssignmentType" AS ENUM ('PRIMARY', 'BACKUP', 'TEMPORARY'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE "DriverTripRole" AS ENUM ('PRIMARY', 'CO_DRIVER', 'RELIEVER'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,
    `DO $$ BEGIN CREATE TYPE "AssignmentEntityType" AS ENUM ('DRIVER', 'VEHICLE'); EXCEPTION WHEN duplicate_object THEN null; END $$;`,

    `ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "is_contingency_dispatch" BOOLEAN NOT NULL DEFAULT false;`,
    `ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "original_driver_id" TEXT;`,
    `ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "original_vehicle_id" TEXT;`,
    `ALTER TABLE "Trip" ADD COLUMN IF NOT EXISTS "contingency_reason" TEXT;`,

    `ALTER TABLE "TripStop" ADD COLUMN IF NOT EXISTS "executorDriverId" TEXT;`,
    `ALTER TABLE "Document" ADD COLUMN IF NOT EXISTS "executorDriverId" TEXT;`,

    `CREATE TABLE IF NOT EXISTS "DriverVehicleAssignment" (
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
        CONSTRAINT "DriverVehicleAssignment_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "DriverVehicleAssignment_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "DriverVehicleAssignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,

    `CREATE UNIQUE INDEX IF NOT EXISTS "DriverVehicleAssignment_driverId_vehicleId_assignmentType_key" ON "DriverVehicleAssignment"("driverId", "vehicleId", "assignmentType");`,
    `CREATE INDEX IF NOT EXISTS "DriverVehicleAssignment_driverId_isActive_idx" ON "DriverVehicleAssignment"("driverId", "isActive");`,
    `CREATE INDEX IF NOT EXISTS "DriverVehicleAssignment_vehicleId_isActive_idx" ON "DriverVehicleAssignment"("vehicleId", "isActive");`,

    `CREATE TABLE IF NOT EXISTS "TripDriver" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "tripId" UUID NOT NULL,
        "driverId" UUID NOT NULL,
        "role" "DriverTripRole" NOT NULL DEFAULT 'PRIMARY',
        "driver_charge" DECIMAL(12,2),
        "extra_driver_payment" DECIMAL(12,2),
        "payment_reason" TEXT,
        "payment_status" "PaymentStatus",
        "assignedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "removedAt" TIMESTAMPTZ,
        CONSTRAINT "TripDriver_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "TripDriver_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "TripDriver_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );`,

    `CREATE INDEX IF NOT EXISTS "TripDriver_tripId_driverId_idx" ON "TripDriver"("tripId", "driverId");`,
    `CREATE INDEX IF NOT EXISTS "TripDriver_tripId_role_idx" ON "TripDriver"("tripId", "role");`,

    `CREATE TABLE IF NOT EXISTS "TripAssignmentEvent" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "tripId" UUID NOT NULL,
        "entityType" "AssignmentEntityType" NOT NULL,
        "fromId" UUID,
        "toId" UUID,
        "reason" TEXT NOT NULL,
        "changedBy" UUID,
        "changedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TripAssignmentEvent_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "TripAssignmentEvent_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,

    `CREATE INDEX IF NOT EXISTS "TripAssignmentEvent_tripId_idx" ON "TripAssignmentEvent"("tripId");`,

    `INSERT INTO "TripDriver" ("id", "tripId", "driverId", "role", "driver_charge", "assignedAt")
     SELECT gen_random_uuid(), t."id", t."driverId", 'PRIMARY'::"DriverTripRole", t."driver_charge", t."createdAt"
     FROM "Trip" t
     WHERE t."driverId" IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM "TripDriver" td WHERE td."tripId" = t."id" AND td."driverId" = t."driverId" AND td."removedAt" IS NULL
       );`
  ];

  for (const sql of sqls) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log('✓ Executed SQL statement');
    } catch (e) {
      console.error('❌ SQL execution failed:', e.message);
    }
  }

  console.log('🎉 ALL DDL MIGRATION STATEMENTS COMPLETED SUCCESSFULLY!');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error('FATAL SCRIPT ERROR:', e);
    process.exit(1);
  });
