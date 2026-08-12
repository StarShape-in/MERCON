import { api, ApiResponse } from '@/lib/api';
import { Location } from '@/services/locationService';
import type { ImportSummary } from '@/components/fleet/ExcelImportDialog';
export { VEHICLE_TYPES, RATE_CATEGORIES } from '@mercon/shared-types';

/**
 * A rate card prices a lane (origin → destination) for exactly one customer —
 * every quote is customer-specific, there is no all-customers "standard" rate.
 *
 * route_origin/route_destination are a denormalised copy of the two location
 * names, kept so older cards and CSV exports still render. The location ids are
 * the real identity of the lane.
 */
export interface RateCard {
  id: string;
  name: string;
  route_origin: string;
  route_destination: string;
  base_price: number;
  currency: string;
  customerId: string;
  originLocationId: string | null;
  destinationLocationId: string | null;
  /** Free text, not a fixed list — each customer's quote names its own tiers. */
  vehicle_type: string | null;
  /** e.g. "Trip/Round Trip", "Monthly", "Daily Local", "Surcharge". */
  rate_category: string | null;
  /** Optional connecting stop between origin and destination. */
  via_location: string | null;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; name: string } | null;
  originLocation?: Pick<Location, 'id' | 'name' | 'lat' | 'lng'> | null;
  destinationLocation?: Pick<Location, 'id' | 'name' | 'lat' | 'lng'> | null;
}

export interface CreateRateCardPayload {
  name?: string;
  base_price: number;
  currency?: string;
  customerId: string;
  is_active?: boolean;
  vehicle_type?: string | null;
  rate_category?: string | null;
  via_location?: string | null;
  /** Pick an existing place by id, or name a new one — the API creates it. */
  origin_location_id?: string | null;
  destination_location_id?: string | null;
  origin_name?: string | null;
  destination_name?: string | null;
  origin_lat?: number | null;
  origin_lng?: number | null;
  destination_lat?: number | null;
  destination_lng?: number | null;
}

export interface RateCardListParams {
  customerId?: string;
  active_only?: boolean;
  origin_location_id?: string;
  destination_location_id?: string;
  page?: number;
  per_page?: number | 'all';
  search?: string;
  status?: string;
}

/** Where the matched price came from — always the customer's own rate. */
export type RateSource = 'customer' | null;

export interface RateLookupResult {
  rate_card: RateCard | null;
  source: RateSource;
}

export interface AssignRateCardResult {
  created: RateCard[];
  skipped: { customerId: string; customerName: string }[];
}

export const rateCardService = {
  async getAll(params?: RateCardListParams): Promise<ApiResponse<RateCard[]>> {
    const res = await api.get<ApiResponse<RateCard[]>>('/rate-cards', {
      params: {
        ...(params?.customerId ? { customerId: params.customerId } : {}),
        ...(params?.active_only ? { active_only: 'true' } : {}),
        ...(params?.origin_location_id ? { origin_location_id: params.origin_location_id } : {}),
        ...(params?.destination_location_id ? { destination_location_id: params.destination_location_id } : {}),
        ...(params?.page ? { page: params.page } : {}),
        ...(params?.per_page ? { per_page: params.per_page } : {}),
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.status ? { status: params.status } : {}),
      },
    });
    return res.data;
  },

  async getById(id: string): Promise<RateCard> {
    const res = await api.get<ApiResponse<RateCard>>(`/rate-cards/${id}`);
    return res.data.data;
  },

  /**
   * What does this lane cost for this customer? Returns null when nothing is
   * priced yet — which is the cue to offer saving a new rate, not to fall back
   * to an unrelated card.
   */
  async lookup(params: {
    customer_id?: string | null;
    origin_location_id?: string | null;
    destination_location_id?: string | null;
    /** Omit to match any tier for the lane; pass '' to match only tier-less cards. */
    vehicle_type?: string | null;
    rate_category?: string | null;
  }): Promise<RateLookupResult> {
    const res = await api.get<ApiResponse<RateLookupResult>>('/rate-cards/lookup', {
      params: {
        ...(params.customer_id ? { customer_id: params.customer_id } : {}),
        ...(params.origin_location_id ? { origin_location_id: params.origin_location_id } : {}),
        ...(params.destination_location_id ? { destination_location_id: params.destination_location_id } : {}),
        ...(params.vehicle_type !== undefined ? { vehicle_type: params.vehicle_type ?? '' } : {}),
        ...(params.rate_category !== undefined ? { rate_category: params.rate_category ?? '' } : {}),
      },
    });
    return res.data.data;
  },

  async create(payload: CreateRateCardPayload): Promise<RateCard> {
    const res = await api.post<ApiResponse<RateCard>>('/rate-cards', payload);
    return res.data.data;
  },

  async update(id: string, payload: Partial<CreateRateCardPayload>): Promise<RateCard> {
    const res = await api.put<ApiResponse<RateCard>>(`/rate-cards/${id}`, payload);
    return res.data.data;
  },

  /**
   * Copy this lane's price onto other customers as their own rate. Customers
   * that already have a rate for the lane come back in `skipped` untouched —
   * a negotiated price is never silently overwritten.
   */
  async assignToCustomers(id: string, customerIds: string[]): Promise<AssignRateCardResult> {
    const res = await api.post<ApiResponse<AssignRateCardResult>>(`/rate-cards/${id}/assign`, {
      customer_ids: customerIds,
    });
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/rate-cards/${id}`);
  },

  async bulkDelete(ids: string[]): Promise<void> {
    await api.post('/rate-cards/bulk-delete', { ids });
  },

  // A real sheet can be hundreds of rows, each needing a few DB round trips
  // server-side — the client's default 15s timeout is for normal requests,
  // not this. 120s matches nginx's proxy_read_timeout for /api.
  async importRows(rows: Record<string, string | number>[]): Promise<ImportSummary> {
    const res = await api.post<ApiResponse<ImportSummary>>('/rate-cards/import', { rows }, { timeout: 120_000 });
    return res.data.data;
  },
};
