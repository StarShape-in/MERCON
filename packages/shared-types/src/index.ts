/**
 * @mercon/shared-types
 * Canonical DTOs and enums shared between the API server and the web dashboard.
 * Import via: import type { User, ApiResponse } from '@mercon/shared-types';
 */

// ─── Enums / unions ──────────────────────────────────────────────
/** Mirrors the Prisma `Role` enum in backend/api-server/prisma/schema.prisma */
export type UserRole = 'Admin' | 'Operator' | 'Driver';
export type UserStatus = 'Active' | 'Inactive';

/**
 * The owner-set tonnage tiers every rate card / trip should be filed under.
 * Not a Postgres enum — the column stays a nullable String, and both the
 * create/edit form and the bulk importer offer a "Custom" free-text escape
 * hatch for anything that doesn't fit one of these — but this is the list
 * offered by default. Superseded the old per-carrier list scraped straight
 * from the quotation workbooks ('6.5M-10TON', '5M-5TON', '13.5M-20TON',
 * '3TON/4TON', 'DYNA 3 TON', 'LORRY'), which mixed several carriers' own
 * wording for the same handful of real tonnage classes.
 */
export const VEHICLE_TYPES = [
  '3-4 TON',
  '3TON/4TON',
  '5 TON',
  '10 TON',
  '20 TON',
  '40 FEET',
] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

/**
 * The owner-set trip shapes every rate card / trip should be filed under.
 * Not a Postgres enum, same reasoning as VEHICLE_TYPES — "Custom" is a
 * free-text escape hatch, not a literal value stored here. Superseded the
 * old list ('Trip', 'Trip/Round Trip', 'Monthly Round', 'Extra Trip/Round
 * Trip', 'Daily Local', 'Airport', 'Regular Trip', 'Monthly (ROUND TRIP, 2
 * vehicles)'), which conflated trip shape with billing frequency — that
 * second dimension now lives in BILLING_TYPES instead.
 */
export const RATE_CATEGORIES = [
  'Single Trip',
  '10 Hrs Duty',
  '12 Hrs Duty',
  'Round Trip',
] as const;
export type RateCategory = (typeof RATE_CATEGORIES)[number];

/**
 * How a rate card / trip is billed, independent of RATE_CATEGORIES' trip
 * shape — a lane can be a one-off "Extra" job or a "Monthly" standing
 * commitment at either Single Trip or Round Trip shape (this is exactly
 * what JDL's "Monthly Round" and IMILE's "Extra Trip/Round Trip" quotation
 * sections used to conflate into rate_category before this field existed).
 * Free text with a "Custom" escape hatch, same as RATE_CATEGORIES.
 */
export const BILLING_TYPES = [
  'Monthly',
  'Extra',
] as const;
export type BillingType = (typeof BILLING_TYPES)[number];

/**
 * Suggested SurchargeRule.charge_type values — names only, no rates. Not a
 * Postgres enum (the column is free text, same reasoning as VEHICLE_TYPES),
 * and NOT seeded into the database: these exist purely so the charge-type
 * combobox has something to offer before any real SurchargeRule has been
 * saved, without inventing priced data. Taken from the fee types actually
 * named across the real customer quotation workbooks (AKS, HORIZON, etc.) —
 * every customer's real rate for each of these is still pending confirmation.
 */
export const SUGGESTED_CHARGE_TYPES = [
  'Additional Stop',
  'Waiting / Labor',
  'Labour Charge',
  'Offloading Charge',
  'Same-Day Delivery',
  'Trolley Fee',
] as const;

/**
 * Which unit each SUGGESTED_CHARGE_TYPES entry naturally goes with — picking
 * "Additional Stop" should offer "per stop" without a separate click. Applies
 * only to the suggested pairing; the unit field stays freely editable
 * afterward for anything a real customer prices differently.
 */
export const SUGGESTED_UNIT_BY_CHARGE_TYPE: Record<(typeof SUGGESTED_CHARGE_TYPES)[number], string> = {
  'Additional Stop': 'per stop',
  'Waiting / Labor': 'per hour',
  'Labour Charge': 'per person',
  'Offloading Charge': 'per vehicle',
  'Same-Day Delivery': 'per delivery',
  'Trolley Fee': 'flat',
};

/** Suggested SurchargeRule.unit values — display labels only, same reasoning as above. */
export const SUGGESTED_CHARGE_UNITS = [
  'per stop',
  'per hour',
  'per person',
  'per delivery',
  'per vehicle',
  'flat',
] as const;

/**
 * Suggested Expense.category values. Not a Postgres enum — the column stays a
 * free-text String so a category typed once outside this list never breaks a
 * deploy — but this is the list the create/edit form offers by default.
 */
export const EXPENSE_CATEGORIES = [
  'Salary',
  'Salary Advance',
  'Fuel',
  'Toll & Parking',
  'Rent',
  'Utilities',
  'Office Supplies',
  'Insurance',
  'Vehicle Maintenance',
  'Government Fees',
  'Other',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/** Suggested Expense.payment_method values (free-text column, same reasoning as above). */
export const EXPENSE_PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Cheque', 'Card'] as const;
export type ExpensePaymentMethod = (typeof EXPENSE_PAYMENT_METHODS)[number];

/**
 * Optional modules a deployment's superadmin can toggle via Settings.
 * Core modules (auth, trips, drivers, vehicles, customers, settings,
 * locations, rate-cards) are always available and are not listed here —
 * locations/rate-cards were considered toggleable at first but are actually
 * infrastructure trip creation depends on (locations are auto-created by
 * trip creation; rate cards drive pricing), so they were moved to core.
 */
export const MODULE_KEYS = [
  'invoices',
  'expenses',
  'maintenance',
  'reports',
  'documents',
  'recycle-bin',
  'company-reports',
] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];

/**
 * Canonical fields a company-specific Excel report template's columns can be
 * mapped to. Source of truth for both the mapping-editor UI dropdown and the
 * backend row resolver (services/reports/xlsxTemplate/tripReportData.ts) —
 * keep both in sync with this list instead of hardcoding field names.
 */
export const TRIP_REPORT_FIELDS = [
  { key: 'serial', label: 'Row number', type: 'number' },
  { key: 'ref_id', label: 'Trip / Job No.', type: 'string' },
  { key: 'date', label: 'Trip date', type: 'date' },
  { key: 'driver_name', label: 'Driver name', type: 'string' },
  { key: 'driver_phone', label: 'Driver mobile', type: 'string' },
  { key: 'vehicle_plate', label: 'Vehicle plate', type: 'string' },
  { key: 'vehicle_type', label: 'Vehicle type', type: 'string' },
  { key: 'carrier_name', label: 'Carrier / 3rd party', type: 'string' },
  { key: 'customer_name', label: 'Customer / sender', type: 'string' },
  { key: 'receiver', label: 'Receiver / consignee', type: 'string' },
  { key: 'origin', label: 'Pickup location', type: 'string' },
  { key: 'destination', label: 'Dropoff location', type: 'string' },
  { key: 'total_charges', label: 'Extra charges (waiting, stops, etc.)', type: 'money' },
  { key: 'billing_amount', label: 'Billing amount', type: 'money' },
  { key: 'total_amount', label: 'Total amount', type: 'money' },
  { key: 'trip_charges', label: 'Trip charges', type: 'money' },
  { key: 'balance_amount', label: 'Balance amount', type: 'money' },
  { key: 'status', label: 'Trip status', type: 'string' },
  { key: 'rate_category', label: 'Rate category', type: 'string' },
] as const;
export type TripReportFieldKey = (typeof TRIP_REPORT_FIELDS)[number]['key'];

/**
 * A confirmed mapping between an uploaded company template's Excel columns
 * and MERCON data. Auto-detection produces a first draft; a human confirms
 * it once via the mapping editor, and this saved layout — not a re-guess —
 * is what report generation reads (see ReportTemplate.layout in schema.prisma).
 */
export interface TemplateLayout {
  sheetName: string;
  headerRowIdx: number; // 1-based
  dataStartRow: number; // 1-based; first row of the style band
  /**
   * 1-based, inclusive. The last row of the template's sample data block —
   * everything in [dataStartRow, dataEndRow] is replaced by generated rows,
   * and anything below it (a totals row, notes, signature block) is kept and
   * shifted. Without this the customer's own sample rows survive underneath
   * the real data in the generated report.
   */
  dataEndRow: number;
  bandSize: number; // 1 = uniform rows, 2 = striped, N = repeating block
  columns: Array<{
    colIndex: number; // 1-based
    headerText: string; // for display only
    source:
      | { kind: 'field'; key: TripReportFieldKey }
      | { kind: 'const'; value: string }
      | { kind: 'formula' } // keep the template's own formula, row-shifted
      | { kind: 'blank' };
  }>;
  tokens?: Record<string, string>;
}

// ─── Domain entities ─────────────────────────────────────────────
export interface User {
  id: string;
  name?: string;
  username: string;
  email?: string;
  phone?: string;
  role: UserRole;
  status?: UserStatus;
  lastLogin?: string;
  isSuperAdmin?: boolean;
}

/** This deployment's branding + module config. Singleton — one row per client database. */
export interface Settings {
  id: string;
  appName: string;
  companyLegalName: string;
  logoUrl?: string | null;
  primaryColor: string;
  enabledModules: ModuleKey[];
  updatedAt: string;
}

/** Subset returned by the unauthenticated GET /settings/public endpoint. */
export type PublicSettings = Pick<Settings, 'appName' | 'logoUrl' | 'primaryColor'>;

// ─── API envelope ────────────────────────────────────────────────
/** Standard response wrapper returned by the API (`res.json({ data })`). */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}
