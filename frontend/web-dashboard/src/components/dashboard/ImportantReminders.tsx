import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronsLeft,
  ChevronsRight,
  ChevronRight,
  MoreVertical,
  Flag,
  Clock,
  Info,
  Eye,
} from 'lucide-react';

interface ImportantRemindersProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function ImportantReminders({
  collapsed = false,
  onToggleCollapse,
}: ImportantRemindersProps) {
  const navigate = useNavigate();

  const expiredCount = 1;
  const criticalCount = 2;
  const warningCount = 2;
  const totalCount = expiredCount + criticalCount + warningCount;

  // ── COLLAPSED ALERT STRIP ──
  if (collapsed) {
    return (
      <div className="relative h-full">
        {/* Floating toggle button — slate, no orange */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            aria-label="Expand reminders"
            title="Expand reminders"
            className="group hidden lg:flex absolute -left-3.5 top-1/2 -translate-y-1/2 z-30
              w-7 h-7 items-center justify-center rounded-full
              bg-white border border-slate-200 text-slate-500 shadow-md shadow-black/10
              hover:bg-[#E8450F] hover:border-[#E8450F] hover:text-white
              transition-colors duration-150 cursor-pointer"
          >
            <ChevronsLeft size={14} className="stroke-[2.25] transition-transform duration-150 group-hover:-translate-x-px" />
          </button>
        )}

        <div
          onClick={onToggleCollapse}
          className="relative bg-white rounded-[24px] border border-black/[0.06] shadow-sm cursor-pointer flex flex-col items-center justify-between py-5 px-2.5 h-full select-none group overflow-hidden
            hover:border-slate-200 hover:shadow-md transition-all duration-200"
        >
          {/* Bell — red alert styling, no orange */}
          <div className="relative flex items-center justify-center mt-1 z-10">
            <span className="absolute w-10 h-10 rounded-full bg-red-400/15 animate-ping" />
            <span className="absolute w-8 h-8 rounded-full bg-red-400/10" />
            <div className="relative w-9 h-9 rounded-full bg-red-50 flex items-center justify-center border border-red-100">
              <Bell className="w-[18px] h-[18px] text-red-500 fill-red-500" />
            </div>
          </div>

          {/* 3 vivid alert dots */}
          <div className="flex flex-col items-center gap-3.5 z-10">
            {/* High — red */}
            <span className="relative flex h-3 w-3" title="High Priority">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
            </span>

            {/* Medium — amber */}
            <span className="relative flex h-3 w-3" title="Medium Priority">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60 [animation-delay:400ms]" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-400" />
            </span>

            {/* Low — blue */}
            <span className="relative flex h-3 w-3" title="Low Priority">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-60 [animation-delay:800ms]" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-400" />
            </span>
          </div>

          {/* "!" alert badge — red, no orange */}
          <div className="w-7 h-7 rounded-full bg-red-50 border border-red-200 flex items-center justify-center z-10
            group-hover:bg-red-500 group-hover:border-red-500 transition-colors duration-200">
            <span className="text-[13px] font-black text-red-500 leading-none group-hover:text-white transition-colors duration-200">!</span>
          </div>

          {/* Expand chevron */}
          <div className="z-10 mb-0.5">
            <ChevronsRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors duration-200" />
          </div>
        </div>
      </div>
    );
  }



  // ── EXPANDED VIEW ──



  const reminders = [
    {
      id: 'REM-01',
      title: 'Insurance Renewal - VSA-3871',
      subtext: 'Expired 2 days ago',
      subtextColor: 'text-red-500',
      titleColor: 'text-red-600',
      badgeText: 'Compliance',
      badgeClass: 'text-red-500 border-red-300 bg-red-50',
      BadgeIcon: Flag,
    },
    {
      id: 'REM-02',
      title: 'Driver License - Mohammed Faizan',
      subtext: 'Expires in 3 days',
      subtextColor: 'text-amber-500',
      titleColor: 'text-slate-900',
      badgeText: 'Driver',
      badgeClass: 'text-amber-500 border-amber-300 bg-amber-50',
      BadgeIcon: Flag,
    },
    {
      id: 'REM-03',
      title: 'Vehicle Fitness - VRA-5510',
      subtext: 'Expires in 5 days',
      subtextColor: 'text-red-500',
      titleColor: 'text-slate-900',
      badgeText: 'Compliance',
      badgeClass: 'text-red-500 border-red-300 bg-red-50',
      BadgeIcon: Flag,
    },
    {
      id: 'REM-04',
      title: 'Permit - ERA-9380',
      subtext: 'Expires in 12 days',
      subtextColor: 'text-blue-500',
      titleColor: 'text-slate-900',
      badgeText: 'Permit',
      badgeClass: 'text-blue-500 border-blue-300 bg-blue-50',
      BadgeIcon: Info,
    },
    {
      id: 'REM-05',
      title: 'Insurance Renewal - DRA-6484',
      subtext: 'Expires in 18 days',
      subtextColor: 'text-red-500',
      titleColor: 'text-slate-900',
      badgeText: 'Compliance',
      badgeClass: 'text-red-500 border-red-300 bg-red-50',
      BadgeIcon: Flag,
    },
  ];

  return (
    <div className="relative h-full">
      {/* Floating collapse button on edge — sidebar style */}
      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          aria-label="Collapse reminders"
          title="Collapse reminders"
          className="group hidden lg:flex absolute -left-3.5 top-1/2 -translate-y-1/2 z-30
            w-7 h-7 items-center justify-center rounded-full
            bg-white border border-orange-200 text-[#E8450F] shadow-md shadow-black/10
            hover:bg-[#E8450F] hover:border-[#E8450F] hover:text-white
            transition-colors duration-150 cursor-pointer"
        >
          <ChevronsRight size={14} className="stroke-[2.25] transition-transform duration-150 group-hover:translate-x-px" />
        </button>
      )}

      <div className="bg-white rounded-[18px] border border-black/[0.06] shadow-sm flex flex-col h-full overflow-hidden">

        {/* ── Header ── */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-[18px] h-[18px] text-amber-400 fill-amber-400/30" />
            <span className="text-[13px] font-extrabold text-slate-900 tracking-tight">
              Important Reminders
            </span>
          </div>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              title="Collapse"
              className="text-slate-400 hover:text-[#E8450F] transition-colors cursor-pointer p-0.5"
            >
              <ChevronsRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}
        </div>

        {/* ── Status row: 1 Expired · 2 Critical · 2 Warning · 5 MONITORED ── */}
        <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-3 text-[11px] font-bold">
          <button
            onClick={() => navigate('/documents?filter=expired')}
            className="flex items-center gap-1.5 text-red-500 hover:opacity-75 transition-opacity cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            {expiredCount} Expired
          </button>
          <button
            onClick={() => navigate('/documents?filter=critical')}
            className="flex items-center gap-1.5 text-amber-500 hover:opacity-75 transition-opacity cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
            {criticalCount} Critical
          </button>
          <button
            onClick={() => navigate('/documents?filter=warning')}
            className="flex items-center gap-1.5 text-blue-500 hover:opacity-75 transition-opacity cursor-pointer"
          >
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            {warningCount} Warning
          </button>
          <span className="ml-auto text-slate-400 font-bold text-[10px] tracking-wider uppercase">
            {totalCount} MONITORED
          </span>
        </div>

        {/* ── Reminder items list ── */}
        <div className="flex-1 divide-y divide-slate-100 overflow-y-auto">
          {reminders.map((item) => {
            const Icon = item.BadgeIcon;
            return (
              <div
                key={item.id}
                onClick={() => navigate('/documents')}
                className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors cursor-pointer group"
              >
                <div className="min-w-0 flex-1">
                  <p className={`text-[12px] font-bold leading-tight truncate ${item.titleColor} group-hover:opacity-80 transition-opacity`}>
                    {item.title}
                  </p>
                  <p className={`text-[11px] font-semibold mt-0.5 ${item.subtextColor}`}>
                    {item.subtext}
                  </p>
                </div>
                <span className={`shrink-0 inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border ${item.badgeClass} whitespace-nowrap`}>
                  <Icon className="w-3 h-3" />
                  {item.badgeText}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Footer: auto-monitoring + view all ── */}
        <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-500 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
            Auto-monitoring is active
          </div>
          <button
            onClick={() => navigate('/documents')}
            className="font-bold text-[#E8450F] hover:underline flex items-center gap-0.5 cursor-pointer transition-colors"
          >
            View All <span className="ml-0.5 text-[13px] leading-none">↗</span>
          </button>
        </div>

      </div>
    </div>
  );
}
