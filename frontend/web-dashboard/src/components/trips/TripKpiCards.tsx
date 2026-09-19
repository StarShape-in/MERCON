import React from 'react';
import { cn } from '@/lib/utils';
import { DateFilterType } from '@/components/trips/TripDateFilterPicker';
import KpiCard from '@/components/ui/KpiCard';
import { Truck, MapPin, CheckCircle2, Calendar, AlertTriangle } from 'lucide-react';

export interface TripKpiCardsProps {
  kpiTitle: string;
  kpiPeriod: DateFilterType;
  setKpiPeriod: (period: DateFilterType) => void;
  setDateFilter: (filter: DateFilterType) => void;
  setCurrentPage: (page: number) => void;
  selectedStatus: string;
  setSelectedStatus: (status: string) => void;

  periodCount: number;
  periodCompletedCount: number;
  periodInTransitCount: number;
  periodQueueCount: number;

  inTransitCount: number;
  completedCount: number;
  scheduledCount: number;
  delayedCount: number;
}

export const TripKpiCards: React.FC<TripKpiCardsProps> = ({
  kpiTitle,
  kpiPeriod,
  setKpiPeriod,
  setDateFilter,
  setCurrentPage,
  selectedStatus,
  setSelectedStatus,
  periodCount,
  periodCompletedCount,
  periodInTransitCount,
  periodQueueCount,
  inTransitCount,
  completedCount,
  scheduledCount,
  delayedCount,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 shrink-0">
      
      {/* ── CARD 1: TODAY'S TRIPS (Total Period) ────────────────────────── */}
      <KpiCard
        title={kpiTitle}
        className="border-orange-300/80 hover:border-[#FA634E] dark:border-orange-500/40 cursor-pointer"
        value={
          <span>
            {periodCount}
            <span className="text-[16px] font-semibold ml-1.5 opacity-85">Trips</span>
          </span>
        }
        variant="slate"
        icon={Truck}
        isActive={selectedStatus === 'All'}
        onClick={() => {
          setSelectedStatus('All');
          setCurrentPage(1);
        }}
        headerAction={
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-2xs">
            {(
              [
                { label: '1D', value: 'Today', title: 'Today (1D)' },
                { label: '1W', value: 'ThisWeek', title: 'This Week (1W)' },
                { label: '1M', value: 'ThisMonth', title: 'This Month (1M)' },
              ] as const
            ).map((period) => {
              const active = kpiPeriod === period.value;
              return (
                <button
                  key={period.value}
                  type="button"
                  title={period.title}
                  onClick={(e) => {
                    e.stopPropagation();
                    setKpiPeriod(period.value);
                    setDateFilter(period.value);
                    setCurrentPage(1);
                  }}
                  className={cn(
                    "text-[9px] font-extrabold h-4.5 px-1.5 rounded-md transition-all cursor-pointer",
                    active
                      ? "bg-[#FA634E] text-white shadow-xs font-black"
                      : "text-slate-500 hover:text-slate-900"
                  )}
                >
                  {period.label}
                </button>
              );
            })}
          </div>
        }
        description={
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 mt-1">
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {periodCompletedCount} Done
            </span>
            <span className="flex items-center gap-1 text-orange-600">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
              {periodInTransitCount} Active
            </span>
            <span className="flex items-center gap-1 text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
              {periodQueueCount} Pending
            </span>
          </div>
        }
        customFooter={
          <div className="relative h-9 mt-4 -mx-4 overflow-hidden rounded-b-lg bg-orange-50/40 dark:bg-orange-950/20 border-t border-orange-200/50">
            <style>{`
              @keyframes routeDashOrange {
                to { stroke-dashoffset: -12; }
              }
            `}</style>
            <svg className="absolute inset-0 h-full w-full opacity-[0.06]" stroke="currentColor" fill="none">
              <pattern id="card-map-grid-orange" width="12" height="12" patternUnits="userSpaceOnUse">
                <path d="M 12 0 L 0 0 0 12" strokeWidth="0.5" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#card-map-grid-orange)" />
            </svg>

            {/* Contour Lines */}
            <svg className="absolute inset-0 h-full w-full opacity-[0.25]" viewBox="0 0 280 48" preserveAspectRatio="none">
              <path d="M 60 -5 C 65 15, 55 35, 60 55" fill="none" stroke="#FDBA74" strokeWidth="1.5" />
              <path d="M 140 -5 C 135 15, 145 35, 138 55" fill="none" stroke="#FDBA74" strokeWidth="1.5" />
              <path d="M 210 -5 C 220 15, 205 35, 215 55" fill="none" stroke="#FDBA74" strokeWidth="1.5" />
            </svg>

            {/* Dashed Route Path */}
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 280 48" preserveAspectRatio="none">
              <path d="M -10 24 C 70 10, 150 38, 290 24" fill="none" stroke="#E2E8F0" strokeWidth="3.5" strokeLinecap="round" />
              <path
                d="M -10 24 C 70 10, 150 38, 290 24"
                fill="none"
                stroke="#FA634E"
                strokeWidth="3"
                strokeDasharray="6,6"
                strokeLinecap="round"
                style={{ animation: 'routeDashOrange 4s linear infinite' }}
              />
            </svg>

            {/* Origin Node */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-[#FA634E] ring-4 ring-[#FA634E]/20" />
            </div>

            {/* 3D Truck Container */}
            <div
              className="absolute"
              style={{
                left: '45%',
                top: '40%',
                transform: 'translate(-50%, -50%) scale(0.6)',
                zIndex: 10
              }}
            >
              <div className="relative flex items-center justify-center">
                <div className="absolute h-8 w-8 rounded-full bg-[#FA634E]/25 animate-ping" />
                <img
                  src="/truck_3d_orange_transparent.png"
                  alt="3D Orange Truck"
                  className="h-9 w-9 object-contain"
                />
              </div>
            </div>
          </div>
        }
      />

      {/* ── CARD 2: IN TRANSIT ────────────────────────────────────────── */}
      <KpiCard
        title="IN TRANSIT"
        className="border-emerald-300/80 hover:border-emerald-500 dark:border-emerald-500/40 cursor-pointer"
        value={
          <span>
            {inTransitCount}
            <span className="text-[16px] font-semibold ml-1.5 opacity-85">On Road</span>
          </span>
        }
        variant="emerald"
        icon={MapPin}
        description="Trucks currently moving on duty"
        isActive={selectedStatus === 'InTransit'}
        onClick={() => {
          setSelectedStatus('InTransit');
          setCurrentPage(1);
        }}
        customFooter={
          <div className="relative h-9 mt-4 -mx-4 overflow-hidden rounded-b-lg bg-[#E8F5E9] dark:bg-[#1B5E20]/15 border-t border-emerald-500/10">
            <style>{`
              @keyframes routeDashGreen {
                to { stroke-dashoffset: -12; }
              }
            `}</style>
            <svg className="absolute inset-0 h-full w-full opacity-[0.08]" stroke="currentColor" fill="none">
              <pattern id="card-map-grid-green" width="12" height="12" patternUnits="userSpaceOnUse">
                <path d="M 12 0 L 0 0 0 12" strokeWidth="0.5" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#card-map-grid-green)" />
            </svg>

            {/* Contour Lines */}
            <svg className="absolute inset-0 h-full w-full opacity-[0.4]" viewBox="0 0 280 48" preserveAspectRatio="none">
              <path d="M 60 -5 C 65 15, 55 35, 60 55" fill="none" stroke="#A7F3D0" strokeWidth="1.5" />
              <path d="M 140 -5 C 135 15, 145 35, 138 55" fill="none" stroke="#A7F3D0" strokeWidth="1.5" />
              <path d="M 210 -5 C 220 15, 205 35, 215 55" fill="none" stroke="#A7F3D0" strokeWidth="1.5" />
            </svg>

            {/* Animated Dashed Route */}
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 280 48" preserveAspectRatio="none">
              <path d="M -10 24 C 70 10, 150 38, 290 24" fill="none" stroke="#D1D5DB" strokeWidth="3.5" strokeLinecap="round" />
              <path
                d="M -10 24 C 70 10, 150 38, 290 24"
                fill="none"
                stroke="#10B981"
                strokeWidth="3"
                strokeDasharray="6,6"
                strokeLinecap="round"
                style={{ animation: 'routeDashGreen 4s linear infinite' }}
              />
            </svg>

            {/* Origin Node */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
            </div>

            {/* 3D Green-Tinted Truck */}
            <div
              className="absolute"
              style={{
                left: '50%',
                top: '40%',
                transform: 'translate(-50%, -50%) scale(0.6)',
                zIndex: 10
              }}
            >
              <div className="relative flex items-center justify-center">
                <div className="absolute h-8 w-8 rounded-full bg-emerald-500/30 animate-ping" />
                <img
                  src="/truck_3d_orange_transparent.png"
                  alt="3D Green Truck"
                  className="h-9 w-9 object-contain"
                  style={{ filter: 'hue-rotate(100deg) saturate(1.3) brightness(0.95)' }}
                />
              </div>
            </div>
          </div>
        }
      />

      {/* ── CARD 3: DELIVERED & COMPLETED ─────────────────────────────── */}
      <KpiCard
        title="DELIVERED & COMPLETED"
        className="border-blue-300/80 hover:border-blue-500 dark:border-blue-500/40 cursor-pointer"
        value={
          <span>
            {completedCount}
            <span className="text-[16px] font-semibold ml-1.5 opacity-85">Trips</span>
          </span>
        }
        variant="blue"
        icon={CheckCircle2}
        description="Successfully finished deliveries"
        isActive={selectedStatus === 'Completed,Invoiced' || selectedStatus === 'Completed' || selectedStatus === 'Invoiced'}
        onClick={() => {
          setSelectedStatus('Completed,Invoiced');
          setCurrentPage(1);
        }}
        customFooter={
          <div className="relative h-9 mt-4 -mx-4 overflow-hidden rounded-b-lg bg-[#EFF6FF] dark:bg-[#1E40AF]/15 border-t border-blue-500/10">
            <style>{`
              @keyframes routeDashBlue {
                to { stroke-dashoffset: -12; }
              }
            `}</style>
            <svg className="absolute inset-0 h-full w-full opacity-[0.06]" stroke="currentColor" fill="none">
              <pattern id="card-map-grid-blue" width="12" height="12" patternUnits="userSpaceOnUse">
                <path d="M 12 0 L 0 0 0 12" strokeWidth="0.5" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#card-map-grid-blue)" />
            </svg>

            {/* Contour Lines */}
            <svg className="absolute inset-0 h-full w-full opacity-[0.3]" viewBox="0 0 280 48" preserveAspectRatio="none">
              <path d="M 45 -5 C 50 15, 40 35, 45 55" fill="none" stroke="#BFDBFE" strokeWidth="1.5" />
              <path d="M 115 -5 C 110 15, 120 35, 113 55" fill="none" stroke="#BFDBFE" strokeWidth="1.5" />
              <path d="M 180 -5 C 190 15, 175 35, 185 55" fill="none" stroke="#BFDBFE" strokeWidth="1.5" />
            </svg>

            {/* Route Line */}
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 280 48" preserveAspectRatio="none">
              <path d="M -10 24 C 70 10, 150 38, 290 24" fill="none" stroke="#D1D5DB" strokeWidth="3.5" strokeLinecap="round" />
              <path
                d="M -10 24 C 70 10, 150 38, 290 24"
                fill="none"
                stroke="#2563EB"
                strokeWidth="3"
                strokeDasharray="6,6"
                strokeLinecap="round"
                style={{ animation: 'routeDashBlue 4s linear infinite' }}
              />
            </svg>

            {/* Origin Node */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-blue-500 ring-4 ring-blue-500/20" />
            </div>

            {/* 3D Blue Truck at Finish Line */}
            <div
              className="absolute"
              style={{
                left: '78%',
                top: '40%',
                transform: 'translate(-50%, -50%) scale(0.6)',
                zIndex: 10
              }}
            >
              <div className="relative flex items-center justify-center">
                <div className="absolute h-8 w-8 rounded-full bg-blue-500/30 animate-ping" />
                <img
                  src="/truck_3d_orange_transparent.png"
                  alt="3D Blue Truck"
                  className="h-9 w-9 object-contain"
                  style={{ filter: 'hue-rotate(200deg) saturate(1.2) brightness(0.95)' }}
                />
              </div>
            </div>

            {/* Checkered Flag at End */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 z-10">
              <div className="h-4 w-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[9px] font-black shadow-xs">
                🏁
              </div>
            </div>
          </div>
        }
      />

      {/* ── CARD 4: SCHEDULED TRIPS ───────────────────────────────────── */}
      <KpiCard
        title="SCHEDULED TRIPS"
        className="border-slate-300/80 hover:border-slate-500 dark:border-slate-600/40 cursor-pointer"
        value={
          <span>
            {scheduledCount}
            <span className="text-[16px] font-semibold ml-1.5 opacity-85">Scheduled</span>
          </span>
        }
        variant="slate"
        icon={Calendar}
        description="Planned and queued dispatch"
        isActive={selectedStatus === 'Draft'}
        onClick={() => {
          setSelectedStatus('Draft');
          setCurrentPage(1);
        }}
        customFooter={
          <div className="relative h-9 mt-4 -mx-4 overflow-hidden rounded-b-lg bg-slate-100/70 dark:bg-slate-800/40 border-t border-slate-200">
            <style>{`
              @keyframes routeDashSlate {
                to { stroke-dashoffset: -12; }
              }
            `}</style>
            <svg className="absolute inset-0 h-full w-full opacity-[0.06]" stroke="currentColor" fill="none">
              <pattern id="card-map-grid-slate" width="12" height="12" patternUnits="userSpaceOnUse">
                <path d="M 12 0 L 0 0 0 12" strokeWidth="0.5" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#card-map-grid-slate)" />
            </svg>

            {/* Route Line */}
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 280 48" preserveAspectRatio="none">
              <path d="M -10 24 C 70 10, 150 38, 290 24" fill="none" stroke="#CBD5E1" strokeWidth="3.5" strokeLinecap="round" />
              <path
                d="M -10 24 C 70 10, 150 38, 290 24"
                fill="none"
                stroke="#64748B"
                strokeWidth="3"
                strokeDasharray="6,6"
                strokeLinecap="round"
                style={{ animation: 'routeDashSlate 4s linear infinite' }}
              />
            </svg>

            {/* Origin Node */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-slate-500 ring-4 ring-slate-400/20" />
            </div>

            {/* 3D Neutral Gray Truck Early on Path */}
            <div
              className="absolute"
              style={{
                left: '30%',
                top: '40%',
                transform: 'translate(-50%, -50%) scale(0.6)',
                zIndex: 10
              }}
            >
              <div className="relative flex items-center justify-center">
                <img
                  src="/truck_3d_orange_transparent.png"
                  alt="3D Slate Truck"
                  className="h-9 w-9 object-contain"
                  style={{ filter: 'grayscale(0.85) opacity(0.85)' }}
                />
              </div>
            </div>
          </div>
        }
      />

      {/* ── CARD 5: DELAYED TRIPS ─────────────────────────────────────── */}
      <KpiCard
        title="DELAYED TRIPS"
        className="border-rose-300/80 hover:border-rose-500 dark:border-rose-500/40 cursor-pointer"
        value={
          <span>
            {delayedCount}
            <span className="text-[16px] font-semibold ml-1.5 opacity-85 text-rose-600 dark:text-rose-400">Overdue</span>
          </span>
        }
        variant="rose"
        icon={AlertTriangle}
        description="Active trips past scheduled timing"
        isActive={selectedStatus === 'Issues'}
        onClick={() => {
          setSelectedStatus('Issues');
          setCurrentPage(1);
        }}
        customFooter={
          <div className="relative h-9 mt-4 -mx-4 overflow-hidden rounded-b-lg bg-[#FFF5F5] dark:bg-[#DC2626]/10 border-t border-red-500/10">
            <style>{`
              @keyframes routeDashRed {
                to { stroke-dashoffset: -12; }
              }
            `}</style>
            <svg className="absolute inset-0 h-full w-full opacity-[0.06]" stroke="currentColor" fill="none">
              <pattern id="card-map-grid-red" width="12" height="12" patternUnits="userSpaceOnUse">
                <path d="M 12 0 L 0 0 0 12" strokeWidth="0.5" />
              </pattern>
              <rect width="100%" height="100%" fill="url(#card-map-grid-red)" />
            </svg>

            {/* Contour Lines */}
            <svg className="absolute inset-0 h-full w-full opacity-[0.3]" viewBox="0 0 280 48" preserveAspectRatio="none">
              <path d="M 45 -5 C 50 15, 40 35, 45 55" fill="none" stroke="#FECACA" strokeWidth="1.5" />
              <path d="M 115 -5 C 110 15, 120 35, 113 55" fill="none" stroke="#FECACA" strokeWidth="1.5" />
              <path d="M 180 -5 C 190 15, 175 35, 185 55" fill="none" stroke="#FECACA" strokeWidth="1.5" />
            </svg>

            {/* Route Line */}
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 280 48" preserveAspectRatio="none">
              <path d="M -10 24 C 70 10, 150 38, 290 24" fill="none" stroke="#D1D5DB" strokeWidth="3.5" strokeLinecap="round" />
              <path
                d="M -10 24 C 70 10, 150 38, 290 24"
                fill="none"
                stroke="#DC2626"
                strokeWidth="3"
                strokeDasharray="6,6"
                strokeLinecap="round"
                style={{ animation: 'routeDashRed 4s linear infinite' }}
              />
            </svg>

            {/* Origin Node */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
              <div className="h-2 w-2 rounded-full bg-red-500 ring-4 ring-red-500/20" />
            </div>

            {/* 3D Red Truck with Floating Maintenance/Overdue Badge */}
            <div
              className="absolute"
              style={{
                left: '52%',
                top: '40%',
                transform: 'translate(-50%, -50%) scale(0.65)',
                zIndex: 10
              }}
            >
              <div className="relative flex items-center justify-center">
                <div
                  className="absolute bottom-[22px] bg-red-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-md shadow-md flex items-center gap-1 animate-bounce"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                  <span>OVERDUE</span>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-red-600" />
                </div>

                <div className="absolute h-8 w-8 rounded-full bg-red-500/20" />

                <img
                  src="/truck_3d_orange_transparent.png"
                  alt="Delayed Truck"
                  className="h-9 w-9 object-contain"
                  style={{ filter: 'hue-rotate(335deg) saturate(0.8) brightness(0.9)' }}
                />
              </div>
            </div>
          </div>
        }
      />

    </div>
  );
};

export default TripKpiCards;
