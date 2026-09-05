import React from 'react';
import { formatInDeploymentTz } from '@/lib/datetime';

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

  // Find index of current stop to place truck right before it
  const currentIndex = normalizedStops.findIndex((s) => s.status === 'current');
  const truckSegmentIndex = currentIndex > 0 ? currentIndex - 1 : 1;

  return (
    <div className="relative w-full rounded-2xl border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden h-[108px] flex flex-col justify-between p-2.5 sm:px-6 sm:py-2">
      {/* ── 1. BACKGROUND: Road 11 Panorama Image ── */}
      <div
        className="absolute inset-0 bg-no-repeat pointer-events-none select-none z-0"
        style={{
          backgroundImage: `url('/road11.png')`,
          backgroundPosition: 'center 35%',
          backgroundSize: '100% 100%',
        }}
      />

      {/* ── 2. SUBTLE LIGHT OVERLAY (Preserves original artwork while optimizing contrast) ── */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-white/5 pointer-events-none z-0" />

      {/* ── 3. TOP ROW: PROGRESS COUNTER PILL (In the upper sky) ── */}
      <div className="relative z-10 flex items-center justify-end w-full">
        <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-white/80 shadow-2xs text-xs">
          <span className="font-bold text-[#111827] text-[10.5px]">
            {completedCount} of {totalStops} stops completed • {progressPercent}%
          </span>
          <div className="w-24 sm:w-28 h-1.5 bg-slate-100 border border-slate-200/80 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── 4. FOREGROUND: ROUTE LINE, TRUCK & STOP NODES ALONG ROAD ── */}
      <div className="relative z-10 w-full flex-1 flex flex-col justify-end">
        <div className="relative flex items-end justify-between w-full pb-0.5">
          
          {/* Continuous Highway Line Across All Stops (Positioned directly on the road surface) */}
          <div className="absolute left-6 right-6 bottom-[11px] h-[3.5px] flex items-center z-0">
            {normalizedStops.map((stop, idx) => {
              if (idx === totalStops - 1) return null;
              const nextStop = normalizedStops[idx + 1];
              const isGreenSegment = stop.status === 'completed' && nextStop.status === 'completed';
              const isCurrentSegment =
                (stop.status === 'completed' && nextStop.status === 'current') ||
                idx === truckSegmentIndex;

              return (
                <div
                  key={`line-${idx}`}
                  className={`flex-1 h-[3.5px] relative ${
                    isGreenSegment
                      ? 'bg-emerald-500'
                      : isCurrentSegment
                      ? 'bg-blue-600'
                      : 'bg-slate-300 border-t border-b border-dashed border-slate-400'
                  }`}
                >
                  {/* Dashed white highway stripes on active/completed segments */}
                  {(isGreenSegment || isCurrentSegment) && (
                    <div className="absolute inset-0 flex items-center justify-around opacity-75">
                      <span className="w-2 h-[1px] bg-white rounded-full" />
                      <span className="w-2 h-[1px] bg-white rounded-full" />
                    </div>
                  )}

                  {/* Truck Traveling on the Active In-Transit Segment */}
                  {isCurrentSegment && (
                    <div className="absolute left-1/2 -top-4.5 -translate-x-1/2 z-20 flex flex-col items-center">
                      <div className="relative flex items-center justify-center filter drop-shadow-md">
                        <svg
                          viewBox="0 0 64 32"
                          className="w-10 h-5 text-[#2563EB]"
                        >
                          {/* Cargo Box */}
                          <rect x="2" y="4" width="40" height="20" rx="1.5" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1" />
                          <line x1="2" y1="14" x2="42" y2="14" stroke="#E2E8F0" strokeWidth="1" />
                          {/* Cabin */}
                          <path d="M42 9 L54 9 L60 17 L60 24 L42 24 Z" fill="#2563EB" />
                          {/* Windshield */}
                          <path d="M44 11 L52 11 L57 17 L44 17 Z" fill="#93C5FD" />
                          {/* Chassis & Wheels */}
                          <rect x="0" y="24" width="62" height="3" fill="#334155" />
                          <circle cx="10" cy="27" r="4.5" fill="#1E293B" stroke="#64748B" strokeWidth="1.5" />
                          <circle cx="10" cy="27" r="1.5" fill="#FFFFFF" />
                          <circle cx="22" cy="27" r="4.5" fill="#1E293B" stroke="#64748B" strokeWidth="1.5" />
                          <circle cx="22" cy="27" r="1.5" fill="#FFFFFF" />
                          <circle cx="52" cy="27" r="4.5" fill="#1E293B" stroke="#64748B" strokeWidth="1.5" />
                          <circle cx="52" cy="27" r="1.5" fill="#FFFFFF" />
                        </svg>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Individual Stop Nodes and Labels */}
          {normalizedStops.map((stop) => {
            const isCompleted = stop.status === 'completed';
            const isCurrent = stop.status === 'current';

            return (
              <div
                key={stop.id}
                className="relative z-10 flex flex-col items-center text-center min-w-[70px] sm:min-w-[85px]"
              >
                {/* Stop Info Card (Placed ABOVE the node, sitting nicely in the sky) */}
                <div className="flex flex-col items-center mb-1 px-2 py-0.5 rounded-lg bg-white/95 backdrop-blur-xs border border-white/80 shadow-2xs max-w-[120px]">
                  <span className="font-black text-[11px] text-[#111827] tracking-tight leading-tight truncate w-full text-center">
                    {stop.city}
                  </span>
                  <span
                    className={`mt-0.5 px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider leading-none ${
                      isCompleted
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : isCurrent
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {stop.label}
                  </span>
                  <span className="text-[9px] font-mono font-bold text-[#4B5563] mt-0.5 leading-none">
                    {stop.time}
                  </span>
                </div>

                {/* Numbered Circle Node sitting directly ON the highway line on the road */}
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center font-black text-[10.5px] shadow-xs transition-all ${
                    isCompleted
                      ? 'bg-emerald-600 text-white ring-3 ring-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white ring-3 ring-blue-100 shadow-md scale-105'
                      : 'bg-slate-400 text-white ring-3 ring-white'
                  }`}
                >
                  {stop.seq}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
