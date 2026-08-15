import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, Check, Clock, AlertTriangle, FileText, Truck, CheckCircle2, 
  RotateCw, Search, ShieldAlert, ArrowRight, Calendar, UserCheck
} from 'lucide-react';
import { RiskAlert, CalendarAlert, CheckBadge } from '@/components/ui/kpi-icons';

import DashboardLayout from '@/components/layout/DashboardLayout';
import KpiCard from '@/components/ui/KpiCard';
import { notificationService, type Notification } from '@/services/notificationService';
import { documentService } from '@/services/documentService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { docTypeLabel, categoryForEntity, daysUntil } from '@/lib/documents';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { matchesSearch } from '@/lib/search';

type NotificationType = 'alert' | 'trip' | 'document' | 'system';

interface UnifiedNotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  normalizedType: NotificationType;
  entity_type?: string;
  entity_id?: string;
  is_read: boolean;
  createdAt: string;
  isReminder?: boolean;
  link?: string;
  urgencyOrder: number;
}

/** Backend type strings are free-form ("Emergency"/"Trip"/"system"…) — normalize to 4 buckets. */
function normalizeType(type: string): NotificationType {
  const t = (type || '').toLowerCase();
  if (t.includes('emergency') || t.includes('alert') || t.includes('hazard') || t.includes('expired')) return 'alert';
  if (t.includes('trip') || t.includes('dispatch') || t.includes('delay')) return 'trip';
  if (t.includes('document') || t.includes('doc') || t.includes('license') || t.includes('permit') || t.includes('renewal')) return 'document';
  return 'system';
}

/** Build an in-app link from entity_type + entity_id when present. */
function linkFor(n: UnifiedNotificationItem | Notification): string | undefined {
  if ('link' in n && n.link) return n.link;
  if (!n.entity_id || !n.entity_type) return undefined;
  const map: Record<string, string> = { Trip: 'trips', Driver: 'drivers', Vehicle: 'vehicles', MaintenanceRecord: 'maintenance' };
  const seg = map[n.entity_type];
  return seg ? `/${seg}/${n.entity_id}` : undefined;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'Recently';
  const secs = Math.floor((Date.now() - then) / 1000);
  if (secs < 60) return 'Just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'alert' | 'document' | 'trip'>('all');
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Local storage cache for dismissed / read reminder IDs
  const [readReminderIds, setReadReminderIds] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem('mercon_read_reminders');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // 1. Fetch DB notifications
  const { data: rawNotifications, isLoading: isLoadingNotifs, isError: isErrorNotifs } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await notificationService.getAll();
      const raw = res?.data;
      if (Array.isArray(raw)) return raw;
      if (raw && Array.isArray((raw as any).notifications)) return (raw as any).notifications;
      return [];
    },
  });

  // 2. Fetch live compliance documents (Vault)
  const { data: docs = [] } = useQuery({
    queryKey: ['documents', 'all'],
    queryFn: async () => (await documentService.getAll({ per_page: 200 })).data,
  });

  // 3. Fetch drivers lookup for license compliance
  const { data: drivers = [] } = useQuery({
    queryKey: ['drivers', 'lookup'],
    queryFn: async () => (await driverService.getAll()).data,
  });

  // 4. Fetch vehicles lookup
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

  // Combine DB notifications + live compliance reminders into a unified stream
  const allNotifications = useMemo<UnifiedNotificationItem[]>(() => {
    const list: UnifiedNotificationItem[] = [];

    // Add DB notifications
    if (Array.isArray(rawNotifications)) {
      rawNotifications.forEach((n) => {
        list.push({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          normalizedType: normalizeType(n.type),
          entity_type: n.entity_type,
          entity_id: n.entity_id,
          is_read: n.is_read,
          createdAt: n.createdAt,
          urgencyOrder: n.type === 'Emergency' ? 0 : 3,
        });
      });
    }

    const seenDriverDocIds = new Set<string>();

    // Add Live Document Reminders (Expires within 30 days or already expired)
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
        const reminderId = `rem-doc-${doc.id}`;
        const isRead = readReminderIds.has(reminderId);

        const expFormatted = doc.expiry_date ? doc.expiry_date.split('T')[0] : '';
        const title = isExpired
          ? `Expired: ${typeLabel} (${entityName})`
          : isCritical
          ? `Critical Renewal: ${typeLabel} (${entityName})`
          : `Reminder: ${typeLabel} Expiring Soon (${entityName})`;

        const message = isExpired
          ? `${typeLabel} for ${entityName} expired ${Math.abs(days)} day(s) ago (${expFormatted}). Immediate regulatory renewal required.`
          : `${typeLabel} for ${entityName} will expire in ${days} day(s) (${expFormatted}). Action required to avoid dispatch grounding.`;

        const link = doc.entity_type === 'Driver'
          ? `/drivers/${doc.entity_id}`
          : doc.entity_type === 'Vehicle'
          ? `/vehicles/${doc.entity_id}`
          : `/documents?filter=${isExpired ? 'expired' : isCritical ? 'critical' : 'warning'}`;

        list.push({
          id: reminderId,
          title,
          message,
          type: isExpired ? 'Emergency' : 'Document',
          normalizedType: isExpired ? 'alert' : 'document',
          entity_type: doc.entity_type,
          entity_id: doc.entity_id,
          is_read: isRead,
          createdAt: doc.createdAt || new Date().toISOString(),
          isReminder: true,
          link,
          urgencyOrder: isExpired ? 1 : isCritical ? 2 : 4,
        });
      }
    }

    // Add Driver License compliance reminders from Driver records
    for (const d of drivers) {
      if (d.license_expiry && !seenDriverDocIds.has(d.id)) {
        const days = daysUntil(d.license_expiry);
        if (days !== null && days <= 30) {
          const isExpired = days <= 0;
          const isCritical = days > 0 && days <= 7;
          const driverName = `${d.first_name} ${d.last_name}`.trim();
          const reminderId = `rem-driver-lic-${d.id}`;
          const isRead = readReminderIds.has(reminderId);

          const title = isExpired
            ? `Expired: Driver License (${driverName})`
            : isCritical
            ? `Critical License Expiry: ${driverName}`
            : `Reminder: Driver License Expiring (${driverName})`;

          const message = isExpired
            ? `Driver License for ${driverName} (${d.phone_primary}) expired ${Math.abs(days)} day(s) ago. Driver cannot be legally dispatched until renewed.`
            : `Driver License for ${driverName} expires in ${days} day(s). Please verify renewal documents.`;

          list.push({
            id: reminderId,
            title,
            message,
            type: isExpired ? 'Emergency' : 'Document',
            normalizedType: isExpired ? 'alert' : 'document',
            entity_type: 'Driver',
            entity_id: d.id,
            is_read: isRead,
            createdAt: d.createdAt || new Date().toISOString(),
            isReminder: true,
            link: `/drivers/${d.id}`,
            urgencyOrder: isExpired ? 1 : isCritical ? 2 : 4,
          });
        }
      }
    }

    // Sort: unread first, then by urgencyOrder (0 = Emergency, 1 = Expired, 2 = Critical, etc.), then newest
    return list.sort((a, b) => {
      if (a.is_read !== b.is_read) return a.is_read ? 1 : -1;
      if (a.urgencyOrder !== b.urgencyOrder) return a.urgencyOrder - b.urgencyOrder;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [rawNotifications, docs, drivers, nameFor, readReminderIds]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
      queryClient.invalidateQueries({ queryKey: ['documents'] }),
      queryClient.invalidateQueries({ queryKey: ['drivers'] }),
      queryClient.invalidateQueries({ queryKey: ['vehicles'] }),
    ]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => notificationService.markAsRead(id)));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAsRead = (id: string) => {
    if (id.startsWith('rem-')) {
      setReadReminderIds((prev) => {
        const next = new Set(prev);
        next.add(id);
        try {
          localStorage.setItem('mercon_read_reminders', JSON.stringify([...next]));
        } catch {}
        return next;
      });
    } else {
      if (!markReadMutation.isPending) markReadMutation.mutate(id);
    }
  };

  const markAllAsRead = () => {
    const dbIds = allNotifications.filter((n) => !n.is_read && !n.id.startsWith('rem-')).map((n) => n.id);
    const reminderIds = allNotifications.filter((n) => !n.is_read && n.id.startsWith('rem-')).map((n) => n.id);

    if (dbIds.length) {
      markAllMutation.mutate(dbIds);
    }

    if (reminderIds.length) {
      setReadReminderIds((prev) => {
        const next = new Set([...prev, ...reminderIds]);
        try {
          localStorage.setItem('mercon_read_reminders', JSON.stringify([...next]));
        } catch {}
        return next;
      });
    }
  };

  const unreadCount = allNotifications.filter((n) => !n.is_read).length;
  const totalCount = allNotifications.length;
  const readCount = Math.max(0, totalCount - unreadCount);
  const readRatioPct = totalCount > 0 ? Math.round((readCount / totalCount) * 100) : 100;

  const alertCount = allNotifications.filter((n) => n.normalizedType === 'alert').length;
  const docCount = allNotifications.filter((n) => n.normalizedType === 'document').length;
  const tripCount = allNotifications.filter((n) => n.normalizedType === 'trip').length;

  const filteredNotifications = useMemo(() => {
    return allNotifications.filter((n) => {
      const matchesTab = 
        activeTab === 'all' ? true :
        activeTab === 'unread' ? !n.is_read :
        activeTab === n.normalizedType;

      return matchesTab && matchesSearch(search, [n.title, n.message]);
    });
  }, [allNotifications, activeTab, search]);

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'alert': return <AlertTriangle size={18} className="text-rose-600" />;
      case 'trip': return <Truck size={18} className="text-brand" />;
      case 'document': return <FileText size={18} className="text-amber-600" />;
      case 'system': return <Bell size={18} className="text-blue-600" />;
    }
  };

  const getBg = (type: NotificationType) => {
    switch (type) {
      case 'alert': return 'bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:border-rose-900';
      case 'trip': return 'bg-orange-50 border-orange-200 dark:bg-orange-950/40 dark:border-orange-900';
      case 'document': return 'bg-amber-50 border-amber-200 dark:bg-amber-950/40 dark:border-amber-900';
      case 'system': return 'bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900';
    }
  };

  return (
    <DashboardLayout active="Dashboard" title="Notifications">
      <div className="px-4 sm:px-6 pb-6 h-full flex flex-col animate-fade-in gap-5 max-w-[1400px] mx-auto w-full">
        
        {/* Page Content Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-brand border border-orange-200/50 dark:border-orange-900/50 shadow-2xs">
              <Bell className="w-5 h-5 text-brand" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Notifications & Compliance Center
                </h1>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Unified live stream of operational alerts, compliance deadlines, and important fleet reminders.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 shadow-2xs"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
              Mark All as Read
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-9 w-9 p-0 text-slate-600 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 shadow-2xs"
              title="Refresh All Alerts & Reminders"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-brand' : ''}`} />
            </Button>
          </div>
        </div>

        {/* 4-Card Instrument Panel KPI Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          
          {/* Card 1: Total Notifications */}
          <KpiCard
            title="TOTAL ALERTS & REMINDERS"
            value={totalCount}
            variant="blue"
            trend="neutral"
            trendValue={`${readRatioPct}% Processed`}
            description="Click to view all records"
            icon={CheckBadge}
            completionGauge={{
              percentage: readRatioPct || 100,
              label: `${readRatioPct}% Read & Processed`,
              subtext: `${readCount} Read • ${unreadCount} Unread`
            }}
            onClick={() => setActiveTab('all')}
          />

          {/* Card 2: Unread Alerts */}
          <KpiCard
            title="PENDING ACTION"
            value={unreadCount}
            variant="brand"
            trend={unreadCount > 0 ? 'down' : 'neutral'}
            trendValue={unreadCount > 0 ? 'Action Required' : 'All Clear'}
            description="Click to view unread alerts"
            icon={CalendarAlert}
            progressSegments={[
              { label: `${unreadCount} Unread`, value: unreadCount > 0 ? 80 : 0, color: 'bg-brand' },
              { label: 'Read', value: unreadCount > 0 ? 20 : 100, color: 'bg-slate-300' },
            ]}
            onClick={() => setActiveTab('unread')}
          />

          {/* Card 3: Emergency & Expired */}
          <KpiCard
            title="EMERGENCY & EXPIRED"
            value={alertCount}
            variant="rose"
            trend={alertCount > 0 ? 'down' : 'neutral'}
            trendValue={alertCount > 0 ? 'Immediate Hazard' : 'Zero Violations'}
            description="Click for Emergency alerts"
            icon={RiskAlert}
            progressSegments={[
              { label: 'Urgent Action', value: alertCount > 0 ? 100 : 0, color: 'bg-rose-600' },
            ]}
            onClick={() => setActiveTab('alert')}
          />

          {/* Card 4: Document Reminders & Dispatch */}
          <KpiCard
            title="DOCUMENT & DISPATCH"
            value={docCount + tripCount}
            variant="emerald"
            trend="neutral"
            trendValue="Compliance Radar"
            description="Click for Document reminders"
            icon={Truck}
            progressSegments={[
              { label: `Documents (${docCount})`, value: 60, color: 'bg-amber-500' },
              { label: `Dispatch (${tripCount})`, value: 40, color: 'bg-indigo-600' },
            ]}
            onClick={() => setActiveTab('document')}
          />
        </div>

        {/* Toolbar & Filter Bar */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-2.5 shadow-2xs border border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-3 overflow-x-auto">
            
            {/* Filter Pills */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shrink-0 border border-slate-200/60 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'all'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                All ({totalCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('unread')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'unread'
                    ? 'bg-white dark:bg-slate-900 text-brand shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <span>Unread</span>
                {unreadCount > 0 && (
                  <Badge className="bg-brand text-white text-[9px] px-1.5 py-0 font-bold">
                    {unreadCount}
                  </Badge>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('alert')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'alert'
                    ? 'bg-white dark:bg-slate-900 text-rose-600 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Emergency &amp; Expired ({alertCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('document')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'document'
                    ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Documents &amp; Reminders ({docCount})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('trip')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'trip'
                    ? 'bg-white dark:bg-slate-900 text-indigo-600 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Dispatch Logs ({tripCount})
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative w-64 shrink-0 ml-auto">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search alerts or reminders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 text-xs pl-8 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50"
              />
            </div>

          </div>
        </div>

        {/* Notifications Workspace List */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xs overflow-hidden shrink-0">
          {isLoadingNotifs ? (
            <div className="p-12 text-center text-slate-500 text-xs font-medium">Loading notifications & reminders...</div>
          ) : isErrorNotifs ? (
            <div className="p-12 text-center text-rose-600 text-xs font-bold">Failed to load notifications.</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <CheckCircle2 size={44} className="mx-auto mb-3 text-emerald-500 opacity-60" />
              <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mb-1">All Caught Up!</p>
              <p className="text-xs text-slate-500">No new notifications or pending compliance reminders in this view.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredNotifications.map((notif) => {
                const type = notif.normalizedType;
                const link = linkFor(notif);
                
                const badgeClasses: Record<NotificationType, string> = {
                  alert: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800',
                  trip: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/30 dark:text-indigo-400 dark:border-indigo-800',
                  document: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800',
                  system: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800',
                };

                return (
                  <div
                    key={notif.id}
                    className={cn(
                      "p-4 flex gap-4 transition-all duration-150 ease-in-out hover:bg-slate-100/70 dark:hover:bg-slate-800/80 cursor-pointer outline-none border-l-4",
                      !notif.is_read 
                        ? 'bg-indigo-50/20 dark:bg-indigo-950/15 border-l-brand' 
                        : 'bg-white dark:bg-slate-900 border-l-transparent focus-visible:bg-slate-50'
                    )}
                    tabIndex={0}
                    role="button"
                    aria-label={`Notification: ${notif.title}. ${notif.message}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        if (!notif.is_read) markAsRead(notif.id);
                        if (link) navigate(link);
                      }
                    }}
                    onClick={() => {
                      if (!notif.is_read) markAsRead(notif.id);
                    }}
                  >
                    <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border shadow-3xs ${getBg(type)}`}>
                      {getIcon(type)}
                    </div>

                    <div className="flex-1 pt-0.5 min-w-0">
                      <div className="flex justify-between items-start mb-1 gap-4">
                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <h4 className={cn(
                            "text-xs tracking-tight truncate",
                            !notif.is_read 
                              ? 'font-extrabold text-slate-950 dark:text-slate-50' 
                              : 'font-semibold text-slate-700 dark:text-slate-300'
                          )}>
                            {notif.title}
                          </h4>
                          {notif.isReminder && (
                            <Badge variant="outline" className="text-[9px] font-extrabold bg-orange-50 text-brand border-orange-200 dark:bg-orange-950/40 dark:border-orange-900 px-1.5 py-0">
                              REMINDER
                            </Badge>
                          )}
                          <Badge variant="outline" className={cn("text-[9px] font-bold uppercase tracking-wider px-1.5 py-0", badgeClasses[type])}>
                            {type}
                          </Badge>
                        </div>

                        <span className="text-[10px] font-mono font-medium text-slate-400 whitespace-nowrap flex items-center gap-1 shrink-0">
                          <Clock size={11} className="stroke-[2]" /> {relativeTime(notif.createdAt)}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-2.5 pr-6 font-medium">
                        {notif.message}
                      </p>

                      <div className="flex items-center gap-3">
                        {link && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs font-bold text-brand hover:underline gap-1 focus-visible:ring-1 focus-visible:ring-brand cursor-pointer"
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              markAsRead(notif.id); 
                              navigate(link);
                            }}
                          >
                            View Entity Details <ArrowRight className="w-3 h-3" />
                          </Button>
                        )}
                        {!notif.is_read && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 flex items-center gap-1 py-0.5 px-1.5 rounded hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer"
                          >
                            <Check size={12} className="stroke-[2.5]" /> Mark as read
                          </button>
                        )}
                      </div>
                    </div>

                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full bg-brand shrink-0 mt-2.5 animate-pulse" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
