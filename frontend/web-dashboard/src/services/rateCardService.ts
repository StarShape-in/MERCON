import { api, ApiResponse } from '@/lib/api';
import { Location } from '@/services/locationService';
import type { ImportSummary } from '@/components/fleet/ExcelImportDialog';

/**
 * A rate card prices a lane (origin → destination).
 *
 * `customerId: null` is the STANDARD price for that lane — it applies to every
 * customer. A card WITH a customer overrides the standard one for that customer
 * only. So the price for a trip is: the customer's card for the lane → the
 * standard card for the lane → nothing. `lookup()` is that rule; never
 * re-implement it in a component.
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
  customerId: string | null;
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
  /** Omit or null for the standard lane rate that applies to every customer. */
  customerId?: string | null;
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
  /** 'standard' returns only the lanes with no customer attached. */
  scope?: 'standard';
  /** With customerId: also return the standard lanes that customer falls back to. */
  include_standard?: boolean;
  origin_location_id?: string;
  destination_location_id?: string;
}

/** Which tier the price came from — lets the UI say why, not just how much. */
export type RateSource = 'customer' | 'standard' | null;

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
        ...(params?.scope ? { scope: params.scope } : {}),
        ...(params?.include_standard ? { include_standard: 'true' } : {}),
        ...(params?.origin_location_id ? { origin_location_id: params.origin_location_id } : {}),
        ...(params?.destination_location_id ? { destination_location_id: params.destination_location_id } : {}),
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
  }): Promise<RateLookupResult> {
    const res = await api.get<ApiResponse<RateLookupResult>>('/rate-cards/lookup', {
      params: {
        ...(params.customer_id ? { customer_id: params.customer_id } : {}),
        ...(params.origin_location_id ? { origin_location_id: params.origin_location_id } : {}),
        ...(params.destination_location_id ? { destination_location_id: params.destination_location_id } : {}),
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

  async importRows(rows: Record<string, string | number>[]): Promise<ImportSummary> {
    const res = await api.post<ApiResponse<ImportSummary>>('/rate-cards/import', { rows });
    return res.data.data;
  },
};
