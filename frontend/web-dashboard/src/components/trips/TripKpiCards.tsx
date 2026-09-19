import React from 'react';
import { cn } from '@/lib/utils';
import { DateFilterType } from '@/components/trips/TripDateFilterPicker';
import { MapPin, CheckCircle2, Calendar, AlertTriangle, Truck } from 'lucide-react';

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

/** Vector Box Truck Silhouette matching design spec */
const TruckSilhouette = ({ className = "w-6 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 28 18" fill="currentColor" className={className}>
    {/* Main Freight Box Container */}
    <rect x="0" y="2" width="18" height="11" rx="1.5" />
    {/* Driver Cabin */}
    <path d="M19 6h5a2 2 0 0 1 2 2v5h-7V6z" />
    {/* Cabin Window */}
    <path d="M21 7.5h3.5v3H21v-3z" fill="white" fillOpacity="0.45" />
    {/* Wheels */}
    <circle cx="5" cy="14.5" r="2.2" fill="#1E293B" stroke="white" strokeWidth="0.8" />
    <circle cx="21.5" cy="14.5" r="2.2" fill="#1E293B" stroke="white" strokeWidth="0.8" />
  </svg>
);

/** Checkered Finish Flag for Delivered Card */
const CheckeredFlag = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 20 20" fill="none" className={className}>
    <path d="M4 2v16" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" />
    <path d="M4 3h12l-2 3.5 2 3.5H4V3z" fill="#2563EB" />
    <path d="M4 3h3v3.5H4V3zm6 0h3v3.5h-3V3zm-3 3.5h3V10H7V6.5z" fill="white" />
  </svg>
);

/** Traffic Warning Sign & Cone for Delayed Card */
const WarningSignCone = ({ className = "w-5 h-5" }: { className?: string }) => (
  <div className={cn("inline-flex items-center gap-0.5 shrink-0", className)}>
    {/* Warning Triangle Sign */}
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-rose-600">
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
    </svg>
    {/* Construction Cone */}
    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-orange-600">
      <path d="M7 1a1 1 0 0 1 2 0v1.2l1.6 6.4A1 1 0 0 1 9.63 10H6.37a1 1 0 0 1-.97-1.4L7 2.2V1z" />
      <path d="M1 13a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H2a1 1 0 0 1-1-1z" />
    </svg>
  </div>
);

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 shrink-0">

      {/* ── CARD 1: TODAY'S TRIPS (Total Period) ────────────────────────── */}
      <div
        onClick={() => {
          setSelectedStatus('All');
          setCurrentPage(1);
        }}
        className={cn(
          "group relative flex flex-col justify-between p-4 rounded-2xl bg-white border transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md",
          selectedStatus === 'All'
            ? "border-[#FA634E] ring-2 ring-[#FA634E]/20 bg-orange-50/10"
            : "border-slate-200/90 hover:border-orange-300"
        )}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase truncate">
            {kpiTitle}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Period Selector Pills */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 shadow-2xs">
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

            {/* Icon Badge */}
            <div className="w-8 h-8 rounded-xl bg-[#FFF4ED] border border-orange-100 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4 text-[#FA634E]" />
            </div>
          </div>
        </div>

        {/* Main Stat & Legend */}
        <div className="mt-3.5 mb-3">
          <div className="flex items-baseline">
            <span className="text-3xl font-black tracking-tight text-slate-900">
              {periodCount}
            </span>
            <span className="text-base font-bold text-slate-800 ml-2">
              Trips
            </span>
          </div>

          {/* Sub-Legend with Dots */}
          <div className="flex items-center flex-wrap gap-x-2.5 gap-y-1 mt-1.5 text-[11px] font-semibold text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Completed</span>
              <strong className="text-slate-900 font-bold ml-0.5">{periodCompletedCount}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
              <span>In Transit</span>
              <strong className="text-slate-900 font-bold ml-0.5">{periodInTransitCount}</strong>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
              <span>Pending</span>
              <strong className="text-slate-900 font-bold ml-0.5">{periodQueueCount}</strong>
            </span>
          </div>
        </div>

        {/* Road Progress Graphic */}
        <div className="relative pt-2 pb-1 flex items-center w-full">
          {/* Dashed Road Line */}
          <div className="w-full flex items-center relative">
            {/* Start Node */}
            <div className="w-3 h-3 rounded-full border-2 border-[#FA634E] bg-white shrink-0 z-10" />
            
            {/* Active Orange Segment */}
            <div className="h-0 border-b-2 border-dashed border-[#FA634E] flex-1 max-w-[45%]" />
            
            {/* Truck Icon */}
            <div className="shrink-0 -mx-1 text-[#FA634E] z-10 transform -translate-y-0.5">
              <TruckSilhouette className="w-6 h-4 text-[#FA634E]" />
            </div>

            {/* Remaining Dashed Segment */}
            <div className="h-0 border-b-2 border-dashed border-slate-300 flex-1" />

            {/* End Node */}
            <div className="w-3 h-3 rounded-full border-2 border-slate-300 bg-white shrink-0 z-10" />
          </div>
        </div>
      </div>

      {/* ── CARD 2: IN TRANSIT ────────────────────────────────────────── */}
      <div
        onClick={() => {
          setSelectedStatus('InTransit');
          setCurrentPage(1);
        }}
        className={cn(
          "group relative flex flex-col justify-between p-4 rounded-2xl bg-white border transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md",
          selectedStatus === 'InTransit'
            ? "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/10"
            : "border-slate-200/90 hover:border-emerald-300"
        )}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase truncate">
            IN TRANSIT
          </span>
          <div className="w-8 h-8 rounded-xl bg-[#F0FDF4] border border-emerald-100 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4 text-[#16A34A]" />
          </div>
        </div>

        {/* Main Stat */}
        <div className="mt-3.5 mb-3">
          <div className="flex items-baseline">
            <span className="text-3xl font-black tracking-tight text-[#16A34A]">
              {inTransitCount}
            </span>
            <span className="text-base font-bold text-slate-900 ml-2">
              On Road
            </span>
          </div>
        </div>

        {/* Road Progress Graphic */}
        <div className="relative pt-6 pb-1 flex items-center w-full">
          <div className="w-full flex items-center relative">
            {/* Start Node */}
            <div className="w-3 h-3 rounded-full border-2 border-[#16A34A] bg-white shrink-0 z-10" />

            {/* Dashed Line */}
            <div className="h-0 border-b-2 border-dashed border-[#16A34A] flex-1" />

            {/* Centered Green Truck */}
            <div className="absolute left-1/2 transform -translate-x-1/2 -translate-y-0.5 text-[#16A34A] z-10">
              <TruckSilhouette className="w-6 h-4 text-[#16A34A]" />
            </div>

            {/* End Node */}
            <div className="w-3 h-3 rounded-full border-2 border-[#16A34A] bg-white shrink-0 z-10" />
          </div>
        </div>
      </div>

      {/* ── CARD 3: DELIVERED & COMPLETED ─────────────────────────────── */}
      <div
        onClick={() => {
          setSelectedStatus('Completed,Invoiced');
          setCurrentPage(1);
        }}
        className={cn(
          "group relative flex flex-col justify-between p-4 rounded-2xl bg-white border transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md",
          (selectedStatus === 'Completed,Invoiced' || selectedStatus === 'Completed' || selectedStatus === 'Invoiced')
            ? "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/10"
            : "border-slate-200/90 hover:border-blue-300"
        )}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase truncate">
            DELIVERED &amp; COMPLETED
          </span>
          <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] border border-blue-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4 text-[#2563EB]" />
          </div>
        </div>

        {/* Main Stat */}
        <div className="mt-3.5 mb-3">
          <div className="flex items-baseline">
            <span className="text-3xl font-black tracking-tight text-[#2563EB]">
              {completedCount}
            </span>
            <span className="text-base font-bold text-slate-900 ml-2">
              Trips
            </span>
          </div>
        </div>

        {/* Road Progress Graphic */}
        <div className="relative pt-6 pb-1 flex items-center w-full">
          <div className="w-full flex items-center relative">
            {/* Start Node */}
            <div className="w-3 h-3 rounded-full border-2 border-[#2563EB] bg-white shrink-0 z-10" />

            {/* Dashed Line */}
            <div className="h-0 border-b-2 border-dashed border-[#2563EB] flex-1" />

            {/* Truck near destination */}
            <div className="shrink-0 -mr-1.5 text-[#2563EB] z-10 transform -translate-y-0.5">
              <TruckSilhouette className="w-6 h-4 text-[#2563EB]" />
            </div>

            {/* Checkered Flag Node */}
            <div className="relative shrink-0 z-10 ml-0.5 transform -translate-y-2">
              <CheckeredFlag className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* ── CARD 4: SCHEDULED TRIPS ───────────────────────────────────── */}
      <div
        onClick={() => {
          setSelectedStatus('Draft');
          setCurrentPage(1);
        }}
        className={cn(
          "group relative flex flex-col justify-between p-4 rounded-2xl bg-white border transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md",
          selectedStatus === 'Draft'
            ? "border-slate-500 ring-2 ring-slate-400/20 bg-slate-50"
            : "border-slate-200/90 hover:border-slate-400"
        )}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase truncate">
            SCHEDULED TRIPS
          </span>
          <div className="w-8 h-8 rounded-xl bg-[#F8FAFC] border border-slate-200 flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 text-[#64748B]" />
          </div>
        </div>

        {/* Main Stat */}
        <div className="mt-3.5 mb-3">
          <div className="flex items-baseline">
            <span className="text-3xl font-black tracking-tight text-slate-900">
              {scheduledCount}
            </span>
            <span className="text-base font-bold text-slate-900 ml-2">
              Scheduled
            </span>
          </div>
        </div>

        {/* Road Progress Graphic */}
        <div className="relative pt-6 pb-1 flex items-center w-full">
          <div className="w-full flex items-center relative">
            {/* Start Node */}
            <div className="w-3 h-3 rounded-full border-2 border-slate-400 bg-white shrink-0 z-10" />

            {/* Gray Truck Positioned Early */}
            <div className="shrink-0 ml-4 -mr-1.5 text-slate-500 z-10 transform -translate-y-0.5">
              <TruckSilhouette className="w-6 h-4 text-slate-500" />
            </div>

            {/* Remaining Dashed Line */}
            <div className="h-0 border-b-2 border-dashed border-slate-300 flex-1" />

            {/* End Node */}
            <div className="w-3 h-3 rounded-full border-2 border-slate-300 bg-white shrink-0 z-10" />
          </div>
        </div>
      </div>

      {/* ── CARD 5: DELAYED TRIPS ─────────────────────────────────────── */}
      <div
        onClick={() => {
          setSelectedStatus('Issues');
          setCurrentPage(1);
        }}
        className={cn(
          "group relative flex flex-col justify-between p-4 rounded-2xl bg-white border transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-md",
          selectedStatus === 'Issues'
            ? "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/10"
            : "border-slate-200/90 hover:border-rose-300"
        )}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between gap-1.5">
          <span className="text-[11px] font-extrabold tracking-wider text-slate-400 uppercase truncate">
            DELAYED TRIPS
          </span>
          <div className="w-8 h-8 rounded-xl bg-[#FEF2F2] border border-rose-100 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
          </div>
        </div>

        {/* Main Stat */}
        <div className="mt-3.5 mb-3">
          <div className="flex items-baseline">
            <span className="text-3xl font-black tracking-tight text-[#DC2626]">
              {delayedCount}
            </span>
            <span className="text-base font-bold text-[#DC2626] ml-2">
              Overdue
            </span>
          </div>
        </div>

        {/* Road Progress Graphic */}
        <div className="relative pt-6 pb-1 flex items-center w-full">
          <div className="w-full flex items-center relative">
            {/* Start Node */}
            <div className="w-3 h-3 rounded-full border-2 border-rose-500 bg-white shrink-0 z-10" />

            {/* Red Dashed Line */}
            <div className="h-0 border-b-2 border-dashed border-rose-400 flex-1" />

            {/* Red Truck */}
            <div className="shrink-0 -mx-1 text-[#DC2626] z-10 transform -translate-y-0.5">
              <TruckSilhouette className="w-6 h-4 text-[#DC2626]" />
            </div>

            {/* Warning Sign & Cone */}
            <div className="shrink-0 ml-1 mr-1 z-10 transform -translate-y-0.5">
              <WarningSignCone />
            </div>

            {/* End Node */}
            <div className="w-3 h-3 rounded-full border-2 border-rose-500 bg-white shrink-0 z-10" />
          </div>
        </div>
      </div>

    </div>
  );
};

export default TripKpiCards;
