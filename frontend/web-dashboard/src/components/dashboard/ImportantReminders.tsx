import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronsLeft,
  ChevronsRight,
  ShieldAlert,
  UserCheck,
  Truck,
  FileText,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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

  const reminders = [
    {
      id: 'REM-01',
      title: 'Insurance Renewal - VSA-3871',
      subtext: 'Expired 2 days ago',
      shortBadge: 'Expired',
      subtextColor: 'text-red-500',
      titleColor: 'text-red-600',
      badgeText: 'Compliance',
      badgeClass: 'text-red-500 border-red-300 bg-red-50',
      iconBg: 'bg-red-50 text-red-600 border-red-200',
      pillBg: 'bg-red-50 text-red-600 border border-red-200',
      BadgeIcon: ShieldAlert,
      ping: true,
    },
    {
      id: 'REM-02',
      title: 'Driver License - M. Faizan',
      subtext: 'Expires in 3 days',
      shortBadge: 'In 3d',
      subtextColor: 'text-amber-500',
      titleColor: 'text-slate-900',
      badgeText: 'Driver',
      badgeClass: 'text-amber-500 border-amber-300 bg-amber-50',
      iconBg: 'bg-amber-50 text-amber-600 border-amber-200',
      pillBg: 'bg-amber-50 text-amber-700 border border-amber-200',
      BadgeIcon: UserCheck,
      ping: false,
    },
    {
      id: 'REM-03',
      title: 'Vehicle Fitness - VRA-5510',
      subtext: 'Expires in 5 days',
      shortBadge: 'In 5d',
      subtextColor: 'text-red-500',
      titleColor: 'text-slate-900',
      badgeText: 'Compliance',
      badgeClass: 'text-red-500 border-red-300 bg-red-50',
      iconBg: 'bg-red-50 text-red-600 border-red-200',
      pillBg: 'bg-red-50 text-red-600 border border-red-200',
      BadgeIcon: Truck,
      ping: false,
    },
    {
      id: 'REM-04',
      title: 'Permit - ERA-9380',
      subtext: 'Expires in 12 days',
      shortBadge: 'In 12d',
      subtextColor: 'text-blue-500',
      titleColor: 'text-slate-900',
      badgeText: 'Permit',
      badgeClass: 'text-blue-500 border-blue-300 bg-blue-50',
      iconBg: 'bg-blue-50 text-blue-600 border-blue-200',
      pillBg: 'bg-blue-50 text-blue-600 border border-blue-200',
      BadgeIcon: FileText,
      ping: false,
    },
    {
      id: 'REM-05',
      title: 'Insurance Renewal - DRA-6484',
      subtext: 'Expires in 18 days',
      shortBadge: 'In 18d',
      subtextColor: 'text-red-500',
      titleColor: 'text-slate-900',
      badgeText: 'Compliance',
      badgeClass: 'text-red-500 border-red-300 bg-red-50',
      iconBg: 'bg-red-50 text-red-600 border-red-200',
      pillBg: 'bg-red-50 text-red-600 border border-red-200',
      BadgeIcon: ShieldAlert,
      ping: false,
    },
  ];

  return (
    <TooltipProvider delay={0}>
      <div className="relative h-full select-none">
        {/* Floating edge rail toggle button — Sidebar rail style */}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? 'Expand reminders' : 'Collapse reminders'}
            aria-expanded={!collapsed}
            title={`${collapsed ? 'Expand' : 'Collapse'} reminders (⌘R)`}
            className="
              group hidden lg:flex absolute -left-3.5 top-1/2 -translate-y-1/2 z-30
              w-7 h-7 items-center justify-center rounded-full
              bg-white border border-slate-200 text-slate-600 shadow-md shadow-black/10
              before:absolute before:-inset-2 before:content-['']
              hover:bg-[#E8450F] hover:border-[#E8450F] hover:text-white
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#E8450F]
              transition-colors duration-150 cursor-pointer
            "
          >
            {collapsed ? (
              <ChevronsLeft size={14} className="stroke-[2.25] transition-transform duration-150 group-hover:-translate-x-px" />
            ) : (
              <ChevronsRight size={14} className="stroke-[2.25] transition-transform duration-150 group-hover:translate-x-px" />
            )}
          </button>
        )}

        {/* Card shell container with smooth width clipping */}
        <div className="relative bg-white rounded-[18px] border border-black/[0.06] shadow-sm h-full overflow-hidden transition-all duration-300 ease-in-out">

          {/* ── LAYER 1: COLLAPSED RAIL VIEW (w-[76px]) ── */}
          <div
            className={`absolute inset-0 w-[76px] flex flex-col items-center justify-between py-4 px-1.5 transition-opacity duration-200 ease-in-out z-10 ${
              collapsed ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Top: Bell Icon & Count Badge */}
            <Tooltip>
              <TooltipTrigger>
                <div
                  onClick={onToggleCollapse}
                  className="relative flex flex-col items-center cursor-pointer group/bell"
                >
                  <div className="relative">
                    <span className="absolute inset-0 rounded-full bg-red-400/20 animate-ping" />
                    <div className="relative w-9 h-9 rounded-full bg-[#FFF3EE] flex items-center justify-center border border-orange-200 shadow-2xs group-hover/bell:scale-105 transition-transform duration-200">
                      <Bell className="w-4.5 h-4.5 text-[#E8450F] fill-[#E8450F]" />
                    </div>
                  </div>
                  <span className="mt-1 px-1.5 py-0.5 rounded-full bg-[#E53E3E] text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white shadow-xs">
                    {totalCount}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="font-bold text-[10px] bg-slate-900 text-white border border-slate-800 shadow-xl">
                {totalCount} Active Reminders — Click to Expand
              </TooltipContent>
            </Tooltip>

            {/* Middle: Timeline Icon Strip */}
            <div className="relative flex flex-col items-center gap-3 my-auto py-1 z-10 w-full">
              <div className="absolute top-2 bottom-2 w-[1.5px] bg-slate-100 rounded-full left-1/2 -translate-x-1/2 -z-10" />
              {reminders.map((item) => {
                const Icon = item.BadgeIcon;
                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger>
                      <div
                        onClick={() => navigate('/documents')}
                        className="relative z-10 flex items-center justify-center cursor-pointer group/item hover:scale-110 transition-transform duration-200"
                      >
                        <div className="relative">
                          <div className={`w-9 h-9 rounded-2xl ${item.iconBg} border flex items-center justify-center shadow-2xs group-hover/item:shadow-md transition-all duration-200`}>
                            <Icon className="w-4.5 h-4.5 stroke-[2.2]" />
                          </div>
                          {item.ping && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 ring-2 ring-white" />
                            </span>
                          )}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="bg-slate-900 text-white p-2.5 rounded-xl text-[10px] space-y-0.5 border border-slate-800 shadow-xl max-w-[200px]">
                      <p className="font-extrabold text-white leading-tight">{item.title}</p>
                      <p className="font-semibold text-amber-400 text-[9.5px]">{item.subtext}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          </div>

          {/* ── LAYER 2: EXPANDED PANEL VIEW (w-[318px] Fixed Layout) ── */}
          <div
            className={`w-[318px] shrink-0 flex flex-col h-full transition-opacity duration-200 ease-in-out ${
              collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
            }`}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Bell className="w-[18px] h-[18px] text-amber-400 fill-amber-400/30 shrink-0" />
                <span className="text-[13px] font-extrabold text-slate-900 tracking-tight truncate">
                  Important Reminders
                </span>
              </div>
            </div>

            {/* Status subheader row */}
            <div className="px-4 py-2 border-b border-slate-100 flex items-center gap-3 text-[11px] font-bold shrink-0">
              <button
                onClick={() => navigate('/documents?filter=expired')}
                className="flex items-center gap-1.5 text-red-500 hover:opacity-75 transition-opacity cursor-pointer shrink-0"
              >
                <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
                {expiredCount} Expired
              </button>
              <button
                onClick={() => navigate('/documents?filter=critical')}
                className="flex items-center gap-1.5 text-amber-500 hover:opacity-75 transition-opacity cursor-pointer shrink-0"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                {criticalCount} Critical
              </button>
              <button
                onClick={() => navigate('/documents?filter=warning')}
                className="flex items-center gap-1.5 text-blue-500 hover:opacity-75 transition-opacity cursor-pointer shrink-0"
              >
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                {warningCount} Warning
              </button>
              <span className="ml-auto text-slate-400 font-bold text-[10px] tracking-wider uppercase shrink-0">
                {totalCount} MONITORED
              </span>
            </div>

            {/* Reminders items list */}
            <div className="flex-1 divide-y divide-slate-100 overflow-y-auto min-h-0">
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

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] shrink-0">
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
      </div>
    </TooltipProvider>
  );
}
