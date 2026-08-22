import { api, ApiResponse } from '@/lib/api';
import type { ImportSummary } from '@/components/fleet/ExcelImportDialog';

/**
 * A customer's own precise, named pickup/dropoff point — "IMILE Delivery
 * Regional Headquarters, Riyadh" at its real coordinates, distinct from the
 * generic city-level Location that rate cards are priced against. Trip
 * creation surfaces these as quick picks once a customer is chosen.
 */
export interface CustomerSavedLocation {
  id: string;
  customerId: string;
  label: string;
  address: string | null;
  lat: number;
  lng: number;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
  customer?: { id: string; name: string } | null;
}

export interface CreateCustomerSavedLocationPayload {
  customerId: string;
  label: string;
  address?: string | null;
  lat: number;
  lng: number;
}

export const customerSavedLocationService = {
  async list(params?: { customerId?: string; active_only?: boolean }): Promise<CustomerSavedLocation[]> {
    const res = await api.get<ApiResponse<CustomerSavedLocation[]>>('/customer-saved-locations', {
      params: {
        ...(params?.customerId ? { customerId: params.customerId } : {}),
        ...(params?.active_only ? { active_only: 'true' } : {}),
      },
    });
    return res.data.data;
  },

  async create(payload: CreateCustomerSavedLocationPayload): Promise<CustomerSavedLocation> {
    const res = await api.post<ApiResponse<CustomerSavedLocation>>('/customer-saved-locations', payload);
    return res.data.data;
  },

  async update(id: string, payload: Partial<CreateCustomerSavedLocationPayload>): Promise<CustomerSavedLocation> {
    const res = await api.put<ApiResponse<CustomerSavedLocation>>(`/customer-saved-locations/${id}`, payload);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/customer-saved-locations/${id}`);
  },

  async importRows(rows: Record<string, string | number>[]): Promise<ImportSummary> {
    const res = await api.post<ApiResponse<ImportSummary>>('/customer-saved-locations/import', { rows }, { timeout: 120_000 });
    return res.data.data;
  },
};
