import { api, ApiResponse } from '@/lib/api';

export type TripStatus = 'Draft' | 'Dispatched' | 'AtPickup' | 'InTransit' | 'AtDelivery' | 'Completed' | 'Invoiced' | 'Cancelled';

export interface Trip {
  id: string;
  ref_id: string;
  status: TripStatus;
  planned_start: string | null;
  actual_start: string | null;
  planned_end: string | null;
  actual_end: string | null;
  planned_distance: number | null;
  extra_driver_payment: number | null;
  payment_reason: string | null;
  payment_status: string | null;
  waiting_labor_charges?: number;
  additional_stop_charges?: number;
  trip_charges?: number;
  billing_amount?: number;
  carrier_name?: string;
  is_post_trip_settled?: boolean;
  is_third_party?: boolean;
  thirdPartyProviderId?: string | null;
  third_party_driver_name?: string | null;
  third_party_driver_phone?: string | null;
  third_party_vehicle_plate?: string | null;
  third_party_vehicle_type?: string | null;
  third_party_cost?: number | null;
  thirdPartyProvider?: {
    id: string;
    name: string;
    contact_person?: string | null;
    phone?: string | null;
  } | null;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_by?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  customer?: { id: string; name: string; contact_phone: string };
  driver?: { id: string; ref_id: string; first_name: string; last_name: string; phone_primary: string; ai_risk_score?: number } | null;
  vehicle?: { id: string; ref_id: string; plate_number: string; asset_type: string; capacity_kg: number; icces_device_id: string | null } | null;
  stops?: TripStop[];
  invoices?: { id: string; ref_id: string; total_amount: number; status: string }[];
  vehicle_type?: string | null;
  rate_category?: string | null;
  rateCardId?: string | null;
  rateCard?: {
    id: string;
    name: string;
    route_origin: string;
    route_destination: string;
    base_price: number;
    currency: string;
    vehicle_type?: string | null;
    rate_category?: string | null;
  } | null;
}

export function getTripPayloadCapacity(trip: Partial<Trip>): string {
  if (trip.vehicle_type) return trip.vehicle_type;
  if (trip.rateCard?.vehicle_type) return trip.rateCard.vehicle_type;
  if (trip.third_party_vehicle_type) return trip.third_party_vehicle_type;
  if (trip.vehicle?.capacity_kg) {
    const tons = trip.vehicle.capacity_kg / 1000;
    return `${tons % 1 === 0 ? tons.toFixed(0) : tons.toFixed(1)} Tons`;
  }
  return '—';
}

export function getTripRateCategory(trip: Partial<Trip>): string {
  return trip.rate_category || trip.rateCard?.rate_category || '—';
}

export interface TripStop {
  id: string;
  stop_sequence: number;
  stop_type: 'Pickup' | 'Dropoff' | 'Rest' | 'Refuel';
  location_lat: number;
  location_lng: number;
  /** Short label for the exact yard — "Khamis Sorting Center". */
  location_name: string | null;
  /** Its full postal address. This is what the driver's app shows. */
  location_address: string | null;
  /** The lane endpoint this stop sits in — what the rate card is priced against. */
  locationId: string | null;
  location?: { id: string; name: string; address: string | null } | null;
  planned_arrival: string | null;
  actual_arrival: string | null;
  actual_departure: string | null;
  delay_reason: DelayReason | null;
  delay_note: string | null;
  delay_logged_by: string | null;
  delay_logged_at: string | null;
}

export interface CreateTripPayload {
  customer_id: string;
  driver_id?: string;
  vehicle_id?: string;
  planned_start?: string;
  billing_amount?: number;
  trip_charges?: number;
  status?: TripStatus;
  dispatch_now?: boolean;
  /** The rate card the price came from, recorded so invoicing bills what was quoted. */
  rate_card_id?: string;
  /** Tonnage tier / booking type — copied onto the trip so it survives the
   *  rate card being edited later. Omit to inherit whatever rate_card_id carries. */
  vehicle_type?: string | null;
  rate_category?: string | null;
  /** Third-Party Logistics fields */
  is_third_party?: boolean;
  third_party_provider_id?: string;
  third_party_driver_name?: string;
  third_party_driver_phone?: string;
  third_party_vehicle_plate?: string;
  third_party_vehicle_type?: string;
  third_party_cost?: number;
  stops: {
    stop_type: string;
    lat: number;
    lng: number;
    planned_arrival?: string;
    /** The exact yard/dock — what the driver navigates to. */
    location_name?: string;
    /** Its full postal address, shown to the driver in the mobile app. */
    location_address?: string;
    /** The lane endpoint this stop sits in ("Riyadh") — what the rate is priced against. */
    location_id?: string;
  }[];
}

export const DELAY_REASONS = [
  'Traffic',
  'VehicleBreakdown',
  'CustomerNotReady',
  'SlowLoadingUnloading',
  'Weather',
  'Documentation',
  'RouteBlocked',
  'Other',
] as const;

export type DelayReason = (typeof DELAY_REASONS)[number];

/** Enum values are stored compactly; these are what an operator reads. */
export const DELAY_REASON_LABELS: Record<DelayReason, string> = {
  Traffic: 'Traffic',
  VehicleBreakdown: 'Vehicle breakdown',
  CustomerNotReady: 'Customer not ready',
  SlowLoadingUnloading: 'Slow loading / unloading',
  Weather: 'Weather',
  Documentation: 'Documentation',
  RouteBlocked: 'Route blocked',
  Other: 'Other',
};

export interface LogStopDelayPayload {
  delay_reason: DelayReason;
  delay_note?: string;
}

export interface TripFilters {
  status?: TripStatus | string;
  driver_id?: string;
  vehicle_id?: string;
  customer_id?: string;
  rate_card_id?: string;
  search?: string;
  date_filter?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  per_page?: number;
}

/* ─── Monthly board ─────────────────────────────────────────────────────── */

/** One trip as it appears on the monthly board — a day, a driver, a truck. */
export interface MonthlyBoardTrip {
  id: string;
  ref_id: string | null;
  status: TripStatus;
  /** Local YYYY-MM-DD the trip sits on. */
  date: string;
  planned_start: string | null;
  planned_end: string | null;
  actual_start: string | null;
  actual_end: string | null;
  /** The day came from createdAt because the trip was never scheduled. */
  date_is_inferred: boolean;
  driver: { id: string; ref_id: string | null; name: string; phone_primary: string | null } | null;
  vehicle: { id: string; ref_id: string | null; plate_number: string; asset_type: string } | null;
  /** Tonnage tier — the trip's own, else the rate card it was booked from. */
  vehicle_type: string | null;
  /** Booking type, e.g. "Monthly Round". Same fallback as vehicle_type. */
  rate_category: string | null;
  billing_amount: number | null;
  currency: string;
  rate_card: { id: string; name: string; base_price: number } | null;
  origin: string | null;
  destination: string | null;
}

export interface MonthlyBoardCompany {
  customer: { id: string; name: string; contact_phone: string };
  total_trips: number;
  total_billed: number;
  /** Trips still missing a driver or a truck — the gaps to fill. */
  unassigned_trips: number;
  drivers: { id: string; name: string; ref_id: string | null; trips: number }[];
  vehicles: { id: string; plate_number: string; trips: number }[];
  categories: { name: string; trips: number }[];
  days: { date: string; trips: MonthlyBoardTrip[] }[];
}

export interface MonthlyBoard {
  /** YYYY-MM the board is showing. */
  month: string;
  start: string;
  end: string;
  summary: {
    total_trips: number;
    companies: number;
    drivers_used: number;
    vehicles_used: number;
    total_billed: number;
    unassigned_trips: number;
    by_status: Record<string, number>;
    truncated: boolean;
  };
  companies: MonthlyBoardCompany[];
}

export interface MonthlyBoardFilters {
  /** YYYY-MM. Omitted means the current month. */
  month?: string;
  customer_id?: string;
  driver_id?: string;
  vehicle_id?: string;
  status?: string;
  rate_category?: string;
  vehicle_type?: string;
  search?: string;
}

export interface UpdateTripFinancialsPayload {
  waiting_labor_charges?: number;
  additional_stop_charges?: number;
  trip_charges?: number;
  billing_amount?: number;
  carrier_name?: string;
  is_post_trip_settled?: boolean;
}

export const tripService = {
  async getAll(filters: TripFilters = {}): Promise<ApiResponse<Trip[]>> {
    const res = await api.get<ApiResponse<Trip[]>>('/trips', { params: filters });
    return res.data;
  },

  /**
   * A whole month grouped company → day. Not paginated: the board's whole
   * point is seeing the month at once, and the server caps the query.
   */
  async getMonthlyBoard(filters: MonthlyBoardFilters = {}): Promise<MonthlyBoard> {
    const res = await api.get<ApiResponse<MonthlyBoard>>('/trips/monthly', {
      params: Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''),
      ),
    });
    return res.data.data;
  },

  async getById(id: string): Promise<Trip> {
    const res = await api.get<ApiResponse<Trip>>(`/trips/${id}`);
    return res.data.data;
  },

  async getUnsettled(): Promise<Trip[]> {
    const res = await api.get<ApiResponse<Trip[]>>('/trips/unsettled');
    return res.data.data;
  },

  async create(payload: CreateTripPayload): Promise<Trip> {
    const res = await api.post<ApiResponse<Trip>>('/trips', payload);
    return res.data.data;
  },

  async updateStatus(id: string, status: TripStatus): Promise<Trip> {
    const res = await api.patch<ApiResponse<Trip>>(`/trips/${id}/status`, { status });
    return res.data.data;
  },

  async updateFinancials(id: string, payload: UpdateTripFinancialsPayload): Promise<Trip> {
    const res = await api.patch<ApiResponse<Trip>>(`/trips/${id}/financials`, payload);
    return res.data.data;
  },

  /** Record why a stop was reached late. Re-callable — a first guess often
   *  turns out to be something else once the driver is actually reached. */
  /**
   * Correct where a stop is. Refused (409) once the trip is completed,
   * invoiced or cancelled — a finished trip is a record of what happened.
   */
  async updateStop(
    tripId: string,
    stopId: string,
    payload: {
      location_name?: string;
      location_address?: string;
      location_id?: string | null;
      lat?: number;
      lng?: number;
    }
  ): Promise<TripStop> {
    const res = await api.patch<ApiResponse<TripStop>>(`/trips/${tripId}/stops/${stopId}`, payload);
    return res.data.data;
  },

  async logStopDelay(tripId: string, stopId: string, payload: LogStopDelayPayload): Promise<TripStop> {
    const res = await api.patch<ApiResponse<TripStop>>(`/trips/${tripId}/stops/${stopId}/delay`, payload);
    return res.data.data;
  },

  /** Assign a driver and/or vehicle to a trip that was created with "assign later". */
  async dispatch(id: string, payload: { driver_id?: string; vehicle_id?: string }): Promise<Trip> {
    const res = await api.post<ApiResponse<Trip>>(`/trips/${id}/dispatch`, payload);
    return res.data.data;
  },

  async approvePayment(id: string, amount: number, reason: string): Promise<Trip> {
    const res = await api.post<ApiResponse<Trip>>(`/trips/${id}/payment/approve`, { amount, reason });
    return res.data.data;
  },

  /** Swap the assigned driver mid-trip. */
  async replaceDriver(id: string, driverId: string): Promise<Trip> {
    const res = await api.post<ApiResponse<Trip>>(`/trips/${id}/replace-driver`, { driver_id: driverId });
    return res.data.data;
  },

  async bulkDelete(ids: string[]): Promise<void> {
    await api.post('/trips/bulk-delete', { ids });
  },

  async bulkUpdateStatus(ids: string[], status: string): Promise<void> {
    await api.post('/trips/bulk-update-status', { ids, status });
  },

  async bulkImport(rows: BulkImportTripRow[]): Promise<BulkImportResult> {
    const res = await api.post<ApiResponse<BulkImportResult>>('/trips/bulk-import', { rows });
    return res.data.data;
  },

  /** Mark a completed trip as invoiced. Creates the Invoice tracking record. */
  async markInvoiced(tripId: string, payload: { zatca_ref?: string; invoicing_note?: string }): Promise<{ trip: Trip; invoice: any }> {
    const res = await api.post<ApiResponse<{ trip: Trip; invoice: any }>>(`/trips/${tripId}/mark-invoiced`, payload);
    return res.data.data;
  },

  /** Reverse a mark-invoiced action. Admin-only correction. */
  async unmarkInvoiced(tripId: string): Promise<Trip> {
    const res = await api.post<ApiResponse<Trip>>(`/trips/${tripId}/unmark-invoiced`, {});
    return res.data.data;
  },

  /** Fetch the billing ledger — completed + invoiced trips with filtering. */
  async getBillingLedger(filters: BillingLedgerFilters = {}): Promise<ApiResponse<BillingLedgerTrip[]>> {
    const res = await api.get<ApiResponse<BillingLedgerTrip[]>>('/invoices/billing-ledger', { params: filters });
    return res.data;
  },

  /** Fetch the customer (company) billing ledger — one row per company with aggregated trip stats. */
  async getCustomerBillingLedger(filters: CustomerBillingFilters = {}): Promise<ApiResponse<CustomerBillingRow[]>> {
    const res = await api.get<ApiResponse<CustomerBillingRow[]>>('/invoices/billing-ledger/by-customer', { params: filters });
    return res.data;
  },
};

export interface BulkImportTripRow {
  customer_id?: string;
  customer_name?: string;
  driver_id?: string;
  driver_name?: string;
  vehicle_id?: string;
  vehicle_plate?: string;
  planned_start?: string;
  rate_category?: string;
  vehicle_type?: string;
  billing_amount?: number;
  origin?: string;
  destination?: string;
  status?: TripStatus;
}

export interface BulkImportResult {
  imported: number;
  failed: number;
  results: Array<{ row: number; success: boolean; ref_id?: string; error?: string }>;
}

export interface BillingLedgerFilters {
  customer_id?: string;
  date_from?: string;
  date_to?: string;
  invoice_status?: 'NotInvoiced' | 'Invoiced';
  search?: string;
  page?: number;
  per_page?: number;
}

export interface BillingLedgerTrip extends Omit<Trip, 'invoices'> {
  invoices: Array<{
    id: string;
    ref_id: string | null;
    status: string;
    total_amount: number;
    zatca_ref: string | null;
    invoicing_note: string | null;
    createdAt: string;
  }>;
}

export interface CustomerBillingFilters {
  date_from?: string;
  date_to?: string;
  invoice_status?: 'NotInvoiced' | 'Invoiced';
  search?: string;
}

export interface CustomerBillingRow {
  customer: {
    id: string;
    name: string;
    contact_phone?: string | null;
    contact_email?: string | null;
  };
  total_trips: number;
  completed: number;
  invoiced: number;
  coverage_pct: number;
  total_billing: number;
  invoiced_amount: number;
  pending_amount: number;
  trips: BillingLedgerTrip[];
}
