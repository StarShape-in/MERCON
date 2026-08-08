import { api, ApiResponse } from '@/lib/api';

/**
 * Lane endpoints — the shared list of places rate cards are priced between
 * (Riyadh, Jeddah, Makkah, Madinah…). Deliberately one list rather than free
 * text on each form: "Madina" and "Madinah" typed separately are two lanes that
 * never match each other, or the rate card.
 */
export interface Location {
  id: string;
  name: string;
  slug: string;
  lat: number | null;
  lng: number | null;
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLocationPayload {
  name: string;
  lat?: number | null;
  lng?: number | null;
}

export const locationService = {
  async getAll(params?: { search?: string; active_only?: boolean }): Promise<ApiResponse<Location[]>> {
    const res = await api.get<ApiResponse<Location[]>>('/locations', {
      params: {
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.active_only ? { active_only: 'true' } : {}),
      },
    });
    return res.data;
  },

  async getById(id: string): Promise<Location> {
    const res = await api.get<ApiResponse<Location>>(`/locations/${id}`);
    return res.data.data;
  },

  /** Creating a name that already exists returns the existing place instead of a duplicate. */
  async create(payload: CreateLocationPayload): Promise<Location> {
    const res = await api.post<ApiResponse<Location>>('/locations', payload);
    return res.data.data;
  },

  async update(id: string, payload: Partial<CreateLocationPayload & { is_active: boolean }>): Promise<Location> {
    const res = await api.put<ApiResponse<Location>>(`/locations/${id}`, payload);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/locations/${id}`);
  },
};
