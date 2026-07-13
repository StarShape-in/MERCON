import { useCallback, useEffect, useState } from 'react';
import { tripService, type MobileTrip } from './trips';
import { getApiErrorMessage } from './api';

/** Loads the driver's current active trip. Mobile has no React Query, so this
 *  is a small fetch-on-mount hook with a manual refetch. */
export function useCurrentTrip() {
  const [trip, setTrip] = useState<MobileTrip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTrip(await tripService.getCurrent());
    } catch (e) {
      setError(getApiErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  return { trip, loading, error, refetch, setTrip };
}
