import { useCallback, useEffect, useState } from 'react';
import { tripService, type MobileTrip } from './trips';
import { getApiErrorMessage } from './api';

/** Loads the driver's past trips (completed / invoiced / cancelled). Mirrors
 *  useCurrentTrip — fetch-on-mount with a manual refetch (no React Query on mobile). */
export function useTripHistory() {
  const [trips, setTrips] = useState<MobileTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTrips(await tripService.getHistory());
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { trips, loading, error, refetch };
}
