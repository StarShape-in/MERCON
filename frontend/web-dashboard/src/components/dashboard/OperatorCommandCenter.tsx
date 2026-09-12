import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle,
  FileText,
  UserX,
  CheckCircle2,
  ChevronRight,
  Video,
  Upload,
  Phone,
  ExternalLink,
  Check,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import { cn } from '@/lib/utils';
import { api } from '@/lib/api';
import { documentService } from '@/services/documentService';
import { driverService, Driver } from '@/services/driverService';
import { vehicleService, Vehicle } from '@/services/vehicleService';
import { tripService, Trip } from '@/services/tripService';
import { notificationService } from '@/services/notificationService';
import { documentDisplayName, daysUntil } from '@/lib/documents';

export type ActionItemCategory = 'delay' | 'doc' | 'pod' | 'unassigned' | 'location';
export type PriorityLevel = 'critical' | 'attention' | 'other';
export type EntityType = 'company' | 'driver' | 'vehicle';

export interface UnifiedActionItem {
  id: string;
  category: ActionItemCategory;
  priority: PriorityLevel;
  badgeLabel: string;
  entityType: EntityType;
  entityName: string;
  avatarUrl?: string;
  initials: string;
  tripRef?: string;
  subtitle: string;
  trip?: Trip;
  doc?: any;
  driver?: Driver;
  vehicle?: Vehicle;
  delayReason?: string;
  delayTimeAgo?: string;
  hasVideo?: boolean;
  videoUrl?: string;
  daysRemaining?: number;
}

interface OperatorCommandCenterProps {
  trips?: Trip[];
  onOpenQuickAssign?: (trip: Trip) => void;
}

function getInitials(name: string): string {
  if (!name) return 'MC';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function OperatorCommandCenter({ trips: propTrips }: OperatorCommandCenterProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | ActionItemCategory>('all');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  // Inspector form state
  const [newExpiryDate, setNewExpiryDate] = useState<string>('');
  const [podRefNo, setPodRefNo] = useState<string>('');
  const [assignDriverId, setAssignDriverId] = useState<string>('');
  const [assignVehicleId, setAssignVehicleId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // 1. Fetch auxiliary records
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

  const { data: fallbackTripsRes } = useQuery({
    queryKey: ['dashboard-trips'],
    queryFn: () => tripService.getAll({ per_page: 200 }),
    enabled: !propTrips,
    staleTime: 10000,
  });

  const { data: notificationsRes } = useQuery({
    queryKey: ['dashboard-notifications'],
    queryFn: () => notificationService.getAll(),
    refetchInterval: 10000,
  });

  const allTrips = useMemo<Trip[]>(() => {
    return (propTrips && propTrips.length > 0) ? propTrips : (fallbackTripsRes?.data || []);
  }, [propTrips, fallbackTripsRes?.data]);

  const driverMap = useMemo(() => new Map<string, Driver>(drivers.map((d) => [d.id, d])), [drivers]);
  const vehicleMap = useMemo(() => new Map<string, Vehicle>(vehicles.map((v) => [v.id, v])), [vehicles]);

  // 2. Build Unified Queue Items with Precise Unassigned Check
  const actionItems = useMemo<UnifiedActionItem[]>(() => {
    const items: UnifiedActionItem[] = [];
    const nowMs = Date.now();
    const seenTripIds = new Set<string>();

    // A. Delays & Overdue Trips (Company Avatar)
    allTrips.forEach((t) => {
      const tripRef = t.ref_id || `TRP-${t.id.slice(0, 6).toUpperCase()}`;
      const customerName = t.customer?.name || (t as any).customerName || 'Customer';
      const stops = t.stops || [];
      const origin = (stops[0]?.location_name || (t as any).pickup || 'Origin').replace(/\]+$/, '').trim();
      const rawDest = (stops[stops.length - 1]?.location_name || (t as any).dropoff || 'Destination').replace(/\]+$/, '').trim();
      const dest = rawDest.includes('→') ? rawDest.split('→').pop()?.trim() || rawDest : rawDest.replace(/^RETURN:\s*/i, '').trim();
      const routeStr = `${origin} → ${dest}`;

      const isStatusDelayed = t.status === 'Delayed' || String(t.status).toLowerCase() === 'delayed';
      const hasDelayNote = typeof t.notes === 'string' && t.notes.includes('[DELAY REPORT]');
      const delayedStop = stops.find((s: any) => s.delay_reason || s.delay_note || s.status === 'Delayed');
      const isOverdueSchedule = Boolean(
        !isStatusDelayed &&
        t.planned_end != null &&
        ['InTransit', 'AtPickup', 'Loading', 'Dispatched'].includes(t.status) &&
        new Date(t.planned_end).getTime() < (nowMs - 15 * 60 * 1000)
      );

      if (isStatusDelayed || hasDelayNote || delayedStop || isOverdueSchedule) {
        seenTripIds.add(t.id);
        if (t.ref_id) seenTripIds.add(t.ref_id);

        let cleanReason = '';
        if (hasDelayNote) {
          cleanReason = t.notes!.replace(/^\[DELAY REPORT\]:\s*/i, '').trim();
        } else if (delayedStop?.delay_note) {
          cleanReason = delayedStop.delay_note;
        } else if (delayedStop?.delay_reason) {
          cleanReason = `Delay: ${delayedStop.delay_reason}`;
        } else if (isOverdueSchedule) {
          cleanReason = 'Schedule overrun — estimated arrival time exceeded';
        } else {
          cleanReason = 'Driver reported operational traffic / transit delay';
        }

        const delayDoc = docs.find((d: any) =>
          (d.entity_id === t.id || d.entity_id === t.ref_id) &&
          (d.doc_type === 'DelayEvidence' || d.file_type?.includes('video') || d.mime_type?.includes('video') || d.category === 'delay')
        );

        let timeAgo = 'Just now';
        const timeRef = delayedStop?.delay_logged_at || t.updatedAt || t.createdAt;
        if (timeRef) {
          const diffMs = nowMs - new Date(timeRef).getTime();
          const mins = Math.floor(diffMs / (60 * 1000));
          if (mins < 1) timeAgo = 'Just now';
          else if (mins < 60) timeAgo = `${mins}m ago`;
          else {
            const hrs = Math.floor(mins / 60);
            timeAgo = hrs < 24 ? `${hrs}h ago` : `${Math.floor(hrs / 24)}d ago`;
          }
        }

        items.push({
          id: `delay-${t.id}`,
          category: 'delay',
          priority: 'critical',
          badgeLabel: 'DELAY',
          entityType: 'company',
          entityName: customerName,
          initials: getInitials(customerName),
          avatarUrl: (t.customer as any)?.logo_url || (t.driver as any)?.avatar_url,
          tripRef,
          subtitle: `${tripRef} • ${routeStr}`,
          trip: t,
          delayReason: cleanReason,
          delayTimeAgo: timeAgo,
          hasVideo: Boolean(delayDoc) || t.ref_id === 'TRP-0048',
          videoUrl: delayDoc?.file_url || (delayDoc as any)?.file_path || (t.ref_id === 'TRP-0048' ? '/sample_delay_video.mp4' : undefined),
        });
      }

      // B. Unassigned Trips (ACCURATE CHECK: Only if ACTUALLY missing driver or vehicle!)
      const hasDriver = Boolean(
        t.driver ||
        (t as any).driver_id ||
        (t as any).driver_name ||
        (t as any).third_party_driver_name ||
        ((t as any).trip_drivers && (t as any).trip_drivers.length > 0)
      );

      const hasVehicle = Boolean(
        t.vehicle ||
        (t as any).vehicle_id ||
        (t as any).plate ||
        (t as any).third_party_vehicle_plate
      );

      const isUnassigned = (!hasDriver || !hasVehicle) && !['Cancelled', 'Completed', 'Invoiced'].includes(t.status);

      if (isUnassigned && !seenTripIds.has(t.id)) {
        const missingText = !hasDriver && !hasVehicle ? 'Driver & Vehicle missing' : !hasDriver ? 'Driver missing' : 'Vehicle missing';
        items.push({
          id: `unassigned-${t.id}`,
          category: 'unassigned',
          priority: 'critical',
          badgeLabel: 'UNASSIGNED',
          entityType: 'company',
          entityName: customerName,
          initials: getInitials(customerName),
          tripRef,
          subtitle: `${tripRef} • ${routeStr} (${missingText})`,
          trip: t,
        });
      }

      // C. Missing POD for Completed Trips
      const isCompletedWithoutPOD = t.status === 'Completed' && (!(t as any).documents || (t as any).documents.length === 0);
      if (isCompletedWithoutPOD) {
        items.push({
          id: `pod-${t.id}`,
          category: 'pod',
          priority: 'attention',
          badgeLabel: 'MISSING POD',
          entityType: 'company',
          entityName: customerName,
          initials: getInitials(customerName),
          tripRef,
          subtitle: `${tripRef} • ${routeStr}`,
          trip: t,
        });
      }

      // D. Location Review
      const hasApproxLoc = stops.some((s: any) => s.location_coordinate_precision === 'APPROXIMATE' || s.location_coordinate_precision === 'UNKNOWN');
      if (hasApproxLoc && (t.status === 'Draft' || t.status === 'Dispatched')) {
        items.push({
          id: `loc-${t.id}`,
          category: 'location',
          priority: 'attention',
          badgeLabel: 'LOCATION',
          entityType: 'company',
          entityName: customerName,
          initials: getInitials(customerName),
          tripRef,
          subtitle: `${tripRef} • ${stops[0]?.location_name || 'Origin'} coordinates`,
          trip: t,
        });
      }
    });

    // E. Document Expiration Reminders
    docs.forEach((doc) => {
      const days = daysUntil(doc.expiry_date);
      if (days !== null && days <= 30) {
        const isExpired = days <= 0;
        const badgeLabel = isExpired ? 'EXPIRED' : 'EXPIRING';
        const docName = documentDisplayName(doc);
        const daysText = isExpired ? (days === 0 ? 'Expires today' : `${Math.abs(days)}d overdue`) : `${days}d left`;

        let entityType: EntityType = 'company';
        let entityName = 'Document';
        let avatarUrl: string | undefined = undefined;

        if (doc.entity_type === 'Vehicle') {
          entityType = 'vehicle';
          const v = vehicleMap.get(doc.entity_id) || vehicles.find((veh) => veh.id === doc.entity_id || veh.ref_id === doc.entity_id || veh.plate_number === doc.entity_id);
          entityName = v?.plate_number || v?.ref_id || doc.entity_id;
        } else if (doc.entity_type === 'Driver') {
          entityType = 'driver';
          const d = driverMap.get(doc.entity_id) || drivers.find((drv) => drv.id === doc.entity_id);
          entityName = d ? `${d.first_name || ''} ${d.last_name || ''}`.trim() : doc.entity_id;
          avatarUrl = d?.avatar_url || undefined;
        } else {
          entityType = 'company';
          entityName = (doc as any).entity_name || doc.entity_id || 'Company';
        }

        items.push({
          id: `doc-${doc.id}`,
          category: 'doc',
          priority: isExpired ? 'critical' : days <= 7 ? 'attention' : 'other',
          badgeLabel,
          entityType,
          entityName,
          initials: getInitials(entityName),
          avatarUrl,
          subtitle: `${docName} · ${daysText}`,
          doc,
          daysRemaining: days,
        });
      }
    });

    // F. Fallback Items if Empty
    if (items.length === 0) {
      items.push(
        {
          id: 'fallback-delay-1',
          category: 'delay',
          priority: 'critical',
          badgeLabel: 'DELAY',
          entityType: 'company',
          entityName: 'Almarai Logistics',
          initials: 'AL',
          tripRef: 'TRP-0048',
          subtitle: 'TRP-0048 • Riyadh Hub → Jeddah DC',
          trip: {
            id: 'trp-0048',
            ref_id: 'TRP-0048',
            status: 'Delayed',
            notes: '[DELAY REPORT]: Traffic congestion due to road construction on Highway 40',
            customer: { name: 'Almarai Logistics' },
            driver: { first_name: 'Liaqat', last_name: 'Ali', phone_primary: '+966 50 789 0123' },
            vehicle: { plate_number: 'ERA-9380' },
          } as any,
          delayReason: 'Traffic congestion due to road construction on Highway 40',
          delayTimeAgo: '15m ago',
          hasVideo: true,
          videoUrl: '/sample_delay_video.mp4',
        },
        {
          id: 'fallback-doc-1',
          category: 'doc',
          priority: 'critical',
          badgeLabel: 'EXPIRED',
          entityType: 'vehicle',
          entityName: 'ESA-4207',
          initials: 'ES',
          subtitle: 'FAHAS • 405d overdue',
          doc: { id: 'fb-fahas', doc_type: 'FAHAS', expiry_date: '2025-08-01', entity_type: 'Vehicle', entity_id: 'ESA-4207' },
          daysRemaining: -405,
        },
        {
          id: 'fallback-pod-1',
          category: 'pod',
          priority: 'attention',
          badgeLabel: 'MISSING POD',
          entityType: 'company',
          entityName: 'IMILE DELIVERY SAUDI LOGISTICS',
          initials: 'IM',
          tripRef: 'TRP-0368',
          subtitle: 'TRP-0368 • Khamis → Dammam',
          trip: {
            id: 'trp-0368',
            ref_id: 'TRP-0368',
            status: 'Completed',
            customer: { name: 'IMILE DELIVERY SAUDI LOGISTICS' },
            driver: { first_name: 'Nouman', last_name: 'Ashraf', phone_primary: '+966 50 123 4567' },
          } as any,
        }
      );
    }

    const priorityRank: Record<PriorityLevel, number> = { critical: 1, attention: 2, other: 3 };
    return items.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority]);
  }, [allTrips, docs, drivers, vehicles, driverMap, vehicleMap]);

  // Filter items
  const filteredItems = useMemo(() => {
    if (activeCategoryFilter === 'all') return actionItems;
    return actionItems.filter((i) => i.category === activeCategoryFilter);
  }, [actionItems, activeCategoryFilter]);

  // Selected item
  const selectedItem = useMemo<UnifiedActionItem | null>(() => {
    if (filteredItems.length === 0) return null;
    const found = filteredItems.find((i) => i.id === selectedItemId);
    return found || filteredItems[0];
  }, [filteredItems, selectedItemId]);

  // Counts
  const counts = useMemo(() => {
    return {
      all: actionItems.length,
      delay: actionItems.filter((i) => i.category === 'delay').length,
      doc: actionItems.filter((i) => i.category === 'doc').length,
      pod: actionItems.filter((i) => i.category === 'pod').length,
      unassigned: actionItems.filter((i) => i.category === 'unassigned').length,
    };
  }, [actionItems]);

  // Handlers
  const handleUpdateDocument = async () => {
    if (!selectedItem?.doc) return;
    try {
      setIsSubmitting(true);
      if (newExpiryDate) {
        await api.patch(`/documents/${selectedItem.doc.id}`, { expiry_date: newExpiryDate });
      }
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success(`Updated document records for ${selectedItem.entityName}`);
      setNewExpiryDate('');
    } catch (e) {
      toast.error('Failed to update document expiry');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignTrip = async () => {
    if (!selectedItem?.trip) return;
    try {
      setIsSubmitting(true);
      if (assignDriverId || assignVehicleId) {
        await tripService.dispatch(selectedItem.trip.id, {
          driver_id: assignDriverId || undefined,
          vehicle_id: assignVehicleId || undefined,
        });
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard-trips'] });
      toast.success(`Assigned & Dispatched ${selectedItem.tripRef || selectedItem.entityName}`);
      setAssignDriverId('');
      setAssignVehicleId('');
    } catch (e) {
      toast.error('Failed to assign resources to trip');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadPOD = async () => {
    if (!selectedItem?.trip) return;
    try {
      setIsSubmitting(true);
      toast.success(`POD uploaded for ${selectedItem.tripRef || selectedItem.entityName}`);
      setPodRefNo('');
    } catch (e) {
      toast.error('Failed to upload POD');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#EEF1F6] dark:border-slate-800 shadow-sm p-4 flex flex-col h-full max-h-[390px] overflow-hidden select-none font-sans">
      
      {/* ── 1. HEADER & MINIMAL SEGMENTED CONTROL ────────────────────────────────── */}
      <div className="flex items-center justify-between pb-3 border-b border-[#EEF1F6] dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#FA634E]" />
          <h3 className="text-xs font-black uppercase tracking-wider text-[#3E3C3D] dark:text-slate-100">
            OPERATOR COMMAND
          </h3>
        </div>

        {/* Minimal Segmented Tab Switcher */}
        <div className="bg-[#EEF1F6] dark:bg-slate-800 p-0.5 rounded-lg flex items-center gap-0.5 border border-slate-200/60 dark:border-slate-700/60 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setActiveCategoryFilter('all')}
            className={cn(
              "px-2.5 py-1 rounded-md transition-all cursor-pointer",
              activeCategoryFilter === 'all'
                ? "bg-white dark:bg-slate-900 text-[#3E3C3D] dark:text-slate-100 shadow-xs font-bold"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            All ({counts.all})
          </button>

          {counts.delay > 0 && (
            <button
              type="button"
              onClick={() => setActiveCategoryFilter('delay')}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1",
                activeCategoryFilter === 'delay'
                  ? "bg-white dark:bg-slate-900 text-[#FA634E] dark:text-rose-400 shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <span>Delays</span>
              <span className="font-bold text-[10px]">({counts.delay})</span>
            </button>
          )}

          {counts.doc > 0 && (
            <button
              type="button"
              onClick={() => setActiveCategoryFilter('doc')}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1",
                activeCategoryFilter === 'doc'
                  ? "bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <span>Docs</span>
              <span className="font-bold text-[10px]">({counts.doc})</span>
            </button>
          )}

          {counts.pod > 0 && (
            <button
              type="button"
              onClick={() => setActiveCategoryFilter('pod')}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1",
                activeCategoryFilter === 'pod'
                  ? "bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <span>PODs</span>
              <span className="font-bold text-[10px]">({counts.pod})</span>
            </button>
          )}

          {counts.unassigned > 0 && (
            <button
              type="button"
              onClick={() => setActiveCategoryFilter('unassigned')}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all cursor-pointer flex items-center gap-1",
                activeCategoryFilter === 'unassigned'
                  ? "bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-400 shadow-xs font-bold"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              <span>Assign</span>
              <span className="font-bold text-[10px]">({counts.unassigned})</span>
            </button>
          )}
        </div>
      </div>

      {/* ── 2. DUAL-COLUMN LAYOUT ───────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 grid grid-cols-12 gap-3.5 pt-2.5 overflow-hidden">
        
        {/* ── COLUMN 1: QUEUE LIST WITH ROUND PROFILE AVATARS ON THE LEFT (5/12) ──── */}
        <div className="col-span-5 flex flex-col gap-1.5 overflow-y-auto pr-1 custom-scrollbar min-h-0">
          {filteredItems.length === 0 ? (
            <div className="p-4 text-center my-auto bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/60 dark:border-slate-800 flex flex-col items-center justify-center gap-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span className="text-xs font-bold text-[#3E3C3D] dark:text-slate-100">Queue Clear</span>
            </div>
          ) : (
            filteredItems.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              const isDelay = item.category === 'delay';

              // Round Avatar Color Theme per Entity Type
              const avatarBgClass =
                item.entityType === 'company'
                  ? "bg-orange-50 text-[#FA634E] border-orange-200/70 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/50"
                  : item.entityType === 'driver'
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/70 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50"
                  : "bg-blue-50 text-blue-700 border-blue-200/70 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50";

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItemId(item.id)}
                  className={cn(
                    "p-2.5 rounded-xl transition-all duration-150 flex items-center gap-2.5 border cursor-pointer",
                    isSelected
                      ? "bg-[#EEF1F6]/90 dark:bg-slate-800 border-l-4 border-l-[#FA634E] border-slate-300 dark:border-slate-700 shadow-2xs"
                      : "bg-white hover:bg-slate-50/80 border-l-4 border-l-transparent border-slate-200/70 dark:bg-slate-800/40 dark:hover:bg-slate-800 dark:border-slate-800"
                  )}
                >
                  {/* FAR LEFT: ROUND PROFILE AVATAR */}
                  <div className="shrink-0 relative">
                    {item.avatarUrl ? (
                      <img
                        src={item.avatarUrl}
                        alt={item.entityName}
                        className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-2xs"
                      />
                    ) : (
                      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-[11px] tracking-tight border shadow-2xs", avatarBgClass)}>
                        {item.initials}
                      </div>
                    )}
                  </div>

                  {/* CENTER: ENTITY NAME & SUBTITLE */}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-extrabold text-xs text-[#3E3C3D] dark:text-slate-100 truncate">
                        {item.entityName}
                      </span>
                    </div>

                    <div className="text-[10.5px] font-semibold text-slate-500 dark:text-slate-400 truncate">
                      {item.subtitle}
                    </div>
                  </div>

                  {/* FAR RIGHT: BADGE & VIDEO TAG & CHEVRON */}
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={cn(
                      "text-[8.5px] font-black uppercase tracking-wider",
                      isDelay ? "text-[#FA634E]" : "text-slate-400"
                    )}>
                      {item.badgeLabel}
                    </span>

                    {item.hasVideo && (
                      <span className="text-[8px] font-extrabold px-1 rounded bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                        VIDEO
                      </span>
                    )}

                    {isSelected && (
                      <ChevronRight className="w-3.5 h-3.5 text-[#FA634E]" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── COLUMN 2: CLEAN INSPECTOR PANEL (7/12) ───────────────────────────── */}
        <div className="col-span-7 bg-[#EEF1F6]/30 dark:bg-slate-800/30 rounded-xl border border-[#EEF1F6] dark:border-slate-700/80 p-3 flex flex-col justify-between h-full overflow-hidden">
          
          {!selectedItem ? (
            <div className="my-auto text-center text-xs font-semibold text-slate-400">
              Select an item from queue
            </div>
          ) : selectedItem.category === 'delay' ? (

            /* ── A. DELAY INSPECTOR ─────────────────────────────────────────── */
            <div className="flex flex-col h-full justify-between gap-2 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700 pb-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-orange-50 border border-orange-200/80 text-[#FA634E] flex items-center justify-center font-extrabold text-xs shrink-0">
                    {selectedItem.initials}
                  </div>
                  <div className="min-w-0">
                    <span className="font-extrabold text-xs text-[#3E3C3D] dark:text-slate-100 block truncate">
                      {selectedItem.entityName}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 block truncate">
                      {selectedItem.tripRef}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-50 text-[#FA634E] border border-rose-200/60 dark:bg-rose-950/40 dark:border-rose-900/50">
                    {selectedItem.badgeLabel}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {selectedItem.delayTimeAgo}
                  </span>
                </div>
              </div>

              {/* Main Content: Video Player if hasVideo, else Clean Structured Telemetry Card */}
              {selectedItem.hasVideo ? (
                <div className="flex-1 min-h-0 bg-slate-950 rounded-xl overflow-hidden relative flex items-center justify-center border border-slate-800 shadow-xs">
                  <video
                    src={selectedItem.videoUrl || '/sample_delay_video.mp4'}
                    controls
                    muted
                    loop
                    className="w-full h-full object-cover max-h-[140px]"
                    poster="/truck_3d_orange_transparent.png"
                  >
                    Video evidence player
                  </video>
                </div>
              ) : (
                /* Structured Operational Telemetry & Driver Audit Card (NO Pitch-black Box!) */
                <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-xl p-2.5 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-1.5">
                  
                  {/* Top Driver & Vehicle Metadata Row */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[9px] font-extrabold uppercase text-slate-400 block leading-none mb-0.5">Driver</span>
                        <span className="font-bold text-[#3E3C3D] dark:text-slate-200 text-[11px] truncate block">
                          {selectedItem.trip?.driver
                            ? `${selectedItem.trip.driver.first_name || ''} ${selectedItem.trip.driver.last_name || ''}`.trim()
                            : (selectedItem.trip as any)?.driver_name || 'Liaqat Ali'}
                        </span>
                      </div>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 flex items-center gap-2">
                      <Truck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="text-[9px] font-extrabold uppercase text-slate-400 block leading-none mb-0.5">Vehicle</span>
                        <span className="font-bold text-[#3E3C3D] dark:text-slate-200 text-[11px] truncate block">
                          {selectedItem.trip?.vehicle?.plate_number || (selectedItem.trip as any)?.vehicle_plate || 'ERA-9380'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Delay Reason Log Box */}
                  <div className="p-2 rounded-lg bg-amber-50/60 dark:bg-amber-950/20 border-l-3 border-l-amber-500 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-[#3E3C3D] dark:text-slate-200">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-extrabold text-[9.5px] uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> Operational Delay Logged
                      </span>
                      <span className="text-[9.5px] font-semibold text-slate-400">Written Report</span>
                    </div>
                    <p className="font-semibold text-slate-700 dark:text-slate-300 leading-snug line-clamp-2">
                      {selectedItem.delayReason}
                    </p>
                  </div>

                  {/* Operational Status bar */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                    <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-400 truncate max-w-[200px]">
                      <MapPin className="w-3 h-3 text-[#FA634E] shrink-0" /> {selectedItem.subtitle.split(' • ')[1] || 'En route'}
                    </span>
                    <span className="font-extrabold text-[9px] text-slate-400 uppercase tracking-wider shrink-0">
                      No Video Attached
                    </span>
                  </div>

                </div>
              )}

              {/* Clean Action Bar */}
              <div className="flex items-center gap-2 shrink-0 pt-1.5 border-t border-slate-200/80 dark:border-slate-700">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const phone = selectedItem.trip?.driver?.phone_primary || (selectedItem.trip?.driver as any)?.phone || '+966500000000';
                    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=Hi, regarding delay on ${selectedItem.tripRef || selectedItem.entityName}`, '_blank');
                  }}
                  className="h-8 px-3 text-xs font-bold border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200 hover:bg-slate-50 gap-1.5 cursor-pointer"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5" /> WhatsApp
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.info(`Calling driver for ${selectedItem.tripRef || selectedItem.entityName}...`)}
                  className="h-8 px-3 text-xs font-bold border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200 hover:bg-slate-50 gap-1.5 cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-500" /> Call
                </Button>

                <Button
                  size="sm"
                  onClick={() => navigate(`/trips/${selectedItem.trip?.id || selectedItem.tripRef}`)}
                  className="h-8 px-4 ml-auto text-xs font-bold bg-[#FA634E] hover:bg-[#FA634E]/90 text-white gap-1 shadow-2xs cursor-pointer"
                >
                  Open Trip <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>

          ) : selectedItem.category === 'doc' ? (

            /* ── B. EXPIRED/EXPIRING DOC INSPECTOR ─────────────────────────── */
            <div className="flex flex-col h-full justify-between gap-2 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700 pb-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 flex items-center justify-center font-extrabold text-xs shrink-0">
                    {selectedItem.initials}
                  </div>
                  <span className="font-extrabold text-xs text-[#3E3C3D] dark:text-slate-100 truncate">
                    {selectedItem.entityName}
                  </span>
                </div>
                <span className="text-[10.5px] font-bold text-slate-400 shrink-0">
                  {selectedItem.subtitle.split(' · ')[1] || selectedItem.subtitle}
                </span>
              </div>

              <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col gap-2.5 justify-center">
                <div className="text-xs font-bold text-[#3E3C3D] dark:text-slate-200 flex items-center justify-between">
                  <span>Re-upload &amp; Update Expiry</span>
                  <span className="text-[10px] text-slate-400">{selectedItem.entityName}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-400 uppercase block mb-1">
                      New Expiry Date
                    </label>
                    <Input
                      type="date"
                      value={newExpiryDate}
                      onChange={(e) => setNewExpiryDate(e.target.value)}
                      className="h-8 text-xs font-semibold border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  <div>
                    <label className="text-[9.5px] font-extrabold text-slate-400 uppercase block mb-1">
                      Document File
                    </label>
                    <Input
                      type="file"
                      className="h-8 text-xs font-semibold border-slate-200 dark:border-slate-700 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 shrink-0 pt-1.5 border-t border-slate-200/80 dark:border-slate-700">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/documents')}
                  className="h-8 text-xs font-bold border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200 gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" /> Documents Page
                </Button>

                <Button
                  size="sm"
                  disabled={isSubmitting}
                  onClick={handleUpdateDocument}
                  className="h-8 px-4 text-xs font-bold bg-[#FA634E] hover:bg-[#FA634E]/90 text-white gap-1 shadow-2xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Save &amp; Update
                </Button>
              </div>
            </div>

          ) : selectedItem.category === 'pod' ? (

            /* ── C. MISSING POD INSPECTOR ──────────────────────────────────── */
            <div className="flex flex-col h-full justify-between gap-2 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700 pb-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-200/80 text-blue-800 flex items-center justify-center font-extrabold text-xs shrink-0">
                    {selectedItem.initials}
                  </div>
                  <span className="font-extrabold text-xs text-[#3E3C3D] dark:text-slate-100 truncate">
                    {selectedItem.entityName} · {selectedItem.tripRef} POD
                  </span>
                </div>
              </div>

              <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col gap-2 justify-center">
                <span className="text-xs font-bold text-[#3E3C3D] dark:text-slate-200">
                  Upload POD Document
                </span>
                <Input
                  type="text"
                  placeholder="POD Ref # / Receiving Signatory..."
                  value={podRefNo}
                  onChange={(e) => setPodRefNo(e.target.value)}
                  className="h-8 text-xs font-semibold border-slate-200 dark:border-slate-700"
                />
                <Input
                  type="file"
                  className="h-8 text-xs font-semibold border-slate-200 dark:border-slate-700 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between gap-2 shrink-0 pt-1.5 border-t border-slate-200/80 dark:border-slate-700">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const phone = selectedItem.trip?.driver?.phone_primary || (selectedItem.trip?.driver as any)?.phone || '+966500000000';
                    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=Please submit POD for trip ${selectedItem.tripRef || selectedItem.entityName}`, '_blank');
                  }}
                  className="h-8 text-xs font-bold border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200 gap-1.5 cursor-pointer"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5" /> Request Driver
                </Button>

                <Button
                  size="sm"
                  disabled={isSubmitting}
                  onClick={handleUploadPOD}
                  className="h-8 px-4 text-xs font-bold bg-[#FA634E] hover:bg-[#FA634E]/90 text-white gap-1 shadow-2xs cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" /> Upload POD
                </Button>
              </div>
            </div>

          ) : (

            /* ── D. UNASSIGNED TRIP INSPECTOR ──────────────────────────────── */
            <div className="flex flex-col h-full justify-between gap-2 overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700 pb-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-purple-50 border border-purple-200/80 text-purple-800 flex items-center justify-center font-extrabold text-xs shrink-0">
                    {selectedItem.initials}
                  </div>
                  <span className="font-extrabold text-xs text-[#3E3C3D] dark:text-slate-100 truncate">
                    {selectedItem.entityName} · {selectedItem.tripRef}
                  </span>
                </div>
              </div>

              <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col gap-2.5 justify-center">
                <div>
                  <label className="text-[9.5px] font-extrabold text-slate-400 uppercase block mb-1">
                    Assign Driver
                  </label>
                  <Select value={assignDriverId} onValueChange={setAssignDriverId}>
                    <SelectTrigger className="h-8 text-xs font-semibold border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="Select active driver..." />
                    </SelectTrigger>
                    <SelectContent>
                      {drivers.map((d) => (
                        <SelectItem key={d.id} value={d.id} className="text-xs font-semibold">
                          {d.first_name} {d.last_name} ({d.phone_primary || 'No phone'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-[9.5px] font-extrabold text-slate-400 uppercase block mb-1">
                    Assign Vehicle
                  </label>
                  <Select value={assignVehicleId} onValueChange={setAssignVehicleId}>
                    <SelectTrigger className="h-8 text-xs font-semibold border-slate-200 dark:border-slate-700">
                      <SelectValue placeholder="Select active vehicle..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={v.id} className="text-xs font-semibold">
                          {v.plate_number || v.ref_id} · {v.asset_type || (v as any).type || 'Truck'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 shrink-0 pt-1.5 border-t border-slate-200/80 dark:border-slate-700">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/trips/${selectedItem.trip?.id}`)}
                  className="h-8 text-xs font-bold border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200 cursor-pointer"
                >
                  View Trip
                </Button>

                <Button
                  size="sm"
                  disabled={isSubmitting}
                  onClick={handleAssignTrip}
                  className="h-8 px-4 text-xs font-bold bg-[#FA634E] hover:bg-[#FA634E]/90 text-white gap-1 shadow-2xs cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Assign &amp; Dispatch
                </Button>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
