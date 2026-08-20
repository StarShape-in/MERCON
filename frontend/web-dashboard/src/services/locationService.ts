import { api, ApiResponse } from '@/lib/api';
import type { ImportSummary } from '@/components/fleet/ExcelImportDialog';

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
  /** Full postal address behind the name — what a stop inherits and a driver navigates to. */
  address: string | null;
  lat: number | null;
  lng: number | null;
  /** Short codes the client's monthly trip sheets use for this place ("RUH", "AHS"). */
  codes?: string[];
  is_active: boolean;
  createdAt: string;
  updatedAt: string;
  /**
   * How much this place is actually used. Present on list responses only.
   * A place with zeros across the board is either brand new or a typo nobody
   * noticed — that distinction is the point of the locations page.
   */
  _count?: {
    originRateCards: number;
    destinationRateCards: number;
    tripStops: number;
  };
}

export interface CreateLocationPayload {
  name: string;
  address?: string | null;
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

  async importRows(rows: Record<string, string | number>[]): Promise<ImportSummary> {
    const res = await api.post<ApiResponse<ImportSummary>>('/locations/import', { rows }, { timeout: 120_000 });
    return res.data.data;
  },
};
