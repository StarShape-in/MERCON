import React, { useMemo } from 'react';
import { Check, MapPin, Flag, Clock, Route, Navigation } from 'lucide-react';
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
  { id: '2', seq: 2, label: 'STOP 1', city: 'Qassim', time: '11:15 AM', status: 'completed', isFirst: false, isLast: false },
  { id: '3', seq: 3, label: 'STOP 2', city: 'Hail', time: '02:30 PM', status: 'current', isFirst: false, isLast: false },
  { id: '4', seq: 4, label: 'DESTINATION', city: 'Al Abha', time: 'ETA 20:30 PM', status: 'upcoming', isFirst: false, isLast: true },
];

export default function VisualRouteProgress({ stops, tz, tripStatus }: VisualRouteProgressProps) {
  const isTripFullyCompleted = ['completed', 'invoiced'].includes(String(tripStatus || '').trim().toLowerCase());

  const normalizedStops: NormalizedStop[] = useMemo(() => {
    if (!stops || stops.length < 2) return DEFAULT_STOPS;
    const firstIncIdx = stops.findIndex((s) => !s.actual_arrival);

    return stops.map((st, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === stops.length - 1;

      let status: NormalizedStop['status'] = 'upcoming';
      if (isTripFullyCompleted || st.actual_arrival) {
        status = 'completed';
      } else if (firstIncIdx === -1) {
        status = 'completed';
      } else if (idx === firstIncIdx) {
        status = 'current';
      } else if (idx < firstIncIdx) {
        status = 'completed';
      }

      const rawCity = st.location?.city || st.location?.name || st.location_name || st.name;
      const cityName = rawCity
        ? String(rawCity).replace(/\s*\(\s*\)$/, '').trim()
        : (isFirst ? 'Origin' : isLast ? 'Destination' : `Stop ${idx}`);

      const timeStr = st.actual_arrival
        ? formatInDeploymentTz(st.actual_arrival, tz, 'hh:mm a')
        : st.planned_arrival
        ? (isLast && !isTripFullyCompleted ? `ETA ${formatInDeploymentTz(st.planned_arrival, tz, 'hh:mm a')}` : formatInDeploymentTz(st.planned_arrival, tz, 'hh:mm a'))
        : isLast && !isTripFullyCompleted ? 'ETA 20:30 PM' : '12:00 PM';

      const label = isFirst ? 'PICKUP' : isLast ? 'DESTINATION' : `STOP ${idx}`;

      return {
        id: st.id || `stop-${idx}`,
        seq: idx + 1,
        label,
        city: cityName,
        time: timeStr,
        status,
        isFirst,
        isLast,
      };
    });
  }, [stops, tz, tripStatus, isTripFullyCompleted]);

  const n = normalizedStops.length;

  const activeIdx = useMemo(() => {
    const ci = normalizedStops.findIndex((s) => s.status === 'current');
    if (ci >= 0) return ci;
    const cc = normalizedStops.filter((s) => s.status === 'completed').length;
    return cc === n ? n - 1 : 0;
  }, [normalizedStops, n]);

  const progressPercent = n <= 1 ? 0 : Math.round((activeIdx / (n - 1)) * 100);
  const stopPct = (i: number) => (n <= 1 ? 50 : (i / (n - 1)) * 100);

  const originCity = normalizedStops[0]?.city || 'Origin';
  const destCity = normalizedStops[n - 1]?.city || 'Destination';
  const routeTitle = `${originCity} → ${destCity} Corridor`;

  /* Dynamic min-width for responsive scrolling on multi-stop routes */
  const minW = n <= 4 ? undefined : n <= 6 ? 780 : n <= 8 ? 1020 : 1280;

  return (
    <div className="w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/90 dark:border-slate-800 shadow-xs p-5 sm:p-6 flex flex-col gap-4 font-sans select-none overflow-hidden">

      {/* ── 1. HEADER SUMMARY & PROGRESS BADGE ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 w-full border-b border-slate-100 dark:border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/50 flex items-center justify-center text-[#FA634E] shadow-2xs">
            <Navigation className="w-4 h-4 fill-current" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-[#3E3C3D] dark:text-slate-100 tracking-tight leading-none">
              {routeTitle}
            </h3>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
              {n} Stop Milestones • Sleek Integrated Freight Carrier Line
            </p>
          </div>
        </div>

        {/* Minimal Progress Pill */}
        <div className="inline-flex items-center gap-2.5 bg-slate-100 dark:bg-slate-800 px-3.5 py-1.5 rounded-full border border-slate-200/80 dark:border-slate-700 text-xs">
          <span className="font-bold text-[#3E3C3D] dark:text-slate-200 text-[11px]">
            {normalizedStops.filter((s) => s.status === 'completed').length} of {n} stops completed <span className="text-slate-300 dark:text-slate-600">•</span> {progressPercent}%
          </span>
          <div className="w-20 sm:w-28 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-[#EF4444] via-[#FA634E] to-[#10B981] rounded-full transition-all duration-500 shadow-2xs"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* ── 2. SLEEK TRUCK TRAILER ROUTE LINE WITH EMBEDDED MILESTONES & INTEGRATED CAB ── */}
      <div className="w-full overflow-x-auto py-3" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="relative" style={{ minWidth: minW, height: 180 }}>

          {/* LAYER 1: TOP CITY INFO CARDS ABOVE ROUTE */}
          {normalizedStops.map((s, i) => {
            const pct = stopPct(i);
            const done = s.status === 'completed';
            const cur = s.status === 'current';
            return (
              <div
                key={`card-${s.id}`}
                className="absolute"
                style={{ top: 0, left: `${pct}%`, transform: 'translateX(-50%)', width: 140, zIndex: 20 }}
              >
                <div
                  className={cn(
                    'w-full rounded-2xl border p-2 flex items-center gap-2 shadow-2xs transition-all',
                    done
                      ? 'bg-[#F0FDF4] border-[#86EFAC]'
                      : cur
                      ? 'bg-[#FFF1F2] border-[#FDA4AF] shadow-[0_0_0_3px_rgba(253,164,175,0.25)]'
                      : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700',
                  )}
                >
                  <div
                    className={cn(
                      'w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                      done
                        ? 'bg-[#DCFCE7] text-[#16A34A]'
                        : cur
                        ? 'bg-[#FFE4E6] text-[#E11D48]'
                        : 'bg-slate-100 text-slate-400 dark:bg-slate-700',
                    )}
                  >
                    <MapPin className="w-3 h-3 fill-current" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-extrabold text-[12px] text-slate-900 dark:text-white leading-tight truncate">
                      {s.city}
                    </div>
                    <div
                      className={cn(
                        'text-[9px] font-black uppercase tracking-wider leading-tight mt-0.5',
                        done ? 'text-[#16A34A]' : cur ? 'text-[#E11D48]' : 'text-slate-400',
                      )}
                    >
                      {s.label}
                    </div>
                  </div>
                  {done && (
                    <div className="w-4 h-4 rounded-full bg-[#16A34A] flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 stroke-[3] text-white" />
                    </div>
                  )}
                  {cur && (
                    <div className="w-4 h-4 rounded-full border-[1.5px] border-[#E11D48] bg-white flex items-center justify-center shrink-0 animate-pulse">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#E11D48]" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* LAYER 2: CONNECTOR STEMS FROM CARDS TO TRUCK ROUTE LINE */}
          {normalizedStops.map((s, i) => {
            const pct = stopPct(i);
            const done = s.status === 'completed';
            const cur = s.status === 'current';
            return (
              <div
                key={`stem-${s.id}`}
                className="absolute"
                style={{
                  top: 50,
                  left: `${pct}%`,
                  transform: 'translateX(-50%)',
                  width: 2,
                  height: 24,
                  backgroundColor: done ? '#16A34A' : cur ? '#E11D48' : '#CBD5E1',
                  zIndex: 10,
                }}
              />
            );
          })}

          {/* LAYER 3: SLEEK TRUCK TRAILER BODY ROUTE TRACK + INTEGRATED CAB AT DESTINATION */}
          <div className="absolute" style={{ top: 74, left: 32, right: 32, height: 42, zIndex: 1 }}>

            {/* ── LONG SLEEK TRUCK TRAILER BODY TRACK ── */}
            <div className="absolute left-0 right-14 top-0 bottom-0 rounded-2xl bg-[#232733] shadow-md overflow-hidden border border-slate-700/60">
              {/* Rear tail light accents at start of trailer */}
              <div className="absolute left-0 top-1 bottom-1 w-1.5 bg-red-500 rounded-l-xs shadow-[0_0_8px_rgba(239,68,68,0.8)]" />

              {/* Dashed highway center line (unfilled section) */}
              <div
                className="absolute inset-0 opacity-25"
                style={{
                  backgroundImage: 'linear-gradient(90deg, white 0px, white 10px, transparent 10px, transparent 24px)',
                  backgroundSize: '24px 2px',
                  backgroundRepeat: 'repeat-x',
                  backgroundPosition: 'center center',
                }}
              />

              {/* RED → ORANGE → GREEN PROGRESS FILL INSIDE TRAILER BODY */}
              <div
                className="absolute top-0 left-0 bottom-0 bg-gradient-to-r from-[#EF4444] via-[#FA634E] to-[#10B981] rounded-l-2xl transition-all duration-700 overflow-hidden"
                style={{ width: `${progressPercent}%` }}
              >
                {/* Dashed center line inside filled progress section */}
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage: 'linear-gradient(90deg, white 0px, white 10px, transparent 10px, transparent 24px)',
                    backgroundSize: '24px 2px',
                    backgroundRepeat: 'repeat-x',
                    backgroundPosition: 'center center',
                  }}
                />
              </div>

              {/* Minimal corrugated trailer vertical detail lines */}
              <div className="absolute inset-0 pointer-events-none opacity-10 flex justify-between px-6">
                {Array.from({ length: 16 }).map((_, idx) => (
                  <div key={idx} className="w-[1px] h-full bg-white" />
                ))}
              </div>
            </div>

            {/* ── INTEGRATED 2D TRUCK CAB AT FINAL DESTINATION (RIGHT END) ── */}
            <div className="absolute right-0 top-0 bottom-0 w-16 flex items-center z-20">
              <svg viewBox="0 0 60 42" className="w-full h-full filter drop-shadow-md">
                {/* Coupler / Saddle connection to trailer */}
                <rect x="0" y="14" width="6" height="14" fill="#1E293B" />

                {/* Cab Main Body (MERCON Coral Red #FA634E) */}
                <path d="M6 8 L32 8 L48 20 L48 36 L6 36 Z" fill="#FA634E" stroke="#C2280F" strokeWidth="1.2" />

                {/* Roof Fairing / Aero Shield */}
                <path d="M6 8 L6 3 L28 8 Z" fill="#E11D48" />

                {/* Windshield */}
                <path d="M12 11 L29 11 L41 20 L12 20 Z" fill="#38BDF8" opacity="0.9" stroke="#BAE6FD" strokeWidth="0.8" />

                {/* Door Line */}
                <line x1="22" y1="21" x2="22" y2="36" stroke="#C2280F" strokeWidth="0.8" />

                {/* Front Bumper & Grill */}
                <rect x="44" y="26" width="6" height="10" fill="#64748B" />
                <rect x="44" y="33" width="7" height="3" rx="0.5" fill="#334155" />

                {/* Headlight */}
                <rect x="45" y="22" width="4" height="4" rx="0.8" fill="#FEF08A" stroke="#EAB308" strokeWidth="0.5" />
                <ellipse cx="49" cy="24" rx="3" ry="3" fill="#FEF08A" opacity="0.3" className="animate-pulse" />

                {/* Wheels at Front Cab */}
                <g transform="translate(36, 36)">
                  <circle r="5.5" fill="#0F172A" stroke="#475569" strokeWidth="1" />
                  <circle r="2.5" fill="#E2E8F0" />
                  <circle r="1" fill="#475569" />
                </g>
              </svg>
            </div>

            {/* ── MILESTONE STOP NODES SITTING NATURALLY ON THE TRUCK/ROUTE ── */}
            {normalizedStops.map((s, i) => {
              const pct = stopPct(i);
              const done = s.status === 'completed';
              const cur = s.status === 'current';
              return (
                <div
                  key={`node-${s.id}`}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-30"
                  style={{ left: `calc((${pct} / 100) * (100% - 70px))` }}
                >
                  {done && (
                    <div className="w-8 h-8 rounded-full bg-[#059669] border-2 border-white flex items-center justify-center shadow-md">
                      <Check className="w-4 h-4 stroke-[3] text-white" />
                    </div>
                  )}
                  {cur && (
                    <div className="w-9 h-9 rounded-full bg-[#E11D48] border-2 border-white ring-4 ring-rose-200/80 flex items-center justify-center shadow-lg animate-pulse">
                      <div className="w-4 h-4 rounded-full bg-white flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-[#E11D48]" />
                      </div>
                    </div>
                  )}
                  {!done && !cur && (
                    <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-white flex items-center justify-center shadow-md">
                      <span className="text-[11px] font-black text-white">{s.seq}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* LAYER 4: SUB-LABELS BELOW THE TRUCK ROUTE TRACK */}
          {normalizedStops.map((s, i) => {
            const pct = stopPct(i);
            const done = s.status === 'completed';
            const cur = s.status === 'current';
            return (
              <div
                key={`lbl-${s.id}`}
                className="absolute flex items-center gap-1.5"
                style={{
                  top: 126,
                  left: `calc(32px + ((${pct} / 100) * (100% - 102px)))`,
                  transform: 'translateX(-50%)',
                  zIndex: 20,
                  whiteSpace: 'nowrap',
                }}
              >
                {done && (
                  <div className="w-3.5 h-3.5 rounded-full bg-[#059669] flex items-center justify-center shrink-0">
                    <Check className="w-2 h-2 stroke-[3] text-white" />
                  </div>
                )}
                {cur && (
                  <div className="w-3.5 h-3.5 rounded-full bg-[#E11D48] flex items-center justify-center shrink-0 animate-pulse">
                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                  </div>
                )}
                {!done && !cur && (
                  <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center shrink-0">
                    <Clock className="w-2 h-2 text-slate-400" />
                  </div>
                )}
                <div className="flex flex-col leading-none">
                  <span className="font-black text-[10.5px] uppercase tracking-tight text-slate-800 dark:text-slate-200">
                    {s.label}
                  </span>
                  <span
                    className={cn(
                      'text-[9px] font-extrabold uppercase tracking-wider mt-0.5',
                      done ? 'text-[#059669]' : cur ? 'text-[#E11D48]' : 'text-slate-400',
                    )}
                  >
                    {done ? 'COMPLETED' : cur ? 'IN TRANSIT' : 'UPCOMING'}
                  </span>
                </div>
              </div>
            );
          })}

        </div>
      </div>

    </div>
  );
}
