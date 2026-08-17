import { useEffect, useRef, useState } from 'react';
import { addMinutes, parseISO, isValid } from 'date-fns';
import { estimateTravelTime, TravelTimeEstimate } from '@/services/travelTimeService';

function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export type EstimatedDeliveryStatus = 'idle' | 'loading' | 'ready' | 'unavailable';

export interface EstimatedDeliveryResult {
  status: EstimatedDeliveryStatus;
  travel: TravelTimeEstimate | null;
  /** Local-input datetime string (`YYYY-MM-DDTHH:mm`), same shape the schedule fields use. */
  estimatedDeliveryLocal: string;
}

/**
 * Derives Estimated Delivery from pickup + dropoff coordinates and Truck
 * Arrival Time, via the Google Maps Distance Matrix. Never invents a delivery
 * time — when the route can't be calculated, callers get `status:
 * 'unavailable'` and an empty `estimatedDeliveryLocal`.
 */
export function useEstimatedDelivery(
  pickupLat: number | null,
  pickupLng: number | null,
  dropoffLat: number | null,
  dropoffLng: number | null,
  truckArrivalTime: string
): EstimatedDeliveryResult {
  const [result, setResult] = useState<EstimatedDeliveryResult>({
    status: 'idle',
    travel: null,
    estimatedDeliveryLocal: '',
  });
  const requestIdRef = useRef(0);

  useEffect(() => {
    const arrival = truckArrivalTime ? parseISO(truckArrivalTime) : null;
    const ready =
      pickupLat != null && pickupLng != null &&
      dropoffLat != null && dropoffLng != null &&
      arrival && isValid(arrival);

    if (!ready) {
      setResult({ status: 'idle', travel: null, estimatedDeliveryLocal: '' });
      return;
    }

    const requestId = ++requestIdRef.current;
    setResult((prev) => ({ ...prev, status: 'loading' }));

    estimateTravelTime(
      { lat: pickupLat as number, lng: pickupLng as number },
      { lat: dropoffLat as number, lng: dropoffLng as number }
    ).then((travel) => {
      if (requestIdRef.current !== requestId) return; // stale response
      if (!travel) {
        setResult({ status: 'unavailable', travel: null, estimatedDeliveryLocal: '' });
        return;
      }
      const delivery = addMinutes(arrival as Date, travel.durationMinutes);
      setResult({ status: 'ready', travel, estimatedDeliveryLocal: toLocalInput(delivery) });
    });
  }, [pickupLat, pickupLng, dropoffLat, dropoffLng, truckArrivalTime]);

  return result;
}
