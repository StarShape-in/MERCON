import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  AlertTriangle,
  RotateCw,
  ArrowUpRight,
  ShieldCheck,
  User,
  FileText,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export interface ReminderItem {
  id: string;
  title: string;
  subtitle: string;
  isExpired?: boolean;
  isCritical?: boolean;
  category: 'Compliance' | 'Driver' | 'Permit' | 'Maintenance' | 'General';
  accentBorder: string; // e.g. 'border-l-rose-500'
  subtitleColor: string; // e.g. 'text-rose-500'
  badgeBg: string; // e.g. 'bg-rose-50 text-rose-600 border-rose-200'
  link?: string;
}

const DEFAULT_REMINDERS: ReminderItem[] = [
  {
    id: 'rem-1',
    title: 'Insurance Renewal - VSA-3871',
    subtitle: 'Expired 2 days ago',
    isExpired: true,
    category: 'Compliance',
    accentBorder: 'border-l-rose-500',
    subtitleColor: 'text-rose-500 font-semibold',
    badgeBg: 'bg-rose-50 text-rose-600 border-rose-200',
    link: '/documents/expiry',
  },
  {
    id: 'rem-2',
    title: 'Driver License - Mohammed Faizan',
    subtitle: 'Expires in 3 days',
    isCritical: true,
    category: 'Driver',
    accentBorder: 'border-l-amber-500',
    subtitleColor: 'text-amber-600 font-semibold',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
    link: '/documents/expiry',
  },
  {
    id: 'rem-3',
    title: 'Vehicle Fitness - VRA-5510',
    subtitle: 'Expires in 5 days',
    isCritical: true,
    category: 'Compliance',
    accentBorder: 'border-l-emerald-500',
    subtitleColor: 'text-emerald-600 font-semibold',
    badgeBg: 'bg-rose-50 text-rose-600 border-rose-200',
    link: '/documents/expiry',
  },
  {
    id: 'rem-4',
    title: 'Permit - ERA-9380',
    subtitle: 'Expires in 12 days',
    category: 'Permit',
    accentBorder: 'border-l-blue-500',
    subtitleColor: 'text-blue-600 font-semibold',
    badgeBg: 'bg-blue-50 text-blue-600 border-blue-200',
    link: '/documents/expiry',
  },
  {
    id: 'rem-5',
    title: 'Insurance Renewal - DRA-6484',
    subtitle: 'Expires in 18 days',
    category: 'Compliance',
    accentBorder: 'border-l-rose-400',
    subtitleColor: 'text-rose-500 font-semibold',
    badgeBg: 'bg-rose-50 text-rose-600 border-rose-200',
    link: '/documents/expiry',
  },
];

interface ImportantRemindersWidgetProps {
  reminders?: ReminderItem[];
  className?: string;
  onRefresh?: () => Promise<void> | void;
}

export default function ImportantRemindersWidget({
  reminders = DEFAULT_REMINDERS,
  className = '',
  onRefresh,
}: ImportantRemindersWidgetProps) {
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const expiredCount = reminders.filter((r) => r.isExpired).length;
  const criticalCount = reminders.filter((r) => r.isCritical).length;
  const upcomingCount = reminders.length - expiredCount - criticalCount;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    if (onRefresh) {
      await onRefresh();
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Compliance':
        return <ShieldCheck className="w-2.5 h-2.5 shrink-0" />;
      case 'Driver':
        return <User className="w-2.5 h-2.5 shrink-0" />;
      case 'Permit':
        return <FileText className="w-2.5 h-2.5 shrink-0" />;
      default:
        return <Sparkles className="w-2.5 h-2.5 shrink-0" />;
    }
  };

  return (
    <div
      className={`bg-white rounded-[18px] border border-black/[0.06] shadow-sm overflow-hidden flex flex-col justify-between h-full ${className}`}
    >
      {/* ── Card Top Header ── */}
      <div>
        <div className="px-4 py-3 border-b border-black/[0.04] flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-amber-50 border border-amber-200/80 flex items-center justify-center shadow-2xs">
              <Bell className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
            </div>
            <span className="text-[12px] font-extrabold text-slate-800 tracking-tight">
              Important Reminders
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {expiredCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-50 text-rose-600 border border-rose-200">
                <AlertTriangle className="w-2.5 h-2.5 stroke-[2.5]" />
                {expiredCount} Expired
              </span>
            )}

            <button
              onClick={handleRefresh}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              title="Refresh reminders"
            >
              <RotateCw
                className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-slate-700' : ''}`}
              />
            </button>

            <button
              onClick={() => navigate('/documents/expiry')}
              className="h-6 px-2 rounded-md bg-[#E8450F] hover:bg-[#C7380A] text-white text-[9px] font-extrabold flex items-center gap-0.5 shadow-2xs transition-all active:scale-95"
            >
              View All <ArrowUpRight className="w-2.5 h-2.5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* ── Subheader / Status Summary Bar ── */}
        <div className="px-4 py-2 bg-slate-50/30 border-b border-slate-100 flex items-center justify-between text-[9px]">
          <div className="flex items-center gap-3 font-bold">
            <div className="flex items-center gap-1 text-slate-700">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span className="font-extrabold">{expiredCount} Expired</span>
            </div>
            <div className="flex items-center gap-1 text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>{criticalCount} Critical (≤7d)</span>
            </div>
            <div className="flex items-center gap-1 text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              <span>{upcomingCount} Upcoming</span>
            </div>
          </div>
          <span className="text-[8px] font-extrabold text-slate-400 font-mono tracking-wider">
            {reminders.length} MONITORED
          </span>
        </div>

        {/* ── Reminders List ── */}
        <div className="p-3 flex flex-col gap-2">
          {reminders.map((item) => (
            <div
              key={item.id}
              onClick={() => item.link && navigate(item.link)}
              className={`group flex items-center justify-between p-2.5 rounded-xl border border-slate-100 bg-white hover:bg-slate-50/80 hover:border-slate-200 transition-all cursor-pointer border-l-[3.5px] ${item.accentBorder} shadow-2xs`}
            >
              {/* Left Details */}
              <div className="flex flex-col min-w-0 pr-2">
                <span className="text-[11px] font-extrabold text-slate-800 truncate group-hover:text-slate-900">
                  {item.title}
                </span>
                <span className={`text-[9px] ${item.subtitleColor} mt-0.5`}>
                  {item.subtitle}
                </span>
              </div>

              {/* Right Tag + Chevron */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-bold border ${item.badgeBg}`}
                >
                  {getCategoryIcon(item.category)}
                  {item.category}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Card Footer ── */}
      <div className="px-4 py-2.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[9px] font-semibold text-slate-500">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>Auto-monitoring is active</span>
        </div>

        <button
          onClick={() => navigate('/documents/expiry')}
          className="text-[9.5px] font-bold text-blue-600 hover:text-blue-700 hover:underline transition-colors"
        >
          Manage Reminders
        </button>
      </div>
    </div>
  );
}
