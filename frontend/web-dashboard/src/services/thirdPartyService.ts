import { api, ApiResponse } from '@/lib/api';

export interface ThirdPartyProvider {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tax_id: string | null;
  rating: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  total_trips?: number;
  active_trips?: number;
  total_cost?: number;
  total_revenue?: number;
}

export interface CreateThirdPartyPayload {
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  tax_id?: string;
  notes?: string;
  rating?: number;
}

export interface UpdateThirdPartyPayload extends Partial<CreateThirdPartyPayload> {
  isActive?: boolean;
}

/** 3PL KPI totals, computed in the database — see `getThirdPartyStats`. */
export interface ThirdPartyStats {
  total: number;
  active: number;
  inactive: number;
  total_trips: number;
  total_cost: number;
  total_revenue: number;
  net_profit: number;
}

export const thirdPartyService = {
  getStats: async (): Promise<ThirdPartyStats> => {
    const res = await api.get<ApiResponse<ThirdPartyStats>>('/third-party-providers/stats');
    return res.data.data;
  },

  getAll: async (params?: { search?: string; is_active?: boolean; page?: number; per_page?: number }) => {
    return api.get<ApiResponse<ThirdPartyProvider[]>>('/third-party-providers', { params });
  },

  getById: async (id: string) => {
    return api.get<ApiResponse<ThirdPartyProvider>>(`/third-party-providers/${id}`);
  },

  create: async (payload: CreateThirdPartyPayload) => {
    return api.post<ApiResponse<ThirdPartyProvider>>('/third-party-providers', payload);
  },

  update: async (id: string, payload: UpdateThirdPartyPayload) => {
    return api.put<ApiResponse<ThirdPartyProvider>>(`/third-party-providers/${id}`, payload);
  },

  delete: async (id: string) => {
    return api.delete<ApiResponse<{ id: string; deleted: boolean }>>(`/third-party-providers/${id}`);
  },

  bulkImport: async (rows: Record<string, string | number>[]) => {
    const res = await api.post<ApiResponse<any>>('/third-party-providers/import', { rows });
    return res.data.data;
  },
};
