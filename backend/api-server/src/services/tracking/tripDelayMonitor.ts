import { TripStatus, StopType, Role } from '@prisma/client';
import { prisma } from '../../db';
import { logger } from '../../utils/logger';
import { DELAY_THRESHOLD_MINUTES } from '../tripLifecycle';
import { notifyOperatorsOfDelay, createNotification } from '../../controllers/notificationController';

let monitorInterval: NodeJS.Timeout | null = null;
let isChecking = false;

/**
 * Checks if a scheduled date belongs to a calendar day prior to `now`.
 */
export function isPreviousDay(date: Date, now: Date = new Date()): boolean {
  const d = new Date(date);
  const scheduledMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const currentMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return scheduledMidnight < currentMidnight;
}

/**
 * Formats date into human-readable YYYY-MM-DD or locale date string.
 */
function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Notifies operators and admins once about an unresolved / stale scheduled trip
 * whose scheduled day has ended without starting or completing.
 */
export async function notifyOperatorsOfStaleScheduled(
  tripId: string,
  tripRefId: string | null,
  scheduledDate: Date,
): Promise<void> {
  try {
    const staff = await prisma.user.findMany({
      where: { role: { in: [Role.Admin, Role.Operator] }, isActive: true, deletedAt: null },
      select: { id: true },
    });
    if (staff.length === 0) return;

    const tripLabel = tripRefId || 'A trip';
    const dateStr = formatDate(scheduledDate);
    const title = 'Unresolved Scheduled Trip';
    const message = `Trip ${tripLabel} was scheduled for ${dateStr} but was not started/completed. Please review this trip and cancel/remove it from the schedule or reschedule it.`;

    await Promise.all(
      staff.map((u) =>
        createNotification(u.id, title, message, 'StaleScheduled', 'Trip', tripId),
      ),
    );

    try {
      const { io } = require('../../index');
      if (io) {
        io.emit('trip:stale_scheduled', {
          tripId,
          ref_id: tripRefId,
          scheduledDate: dateStr,
        });
      }
    } catch {
      // Non-fatal socket broadcast
    }
  } catch (error) {
    logger.error({ err: error, tripId }, '[TripDelayMonitor] Failed to notify operators of stale scheduled trip');
  }
}

/**
 * Checks all active trips against their planned stop schedules and timestamps.
 * 
 * 1. Stale Scheduled Trips: Previous-day scheduled trips that never started are
 *    flagged with a durable notification prompting review/cancellation/rescheduling.
 * 2. Same-Day Scheduled Trips: If running >= DELAY_THRESHOLD_MINUTES (30m) past planned
 *    operational start/arrival, transitions Trip.status to 'Delayed' in the database.
 * 3. Loading Trips: Once actual arrival is stamped, pickup-arrival deadline is satisfied.
 *    Will NOT immediately re-mark as Delayed based on pickup planned_arrival.
 * 4. InTransit Trips: Evaluates the first incomplete stop (actual_arrival == null) in sequence.
 *    If >= DELAY_THRESHOLD_MINUTES past planned arrival, transitions Trip.status to 'Delayed'.
 */
export async function checkTripsForDelay(now: Date = new Date()): Promise<number> {
  if (isChecking) {
    logger.debug('[TripDelayMonitor] Check already in progress, skipping iteration');
    return 0;
  }

  isChecking = true;
  let delayedCount = 0;

  try {
    const activeTrips = await prisma.trip.findMany({
      where: {
        status: { in: [TripStatus.Scheduled, TripStatus.Loading, TripStatus.InTransit] },
        deletedAt: null,
      },
      include: {
        stops: {
          where: { deletedAt: null },
          orderBy: { stop_sequence: 'asc' },
        },
      },
    });

    for (const trip of activeTrips) {
      let isDelayed = false;
      let delayMinutes = 0;
      let targetStop: (typeof trip.stops)[number] | null = trip.stops[0] || null;

      if (trip.status === TripStatus.Scheduled) {
        const pickupStop = trip.stops.find((s) => s.stop_type === StopType.Pickup) || trip.stops[0];
        const plannedTime = pickupStop?.planned_arrival || trip.planned_start;

        if (plannedTime) {
          // Check condition C: Scheduled trip from a previous day that never started
          if (isPreviousDay(plannedTime, now)) {
            // Durable idempotency: check if already notified as StaleScheduled
            const existingStaleNotif = await prisma.notification.findFirst({
              where: {
                entity_type: 'Trip',
                entity_id: trip.id,
                type: 'StaleScheduled',
              },
            });

            if (!existingStaleNotif) {
              await notifyOperatorsOfStaleScheduled(trip.id, trip.ref_id, plannedTime);
            }
          } else {
            // Condition B: Same-day scheduled trip running > 30 min late
            if (!pickupStop || pickupStop.actual_arrival === null) {
              const diffMs = now.getTime() - plannedTime.getTime();
              const diffMinutes = Math.round(diffMs / 60000);
              if (diffMinutes >= DELAY_THRESHOLD_MINUTES) {
                isDelayed = true;
                delayMinutes = diffMinutes;
                targetStop = pickupStop || null;
              }
            }
          }
        }
      } else if (trip.status === TripStatus.Loading) {
        const pickupStop = trip.stops.find((s) => s.stop_type === StopType.Pickup) || trip.stops[0];

        // If actual pickup arrival has occurred, the arrival deadline is complete!
        // Do NOT re-flag as delayed based on planned arrival.
        if (pickupStop && pickupStop.actual_arrival !== null) {
          // Truck is actively at dock loading. Only delay if planned_departure is known and exceeded
          const plannedDep = (pickupStop as any).planned_departure;
          if (plannedDep) {
            const depTime = new Date(plannedDep);
            const diffMs = now.getTime() - depTime.getTime();
            const diffMinutes = Math.round(diffMs / 60000);
            if (diffMinutes >= DELAY_THRESHOLD_MINUTES && pickupStop.actual_departure === null) {
              isDelayed = true;
              delayMinutes = diffMinutes;
              targetStop = pickupStop;
            }
          }
        } else {
          // Loading status but arrival not yet recorded
          const plannedTime = pickupStop?.planned_arrival || trip.planned_start;
          if (plannedTime) {
            const diffMs = now.getTime() - plannedTime.getTime();
            const diffMinutes = Math.round(diffMs / 60000);
            if (diffMinutes >= DELAY_THRESHOLD_MINUTES) {
              isDelayed = true;
              delayMinutes = diffMinutes;
              targetStop = pickupStop || null;
            }
          }
        }
      } else if (trip.status === TripStatus.InTransit) {
        // Evaluate the first unreached stop in sequence
        const pendingStop = trip.stops.find((s) => s.actual_arrival === null);
        const plannedTime = pendingStop?.planned_arrival || trip.planned_end;

        if (plannedTime) {
          const diffMs = now.getTime() - plannedTime.getTime();
          const diffMinutes = Math.round(diffMs / 60000);
          if (diffMinutes >= DELAY_THRESHOLD_MINUTES) {
            isDelayed = true;
            delayMinutes = diffMinutes;
            targetStop = pendingStop || null;
          }
        }
      }

      if (isDelayed) {
        logger.warn(
          { tripId: trip.id, refId: trip.ref_id, delayMinutes, currentStatus: trip.status },
          '[TripDelayMonitor] Trip detected as delayed due to schedule overrun',
        );

        // Update database Trip.status to Delayed, preserving driver_workflow_state
        await prisma.trip.update({
          where: { id: trip.id },
          data: { status: TripStatus.Delayed },
        });

        delayedCount++;

        // Idempotent notification: max 1 per 6 hours for ongoing delay condition
        const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000);
        const existingNotif = await prisma.notification.findFirst({
          where: {
            entity_type: 'Trip',
            entity_id: trip.id,
            type: 'Delay',
            createdAt: { gte: sixHoursAgo },
          },
        });

        if (!existingNotif) {
          await notifyOperatorsOfDelay({
            tripId: trip.id,
            tripRefId: trip.ref_id,
            stopId: targetStop?.id || '',
            stopType: targetStop?.stop_type || StopType.Pickup,
            locationName: targetStop?.location_name || null,
            delayMinutes,
          });
        }

        // Broadcast status update to sockets
        try {
          const { io } = require('../../index');
          if (io) {
            io.to(`trip:${trip.id}`).emit('trip:status_change', {
              tripId: trip.id,
              status: TripStatus.Delayed,
              driver_workflow_state: trip.driver_workflow_state,
            });
            io.emit('trip:delayed', {
              tripId: trip.id,
              ref_id: trip.ref_id,
              delayMinutes,
            });
          }
        } catch {
          // Socket broadcast is non-fatal
        }
      }
    }
  } catch (error) {
    logger.error({ err: error }, '[TripDelayMonitor] Error checking trips for delay');
  } finally {
    isChecking = false;
  }

  return delayedCount;
}

/**
 * Initializes the automated schedule overrun monitor background task.
 * Runs approximately every 60 seconds.
 */
export function initTripDelayMonitor(intervalMs: number = 60000): void {
  if (monitorInterval) {
    logger.warn('[TripDelayMonitor] Monitor already initialized');
    return;
  }

  logger.info(`[TripDelayMonitor] Initializing trip delay monitor (interval: ${intervalMs}ms)`);

  // Initial check shortly after startup
  setTimeout(() => {
    checkTripsForDelay().catch((err) => {
      logger.error({ err }, '[TripDelayMonitor] Error during initial delay check');
    });
  }, 5000);

  monitorInterval = setInterval(() => {
    checkTripsForDelay().catch((err) => {
      logger.error({ err }, '[TripDelayMonitor] Error during scheduled delay check');
    });
  }, intervalMs);
}

/**
 * Stops the delay monitor interval timer (for graceful shutdown / tests).
 */
export function stopTripDelayMonitor(): void {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    logger.info('[TripDelayMonitor] Stopped trip delay monitor');
  }
}
