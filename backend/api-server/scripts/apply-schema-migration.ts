import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runMigration() {
  console.log('=== EXECUTING SAFE DATABASE DDL MIGRATIONS ===\n');

  // 1. Rename trip_charges column to driver_payout if column exists
  console.log('1. Renaming column "trip_charges" -> "driver_payout" on table "Trip"...');
  await prisma.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='Trip' AND column_name='trip_charges'
      ) THEN
        ALTER TABLE "Trip" RENAME COLUMN "trip_charges" TO "driver_payout";
        RAISE NOTICE 'Column trip_charges successfully renamed to driver_payout.';
      ELSE
        RAISE NOTICE 'Column trip_charges already renamed or does not exist.';
      END IF;
    END $$;
  `);
  console.log('  ✅ Column rename DDL completed.');

  // 2. Drop obsolete legacy columns after Phase 0 confirmation
  console.log('2. Dropping obsolete legacy columns ("waiting_labor_charges", "additional_stop_charges") on table "Trip"...');
  await prisma.$executeRawUnsafe(`ALTER TABLE "Trip" DROP COLUMN IF EXISTS "waiting_labor_charges";`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Trip" DROP COLUMN IF EXISTS "additional_stop_charges";`);
  console.log('  ✅ Obsolete legacy columns dropped.');

  // 3. Add workshopId to MaintenanceRecord if not existing
  console.log('3. Ensuring "workshopId" column exists on table "MaintenanceRecord"...');
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "MaintenanceRecord" ADD COLUMN IF NOT EXISTS "workshopId" UUID;
  `);
  console.log('  ✅ workshopId column check completed.');

  console.log('\n=== DDL MIGRATION COMPLETE ===');
}

runMigration()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
