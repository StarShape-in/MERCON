/**
 * Driver trip API — talks to the mobile trip endpoints.
 *   GET  /mobile/trips/current      → the driver's active trip (or null)
 *   POST /mobile/trips/:id/status   → advance the trip's status
 */
import { api } from './api';

export type TripStatus =
  | 'Draft' | 'Dispatched' | 'AtPickup' | 'InTransit'
  | 'AtDelivery' | 'Completed' | 'Invoiced' | 'Cancelled';

export type StopType = 'Pickup' | 'Dropoff' | 'Rest' | 'Refuel';

export interface TripStop {
  id: string;
  stop_sequence: number;
  stop_type: StopType;
  location_lat: number;
  location_lng: number;
}

export interface MobileTrip {
  id: string;
  ref_id: string | null;
  status: TripStatus;
  cargo_type: string;
  planned_distance: number | null;
  planned_end: string | null;
  customer?: { id: string; name: string } | null;
  vehicle?: { id: string; plate_number: string } | null;
  stops: TripStop[];
}

export const tripService = {
  async getCurrent(): Promise<MobileTrip | null> {
    const { data } = await api.get('/mobile/trips/current');
    return data.data as MobileTrip | null;
  },

  async updateStatus(id: string, status: TripStatus): Promise<MobileTrip> {
    const { data } = await api.post(`/mobile/trips/${id}/status`, { status });
    return data.data as MobileTrip;
  },
};

/** The next step a driver can take from the current status (null = nothing to do). */
export const NEXT_STEP: Partial<Record<TripStatus, { to: TripStatus; label: string }>> = {
  Dispatched: { to: 'AtPickup',   label: 'Arrived at Pickup' },
  AtPickup:   { to: 'InTransit',  label: 'Start Trip (Picked Up)' },
  InTransit:  { to: 'AtDelivery', label: 'Arrived at Delivery' },
  AtDelivery: { to: 'Completed',  label: 'Complete Delivery' },
};

/** Human-friendly label for a status. */
export function statusLabel(s: TripStatus): string {
  switch (s) {
    case 'AtPickup': return 'At Pickup';
    case 'InTransit': return 'In Transit';
    case 'AtDelivery': return 'At Delivery';
    default: return s;
  }
}
