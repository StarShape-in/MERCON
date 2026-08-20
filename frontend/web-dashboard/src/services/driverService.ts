import { api, ApiResponse } from '@/lib/api';
import { Vehicle } from './vehicleService';
import type { ImportSummary } from '@/components/fleet/ExcelImportDialog';

export type DriverStatus = 'Available' | 'OnTrip' | 'OffDuty' | 'Inactive';

export interface Driver {
  id: string;
  ref_id: string | null;
  first_name: string;
  last_name: string;
  phone_primary: string;
  status: DriverStatus;
  license_number: string;
  license_expiry: string;
  avatar_url?: string | null;
  ai_risk_score: number;
  isActive: boolean;
  createdAt: string;
  assignedVehicleId: string | null;
  assignedVehicle?: Vehicle | null;
  trips?: any[];
  documents?: Document[];
}

export interface CreateDriverPayload {
  first_name: string;
  last_name: string;
  phone_primary: string;
  license_number: string;
  license_expiry: string;
  assigned_vehicle_id?: string | null;
  avatar_url?: string | null;
}

export interface DriverUsage {
  activeTrips: number;
  totalTrips: number;
  expenses: number;
}

export interface DriverFilters {
  status?: DriverStatus;
  search?: string;
  page?: number;
  per_page?: number;
  mode?: 'lookup';
}

export const driverService = {
  async getAll(filters: DriverFilters = {}): Promise<ApiResponse<Driver[]>> {
    const res = await api.get<ApiResponse<Driver[]>>('/drivers', { params: filters });
    return res.data;
  },

  async getById(id: string): Promise<Driver> {
    const res = await api.get<ApiResponse<Driver>>(`/drivers/${id}`);
    return res.data.data;
  },

  async create(payload: CreateDriverPayload): Promise<Driver> {
    const res = await api.post<ApiResponse<Driver>>('/drivers', payload);
    return res.data.data;
  },

  async update(id: string, payload: Partial<CreateDriverPayload & { status: DriverStatus }>): Promise<Driver> {
    const res = await api.patch<ApiResponse<Driver>>(`/drivers/${id}`, payload);
    return res.data.data;
  },

  async delete(id: string, password?: string): Promise<void> {
    await api.delete(`/drivers/${id}`, { data: { password } });
  },

  async getUsage(id: string): Promise<DriverUsage> {
    const res = await api.get<ApiResponse<DriverUsage>>(`/drivers/${id}/usage`);
    return res.data.data;
  },

  async bulkDelete(ids: string[]): Promise<{ message: string }> {
    const res = await api.post<ApiResponse<{ message: string }>>('/drivers/bulk-delete', { ids });
    return res.data.data;
  },

  async bulkUpdateStatus(ids: string[], status: string): Promise<void> {
    await api.post('/drivers/bulk-update-status', { ids, status });
  },

  /**
   * Import rows parsed from the fleet workbook in the browser. Matches existing
   * drivers on phone number and updates them, so re-uploading a corrected file
   * fixes people instead of duplicating them.
   */
  async importRows(rows: Record<string, string | number>[]): Promise<ImportSummary> {
    const res = await api.post<ApiResponse<ImportSummary>>('/drivers/import', { rows }, { timeout: 120_000 });
    return res.data.data;
  },
};
