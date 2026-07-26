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
};

/** Loads the operator dashboard (KPIs + active trips) with a manual refetch. */
export function useOperatorDashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [activeTrips, setActiveTrips] = useState<OperatorTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, t] = await Promise.all([operatorService.summary(), operatorService.activeTrips()]);
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
