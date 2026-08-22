import { useState, useEffect } from 'react';
import { Clock, Navigation, Zap, Check, Sparkles, AlertCircle, Moon } from 'lucide-react';
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
      <div className={cn('text-xs text-brand font-bold flex items-center gap-2 p-3 rounded-xl bg-orange-50/70 border border-orange-200/80 animate-pulse', className)}>
        <Clock className="w-4 h-4 text-brand shrink-0 animate-spin" />
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
    <div className={cn('mt-2.5 p-3.5 sm:p-4 rounded-xl bg-orange-50/90 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/40 space-y-2 animate-fade-in shadow-xs', className)}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-brand text-white border-brand font-black text-xs sm:text-sm px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-xs">
            <Clock className="w-4 h-4" />
            <span>Transit: {estimate.durationText}</span>
          </Badge>
          <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 font-mono bg-white/90 dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-2xs">
            ~{estimate.distanceKm} km
          </span>
          <span className="text-xs text-slate-500 font-medium">
            ({estimate.source === 'google_maps' ? 'via Google Routes API' : 'Saudi Highway Network'})
          </span>
        </div>

        {onAutoSetDropoffTime && (
          <Button
            type="button"
            size="sm"
            onClick={handleApply}
            className={cn(
              'h-8 text-xs font-bold px-3 rounded-lg transition-all gap-1.5 shadow-xs cursor-pointer',
              applied
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-white hover:bg-orange-100 text-brand border border-orange-300 dark:bg-slate-900 dark:border-orange-800'
            )}
            title={`Set dropoff time to calculated arrival ${arrivalCalc.formattedArrival}`}
          >
            {applied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Applied!</span>
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 fill-brand text-brand" />
                <span>Set Arrival: {arrivalCalc.formattedArrival}</span>
              </>
            )}
          </Button>
        )}
      </div>

      <p className="text-xs text-orange-950 dark:text-orange-200 font-medium leading-relaxed">
        Estimated truck transit time from <strong className="font-bold text-slate-900 dark:text-slate-100">{origin}</strong> to <strong className="font-bold text-slate-900 dark:text-slate-100">{destination}</strong> is <strong className="font-black text-brand text-sm">{estimate.durationText}</strong> ({estimate.distanceKm} km). 
        {arrivalCalc.isOvernight && (
          <span className="text-indigo-700 dark:text-indigo-400 font-bold ml-1 inline-flex items-center gap-1">
            <Moon className="w-3.5 h-3.5 text-indigo-600 fill-indigo-200 inline" />
            <span>Arrival rolls over into next day (+1 Day).</span>
          </span>
        )}
      </p>
    </div>
  );
}

