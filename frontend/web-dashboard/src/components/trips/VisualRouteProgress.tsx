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

  const originCity = normalizedStops[0]?.city || 'Origin';
  const destCity = normalizedStops[normalizedStops.length - 1]?.city || 'Destination';
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
        <div className="inline-flex items-center gap-2.5 bg-[#EEF1F6] dark:bg-slate-800 px-3.5 py-1.5 rounded-full border border-slate-200/80 dark:border-slate-700 text-xs">
          <span className="font-bold text-[#3E3C3D] dark:text-slate-200 text-[11px]">
            {completedCount} of {totalStops} stops completed <span className="text-slate-300 dark:text-slate-600">•</span> {progressPercent}%
          </span>
          <div className="w-20 sm:w-28 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-[#FA634E] rounded-full transition-all duration-500 shadow-xs"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── 2. STATE-OF-THE-ART TRANSIT TRACK & MILESTONES ── */}
      <div className="relative w-full flex-1 flex flex-col pt-8 pb-2">
        {/* Progress Track Bar Row */}
        <div className="relative flex items-center justify-between w-full px-6 sm:px-10 h-6">
          {/* Track Line Background */}
          <div className="absolute left-10 right-10 top-1/2 -translate-y-1/2 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#FA634E] via-[#FA634E] to-emerald-500 rounded-full transition-all duration-500 shadow-xs"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Minimal 2D Orange Truck Marker (Riding directly ON the route line) */}
          <div
            className="absolute top-1/2 -translate-y-1/2 z-30 transition-all duration-700 pointer-events-none transform -translate-x-1/2"
            style={{
              left: `calc(2.5rem + (100% - 5rem) * (${truckPositionPercent} / 100))`,
            }}
          >
            <div className="relative flex flex-col items-center">
              {/* Status pill badge above truck */}
              <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FA634E] text-white text-[10.5px] font-black shadow-xs whitespace-nowrap">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>{progressPercent === 100 ? 'Delivered' : progressPercent > 0 ? 'In Transit' : 'Scheduled'}</span>
              </div>

              {/* Minimal 2D Orange Truck SVG */}
              <svg
                viewBox="0 0 72 30"
                className="w-20 h-9 sm:w-24 sm:h-10 filter drop-shadow-md"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Cargo Trailer (Minimal White & Orange accent) */}
                <rect x="2" y="4" width="44" height="19" rx="2.5" fill="#FFFFFF" stroke="#FA634E" strokeWidth="1.5" />
                <rect x="5" y="7" width="38" height="13" rx="1.5" fill="#FA634E" />
                <text x="24" y="16" textAnchor="middle" fill="#FFFFFF" fontSize="5.5" fontWeight="900" letterSpacing="0.8" fontFamily="Arial, sans-serif">MERCON</text>

                {/* Hitch / Connector */}
                <rect x="46" y="13" width="4" height="6" fill="#3E3C3D" />

                {/* Minimal Truck Cab (Orange #FA634E) */}
                <path d="M50 7 L61 7 L69 15 L69 23 L50 23 Z" fill="#FA634E" stroke="#E04835" strokeWidth="1" />
                {/* Windshield */}
                <path d="M53 9 L60 9 L65 15 L53 15 Z" fill="#38BDF8" opacity="0.9" />
                {/* Front Bumper */}
                <rect x="67" y="19" width="3" height="4" rx="0.5" fill="#3E3C3D" />
                {/* Headlight */}
                <rect x="67" y="16" width="2" height="2" rx="0.5" fill="#FEF08A" />

                {/* Minimal 2D Wheels */}
                <circle cx="12" cy="23" r="3.5" fill="#3E3C3D" stroke="#FFFFFF" strokeWidth="1" />
                <circle cx="12" cy="23" r="1.2" fill="#FFFFFF" />

                <circle cx="34" cy="23" r="3.5" fill="#3E3C3D" stroke="#FFFFFF" strokeWidth="1" />
                <circle cx="34" cy="23" r="1.2" fill="#FFFFFF" />

                <circle cx="58" cy="23" r="3.5" fill="#3E3C3D" stroke="#FFFFFF" strokeWidth="1" />
                <circle cx="58" cy="23" r="1.2" fill="#FFFFFF" />
              </svg>
            </div>
          </div>

          {/* Milestone Nodes along the Track Line */}
          {normalizedStops.map((stop) => {
            const isCompleted = stop.status === 'completed';
            const isCurrent = stop.status === 'current';

            return (
              <div
                key={`node-${stop.id}`}
                className="relative z-20 flex flex-col items-center justify-center"
              >
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-200 shadow-xs",
                    isCompleted
                      ? "bg-emerald-600 text-white ring-4 ring-emerald-50 dark:ring-emerald-950/60"
                      : isCurrent
                      ? "bg-[#FA634E] text-white ring-4 ring-rose-100 dark:ring-rose-950/60 shadow-md scale-110"
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
              </div>
            );
          })}
        </div>

        {/* Stop Details Row (Clean & Flat Typography, No Cluttered Cards) */}
        <div className="relative flex items-start justify-between w-full px-2 sm:px-4 z-20 mt-3">
          {normalizedStops.map((stop) => {
            const isCompleted = stop.status === 'completed';
            const isCurrent = stop.status === 'current';

            return (
              <div
                key={`card-${stop.id}`}
                className="flex flex-col items-center text-center min-w-[85px] sm:min-w-[110px] max-w-[140px]"
              >
                <span className="font-extrabold text-xs text-[#3E3C3D] dark:text-slate-100 tracking-tight truncate w-full text-center" title={stop.city}>
                  {stop.city}
                </span>
                <span
                  className={cn(
                    "mt-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide leading-none",
                    isCompleted
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/80"
                      : isCurrent
                      ? "bg-rose-50 text-[#FA634E] dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/80"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200/80"
                  )}
                >
                  {stop.label}
                </span>
                <span className="text-[10.5px] font-mono font-bold text-slate-500 dark:text-slate-400 mt-1">
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
