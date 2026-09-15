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

export default function VisualRouteProgress({ stops, tz, tripStatus }: VisualRouteProgressProps) {
  const isTripFullyCompleted = ['completed', 'invoiced'].includes(String(tripStatus || '').trim().toLowerCase());

  const normalizedStops: NormalizedStop[] =
    stops && stops.length >= 2
      ? stops.map((st, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === stops.length - 1;
          const isCompleted = !!st.actual_arrival || isTripFullyCompleted;
          const isCurrent = !isCompleted && (idx === 0 || !!stops[idx - 1]?.actual_arrival);

          const rawCity = st.location?.city || st.location?.name || st.location_name || st.name;
          const cityName = rawCity
            ? String(rawCity).replace(/\s*\(\s*\)$/, '').trim()
            : (isFirst ? 'Riyadh' : isLast ? 'Al Abha' : `Stop ${idx}`);

          const timeStr = st.actual_arrival
            ? formatInDeploymentTz(st.actual_arrival, tz, 'hh:mm a')
            : st.planned_arrival
            ? (isLast && !isTripFullyCompleted ? `ETA ${formatInDeploymentTz(st.planned_arrival, tz, 'hh:mm a')}` : formatInDeploymentTz(st.planned_arrival, tz, 'hh:mm a'))
            : isLast && !isTripFullyCompleted ? 'ETA 20:30 PM' : '12:00 PM';

          return {
            id: st.id || `stop-${idx}`,
            seq: idx + 1,
            label: isFirst ? 'Pickup' : isLast ? 'Destination' : `Stop ${idx}`,
            city: cityName,
            time: timeStr,
            status: isCompleted ? 'completed' : isCurrent ? 'current' : 'upcoming',
            isFirst,
            isLast,
          };
        })
      : DEFAULT_STOPS;

  const totalStops = normalizedStops.length;
  const completedCount = normalizedStops.filter((s) => s.status === 'completed').length;
  const progressPercent = Math.round((completedCount / totalStops) * 100);

  // Position vehicle marker along progress track
  const truckPositionPercent = useMemo(() => {
    if (totalStops <= 1) return 50;
    if (completedCount === totalStops) return 98;
    if (completedCount === 0) return 2;
    const segmentWidth = 100 / (totalStops - 1);
    const completedRatio = (completedCount - 0.5) * segmentWidth;
    return Math.min(96, Math.max(2, completedRatio));
  }, [completedCount, totalStops]);

  const outboundStops = stops && stops.length >= 2 ? stops.filter((st) => (st.leg_index ?? 0) === 0) : [];
  const targetDropoff = outboundStops.length > 1 ? outboundStops[outboundStops.length - 1] : (stops && stops.length > 1 ? stops[stops.length - 1] : undefined);

  const originCity = normalizedStops[0]?.city || 'Origin';
  const destCity = targetDropoff
    ? String(targetDropoff.location?.city || targetDropoff.location?.name || targetDropoff.location_name || targetDropoff.name || '').replace(/\s*\(\s*\)$/, '').trim()
    : (normalizedStops[normalizedStops.length - 1]?.city || 'Destination');
  const routeTitle = `${originCity} → ${destCity} Corridor`;

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
              {totalStops} Milestones • Direct Commercial Transit
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
