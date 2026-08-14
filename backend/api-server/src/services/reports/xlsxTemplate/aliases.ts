import type { TripReportFieldKey } from '@mercon/shared-types';

/**
 * Header spellings a customer's own template is likely to use for each
 * TRIP_REPORT_FIELDS key, used only to produce a first-draft mapping
 * suggestion in `inspectTemplate`. The saved layout a human confirms in the
 * mapping editor is what generation actually reads — this table never runs
 * again after that point, so it can be loose without ever causing a wrong
 * export.
 *
 * Normalisation matches importUtils.ts's `normalise()` on the frontend:
 * lowercase, strip `*`, strip parenthesised unit hints, collapse punctuation
 * to spaces.
 */
export const TRIP_FIELD_ALIASES: Record<TripReportFieldKey, string[]> = {
  serial: ['s l', 'sl', 'sl no', 'serial', 'sr no', 'no', 'row'],
  ref_id: ['job', 'job no', 'ref', 'ref id', 'trip no', 'reference', 'reference no'],
  date: ['date', 'trip date', 'planned start', 'planned date', 'start date', 'scheduled date'],
  driver_name: ['driver', 'driver name', 'assigned driver', 'driver full name'],
  driver_phone: ['mobile', 'mobile number', 'driver phone', 'contact number', 'phone'],
  vehicle_plate: ['vehicle no', 'vehicle plate', 'vehicle', 'plate', 'truck plate', 'plate number'],
  vehicle_type: ['vehicle type', 'truck type', 'body type', 'asset type'],
  carrier_name: ['carrier', 'carrier 3rd party', 'carrier name', '3rd party', 'provider'],
  customer_name: ['sender', 'sender customer', 'customer', 'customer name', 'company', 'company name', 'client'],
  receiver: ['receiver', 'consignee', 'destination party'],
  origin: ['origin', 'from', 'pickup', 'pickup city', 'starting point'],
  destination: ['destination', 'to', 'dropoff', 'drop off', 'delivery city'],
  waiting_labor_charges: ['waiting labor charges', 'waiting labor', 'labor', 'waiting'],
  additional_stop_charges: ['additional stops', 'additional stop charges', 'extra stops', 'stop charges'],
  billing_amount: ['billing amount', 'amount', 'price', 'rate', 'charges'],
  total_amount: ['total amount', 'total'],
  trip_charges: ['trip charges', 'trip charge'],
  balance_amount: ['balance amount', 'balance', 'net'],
  status: ['status', 'trip status'],
};

export const normaliseHeader = (header: string): string =>
  String(header ?? '')
    .toLowerCase()
    .replace(/\*/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Best-guess field for a template header, or null if nothing matches well enough. */
export function suggestField(header: string): TripReportFieldKey | null {
  const norm = normaliseHeader(header);
  if (!norm) return null;

  for (const [field, aliases] of Object.entries(TRIP_FIELD_ALIASES) as [TripReportFieldKey, string[]][]) {
    if (aliases.includes(norm)) return field;
  }
  for (const [field, aliases] of Object.entries(TRIP_FIELD_ALIASES) as [TripReportFieldKey, string[]][]) {
    if (aliases.some((alias) => norm.includes(alias) || alias.includes(norm))) return field;
  }
  return null;
}
