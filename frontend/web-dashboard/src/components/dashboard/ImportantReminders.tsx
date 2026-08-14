import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bell,
  ChevronsLeft,
  ChevronsRight,
  ShieldAlert,
  UserCheck,
  Truck,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Briefcase,
  Shield,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { documentService } from '@/services/documentService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { docTypeLabel, categoryForEntity, daysUntil, getExpiryStatus } from '@/lib/documents';
import { cn } from '@/lib/utils';

interface ImportantRemindersProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface LiveReminderItem {
  id: string;
  title: string;
  subtext: string;
  shortBadge: string;
  subtextColor: string;
  titleColor: string;
  badgeText: string;
  badgeClass: string;
  iconBg: string;
  pillBg: string;
  BadgeIcon: React.ElementType;
  ping: boolean;
  filterParam: 'expired' | 'critical' | 'warning';
  entityLink?: string;
  daysRemaining: number;
}

export default function ImportantReminders({
  collapsed = false,
  onToggleCollapse,
}: ImportantRemindersProps) {
  const navigate = useNavigate();

  const { data: docs = [] } = useQuery({
    queryKey: ['documents', 'all'],
    queryFn: async () => (await documentService.getAll({ per_page: 200 })).data,
  });

  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers', 'lookup'],
    queryFn: async () => (await driverService.getAll()).data,
  });

  const { data: vehicles = [] } = useQuery({
    queryKey: ['vehicles', 'lookup'],
    queryFn: async () => (await vehicleService.getAll()).data,
  });

  const nameFor = useMemo(() => {
    const dMap = new Map(drivers.map((d) => [d.id, `${d.first_name} ${d.last_name}`.trim()]));
    const vMap = new Map(vehicles.map((v) => [v.id, v.plate_number || v.ref_id || '']));
    return (entityType: string, entityId: string): string => {
      if (entityType === 'Driver') return dMap.get(entityId) || 'Driver';
      if (entityType === 'Vehicle') return vMap.get(entityId) || 'Vehicle';
      return entityType;
    };
  }, [drivers, vehicles]);

  // Build live reminders from real document vault + driver records
  const reminders = useMemo<LiveReminderItem[]>(() => {
    const list: LiveReminderItem[] = [];
    const seenDriverDocIds = new Set<string>();

    // 1. Process uploaded documents
    for (const doc of docs) {
      if (doc.entity_type === 'Driver' && doc.doc_type === 'DriverLicense') {
        seenDriverDocIds.add(doc.entity_id);
      }
      const days = daysUntil(doc.expiry_date);
      if (days !== null && days <= 30) {
        const entityName = nameFor(doc.entity_type, doc.entity_id);
        const typeLabel = docTypeLabel(doc.doc_type);
        const isExpired = days <= 0;
        const isCritical = days > 0 && days <= 7;

        let BadgeIcon = FileText;
        if (doc.entity_type === 'Driver') BadgeIcon = UserCheck;
        else if (doc.entity_type === 'Vehicle') BadgeIcon = Truck;
        else if (isExpired) BadgeIcon = ShieldAlert;

        list.push({
          id: `doc-${doc.id}`,
          title: `${typeLabel} - ${entityName}`,
          subtext: isExpired 
            ? (days === 0 ? 'Expires today' : `Expired ${Math.abs(days)}d ago`)
            : `Expires in ${days} day${days === 1 ? '' : 's'}`,
          shortBadge: isExpired ? 'Expired' : `In ${days}d`,
          subtextColor: isExpired ? 'text-rose-600' : isCritical ? 'text-rose-500' : 'text-amber-600',
          titleColor: isExpired ? 'text-rose-600 font-bold' : 'text-slate-900',
          badgeText: categoryForEntity(doc.entity_type),
          badgeClass: isExpired
            ? 'text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/30'
            : isCritical
              ? 'text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/20'
              : 'text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/20',
          iconBg: isExpired
            ? 'bg-rose-50 text-rose-600 border-rose-200'
            : isCritical
              ? 'bg-rose-50 text-rose-600 border-rose-200'
              : 'bg-amber-50 text-amber-600 border-amber-200',
          pillBg: isExpired ? 'bg-rose-50 text-rose-600' : isCritical ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-700',
          BadgeIcon,
          ping: isExpired,
          filterParam: isExpired ? 'expired' : isCritical ? 'critical' : 'warning',
          daysRemaining: days,
        });
      }
    }

    // 2. Process drivers with license expiry
    for (const d of drivers) {
      if (d.license_expiry && !seenDriverDocIds.has(d.id)) {
        const days = daysUntil(d.license_expiry);
        if (days !== null && days <= 30) {
          const isExpired = days <= 0;
          const isCritical = days > 0 && days <= 7;
          const driverName = `${d.first_name} ${d.last_name}`.trim();

          list.push({
            id: `driver-lic-${d.id}`,
            title: `Driver License - ${driverName}`,
            subtext: isExpired 
              ? (days === 0 ? 'Expires today' : `Expired ${Math.abs(days)}d ago`)
              : `Expires in ${days} day${days === 1 ? '' : 's'}`,
            shortBadge: isExpired ? 'Expired' : `In ${days}d`,
            subtextColor: isExpired ? 'text-rose-600' : isCritical ? 'text-rose-500' : 'text-amber-600',
            titleColor: isExpired ? 'text-rose-600 font-bold' : 'text-slate-900',
            badgeText: 'Driver',
            badgeClass: isExpired
              ? 'text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/30'
              : isCritical
                ? 'text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/20'
                : 'text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/20',
            iconBg: isExpired
              ? 'bg-rose-50 text-rose-600 border-rose-200'
              : isCritical
                ? 'bg-rose-50 text-rose-600 border-rose-200'
                : 'bg-amber-50 text-amber-600 border-amber-200',
            pillBg: isExpired ? 'bg-rose-50 text-rose-600' : isCritical ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-700',
            BadgeIcon: UserCheck,
            ping: isExpired,
            filterParam: isExpired ? 'expired' : isCritical ? 'critical' : 'warning',
            entityLink: `/drivers/${d.id}/documents`,
            daysRemaining: days,
          });
        }
      }
    }

    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [docs, drivers, nameFor]);

  const expiredCount = reminders.filter((r) => r.daysRemaining <= 0).length;
  const criticalCount = reminders.filter((r) => r.daysRemaining > 0 && r.daysRemaining <= 7).length;
  const warningCount = reminders.filter((r) => r.daysRemaining > 7 && r.daysRemaining <= 30).length;
  const totalCount = reminders.length;

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
              hover:bg-brand hover:border-brand hover:text-white
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand
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
        <div className="relative bg-white dark:bg-slate-900 rounded-[18px] border border-black/[0.06] dark:border-slate-800 shadow-sm h-full overflow-hidden transition-all duration-300 ease-in-out">

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
                    {totalCount > 0 && <span className="absolute inset-0 rounded-full bg-red-400/20 animate-ping" />}
                    <div className={cn(
                      'relative w-9 h-9 rounded-full flex items-center justify-center border shadow-2xs group-hover/bell:scale-105 transition-transform duration-200',
                      totalCount > 0 
                        ? 'bg-[#FFF3EE] border-orange-200 text-brand'
                        : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                    )}>
                      {totalCount > 0 ? (
                        <Bell className="w-4.5 h-4.5 fill-current" />
                      ) : (
                        <CheckCircle2 className="w-4.5 h-4.5" />
                      )}
                    </div>
                  </div>
                  <span className={cn(
                    'mt-1 px-1.5 py-0.5 rounded-full text-white text-[9px] font-black flex items-center justify-center ring-2 ring-white shadow-xs',
                    totalCount > 0 ? 'bg-[#E53E3E]' : 'bg-emerald-500'
                  )}>
                    {totalCount}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="font-bold text-[10px] bg-slate-900 text-white border border-slate-800 shadow-xl">
                {totalCount > 0 ? `${totalCount} Active Reminders — Click to Expand` : 'All compliance permits valid'}
              </TooltipContent>
            </Tooltip>

            {/* Middle: Timeline Icon Strip */}
            <div className="relative flex flex-col items-center gap-3 my-auto py-1 z-10 w-full">
              {totalCount > 0 ? (
                <>
                  <div className="absolute top-2 bottom-2 w-[1.5px] bg-slate-100 dark:bg-slate-800 rounded-full left-1/2 -translate-x-1/2 -z-10" />
                  {reminders.slice(0, 5).map((item) => {
                    const Icon = item.BadgeIcon;
                    return (
                      <Tooltip key={item.id}>
                        <TooltipTrigger>
                          <div
                            onClick={() => navigate(`/documents?filter=${item.filterParam}`)}
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
                          <p className={cn('font-semibold text-[9.5px]', item.subtextColor)}>{item.subtext}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1 text-slate-400">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-[8px] font-bold uppercase text-emerald-600">Clear</span>
                </div>
              )}
            </div>
          </div>

          {/* ── LAYER 2: EXPANDED PANEL VIEW (w-[318px] Fixed Layout) ── */}
          <div
            className={`w-[318px] shrink-0 flex flex-col h-full transition-opacity duration-200 ease-in-out ${
              collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
            }`}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Bell className={cn('w-[18px] h-[18px] shrink-0', totalCount > 0 ? 'text-amber-500 fill-amber-500/20' : 'text-emerald-500')} />
                <span className="text-[13px] font-extrabold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                  Important Reminders
                </span>
              </div>
              <button
                onClick={() => navigate('/documents?radar=open')}
                className="text-[10px] font-bold text-brand hover:underline cursor-pointer"
              >
                Expiry Radar ↗
              </button>
            </div>

            {/* Status subheader row */}
            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 text-[11px] font-bold shrink-0">
              <button
                onClick={() => navigate('/documents?filter=expired')}
                className="flex items-center gap-1.5 text-rose-600 hover:opacity-75 transition-opacity cursor-pointer shrink-0"
              >
                <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" />
                {expiredCount} Expired
              </button>
              <button
                onClick={() => navigate('/documents?filter=critical')}
                className="flex items-center gap-1.5 text-amber-600 hover:opacity-75 transition-opacity cursor-pointer shrink-0"
              >
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                {criticalCount} Critical
              </button>
              <button
                onClick={() => navigate('/documents?filter=warning')}
                className="flex items-center gap-1.5 text-blue-600 hover:opacity-75 transition-opacity cursor-pointer shrink-0"
              >
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                {warningCount} Warning
              </button>
              <span className="ml-auto text-slate-400 font-bold text-[10px] tracking-wider uppercase shrink-0">
                {totalCount} ACTIVE
              </span>
            </div>

            {/* Reminders items list */}
            <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto min-h-0">
              {totalCount === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-6 text-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      All Records Compliant
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      No licenses, insurance, or permits are expiring within the next 30 days.
                    </p>
                  </div>
                </div>
              ) : (
                reminders.map((item) => {
                  const Icon = item.BadgeIcon;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (item.entityLink) {
                          navigate(item.entityLink);
                        } else {
                          navigate(`/documents?filter=${item.filterParam}`);
                        }
                      }}
                      className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className={`text-[12px] font-bold leading-tight truncate ${item.titleColor} group-hover:opacity-80 transition-opacity`}>
                          {item.title}
                        </p>
                        <p className={`text-[11px] font-semibold mt-0.5 ${item.subtextColor}`}>
                          {item.subtext}
                        </p>
                      </div>
                      <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeClass} whitespace-nowrap`}>
                        <Icon className="w-3 h-3" />
                        {item.badgeText}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] shrink-0">
              <div className="flex items-center gap-1.5 text-slate-500 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
                Live compliance monitoring
              </div>
              <button
                onClick={() => navigate('/documents')}
                className="font-bold text-brand hover:underline flex items-center gap-0.5 cursor-pointer transition-colors"
              >
                View Vault <span className="ml-0.5 text-[13px] leading-none">↗</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

