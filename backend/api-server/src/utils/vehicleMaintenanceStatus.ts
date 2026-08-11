import { prisma } from '../index';
import { logger } from '../utils/logger';

/**
 * A vehicle sits in the workshop only while it has an *open* service order.
 * Historically some rows were written as `In Progress` (with a space) before the
 * enum settled on `In_Progress`, so both spellings count as open.
 */
export const ACTIVE_MAINTENANCE_STATUSES = ['In_Progress', 'In Progress'];
export const SCHEDULED_STATUS = 'Scheduled';

/**
 * Re-derives `Vehicle.status` from that vehicle's service orders. This is the single
 * place the Maintenance module is allowed to move a vehicle in or out of the workshop:
 *
 *  - any open service order  → vehicle goes to `Maintenance`
 *  - no open service order   → a vehicle currently sitting at `Maintenance` is released
 *                              back to `Available`
 *
 * `Available` / `OnTrip` / `Inactive` are left alone when there is nothing open — a
 * vehicle on a trip must not be yanked out from under the trip by a maintenance edit.
 *
 * Call this after every create / update / delete of a maintenance record. Doing the
 * release in one derived pass (instead of only on the "mark completed" edit) is what
 * stops vehicles getting stuck showing "Maintenance" — e.g. logging an already-completed
 * service order, deleting the open one, or completing it from a different screen.
 */
export async function syncVehicleMaintenanceStatus(vehicleId: string): Promise<void> {
  try {
    const now = new Date();
    const [vehicle, activeCount] = await Promise.all([
      prisma.vehicle.findFirst({
        where: { id: vehicleId, deletedAt: null },
        select: { id: true, status: true },
      }),
      prisma.maintenanceRecord.count({
        where: {
          vehicleId,
          deletedAt: null,
          OR: [
            { status: { in: ACTIVE_MAINTENANCE_STATUSES } },
            {
              status: SCHEDULED_STATUS,
              start_date: { lte: now },
              OR: [
                { end_date: null },
                { end_date: { gte: now } },
              ],
            },
          ],
        },
      }),
    ]);

    if (!vehicle) return;

    if (activeCount > 0) {
      if (vehicle.status !== 'Maintenance') {
        await prisma.vehicle.update({ where: { id: vehicleId }, data: { status: 'Maintenance' } });
      }
      return;
    }

    if (vehicle.status === 'Maintenance') {
      await prisma.vehicle.update({ where: { id: vehicleId }, data: { status: 'Available' } });
    }
  } catch (error) {
    // A status sync failure must not fail the maintenance write that triggered it.
    logger.error({ err: error, vehicleId }, 'Failed to sync vehicle status from maintenance records');
  }
}
