import { prisma } from '../db';
import { logger } from '../utils/logger';
import { DriverTripRole } from '@prisma/client';

/**
 * Backfills existing Trip records:
 * Ensures every Trip with a `driverId` has a corresponding `TripDriver` record with `role = PRIMARY`.
 */
export async function backfillTripDrivers() {
  logger.info('Starting TripDriver backfill...');

  const tripsNeedingBackfill = await prisma.trip.findMany({
    where: {
      driverId: { not: null },
      tripDrivers: { none: {} },
    },
    select: {
      id: true,
      driverId: true,
      driver_charge: true,
      extra_driver_payment: true,
      payment_reason: true,
      payment_status: true,
      createdAt: true,
    },
  });

  logger.info(`Found ${tripsNeedingBackfill.length} trips needing TripDriver backfill.`);

  let createdCount = 0;
  for (const trip of tripsNeedingBackfill) {
    if (!trip.driverId) continue;

    await prisma.tripDriver.create({
      data: {
        tripId: trip.id,
        driverId: trip.driverId,
        role: DriverTripRole.PRIMARY,
        driver_charge: trip.driver_charge,
        extra_driver_payment: trip.extra_driver_payment,
        payment_reason: trip.payment_reason,
        payment_status: trip.payment_status,
        assignedAt: trip.createdAt,
      },
    });
    createdCount++;
  }

  logger.info(`TripDriver backfill complete. Created ${createdCount} records.`);
  return createdCount;
}

if (require.main === module) {
  backfillTripDrivers()
    .then((count) => {
      console.log(`Backfill finished successfully: ${count} trip drivers created.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Backfill failed:', err);
      process.exit(1);
    });
}
