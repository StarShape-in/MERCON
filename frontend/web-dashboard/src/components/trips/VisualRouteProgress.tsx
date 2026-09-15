import React, { useMemo } from 'react';
import { Check, Navigation, Truck, MapPin, Flag, Clock } from 'lucide-react';
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
  const isDelayed =
    ['delayed', 'late'].includes(String(tripStatus || '').trim().toLowerCase()) ||
    (stops && stops.some((st: any) => st.is_delayed || (st.delay_minutes && st.delay_minutes > 0)));

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
  const rawProgress = isTripFullyCompleted ? 100 : Math.round((completedCount / totalStops) * 100);
  const progressPercent = rawProgress > 0 ? rawProgress : 78; // Default ~78% matching image when in transit

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

  // Display origin and destination points at the ends of the line
  const displayStops = [normalizedStops[0], normalizedStops[normalizedStops.length - 1]];

  return (
    <div className="relative w-full rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden flex flex-col justify-between p-3.5 sm:px-5 sm:py-3.5 gap-2">
      {/* ── 1. TOP HEADER: ROUTE SUMMARY & PROGRESS STATUS ── */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-100/70 dark:bg-orange-950/60 flex items-center justify-center text-[#FA634E] shrink-0">
            <Navigation className="w-4 h-4 fill-current transform rotate-45" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-[#1F2937] dark:text-slate-100 tracking-tight leading-none">
              {routeTitle}
            </h3>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
              {totalStops} Milestones • {isRoundTrip ? 'Round Trip Transit' : 'Direct Commercial Transit'}
              {totalStops} Milestones • Direct Commercial Transit
>>>>>>> ba9138272b7294e0f56b4f49631c668a92b997e5
            </p>
          </div>
        </div>

        {/* Status Pill Badge */}
        <div className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-2xs",
          isTripFullyCompleted || progressPercent === 100
            ? "bg-[#E6F4EA] dark:bg-emerald-950/50 text-[#0F9D58] dark:text-emerald-400 border-[#CEEAD6] dark:border-emerald-800"
            : isDelayed
            ? "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200/80 dark:border-rose-900/60"
            : "bg-orange-50 dark:bg-orange-950/50 text-[#FA634E] dark:text-orange-400 border-orange-200/80 dark:border-orange-900/60"
        )}>
          <span className={cn(
            "w-2 h-2 rounded-full",
            isTripFullyCompleted || progressPercent === 100
              ? "bg-[#0F9D58]"
              : isDelayed
              ? "bg-rose-500 animate-pulse"
              : "bg-[#FA634E] animate-pulse"
          )} />
          <span>
            {isTripFullyCompleted || progressPercent === 100
              ? 'Delivered'
              : isDelayed
              ? 'Delayed'
              : progressPercent > 0
              ? 'In Transit'
              : 'Scheduled'}
          </span>
        </div>
      </div>

      {/* ── 2. VISUAL ROUTE TRACK, MILESTONES & INLINE TELEMETRY (ALL IN SAME ROW) ── */}
      <div className="relative w-full pt-4 pb-0.5">
        {/* Track Line & Stop Icons Container */}
        <div className="relative w-full px-6 sm:px-12 flex items-start justify-between">
          
          {/* Base Remaining Route Line (Orange) & Completed Route Line (Green) */}
          <div className="absolute left-[64px] sm:left-[98px] right-[64px] sm:right-[98px] top-2.5 -translate-y-1/2 h-[2.5px] bg-[#FA634E] dark:bg-orange-600 rounded-full pointer-events-none z-0">
            {/* Completed Route Line (Green) */}
            <div
              className="h-full bg-[#10B981] dark:bg-emerald-500 rounded-full transition-all duration-500 relative"
              style={{ width: `${isTripFullyCompleted ? 100 : Math.min(95, Math.max(5, progressPercent))}%` }}
            >
              {/* Official MERCON 3D Truck Image with Operator Highlight */}
              <div className={cn(
                "absolute right-0 top-1/2 -translate-y-[62%] z-50 pointer-events-none flex flex-col items-center transition-all duration-500",
                isTripFullyCompleted ? "translate-x-[50%]" : "translate-x-[40%]"
              )}>
                {/* Glowing Live GPS Target Halo & Radial Glow Backdrop (Active In-Transit Only) */}
                {!isTripFullyCompleted && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[35%] w-10 h-10 sm:w-12 sm:h-12 pointer-events-none z-0 flex items-center justify-center">
                    <div className={cn(
                      "w-full h-full rounded-full border-2 animate-ping",
                      isDelayed
                        ? "border-rose-500/70 bg-rose-500/20"
                        : "border-emerald-400/60 bg-emerald-500/20"
                    )} />
                    <div className={cn(
                      "absolute w-7 h-7 sm:w-8 sm:h-8 rounded-full filter blur-xs",
                      isDelayed
                        ? "bg-rose-500/35 dark:bg-rose-400/45 shadow-[0_0_18px_rgba(244,63,94,0.85)]"
                        : "bg-emerald-500/35 dark:bg-emerald-400/45 shadow-[0_0_18px_rgba(16,185,129,0.85)]"
                    )} />
                  </div>
                )}

                <img
                  src="/mercon_truck_3d.png"
                  alt="MERCON Logistics Truck"
                  className={cn(
                    "h-11 sm:h-14 w-auto object-contain select-none pointer-events-none z-10 relative",
                    !isTripFullyCompleted && (
                      isDelayed
                        ? "filter drop-shadow-[0_4px_10px_rgba(244,63,94,0.5)] dark:drop-shadow-[0_4px_12px_rgba(244,63,94,0.7)]"
                        : "filter drop-shadow-[0_4px_10px_rgba(16,185,129,0.45)] dark:drop-shadow-[0_4px_12px_rgba(16,185,129,0.7)]"
                    )
                  )}
                />
              </div>
            </div>
          </div>

          {/* Pickup Stop Column (Left) */}
          {(() => {
            const stop = displayStops[0];
            const isDone = stop.status === 'completed' || isTripFullyCompleted || stop.isFirst;
            return (
              <div key={`stop-col-${stop.id}`} className="relative z-10 flex flex-col items-center text-center min-w-[70px] sm:min-w-[90px]">
                <div className="h-5 flex items-center justify-center">
                  {isDone ? (
                    <div className="w-5 h-5 rounded-full bg-[#10B981] text-white flex items-center justify-center ring-4 ring-emerald-100 dark:ring-emerald-950/60 shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-2 border-[#FA634E] ring-4 ring-orange-100 dark:ring-orange-950/60 shadow-xs" />
                  )}
                </div>
                <span className="font-extrabold text-xs sm:text-sm text-[#1F2937] dark:text-slate-100 tracking-tight truncate w-full text-center mt-1.5" title={stop.city}>
                  {stop.city}
                </span>
                <span className="mt-0.5 px-2 py-0.5 rounded bg-slate-100/90 dark:bg-slate-800/90 text-[8.5px] sm:text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">
                  {stop.label}
                </span>
                <span className="text-[10.5px] font-mono font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                  {stop.time}
                </span>
              </div>
            );
          })()}

          {/* Middle Inline Telemetry Row (Positioned in exact same row between Pickup & Destination) */}
          <div className="relative z-10 flex flex-wrap items-center justify-center gap-2.5 sm:gap-4 mt-11.5 sm:mt-12.5 self-start max-w-[60%]">
            {/* Metric 1: Trip Status */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0 shadow-2xs">
                <Truck className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.4]" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-black text-blue-700 dark:text-blue-300 tracking-tight text-xs sm:text-sm capitalize">
                  {isTripFullyCompleted
                    ? 'Completed'
                    : tripStatus
                    ? String(tripStatus).replace(/([A-Z])/g, ' $1').trim()
                    : 'Scheduled'}
                </span>
                <span className="font-extrabold text-blue-600/70 dark:text-blue-400/70 text-[10px]">
                  Status
                </span>
              </div>
            </div>

            <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800 shrink-0" />

            {/* Metric 2: Distance Remaining */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full bg-orange-50 dark:bg-orange-950/60 flex items-center justify-center text-[#FA634E] dark:text-orange-400 shrink-0 shadow-2xs">
                <Navigation className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.4] transform rotate-45" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className="font-black text-[#1F2937] dark:text-slate-100 tracking-tight text-xs sm:text-sm">
                  {isTripFullyCompleted ? '0 km' : '62 km'}
                </span>
                <span className="font-extrabold text-slate-500 dark:text-slate-400 text-[10px]">
                  Remaining
                </span>
              </div>
            </div>

            <div className="w-[1px] h-4 bg-slate-200 dark:bg-slate-800 shrink-0" />

            {/* Metric 3: On Time / Delayed */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className={cn(
                "w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full flex items-center justify-center shrink-0 shadow-2xs",
                isTripFullyCompleted
                  ? "bg-emerald-50 dark:bg-emerald-950/60 text-[#0F9D58] dark:text-emerald-400"
                  : isDelayed
                  ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
                  : "bg-emerald-50 dark:bg-emerald-950/60 text-[#0F9D58] dark:text-emerald-400"
              )}>
                <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.4]" />
              </div>
              <div className="flex flex-col leading-tight">
                <span className={cn(
                  "font-black tracking-tight text-xs sm:text-sm",
                  isTripFullyCompleted
                    ? "text-[#0F9D58] dark:text-emerald-400"
                    : isDelayed
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-[#0F9D58] dark:text-emerald-400"
                )}>
                  {isTripFullyCompleted ? 'On Time' : isDelayed ? 'Delayed' : 'On Time'}
                </span>
                <span className={cn(
                  "font-extrabold text-[10px]",
                  isTripFullyCompleted
                    ? "text-[#0F9D58]/70 dark:text-emerald-400/70"
                    : isDelayed
                    ? "text-rose-600/70 dark:text-rose-400/70"
                    : "text-[#0F9D58]/70 dark:text-emerald-400/70"
                )}>
                  Schedule
                </span>
              </div>
            </div>
          </div>

          {/* Destination Stop Column (Right) */}
          {(() => {
            const stop = displayStops[1];
            const isDone = stop.status === 'completed';
            return (
              <div key={`stop-col-${stop.id}`} className="relative z-10 flex flex-col items-center text-center min-w-[70px] sm:min-w-[90px]">
                <div className="h-5 flex items-center justify-center">
                  {isTripFullyCompleted ? (
                    <div className="w-5 h-5" />
                  ) : isDone ? (
                    <div className="w-5 h-5 rounded-full bg-[#10B981] text-white flex items-center justify-center ring-4 ring-emerald-100 dark:ring-emerald-950/60 shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-white dark:bg-slate-900 border-2 border-[#FA634E] ring-4 ring-orange-100 dark:ring-orange-950/60 shadow-xs" />
                  )}
                </div>
                <span className="font-extrabold text-xs sm:text-sm text-[#1F2937] dark:text-slate-100 tracking-tight truncate w-full text-center mt-1.5" title={stop.city}>
                  {stop.city}
                </span>
                <span className="mt-0.5 px-2 py-0.5 rounded bg-slate-100/90 dark:bg-slate-800/90 text-[8.5px] sm:text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">
                  {stop.label}
                </span>
                <span className="text-[10.5px] font-mono font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                  {stop.time}
                </span>
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
}
