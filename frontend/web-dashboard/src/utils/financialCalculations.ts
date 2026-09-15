/**
 * MERCON Single Source of Truth — Financial Calculation Engine
 * 
 * Unifies Customer Billing, Driver Payout, 3PL Subcontract Cost,
 * Additional Charges, Balance Margin, and Margin Percentage math
 * across all frontend components (cards, forms, drawers, wizards).
 */

export interface TripFinancialInputs {
  customerBilling?: number | string | null;
  billingAmount?: number | string | null;
  baseRate?: number | string | null;

  driverPayout?: number | string | null;
  driverCharge?: number | string | null;

  is3PL?: boolean;
  subcontractCost?: number | string | null;
  extraDriverPayment?: number | string | null;

  additionalCharges?: number | string | null;
  pricingBasis?: 'Per Trip' | 'Per Month' | string | null;
}

export interface ComputedTripFinancials {
  resolvedBilling: number;        // Base customer billing rate (SAR)
  resolvedDriverPayout: number;   // Driver payout or 3PL carrier cost (SAR)
  additionalChargesTotal: number; // Itemized extra charges sum (SAR)
  totalCustomerBilling: number;   // Resolved billing + additional charges (SAR)
  balanceMargin: number;          // Total customer billing - driver payout (SAR)
  marginPercent: number;          // Margin percentage (%) rounded to 1 decimal
  perTripBreakdown: number;       // Daily breakdown for monthly basis (SAR)
}

function parseMoney(val: number | string | null | undefined): number {
  if (val == null) return 0;
  const num = typeof val === 'number' ? val : parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
  return isNaN(num) ? 0 : num;
}

export function computeTripFinancials(inputs: TripFinancialInputs): ComputedTripFinancials {
  // 1. Resolve Customer Base Billing Rate
  const billingVal = parseMoney(inputs.customerBilling ?? inputs.billingAmount ?? inputs.baseRate ?? 0);
  const resolvedBilling = Math.max(0, billingVal);

  // 2. Resolve Driver Payout or 3PL Subcontractor Cost
  const extraDriver = parseMoney(inputs.extraDriverPayment ?? 0);
  const basePayoutVal = inputs.is3PL
    ? parseMoney(inputs.subcontractCost ?? 0)
    : parseMoney(inputs.driverPayout ?? inputs.driverCharge ?? 0);
  const resolvedDriverPayout = Math.max(0, basePayoutVal + extraDriver);

  // 3. Resolve Additional Billable Charges
  const chargesVal = parseMoney(inputs.additionalCharges ?? 0);
  const additionalChargesTotal = Math.max(0, chargesVal);

  // 4. Compute Total Customer Billing (Revenue)
  const totalCustomerBilling = resolvedBilling + additionalChargesTotal;

  // 5. Compute Balance Margin (Gross Profit)
  const balanceMargin = totalCustomerBilling - resolvedDriverPayout;

  // 6. Compute Margin Percentage (%)
  const marginPercent = totalCustomerBilling > 0
    ? Number(((balanceMargin / totalCustomerBilling) * 100).toFixed(1))
    : 0;

  // 7. Compute Per Month Breakdown (30-day baseline contract duty)
  const perTripBreakdown = inputs.pricingBasis === 'Per Month'
    ? Number((resolvedBilling / 30).toFixed(2))
    : resolvedBilling;

  return {
    resolvedBilling,
    resolvedDriverPayout,
    additionalChargesTotal,
    totalCustomerBilling,
    balanceMargin,
    marginPercent,
    perTripBreakdown,
  };
}
