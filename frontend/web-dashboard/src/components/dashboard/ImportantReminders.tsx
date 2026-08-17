import React, { useMemo, useState, useEffect } from 'react';
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
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { documentService } from '@/services/documentService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { documentDisplayName, categoryForEntity, daysUntil } from '@/lib/documents';
import { cn } from '@/lib/utils';

interface ImportantRemindersProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface LiveReminderItem {
  id: string;
  typeKey: string;
  typeLabel: string;
  entityType: string;
  entityId: string;
  entityName: string;
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

interface ReminderGroup {
  typeKey: string;
  typeLabel: string;
  entityType: string;
  badgeText: string;
  BadgeIcon: React.ElementType;
  items: LiveReminderItem[];
  count: number;
  worstDaysRemaining: number;
  worstStatus: 'expired' | 'critical' | 'warning';
  hasExpired: boolean;
  hasCritical: boolean;
  iconBg: string;
  badgeClass: string;
  subtextColor: string;
  titleColor: string;
  summarySubtext: string;
}

export default function ImportantReminders({
  collapsed = false,
  onToggleCollapse,
}: ImportantRemindersProps) {
  const navigate = useNavigate();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isAssistantDocked, setIsAssistantDocked] = useState<boolean>(() => {
    try {
      return localStorage.getItem('mercon_assistant_docked_v1') === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleDockChange = () => {
      try {
        setIsAssistantDocked(localStorage.getItem('mercon_assistant_docked_v1') === 'true');
      } catch { /**/ }
    };
    window.addEventListener('mercon_assistant_dock_change', handleDockChange);
    return () => window.removeEventListener('mercon_assistant_dock_change', handleDockChange);
  }, []);

  const handleUndockAssistant = () => {
    try {
      localStorage.setItem('mercon_assistant_docked_v1', 'false');
    } catch { /**/ }
    window.dispatchEvent(new CustomEvent('mercon_assistant_dock_change'));
  };

  const toggleGroup = (typeKey: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedGroups((prev) => ({
      ...prev,
      [typeKey]: !prev[typeKey],
    }));
  };

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

  // Build individual live reminders
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
        const typeLabel = documentDisplayName(doc);
        const isExpired = days <= 0;
        const isCritical = days > 0 && days <= 7;

        let BadgeIcon = FileText;
        if (doc.entity_type === 'Driver') BadgeIcon = UserCheck;
        else if (doc.entity_type === 'Vehicle') BadgeIcon = Truck;
        else if (isExpired) BadgeIcon = ShieldAlert;

        let entityLink: string | undefined;
        if (doc.entity_type === 'Driver') {
          entityLink = `/drivers/${doc.entity_id}/documents`;
        } else if (doc.entity_type === 'Vehicle') {
          entityLink = `/vehicles/${doc.entity_id}/documents`;
        }

        list.push({
          id: `doc-${doc.id}`,
          typeKey: doc.doc_type || 'GeneralDoc',
          typeLabel,
          entityType: doc.entity_type,
          entityId: doc.entity_id,
          entityName,
          title: `${typeLabel} - ${entityName}`,
          subtext: isExpired
            ? days === 0
              ? 'Expires today'
              : `Expired ${Math.abs(days)}d ago`
            : `Expires in ${days} day${days === 1 ? '' : 's'}`,
          shortBadge: isExpired ? 'Expired' : `In ${days}d`,
          subtextColor: isExpired ? 'text-rose-600' : isCritical ? 'text-rose-500' : 'text-amber-600',
          titleColor: isExpired ? 'text-rose-600 font-bold' : 'text-slate-900 dark:text-slate-100',
          badgeText: categoryForEntity(doc.entity_type),
          badgeClass: isExpired
            ? 'text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/30'
            : isCritical
            ? 'text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/20'
            : 'text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/20',
          iconBg: isExpired
            ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/40'
            : isCritical
            ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/40'
            : 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/40',
          pillBg: isExpired
            ? 'bg-rose-50 text-rose-600'
            : isCritical
            ? 'bg-rose-50 text-rose-500'
            : 'bg-amber-50 text-amber-700',
          BadgeIcon,
          ping: isExpired,
          filterParam: isExpired ? 'expired' : isCritical ? 'critical' : 'warning',
          entityLink,
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
            typeKey: 'DriverLicense',
            typeLabel: 'Driver License',
            entityType: 'Driver',
            entityId: d.id,
            entityName: driverName,
            title: `Driver License - ${driverName}`,
            subtext: isExpired
              ? days === 0
                ? 'Expires today'
                : `Expired ${Math.abs(days)}d ago`
              : `Expires in ${days} day${days === 1 ? '' : 's'}`,
            shortBadge: isExpired ? 'Expired' : `In ${days}d`,
            subtextColor: isExpired ? 'text-rose-600' : isCritical ? 'text-rose-500' : 'text-amber-600',
            titleColor: isExpired ? 'text-rose-600 font-bold' : 'text-slate-900 dark:text-slate-100',
            badgeText: 'Driver',
            badgeClass: isExpired
              ? 'text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/30'
              : isCritical
              ? 'text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/20'
              : 'text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/20',
            iconBg: isExpired
              ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/40'
              : isCritical
              ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/30 dark:border-rose-900/40'
              : 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900/40',
            pillBg: isExpired
              ? 'bg-rose-50 text-rose-600'
              : isCritical
              ? 'bg-rose-50 text-rose-500'
              : 'bg-amber-50 text-amber-700',
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

  // Group reminders of the same type together
  const groups = useMemo<ReminderGroup[]>(() => {
    const map = new Map<string, LiveReminderItem[]>();

    for (const item of reminders) {
      const key = item.typeKey;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(item);
    }

    const result: ReminderGroup[] = [];

    map.forEach((items, typeKey) => {
      // Sort items by most urgent first
      items.sort((a, b) => a.daysRemaining - b.daysRemaining);

      const first = items[0];
      const count = items.length;
      const worstDaysRemaining = Math.min(...items.map((i) => i.daysRemaining));
      const hasExpired = worstDaysRemaining <= 0;
      const hasCritical = worstDaysRemaining > 0 && worstDaysRemaining <= 7;
      const worstStatus: 'expired' | 'critical' | 'warning' = hasExpired
        ? 'expired'
        : hasCritical
        ? 'critical'
        : 'warning';

      const entityNames = items.map((i) => i.entityName);
      const namesSummary =
        entityNames.length <= 2
          ? entityNames.join(', ')
          : `${entityNames.slice(0, 2).join(', ')} +${entityNames.length - 2} more`;

      const earliestText =
        worstDaysRemaining <= 0
          ? worstDaysRemaining === 0
            ? 'Expires today'
            : `Expired ${Math.abs(worstDaysRemaining)}d ago`
          : `Earliest in ${worstDaysRemaining}d`;

      const summarySubtext =
        count === 1 ? first.subtext : `${namesSummary} • ${earliestText}`;

      result.push({
        typeKey,
        typeLabel: first.typeLabel,
        entityType: first.entityType,
        badgeText: first.badgeText,
        BadgeIcon: first.BadgeIcon,
        items,
        count,
        worstDaysRemaining,
        worstStatus,
        hasExpired,
        hasCritical,
        iconBg: hasExpired
          ? 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/50'
          : hasCritical
          ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900/50'
          : 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900/50',
        badgeClass: hasExpired
          ? 'text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/30'
          : hasCritical
          ? 'text-rose-600 border-rose-200 bg-rose-50 dark:bg-rose-950/20'
          : 'text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/20',
        subtextColor: hasExpired
          ? 'text-rose-600'
          : hasCritical
          ? 'text-rose-500'
          : 'text-amber-600',
        titleColor: hasExpired
          ? 'text-rose-600 font-bold'
          : 'text-slate-900 dark:text-slate-100',
        summarySubtext,
      });
    });

    return result.sort((a, b) => a.worstDaysRemaining - b.worstDaysRemaining);
  }, [reminders]);

  const expiredCount = reminders.filter((r) => r.daysRemaining <= 0).length;
  const criticalCount = reminders.filter((r) => r.daysRemaining > 0 && r.daysRemaining <= 7).length;
  const warningCount = reminders.filter((r) => r.daysRemaining > 7 && r.daysRemaining <= 30).length;
  const totalCount = reminders.length;

  return (
    <TooltipProvider delay={0}>
      <div className="relative h-full w-full select-none flex flex-col">
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

        {/* Card shell container with fixed height and internal scrolling */}
        <div className="relative bg-white dark:bg-slate-900 rounded-[18px] border border-black/[0.06] dark:border-slate-800 shadow-sm h-full max-h-[385px] overflow-hidden transition-all duration-300 ease-in-out flex flex-col">

          {/* ── LAYER 1: COLLAPSED RAIL VIEW (w-[76px]) ── */}
          <div
            className={`absolute inset-0 w-[76px] flex flex-col items-center justify-between py-3.5 px-1.5 transition-opacity duration-200 ease-in-out z-10 overflow-hidden ${
              collapsed ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Top: Bell Icon & Count Badge */}
            <div className="shrink-0">
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
            </div>

            {/* Middle: Grouped Timeline Icon Strip with Number Badges */}
            <div className="relative flex-1 flex flex-col items-center gap-2.5 my-2 py-1 z-10 w-full overflow-y-auto min-h-0 no-scrollbar">
              {groups.length > 0 ? (
                <>
                  <div className="absolute top-2 bottom-2 w-[1.5px] bg-slate-100 dark:bg-slate-800 rounded-full left-1/2 -translate-x-1/2 -z-10" />
                  {groups.map((group) => {
                    const Icon = group.BadgeIcon;
                    return (
                      <Tooltip key={group.typeKey}>
                        <TooltipTrigger>
                          <div
                            onClick={() => {
                              if (group.count === 1 && group.items[0].entityLink) {
                                navigate(group.items[0].entityLink);
                              } else {
                                navigate(`/documents?filter=${group.worstStatus}`);
                              }
                            }}
                            className="relative z-10 flex items-center justify-center cursor-pointer group/item hover:scale-110 transition-transform duration-200 shrink-0"
                          >
                            <div className="relative">
                              <div className={`w-8.5 h-8.5 rounded-2xl ${group.iconBg} border flex items-center justify-center shadow-2xs group-hover/item:shadow-md transition-all duration-200`}>
                                <Icon className="w-4 h-4 stroke-[2.2]" />
                              </div>

                              {/* Number Badge with Icon when same type has multiple reminders */}
                              {group.count > 1 && (
                                <span className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] px-1 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-sm">
                                  {group.count}
                                </span>
                              )}

                              {group.hasExpired && (
                                <span className="absolute -bottom-0.5 -right-0.5 flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 ring-1.5 ring-white" />
                                </span>
                              )}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="bg-slate-900 text-white p-2.5 rounded-xl text-[10px] space-y-1 border border-slate-800 shadow-xl max-w-[220px]">
                          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1">
                            <p className="font-extrabold text-white leading-tight">
                              {group.count > 1 ? `${group.count} ${group.typeLabel}s` : group.items[0].title}
                            </p>
                            {group.count > 1 && (
                              <span className="bg-brand/20 text-brand px-1.5 py-0.2 rounded text-[9px] font-bold">
                                {group.count} items
                              </span>
                            )}
                          </div>
                          {group.count > 1 ? (
                            <div className="space-y-1 pt-0.5">
                              {group.items.slice(0, 3).map((item) => (
                                <div key={item.id} className="flex items-center justify-between gap-2 text-[9.5px]">
                                  <span className="text-slate-300 truncate font-medium">{item.entityName}</span>
                                  <span className={cn('font-bold shrink-0', item.subtextColor)}>{item.shortBadge}</span>
                                </div>
                              ))}
                              {group.items.length > 3 && (
                                <p className="text-[8.5px] text-slate-400 font-semibold italic">
                                  +{group.items.length - 3} more records
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className={cn('font-semibold text-[9.5px]', group.subtextColor)}>
                              {group.items[0].subtext}
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center gap-1 text-slate-400 my-auto">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  <span className="text-[8px] font-bold uppercase text-emerald-600">Clear</span>
                </div>
              )}
            </div>

            {/* Bottom Status / Expand Hint */}
            <div className="shrink-0 pt-0.5">
              <button
                onClick={onToggleCollapse}
                className="text-[9px] font-bold text-slate-400 hover:text-brand cursor-pointer transition-colors"
                title="Expand Reminders"
              >
                Expand
              </button>
            </div>
          </div>

          {/* ── LAYER 2: EXPANDED PANEL VIEW (w-[318px] Fixed Layout) ── */}
          <div
            className={`w-[318px] shrink-0 flex flex-col h-full overflow-hidden transition-opacity duration-200 ease-in-out ${
              collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
            }`}
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900 z-10">
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
            <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 text-[11px] font-bold shrink-0 bg-slate-50/40 dark:bg-slate-800/30">
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

            {/* Reminders grouped items list (Scrollable) */}
            <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto min-h-0 overscroll-contain">
              {/* Docked Operations Assistant Banner */}
              {isAssistantDocked && (
                <div
                  onClick={handleUndockAssistant}
                  className="px-4 py-3 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border-b border-orange-200/80 dark:border-orange-950/60 flex items-center justify-between gap-3 hover:bg-orange-50/80 dark:hover:bg-orange-950/30 transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <div className="w-8.5 h-8.5 rounded-full border-2 border-[#E8450F] overflow-hidden shadow-2xs group-hover:scale-105 transition-transform">
                        <img src="/assistant/profile.png" alt="Operations Assistant" className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100 leading-tight truncate">
                          Operations Assistant
                        </p>
                        <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded-full bg-[#E8450F] text-white whitespace-nowrap shrink-0 leading-none">
                          Pending
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-[#E8450F] mt-0.5 truncate">
                        Was there any labor charge for completed trip?
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-extrabold text-[#E8450F] bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-orange-300 dark:border-orange-800 group-hover:bg-[#E8450F] group-hover:text-white transition-colors">
                    Open ↗
                  </span>
                </div>
              )}

              {groups.length === 0 && !isAssistantDocked ? (
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
                groups.map((group) => {
                  const Icon = group.BadgeIcon;
                  const isGroupExpanded = !!expandedGroups[group.typeKey];

                  if (group.count === 1) {
                    const item = group.items[0];
                    return (
                      <div
                        key={group.typeKey}
                        onClick={() => {
                          if (item.entityLink) {
                            navigate(item.entityLink);
                          } else {
                            navigate(`/documents?filter=${item.filterParam}`);
                          }
                        }}
                        className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className={`w-8 h-8 rounded-xl ${group.iconBg} border flex items-center justify-center shrink-0`}>
                            <Icon className="w-4 h-4 stroke-[2.2]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-[12px] font-bold leading-tight truncate ${item.titleColor} group-hover:opacity-80 transition-opacity`}>
                              {item.title}
                            </p>
                            <p className={`text-[11px] font-semibold mt-0.5 ${item.subtextColor}`}>
                              {item.subtext}
                            </p>
                          </div>
                        </div>
                        <span className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badgeClass} whitespace-nowrap`}>
                          <Icon className="w-3 h-3" />
                          {item.badgeText}
                        </span>
                      </div>
                    );
                  }

                  // Grouped row when multiple reminders of same type exist
                  return (
                    <div key={group.typeKey} className="flex flex-col bg-white dark:bg-slate-900">
                      <div
                        onClick={(e) => toggleGroup(group.typeKey, e)}
                        className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {/* Icon with prominent count number badge */}
                          <div className="relative shrink-0">
                            <div className={`w-8.5 h-8.5 rounded-xl ${group.iconBg} border flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform`}>
                              <Icon className="w-4 h-4 stroke-[2.2]" />
                            </div>
                            <span className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] px-1 rounded-full bg-brand text-white text-[9.5px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-xs">
                              {group.count}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className={`text-[12px] font-bold leading-tight truncate ${group.titleColor}`}>
                                {group.typeLabel}
                              </p>
                              <span className="text-[9.5px] font-extrabold text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 px-1.5 py-0.5 rounded-md">
                                {group.count}
                              </span>
                            </div>
                            <p className={`text-[11px] font-semibold mt-0.5 truncate ${group.subtextColor}`}>
                              {group.summarySubtext}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${group.badgeClass} whitespace-nowrap`}>
                            <Icon className="w-3 h-3" />
                            {group.count} {group.badgeText}s
                          </span>
                          <button
                            onClick={(e) => toggleGroup(group.typeKey, e)}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                            aria-label="Toggle group details"
                          >
                            {isGroupExpanded ? (
                              <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                            ) : (
                              <ChevronRight className="w-4 h-4 text-slate-400" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Accordion / Nested Individual Reminders List */}
                      {isGroupExpanded && (
                        <div className="bg-slate-50/70 dark:bg-slate-800/40 border-t border-b border-slate-100 dark:border-slate-800/60 px-4 py-2 space-y-1.5 animate-in fade-in-50 duration-200">
                          {group.items.map((item) => (
                            <div
                              key={item.id}
                              onClick={() => {
                                if (item.entityLink) {
                                  navigate(item.entityLink);
                                } else {
                                  navigate(`/documents?filter=${item.filterParam}`);
                                }
                              }}
                              className="pl-3 pr-2 py-1.5 rounded-lg flex items-center justify-between gap-2 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-200/80 dark:hover:border-slate-700"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={cn(
                                  'w-1.5 h-1.5 rounded-full shrink-0',
                                  item.daysRemaining <= 0
                                    ? 'bg-rose-500'
                                    : item.daysRemaining <= 7
                                    ? 'bg-amber-500'
                                    : 'bg-blue-500'
                                )} />
                                <p className="text-[11.5px] font-bold text-slate-800 dark:text-slate-200 truncate">
                                  {item.entityName}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={cn('text-[10px] font-bold', item.subtextColor)}>
                                  {item.shortBadge}
                                </span>
                                <ExternalLink className="w-3 h-3 text-slate-400" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] shrink-0 bg-white dark:bg-slate-900">
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
