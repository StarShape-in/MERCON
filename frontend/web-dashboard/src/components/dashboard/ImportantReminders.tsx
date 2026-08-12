import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronsLeft,
  ChevronsRight,
  ChevronRight,
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

  // Count by category
  const expiredCount = REMINDERS_DATA.filter(r => r.category === 'expired').length;
  const criticalCount = REMINDERS_DATA.filter(r => r.category === 'critical').length;
  const warningCount = REMINDERS_DATA.filter(r => r.category === 'warning').length;
  const totalCount = REMINDERS_DATA.length;

  // ── If Collapsed / Shrunk: Render the exact requested design on pure clean white ─────────────
  if (isCollapsed) {
    return (
      <div className="bg-white rounded-[22px] border border-black/[0.06] shadow-sm p-3.5 flex flex-col justify-between h-full transition-all duration-300 select-none overflow-hidden">
        
        {/* Top chevron toggle */}
        <div className="flex justify-center -mt-0.5">
          <button
            onClick={toggleCollapse}
            title="Restore Reminders Panel"
            className="p-0.5 rounded-full text-[#E8450F] hover:bg-slate-100 transition-all cursor-pointer group"
          >
            <ChevronsLeft className="w-3.5 h-3.5 stroke-[2.5] group-hover:-translate-x-0.5 transition-transform" />
          </button>
        </div>

        {/* Bell Icon with red count badge & Title */}
        <div className="flex flex-col items-center text-center -mt-1">
          <div className="relative mb-1">
            <div className="w-10 h-10 rounded-full bg-orange-50/80 border border-orange-100 flex items-center justify-center shadow-2xs">
              <Bell className="w-4.5 h-4.5 text-[#E8450F] fill-[#E8450F]" />
            </div>
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#EF4444] text-white text-[9px] font-black flex items-center justify-center ring-1.5 ring-white shadow-xs">
              {totalCount}
            </span>
          </div>

          <h2 className="text-[13px] font-extrabold text-[#111827] leading-tight tracking-tight">
            Important Reminders
          </h2>
          <p className="text-[9px] text-slate-500 font-medium leading-tight mt-0.5 max-w-[190px]">
            Stay on top of critical updates and actions.
          </p>
        </div>

        {/* Priority Action Cards (3 Cards from Design) */}
        <div className="w-full space-y-1.5 my-1">
          {/* High Priority */}
          <div
            onClick={() => navigate('/documents')}
            className="w-full bg-[#FFF5F5] hover:bg-[#FFEBEB] border border-[#FED7D7] rounded-xl px-2.5 py-1.5 flex items-center gap-2 transition-all cursor-pointer shadow-2xs group"
          >
            <div className="w-6 h-6 rounded-full bg-white border border-[#FEB2B2] text-[#E53E3E] font-black text-[10px] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              {expiredCount}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[10.5px] font-extrabold text-[#1F2937] leading-tight group-hover:text-[#E53E3E] transition-colors">
                High Priority
              </p>
              <p className="text-[8.5px] text-slate-500 font-medium leading-tight">
                Action needed
              </p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#E53E3E] shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Medium Priority */}
          <div
            onClick={() => navigate('/documents')}
            className="w-full bg-[#FFFDF0] hover:bg-[#FFF9DB] border border-[#FEEBC8] rounded-xl px-2.5 py-1.5 flex items-center gap-2 transition-all cursor-pointer shadow-2xs group"
          >
            <div className="w-6 h-6 rounded-full bg-white border border-[#FBD38D] text-[#DD6B20] font-black text-[10px] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              {criticalCount}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[10.5px] font-extrabold text-[#1F2937] leading-tight group-hover:text-[#DD6B20] transition-colors">
                Medium Priority
              </p>
              <p className="text-[8.5px] text-slate-500 font-medium leading-tight">
                Attention required
              </p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#DD6B20] shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Low Priority */}
          <div
            onClick={() => navigate('/documents')}
            className="w-full bg-[#F0F7FF] hover:bg-[#E1EFFF] border border-[#BEE3F8] rounded-xl px-2.5 py-1.5 flex items-center gap-2 transition-all cursor-pointer shadow-2xs group"
          >
            <div className="w-6 h-6 rounded-full bg-white border border-[#90CDF4] text-[#3182CE] font-black text-[10px] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
              {warningCount}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[10.5px] font-extrabold text-[#1F2937] leading-tight group-hover:text-[#3182CE] transition-colors">
                Low Priority
              </p>
              <p className="text-[8.5px] text-slate-500 font-medium leading-tight">
                For your info
              </p>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-[#3182CE] shrink-0 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        {/* Clipboard Checklist & Total Count Row */}
        <div className="flex items-center justify-center gap-3 text-center my-0.5">
          {/* Clipboard SVG */}
          <div className="relative">
            <svg width="32" height="32" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="12" y="8" width="32" height="42" rx="7" fill="#F8FAFC" stroke="#E2E8F0" strokeWidth="1.8"/>
              <rect x="21" y="4" width="14" height="7" rx="2.5" fill="#EEF2F6" stroke="#CBD5E1" strokeWidth="1.8"/>
              <circle cx="28" cy="7.5" r="1.5" fill="#E8450F"/>
              
              <rect x="17" y="17" width="5" height="5" rx="1" stroke="#FF8A65" strokeWidth="1.5"/>
              <path d="M18.5 19.5L19.8 21L23 18" stroke="#FF8A65" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="25" y1="19.5" x2="38" y2="19.5" stroke="#CBD5E1" strokeWidth="1.8" strokeLinecap="round"/>

              <rect x="17" y="26" width="5" height="5" rx="1" stroke="#FF8A65" strokeWidth="1.5"/>
              <path d="M18.5 28.5L19.8 30L23 27" stroke="#FF8A65" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="25" y1="28.5" x2="38" y2="28.5" stroke="#CBD5E1" strokeWidth="1.8" strokeLinecap="round"/>

              <rect x="17" y="35" width="5" height="5" rx="1" stroke="#FF8A65" strokeWidth="1.5"/>
              <path d="M18.5 37.5L19.8 39L23 36" stroke="#FF8A65" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="25" y1="37.5" x2="34" y2="37.5" stroke="#CBD5E1" strokeWidth="1.8" strokeLinecap="round"/>

              <circle cx="41" cy="41" r="7.5" fill="#FF8A65" stroke="#FFFFFF" strokeWidth="2"/>
              <text x="41" y="44.5" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="900" fontFamily="system-ui, sans-serif">!</text>
            </svg>
          </div>

          <div className="flex flex-col items-center">
            <p className="text-[8px] font-bold text-slate-400 tracking-wider uppercase">
              Total Reminders
            </p>

            {/* Big Number 5 with radiating dash sparks */}
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <svg width="9" height="14" viewBox="0 0 12 20" fill="none" className="text-[#FF8A65]">
                <line x1="10" y1="5" x2="2" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="10" y1="10" x2="0" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="10" y1="15" x2="2" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              
              <span className="text-lg font-black text-[#E8450F] tracking-tight leading-none">
                {totalCount}
              </span>

              <svg width="9" height="14" viewBox="0 0 12 20" fill="none" className="text-[#FF8A65]">
                <line x1="2" y1="5" x2="10" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="2" y1="10" x2="12" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <line x1="2" y1="15" x2="10" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
          </div>
        </div>

        {/* View All Reminders button & bottom chevron */}
        <div className="w-full pt-1 flex flex-col items-center">
          <button
            onClick={() => navigate('/documents')}
            className="w-full py-1.5 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-[#E8450F] border border-slate-200/80 font-extrabold text-[10px] flex items-center justify-center gap-1 transition-all shadow-2xs hover:shadow-xs cursor-pointer group"
          >
            <span>View All Reminders</span>
            <ChevronRight className="w-3 h-3 stroke-[2.5] group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button
            onClick={toggleCollapse}
            title="Restore Reminders Panel"
            className="p-0.5 mt-0.5 rounded-full text-[#E8450F] hover:bg-slate-100 transition-all cursor-pointer group"
          >
            <ChevronsLeft className="w-3.5 h-3.5 stroke-[2.5] group-hover:-translate-x-0.5 transition-transform" />
          </button>
        </div>

      </div>
    );
  }

  // ── Default / Full View ──────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-[18px] border border-black/[0.06] shadow-sm overflow-hidden flex flex-col h-full transition-all duration-300">
      {/* Header */}
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
          <TooltipContent side="left"><p className="text-xs">Shrink to compact view</p></TooltipContent>
        </Tooltip>
      </div>

      {/* Status counter row */}
      <div className="px-4 py-2 border-b border-slate-100/80 flex items-center justify-between text-[9px] font-bold bg-white">
        <button
          onClick={() => setSelectedFilter(selectedFilter === 'expired' ? 'all' : 'expired')}
          className={`flex items-center gap-1.5 transition-colors cursor-pointer ${selectedFilter === 'expired' ? 'text-red-700 font-extrabold underline' : 'text-red-600 hover:text-red-700'}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          {expiredCount} Expired
        </button>
        <button
          onClick={() => setSelectedFilter(selectedFilter === 'critical' ? 'all' : 'critical')}
          className={`flex items-center gap-1.5 transition-colors cursor-pointer ${selectedFilter === 'critical' ? 'text-amber-700 font-extrabold underline' : 'text-amber-600 hover:text-amber-700'}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          {criticalCount} Critical
        </button>
        <button
          onClick={() => setSelectedFilter(selectedFilter === 'warning' ? 'all' : 'warning')}
          className={`flex items-center gap-1.5 transition-colors cursor-pointer ${selectedFilter === 'warning' ? 'text-blue-700 font-extrabold underline' : 'text-blue-600 hover:text-blue-700'}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          {warningCount} Warning
        </button>
        <span className="text-slate-400 font-bold uppercase tracking-wider text-[8px]">
          {totalCount} MONITORED
        </span>
      </div>

      {/* Reminder items list */}
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

      {/* Footer */}
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
