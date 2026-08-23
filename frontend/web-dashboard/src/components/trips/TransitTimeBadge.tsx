import { useState, useEffect } from 'react';
import { Clock, Navigation, Check } from 'lucide-react';
import {
  estimateTravelTimeByName,
  calculateArrivalDropoffTime,
  TravelTimeEstimate,
} from '@/services/travelTimeService';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TransitTimeBadgeProps {
  origin: string;
  destination: string;
  originLat?: number | null;
  originLng?: number | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  pickupTime?: string;
  dropoffTime?: string;
  onAutoSetDropoffTime?: (suggestedDropoffTime: string, isOvernight: boolean) => void;
  className?: string;
}

export default function TransitTimeBadge({
  origin,
  destination,
  originLat,
  originLng,
  destinationLat,
  destinationLng,
  pickupTime = '08:00',
  dropoffTime,
  onAutoSetDropoffTime,
  className,
}: TransitTimeBadgeProps) {
  const [estimate, setEstimate] = useState<TravelTimeEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!origin?.trim() || !destination?.trim()) {
      setEstimate(null);
      return;
    }

    setLoading(true);
    estimateTravelTimeByName(origin, destination, originLat, originLng, destinationLat, destinationLng)
      .then((res) => {
        if (isMounted) {
          setEstimate(res);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setEstimate(null);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [origin, destination, originLat, originLng, destinationLat, destinationLng]);

  if (!origin.trim() || !destination.trim()) {
    return null;
  }

  if (loading) {
    return (
      <div className={cn('text-xs text-slate-500 font-medium flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 animate-pulse', className)}>
        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 animate-spin" />
        <span>Calculating transit time...</span>
      </div>
    );
  }

  if (!estimate) {
    return null;
  }

  const arrivalCalc = calculateArrivalDropoffTime(pickupTime, estimate.durationMinutes);

  const handleApply = () => {
    if (onAutoSetDropoffTime) {
      onAutoSetDropoffTime(arrivalCalc.dropoffTime, arrivalCalc.isOvernight);
      setApplied(true);
      setTimeout(() => setApplied(false), 2000);
    }
  };

  return (
    <div className={cn('mt-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2', className)}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        {/* Left Side: Duration, Distance & Source */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Transit:</span>
            <strong className="text-sm font-bold text-slate-900 dark:text-slate-100">{estimate.durationText}</strong>
          </div>

          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
            ({estimate.distanceKm} km)
          </span>

          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            via {estimate.source === 'google_maps' ? 'Google Maps' : 'Saudi Highway Network'}
          </span>
        </div>

        {/* Right Side: Set Arrival Action Button */}
        {onAutoSetDropoffTime && (
          <Button
            type="button"
            variant={applied ? 'default' : 'outline'}
            size="sm"
            onClick={handleApply}
            className={cn(
              'h-7.5 px-3 text-xs font-semibold transition-all cursor-pointer shadow-2xs',
              applied
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-transparent'
                : 'border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
            )}
            title={`Set dropoff time to calculated arrival ${arrivalCalc.formattedArrival}`}
          >
            {applied ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1" />
                <span>Applied</span>
              </>
            ) : (
              <span>Set Arrival: {arrivalCalc.formattedArrival}</span>
            )}
          </Button>
        )}
      </div>

      {/* Subtext Detail Line */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between flex-wrap gap-1.5">
        <span>
          Route: <strong className="font-semibold text-slate-700 dark:text-slate-300">{origin}</strong> → <strong className="font-semibold text-slate-700 dark:text-slate-300">{destination}</strong>
        </span>
        {arrivalCalc.isOvernight && (
          <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 px-2 py-0.5 rounded-md">
            +1 Day Rollover
          </span>
        )}
      </div>
    </div>
  );
}



