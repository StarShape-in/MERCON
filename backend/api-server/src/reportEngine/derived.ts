// Canonical derived-value definitions shared by the vehicle/fleet financials
// endpoints and the report builder query engine, so numbers agree everywhere.

export interface TripIncomeInput {
  billing_amount: number | null;
  trip_charges: number | null;
  invoices?: { total_amount: number | null }[];
}

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
  const invoice = t.invoices?.[0];
  if (t.billing_amount && t.billing_amount > 0) return t.billing_amount;
  if (invoice?.total_amount && invoice.total_amount > 0) return invoice.total_amount;
  return t.trip_charges || 0;
};

/** Only completed/invoiced trips count as earned revenue. */
export const isEarned = (status: string): boolean => status === 'Completed' || status === 'Invoiced';
