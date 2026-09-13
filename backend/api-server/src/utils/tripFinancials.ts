/**
 * One definition of what a trip is worth, shared by invoicing and reporting.
 *
 * This used to be copy-pasted in four places (invoiceController twice,
 * reportsController, and the xlsx trip report), and the copies had already
 * started to drift. Since all of them had to change when the flat
 * waiting_labor_charges / additional_stop_charges columns became the itemised
 * TripCharge relation, they were collapsed into these two functions instead.
 *
 * The distinction that keeps getting lost, and the reason this file has
 * comments at all:
 *
 *   billing_amount + charges  = what the CUSTOMER owes    (revenue)
 *   trip_charges              = what MERCON pays the driver or subcontractor
 *                               for running it            (cost)
 *   the difference            = what MERCON keeps         (balance)
 *
 * trip_charges is deliberately NOT part of the customer total. It is a cost,
 * and adding it to an invoice would bill the customer for MERCON's own payroll.
 */

// Prisma rows carry these as Decimal at runtime, not number — accept either
// so callers can pass a Trip/TripCharge straight through unconverted.
type Money = number | { toNumber(): number };
const asNumber = (v: Money | null | undefined): number => (v == null ? 0 : typeof v === 'number' ? v : v.toNumber());

/** Just the amount fields; callers pass Prisma rows or plain objects alike. */
export interface ChargeLike {
  amount: Money;
}

/** What a trip carries that these sums read. */
export interface TripFinancialsLike {
  billing_amount: Money | null;
  driver_payout?: Money;
  driver_charge?: Money;
  trip_charges?: Money;
}

/** Sum of the itemised customer-billable extras on a trip. */
export function computeTripChargesTotal(charges: ChargeLike[] | null | undefined): number {
  if (!charges || charges.length === 0) return 0;
  return charges.reduce((sum, c) => sum + asNumber(c.amount), 0);
}

/**
 * The base price the customer is billed, before extras.
 */
export function computeTripBaseBilling(trip: TripFinancialsLike): number {
  return trip.billing_amount != null ? asNumber(trip.billing_amount) : asNumber(trip.driver_payout ?? trip.driver_charge ?? trip.trip_charges);
}

/** Full amount owed by the customer: base price plus every itemised extra. */
export function computeTripTotalAmount(
  trip: TripFinancialsLike,
  charges: ChargeLike[] | null | undefined
): number {
  return computeTripBaseBilling(trip) + computeTripChargesTotal(charges);
}

/** What MERCON keeps: customer total minus (additional charges + driver charge/payout). */
export function computeTripBalance(
  trip: TripFinancialsLike,
  charges: ChargeLike[] | null | undefined
): number {
  const totalAmt = computeTripTotalAmount(trip, charges);
  const extraCharges = computeTripChargesTotal(charges);
  const driverPayout = asNumber(trip.driver_payout ?? trip.driver_charge ?? trip.trip_charges);
  return totalAmt - (extraCharges + driverPayout);
}
