/**
 * MERCON Single Source of Truth — Backend Financial Calculation Engine
 *
 * Handles Customer Billing, Driver Payout, 3PL Subcontract Cost,
 * Additional Itemised Charges, Balance Margin (Profit), and Margin Percentage.
 */

type Money = number | string | null | undefined | { toNumber(): number };

export const asNumber = (v: Money): number => {
  if (v == null) return 0;
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  if (typeof v === 'object' && typeof v.toNumber === 'function') return v.toNumber();
  const num = parseFloat(String(v).replace(/[^0-9.-]+/g, ''));
  return isNaN(num) ? 0 : num;
};

export interface ChargeLike {
  amount: Money;
}

export interface BackendTripFinancialInputs {
  billing_amount?: Money;
  applied_rate?: Money;
  rateCard?: { base_price?: Money; driver_payout?: Money };
  quotation?: { rate?: Money; driver_payout?: Money; pricing_basis?: string };

  driver_payout?: Money;
  driver_charge?: Money;
  trip_charges?: Money;
  extra_driver_payment?: Money;

  is_third_party?: boolean;
  third_party_cost?: Money;
  subcontract?: { cost?: Money };

  charges?: ChargeLike[] | null;
  charges_total?: Money;

  paid_amount?: Money;
  pricing_basis?: string;
}

export interface ComputedBackendFinancials {
  perTripBilling: number;        // Base customer rate
  chargesTotal: number;          // Additional billable charges
  totalCustomerBilling: number;  // perTripBilling + chargesTotal
  totalDriverPayout: number;     // Driver payout or 3PL subcontract cost
  extraDriverPayment: number;    // Extra driver allowance
  balanceMargin: number;         // totalCustomerBilling - totalDriverPayout
  marginPercent: number;         // Margin percentage (%)
  paidAmount: number;            // Amount already paid
  balanceDue: number;            // totalCustomerBilling - paidAmount
}

/** Sum of itemised customer-billable extras on a trip. */
export function computeTripChargesTotal(charges: ChargeLike[] | null | undefined): number {
  if (!charges || charges.length === 0) return 0;
  return charges.reduce((sum, c) => sum + asNumber(c.amount), 0);
}

/** Base billing price for the customer. */
export function computeTripBaseBilling(trip: BackendTripFinancialInputs): number {
  const billing = trip.billing_amount ?? trip.applied_rate ?? trip.rateCard?.base_price ?? trip.quotation?.rate;
  return Math.max(0, asNumber(billing));
}

/** Full amount owed by customer: base price plus itemised extras. */
export function computeTripTotalAmount(
  trip: BackendTripFinancialInputs,
  charges?: ChargeLike[] | null
): number {
  const base = computeTripBaseBilling(trip);
  const extra = charges !== undefined ? computeTripChargesTotal(charges) : asNumber(trip.charges_total ?? computeTripChargesTotal(trip.charges));
  return base + extra;
}

/** Driver Payout or 3PL Subcontract Cost. */
export function computeTripDriverPayout(trip: BackendTripFinancialInputs): number {
  const extraDriver = asNumber(trip.extra_driver_payment);
  if (trip.is_third_party) {
    const cost = trip.subcontract?.cost ?? trip.third_party_cost;
    return Math.max(0, asNumber(cost) + extraDriver);
  }
  const payout = trip.driver_payout ?? trip.driver_charge ?? trip.trip_charges ?? trip.rateCard?.driver_payout ?? trip.quotation?.driver_payout;
  return Math.max(0, asNumber(payout) + extraDriver);
}

/** Balance profit kept by MERCON: customer total minus driver payout. */
export function computeTripBalance(
  trip: BackendTripFinancialInputs,
  charges?: ChargeLike[] | null
): number {
  const totalAmt = computeTripTotalAmount(trip, charges);
  const driverCost = computeTripDriverPayout(trip);
  return totalAmt - driverCost;
}

/** Comprehensive financial calculation for trip controllers and reports. */
export function calculateBackendTripFinancials(trip: BackendTripFinancialInputs): ComputedBackendFinancials {
  const perTripBilling = computeTripBaseBilling(trip);
  const chargesTotal = trip.charges_total !== undefined && trip.charges_total !== null
    ? asNumber(trip.charges_total)
    : computeTripChargesTotal(trip.charges);
  
  const totalCustomerBilling = perTripBilling + chargesTotal;
  const totalDriverPayout = computeTripDriverPayout(trip);
  const extraDriverPayment = asNumber(trip.extra_driver_payment);

  const balanceMargin = totalCustomerBilling - totalDriverPayout;
  const marginPercent = totalCustomerBilling > 0
    ? Number(((balanceMargin / totalCustomerBilling) * 100).toFixed(1))
    : 0;

  const paidAmount = asNumber(trip.paid_amount);
  const balanceDue = totalCustomerBilling - paidAmount;

  return {
    perTripBilling,
    chargesTotal,
    totalCustomerBilling,
    totalDriverPayout,
    extraDriverPayment,
    balanceMargin,
    marginPercent,
    paidAmount,
    balanceDue,
  };
}
