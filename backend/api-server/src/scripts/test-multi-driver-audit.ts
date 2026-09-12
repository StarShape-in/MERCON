import { logger } from '../utils/logger';

/**
 * Obsolete audit script: TripDriver table has been dropped in favor of Trip.driverId.
 */
export async function testMultiDriverAudit() {
  logger.info('Multi-driver audit script deprecated.');
}
