import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpRight,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ReminderItem {
  id: string;
  title: string;
  subtext: string;
  subtextColor: string;
  badgeText: string;
  badgeClass: string;
  badgeIcon: any;
  category: 'expired' | 'critical' | 'warning';
}

const REMINDERS_DATA: ReminderItem[] = [
  {
    id: 'REM-01',
    title: 'Insurance Renewal - VSA-3871',
    subtext: 'Expired 2 days ago',
    subtextColor: 'text-red-500',
    badgeText: 'Compliance',
    badgeClass: 'bg-red-50 text-red-600 border-red-200',
    badgeIcon: AlertTriangle,
    category: 'expired',
  },
  {
    id: 'REM-02',
    title: 'Driver License - Mohammed Faizan',
    subtext: 'Expires in 3 days',
    subtextColor: 'text-amber-500',
    badgeText: 'Driver',
    badgeClass: 'bg-orange-50 text-orange-600 border-orange-200',
    badgeIcon: AlertTriangle,
    category: 'critical',
  },
  {
    id: 'REM-03',
    title: 'Vehicle Fitness - VRA-5510',
    subtext: 'Expires in 5 days',
    subtextColor: 'text-red-500',
    badgeText: 'Compliance',
    badgeClass: 'bg-red-50 text-red-600 border-red-200',
    badgeIcon: AlertTriangle,
    category: 'critical',
  },
  {
    id: 'REM-04',
    title: 'Permit - ERA-9380',
    subtext: 'Expires in 12 days',
    subtextColor: 'text-blue-500',
    badgeText: 'Permit',
    badgeClass: 'bg-blue-50 text-blue-600 border-blue-200',
    badgeIcon: Info,
    category: 'warning',
  },
  {
    id: 'REM-05',
    title: 'Insurance Renewal - DRA-6484',
    subtext: 'Expires in 18 days',
    subtextColor: 'text-red-500',
    badgeText: 'Compliance',
    badgeClass: 'bg-red-50 text-red-600 border-red-200',
    badgeIcon: AlertTriangle,
    category: 'warning',
  },
];

interface ImportantRemindersProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function ImportantReminders({
  collapsed: externalCollapsed,
  onToggleCollapse,
}: ImportantRemindersProps = {}) {
  const navigate = useNavigate();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'expired' | 'critical' | 'warning'>('all');

  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;
  const toggleCollapse = onToggleCollapse || (() => setInternalCollapsed(!internalCollapsed));

  const filteredReminders = selectedFilter === 'all' 
    ? REMINDERS_DATA 
    : REMINDERS_DATA.filter(r => r.category === selectedFilter);

  // If collapsed in grid, render the compact vertical strip
  if (isCollapsed) {
    return (
      <div
        onClick={toggleCollapse}
        className="bg-white rounded-[18px] border border-black/[0.06] shadow-sm hover:border-[#E8450F]/40 hover:shadow-md transition-all cursor-pointer flex flex-col items-center justify-between py-3.5 px-1.5 h-full min-h-[300px] group select-none"
        title="Click to expand Important Reminders"
      >
        {/* Top: Bell icon & expand button */}
        <div className="flex flex-col items-center gap-2.5">
          <Tooltip>
            <TooltipTrigger
              onClick={(e) => {
                e.stopPropagation();
                toggleCollapse();
              }}
              className="p-1 rounded-lg text-slate-400 group-hover:text-[#E8450F] hover:bg-slate-100 transition-colors"
            >
              <ChevronsLeft className="w-4 h-4 text-[#E8450F]" />
            </TooltipTrigger>
            <TooltipContent side="left"><p className="text-xs">Expand Reminders</p></TooltipContent>
          </Tooltip>

          <div className="relative">
            <div className="w-7 h-7 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center">
              <Bell className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
          </div>
        </div>

        {/* Middle: Badge counters & Vertical title */}
        <div className="flex flex-col items-center gap-2.5 my-auto py-2">
          <div className="flex flex-col items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-red-50 border border-red-200 text-red-600 text-[9px] font-black flex items-center justify-center shadow-2xs" title="1 Expired">
              1
            </span>
            <span className="w-5 h-5 rounded-full bg-amber-50 border border-amber-200 text-amber-600 text-[9px] font-black flex items-center justify-center shadow-2xs" title="2 Critical">
              2
            </span>
            <span className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-[9px] font-black flex items-center justify-center shadow-2xs" title="2 Warning">
              2
            </span>
          </div>

          <div className="[writing-mode:vertical-rl] rotate-180 text-[10px] font-extrabold tracking-widest uppercase text-slate-400 group-hover:text-[#E8450F] transition-colors mt-2">
            Reminders (5)
          </div>
        </div>

        {/* Bottom: Mini expand indicator */}
        <div className="pt-2 text-[9px] font-extrabold text-[#E8450F] flex items-center justify-center">
          <ChevronsLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[18px] border border-black/[0.06] shadow-sm overflow-hidden flex flex-col h-full transition-all duration-300">
      {/* ── Header ── */}
      <div className="px-4 py-3.5 border-b border-black/[0.04] flex items-center justify-between bg-slate-50/40">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-amber-500 fill-amber-500/20" />
          <span className="text-[11px] font-extrabold text-slate-900 tracking-tight">
            Important Reminders
          </span>
        </div>
        <Tooltip>
          <TooltipTrigger
            onClick={toggleCollapse}
            className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </TooltipTrigger>
          <TooltipContent side="left"><p className="text-xs">Collapse reminders</p></TooltipContent>
        </Tooltip>
      </div>

      {/* ── Status counter row ── */}
      <div className="px-4 py-2 border-b border-slate-100/80 flex items-center justify-between text-[9px] font-bold bg-white">
        <button
          onClick={() => setSelectedFilter(selectedFilter === 'expired' ? 'all' : 'expired')}
          className={`flex items-center gap-1.5 transition-colors cursor-pointer ${selectedFilter === 'expired' ? 'text-red-700 font-extrabold underline' : 'text-red-600 hover:text-red-700'}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          1 Expired
        </button>
        <button
          onClick={() => setSelectedFilter(selectedFilter === 'critical' ? 'all' : 'critical')}
          className={`flex items-center gap-1.5 transition-colors cursor-pointer ${selectedFilter === 'critical' ? 'text-amber-700 font-extrabold underline' : 'text-amber-600 hover:text-amber-700'}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          2 Critical
        </button>
        <button
          onClick={() => setSelectedFilter(selectedFilter === 'warning' ? 'all' : 'warning')}
          className={`flex items-center gap-1.5 transition-colors cursor-pointer ${selectedFilter === 'warning' ? 'text-blue-700 font-extrabold underline' : 'text-blue-600 hover:text-blue-700'}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          2 Warning
        </button>
        <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">
          5 MONITORED
        </span>
      </div>

      {/* ── Reminder items list ── */}
      <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
        {filteredReminders.map((item) => {
          const Icon = item.badgeIcon;
          return (
            <div
              key={item.id}
              onClick={() => navigate('/documents')}
              className="px-4 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50/80 transition-colors cursor-pointer group"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-slate-800 group-hover:text-[#E8450F] transition-colors truncate">
                  {item.title}
                </p>
                <p className={`text-[10px] font-semibold ${item.subtextColor} mt-0.5`}>
                  {item.subtext}
                </p>
              </div>
              <Badge
                variant="outline"
                className={`shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${item.badgeClass}`}
              >
                <Icon className="w-2.5 h-2.5" />
                {item.badgeText}
              </Badge>
            </div>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div className="px-4 py-2.5 border-t border-slate-100/80 bg-slate-50/40 flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1.5 text-slate-500 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Auto-monitoring is active
        </div>
        <button
          onClick={() => navigate('/documents')}
          className="font-bold text-[#E8450F] hover:underline flex items-center gap-0.5 cursor-pointer"
        >
          View All <ArrowUpRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
