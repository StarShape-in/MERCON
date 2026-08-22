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
    <div className={cn('mt-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-indigo-800/50 shadow-md space-y-2.5 animate-fade-in relative overflow-hidden', className)}>
      {/* Background Subtle Accent Glow */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="flex items-center justify-between flex-wrap gap-2.5 relative z-10">
        {/* Left Side: Duration & Distance Pill */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white border-0 font-extrabold text-xs sm:text-sm px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
            <Clock className="w-4 h-4 text-indigo-200" />
            <span>Transit: {estimate.durationText}</span>
          </Badge>

          <span className="text-xs sm:text-sm font-bold text-indigo-100 font-mono bg-white/10 backdrop-blur-sm px-3 py-1 rounded-xl border border-white/10 shadow-2xs flex items-center gap-1">
            <Navigation className="w-3.5 h-3.5 text-indigo-300" />
            ~{estimate.distanceKm} km
          </span>

          <span className="text-[11px] text-slate-400 font-medium">
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
              'h-8.5 text-xs font-black px-3.5 rounded-xl transition-all gap-1.5 shadow-sm cursor-pointer border-0 active:scale-95',
              applied
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white'
            )}
            title={`Set dropoff time to calculated arrival ${arrivalCalc.formattedArrival}`}
          >
            {applied ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Applied!</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-amber-100 text-amber-100" />
                <span>Set Arrival: {arrivalCalc.formattedArrival}</span>
              </>
            )}
          </Button>
        )}
      </div>

      {/* Bottom Description & Rollover Badge */}
      <div className="flex items-start gap-1.5 text-xs text-slate-300 font-medium leading-snug pt-0.5 relative z-10">
        <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
        <p className="flex-1">
          Estimated truck transit time from <strong className="font-bold text-white">{origin}</strong> to <strong className="font-bold text-white">{destination}</strong> is <strong className="font-black text-amber-400 text-sm">{estimate.durationText}</strong> ({estimate.distanceKm} km).
          {arrivalCalc.isOvernight && (
            <span className="bg-amber-500/20 text-amber-300 font-extrabold text-[11px] px-2 py-0.5 rounded-md inline-flex items-center gap-1 border border-amber-500/30 ml-2 shadow-2xs">
              <Moon className="w-3.5 h-3.5 text-amber-400 fill-amber-400/40 inline" />
              <span>Arrival rolls over into next day (+1 Day)</span>
            </span>
          )}
        </p>
      </div>
    </div>
  );
}


