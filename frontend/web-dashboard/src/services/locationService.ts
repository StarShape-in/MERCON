import { api, ApiResponse } from '@/lib/api';
import type { ImportSummary } from '@/components/fleet/ExcelImportDialog';

export type CoordinatePrecision = 'EXACT' | 'APPROXIMATE' | 'UNKNOWN';

export interface Location {
  id: string;
  customerId: string;
  customer?: { id: string; name: string } | null;
  code: string;
  name: string;
  slug: string;
  address: string | null;
  city?: string | null;
  postalCode?: string | null;
  lat: number | null;
  lng: number | null;
  coordinate_precision: CoordinatePrecision;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    quotationStops?: number;
    tripStops?: number;
    originRateCards?: number;
    destinationRateCards?: number;
  };
}

export interface CreateLocationPayload {
  customerId: string;
  code?: string;
  name: string;
  address?: string | null;
  city?: string | null;
  postalCode?: string | null;
  lat?: number | null;
  lng?: number | null;
  coordinate_precision?: CoordinatePrecision;
}

export const locationService = {
  async getAll(params?: { customerId?: string; search?: string; active_only?: boolean; coordinate_precision?: CoordinatePrecision }): Promise<ApiResponse<Location[]>> {
    const res = await api.get<ApiResponse<Location[]>>('/locations', {
      params: {
        ...(params?.customerId ? { customerId: params.customerId } : {}),
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.active_only ? { active_only: 'true' } : {}),
        ...(params?.coordinate_precision ? { coordinate_precision: params.coordinate_precision } : {}),
      },
    });
    return res?.data ?? { success: false, data: [] };
  },

  async getById(id: string): Promise<Location> {
    const res = await api.get<ApiResponse<Location>>(`/locations/${id}`);
    return res?.data?.data;
  },

  async create(payload: CreateLocationPayload): Promise<Location> {
    const res = await api.post<ApiResponse<Location>>('/locations', payload);
    return res.data.data;
  },

  async update(id: string, payload: Partial<CreateLocationPayload & { is_active: boolean }>): Promise<Location> {
    const res = await api.patch<ApiResponse<Location>>(`/locations/${id}`, payload);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/locations/${id}`);
  },

  async importRows(rows: Record<string, any>[]): Promise<ImportSummary> {
    const res = await api.post<ApiResponse<ImportSummary>>('/locations/import', { rows });
    return res.data.data;
  },
};
