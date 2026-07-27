import { z } from 'zod';

/* ─── Shared building blocks ─────────────────────────────────────────────── */

/** A required, trimmed, non-empty string. */
const nonEmpty = (label = 'Value') => z.string().trim().min(1, `${label} is required`);

/** Route param `:id` must be a UUID. */
export const idParam = z.object({ id: z.string().uuid('Invalid id') });

/** List query — pagination + search + sort. Coerces and guards against NaN. */
export const listQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(200).default(20),
  search: z.string().trim().optional(),
  sort_by: z.string().trim().optional(),
  sort_dir: z.enum(['asc', 'desc']).default('desc'),
  status: z.string().trim().optional(),
  customer_id: z.string().uuid().optional(),
}).passthrough();

/* ─── Auth ───────────────────────────────────────────────────────────────── */
export const loginBody = z.object({
  username: nonEmpty('Username'),
  password: nonEmpty('Password'),
});

/* ─── Trips ──────────────────────────────────────────────────────────────── */
export const createTripBody = z.object({
  customer_id: z.string().uuid('A valid customer is required'),
  driver_id: z.string().uuid().optional(),
  vehicle_id: z.string().uuid().optional(),
  cargo_type: nonEmpty('Cargo type'),
  hazmat_flag: z.boolean().optional(),
  planned_start: z.coerce.date().optional(),
  stops: z.array(z.object({
    stop_type: z.enum(['Pickup', 'Dropoff', 'Rest', 'Refuel']),
    // Client + controller use lat/lng (controller reads stop.lat/stop.lng), not location_*.
    lat: z.coerce.number(),
    lng: z.coerce.number(),
    planned_arrival: z.string().optional(),
    stop_sequence: z.number().int().optional(),
  })).min(2, 'At least a pickup and a dropoff are required'),
});

/* ─── Drivers ────────────────────────────────────────────────────────────── */
export const createDriverBody = z.object({
  first_name: nonEmpty('First name'),
  last_name: nonEmpty('Last name'),
  phone_primary: nonEmpty('Phone number'),
  license_number: nonEmpty('License number'),
  license_expiry: z.coerce.date(),
});

// Partial update: every field optional, unknown keys stripped, and
// license_expiry coerced to a real Date (Prisma rejects bare date strings).
export const updateDriverBody = z.object({
  first_name: nonEmpty('First name').optional(),
  last_name: nonEmpty('Last name').optional(),
  phone_primary: nonEmpty('Phone number').optional(),
  license_number: nonEmpty('License number').optional(),
  license_expiry: z.coerce.date().optional(),
  status: z.enum(['Available', 'OnTrip', 'OffDuty', 'Inactive']).optional(),
});

/* ─── Vehicles ───────────────────────────────────────────────────────────── */
export const createVehicleBody = z.object({
  plate_number: nonEmpty('Plate number'),
  asset_type: z.enum(['Flatbed', 'Reefer', 'Box', 'Tanker']),
  capacity_kg: z.coerce.number().positive().optional(),
  trailer_number: z.string().trim().optional(),
  trailer_type: z.enum(['Flatbed', 'Reefer', 'Box', 'Tanker']).optional(),
  trailer_capacity_kg: z.coerce.number().positive().optional(),
  gps_device_id: z.string().trim().optional(),
  icces_device_id: z.string().trim().optional(),
});

/* ─── Invoices ───────────────────────────────────────────────────────────── */
export const createInvoiceBody = z.object({
  trip_id: z.string().uuid('A valid trip is required'),
  customer_id: z.string().uuid('A valid customer is required'),
  subtotal: z.coerce.number().nonnegative(),
  total_amount: z.coerce.number().nonnegative(),
  due_date: z.coerce.date(),
});
