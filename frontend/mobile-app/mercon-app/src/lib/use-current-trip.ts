import { useCallback, useEffect, useState } from 'react';
import { tripService, type MobileTrip } from './trips';
import { getApiErrorMessage } from './api';

let cachedTrip: MobileTrip | null = null;
let isFetched = false;

export function clearCurrentTripCache() {
  cachedTrip = null;
  isFetched = false;
}

/** Loads the driver's current active trip. Uses in-memory caching to eliminate tab-switch flickering. */
export function useCurrentTrip() {
  const [trip, setTripState] = useState<MobileTrip | null>(() => {
    if (cachedTrip && (cachedTrip.status === 'Completed' || cachedTrip.status === 'Invoiced' || cachedTrip.status === 'Cancelled' || cachedTrip.driver_workflow_state === 'COMPLETED')) {
      cachedTrip = null;
    }
    return cachedTrip;
  });
  const [loading, setLoading] = useState(!isFetched);
  const [error, setError] = useState<string | null>(null);

  const setTrip = useCallback((newTrip: MobileTrip | null | ((prev: MobileTrip | null) => MobileTrip | null)) => {
    setTripState((prev) => {
      const next = typeof newTrip === 'function' ? newTrip(prev) : newTrip;
      if (!next || next.status === 'Completed' || next.status === 'Invoiced' || next.status === 'Cancelled' || next.driver_workflow_state === 'COMPLETED') {
        cachedTrip = null;
      } else {
        cachedTrip = next;
      }
      return next;
    });
  }, []);

  const refetch = useCallback(async (opts?: { showLoading?: boolean } | any) => {
    const showLoading = typeof opts === 'boolean' ? opts : typeof opts?.showLoading === 'boolean' ? opts.showLoading : !isFetched;
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const data = await tripService.getCurrent();
      if (!data || data.status === 'Completed' || data.status === 'Invoiced' || data.status === 'Cancelled' || data.driver_workflow_state === 'COMPLETED') {
        cachedTrip = null;
        setTripState(null);
      } else {
        cachedTrip = data;
        setTripState(data);
      }
      isFetched = true;
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { trip, loading, error, refetch, setTrip };
}

