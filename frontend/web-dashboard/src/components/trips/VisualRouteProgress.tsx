import React, { useMemo } from 'react';
import { Check, Navigation, Truck, MapPin, Flag } from 'lucide-react';
import { formatInDeploymentTz } from '@/lib/datetime';
import { cn } from '@/lib/utils';

interface VisualRouteProgressProps {
  stops: any[];
  tz: string;
  tripStatus?: string;
}

interface NormalizedStop {
  id: string;
  seq: number;
  label: string;
  city: string;
  time: string;
  status: 'completed' | 'current' | 'upcoming';
  isFirst: boolean;
  isLast: boolean;
}

const DEFAULT_STOPS: NormalizedStop[] = [
  { id: '1', seq: 1, label: 'PICKUP', city: 'Riyadh', time: '08:42 AM', status: 'completed', isFirst: true, isLast: false },
  { id: '2', seq: 2, label: 'DESTINATION', city: 'Al Abha', time: 'ETA 20:30 PM', status: 'upcoming', isFirst: false, isLast: true },
];

function getCanonicalCity(stop: any): string {
  if (!stop) return '';
  const rawCity = stop.location?.city || stop.location?.name || stop.location_name || stop.name;
  if (!rawCity) return '';
  return String(rawCity)
    .replace(/\[RETURN:.*?\]/gi, '')
    .replace(/🔁\s*/g, '')
    .replace(/\s*\(\s*\)$/, '')
    .trim();
}

function isTurnaroundPair(prevStop: any, nextStop: any): boolean {
  if (!prevStop || !nextStop) return false;

  const prevLeg = prevStop.leg_index ?? 0;
  const nextLeg = nextStop.leg_index ?? 0;
  const isLegTransition = prevLeg === 0 && nextLeg === 1;

  const prevType = String(prevStop.stop_type || '').toLowerCase();
  const nextType = String(nextStop.stop_type || '').toLowerCase();
  const isDropoffToPickup = (prevType === 'dropoff' || prevType === 'unloading') && (nextType === 'pickup' || nextType === 'loading');

  const prevLocId = prevStop.location_id || prevStop.locationId || prevStop.location?.id;
  const nextLocId = nextStop.location_id || nextStop.locationId || nextStop.location?.id;

  let sameLocation = false;
  if (prevLocId && nextLocId) {
    sameLocation = String(prevLocId) === String(nextLocId);
  } else {
    const prevCity = getCanonicalCity(prevStop);
    const nextCity = getCanonicalCity(nextStop);
    sameLocation = !!prevCity && !!nextCity && prevCity.toLowerCase() === nextCity.toLowerCase();
  }

  return (isLegTransition || isDropoffToPickup) && sameLocation;
}

export default function VisualRouteProgress({ stops, tz, tripStatus }: VisualRouteProgressProps) {
  const isTripFullyCompleted = ['completed', 'invoiced'].includes(String(tripStatus || '').trim().toLowerCase());

  const isRoundTrip = useMemo(() => {
    if (!stops || stops.length < 2) return false;
    return (
      stops.some((st: any) => (st.leg_index ?? 0) === 1) ||
      (stops.length >= 3 && getCanonicalCity(stops[0]).toLowerCase() === getCanonicalCity(stops[stops.length - 1]).toLowerCase())
    );
  }, [stops]);

  const normalizedStops: NormalizedStop[] = useMemo(() => {
    if (!stops || stops.length < 2) return DEFAULT_STOPS;

    const groupedItems: { stops: any[]; isTurnaround: boolean }[] = [];
    let i = 0;
    while (i < stops.length) {
      const currentStop = stops[i];
      const nextStop = stops[i + 1];

      if (
        nextStop &&
        i > 0 &&
        i + 1 < stops.length &&
        isTurnaroundPair(currentStop, nextStop)
      ) {
        groupedItems.push({
          stops: [currentStop, nextStop],
          isTurnaround: true,
        });
        i += 2;
      } else {
        groupedItems.push({
          stops: [currentStop],
          isTurnaround: false,
        });
        i += 1;
      }
    }

    const totalMilestones = groupedItems.length;
    let prevAllCompleted = true;

    return groupedItems.map((group, mIdx) => {
      const isFirst = mIdx === 0;
      const isLast = mIdx === totalMilestones - 1;
      const isTurnaround = group.isTurnaround;

      const allStopsCompleted = group.stops.every((st) => !!st.actual_arrival) || isTripFullyCompleted;
      const isCurrent = !allStopsCompleted && prevAllCompleted;
      if (!allStopsCompleted) {
        prevAllCompleted = false;
      }

      const primaryStop = group.stops[group.stops.length - 1] || group.stops[0];
      const firstStopInGroup = group.stops[0];

      const city = getCanonicalCity(firstStopInGroup) || (isFirst ? 'Origin' : isLast ? 'Destination' : `Stop ${mIdx}`);

      const relevantTime = primaryStop.actual_arrival || firstStopInGroup.actual_arrival || primaryStop.planned_arrival || firstStopInGroup.planned_arrival;
      const timeStr = relevantTime
        ? formatInDeploymentTz(relevantTime, tz, 'hh:mm a')
        : isLast && !isTripFullyCompleted
        ? 'ETA 20:30 PM'
        : '12:00 PM';

      let label = isFirst
        ? 'Pickup'
        : isLast
        ? (isRoundTrip ? 'Return Delivery' : 'Destination')
        : isTurnaround
        ? 'Turnaround'
        : `Stop ${mIdx}`;

      return {
        id: group.stops.map((s) => s.id || s.seq || s.stop_sequence).join('-') || `m-${mIdx}`,
        seq: mIdx + 1,
        label,
        city,
        time: timeStr,
        status: allStopsCompleted ? 'completed' : isCurrent ? 'current' : 'upcoming',
        isFirst,
        isLast,
      };
    });
  }, [stops, tz, tripStatus, isTripFullyCompleted, isRoundTrip]);

  const totalStops = normalizedStops.length;
  const completedCount = normalizedStops.filter((s) => s.status === 'completed').length;
  const progressPercent = Math.round((completedCount / totalStops) * 100);

  const originCity = normalizedStops[0]?.city || 'Origin';
  const turnaroundOrDestCity = useMemo(() => {
    if (isRoundTrip && normalizedStops.length >= 3) {
      const turnaroundNode = normalizedStops.find((s) => (s as any).isTurnaround) || normalizedStops[1];
      return turnaroundNode?.city || 'Turnaround';
    }
    return normalizedStops[normalizedStops.length - 1]?.city || 'Destination';
  }, [isRoundTrip, normalizedStops]);

  const routeTitle = isRoundTrip
    ? `${originCity} → ${turnaroundOrDestCity} · Round Trip`
    : `${originCity} → ${turnaroundOrDestCity} Corridor`;

  return (
    <div className="relative w-full rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden flex flex-col justify-between p-3.5 sm:px-6 sm:py-4 gap-4">
      {/* ── 1. TOP HEADER: ROUTE SUMMARY & PROGRESS STATUS ── */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-xl bg-rose-50 dark:bg-rose-950/50 flex items-center justify-center text-[#FA634E]">
            <Navigation className="w-3.5 h-3.5 fill-current" />
          </div>
          <div>
            <h3 className="font-extrabold text-xs text-[#3E3C3D] dark:text-slate-100 tracking-tight leading-none">
              {routeTitle}
            </h3>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
              {totalStops} Milestones • {isRoundTrip ? 'Round Trip Transit' : 'Direct Commercial Transit'}
            </p>
          </div>
        </div>

        {/* Minimal Progress Pill */}
        <div className="inline-flex items-center gap-2 bg-[#E6F4EA] dark:bg-emerald-950/50 px-3.5 py-1.5 rounded-full border border-[#CEEAD6] dark:border-emerald-800 text-xs font-bold text-[#0F9D58] dark:text-emerald-400 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-[#0F9D58] animate-pulse" />
          <span>{isTripFullyCompleted || progressPercent === 100 ? 'Delivered' : progressPercent > 0 ? 'In Transit' : 'Scheduled'}</span>
        </div>
      </div>

      {/* ── 2. STATE-OF-THE-ART TRANSIT TRACK & MILESTONES ── */}
      <div className="relative w-full flex-1 flex flex-col pt-8 pb-2">
        {/* Progress Track Bar Row */}
        <div className="relative flex items-center justify-between w-full px-6 sm:px-10 h-8">
          {/* Track Line Background (Solid Smooth Green Progress Bar) */}
          <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner flex items-center">
            <div
              className="h-full bg-[#10B981] dark:bg-[#059669] rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Milestone Nodes along the Track Line */}
          {normalizedStops.map((stop) => {
            const isCompleted = stop.status === 'completed';
            const isCurrent = stop.status === 'current';
            const isTruckHere = isCurrent || (isTripFullyCompleted && stop.isLast);

            return (
              <div
                key={`node-${stop.id}`}
                className="relative z-20 flex flex-col items-center justify-center"
              >
                {isTruckHere ? (
                  /* 3D Realistic MERCON Truck aligned perfectly with route line and tick nodes */
                  <div className="relative flex flex-col items-center z-30 transform translate-y-1">
                    <img
                      src="/mercon_truck_3d.png"
                      alt="MERCON Logistics Truck"
                      className="w-24 sm:w-28 h-auto filter drop-shadow-md object-contain select-none pointer-events-none"
                    />
                  </div>
                ) : (
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-200 shadow-xs",
                      isCompleted
                        ? "bg-[#10B981] text-white ring-4 ring-emerald-50 dark:ring-emerald-950/60"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700 ring-4 ring-white dark:ring-slate-900"
                    )}
                  >
                    {isCompleted ? (
                      <Check size={14} className="stroke-[3]" />
                    ) : stop.isFirst ? (
                      <MapPin size={13} />
                    ) : stop.isLast ? (
                      <Flag size={12} />
                    ) : (
                      stop.seq
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Stop Details Row (Matching reference typography: Location -> Badge Pill -> Monospace Time) */}
        <div className="relative flex items-start justify-between w-full px-6 sm:px-10 z-20 mt-4">
          {normalizedStops.map((stop) => {
            const isCompleted = stop.status === 'completed';
            const isCurrent = stop.status === 'current';

            return (
              <div
                key={`card-${stop.id}`}
                className="flex flex-col items-center text-center min-w-[95px] sm:min-w-[120px] max-w-[150px]"
              >
                <span className="font-extrabold text-sm sm:text-base text-[#111827] dark:text-slate-100 tracking-tight truncate w-full text-center" title={stop.city}>
                  {stop.city}
                </span>
                <span
                  className={cn(
                    "mt-1 px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide leading-none transition-all shadow-2xs",
                    isCompleted || stop.isLast
                      ? "bg-[#E6F4EA] text-[#0F9D58] dark:bg-emerald-950/60 dark:text-emerald-300 border border-[#CEEAD6] dark:border-emerald-800"
                      : isCurrent
                      ? "bg-rose-50 text-[#FA634E] dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/80"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/80"
                  )}
                >
                  {stop.label}
                </span>
                <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 mt-1">
                  {stop.time}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
