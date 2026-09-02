import React, { useState, useEffect } from 'react';
import { Clock, Navigation, MapPin, CheckCircle2, ArrowRight } from 'lucide-react';
import { getArrow } from 'curved-arrows';
import {
  estimateTravelTimeByName,
  calculateArrivalDropoffTime,
  TravelTimeEstimate,
} from '@/services/travelTimeService';
import { cn, isUuid } from '@/lib/utils';

interface TransitTimeBadgeProps {
  origin: string;
  destination: string;
  returnDestination?: string;
  isRoundTrip?: boolean;
  intermediateLocations?: string[];
  returnIntermediateLocations?: string[];
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
  returnDestination,
  isRoundTrip,
  intermediateLocations = [],
  returnIntermediateLocations = [],
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

  // Auto-update dropoff time when estimate or pickupTime changes
  useEffect(() => {
    if (estimate && onAutoSetDropoffTime && pickupTime) {
      const arrivalCalc = calculateArrivalDropoffTime(pickupTime, estimate.durationMinutes);
      onAutoSetDropoffTime(arrivalCalc.dropoffTime, arrivalCalc.isOvernight);
    }
  }, [estimate, pickupTime, onAutoSetDropoffTime]);

  if (!origin.trim() || !destination.trim()) {
    return null;
  }

  if (loading) {
    return (
      <div className={cn('p-3.5 rounded-2xl bg-[#FFF5F2] border border-[#FFDCD6] text-xs font-semibold text-[#FA634E] flex items-center gap-2 animate-pulse', className)}>
        <Clock className="w-4 h-4 text-[#FA634E] shrink-0 animate-spin" />
        <span>Calculating transit estimate...</span>
      </div>
    );
  }

  if (!estimate) {
    return null;
  }

  const arrivalCalc = calculateArrivalDropoffTime(pickupTime, estimate.durationMinutes);

  return (
    <div className={cn('p-3.5 rounded-2xl bg-[#FFF5F2] border border-[#FFDCD6] space-y-2.5 text-[#3E3C3D] shadow-2xs', className)}>
      {/* Top Bar: Transit Time Pill + Distance + Source */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FA634E] text-white text-xs font-extrabold shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-white" />
            <span>Transit: {estimate.durationText}</span>
          </span>

          <span className="text-xs font-extrabold text-[#FA634E]">
            ({estimate.distanceKm} km)
          </span>
        </div>

        <span className="text-[10px] font-semibold text-slate-500">
          via {estimate.source === 'google_maps' ? 'Google Maps' : 'Saudi Highway Network'}
        </span>
      </div>

      {/* Prominently Highlighted Selected Route Path (2-Row Loop for Round Trips) */}
      <div className="pt-2 border-t border-[#FFDCD6] space-y-1.5">
        <span className="text-[10px] font-extrabold text-[#FA634E] uppercase tracking-wider block">
          EVALUATED ROUTE PATH:
        </span>

        {isRoundTrip ? (() => {
          // Resolve clean display names (strip raw UUIDs)
          const cleanOriginName = isUuid(origin) ? '' : origin;
          const cleanDestName = isUuid(destination) ? '' : destination;
          const cleanReturnDestName = !returnDestination || isUuid(returnDestination)
            ? (cleanOriginName || cleanDestName || 'Origin')
            : returnDestination;

          return (
            <div className="space-y-2 py-1">
              {/* ROW 1: LEG 1 OUTBOUND SEQUENCE */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs font-extrabold">
                <span className="px-2.5 py-1 rounded-xl bg-white border border-[#FFDCD6] text-[#3E3C3D] shadow-2xs flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{cleanOriginName || 'Origin'}</span>
                </span>

                {intermediateLocations.map((stopName, idx) => (
                  <React.Fragment key={idx}>
                    <ArrowRight className="w-3.5 h-3.5 text-[#FA634E] shrink-0" />
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
                      <span>Stop #{idx + 1}: {isUuid(stopName) ? `Stop ${idx + 1}` : stopName}</span>
                    </span>
                  </React.Fragment>
                ))}

                <ArrowRight className="w-4 h-4 text-[#FA634E] shrink-0" />

                <span className="px-2.5 py-1 rounded-xl bg-white border border-[#FFDCD6] text-[#3E3C3D] shadow-2xs flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand shrink-0" />
                  <span>{cleanDestName || 'Destination'}</span>
                </span>
              </div>

              {/* ROW 2: LEG 2 RETURN SEQUENCE */}
              <div className="flex items-center gap-1.5 flex-wrap text-xs font-extrabold pl-3">
                <span className="px-2.5 py-0.5 rounded-full bg-orange-100/90 border border-[#FFDCD6] text-[#FA634E] text-[10px] uppercase font-extrabold tracking-wider">
                  Return Loop
                </span>

                {returnIntermediateLocations.map((stopName, idx) => (
                  <React.Fragment key={idx}>
                    <ArrowRight className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                    <span className="px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-800 text-[11px] font-bold flex items-center gap-1">
                      <span>Ret Stop #{idx + 1}: {isUuid(stopName) ? `Ret Stop ${idx + 1}` : stopName}</span>
                    </span>
                  </React.Fragment>
                ))}

                <ArrowRight className="w-3.5 h-3.5 text-purple-600 shrink-0" />

                <span className="px-2.5 py-1 rounded-xl bg-white border border-purple-200 text-[#3E3C3D] shadow-2xs flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>{cleanReturnDestName}</span>
                </span>
              </div>
            </div>
          );
        })() : (
          /* SINGLE TRIP 1-ROW PATH */
          <div className="flex items-center gap-2 flex-wrap text-xs font-extrabold">
            <span className="px-2.5 py-1 rounded-xl bg-white border border-[#FFDCD6] text-[#3E3C3D] shadow-2xs flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{origin}</span>
            </span>

            <ArrowRight className="w-4 h-4 text-[#FA634E] shrink-0" />

            <span className="px-2.5 py-1 rounded-xl bg-[#FFF5F2] border border-[#FFDCD6] text-[#3E3C3D] shadow-2xs flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-brand shrink-0" />
              <span>{destination}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
