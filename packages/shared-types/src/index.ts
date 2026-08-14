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
] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];

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
