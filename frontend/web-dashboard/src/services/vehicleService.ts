import { api, ApiResponse } from '@/lib/api';

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
  isActive: boolean;
  createdAt: string;
  documents?: import('./documentService').MerconDocument[];
}

export interface CreateVehiclePayload {
  plate_number: string;
  asset_type: AssetType;
  capacity_kg: number;
  trailer_number?: string;
  trailer_type?: AssetType;
  trailer_capacity_kg?: number;
  gps_device_id?: string;
}

export interface VehicleFilters {
  status?: AssetStatus;
  search?: string;
  page?: number;
  per_page?: number;
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
};
