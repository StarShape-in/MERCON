import { api, ApiResponse } from '@/lib/api';
import type { MerconDocument } from '@/services/documentService';

/** entity_type used when attaching workshop invoices to a service order. */
export const MAINTENANCE_ENTITY_TYPE = 'MaintenanceRecord';

export type MaintenanceType = 'Routine' | 'Repair' | 'Inspection' | 'Renewal' | 'Emergency';
export type MaintenanceStatus = 'Scheduled' | 'In_Progress' | 'Completed' | 'Cancelled';

export interface MaintenanceRecord {
  id: string;
  /** Sequential service-order number, e.g. "MNT-001". Null only for un-backfilled rows. */
  ref_id?: string | null;
  vehicleId: string;
  workshop_name: string;
  workshop_contact?: string | null;
  maintenance_type: MaintenanceType;
  status: MaintenanceStatus;
  start_date: string;
  end_date?: string | null;
  service_date: string;
  work_done?: string | null;
  odometer_reading: number;
  cost: number;
  invoice_number?: string | null;
  invoice_url?: string | null;
  next_service_due?: string | null;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
  vehicle?: {
    id: string;
    plate_number: string;
    ref_id: string | null;
    asset_type: string;
    status: string;
    current_odometer: number;
    capacity_kg?: number;
    deletedAt?: string | null;
  };
  /** Only returned by the detail endpoint. */
  documents?: MerconDocument[];
}

export interface CreateMaintenancePayload {
  vehicle_id: string;
  workshop_name: string;
  workshop_contact?: string;
  maintenance_type: MaintenanceType;
  status?: MaintenanceStatus;
  start_date?: string;
  end_date?: string;
  service_date?: string;
  work_done?: string;
  odometer_reading: number;
  cost?: number;
  invoice_number?: string;
  invoice_url?: string;
  next_service_due?: string;
  remarks?: string;
}

export interface UpdateMaintenancePayload extends Partial<CreateMaintenancePayload> {}

export interface MaintenanceFilters {
  vehicle_id?: string;
  status?: string;
  maintenance_type?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface MaintenanceKpis {
  total_cost: number;
  active_count: number;
  scheduled_count: number;
  completed_count: number;
  renewal_cost: number;
}

export interface MaintenanceListResponse {
  success: boolean;
  data: MaintenanceRecord[];
  kpis?: MaintenanceKpis;
  meta: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

/** A workshop available in the system (saved or derived from service orders). */
export interface Workshop {
  id?: string;
  name: string;
  contact: string | null;
  address?: string | null;
  notes?: string | null;
  is_saved?: boolean;
  order_count: number;
  last_used?: string;
}

export interface SavedWorkItem {
  id: string;
  title: string;
  category?: string | null;
  createdAt?: string;
}

export const maintenanceService = {
  async getAll(filters: MaintenanceFilters = {}): Promise<MaintenanceListResponse> {
    const res = await api.get<MaintenanceListResponse>('/maintenance', { params: filters });
    return res.data;
  },

  /** Workshops (both explicitly saved and derived from service orders). */
  async getWorkshops(): Promise<Workshop[]> {
    const res = await api.get<ApiResponse<Workshop[]>>('/maintenance/workshops');
    return res.data.data;
  },

  async createWorkshop(payload: { name: string; contact_phone?: string; address?: string; notes?: string }): Promise<Workshop> {
    const res = await api.post<ApiResponse<Workshop>>('/maintenance/workshops', payload);
    return res.data.data;
  },

  async deleteWorkshop(id: string): Promise<void> {
    await api.delete(`/maintenance/workshops/${id}`);
  },

  /** For a name that was only ever typed into a record, never saved — clears it off every record that used it. */
  async clearWorkshopName(name: string): Promise<void> {
    await api.delete('/maintenance/workshops/by-name', { params: { name } });
  },

  /** Saved work items / service details presets. */
  async getWorkItems(): Promise<SavedWorkItem[]> {
    const res = await api.get<ApiResponse<SavedWorkItem[]>>('/maintenance/work-items');
    return res.data.data;
  },

  async createWorkItem(payload: { title: string; category?: string }): Promise<SavedWorkItem> {
    const res = await api.post<ApiResponse<SavedWorkItem>>('/maintenance/work-items', payload);
    return res.data.data;
  },

  async deleteWorkItem(id: string): Promise<void> {
    await api.delete(`/maintenance/work-items/${id}`);
  },

  async getById(id: string): Promise<MaintenanceRecord> {
    const res = await api.get<ApiResponse<MaintenanceRecord>>(`/maintenance/${id}`);
    return res.data.data;
  },

  async create(payload: CreateMaintenancePayload): Promise<MaintenanceRecord> {
    const res = await api.post<ApiResponse<MaintenanceRecord>>('/maintenance', payload);
    return res.data.data;
  },

  async update(id: string, payload: UpdateMaintenancePayload): Promise<MaintenanceRecord> {
    const res = await api.patch<ApiResponse<MaintenanceRecord>>(`/maintenance/${id}`, payload);
    return res.data.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/maintenance/${id}`);
  },

  /**
   * Closes every open service order on a vehicle and puts it back to Available.
   */
  async returnVehicleToService(vehicleId: string): Promise<{ closed_orders: number }> {
    const res = await api.post<ApiResponse<{ closed_orders: number }>>(
      `/maintenance/vehicles/${vehicleId}/return-to-service`,
    );
    return res.data.data;
  },
};
