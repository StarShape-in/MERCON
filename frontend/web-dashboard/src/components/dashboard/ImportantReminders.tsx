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
  AlertCircle,
  Calendar,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { documentService } from '@/services/documentService';
import { driverService, Driver, DriverStatus } from '@/services/driverService';
import { vehicleService, Vehicle } from '@/services/vehicleService';
import DriverAvatar from '@/components/ui/DriverAvatar';
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
  badgeText: string;
  ping: boolean;
  filterParam: 'expired' | 'critical' | 'warning';
  entityLink?: string;
  daysRemaining: number;
  // Driver specific:
  driverAvatar?: string | null;
  driverFirstName?: string;
  driverLastName?: string;
  driverStatus?: DriverStatus;
  // Vehicle specific:
  vehiclePlate?: string;
  vehicleAssetType?: string;
}

interface DriverRef {
  id: string;
  avatarUrl?: string | null;
  firstName?: string;
  lastName?: string;
  status?: DriverStatus;
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
  summarySubtext: string;
  driversList: DriverRef[];
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

  // Queries
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

  // Maps for entity details
  const driverMap = useMemo(() => {
    return new Map<string, Driver>(drivers.map((d) => [d.id, d]));
  }, [drivers]);

  const vehicleMap = useMemo(() => {
    return new Map<string, Vehicle>(vehicles.map((v) => [v.id, v]));
  }, [vehicles]);

  const nameFor = useMemo(() => {
    return (entityType: string, entityId: string): string => {
      if (entityType === 'Driver') {
        const d = driverMap.get(entityId);
        return d ? `${d.first_name} ${d.last_name}`.trim() : 'Driver';
      }
      if (entityType === 'Vehicle') {
        const v = vehicleMap.get(entityId);
        return v ? (v.plate_number || v.ref_id || 'Vehicle') : 'Vehicle';
      }
      return entityType;
    };
  }, [driverMap, vehicleMap]);

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

        let entityLink: string | undefined;
        if (doc.entity_type === 'Driver') {
          entityLink = `/drivers/${doc.entity_id}/documents`;
        } else if (doc.entity_type === 'Vehicle') {
          entityLink = `/vehicles/${doc.entity_id}/documents`;
        }

        const driverObj = doc.entity_type === 'Driver' ? driverMap.get(doc.entity_id) : undefined;
        const vehicleObj = doc.entity_type === 'Vehicle' ? vehicleMap.get(doc.entity_id) : undefined;

        list.push({
          id: `doc-${doc.id}`,
          typeKey: doc.doc_type || 'GeneralDoc',
          typeLabel,
          entityType: doc.entity_type,
          entityId: doc.entity_id,
          entityName,
          title: typeLabel,
          subtext: isExpired
            ? days === 0
              ? 'Expires today'
              : `Expired ${Math.abs(days)}d ago`
            : `Expires in ${days} day${days === 1 ? '' : 's'}`,
          shortBadge: isExpired ? 'Expired' : `In ${days}d`,
          badgeText: categoryForEntity(doc.entity_type),
          ping: isExpired,
          filterParam: isExpired ? 'expired' : isCritical ? 'critical' : 'warning',
          entityLink,
          daysRemaining: days,
          driverAvatar: driverObj?.avatar_url,
          driverFirstName: driverObj?.first_name,
          driverLastName: driverObj?.last_name,
          driverStatus: driverObj?.status,
          vehiclePlate: vehicleObj?.plate_number,
          vehicleAssetType: vehicleObj?.asset_type,
        });
      }
    }

    // 2. Process drivers with license expiry not covered by doc
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
            title: 'Driver License',
            subtext: isExpired
              ? days === 0
                ? 'Expires today'
                : `Expired ${Math.abs(days)}d ago`
              : `Expires in ${days} day${days === 1 ? '' : 's'}`,
            shortBadge: isExpired ? 'Expired' : `In ${days}d`,
            badgeText: 'Driver',
            ping: isExpired,
            filterParam: isExpired ? 'expired' : isCritical ? 'critical' : 'warning',
            entityLink: `/drivers/${d.id}/documents`,
            daysRemaining: days,
            driverAvatar: d.avatar_url,
            driverFirstName: d.first_name,
            driverLastName: d.last_name,
            driverStatus: d.status,
          });
        }
      }
    }

    return list.sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [docs, drivers, driverMap, vehicleMap, nameFor]);

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

      let BadgeIcon: React.ElementType = FileText;
      if (first.entityType === 'Driver') BadgeIcon = UserCheck;
      else if (first.entityType === 'Vehicle') BadgeIcon = Truck;

      const entityNames = items.map((i) => i.entityName);
      const namesSummary =
        entityNames.length <= 2
          ? entityNames.join(', ')
          : `${entityNames.slice(0, 2).join(', ')} +${entityNames.length - 2} more`;

      const summarySubtext = namesSummary;

      // Extract unique driver references for avatar stack
      const driversList: DriverRef[] = [];
      const seenDriverIds = new Set<string>();
      for (const it of items) {
        if (it.entityType === 'Driver' && !seenDriverIds.has(it.entityId)) {
          seenDriverIds.add(it.entityId);
          driversList.push({
            id: it.entityId,
            avatarUrl: it.driverAvatar,
            firstName: it.driverFirstName,
            lastName: it.driverLastName,
            status: it.driverStatus,
          });
        }
      }

      result.push({
        typeKey,
        typeLabel: first.typeLabel,
        entityType: first.entityType,
        badgeText: first.badgeText,
        BadgeIcon,
        items,
        count,
        worstDaysRemaining,
        worstStatus,
        hasExpired,
        hasCritical,
        summarySubtext,
        driversList,
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
        
        {/* Floating edge rail toggle button */}
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

        {/* Card shell container */}
        <div className="relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm h-full max-h-[385px] overflow-hidden transition-all duration-300 ease-in-out flex flex-col">

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
                          ? 'bg-amber-50 border-amber-200 text-brand dark:bg-amber-950/40 dark:border-amber-900/50'
                          : 'bg-emerald-50 border-emerald-200 text-emerald-600 dark:bg-emerald-950/40 dark:border-emerald-900/50'
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
                <TooltipContent
                  side="left"
                  sideOffset={12}
                  className="font-bold text-[11px] bg-slate-900 text-white border border-slate-800 shadow-xl px-3 py-1.5 rounded-lg z-[10000]"
                >
                  {totalCount > 0 ? `${totalCount} Active Reminders — Click to Expand` : 'All compliance permits valid'}
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Middle: Icon / Avatar Timeline Strip */}
            <div className="relative flex-1 flex flex-col items-center gap-2.5 my-2 py-1 z-10 w-full overflow-visible min-h-0 no-scrollbar">
              {groups.length > 0 ? (
                <>
                  <div className="absolute top-2 bottom-2 w-[1.5px] bg-slate-100 dark:bg-slate-800 rounded-full left-1/2 -translate-x-1/2 -z-10" />
                  {groups.map((group) => {
                    const firstItem = group.items[0];
                    return (
                      <Tooltip key={group.typeKey}>
                        <TooltipTrigger>
                          <div
                            onClick={() => {
                              if (group.count === 1 && firstItem.entityLink) {
                                navigate(firstItem.entityLink);
                              } else {
                                navigate(`/documents?filter=${group.worstStatus}`);
                              }
                            }}
                            className="relative z-10 flex items-center justify-center cursor-pointer group/item hover:scale-110 transition-transform duration-200 shrink-0"
                          >
                            <div className="relative overflow-visible">
                              <div className="w-8.5 h-8.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-2xs text-slate-700 dark:text-slate-300">
                                <group.BadgeIcon className="w-4 h-4 stroke-[2.2]" />
                              </div>

                              {group.count > 1 && (
                                <span className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] px-1 rounded-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[9px] font-black flex items-center justify-center ring-2 ring-white dark:ring-slate-900 shadow-sm z-20 pointer-events-none">
                                  {group.count}
                                </span>
                              )}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent
                          side="left"
                          sideOffset={12}
                          className="flex flex-col w-64 p-3 rounded-xl bg-slate-900 text-white border border-slate-800 shadow-2xl z-[10000] text-left"
                        >
                          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2 w-full">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <group.BadgeIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <p className="font-extrabold text-[11px] text-white truncate">
                                {group.count > 1 ? `${group.count} ${group.typeLabel}s` : group.items[0].title}
                              </p>
                            </div>
                            <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                              {group.count} {group.count === 1 ? 'item' : 'items'}
                            </span>
                          </div>

                          <div className="flex flex-col gap-1.5 w-full">
                            {group.items.slice(0, 4).map((item) => {
                              const isExpired = item.daysRemaining <= 0;
                              const isCritical = item.daysRemaining > 0 && item.daysRemaining <= 7;
                              return (
                                <div key={item.id} className="flex items-center justify-between gap-2 text-[10px] w-full">
                                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                    <div
                                      className={cn(
                                        'w-1.5 h-1.5 rounded-full shrink-0',
                                        isExpired ? 'bg-rose-500' : isCritical ? 'bg-amber-500' : 'bg-blue-500'
                                      )}
                                    />
                                    <span className="text-slate-200 truncate font-medium">{item.entityName}</span>
                                  </div>
                                  <span
                                    className={cn(
                                      'text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 whitespace-nowrap',
                                      isExpired
                                        ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                                        : isCritical
                                        ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                                        : 'bg-blue-950/80 text-blue-300 border border-blue-800/60'
                                    )}
                                  >
                                    {item.shortBadge}
                                  </span>
                                </div>
                              );
                            })}
                            {group.items.length > 4 && (
                              <div className="text-[9px] text-slate-400 font-semibold pt-0.5 text-center">
                                +{group.items.length - 4} more
                              </div>
                            )}
                          </div>

                          <div className="pt-2 mt-2 border-t border-slate-800/80 flex items-center justify-between text-[9px] text-slate-400 w-full">
                            <span>Click to open</span>
                            <span className="text-brand font-bold">Expiry Radar ↗</span>
                          </div>
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

          {/* ── LAYER 2: EXPANDED PANEL VIEW ── */}
          <div
            className={`w-full flex-1 flex flex-col h-full min-w-0 overflow-hidden transition-opacity duration-200 ease-in-out ${
              collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
            }`}
          >
            {/* Header Bar */}
            <div className="px-3.5 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-900 z-10">
              <div className="flex items-center gap-2 min-w-0">
                <Bell className={cn('w-4 h-4 shrink-0', totalCount > 0 ? 'text-amber-500 fill-amber-500/20' : 'text-emerald-500')} />
                <span className="text-[12.5px] font-extrabold text-slate-900 dark:text-slate-100 tracking-tight truncate">
                  Important Reminders
                </span>
              </div>
              <button
                onClick={() => navigate('/documents?radar=open')}
                className="text-[10px] font-bold text-brand hover:underline cursor-pointer shrink-0"
              >
                Expiry Radar ↗
              </button>
            </div>

            {/* Clean Subheader Summary Bar (No cheap full red!) */}
            <div className="px-3.5 py-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10.5px] font-bold shrink-0 bg-slate-50/60 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate('/documents?filter=expired')}
                  className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 hover:opacity-80 transition-opacity cursor-pointer shrink-0"
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                  {expiredCount} Expired
                </button>
                <button
                  onClick={() => navigate('/documents?filter=critical')}
                  className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 hover:opacity-80 transition-opacity cursor-pointer shrink-0"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  {criticalCount} Critical
                </button>
                <button
                  onClick={() => navigate('/documents?filter=warning')}
                  className="flex items-center gap-1.5 text-blue-700 dark:text-blue-400 hover:opacity-80 transition-opacity cursor-pointer shrink-0"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                  {warningCount} Warning
                </button>
              </div>
              <span className="text-slate-400 dark:text-slate-500 font-extrabold text-[9.5px] tracking-wider uppercase shrink-0">
                {totalCount} ACTIVE
              </span>
            </div>

            {/* Reminders list (Scrollable) */}
            <div className="flex-1 divide-y divide-slate-100 dark:divide-slate-800 overflow-y-auto min-h-0 overscroll-contain">
              
              {/* Docked Operations Assistant Banner */}
              {isAssistantDocked && (
                <div
                  onClick={handleUndockAssistant}
                  className="px-3.5 py-2.5 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-transparent border-b border-orange-200/60 dark:border-orange-950/60 flex items-center justify-between gap-2.5 hover:bg-orange-50/80 dark:hover:bg-orange-950/30 transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 rounded-full border-2 border-brand overflow-hidden shadow-2xs group-hover:scale-105 transition-transform">
                        <img src="/assistant/profile.png" alt="Operations Assistant" className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className="text-[11.5px] font-extrabold text-slate-900 dark:text-slate-100 leading-tight truncate">
                          Operations Assistant
                        </p>
                        <span className="text-[8.5px] font-black px-1.5 py-0.5 rounded-full bg-brand text-white whitespace-nowrap shrink-0 leading-none">
                          Pending
                        </span>
                      </div>
                      <p className="text-[10.5px] font-semibold text-brand mt-0.5 truncate">
                        Was there any labor charge for completed trip?
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-extrabold text-brand bg-white dark:bg-slate-900 px-2 py-0.5 rounded-full border border-orange-300 dark:border-orange-800 group-hover:bg-brand group-hover:text-white transition-colors">
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
                  const isGroupExpanded = !!expandedGroups[group.typeKey];

                  // Single Reminder Row
                  if (group.count === 1) {
                    const item = group.items[0];
                    const isExpired = item.daysRemaining <= 0;
                    const isCritical = item.daysRemaining > 0 && item.daysRemaining <= 7;

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
                        className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          {/* Driver Avatar OR Icon Container */}
                          {item.entityType === 'Driver' ? (
                            <DriverAvatar
                              src={item.driverAvatar}
                              firstName={item.driverFirstName}
                              lastName={item.driverLastName}
                              size="sm"
                              className="shrink-0 border border-slate-200 dark:border-slate-700 shadow-2xs"
                            />
                          ) : item.entityType === 'Vehicle' ? (
                            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 text-slate-700 dark:text-slate-300">
                              <Truck className="w-4 h-4" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 text-slate-700 dark:text-slate-300">
                              <FileText className="w-4 h-4" />
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100 truncate group-hover:text-brand transition-colors">
                                {item.typeLabel}
                              </p>
                              {item.vehiclePlate && (
                                <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.2 rounded">
                                  {item.vehiclePlate}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                              {item.entityName}
                            </p>
                          </div>
                        </div>

                        {/* Clean Visual Badge (Soft Rose / Amber / Blue — NO full red text) */}
                        <span
                          className={cn(
                            'shrink-0 text-[10px] font-extrabold px-2.5 py-1 rounded-full border whitespace-nowrap flex items-center gap-1 shadow-2xs',
                            isExpired
                              ? 'bg-rose-50 text-rose-700 border-rose-200/90 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                              : isCritical
                              ? 'bg-amber-50 text-amber-700 border-amber-200/90 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                              : 'bg-blue-50 text-blue-700 border-blue-200/90 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                          )}
                        >
                          <span
                            className={cn(
                              'w-1.5 h-1.5 rounded-full inline-block',
                              isExpired ? 'bg-rose-500' : isCritical ? 'bg-amber-500' : 'bg-blue-500'
                            )}
                          />
                          {item.subtext}
                        </span>
                      </div>
                    );
                  }

                  // Grouped Reminder Row (Multiple drivers / vehicles)
                  const isExpired = group.hasExpired;
                  const isCritical = group.hasCritical;

                  return (
                    <div key={group.typeKey} className="flex flex-col bg-white dark:bg-slate-900">
                      <div
                        onClick={(e) => toggleGroup(group.typeKey, e)}
                        className="px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          
                          {/* Driver Avatar Stack for Grouped Drivers (No clipping!) */}
                          {group.entityType === 'Driver' && group.driversList.length > 0 ? (
                            <div className="flex items-center -space-x-2.5 shrink-0 pr-0.5">
                              {group.driversList.slice(0, 3).map((drv, idx) => (
                                <div
                                  key={drv.id || idx}
                                  className="relative shrink-0 transition-transform hover:scale-105"
                                  style={{ zIndex: 10 - idx }}
                                >
                                  <DriverAvatar
                                    src={drv.avatarUrl}
                                    firstName={drv.firstName}
                                    lastName={drv.lastName}
                                    size="sm"
                                    className="ring-2 ring-white dark:ring-slate-900 shadow-2xs"
                                  />
                                </div>
                              ))}
                              {group.driversList.length > 3 && (
                                <div
                                  className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-extrabold text-slate-700 dark:text-slate-300 shrink-0 shadow-2xs relative"
                                  style={{ zIndex: 5 }}
                                >
                                  +{group.driversList.length - 3}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shrink-0 text-slate-700 dark:text-slate-300">
                              <group.BadgeIcon className="w-4 h-4" />
                            </div>
                          )}

                          {/* Reminder Information */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <p className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100 truncate group-hover:text-brand transition-colors">
                                {group.typeLabel}
                              </p>
                              {group.hasExpired && (
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                              {group.summarySubtext}
                            </p>
                          </div>
                        </div>

                        {/* Refined Action Pill */}
                        <button
                          type="button"
                          onClick={(e) => toggleGroup(group.typeKey, e)}
                          className={cn(
                            'inline-flex items-center gap-1.5 text-[10.5px] font-bold px-2.5 py-1 rounded-full border transition-all cursor-pointer shrink-0 shadow-2xs',
                            isExpired
                              ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                              : isCritical
                              ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                          )}
                        >
                          <group.BadgeIcon className="w-3.5 h-3.5" />
                          <span>
                            {group.count} {group.entityType === 'Driver' ? (group.count === 1 ? 'Driver' : 'Drivers') : (group.count === 1 ? 'Vehicle' : 'Vehicles')}
                          </span>
                          {isGroupExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 ml-0.5 opacity-70" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 ml-0.5 opacity-70" />
                          )}
                        </button>
                      </div>

                      {/* Accordion / Nested Individual Reminders List */}
                      {isGroupExpanded && (
                        <div className="bg-slate-50/70 dark:bg-slate-800/40 border-t border-b border-slate-100 dark:border-slate-800/60 px-3.5 py-2 space-y-1.5 animate-in fade-in-50 duration-200">
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
                              className="pl-2 pr-2.5 py-1.5 rounded-lg flex items-center justify-between gap-2.5 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer border border-transparent hover:border-slate-200/80 dark:hover:border-slate-700"
                            >
                              <div className="flex items-center gap-2.5 min-w-0">
                                {item.entityType === 'Driver' ? (
                                  <DriverAvatar
                                    src={item.driverAvatar}
                                    firstName={item.driverFirstName}
                                    lastName={item.driverLastName}
                                    size="xs"
                                    className="shrink-0"
                                  />
                                ) : (
                                  <span className={cn(
                                    'w-2 h-2 rounded-full shrink-0',
                                    item.daysRemaining <= 0
                                      ? 'bg-rose-500'
                                      : item.daysRemaining <= 7
                                      ? 'bg-amber-500'
                                      : 'bg-blue-500'
                                  )} />
                                )}
                                <p className="text-[11.5px] font-bold text-slate-800 dark:text-slate-200 truncate">
                                  {item.entityName}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={cn(
                                  'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                                  item.daysRemaining <= 0
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : item.daysRemaining <= 7
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                )}>
                                  {item.subtext}
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
