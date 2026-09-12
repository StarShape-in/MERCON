import { logger } from '../utils/logger';

/**
 * Obsolete backfill script: TripDriver table has been dropped in favor of Trip.driverId.
 */
export async function backfillTripDrivers() {
  logger.info('TripDriver table deprecated. Backfill not required.');
}
