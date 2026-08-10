import { api, ApiResponse } from '@/lib/api';
import type { ImportSummary } from '@/components/fleet/ExcelImportDialog';

export type AssetStatus = 'Available' | 'OnTrip' | 'Maintenance' | 'Inactive';
export type AssetType   = 'Flatbed' | 'Reefer' | 'Box' | 'Tanker';

export interface Vehicle {
  id: string;
  ref_id: string | null;
  plate_number: string;
  asset_type: AssetType;
  status: AssetStatus;
  capacity_kg: number;
  current_odometer: number;
  gps_device_id: string | null;
  trailer_number: string | null;
  trailer_type: AssetType | null;
  trailer_capacity_kg: number | null;
  icces_device_id: string | null;
  last_lat?: number | null;
  last_lng?: number | null;
  last_speed_kph?: number | null;
  last_heading?: number | null;
  last_status?: string | null;
  last_seen_at?: string | null;
  isActive: boolean;
  createdAt: string;
  documents?: import('./documentService').MerconDocument[];
  trips?: any[];
  assignedDriver?: any;
}

export interface CreateVehiclePayload {
  plate_number: string;
  asset_type: AssetType;
  capacity_kg: number;
  trailer_number?: string;
  trailer_type?: AssetType;
  trailer_capacity_kg?: number;
  gps_device_id?: string;
  icces_device_id?: string;
}

export interface VehicleFilters {
  status?: AssetStatus;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface VehicleFinancials {
  vehicle_id: string;
  plate_number: string;
  ref_id: string | null;
  asset_type: AssetType;
  summary: {
    total_income: number;
    total_expenses: number;
    maintenance_expenses: number;
    renewal_expenses: number;
    net_profit: number;
    margin_percent: number;
    completed_trips_count: number;
    total_maintenance_count: number;
  };
  monthly: MonthlyPoint[];
  income_sources: Array<{
    id: string;
    ref_id: string | null;
    status: string;
    customer_name: string;
    date: string;
    income: number;
  }>;
  expense_records: import('./maintenanceService').MaintenanceRecord[];
}

/** One `YYYY-MM` bucket of the income/expense trend series. */
export interface MonthlyPoint {
  month: string;
  income: number;
  expenses: number;
  profit: number;
}

/** A single vehicle's P&L row inside the fleet-wide report. */
export interface FleetVehicleFinancials {
  vehicle_id: string;
  plate_number: string;
  ref_id: string | null;
  asset_type: AssetType;
  status: AssetStatus;
  total_income: number;
  total_expenses: number;
  maintenance_expenses: number;
  renewal_expenses: number;
  net_profit: number;
  margin_percent: number;
  trips_count: number;
  maintenance_count: number;
  income_per_trip: number;
}

export interface FleetFinancials {
  range: { from: string | null; to: string | null };
  fleet_summary: {
    total_income: number;
    total_expenses: number;
    maintenance_expenses: number;
    renewal_expenses: number;
    net_profit: number;
    margin_percent: number;
    vehicles_count: number;
    profitable_count: number;
    loss_making_count: number;
    idle_count: number;
    total_trips: number;
    total_maintenance: number;
  };
  vehicles: FleetVehicleFinancials[];
  monthly: MonthlyPoint[];
}

/** Optional ISO date bounds shared by both financial reports. */
export interface FinancialsRange {
  from?: string;
  to?: string;
}

export const vehicleService = {
  async getAll(filters: VehicleFilters = {}): Promise<ApiResponse<Vehicle[]>> {
    const res = await api.get<ApiResponse<Vehicle[]>>('/vehicles', { params: filters });
    return res.data;
  },

  async getById(id: string): Promise<Vehicle> {
    const res = await api.get<ApiResponse<Vehicle>>(`/vehicles/${id}`);
    return res.data.data;
  },

  async getFinancials(id: string, range: FinancialsRange = {}): Promise<VehicleFinancials> {
    const res = await api.get<ApiResponse<VehicleFinancials>>(`/vehicles/${id}/financials`, { params: range });
    return res.data.data;
  },

  /** Fleet-wide P&L — one row per vehicle, for ranking profit/loss across trucks. */
  async getFleetFinancials(range: FinancialsRange = {}): Promise<FleetFinancials> {
    const res = await api.get<ApiResponse<FleetFinancials>>('/vehicles/financials/fleet', { params: range });
    return res.data.data;
  },

  async create(payload: CreateVehiclePayload): Promise<Vehicle> {
    const res = await api.post<ApiResponse<Vehicle>>('/vehicles', payload);
    return res.data.data;
  },

  async update(id: string, payload: Partial<CreateVehiclePayload & { status: AssetStatus }>): Promise<Vehicle> {
    const res = await api.patch<ApiResponse<Vehicle>>(`/vehicles/${id}`, payload);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/vehicles/${id}`);
  },

  async bulkDelete(ids: string[]): Promise<void> {
    await api.post('/vehicles/bulk-delete', { ids });
  },

  async bulkUpdateStatus(ids: string[], status: string): Promise<void> {
    await api.post('/vehicles/bulk-update-status', { ids, status });
  },

  /**
   * Import rows parsed from the fleet workbook in the browser. Matches existing
   * vehicles on plate number and updates them, so re-uploading a corrected file
   * fixes trucks instead of duplicating them.
   */
  async importRows(rows: Record<string, string | number>[]): Promise<ImportSummary> {
    const res = await api.post<ApiResponse<ImportSummary>>('/vehicles/import', { rows });
    return res.data.data;
  },
};
