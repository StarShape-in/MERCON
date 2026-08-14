import type { TripReportFieldKey } from '@mercon/shared-types';
import { prisma } from '../../../db';

export interface TripReportFilters {
  startDate?: string;
  endDate?: string;
  customerId?: string;
  status?: string;
}

const PAGE_SIZE = 1000;

/**
 * Fetches trips for a company report, fixing three problems in the original
 * `getCustomReport`:
 *  - filters on the trip's own date (actual_start, falling back to
 *    planned_start for trips that haven't started) instead of `createdAt`,
 *    so "this month's trips" actually means trips that happened this month;
 *  - has no row cap — pages internally in chunks of 1000 so a full month's
 *    ledger exports completely instead of silently truncating at 500;
 *  - resolves `receiver` from the dropoff stop's real location_name /
 *    location_address instead of the placeholder "Dropoff Stop N".
 */
export async function fetchTripRows(
  filters: TripReportFilters
): Promise<Record<TripReportFieldKey, unknown>[]> {
  const { startDate, endDate, customerId, status } = filters;

  const dateRange: { gte?: Date; lte?: Date } = {};
  if (startDate) dateRange.gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    dateRange.lte = end;
  }

  const whereClause: any = { deletedAt: null };
  if (Object.keys(dateRange).length > 0) {
    whereClause.OR = [
      { actual_start: dateRange },
      { AND: [{ actual_start: null }, { planned_start: dateRange }] },
    ];
  }
  if (customerId && customerId !== 'all') whereClause.customerId = customerId;
  if (status && status !== 'all') whereClause.status = status;

  const settings = await prisma.settings.findUnique({ where: { id: 'singleton' } });
  const defaultCarrierName = settings?.companyLegalName || 'MERCON Logistics';

  const rows: Record<TripReportFieldKey, unknown>[] = [];
  let skip = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const page = await prisma.trip.findMany({
      where: whereClause,
      orderBy: [{ actual_start: 'asc' }, { planned_start: 'asc' }],
      skip,
      take: PAGE_SIZE,
      include: {
        customer: { select: { name: true } },
        driver: { select: { first_name: true, last_name: true, phone_primary: true } },
        vehicle: { select: { plate_number: true, capacity_kg: true, asset_type: true } },
        stops: { orderBy: { stop_sequence: 'asc' } },
        invoices: true,
      },
    });
    if (page.length === 0) break;

    for (const t of page) {
      const pickup = t.stops.find((s) => s.stop_type === 'Pickup');
      const dropoff = t.stops.find((s) => s.stop_type === 'Dropoff');
      const invoice = t.invoices[0];
      const billing = t.billing_amount ?? invoice?.subtotal ?? 0;
      const totalAmt = invoice?.total_amount ?? billing + t.waiting_labor_charges + t.additional_stop_charges;
      const balance = totalAmt - t.trip_charges;
      const vehicleTypeLabel = t.vehicle
        ? `${(t.vehicle.capacity_kg / 1000).toFixed(0)} TON (${t.vehicle.asset_type})`
        : 'N/A';

      rows.push({
        serial: rows.length + 1,
        ref_id: t.ref_id || t.id,
        date: t.actual_start || t.planned_start || t.createdAt,
        driver_name: t.driver ? `${t.driver.first_name} ${t.driver.last_name}` : 'N/A',
        driver_phone: t.driver?.phone_primary || 'N/A',
        vehicle_plate: t.vehicle?.plate_number || 'N/A',
        vehicle_type: vehicleTypeLabel,
        carrier_name: t.carrier_name || defaultCarrierName,
        customer_name: t.customer?.name || 'N/A',
        receiver: dropoff?.location_name || dropoff?.location_address || 'N/A',
        origin: pickup?.location_name || pickup?.location_address || 'N/A',
        destination: dropoff?.location_name || dropoff?.location_address || 'N/A',
        waiting_labor_charges: t.waiting_labor_charges,
        additional_stop_charges: t.additional_stop_charges,
        billing_amount: billing,
        total_amount: totalAmt,
        trip_charges: t.trip_charges,
        balance_amount: balance,
        status: t.status,
      });
    }

    if (page.length < PAGE_SIZE) break;
    skip += PAGE_SIZE;
  }

  return rows;
}
