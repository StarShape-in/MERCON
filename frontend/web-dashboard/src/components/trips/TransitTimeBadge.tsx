import { useState, useEffect } from 'react';
import { Clock, Zap, Check, Moon, Navigation, MapPin } from 'lucide-react';
import {
  estimateTravelTimeByName,
  calculateArrivalDropoffTime,
  TravelTimeEstimate,
} from '@/services/travelTimeService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TransitTimeBadgeProps {
  origin: string;
  destination: string;
  pickupTime?: string;
  dropoffTime?: string;
  onAutoSetDropoffTime?: (suggestedDropoffTime: string, isOvernight: boolean) => void;
  className?: string;
}

export default function TransitTimeBadge({
  origin,
  destination,
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

    if (!origin.trim() || !destination.trim()) {
      setEstimate(null);
      return;
    }

    setLoading(true);
    estimateTravelTimeByName(origin, destination)
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
  }, [origin, destination]);

  if (!origin.trim() || !destination.trim()) {
    return null;
  }

  if (loading) {
    return (
      <div className={cn('text-xs text-indigo-700 dark:text-indigo-300 font-bold flex items-center gap-2 p-3.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/70 dark:border-indigo-800/40 animate-pulse', className)}>
        <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 animate-spin" />
        <span>Calculating Google Maps transit time...</span>
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
    <div className={cn('mt-3 p-3.5 sm:p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 border-l-4 border-l-indigo-600 dark:border-l-indigo-500 shadow-xs space-y-3 animate-fade-in', className)}>
      <div className="flex items-center justify-between flex-wrap gap-2.5">
        {/* Left Side: Duration & Distance Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-indigo-50 text-indigo-700 border border-indigo-200/80 dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800/80 font-extrabold text-xs sm:text-sm px-3.5 py-1.5 rounded-xl flex items-center gap-2 shadow-2xs">
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Transit: {estimate.durationText}</span>
          </Badge>

          <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 font-mono bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-slate-400" />
            ~{estimate.distanceKm} km
          </span>

          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
            ({estimate.source === 'google_maps' ? 'via Google Routes API' : 'Saudi Highway Network'})
          </span>
        </div>

        {/* Right Side: Set Arrival Action Button */}
        {onAutoSetDropoffTime && (
          <Button
            type="button"
            size="sm"
            onClick={handleApply}
            className={cn(
              'h-9 text-xs sm:text-sm font-extrabold px-4 rounded-xl transition-all gap-2 shadow-xs cursor-pointer border-0 active:scale-98',
              applied
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            )}
            title={`Set dropoff time to calculated arrival ${arrivalCalc.formattedArrival}`}
          >
            {applied ? (
              <>
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Applied!</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>Set Arrival: {arrivalCalc.formattedArrival}</span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* Bottom Description & Rollover Badge */}
      <div className="flex items-start gap-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed pt-2 border-t border-slate-200/60 dark:border-slate-800">
        <MapPin className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
        <p className="flex-1">
          Estimated truck transit time from <strong className="font-bold text-slate-900 dark:text-slate-100">{origin}</strong> to <strong className="font-bold text-slate-900 dark:text-slate-100">{destination}</strong> is <strong className="font-extrabold text-indigo-600 dark:text-indigo-400">{estimate.durationText}</strong> ({estimate.distanceKm} km).
          {arrivalCalc.isOvernight && (
            <span className="bg-amber-50 text-amber-800 border border-amber-200/90 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/80 font-bold text-xs px-2.5 py-0.5 rounded-lg inline-flex items-center gap-1.5 ml-2 shadow-2xs">
              <Moon className="w-3.5 h-3.5 text-amber-600 fill-amber-300 inline" />
              <span>Arrival rolls over into next day (+1 Day)</span>
            </span>
          )}
        </p>
      </div>
    </div>
  );
}


