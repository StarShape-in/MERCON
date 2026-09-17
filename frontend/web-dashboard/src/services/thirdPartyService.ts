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

export interface ProviderRateCard {
  id: string;
  providerId: string;
  origin_city: string;
  destination_city: string;
  originLocationId?: string | null;
  destinationLocationId?: string | null;
  originLocation?: { id: string; name: string; city?: string | null } | null;
  destinationLocation?: { id: string; name: string; city?: string | null } | null;
  vehicle_class: string;
  line_type: string;
  operation_type?: string | null;
  pricing_basis: string;
  cost: number | string;
  valid_from?: string | null;
  valid_to?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProviderRateCardPayload {
  providerId?: string;
  origin_city: string;
  destination_city: string;
  originLocationId?: string | null;
  destinationLocationId?: string | null;
  vehicle_class: string;
  line_type: string;
  operation_type?: string | null;
  pricing_basis?: string;
  cost: number;
  valid_from?: string | null;
  valid_to?: string | null;
  status?: string;
}

export interface MatchProviderRatePayload {
  providerId: string;
  origin?: string;
  origin_city?: string;
  originLocationId?: string | null;
  destination?: string;
  destination_city?: string;
  destinationLocationId?: string | null;
  vehicle_class?: string;
  vehicle_type?: string;
  line_type?: string;
  rate_category?: string;
  operation_type?: string;
  billing_type?: string;
  pricing_basis?: string;
  target_date?: string;
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

  // Rates API
  getRates: async (providerId: string, params?: { status?: string; search?: string }) => {
    const res = await api.get<ApiResponse<ProviderRateCard[]>>(`/third-party-providers/${providerId}/rates`, { params });
    return res.data.data;
  },

  createRate: async (providerId: string, payload: CreateProviderRateCardPayload) => {
    const res = await api.post<ApiResponse<ProviderRateCard>>(`/third-party-providers/${providerId}/rates`, payload);
    return res.data.data;
  },

  updateRate: async (id: string, payload: Partial<CreateProviderRateCardPayload>) => {
    const res = await api.put<ApiResponse<ProviderRateCard>>(`/third-party-providers/rates/${id}`, payload);
    return res.data.data;
  },

  deleteRate: async (id: string) => {
    const res = await api.delete<ApiResponse<any>>(`/third-party-providers/rates/${id}`);
    return res.data;
  },

  matchRate: async (payload: MatchProviderRatePayload) => {
    const res = await api.post<ApiResponse<ProviderRateCard | null>>('/third-party-providers/rates/match', payload);
    return res.data.data;
  },

  getPreviousDrivers: async (providerId: string): Promise<Previous3PLDriver[]> => {
    const res = await api.get<ApiResponse<Previous3PLDriver[]>>(`/third-party-providers/${providerId}/previous-drivers`);
    return res.data.data;
  },
};

export interface Previous3PLDriver {
  driverName: string | null;
  driverPhone: string | null;
  vehiclePlate: string | null;
  vehicleType: string | null;
}

