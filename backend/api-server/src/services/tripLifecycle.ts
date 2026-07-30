import { Prisma, TripStatus, DriverStatus, AssetStatus } from '@prisma/client';
import { generateRefId } from '../utils/refId';

/**
 * Legal next statuses for a trip, keyed by current status. Enforced by every
 * status-changing endpoint (web + mobile) so a trip can't skip stages (e.g.
 * straight to Invoiced without ever being Completed) or go backwards out of a
 * terminal state.
 */
export const ALLOWED_TRANSITIONS: Record<TripStatus, TripStatus[]> = {
  [TripStatus.Draft]: [TripStatus.Dispatched, TripStatus.Cancelled],
  [TripStatus.Dispatched]: [TripStatus.AtPickup, TripStatus.Cancelled],
  [TripStatus.AtPickup]: [TripStatus.InTransit, TripStatus.Cancelled],
  [TripStatus.InTransit]: [TripStatus.AtDelivery, TripStatus.Cancelled],
  [TripStatus.AtDelivery]: [TripStatus.Completed, TripStatus.Cancelled],
  [TripStatus.Completed]: [TripStatus.Invoiced],
  [TripStatus.Invoiced]: [],
  [TripStatus.Cancelled]: [],
};

export function isValidTransition(from: TripStatus, to: TripStatus): boolean {
  if (from === to) return true; // no-op update, not a transition
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * The one place a trip is marked Completed: releases the driver/vehicle back
 * to Available and generates the invoice (customer's active rate card, or the
 * kingdom-wide default, or a flat fallback) if one doesn't already exist.
 * Call from inside an existing `prisma.$transaction`.
 */
export async function completeTripAndInvoice(
  tx: Prisma.TransactionClient,
  tripId: string,
  userId: string | null | undefined,
) {
  const trip = await tx.trip.findUnique({ where: { id: tripId }, include: { stops: true } });
  if (!trip) throw new Error('NOT_FOUND');

  const dropoffStop = trip.stops.find((s) => s.stop_type === 'Dropoff');
  if (dropoffStop && !dropoffStop.actual_arrival) {
    await tx.tripStop.update({ where: { id: dropoffStop.id }, data: { actual_arrival: new Date() } });
  }

  const updatedTrip = await tx.trip.update({
    where: { id: tripId },
    data: {
      status: TripStatus.Completed,
      actual_end: trip.actual_end ?? new Date(),
      updated_by: userId ?? undefined,
    },
  });

  if (trip.driverId) await tx.driver.update({ where: { id: trip.driverId }, data: { status: DriverStatus.Available } });
  if (trip.vehicleId) await tx.vehicle.update({ where: { id: trip.vehicleId }, data: { status: AssetStatus.Available } });

  const existingInvoice = await tx.invoice.findFirst({ where: { tripId: trip.id } });
  if (!existingInvoice) {
    let rateCard = await tx.rateCard.findFirst({ where: { customerId: trip.customerId, is_active: true } });
    if (!rateCard) {
      rateCard = await tx.rateCard.findFirst({ where: { customerId: null, is_active: true } });
    }

    const baseBilling = trip.billing_amount ?? (rateCard ? rateCard.base_price : 1000.0);
    const totalAmount = baseBilling + (trip.waiting_labor_charges ?? 0) + (trip.additional_stop_charges ?? 0);
    const invoiceRefId = await generateRefId('INV', () => tx.invoice.findMany({ select: { ref_id: true } }));

    await tx.invoice.create({
      data: {
        ref_id: invoiceRefId,
        tripId: trip.id,
        customerId: trip.customerId,
        status: 'Draft',
        currency: rateCard ? rateCard.currency : 'SAR',
        subtotal: baseBilling,
        total_amount: totalAmount,
        due_date: new Date(new Date().setDate(new Date().getDate() + 30)), // Net 30
        created_by: userId ?? undefined,
      },
    });
  }

  return updatedTrip;
}

