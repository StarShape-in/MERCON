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
 * Known RateCard.vehicle_type values, taken from the real customer quotation
 * workbooks that get bulk-imported (see docs/templates/MERCON_RateCards_*.xlsx).
 * Not a Postgres enum — the column stays a nullable String so an unexpected
 * legacy value never breaks a deploy — but this is the list every create/edit
 * form and every rate-lookup filter should validate against.
 */
export const VEHICLE_TYPES = [
  '6.5M-10TON',
  '5 TON',
  '10 TON',
  '5M-5TON',
  '13.5M-20TON',
  '3TON/4TON',
  'DYNA 3 TON',
  'LORRY',
  '40 FEET',
] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

/**
 * Known RateCard.rate_category values, same provenance as VEHICLE_TYPES.
 * Mixes trip-type ("Trip", "Trip/Round Trip") with billing-frequency
 * ("Monthly Round", "Daily Local") because that's how customers actually
 * quote lanes — not a clean one-dimensional enum, so don't try to split it.
 */
export const RATE_CATEGORIES = [
  'Trip',
  'Trip/Round Trip',
  'Monthly Round',
  'Extra Trip/Round Trip',
  'Daily Local',
  'Airport',
  'Surcharge',
  'Regular Trip',
  'Monthly (ROUND TRIP, 2 vehicles)',
] as const;
export type RateCategory = (typeof RATE_CATEGORIES)[number];

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
 * Core modules (auth, trips, drivers, vehicles, customers, settings) are
 * always available and are not listed here — only the toggleable ones.
 */
export const MODULE_KEYS = [
  'invoices',
  'expenses',
  'maintenance',
  'reports',
  'rate-cards',
  'documents',
  'locations',
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
  { key: 'waiting_labor_charges', label: 'Waiting / labor', type: 'money' },
  { key: 'additional_stop_charges', label: 'Additional stops', type: 'money' },
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
