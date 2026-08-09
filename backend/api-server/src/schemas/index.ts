import { z } from 'zod';

/* ─── Shared building blocks ─────────────────────────────────────────────── */

/** A required, trimmed, non-empty string. */
const nonEmpty = (label = 'Value') => z.string().trim().min(1, `${label} is required`);

/** Route param `:id` must be a UUID. */
export const idParam = z.object({ id: z.string().uuid('Invalid id') });

/** List query — pagination + search + sort. Coerces and guards against NaN. */
export const listQuery = z.object({
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().positive().max(5000).default(20),
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
  driver_id: z.string().uuid('Invalid driver').optional(),
  vehicle_id: z.string().uuid('Invalid vehicle').optional(),
  planned_start: z.coerce.date().optional(),
  billing_amount: z.coerce.number().optional(),
  trip_charges: z.coerce.number().optional(),
  // The rate card the dispatcher was shown. Recorded on the trip so invoicing
  // bills what was quoted instead of re-deriving it later.
  rate_card_id: z.string().uuid('Invalid rate card').optional(),
  stops: z.array(z.object({
    stop_type: z.enum(['Pickup', 'Dropoff', 'Rest', 'Refuel']),
    // Client + controller use lat/lng (controller reads stop.lat/stop.lng), not location_*.
    lat: z.coerce.number(),
    lng: z.coerce.number(),
    planned_arrival: z.string().optional(),
    // Human-readable name for this place — the route label in delay reports.
    location_name: z.string().trim().max(120).optional(),
    // Full postal address, handed to the driver's app so they can actually find
    // the place. Longer cap than the name: this is a whole address, not a label.
    location_address: z.string().trim().max(500).optional(),
    // The lane endpoint this stop sits in ("Riyadh"), as opposed to the exact
    // yard within it that location_name/lat/lng describe. This is what the rate
    // card is priced against.
    location_id: z.string().uuid('Invalid location').optional(),
    stop_sequence: z.number().int().optional(),
  })).min(2, 'At least a pickup and a dropoff are required'),
});

/** Correcting a stop after the trip exists — every field optional, since the
 *  usual case is fixing one wrong address and nothing else. */
export const updateTripStopBody = z.object({
  location_name: z.string().trim().max(120).optional(),
  location_address: z.string().trim().max(500).optional(),
  location_id: z.string().uuid('Invalid location').nullable().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
});

/* ─── Fleet bulk import ───────────────────────────────────────────────────── */

/** Drivers workbook — one driver per row. Columns are mapped to these names by
 *  the client before posting; see docs/MERCON_Fleet_Import_Guide.md.
 *
 *  `phone_primary` is the upsert key: it is the only unique column on Driver
 *  (license_number is not unique in the schema), so re-importing a corrected
 *  workbook updates people rather than duplicating them. */
export const bulkImportDriversBody = z.object({
  rows: z.array(z.object({
    ref_id: z.string().trim().max(64).optional(),
    first_name: nonEmpty('First name'),
    last_name: nonEmpty('Last name'),
    phone_primary: nonEmpty('Primary phone'),
    license_number: nonEmpty('License number'),
    license_expiry: z.string().trim().min(1, 'License expiry is required'),
    assigned_vehicle_plate: z.string().trim().max(32).optional(),
  })).min(1, 'The file has no rows to import').max(1000, 'Import at most 1000 rows at a time'),
});

/** Vehicles workbook — one vehicle per row, upserted on `plate_number`. */
export const bulkImportVehiclesBody = z.object({
  rows: z.array(z.object({
    ref_id: z.string().trim().max(64).optional(),
    plate_number: nonEmpty('Plate number'),
    asset_type: z.enum(['Flatbed', 'Reefer', 'Box', 'Tanker'], {
      message: 'Asset type must be Flatbed, Reefer, Box or Tanker',
    }),
    capacity_kg: z.coerce.number().int().positive('Capacity must be a positive whole number'),
    current_odometer: z.coerce.number().min(0).optional(),
    icces_device_id: z.string().trim().max(64).optional(),
    trailer_number: z.string().trim().max(64).optional(),
    trailer_type: z.enum(['Flatbed', 'Reefer', 'Box', 'Tanker']).optional(),
    trailer_capacity_kg: z.coerce.number().int().positive().optional(),
    assigned_driver: z.string().trim().max(120).optional(),
  })).min(1, 'The file has no rows to import').max(1000, 'Import at most 1000 rows at a time'),
});

/** Bulk CSV import — one trip per row, matched to existing customers/drivers/
 *  vehicles by name/plate rather than id (the CSV can't know internal ids).
 *  No stops: imported trips land in Draft/Dispatched with route stops added
 *  later through the normal trip edit UI. */
export const bulkImportTripsBody = z.object({
  rows: z.array(z.object({
    customer_name: nonEmpty('Customer name'),
    driver_name: z.string().trim().optional(),
    vehicle_plate: z.string().trim().optional(),
    planned_start: z.string().trim().optional(),
  })).min(1, 'At least one row is required').max(500, 'Import is limited to 500 rows at a time'),
});

/** Operator logging why a stop was reached late. Reason is required — the
 *  whole point is replacing "no explanation" with one, and `Other` plus a note
 *  already covers anything the list misses. */
export const logStopDelayBody = z.object({
  delay_reason: z.enum([
    'Traffic', 'VehicleBreakdown', 'CustomerNotReady', 'SlowLoadingUnloading',
    'Weather', 'Documentation', 'RouteBlocked', 'Other',
  ]),
  delay_note: z.string().trim().max(500).optional(),
});

/* ─── Drivers ────────────────────────────────────────────────────────────── */
export const createDriverBody = z.object({
  first_name: nonEmpty('First name'),
  last_name: nonEmpty('Last name'),
  phone_primary: nonEmpty('Phone number'),
  license_number: nonEmpty('License number'),
  license_expiry: z.coerce.date(),
  assigned_vehicle_id: z.string().uuid().nullable().optional(),
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
  assigned_vehicle_id: z.string().uuid().nullable().optional(),
});

/* ─── Customers ──────────────────────────────────────────────────────────── */
export const createCustomerBody = z.object({
  name: nonEmpty('Customer name'),
  contact_phone: nonEmpty('Contact phone'),
  credit_limit: z.coerce.number().nonnegative().optional(),
});

export const updateCustomerBody = z.object({
  name: nonEmpty('Customer name').optional(),
  contact_phone: nonEmpty('Contact phone').optional(),
  credit_limit: z.coerce.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
});

/* ─── Vehicles ───────────────────────────────────────────────────────────── */
export const createVehicleBody = z.object({
  plate_number: nonEmpty('Plate number'),
  asset_type: z.enum(['Flatbed', 'Reefer', 'Box', 'Tanker']),
  capacity_kg: z.coerce.number().int().positive('Capacity must be a whole number of kg'),
  trailer_number: z.string().trim().optional(),
  trailer_type: z.enum(['Flatbed', 'Reefer', 'Box', 'Tanker']).optional(),
  trailer_capacity_kg: z.coerce.number().int().positive().optional(),
  gps_device_id: z.string().trim().optional(),
  icces_device_id: z.string().trim().optional(),
});

export const updateVehicleBody = z.object({
  plate_number: nonEmpty('Plate number').optional(),
  asset_type: z.enum(['Flatbed', 'Reefer', 'Box', 'Tanker']).optional(),
  capacity_kg: z.coerce.number().int().positive().optional(),
  trailer_number: z.string().trim().optional(),
  trailer_type: z.enum(['Flatbed', 'Reefer', 'Box', 'Tanker']).optional(),
  trailer_capacity_kg: z.coerce.number().int().positive().optional(),
  gps_device_id: z.string().trim().optional(),
  icces_device_id: z.string().trim().optional(),
  status: z.enum(['Available', 'OnTrip', 'Maintenance', 'Inactive']).optional(),
});

/* ─── Users (Admin-only web dashboard accounts) ─────────────────────────────
 * Only Admin/Operator are creatable here — Driver accounts are managed
 * through the Drivers module, never through User Management. See
 * CLAUDE.md "Roles" and "Who uses which app".
 */
const webUserRole = z.enum(['Admin', 'Operator']);

export const createUserBody = z.object({
  name: nonEmpty('Name'),
  email: z.string().trim().email('A valid email is required'),
  role: webUserRole,
  password: nonEmpty('Password'),
});

export const updateUserBody = z.object({
  name: nonEmpty('Name').optional(),
  email: z.string().trim().email('A valid email is required').optional(),
  role: webUserRole.optional(),
  status: z.enum(['Active', 'Inactive']).optional(),
  password: nonEmpty('Password').optional(),
});

/* ─── Invoices ───────────────────────────────────────────────────────────── */
export const createInvoiceBody = z.object({
  trip_id: z.string().uuid('A valid trip is required'),
  customer_id: z.string().uuid('A valid customer is required'),
  subtotal: z.coerce.number().nonnegative(),
  total_amount: z.coerce.number().nonnegative(),
  due_date: z.coerce.date(),
});
