/**
 * Operator data — reuses the same backend endpoints the web dashboard uses
 * (operators authenticate with role Operator, which those routes allow).
 *   GET /reports/summary  → dashboard KPIs
 *   GET /trips            → trips (filtered here to active ones)
 */
import { useCallback, useEffect, useState } from 'react';
import { api, getApiErrorMessage } from './api';

export interface Kpi { value: number; delta: number | null }

export interface DashboardSummary {
  kpis: {
    total_trips: Kpi;
    active_drivers: Kpi;
    fleet_available: Kpi;
    fleet_on_trip: Kpi;
    revenue_this_month: Kpi;
    docs_expiring_soon: Kpi;
  };
  trip_status_distribution: Record<string, number>;
  monthly_revenue_chart: { month: string; revenue: number }[];
}

export interface OperatorTrip {
  id: string;
  ref_id: string | null;
  status: string;
  cargo_type: string;
  planned_start?: string | null;
  createdAt?: string;
  customer?: { name: string } | null;
  driver?: { first_name: string; last_name: string } | null;
  vehicle?: { plate_number: string } | null;
}

export const ACTIVE_TRIP_STATUSES = ['Dispatched', 'AtPickup', 'InTransit', 'AtDelivery'];

export const operatorService = {
  async summary(): Promise<DashboardSummary> {
    const { data } = await api.get('/reports/summary');
    return data.data as DashboardSummary;
  },

  async activeTrips(): Promise<OperatorTrip[]> {
    const { data } = await api.get('/trips', { params: { per_page: 50 } });
    const trips = (data.data ?? []) as OperatorTrip[];
    return trips.filter((t) => ACTIVE_TRIP_STATUSES.includes(t.status));
  },

  async trips(): Promise<OperatorTrip[]> {
    const { data } = await api.get('/trips', { params: { per_page: 100 } });
    return (data.data ?? []) as OperatorTrip[];
  },

  async drivers(): Promise<OperatorDriver[]> {
    const { data } = await api.get('/drivers', { params: { per_page: 100 } });
    return (data.data ?? []) as OperatorDriver[];
  },

  async vehicles(): Promise<OperatorVehicle[]> {
    const { data } = await api.get('/vehicles', { params: { per_page: 100 } });
    return (data.data ?? []) as OperatorVehicle[];
  },

  async invoices(): Promise<OperatorInvoice[]> {
    const { data } = await api.get('/invoices', { params: { per_page: 100 } });
    return (data.data ?? []) as OperatorInvoice[];
  },
};

export interface OperatorInvoice {
  id: string;
  ref_id: string | null;
  status: string;
  currency: string;
  total_amount: number;
  due_date: string;
  createdAt: string;
  customer?: { name: string } | null;
  trip?: { ref_id: string | null } | null;
}

export interface OperatorVehicle {
  id: string;
  ref_id: string | null;
  plate_number: string;
  asset_type: string;
  status: string;
  capacity_kg: number;
  current_odometer: number;
}

export interface OperatorDriver {
  id: string;
  ref_id: string | null;
  first_name: string;
  last_name: string;
  phone_primary: string | null;
  status: string;
  license_number: string;
  license_expiry: string;
}

let cacheOperatorTrips: OperatorTrip[] = [];
let isOpTripsFetched = false;

/** Loads all recent trips for the operator trip list. */
export function useOperatorTrips() {
  const [trips, setTrips] = useState<OperatorTrip[]>(cacheOperatorTrips);
  const [loading, setLoading] = useState(!isOpTripsFetched);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (opts?: { showLoading?: boolean } | any) => {
    const showLoading = typeof opts === 'boolean' ? opts : typeof opts?.showLoading === 'boolean' ? opts.showLoading : !isOpTripsFetched;
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await operatorService.trips();
      cacheOperatorTrips = data;
      isOpTripsFetched = true;
      setTrips(data);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { trips, loading, error, refetch };
}

let cacheOperatorDrivers: OperatorDriver[] = [];
let isOpDriversFetched = false;

/** Loads all drivers for the operator driver list. */
export function useOperatorDrivers() {
  const [drivers, setDrivers] = useState<OperatorDriver[]>(cacheOperatorDrivers);
  const [loading, setLoading] = useState(!isOpDriversFetched);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (opts?: { showLoading?: boolean } | any) => {
    const showLoading = typeof opts === 'boolean' ? opts : typeof opts?.showLoading === 'boolean' ? opts.showLoading : !isOpDriversFetched;
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await operatorService.drivers();
      cacheOperatorDrivers = data;
      isOpDriversFetched = true;
      setDrivers(data);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { drivers, loading, error, refetch };
}

let cacheOperatorVehicles: OperatorVehicle[] = [];
let isOpVehiclesFetched = false;

/** Loads all vehicles for the operator vehicle list. */
export function useOperatorVehicles() {
  const [vehicles, setVehicles] = useState<OperatorVehicle[]>(cacheOperatorVehicles);
  const [loading, setLoading] = useState(!isOpVehiclesFetched);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (opts?: { showLoading?: boolean } | any) => {
    const showLoading = typeof opts === 'boolean' ? opts : typeof opts?.showLoading === 'boolean' ? opts.showLoading : !isOpVehiclesFetched;
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await operatorService.vehicles();
      cacheOperatorVehicles = data;
      isOpVehiclesFetched = true;
      setVehicles(data);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { vehicles, loading, error, refetch };
}

let cacheOperatorInvoices: OperatorInvoice[] = [];
let isOpInvoicesFetched = false;

/** Loads all invoices for the operator invoice list. */
export function useOperatorInvoices() {
  const [invoices, setInvoices] = useState<OperatorInvoice[]>(cacheOperatorInvoices);
  const [loading, setLoading] = useState(!isOpInvoicesFetched);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (opts?: { showLoading?: boolean } | any) => {
    const showLoading = typeof opts === 'boolean' ? opts : typeof opts?.showLoading === 'boolean' ? opts.showLoading : !isOpInvoicesFetched;
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await operatorService.invoices();
      cacheOperatorInvoices = data;
      isOpInvoicesFetched = true;
      setInvoices(data);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { invoices, loading, error, refetch };
}

let cacheOperatorSummary: DashboardSummary | null = null;
let cacheOperatorActiveTrips: OperatorTrip[] = [];
let isOpDashboardFetched = false;

/** Loads the operator dashboard (KPIs + active trips) with a manual refetch. */
export function useOperatorDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(cacheOperatorSummary);
  const [activeTrips, setActiveTrips] = useState<OperatorTrip[]>(cacheOperatorActiveTrips);
  const [loading, setLoading] = useState(!isOpDashboardFetched);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (opts?: { showLoading?: boolean } | any) => {
    const showLoading = typeof opts === 'boolean' ? opts : typeof opts?.showLoading === 'boolean' ? opts.showLoading : !isOpDashboardFetched;
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const [s, t] = await Promise.all([operatorService.summary(), operatorService.activeTrips()]);
      cacheOperatorSummary = s;
      cacheOperatorActiveTrips = t;
      isOpDashboardFetched = true;
      setSummary(s);
      setActiveTrips(t);
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { summary, activeTrips, loading, error, refetch };
}
