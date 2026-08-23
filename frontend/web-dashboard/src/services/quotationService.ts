import { api, ApiResponse } from '@/lib/api';
import { Location } from '@/services/locationService';
import type { ImportSummary } from '@/components/fleet/ExcelImportDialog';
import type { Quotation, QuotationStop, QuotationHistory } from '@mercon/shared-types';

export { Quotation, QuotationStop, QuotationHistory };
export { VEHICLE_TYPES, RATE_CATEGORIES, BILLING_TYPES } from '@mercon/shared-types';

/**
 * Backward compatibility interface for RateCard
 */
export type RateCard = Quotation;
export type RateCardPriceHistory = QuotationHistory;

export interface CreateQuotationPayload {
  name?: string;
  rate?: number;
  base_price?: number;
  currency?: string;
  customerId: string;
  is_active?: boolean;
  vehicle_class?: string | null;
  source_vehicle_label?: string | null;
  vehicle_type?: string | null;
  line_type?: string | null;
  rate_category?: string | null;
  billing_type?: string | null;
  pricing_basis?: string | null;
  via_location?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
  source_type?: string | null;
  source_reference?: string | null;
  reason?: string;
  change_reason?: string;
  source?: string;
  trip_id?: string;
  stops?: Array<{
    sequence?: number;
    locationId?: string | null;
    location_id?: string | null;
    stop_type?: string;
    source_label?: string | null;
    location_name?: string | null;
  }>;
  origin_location_id?: string | null;
  destination_location_id?: string | null;
  origin_name?: string | null;
  destination_name?: string | null;
  origin_lat?: number | null;
  origin_lng?: number | null;
  destination_lat?: number | null;
  destination_lng?: number | null;
}

export type CreateRateCardPayload = CreateQuotationPayload;

export interface QuotationListParams {
  customerId?: string;
  active_only?: boolean;
  origin_location_id?: string;
  destination_location_id?: string;
  vehicle_class?: string;
  vehicle_type?: string;
  line_type?: string;
  rate_category?: string;
  billing_type?: string;
  pricing_basis?: string;
  page?: number;
  per_page?: number | 'all';
  search?: string;
  status?: string;
}

export type RateCardListParams = QuotationListParams;

export interface SurchargeRule {
  id: string;
  customerId: string;
  quotationId: string | null;
  rateCardId?: string | null;
  charge_type: string;
  unit: string | null;
  vehicle_type: string | null;
  rate: number;
  currency: string;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; name: string } | null;
  quotation?: { id: string; name: string } | null;
  rateCard?: { id: string; name: string; route_origin?: string; route_destination?: string } | null;
}

export interface CreateSurchargeRulePayload {
  customerId: string;
  quotationId?: string | null;
  rateCardId?: string | null;
  charge_type: string;
  unit?: string | null;
  vehicle_type?: string | null;
  rate: number;
  currency?: string;
  is_active?: boolean;
}

export type RateSource = 'customer' | null;

export interface QuotationLookupResult {
  quotation: Quotation | null;
  rate_card?: Quotation | null;
  source: RateSource;
}

export type RateLookupResult = QuotationLookupResult;

export const quotationService = {
  async getAll(params?: QuotationListParams): Promise<ApiResponse<Quotation[]>> {
    const res = await api.get<ApiResponse<Quotation[]>>('/quotations', {
      params: {
        ...(params?.customerId ? { customerId: params.customerId } : {}),
        ...(params?.active_only ? { active_only: 'true' } : {}),
        ...(params?.origin_location_id ? { origin_location_id: params.origin_location_id } : {}),
        ...(params?.destination_location_id ? { destination_location_id: params.destination_location_id } : {}),
        ...(params?.vehicle_class || params?.vehicle_type ? { vehicle_type: params?.vehicle_class || params?.vehicle_type } : {}),
        ...(params?.line_type || params?.rate_category ? { line_type: params?.line_type || params?.rate_category } : {}),
        ...(params?.billing_type ? { billing_type: params.billing_type } : {}),
        ...(params?.pricing_basis ? { pricing_basis: params.pricing_basis } : {}),
        ...(params?.page ? { page: params.page } : {}),
        ...(params?.per_page ? { per_page: params.per_page } : {}),
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.status ? { status: params.status } : {}),
      },
    });
    return res.data;
  },

  async getById(id: string): Promise<Quotation> {
    const res = await api.get<ApiResponse<Quotation>>(`/quotations/${id}`);
    return res.data.data;
  },

  async lookup(params: {
    customer_id?: string | null;
    origin_location_id?: string | null;
    destination_location_id?: string | null;
    vehicle_type?: string | null;
    line_type?: string | null;
    billing_type?: string | null;
  }): Promise<QuotationLookupResult> {
    const res = await api.get<ApiResponse<QuotationLookupResult>>('/quotations/lookup', {
      params: {
        ...(params.customer_id ? { customer_id: params.customer_id } : {}),
        ...(params.origin_location_id ? { origin_location_id: params.origin_location_id } : {}),
        ...(params.destination_location_id ? { destination_location_id: params.destination_location_id } : {}),
        ...(params.vehicle_type !== undefined ? { vehicle_type: params.vehicle_type ?? '' } : {}),
        ...(params.line_type !== undefined ? { line_type: params.line_type ?? '' } : {}),
        ...(params.billing_type !== undefined ? { billing_type: params.billing_type ?? '' } : {}),
      },
    });
    return res.data.data;
  },

  async create(payload: CreateQuotationPayload): Promise<Quotation> {
    const res = await api.post<ApiResponse<Quotation>>('/quotations', payload);
    return res.data.data;
  },

  async update(id: string, payload: Partial<CreateQuotationPayload>): Promise<Quotation> {
    const res = await api.put<ApiResponse<Quotation>>(`/quotations/${id}`, payload);
    return res.data.data;
  },

  async getHistory(id: string): Promise<QuotationHistory[]> {
    const res = await api.get<ApiResponse<QuotationHistory[]>>(`/quotations/${id}/history`);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/quotations/${id}`);
  },

  async bulkDelete(ids: string[]): Promise<void> {
    await api.post('/quotations/bulk-delete', { ids });
  },

  async importRows(rows: Record<string, string | number>[]): Promise<ImportSummary> {
    const res = await api.post<ApiResponse<ImportSummary>>('/quotations/import', { rows }, { timeout: 120_000 });
    return res.data.data;
  },
};

/** Alias for rateCardService */
export const rateCardService = quotationService;

export const surchargeRuleService = {
  async list(params?: { customerId?: string; quotationId?: string; rateCardId?: string; active_only?: boolean }): Promise<SurchargeRule[]> {
    const targetQuotationId = params?.quotationId || params?.rateCardId;
    const res = await api.get<ApiResponse<SurchargeRule[]>>('/surcharge-rules', {
      params: {
        ...(params?.customerId ? { customerId: params.customerId } : {}),
        ...(targetQuotationId ? { quotationId: targetQuotationId, rateCardId: targetQuotationId } : {}),
        ...(params?.active_only ? { active_only: 'true' } : {}),
      },
    });
    return res.data.data;
  },

  async getById(id: string): Promise<SurchargeRule> {
    const res = await api.get<ApiResponse<SurchargeRule>>(`/surcharge-rules/${id}`);
    return res.data.data;
  },

  async create(payload: CreateSurchargeRulePayload): Promise<SurchargeRule> {
    const res = await api.post<ApiResponse<SurchargeRule>>('/surcharge-rules', payload);
    return res.data.data;
  },

  async update(id: string, payload: Partial<CreateSurchargeRulePayload>): Promise<SurchargeRule> {
    const res = await api.put<ApiResponse<SurchargeRule>>(`/surcharge-rules/${id}`, payload);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/surcharge-rules/${id}`);
  },

  async getDistinctChargeTypes(customerId?: string): Promise<string[]> {
    const res = await api.get<ApiResponse<string[]>>('/surcharge-rules/charge-types', {
      params: customerId ? { customerId } : {},
    });
    return res.data.data;
  },

  async importRows(rows: Record<string, string | number>[]): Promise<ImportSummary> {
    const res = await api.post<ApiResponse<ImportSummary>>('/surcharge-rules/import', { rows }, { timeout: 120_000 });
    return res.data.data;
  },
};
