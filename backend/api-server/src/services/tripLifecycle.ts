import { Prisma, TripStatus, DriverStatus, AssetStatus, StopType } from '@prisma/client';

/**
 * Legal next statuses for a trip, keyed by current status. Enforced by every
 * status-changing endpoint (web + mobile) so a trip can't skip stages (e.g.
 * straight to Invoiced without ever being Completed) or go backwards out of a
 * terminal state.
 */
export const ALLOWED_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  [TripStatus.Draft]: [TripStatus.Scheduled, TripStatus.Loading, TripStatus.InTransit, TripStatus.Cancelled],
  [TripStatus.Scheduled]: [TripStatus.Draft, TripStatus.Loading, TripStatus.InTransit, TripStatus.Delayed, TripStatus.Cancelled],
  [TripStatus.Loading]: [TripStatus.Draft, TripStatus.Scheduled, TripStatus.InTransit, TripStatus.Delayed, TripStatus.Cancelled],
  [TripStatus.InTransit]: [TripStatus.Draft, TripStatus.Scheduled, TripStatus.Loading, TripStatus.Delayed, TripStatus.Completed, TripStatus.Cancelled],
  [TripStatus.Delayed]: [TripStatus.Draft, TripStatus.Scheduled, TripStatus.Loading, TripStatus.InTransit, TripStatus.Completed, TripStatus.Cancelled],
  [TripStatus.Completed]: [TripStatus.Invoiced, TripStatus.InTransit, TripStatus.Loading, TripStatus.Scheduled],
  [TripStatus.Invoiced]: [TripStatus.Completed],
  [TripStatus.Cancelled]: [TripStatus.Draft, TripStatus.Scheduled],
};

export function isValidTransition(from: TripStatus, to: TripStatus): boolean {
  if (from === to) return true; // no-op update, not a transition
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * The moment each transition represents at a stop.
 */
const STOP_MARK_BY_STATUS: Partial<
  Record<TripStatus, { stop_type: StopType; field: 'actual_arrival' | 'actual_departure' }>
> = {
  [TripStatus.Loading]: { stop_type: StopType.Pickup, field: 'actual_arrival' },
  [TripStatus.InTransit]: { stop_type: StopType.Pickup, field: 'actual_departure' },
  [TripStatus.Completed]: { stop_type: StopType.Dropoff, field: 'actual_departure' },
};

/**
 * How late an arrival must be before it counts as a delay worth explaining.
 * Below this it is ordinary variance, and flagging it would only train
 * operators to ignore the alert.
 */
export const DELAY_THRESHOLD_MINUTES = 30;

/** A late arrival nobody has explained yet. */
export interface DelayDetection {
  tripId: string;
  tripRefId: string | null;
  stopId: string;
  stopType: StopType;
  locationName: string | null;
  delayMinutes: number;
}

/**
 * Record the real-world moment a status change stands for, and report back
 * whether that moment was late.
 *
 * **Every path that changes a trip's status must call this.** A stop that is
 * missed here is missed permanently — the moment has passed and no later job
 * can reconstruct when the driver actually arrived. That is exactly how
 * dropoff arrival came to be backfilled at completion time (making every
 * delivery look like it arrived the instant it finished), and how the mobile
 * geofence path recorded nothing at all.
 *
 * Only ever writes into a column that is still null, so a re-sent request or
 * an operator's manual correction is never clobbered by a later transition.
 * That same guard is what keeps the returned detection firing once instead of
 * on every retry.
 *
 * Returns null when nothing was stamped, when the moment was a departure
 * (only an arrival can be late), when no arrival was planned to measure
 * against, or when the delay is under the threshold. A non-null result is the
 * caller's cue to alert operators — **after its transaction commits**, so no
 * alert is ever sent for a trip update that then rolls back.
 */
export async function stampStopTransition(
  tx: Prisma.TransactionClient,
  tripId: string,
  to: TripStatus,
): Promise<DelayDetection | null> {
  const mark = STOP_MARK_BY_STATUS[to];
  if (!mark) return null;

  const now = new Date();
  const stamped = await tx.tripStop.updateMany({
    where: { tripId, stop_type: mark.stop_type, [mark.field]: null, deletedAt: null },
    data: { [mark.field]: now },
  });
  if (stamped.count === 0) return null; // already stamped — do not re-alert
  if (mark.field !== 'actual_arrival') return null;

  const stop = await tx.tripStop.findFirst({
    where: { tripId, stop_type: mark.stop_type, deletedAt: null },
    orderBy: { stop_sequence: 'asc' },
  });
  // No planned arrival means no baseline: the stop is honestly excluded from
  // delay reporting rather than counted as on time.
  if (!stop?.planned_arrival) return null;

  const delayMinutes = Math.round((now.getTime() - stop.planned_arrival.getTime()) / 60000);
  if (delayMinutes < DELAY_THRESHOLD_MINUTES) return null;

  const trip = await tx.trip.findUnique({ where: { id: tripId }, select: { ref_id: true } });
  return {
    tripId,
    tripRefId: trip?.ref_id ?? null,
    stopId: stop.id,
    stopType: mark.stop_type,
    locationName: stop.location_name,
    delayMinutes,
  };
}

/**
 * The one place a trip is marked Completed: releases the driver/vehicle back
 * to Available and stamps the dropoff departure timestamp.
 *
 * NOTE: Invoice creation is intentionally NOT performed here. Invoices are
 * created manually by an operator via the POST /trips/:id/mark-invoiced
 * endpoint AFTER the trip is completed. This gives the billing team full
 * control over when and how trips are invoiced.
 *
 * Call from inside an existing `prisma.$transaction`.
 */
export async function completeTrip(
  tx: Prisma.TransactionClient,
  tripId: string,
  userId: string | null | undefined,
) {
  const trip = await tx.trip.findUnique({ where: { id: tripId } });
  if (!trip) throw new Error('NOT_FOUND');

  // Marks dropoff arrival (if not already stamped) and departure.
  const now = new Date();
  await tx.tripStop.updateMany({
    where: { tripId, stop_type: StopType.Dropoff, actual_arrival: null, deletedAt: null },
    data: { actual_arrival: now },
  });
  await stampStopTransition(tx, tripId, TripStatus.Completed);

  const updatedTrip = await tx.trip.update({
    where: { id: tripId },
    data: {
      status: TripStatus.Completed,
      actual_end: trip.actual_end ?? now,
      updated_by: userId ?? undefined,
    },
  });

  if (trip.driverId) await tx.driver.update({ where: { id: trip.driverId }, data: { status: DriverStatus.Available } });
  if (trip.vehicleId) await tx.vehicle.update({ where: { id: trip.vehicleId }, data: { status: AssetStatus.Available } });

  return updatedTrip;
}

/**
 * @deprecated Use completeTrip() instead.
 * This alias is kept temporarily to ease migration of any call sites still
 * referencing the old name. It will be removed in a future cleanup.
 */
export const completeTripAndInvoice = completeTrip;

export async function stampWorkflowTransition(
  tx: Prisma.TransactionClient,
  tripId: string,
  workflowState: string,
) {
  const now = new Date();
  const stops = await tx.tripStop.findMany({
    where: { tripId, deletedAt: null },
    orderBy: { stop_sequence: 'asc' },
  });
  if (stops.length === 0) return;

  const firstStop = stops[0];
  const lastStop = stops[stops.length - 1];
  const isRound = stops.length >= 3 && (
    (firstStop.location_name || '').toLowerCase().trim() === (lastStop.location_name || '').toLowerCase().trim() ||
    stops.some(s => s.stop_sequence >= 3)
  );

  if (workflowState === 'ARRIVED_AT_PICKUP' || workflowState === 'LOADING') {
    // Stamp Stop 1 arrival
    await tx.tripStop.updateMany({
      where: { id: firstStop.id, actual_arrival: null },
      data: { actual_arrival: now },
    });
  } else if (workflowState === 'IN_TRANSIT' || workflowState === 'LOADING_COMPLETED') {
    // Stamp Stop 1 departure
    await tx.tripStop.updateMany({
      where: { id: firstStop.id, actual_departure: null },
      data: { actual_departure: now },
    });
  } else if (workflowState === 'ARRIVED_AT_DELIVERY') {
    // Delivery of outbound leg (stop sequence 2, or last stop for single trip)
    const leg0Delivery = stops.find(s => s.stop_sequence === (isRound ? 2 : stops.length)) || stops[1] || lastStop;
    await tx.tripStop.updateMany({
      where: { id: leg0Delivery.id, actual_arrival: null },
      data: { actual_arrival: now },
    });
  } else if (workflowState === 'FIRST_DELIVERY_COMPLETED' || workflowState === 'RETURN_LOADING') {
    // Leg 0 delivery departed
    const leg0Delivery = stops.find(s => s.stop_sequence === 2) || stops[1];
    if (leg0Delivery) {
      await tx.tripStop.updateMany({
        where: { id: leg0Delivery.id, actual_departure: null },
        data: { actual_departure: now },
      });
    }
    // Return loading stop arrived
    const returnLoadingStop = stops.find(s => s.stop_sequence === 3);
    if (returnLoadingStop) {
      await tx.tripStop.updateMany({
        where: { id: returnLoadingStop.id, actual_arrival: null },
        data: { actual_arrival: now },
      });
    }
  } else if (workflowState === 'IN_TRANSIT_RETURN' || workflowState === 'RETURN_LOADING_COMPLETED') {
    // Return loading stop departed
    const returnLoadingStop = stops.find(s => s.stop_sequence === 3);
    if (returnLoadingStop) {
      await tx.tripStop.updateMany({
        where: { id: returnLoadingStop.id, actual_departure: null },
        data: { actual_departure: now },
      });
    }
  } else if (workflowState === 'ARRIVED_AT_FINAL_DELIVERY') {
    // Final delivery stop arrived
    await tx.tripStop.updateMany({
      where: { id: lastStop.id, actual_arrival: null },
      data: { actual_arrival: now },
    });
  } else if (workflowState === 'COMPLETED' || workflowState === 'RETURN_DELIVERY_COMPLETED') {
    // Stamp final stop departure
    await tx.tripStop.updateMany({
      where: { id: lastStop.id, actual_departure: null },
      data: { actual_departure: now },
    });
  }
}


