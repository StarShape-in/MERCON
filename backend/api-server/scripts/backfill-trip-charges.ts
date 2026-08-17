/**
 * Copies the two legacy flat charge columns on Trip into itemised TripCharge
 * rows, so they can be dropped without losing historical financial data.
 *
 *   npm run backfill:trip-charges -w @mercon/api-server           # migrate
 *   npm run backfill:trip-charges:verify -w @mercon/api-server    # check only
 *
 * Background: Trip.waiting_labor_charges and Trip.additional_stop_charges were
 * the only two customer-billable extras a trip could carry. They are replaced
 * by the TripCharge relation, which supports any number of named charge types.
 * This repo deploys schema changes with `prisma db push`, which runs no data
 * migration logic — so this has to be a separate step, run AFTER the additive
 * schema change is deployed and BEFORE the two columns are removed.
 *
 * Safe to run more than once: a trip that already has its legacy rows is
 * skipped rather than duplicated. Exits non-zero if the migrated totals do not
 * match the originals exactly, so a partial run cannot look like a clean one.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DB = process.env.DATABASE_URL ?? '';
const VERIFY_ONLY = process.argv.includes('--verify');

/**
 * Charge types written by this script. Marked "(legacy)" because these rows
 * predate the SurchargeRule table — there is no rule to point them at, and
 * nobody recorded a quantity at the time, so they carry quantity 1 and the
 * whole original amount as the rate.
 */
const LEGACY_WAITING = 'Waiting/Labor (legacy)';
const LEGACY_STOPS = 'Additional Stop (legacy)';

/** Float columns, so compare on cents rather than exact binary equality. */
const money = (n: number) => Math.round(n * 100);

async function main() {
  if (!DB) {
    console.error('Refusing to run: DATABASE_URL is unset.');
    process.exit(1);
  }
  console.log(`${VERIFY_ONLY ? 'Verifying' : 'Backfilling'} trip charges on ${DB.replace(/:[^:@/]*@/, ':***@')}\n`);

  // Soft-deleted trips are included deliberately: a deleted trip's money still
  // has to survive the column drop, and the reports that read it already show
  // historical rows.
  const trips = await prisma.trip.findMany({
    where: {
      OR: [{ waiting_labor_charges: { not: 0 } }, { additional_stop_charges: { not: 0 } }],
    },
    select: {
      id: true,
      ref_id: true,
      waiting_labor_charges: true,
      additional_stop_charges: true,
      charges: { select: { charge_type: true, amount: true } },
    },
  });

  console.log(`  ${trips.length} trips carry a non-zero legacy charge.`);
  if (trips.length === 0) {
    console.log('\nNothing to migrate.');
    return;
  }

  let created = 0;
  let skipped = 0;
  const missing: string[] = [];

  for (const trip of trips) {
    const pending: { charge_type: string; rate: number }[] = [];
    if (trip.waiting_labor_charges !== 0) {
      pending.push({ charge_type: LEGACY_WAITING, rate: trip.waiting_labor_charges });
    }
    if (trip.additional_stop_charges !== 0) {
      pending.push({ charge_type: LEGACY_STOPS, rate: trip.additional_stop_charges });
    }

    for (const row of pending) {
      const already = trip.charges.some((c) => c.charge_type === row.charge_type);
      if (already) {
        skipped++;
        continue;
      }
      if (VERIFY_ONLY) {
        missing.push(`${trip.ref_id ?? trip.id} — ${row.charge_type} (${row.rate})`);
        continue;
      }
      await prisma.tripCharge.create({
        data: {
          tripId: trip.id,
          surchargeRuleId: null,
          charge_type: row.charge_type,
          unit: null,
          rate: row.rate,
          quantity: 1,
          amount: row.rate,
        },
      });
      created++;
    }
  }

  if (VERIFY_ONLY) {
    if (missing.length > 0) {
      console.error(`\n${missing.length} legacy charges have NOT been migrated:`);
      missing.slice(0, 20).forEach((m) => console.error(`  ${m}`));
      if (missing.length > 20) console.error(`  ...and ${missing.length - 20} more`);
      console.error('\nRun the backfill before dropping the legacy columns.');
      process.exit(1);
    }
    console.log(`  ${skipped} legacy charges already present.`);
  } else {
    console.log(`  ${created} TripCharge rows created, ${skipped} already existed.`);
  }

  // Re-read and prove the totals match. This is the check that matters: it is
  // what says no money was lost or invented in translation.
  const after = await prisma.trip.findMany({
    where: {
      OR: [{ waiting_labor_charges: { not: 0 } }, { additional_stop_charges: { not: 0 } }],
    },
    select: {
      waiting_labor_charges: true,
      additional_stop_charges: true,
      charges: { select: { charge_type: true, amount: true } },
    },
  });

  const legacyTotal = after.reduce(
    (sum, t) => sum + money(t.waiting_labor_charges) + money(t.additional_stop_charges),
    0
  );
  const migratedTotal = after.reduce(
    (sum, t) =>
      sum +
      t.charges
        .filter((c) => c.charge_type === LEGACY_WAITING || c.charge_type === LEGACY_STOPS)
        .reduce((s, c) => s + money(c.amount), 0),
    0
  );

  console.log(`\n  legacy columns total : ${(legacyTotal / 100).toFixed(2)}`);
  console.log(`  migrated rows total  : ${(migratedTotal / 100).toFixed(2)}`);

  if (legacyTotal !== migratedTotal) {
    console.error(
      `\nMISMATCH of ${((migratedTotal - legacyTotal) / 100).toFixed(2)}. ` +
        'Do NOT drop the legacy columns — investigate first.'
    );
    process.exit(1);
  }
  console.log('\nTotals match exactly. Legacy columns are safe to drop.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
