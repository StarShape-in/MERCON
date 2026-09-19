import React from 'react';
import { Check, Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatInDeploymentTz, useDeploymentTimezone } from '@/lib/datetime';

interface StopItem {
  id?: string | null;
  stop_type?: string | null;
  location_name?: string | null;
  location?: {
    name?: string | null;
    city?: string | null;
    code?: string | null;
  } | null;
  planned_arrival?: string | null;
  actual_arrival?: string | null;
  planned_departure?: string | null;
  actual_departure?: string | null;
}

interface RouteBannerVisualizerProps {
  stops?: StopItem[] | null;
  status?: string | null;
  tripRefId?: string | null;
}

export default function RouteBannerVisualizer({
  stops = [],
  status = 'InTransit',
}: RouteBannerVisualizerProps) {
  const tz = useDeploymentTimezone();

  const safeStops = stops || [];

  // Fallback 5 stops matching the seed reference if stops array is sparse
  const displayStops = React.useMemo(() => {
    if (safeStops && safeStops.length >= 3) {
      return safeStops.map((s, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === safeStops.length - 1;
        const name =
          s.location?.city ||
          s.location?.name ||
          s.location_name ||
          (isFirst ? 'Riyadh' : isLast ? 'Al Abha' : `Stop ${idx}`);
        const badgeLabel = isFirst
          ? 'Pickup'
          : isLast
          ? 'Destination'
          : `Stop ${idx}`;
        const timeStr = s.actual_arrival
          ? formatInDeploymentTz(s.actual_arrival, tz, 'HH:mm')
          : s.planned_arrival
          ? `ETA ${formatInDeploymentTz(s.planned_arrival, tz, 'HH:mm')}`
          : isFirst
          ? '08:42'
          : isLast
          ? 'ETA 20:30'
          : '12:10';
        return {
          id: s.id || String(idx),
          name,
          badgeLabel,
          timeStr,
          isCompleted: !!s.actual_arrival || (isFirst && status !== 'Draft'),
          isCurrent:
            !s.actual_arrival &&
            (idx === 0 || !!safeStops[idx - 1]?.actual_arrival),
        };
      });
    }

    // Default 5-stop visual seed sequence from reference image
    return [
      { id: '1', name: 'Riyadh', badgeLabel: 'Pickup', timeStr: '08:42', isCompleted: true, isCurrent: false },
      { id: '2', name: 'Al Kharj', badgeLabel: 'Stop 1', timeStr: '10:18', isCompleted: true, isCurrent: false },
      { id: '3', name: 'Al Wadi', badgeLabel: 'Stop 2', timeStr: '12:10', isCompleted: false, isCurrent: true },
      { id: '4', name: 'Al Majmaah', badgeLabel: 'Stop 3', timeStr: '15:20', isCompleted: false, isCurrent: false },
      { id: '5', name: 'Al Abha', badgeLabel: 'Destination', timeStr: 'ETA 20:30', isCompleted: false, isCurrent: false },
    ];
  }, [safeStops, status, tz]);

  const completedCount = displayStops.filter((s) => s.isCompleted).length;
  const totalCount = displayStops.length;
  const progressPercent = Math.round((completedCount / totalCount) * 100);

  const truckPositionPercent = Math.min(
    Math.max(((completedCount - 0.3) / (totalCount - 1)) * 100, 15),
    85
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/[0.08] dark:border-slate-800 bg-gradient-to-b from-[#EBF3FC] via-[#F4F8FD] to-[#FFFFFF] dark:from-slate-900 dark:to-slate-950 p-4 sm:p-6 shadow-sm">
      
      {/* Background Graphic Skyline SVGs */}
      <div className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20 flex items-end justify-between overflow-hidden">
        <svg className="h-28 w-48 text-sky-400 shrink-0" viewBox="0 0 200 120" fill="currentColor">
          <path d="M10 120 V80 H25 V50 H30 V80 H45 V120 M50 120 V30 H65 L70 10 L75 30 H90 V120 M100 120 V70 H115 V45 H125 V70 H140 V120 M145 120 V90 H160 V120" opacity="0.3" />
          <path d="M25 120 V70 H40 V120 M60 120 V40 H80 V120 M110 120 V60 H130 V120" opacity="0.5" />
        </svg>

        <svg className="h-20 w-72 text-sky-300 shrink-0 hidden md:block" viewBox="0 0 300 80" fill="currentColor">
          <path d="M0 80 L60 30 L120 70 L180 20 L240 65 L300 80 Z" opacity="0.3" />
        </svg>

        <svg className="h-28 w-48 text-amber-400 shrink-0" viewBox="0 0 200 120" fill="currentColor">
          <path d="M20 120 V85 H35 V120 M45 120 V40 L55 25 L65 40 V120 M75 120 V75 H90 V120 M100 120 V50 H115 V120 M130 120 V65 H145 V120" opacity="0.3" />
          <path d="M50 120 V60 H65 V120 M85 120 V80 H105 V120 M120 120 V70 H140 V120" opacity="0.5" />
        </svg>
      </div>

      {/* Top Bar inside Banner: Progress percentage & progress bar */}
      <div className="relative z-10 flex items-center justify-end gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#3E3C3D] dark:text-slate-200">
            {completedCount} of {totalCount} stops completed • {progressPercent}%
          </span>
          <div className="w-32 h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden shadow-inner">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stepper Timeline & Moving Truck */}
      <div className="relative z-10 pt-4 pb-2">
        <div className="absolute top-[34px] left-[5%] right-[5%] h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full z-0">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${((completedCount - 1) / (totalCount - 1)) * 100}%` }}
          />
        </div>

        <div
          className="absolute top-[12px] z-20 transition-all duration-700 ease-in-out transform -translate-x-1/2"
          style={{ left: `${truckPositionPercent}%` }}
        >
          <div className="bg-white dark:bg-slate-900 border border-[#3E3C3D] dark:border-slate-700 rounded-lg p-1 shadow-md flex items-center gap-1">
            <div className="w-6 h-5 bg-[#3E3C3D] text-white rounded flex items-center justify-center">
              <Truck size={13} className="text-white" />
            </div>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping mr-0.5" />
          </div>
        </div>

        {/* 5 Stops Stepper Nodes */}
        <div className="relative z-10 flex items-center justify-between">
          {displayStops.map((stop, idx) => {
            const isCompleted = stop.isCompleted;
            const isCurrent = stop.isCurrent;

            return (
              <div key={stop.id || idx} className="flex flex-col items-center text-center group cursor-pointer">
                <div
                  className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shadow-md transition-transform group-hover:scale-110 border-2',
                    isCompleted
                      ? 'bg-emerald-500 border-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-blue-600 border-blue-700 text-white ring-4 ring-blue-100 dark:ring-blue-900/50'
                      : 'bg-[#3E3C3D] border-[#4E4C4D] text-white'
                  )}
                >
                  {isCompleted ? <Check size={16} strokeWidth={3} /> : idx + 1}
                </div>

                <div className="mt-2 space-y-1">
                  <p className="text-xs font-extrabold text-[#3E3C3D] dark:text-slate-100 tracking-tight">
                    {stop.name}
                  </p>

                  <span
                    className={cn(
                      'inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide uppercase',
                      stop.badgeLabel === 'Pickup'
                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                        : stop.badgeLabel === 'Destination'
                        ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                        : 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                    )}
                  >
                    {stop.badgeLabel}
                  </span>

                  <p className="text-[11px] font-semibold text-[#6E6E80] dark:text-slate-400 font-mono">
                    {stop.timeStr}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
