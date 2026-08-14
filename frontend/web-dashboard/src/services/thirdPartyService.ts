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

export const thirdPartyService = {
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
};
