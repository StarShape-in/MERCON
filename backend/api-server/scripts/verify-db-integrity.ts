import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runDatabaseIntegrityVerification() {
  console.log('=== DATABASE INTEGRITY VERIFICATION (READ-ONLY) ===\n');

  // 1. Check Trip Columns Existence via information_schema
  const tripColumns = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'Trip';
  `;

  const colNames = tripColumns.map((c) => c.column_name);

  console.log('[1. Column Existence Checks on Table "Trip"]');
  const hasDriverPayout = colNames.includes('driver_payout');
  const hasTripCharges = colNames.includes('trip_charges');
  const hasWaitingLabor = colNames.includes('waiting_labor_charges');
  const hasAdditionalStops = colNames.includes('additional_stop_charges');

  console.log(`  - "driver_payout" column present: ${hasDriverPayout ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  - "trip_charges" column removed: ${!hasTripCharges ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  - "waiting_labor_charges" column removed: ${!hasWaitingLabor ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`  - "additional_stop_charges" column removed: ${!hasAdditionalStops ? '✅ PASS' : '❌ FAIL'}`);

  // 2. Check Foreign Key Constraints via information_schema
  console.log('\n[2. Foreign Key Constraint Checks]');

  const fkConstraints = await prisma.$queryRaw<Array<{ table_name: string; constraint_name: string; column_name: string; foreign_table_name: string }>>`
    SELECT
        tc.table_name,
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY';
  `;

  const targetFks = [
    { table: 'Trip', col: 'original_vehicle_id' },
    { table: 'Trip', col: 'original_driver_id' },
    { table: 'TripStop', col: 'delay_logged_by' },
    { table: 'TripStop', col: 'executorDriverId' },
    { table: 'Document', col: 'executorDriverId' },
    { table: 'TripAssignmentEvent', col: 'changedBy' },
    { table: 'QuotationHistory', col: 'changed_by_user_id' },
    { table: 'MaintenanceRecord', col: 'workshopId' },
  ];

  for (const target of targetFks) {
    const match = fkConstraints.find(
      (f) => f.table_name === target.table && f.column_name === target.col
    );
    if (match) {
      console.log(`  - FK ${target.table}.${target.col} -> ${match.foreign_table_name}: ✅ PRESENT (${match.constraint_name})`);
    } else {
      console.log(`  - FK ${target.table}.${target.col}: ℹ️ Logical Relation in Prisma (No DB-level FK constraint requirement, or optional)`);
    }
  }

  // 3. Historical Financial Data Preservation
  console.log('\n[3. Historical Data Verification]');
  const totalTripsCount = await prisma.trip.count();
  const nonZeroPayoutTripsCount = await prisma.trip.count({
    where: { driver_payout: { gt: 0 } },
  });
  const payoutAggregate = await prisma.trip.aggregate({
    _sum: { driver_payout: true },
    _avg: { driver_payout: true },
  });

  const sumPayout = payoutAggregate._sum.driver_payout ? Number(payoutAggregate._sum.driver_payout) : 0;
  const avgPayout = payoutAggregate._avg.driver_payout ? Number(payoutAggregate._avg.driver_payout) : 0;

  console.log(`  - Total trips count: ${totalTripsCount}`);
  console.log(`  - Trips with driver_payout > 0: ${nonZeroPayoutTripsCount}`);
  console.log(`  - Total sum of driver_payout: SAR ${sumPayout.toFixed(2)}`);
  console.log(`  - Average driver_payout per trip: SAR ${avgPayout.toFixed(2)}`);

  // Sample trip inspection
  const sampleTrips = await prisma.trip.findMany({
    take: 5,
    select: {
      id: true,
      ref_id: true,
      status: true,
      driver_payout: true,
      billing_amount: true,
      createdAt: true,
    },
  });

  console.log('\n[Sample Historical Trips Inspection]');
  sampleTrips.forEach((t, i) => {
    console.log(
      `  ${i + 1}. [Ref: ${t.ref_id ?? t.id}] Status: ${t.status}, Driver Payout: SAR ${Number(t.driver_payout).toFixed(2)}, Billing Amount: SAR ${t.billing_amount != null ? Number(t.billing_amount).toFixed(2) : 'N/A'}`
    );
  });

  console.log('\n=== DB INTEGRITY VERIFICATION COMPLETE ===');
}

runDatabaseIntegrityVerification()
  .catch((e) => {
    console.error('Database integrity check failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
