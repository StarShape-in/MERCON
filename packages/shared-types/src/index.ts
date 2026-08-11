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
}

// ─── API envelope ────────────────────────────────────────────────
/** Standard response wrapper returned by the API (`res.json({ data })`). */
export interface ApiResponse<T> {
  data: T;
  message?: string;
  error?: string;
}
