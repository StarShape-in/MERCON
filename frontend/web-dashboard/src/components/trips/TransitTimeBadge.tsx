import React, { useEffect, useState } from 'react';
import { Clock, Navigation, Zap, Check, Sparkles, AlertCircle } from 'lucide-react';
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
    return (
      <div className={cn('text-[10px] text-slate-400 italic flex items-center gap-1.5 pt-1', className)}>
        <Navigation className="w-3 h-3 text-slate-300 shrink-0" />
        <span>Select origin & destination to calculate transit time</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn('text-[10px] text-brand font-semibold flex items-center gap-1.5 pt-1 animate-pulse', className)}>
        <Clock className="w-3 h-3 text-brand shrink-0 animate-spin" />
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
    <div className={cn('mt-2 p-2 rounded-lg bg-orange-50/80 border border-orange-200/90 space-y-1.5 animate-fade-in', className)}>
      <div className="flex items-center justify-between flex-wrap gap-1.5">
        <div className="flex items-center gap-1.5">
          <Badge className="bg-brand text-white border-brand font-bold text-[9px] px-1.5 py-0.2 flex items-center gap-1">
            <Clock className="w-2.5 h-2.5" />
            <span>Transit: {estimate.durationText}</span>
          </Badge>
          <span className="text-[10px] font-bold text-slate-700 font-mono">
            ~{estimate.distanceKm} km
          </span>
          <span className="text-[9px] text-slate-400 font-medium">
            ({estimate.source === 'google_maps' ? 'via Google Routes API' : 'Saudi Highway Network'})
          </span>
        </div>

        {onAutoSetDropoffTime && (
          <Button
            type="button"
            size="sm"
            onClick={handleApply}
            className={cn(
              'h-6 text-[10px] font-extrabold px-2 rounded-md transition-all gap-1 shadow-2xs cursor-pointer',
              applied
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-white hover:bg-orange-100 text-brand border border-orange-300'
            )}
            title={`Set dropoff time to calculated arrival ${arrivalCalc.formattedArrival}`}
          >
            {applied ? (
              <>
                <Check className="w-3 h-3" />
                <span>Applied!</span>
              </>
            ) : (
              <>
                <Zap className="w-3 h-3 fill-brand text-brand" />
                <span>Set Arrival: {arrivalCalc.formattedArrival}</span>
              </>
            )}
          </Button>
        )}
      </div>

      <p className="text-[9px] text-orange-950 font-medium leading-tight">
        Estimated truck transit time from <strong className="font-bold text-slate-900">{origin}</strong> to <strong className="font-bold text-slate-900">{destination}</strong> is <strong className="font-bold text-brand">{estimate.durationText}</strong> ({estimate.distanceKm} km). 
        {arrivalCalc.isOvernight && (
          <span className="text-indigo-700 font-bold ml-1">
            🌙 Arrival rolls over into next day (+1 Day).
          </span>
        )}
      </p>
    </div>
  );
}
