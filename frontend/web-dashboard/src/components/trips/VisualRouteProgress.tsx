import React, { useMemo } from 'react';
import { Check, Navigation } from 'lucide-react';
import { formatInDeploymentTz } from '@/lib/datetime';
import { cn } from '@/lib/utils';

interface VisualRouteProgressProps {
  stops: any[];
  tz: string;
}

interface NormalizedStop {
  id: string;
  seq: number;
  label: string;
  city: string;
  time: string;
  status: 'completed' | 'current' | 'upcoming';
}

const DEFAULT_STOPS: NormalizedStop[] = [
  { id: '1', seq: 1, label: 'PICKUP', city: 'Riyadh', time: '08:42 AM', status: 'completed' },
  { id: '2', seq: 2, label: 'STOP 1', city: 'AL ABHA', time: '12:00 PM', status: 'completed' },
  { id: '3', seq: 3, label: 'STOP 2', city: 'Khamis Mushait', time: '12:00 PM', status: 'current' },
  { id: '4', seq: 4, label: 'STOP 3', city: 'Khamis Mushait', time: '12:00 PM', status: 'upcoming' },
  { id: '5', seq: 5, label: 'STOP 4', city: 'Muhayil', time: '12:00 PM', status: 'upcoming' },
  { id: '6', seq: 6, label: 'DESTINATION', city: 'Riyadh', time: 'ETA 20:30 PM', status: 'upcoming' },
];

export default function VisualRouteProgress({ stops, tz }: VisualRouteProgressProps) {
  const normalizedStops: NormalizedStop[] =
    stops && stops.length >= 2
      ? stops.map((st, idx) => {
          const isFirst = idx === 0;
          const isLast = idx === stops.length - 1;
          const isCompleted = !!st.actual_arrival;
          const isCurrent = !isCompleted && (idx === 0 || !!stops[idx - 1]?.actual_arrival);

          const cityName =
            st.location?.city ||
            st.location_name ||
            st.name ||
            (isFirst ? 'Riyadh' : isLast ? 'Al Abha' : `Stop ${idx}`);

          const timeStr = st.actual_arrival
            ? formatInDeploymentTz(st.actual_arrival, tz, 'hh:mm a')
            : st.planned_arrival
            ? (isLast ? `ETA ${formatInDeploymentTz(st.planned_arrival, tz, 'hh:mm a')}` : formatInDeploymentTz(st.planned_arrival, tz, 'hh:mm a'))
            : isLast ? 'ETA 20:30 PM' : '12:00 PM';

          return {
            id: st.id || `stop-${idx}`,
            seq: idx + 1,
            label: isFirst ? 'Pickup' : isLast ? 'Destination' : `Stop ${idx}`,
            city: cityName,
            time: timeStr,
            status: isCompleted ? 'completed' : isCurrent ? 'current' : 'upcoming',
          };
        })
      : DEFAULT_STOPS;

  const totalStops = normalizedStops.length;
  const completedCount = normalizedStops.filter((s) => s.status === 'completed').length;
  const progressPercent = Math.round((completedCount / totalStops) * 100);

  const truckPositionPercent = useMemo(() => {
    if (totalStops <= 1) return 50;
    if (completedCount === totalStops) return 96;
    if (completedCount === 0) return 3;
    const segmentWidth = 100 / (totalStops - 1);
    const completedRatio = (completedCount - 0.5) * segmentWidth;
    return Math.min(94, Math.max(3, completedRatio));
  }, [completedCount, totalStops]);

  return (
    <div className="relative w-full rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden flex flex-col justify-between p-3 sm:px-6 sm:py-3.5 gap-2.5">
      {/* ── 1. TOP HEADER: ROUTE SUMMARY & PROGRESS PILL ── */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[#FA634E]">
            <Navigation className="w-3.5 h-3.5 fill-current" />
          </div>
          <span className="font-bold text-xs text-slate-800 dark:text-slate-200 tracking-tight">
            Highway Transit Corridor
          </span>
          <span className="text-[10.5px] font-medium text-slate-400 hidden sm:inline">
            • {totalStops} Milestones
          </span>
        </div>

        <div className="inline-flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200/80 dark:border-slate-700 shadow-2xs text-xs">
          <span className="font-bold text-slate-700 dark:text-slate-300 text-[10.5px]">
            {completedCount} of {totalStops} stops completed • {progressPercent}%
          </span>
          <div className="w-20 sm:w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── 2. PROPER ROAD HIGHWAY & STOPS ── */}
      <div className="relative w-full flex-1 flex flex-col justify-end pt-1">
        {/* Stop Cards Row (Above the Road) */}
        <div className="relative flex items-end justify-between w-full px-2 sm:px-6 z-20 mb-1.5">
          {normalizedStops.map((stop) => {
            const isCompleted = stop.status === 'completed';
            const isCurrent = stop.status === 'current';

            return (
              <div
                key={`card-${stop.id}`}
                className="flex flex-col items-center text-center min-w-[75px] sm:min-w-[95px] max-w-[130px]"
              >
                <div className="flex flex-col items-center px-2.5 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700 shadow-2xs w-full transition-all hover:bg-white dark:hover:bg-slate-750">
                  <span className="font-extrabold text-[11px] text-slate-900 dark:text-slate-100 tracking-tight leading-tight truncate w-full text-center" title={stop.city}>
                    {stop.city}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider leading-none border",
                      isCompleted
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
                        : isCurrent
                        ? "bg-rose-50 text-[#FA634E] border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900"
                        : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600"
                    )}
                  >
                    {stop.label}
                  </span>
                  <span className="text-[9px] font-mono font-bold text-slate-500 dark:text-slate-400 mt-0.5 leading-none">
                    {stop.time}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Proper Road Track Row (with nodes on the road) */}
        <div className="relative flex items-center justify-between w-full px-2 sm:px-6 h-8 sm:h-9">
          {/* The Asphalt Highway Surface spanning from first stop center to last stop center */}
          <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-7 sm:h-8 bg-[#2B2F38] dark:bg-[#1E2128] rounded-md shadow-[inset_0_2px_4px_rgba(0,0,0,0.35)] flex items-center overflow-hidden border-y-[1.5px] border-slate-500/80 z-0">
            {/* Top white shoulder curb */}
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-slate-200/50" />

            {/* Traveled Highway Progress (illuminated asphalt) */}
            {progressPercent > 0 && (
              <div
                className="absolute top-0 bottom-0 left-0 bg-emerald-500/25 border-r-2 border-emerald-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            )}

            {/* Center highway dashed lane line */}
            <div className="w-full border-t-[2px] border-dashed border-amber-300/85 dark:border-amber-400/80 z-0" />

            {/* Bottom white shoulder curb */}
            <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-slate-200/50" />
          </div>

          {/* Delivery Truck Driving Along Road */}
          <div
            className="absolute top-1/2 -translate-y-1/2 z-10 transition-all duration-700 pointer-events-none drop-shadow-md"
            style={{
              left: `calc(1.5rem + ${Math.max(2, Math.min(94, truckPositionPercent))}% - 22px)`,
            }}
          >
            <div className="relative flex items-center justify-center filter drop-shadow-md">
              <svg viewBox="0 0 64 32" className="w-10 h-5">
                <rect x="2" y="5" width="38" height="19" rx="1.5" fill="#FFFFFF" stroke="#64748B" strokeWidth="1" />
                <line x1="2" y1="14" x2="40" y2="14" stroke="#CBD5E1" strokeWidth="1" />
                <rect x="6" y="9" width="14" height="2.5" rx="1" fill="#FA634E" />
                <path d="M40 10 L52 10 L58 17 L58 24 L40 24 Z" fill="#FA634E" />
                <path d="M42 12 L50 12 L55 17 L42 17 Z" fill="#93C5FD" />
                <rect x="0" y="24" width="60" height="3" fill="#1E293B" />
                <circle cx="10" cy="26.5" r="4" fill="#0F172A" stroke="#94A3B8" strokeWidth="1.2" />
                <circle cx="10" cy="26.5" r="1.5" fill="#FFFFFF" />
                <circle cx="22" cy="26.5" r="4" fill="#0F172A" stroke="#94A3B8" strokeWidth="1.2" />
                <circle cx="22" cy="26.5" r="1.5" fill="#FFFFFF" />
                <circle cx="50" cy="26.5" r="4" fill="#0F172A" stroke="#94A3B8" strokeWidth="1.2" />
                <circle cx="50" cy="26.5" r="1.5" fill="#FFFFFF" />
              </svg>
            </div>
          </div>

          {/* Stop Milestone Circles on the Road */}
          {normalizedStops.map((stop) => {
            const isCompleted = stop.status === 'completed';
            const isCurrent = stop.status === 'current';

            return (
              <div
                key={`node-${stop.id}`}
                className="relative z-20 flex flex-col items-center justify-center min-w-[75px] sm:min-w-[95px]"
              >
                <div
                  className={cn(
                    "w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full flex items-center justify-center font-black text-[11px] transition-all duration-200 shadow-md",
                    isCompleted
                      ? "bg-emerald-600 text-white ring-3 ring-white dark:ring-slate-900"
                      : isCurrent
                      ? "bg-[#FA634E] text-white ring-4 ring-orange-200 dark:ring-orange-950 shadow-orange-500/25 scale-105"
                      : "bg-slate-700 text-slate-200 ring-3 ring-white dark:ring-slate-900 border border-slate-500"
                  )}
                >
                  {isCompleted ? <Check size={13} className="stroke-[3]" /> : stop.seq}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
