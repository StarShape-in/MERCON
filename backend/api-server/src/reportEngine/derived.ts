// Canonical derived-value definitions shared by the vehicle/fleet financials
// endpoints and the report builder query engine, so numbers agree everywhere.

// Accepts a Prisma.Decimal too, not just `number | null` — billing_amount,
// trip_charges and total_amount are all Decimal columns at runtime. Callers
// pass Prisma rows straight through rather than pre-converting, so tripIncome
// does the Number() conversion itself, once, rather than depending on every
// call site to have remembered to.
type Money = number | { toNumber(): number } | null | undefined;

export interface TripIncomeInput {
  billing_amount: Money;
  trip_charges: Money;
  invoices?: { total_amount: Money }[];
}

const asNumber = (v: Money): number => (v == null ? 0 : typeof v === 'number' ? v : v.toNumber());

/**
 * Revenue recognised for a trip. Falls back down the chain because older trips
 * were captured before invoicing existed: explicit billing amount wins, then the
 * issued invoice total, then the quoted trip charges.
 *
 * `invoices` may be absent — the report engine only includes the `invoices`
 * relation on a trips fetch when the query spec actually references it, so
 * this must not assume the array is always populated.
 */
export const tripIncome = (t: TripIncomeInput): number => {
  const billing = asNumber(t.billing_amount);
  if (billing > 0) return billing;
  const invoiceTotal = asNumber(t.invoices?.[0]?.total_amount);
  if (invoiceTotal > 0) return invoiceTotal;
  return asNumber(t.trip_charges);
};

/** Only completed/invoiced trips count as earned revenue. */
export const isEarned = (status: string): boolean => status === 'Completed' || status === 'Invoiced';
