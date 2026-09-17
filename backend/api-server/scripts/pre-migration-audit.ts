import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runAudit() {
  console.log('=== PHASE 0: PRE-MIGRATION AUDIT & DATA CHECKS ===\n');

  // 1. Check Legacy Charges in Trip
  const tripsWithLegacyCharges = await prisma.$queryRaw<Array<{ waiting_count: bigint; stop_count: bigint }>>`
    SELECT
      COUNT(*) FILTER (WHERE waiting_labor_charges IS NOT NULL AND waiting_labor_charges <> 0) AS waiting_count,
      COUNT(*) FILTER (WHERE additional_stop_charges IS NOT NULL AND additional_stop_charges <> 0) AS stop_count
    FROM "Trip";
  `;
  const waitingCount = Number(tripsWithLegacyCharges[0].waiting_count);
  const stopCount = Number(tripsWithLegacyCharges[0].stop_count);

  console.log(`[Legacy Charges Check]`);
  console.log(`  - Trips with waiting_labor_charges > 0: ${waitingCount}`);
  console.log(`  - Trips with additional_stop_charges > 0: ${stopCount}`);
  if (waitingCount > 0 || stopCount > 0) {
    console.log(`  ⚠️ Legacy charges exist. Needs backfill verification before dropping columns.\n`);
  } else {
    console.log(`  ✅ Zero non-zero legacy charges found in Trip.\n`);
  }

  // 2. Foreign Key Orphan Checks
  console.log('[Orphan Foreign Key Checks]');

  // Trip.original_vehicle_id
  const origVehOrphans = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) AS count FROM "Trip" t
    LEFT JOIN "Vehicle" v ON v.id = t.original_vehicle_id
    WHERE t.original_vehicle_id IS NOT NULL AND v.id IS NULL;
  `;
  console.log(`  - Trip.original_vehicle_id orphans: ${Number(origVehOrphans[0].count)}`);

  // Trip.original_driver_id
  const origDriverOrphans = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) AS count FROM "Trip" t
    LEFT JOIN "Driver" d ON d.id = t.original_driver_id
    WHERE t.original_driver_id IS NOT NULL AND d.id IS NULL;
  `;
  console.log(`  - Trip.original_driver_id orphans: ${Number(origDriverOrphans[0].count)}`);

  // TripStop.delay_logged_by
  const delayLoggedByOrphans = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) AS count FROM "TripStop" ts
    LEFT JOIN "User" u ON u.id = ts.delay_logged_by
    WHERE ts.delay_logged_by IS NOT NULL AND u.id IS NULL;
  `;
  console.log(`  - TripStop.delay_logged_by orphans: ${Number(delayLoggedByOrphans[0].count)}`);

  // TripStop.executorDriverId
  const stopExecDriverOrphans = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) AS count FROM "TripStop" ts
    LEFT JOIN "Driver" d ON d.id = ts."executorDriverId"
    WHERE ts."executorDriverId" IS NOT NULL AND d.id IS NULL;
  `;
  console.log(`  - TripStop.executorDriverId orphans: ${Number(stopExecDriverOrphans[0].count)}`);

  // Document.executorDriverId
  const docExecDriverOrphans = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) AS count FROM "Document" doc
    LEFT JOIN "Driver" d ON d.id = doc."executorDriverId"
    WHERE doc."executorDriverId" IS NOT NULL AND d.id IS NULL;
  `;
  console.log(`  - Document.executorDriverId orphans: ${Number(docExecDriverOrphans[0].count)}`);

  // TripAssignmentEvent.changedBy
  const assignmentChangedByOrphans = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) AS count FROM "TripAssignmentEvent" tae
    LEFT JOIN "User" u ON u.id = tae."changedBy"
    WHERE tae."changedBy" IS NOT NULL AND u.id IS NULL;
  `;
  console.log(`  - TripAssignmentEvent.changedBy orphans: ${Number(assignmentChangedByOrphans[0].count)}`);

  // QuotationHistory.changed_by_user_id
  const quoteHistUserOrphans = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*) AS count FROM "QuotationHistory" qh
    LEFT JOIN "User" u ON u.id = qh.changed_by_user_id
    WHERE qh.changed_by_user_id IS NOT NULL AND u.id IS NULL;
  `;
  console.log(`  - QuotationHistory.changed_by_user_id orphans: ${Number(quoteHistUserOrphans[0].count)}`);

  console.log('\n=== AUDIT SUMMARY ===');
  const totalOrphans =
    Number(origVehOrphans[0].count) +
    Number(origDriverOrphans[0].count) +
    Number(delayLoggedByOrphans[0].count) +
    Number(stopExecDriverOrphans[0].count) +
    Number(docExecDriverOrphans[0].count) +
    Number(assignmentChangedByOrphans[0].count) +
    Number(quoteHistUserOrphans[0].count);

  if (totalOrphans === 0) {
    console.log('✅ ALL FK ORPHAN CHECKS PASSED WITH 0 ORPHANS!');
  } else {
    console.log(`⚠️ FOUND ${totalOrphans} TOTAL ORPHAN RECORDS. Clean up orphans before applying FK constraints.`);
  }
}

runAudit()
  .catch((e) => {
    console.error('Audit script failed:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
