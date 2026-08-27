import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { api } from './api';

export const workflowStateStore = {
  async getState(tripId: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(`workflow_state_${tripId}`);
      }
      return await SecureStore.getItemAsync(`workflow_state_${tripId}`);
    } catch {
      return null;
    }
  },
  async saveState(tripId: string, state: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(`workflow_state_${tripId}`, state);
        return;
      }
      await SecureStore.setItemAsync(`workflow_state_${tripId}`, state);
    } catch {}
  },
  async clearState(tripId: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(`workflow_state_${tripId}`);
        return;
      }
      await SecureStore.deleteItemAsync(`workflow_state_${tripId}`);
    } catch {}
  }
};

export type TripStatus =
  | 'Scheduled' | 'Loading' | 'InTransit' | 'Delayed'
  | 'Emergency' | 'Completed' | 'Invoiced' | 'Cancelled'
  | 'Draft' | 'Dispatched' | 'AtPickup' | 'AtDelivery';

export type StopType = 'Pickup' | 'Dropoff' | 'Rest' | 'Refuel';

export interface TripStop {
  id: string;
  stop_sequence: number;
  stop_type: StopType;
  location_lat: number;
  location_lng: number;
  /**
   * Where this stop actually is, in three parts — the API has always sent
   * these; the type used to declare only the coordinates, so the app couldn't
   * see them and the driver got a pin with no address.
   *
   *  location_name    short label — "Khamis Sorting Center"
   *  location_address full postal address — what you navigate by
   *  location         the lane endpoint it sits in — "Jeddah"
   */
  location_name: string | null;
  location_address: string | null;
  location?: { id: string; name: string; address: string | null } | null;
  actual_arrival?: string | null;
  actual_departure?: string | null;
}

/** Checks if a string looks like a raw ID, CUID, UUID, or database key. */
export function isIdString(str?: string | null): boolean {
  if (!str || typeof str !== 'string') return true;
  const s = str.trim();
  if (!s) return true;
  // Standard UUID pattern
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return true;
  // Prefixed ID like loc-..., loc_..., trip-..., CUID (cly..., clx...)
  if (/^(loc[-_]|trp[-_]|c[a-z0-9]{20,})/i.test(s)) return true;
  // Hex/alphanumeric string with no spaces, length >= 14
  if (/^[a-z0-9_-]{14,}$/i.test(s) && !s.includes(' ')) return true;
  return false;
}

/** The best single line address for a stop, rejecting raw ID strings. */
export function stopAddress(stop: TripStop | null | undefined, fallback?: string): string | null {
  if (!stop) return fallback ?? null;
  const addr = stop.location_address || stop.location?.address;
  if (addr && typeof addr === 'string' && !isIdString(addr)) {
    return addr.trim();
  }
  const label = stopLabel(stop);
  if (label && label !== fallback) {
    return label;
  }
  return fallback ?? null;
}

/** The best short label for a stop — falls back to nested location name or extracted city, never raw IDs. */
export function stopLabel(stop: TripStop | null | undefined, fallback?: string): string | null {
  if (!stop) return fallback ?? null;

  // 1. Nested Location object's name if valid and not an ID
  if (stop.location?.name && !isIdString(stop.location.name)) {
    return stop.location.name.trim();
  }

  // 2. Direct stop location_name if valid and not an ID
  if (stop.location_name && !isIdString(stop.location_name)) {
    return stop.location_name.trim();
  }

  // 3. Extract city / area from location_address or location.address if present
  const addr = stop.location_address || stop.location?.address;
  if (addr && typeof addr === 'string') {
    const parts = addr.split(',').map((p) => p.trim()).filter((p) => p && !isIdString(p));
    if (parts.length > 0) {
      return parts[0];
    }
  }

  return fallback ?? null;
}

export interface MobileTrip {
  id: string;
  ref_id: string | null;
  status: TripStatus;
  driver_workflow_state?: string | null;
  planned_distance: number | null;
  planned_start?: string | null;
  actual_start?: string | null;
  planned_end: string | null;
  actual_end?: string | null;
  trip_charges?: number | string | null;
  billing_amount?: number | string | null;
  applied_rate?: number | string | null;
  extra_driver_payment?: number | string | null;
  trip_type?: string | null;
  customer?: { id: string; name: string; logo_url?: string | null; avatar_url?: string | null } | null;
  vehicle?: { id: string; plate_number: string } | null;
  stops: TripStop[];
}

/** A road route to the trip's next stop, as MERCON returns it. */
export interface TripRoute {
  /** [lng, lat] pairs, GeoJSON order. */
  geometry: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
  /** Which routing provider answered. Diagnostic only. */
  provider: string;
}

export const tripService = {
  async getCurrent(): Promise<MobileTrip | null> {
    const { data } = await api.get('/mobile/trips/current');
    const trip = data.data as MobileTrip | null;
    if (trip) {
      const localState = await workflowStateStore.getState(trip.id);
      if (localState && !trip.driver_workflow_state) {
        trip.driver_workflow_state = localState;
      } else if (trip.driver_workflow_state) {
        await workflowStateStore.saveState(trip.id, trip.driver_workflow_state);
      }
    }
    return trip;
  },

  /** Past trips (completed / invoiced / cancelled), newest first. */
  async getHistory(limit = 30): Promise<MobileTrip[]> {
    const { data } = await api.get('/mobile/trips/history', { params: { limit } });
    return (data.data ?? []) as MobileTrip[];
  },

  /** Scheduled/upcoming trips for this driver. */
  async getScheduled(): Promise<MobileTrip[]> {
    const { data } = await api.get('/mobile/trips/scheduled');
    return (data.data ?? []) as MobileTrip[];
  },

  /**
   * The road route from where the driver is now to the trip's next stop.
   *
   * Only the origin is sent — the server decides which stop is next and which
   * routing provider to ask, so neither is baked into this app.
   */
  async getRoute(id: string, fromLat: number, fromLng: number): Promise<TripRoute> {
    const { data } = await api.get(`/mobile/trips/${id}/route`, {
      params: { from_lat: fromLat, from_lng: fromLng },
    });
    return data.data as TripRoute;
  },

  /** Details for a specific trip by ID with remote API + list fallback. */
  async getTripDetails(id: string): Promise<MobileTrip | null> {
    try {
      const { data } = await api.get(`/mobile/trips/${id}`);
      if (data?.data) return data.data as MobileTrip;
    } catch {
      // Endpoint not on dev server yet, fallback to list lookup
    }

    try {
      const { data } = await api.get(`/trips/${id}`);
      if (data?.data) return data.data as MobileTrip;
    } catch {
      // Fallback to searching driver trip lists
    }

    // Unstoppable fallback: search history, scheduled, and current trip
    try {
      const [history, scheduled, current] = await Promise.all([
        tripService.getHistory().catch(() => []),
        tripService.getScheduled().catch(() => []),
        tripService.getCurrent().catch(() => null),
      ]);

      const allTrips: MobileTrip[] = [...history, ...scheduled];
      if (current) allTrips.push(current);

      const found = allTrips.find(
        (t) =>
          t.id === id ||
          t.ref_id === id ||
          t.id.slice(0, 8) === id ||
          `TRP-${t.ref_id}` === id ||
          `TRP-${t.id.slice(0, 8)}` === id
      );

      return found ?? null;
    } catch {
      return null;
    }
  },

  async updateStatus(id: string, status: TripStatus, driver_workflow_state?: string, reason?: string): Promise<MobileTrip> {
    if (driver_workflow_state) {
      if (driver_workflow_state === 'COMPLETED') {
        await workflowStateStore.clearState(id);
      } else {
        await workflowStateStore.saveState(id, driver_workflow_state);
      }
    }
    const { data } = await api.post(`/mobile/trips/${id}/status`, { status, driver_workflow_state, reason, notes: reason });
    const trip = data.data as MobileTrip;
    if (driver_workflow_state && !trip.driver_workflow_state) {
      trip.driver_workflow_state = driver_workflow_state;
    }
    return trip;
  },

  /** Upload a cargo (pickup) or POD (delivery) photo and attach it to the trip. */
  async uploadPhoto(
    id: string,
    kind: 'cargo' | 'pod',
    asset: { uri: string; mimeType?: string | null; fileName?: string | null; location?: { latitude: number; longitude: number; timestamp: string } | null },
    legIndex?: number,
    operation?: string,
  ): Promise<void> {
    const form = new FormData();
    form.append('file', {
      uri: asset.uri,
      name: asset.fileName ?? `${kind}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
    } as unknown as Blob);
    form.append('kind', kind);
    if (asset.location) {
      form.append('location_lat', String(asset.location.latitude));
      form.append('location_lng', String(asset.location.longitude));
      form.append('captured_at', String(asset.location.timestamp));
    }
    if (legIndex !== undefined) {
      form.append('leg_index', String(legIndex));
    }
    if (operation) {
      form.append('operation', operation);
    }
    // Don't set Content-Type manually — axios/RN needs to generate it
    // itself so it includes the multipart boundary. A hardcoded header
    // here strips the boundary and the backend fails to parse the body.
    await api.post(`/mobile/trips/${id}/photo`, form);
  },
};

/** Which transitions require a photo first (business rules BR-006 / BR-009). */
export const PHOTO_FOR: Partial<Record<TripStatus, 'cargo' | 'pod'>> = {
  InTransit: 'cargo', // cargo photo required before moving to In Transit
  Completed: 'pod',   // POD photo required before completing
};

/** The next step a driver can take from the current status (null = nothing to do). */
export const NEXT_STEP: Partial<Record<TripStatus, { to: TripStatus; label: string }>> = {
  Draft:      { to: 'Loading',   label: 'Go to Pickup Location' },
  Scheduled:  { to: 'Loading',   label: 'Go to Pickup Location' },
  Loading:    { to: 'InTransit', label: 'Upload Cargo & Start Trip' },
  InTransit:  { to: 'Completed', label: 'Arrived at Delivery / Upload POD' },
  Delayed:    { to: 'InTransit', label: 'Resume Trip' },
  AtPickup:   { to: 'InTransit', label: 'Upload Cargo & Start Trip' },
  AtDelivery: { to: 'Completed', label: 'Arrived at Delivery / Upload POD' },
};

/** Checks if the current time is before the planned start time (early arrival). */
/** Human-friendly label for a status. */
export function statusLabel(s: TripStatus): string {
  switch (s) {
    case 'Draft':
    case 'Dispatched':
    case 'Scheduled': return 'Scheduled';
    case 'AtPickup':
    case 'Loading': return 'Loading';
    case 'InTransit': return 'In Transit';
    case 'Delayed': return 'Delayed';
    case 'Emergency': return 'Emergency';
    case 'AtDelivery':
    case 'Completed': return 'Completed';
    default: return s;
  }
}
