/**
 * tripExportController.ts
 *
 * Dedicated streaming export endpoint for trips.  All eight export types are
 * handled here so that:
 *
 *   1. There is no hard cap on rows (no silent 1,000 / 2,000 truncation).
 *      Rows are fetched in internal pages of BATCH_SIZE and written to the
 *      response stream immediately.
 *
 *   2. Filtering (status, search, date range, driver, vehicle, customer) is
 *      applied at the database level.
 *
 *   3. Date boundaries are timezone-safe, using the deployment's configured
 *      timezone from Settings.timezone (default "Asia/Riyadh").
 *
 *   4. Table pagination has zero effect on the export.
 *
 *   5. Only fields required by each export format are fetched.
 *
 * Existing business logic (financial helpers, payload-capacity, ETA, stop
 * location resolution, search-field definitions) is reused — no duplication.
 */

import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { Prisma, TripStatus } from '@prisma/client';
import { prisma } from '../index';
import { logger } from '../utils/logger';
import { buildSearchAnd } from '../utils/search';
import {
  computeTripChargesTotal,
  computeTripBaseBilling,
  computeTripBalance,
} from '../utils/tripFinancials';

// ─── Constants ────────────────────────────────────────────────────────────────

const BATCH_SIZE = 1_000;
const FALLBACK_TZ = 'Asia/Riyadh';

/** Same search fields as the regular trip ledger in tripController.ts. */
const TRIP_SEARCH_FIELDS = [
  'ref_id',
  'customer.name',
  'driver.first_name',
  'driver.last_name',
  'driver.ref_id',
  'vehicle.plate_number',
  'vehicle.ref_id',
  'thirdPartyProvider.name',
  'third_party_driver_name',
  'third_party_vehicle_plate',
  'quotation.name',
  'stops[].location_name',
  'stops[].location_address',
  'stops[].location.name',
  'stops[].location.city',
  'stops[].location.state',
  'stops[].location.address',
];

// ─── Delay reason labels (mirrors frontend DELAY_REASON_LABELS) ───────────────
const DELAY_REASON_LABELS: Record<string, string> = {
  Traffic: 'Traffic',
  VehicleBreakdown: 'Vehicle breakdown',
  CustomerNotReady: 'Customer not ready',
  SlowLoadingUnloading: 'Slow loading / unloading',
  Weather: 'Weather',
  Documentation: 'Documentation',
  RouteBlocked: 'Route blocked',
  Other: 'Other',
};

// ─── Timezone-safe date boundaries ───────────────────────────────────────────

/**
 * Converts a YYYY-MM-DD string (interpreted in the given IANA timezone) to
 * the UTC Date representing midnight or 23:59:59.999 of that calendar day.
 *
 * Uses Intl.DateTimeFormat.formatToParts — no external library required and
 * result is independent of the Node process timezone.
 */
function localDateToUtc(dateStr: string, tz: string, endOfDay: boolean): Date {
  const time = endOfDay ? '23:59:59' : '00:00:00';
  // Probe: treat the string as UTC so we can ask Intl what time it is in `tz`
  const probe = new Date(`${dateStr}T${time}Z`);

  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts: Record<string, number> = {};
  for (const p of fmt.formatToParts(probe)) {
    if (p.type !== 'literal') parts[p.type] = parseInt(p.value, 10);
  }

  // Re-express the tz wall-clock values as a UTC epoch
  const tzMs = Date.UTC(
    parts['year'],
    parts['month'] - 1,
    parts['day'],
    parts['hour'],
    parts['minute'],
    parts['second'],
  );

  // offsetMs = how many ms tz is ahead of UTC at this moment
  const offsetMs = tzMs - probe.getTime();

  // Actual UTC instant = wall-clock midnight-in-tz expressed in UTC
  const result = new Date(probe.getTime() - offsetMs);
  if (endOfDay) result.setUTCMilliseconds(999);
  return result;
}

// ─── Date formatting ──────────────────────────────────────────────────────────

function formatDate(val: Date | string | null | undefined, tz: string): string {
  if (!val) return '';
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(typeof val === 'string' ? new Date(val) : val);
  } catch {
    return '';
  }
}

// ─── Stop / location helpers ──────────────────────────────────────────────────

type StopLike = {
  stop_type: string;
  location_name: string | null;
  location_address: string | null;
  location_lat: number;
  location_lng: number;
  delay_reason?: string | null;
};

function stopLabel(s: StopLike): string {
  return (
    s.location_name ||
    s.location_address ||
    (s.location_lat ? `${s.location_lat.toFixed(3)}, ${s.location_lng.toFixed(3)}` : '\u2014')
  );
}

function getPickupLabel(stops: StopLike[]): string {
  const s = stops.find((x) => x.stop_type === 'Pickup') ?? stops[0];
  return s ? stopLabel(s) : '\u2014';
}

function getDropoffLabel(stops: StopLike[]): string {
  const s =
    stops.find((x) => x.stop_type === 'Dropoff') ??
    (stops.length > 1 ? stops[stops.length - 1] : undefined);
  return s ? stopLabel(s).replace(/\uD83D\uDD01\s*/g, '').trim() : '\u2014';
}

function getFirstDelayReason(stops: StopLike[]): string {
  const s = stops.find((x) => x.delay_reason);
  if (!s?.delay_reason) return '';
  return DELAY_REASON_LABELS[s.delay_reason] ?? s.delay_reason;
}

// ─── Payload capacity (mirrors frontend getTripPayloadCapacity) ───────────────

function getPayloadCapacity(t: any): string {
  if (t.vehicle_type) return t.vehicle_type;
  if (t.quotation?.source_vehicle_label || t.quotation?.vehicle_class) return t.quotation.source_vehicle_label || t.quotation.vehicle_class;
  if (t.third_party_vehicle_type) return t.third_party_vehicle_type;
  if (t.vehicle?.capacity_kg) {
    const tons = t.vehicle.capacity_kg / 1000;
    return `${tons % 1 === 0 ? tons.toFixed(0) : tons.toFixed(1)} Tons`;
  }
  return '\u2014';
}

// ─── Rate category (mirrors frontend getTripRateCategory) ────────────────────

function getRateCategory(t: any): string {
  return t.rate_category || t.quotation?.line_type || '\u2014';
}

// ─── Display label helpers ────────────────────────────────────────────────────

function getDriverLabel(t: any): string {
  if (t.is_third_party) {
    return t.third_party_driver_name
      ? `${t.third_party_driver_name} (${t.thirdPartyProvider?.name ?? '3PL'})`
      : (t.thirdPartyProvider?.name ?? '3PL Driver');
  }
  return t.driver ? `${t.driver.first_name} ${t.driver.last_name}` : 'Unassigned';
}

function getDriverPhone(t: any): string {
  if (t.is_third_party) return t.third_party_driver_phone ?? '';
  return t.driver?.phone_primary ?? '';
}

function getVehicleLabel(t: any): string {
  if (t.is_third_party) return t.third_party_vehicle_plate ?? '3PL Vehicle';
  return t.vehicle?.plate_number ?? 'Unassigned';
}

function getCarrierLabel(t: any): string {
  if (t.is_third_party) {
    return t.thirdPartyProvider?.name ?? t.carrier_name ?? '3PL Provider';
  }
  return t.carrier_name ?? 'MERCON LOGISTICS';
}

// ─── Column headers per export type ──────────────────────────────────────────

function getHeaders(type: string): string[] {
  switch (type) {
    case 'completed':
      return [
        'Date', 'Driver', 'Number', 'Vehicle', 'Type',
        'From', 'To', 'Waiting Charge', 'Additional Charge',
        'Total Charge', 'Balance', 'Customer Name',
      ];
    case 'loading':
      return ['Date', 'Driver', 'Phone Number', 'Vehicle', 'Loading Location', 'Destination', 'ETA', 'Ton'];
    case 'in-transit':
      return [
        'Date', 'Driver', 'Phone Number', 'Vehicle',
        'Planned Time', 'Actual Start', 'Estimated Arrival Time',
        'Pick Up', 'Drop Up', 'Customer', 'Ton (Type)',
      ];
    case 'delayed':
      return [
        'Date', 'Driver', 'Driver Phone Number', 'Vehicle',
        'Planned Time', 'Actual Time', 'Delayed', 'Customer', 'Type',
      ];
    default:
      // all / 3pl / date-range — existing 17-column business-approved format
      return [
        'Job / Ref ID', 'Status', 'Customer', 'Pickup Location', 'Dropoff Location',
        'Driver', 'Vehicle', 'Payload Capacity', 'Rate Category', 'Quotation',
        'Planned Start', 'Actual Start', 'Planned End', 'Actual End',
        'Driver Charge (SAR)', 'Billing Rate (SAR)', 'Carrier / Provider',
      ];
  }
}

// ─── Row mapper per export type ───────────────────────────────────────────────

function mapRow(type: string, t: any, tz: string): (string | number)[] {
  const stops: StopLike[] = t.stops ?? [];
  const tripDate = t.planned_start || t.actual_start || t.createdAt;

  switch (type) {
    case 'completed': {
      const chargesArr = t.charges ?? [];
      const chargesTotal = computeTripChargesTotal(chargesArr);
      const baseBilling = computeTripBaseBilling(t);
      const totalAmt = baseBilling + chargesTotal;
      const balance = computeTripBalance(t, chargesArr);

      let waitingCharge = 0;
      let additionalCharge = 0;

      if (chargesArr.length > 0) {
        for (const c of chargesArr) {
          const ct = (c.charge_type || '').toLowerCase();
          const amt = typeof c.amount === 'number' ? c.amount : (c.amount?.toNumber?.() ?? Number(c.amount ?? 0));
          if (ct.includes('waiting') || ct.includes('labor') || ct.includes('labour') || ct.includes('detention')) {
            waitingCharge += amt;
          } else if (ct.includes('additional') || ct.includes('stop') || ct.includes('extra')) {
            additionalCharge += amt;
          }
        }
      } else {
        waitingCharge = Number(t.waiting_labor_charges ?? 0);
        additionalCharge = Number(t.additional_stop_charges ?? 0);
      }

      return [
        formatDate(tripDate, tz),
        getDriverLabel(t),
        t.ref_id ?? '',
        getVehicleLabel(t),
        getPayloadCapacity(t),
        getPickupLabel(stops),
        getDropoffLabel(stops),
        waitingCharge,
        additionalCharge,
        totalAmt,
        balance,
        t.customer?.name ?? '',
      ];
    }

    case 'loading':
      return [
        formatDate(tripDate, tz),
        getDriverLabel(t),
        getDriverPhone(t),
        getVehicleLabel(t),
        getPickupLabel(stops),
        getDropoffLabel(stops),
        formatDate(t.planned_end, tz), // ETA = planned_end (same as TripDetailsPage)
        getPayloadCapacity(t),
      ];

    case 'in-transit':
      return [
        formatDate(tripDate, tz),
        getDriverLabel(t),
        getDriverPhone(t),
        getVehicleLabel(t),
        formatDate(t.planned_start, tz),
        formatDate(t.actual_start, tz),
        formatDate(t.planned_end, tz), // Estimated Arrival Time = planned_end
        getPickupLabel(stops),
        getDropoffLabel(stops),
        t.customer?.name ?? '',
        getPayloadCapacity(t),
      ];

    case 'delayed':
      return [
        formatDate(tripDate, tz),
        getDriverLabel(t),
        getDriverPhone(t),
        getVehicleLabel(t),
        formatDate(t.planned_start, tz),
        formatDate(t.actual_start, tz),
        getFirstDelayReason(stops),
        t.customer?.name ?? '',
        getPayloadCapacity(t),
      ];

    default: {
      // 17-column existing format preserved for all / 3pl / date-range
      return [
        t.ref_id ?? '',
        t.status ?? '',
        t.customer?.name ?? 'Unassigned',
        getPickupLabel(stops),
        getDropoffLabel(stops),
        getDriverLabel(t),
        getVehicleLabel(t),
        getPayloadCapacity(t),
        getRateCategory(t),
        t.quotation?.name ?? 'Manual Rate',
        formatDate(t.planned_start, tz),
        formatDate(t.actual_start, tz),
        formatDate(t.planned_end, tz),
        formatDate(t.actual_end, tz),
        Number(t.trip_charges ?? 0),
        Number(t.billing_amount ?? t.quotation?.rate ?? 0),
        getCarrierLabel(t),
      ];
    }
  }
}

// ─── Prisma include per export type ──────────────────────────────────────────

function getInclude(type: string): Prisma.TripInclude {
  const stopsSelect = {
    orderBy: { stop_sequence: 'asc' as const },
    select: {
      stop_type: true,
      stop_sequence: true,
      location_name: true,
      location_address: true,
      location_lat: true,
      location_lng: true,
      delay_reason: true,
    },
  };

  const base: Prisma.TripInclude = {
    driver: { select: { first_name: true, last_name: true, phone_primary: true, ref_id: true } },
    vehicle: { select: { plate_number: true, capacity_kg: true, asset_type: true } },
    customer: { select: { name: true } },
    thirdPartyProvider: { select: { name: true } },
    stops: stopsSelect,
    quotation: { select: { name: true, source_vehicle_label: true, vehicle_class: true, line_type: true, rate: true } },
  };

  if (type === 'completed') {
    // Need itemised TripCharge rows to compute total/balance correctly
    return { ...base, charges: { select: { amount: true, charge_type: true } } };
  }

  return base;
}

// ─── Status filter per export type ───────────────────────────────────────────

function getStatusFilter(type: string): string[] | null {
  switch (type) {
    case 'completed':  return ['Completed', 'Invoiced'];
    case 'loading':    return ['Loading'];
    case 'in-transit': return ['InTransit'];
    case 'delayed':    return ['Delayed'];
    default: return null; // all / 3pl / date-range: no status filter
  }
}

// ─── WHERE clause builder ─────────────────────────────────────────────────────

function buildWhere(params: {
  type: string;
  search?: string;
  start_date?: string;
  end_date?: string;
  driver_id?: string;
  vehicle_id?: string;
  customer_id?: string;
  tz: string;
}): Prisma.TripWhereInput {
  const { type, search, start_date, end_date, driver_id, vehicle_id, customer_id, tz } = params;

  const where: Prisma.TripWhereInput = { deletedAt: null };

  const statuses = getStatusFilter(type);
  if (statuses) where.status = { in: statuses as TripStatus[] };
  if (type === '3pl') where.is_third_party = true;
  if (driver_id) where.driverId = driver_id;
  if (vehicle_id) where.vehicleId = vehicle_id;
  if (customer_id) where.customerId = customer_id;

  const andClauses: Prisma.TripWhereInput[] = [];

  if (start_date) {
    const gte = localDateToUtc(start_date, tz, false);
    andClauses.push({
      OR: [
        { planned_start: { gte } },
        { AND: [{ planned_start: null }, { createdAt: { gte } }] },
      ],
    });
  }

  if (end_date) {
    const lte = localDateToUtc(end_date, tz, true);
    andClauses.push({
      OR: [
        { planned_start: { lte } },
        { AND: [{ planned_start: null }, { createdAt: { lte } }] },
      ],
    });
  }

  if (search && typeof search === 'string' && search.trim()) {
    const searchAnd = buildSearchAnd(search.trim(), TRIP_SEARCH_FIELDS) as Prisma.TripWhereInput[];
    andClauses.push(...searchAnd);
  }

  if (andClauses.length > 0) where.AND = andClauses;

  return where;
}

// ─── Filename builder ─────────────────────────────────────────────────────────

function buildFilename(type: string, format: string): string {
  const slug = type.replace(/-/g, '_');
  const date = new Date().toISOString().slice(0, 10);
  const ext = format === 'csv' ? 'csv' : 'xlsx';
  return `MERCON_trips_${slug}_${date}.${ext}`;
}

// ─── CSV cell escaper ─────────────────────────────────────────────────────────

function csvCell(v: string | number | null | undefined): string {
  const s = String(v ?? '').replace(/"/g, '""');
  return /[,"\n\r]/.test(s) ? `"${s}"` : s;
}

// ─── Main export handler ──────────────────────────────────────────────────────

export const exportTrips = async (req: Request, res: Response): Promise<void> => {
  const {
    type = 'all',
    format = 'xlsx',
    search,
    start_date,
    end_date,
    driver_id,
    vehicle_id,
    customer_id,
  } = req.query as Record<string, string | undefined>;

  try {
    // Read the deployment's configured timezone from Settings — never trust
    // Node's process timezone for business-calendar date boundaries.
    const settings = await prisma.settings.findUnique({ where: { id: 'singleton' } });
    const tz = settings?.timezone ?? FALLBACK_TZ;

    const where = buildWhere({ type, search, start_date, end_date, driver_id, vehicle_id, customer_id, tz });
    const headers = getHeaders(type);
    const include = getInclude(type);
    const filename = buildFilename(type, format);

    // ── CSV streaming ───────────────────────────────────────────────────────
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.write('\uFEFF'); // UTF-8 BOM for Excel compatibility
      res.write(headers.map(csvCell).join(',') + '\r\n');

      let skip = 0;
      while (true) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const page: any[] = await (prisma.trip.findMany as any)({
          where,
          skip,
          take: BATCH_SIZE,
          orderBy: [{ planned_start: 'desc' }, { createdAt: 'desc' }],
          include,
        });
        if (page.length === 0) break;
        for (const trip of page) {
          res.write(mapRow(type, trip, tz).map(csvCell).join(',') + '\r\n');
        }
        if (page.length < BATCH_SIZE) break;
        skip += BATCH_SIZE;
      }
      res.end();
      return;
    }

    // ── XLSX via ExcelJS streaming WorkbookWriter ───────────────────────────
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });

    const sheetNameMap: Record<string, string> = {
      all: 'All Trips',
      '3pl': '3PL Trips',
      completed: 'Completed',
      loading: 'Loading',
      'in-transit': 'In Transit',
      delayed: 'Delayed',
      'date-range': 'Date Range',
    };
    const sheet = workbook.addWorksheet((sheetNameMap[type] ?? type).slice(0, 31));

    const headerRow = sheet.addRow(headers);
    headerRow.font = { bold: true };
    headerRow.commit();

    let skip = 0;
    while (true) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const page: any[] = await (prisma.trip.findMany as any)({
        where,
        skip,
        take: BATCH_SIZE,
        orderBy: [{ planned_start: 'desc' }, { createdAt: 'desc' }],
        include,
      });
      if (page.length === 0) break;
      for (const trip of page) {
        sheet.addRow(mapRow(type, trip, tz)).commit();
      }
      if (page.length < BATCH_SIZE) break;
      skip += BATCH_SIZE;
    }

    await workbook.commit();
  } catch (err) {
    logger.error({ err }, 'Trip export failed');
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: { code: 'EXPORT_FAILED', message: 'Failed to generate export' },
      });
    }
    if (!res.writableEnded) res.end();
  }
};
