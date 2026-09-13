import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('=== Running TripSubcontract Migration & Data Preservation ===');

  // 1. Create table TripSubcontract if not exists
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "TripSubcontract" (
        "id" UUID NOT NULL DEFAULT gen_random_uuid(),
        "tripId" UUID NOT NULL,
        "providerId" UUID,
        "driverName" TEXT,
        "driverPhone" TEXT,
        "vehiclePlate" TEXT,
        "vehicleType" TEXT,
        "cost" DECIMAL(12,2) DEFAULT 0.0,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "TripSubcontract_pkey" PRIMARY KEY ("id")
    );
  `);

  // 2. Create Unique Index & Foreign Keys
  await prisma.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "TripSubcontract_tripId_key" ON "TripSubcontract"("tripId");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "TripSubcontract_providerId_idx" ON "TripSubcontract"("providerId");
  `);

  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TripSubcontract_tripId_fkey') THEN
            ALTER TABLE "TripSubcontract" ADD CONSTRAINT "TripSubcontract_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TripSubcontract_providerId_fkey') THEN
            ALTER TABLE "TripSubcontract" ADD CONSTRAINT "TripSubcontract_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ThirdPartyProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
    END $$;
  `);

  // 3. Migrate third-party data from Trip table if legacy columns exist
  const columnCheck: Array<{ count: bigint }> = await prisma.$queryRawUnsafe(`
    SELECT COUNT(*) as count FROM information_schema.columns WHERE table_name = 'Trip' AND column_name = 'third_party_driver_name';
  `);

  if (Number(columnCheck[0].count) > 0) {
    const inserted = await prisma.$executeRawUnsafe(`
      INSERT INTO "TripSubcontract" (
          "id", "tripId", "providerId", "driverName", "driverPhone", "vehiclePlate", "vehicleType", "cost", "createdAt", "updatedAt"
      )
      SELECT
          gen_random_uuid(),
          t."id",
          t."thirdPartyProviderId",
          t."third_party_driver_name",
          t."third_party_driver_phone",
          t."third_party_vehicle_plate",
          t."third_party_vehicle_type",
          COALESCE(t."third_party_cost", 0.0),
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
      FROM "Trip" t
      WHERE (
          t."is_third_party" = true
          OR t."thirdPartyProviderId" IS NOT NULL
          OR t."third_party_driver_name" IS NOT NULL
          OR t."third_party_vehicle_plate" IS NOT NULL
      )
      AND NOT EXISTS (
          SELECT 1 FROM "TripSubcontract" ts WHERE ts."tripId" = t."id"
      );
    `);
    console.log(`Migrated ${inserted} third-party subcontracts from Trip to TripSubcontract.`);

    // Drop legacy columns
    await prisma.$executeRawUnsafe(`ALTER TABLE "Trip" DROP COLUMN IF EXISTS "thirdPartyProviderId";`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Trip" DROP COLUMN IF EXISTS "third_party_driver_name";`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Trip" DROP COLUMN IF EXISTS "third_party_driver_phone";`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Trip" DROP COLUMN IF EXISTS "third_party_vehicle_plate";`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Trip" DROP COLUMN IF EXISTS "third_party_vehicle_type";`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "Trip" DROP COLUMN IF EXISTS "third_party_cost";`);
    console.log('Legacy third-party columns dropped cleanly from Trip table.');
  } else {
    console.log('Legacy third-party columns already removed from Trip table.');
  }

  // Verification Audit
  const totalTrips = await prisma.trip.count();
  const thirdPartyTrips = await prisma.trip.count({ where: { is_third_party: true } });
  const totalSubcontracts = await prisma.tripSubcontract.count();

  console.log(`=== Verification ===`);
  console.log(`Total Trips: ${totalTrips}`);
  console.log(`Trips with is_third_party = true: ${thirdPartyTrips}`);
  console.log(`Total TripSubcontract records: ${totalSubcontracts}`);

  console.log('Migration & Data Preservation Completed Successfully!');
}

main()
  .catch((err) => {
    console.error('Migration Error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
