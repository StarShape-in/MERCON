import { api, ApiResponse } from '@/lib/api';

export type TripStatus = 'Draft' | 'Dispatched' | 'AtPickup' | 'InTransit' | 'AtDelivery' | 'Completed' | 'Invoiced' | 'Cancelled';

export interface Trip {
  id: string;
  ref_id: string;
  status: TripStatus;
  cargo_type: string;
  hazmat_flag: boolean;
  planned_start: string | null;
  actual_start: string | null;
  planned_end: string | null;
  actual_end: string | null;
  planned_distance: number | null;
  extra_driver_payment: number | null;
  payment_reason: string | null;
  payment_status: string | null;
  createdAt: string;
  customer?: { id: string; name: string; contact_phone: string };
  driver?: { id: string; ref_id: string; first_name: string; last_name: string; phone_primary: string; ai_risk_score?: number } | null;
  vehicle?: { id: string; ref_id: string; plate_number: string; asset_type: string } | null;
  stops?: TripStop[];
  invoices?: { id: string; ref_id: string; total_amount: number; status: string }[];
}

export interface TripStop {
  id: string;
  stop_sequence: number;
  stop_type: 'Pickup' | 'Dropoff' | 'Rest' | 'Refuel';
  location_lat: number;
  location_lng: number;
  planned_arrival: string | null;
  actual_arrival: string | null;
}

export interface CreateTripPayload {
  customer_id: string;
  driver_id?: string;
  vehicle_id?: string;
  cargo_type: string;
  hazmat_flag?: boolean;
  planned_start?: string;
  stops: { stop_type: string; lat: number; lng: number; planned_arrival?: string }[];
}

export interface TripFilters {
  status?: TripStatus;
  driver_id?: string;
  customer_id?: string;
  page?: number;
  per_page?: number;
}

export const tripService = {
  async getAll(filters: TripFilters = {}): Promise<ApiResponse<Trip[]>> {
    const res = await api.get<ApiResponse<Trip[]>>('/trips', { params: filters });
    return res.data;
  },

  async getById(id: string): Promise<Trip> {
    const res = await api.get<ApiResponse<Trip>>(`/trips/${id}`);
    return res.data.data;
  },

  async create(payload: CreateTripPayload): Promise<Trip> {
    const res = await api.post<ApiResponse<Trip>>('/trips', payload);
    return res.data.data;
  },

  async updateStatus(id: string, status: TripStatus): Promise<Trip> {
    const res = await api.patch<ApiResponse<Trip>>(`/trips/${id}/status`, { status });
    return res.data.data;
  },

  async approvePayment(id: string, amount: number, reason: string): Promise<Trip> {
    const res = await api.post<ApiResponse<Trip>>(`/trips/${id}/payment/approve`, { amount, reason });
    return res.data.data;
  },
};
