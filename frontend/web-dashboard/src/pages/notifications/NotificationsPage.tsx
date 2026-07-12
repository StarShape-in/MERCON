import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Clock, AlertTriangle, FileText, Truck, CheckCircle2 } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import Btn from '@/components/ui/Btn';
import { notificationService, type Notification } from '@/services/notificationService';

type NotificationType = 'alert' | 'trip' | 'document' | 'system';

/** Backend type strings are free-form ("Emergency"/"Trip"/"system"…) — normalize to our 4 buckets. */
function normalizeType(type: string): NotificationType {
  const t = (type || '').toLowerCase();
  if (t.includes('emergency') || t.includes('alert')) return 'alert';
  if (t.includes('trip')) return 'trip';
  if (t.includes('document') || t.includes('doc')) return 'document';
  return 'system';
}

/** Build an in-app link from entity_type + entity_id when present. */
function linkFor(n: Notification): string | undefined {
  if (!n.entity_id || !n.entity_type) return undefined;
  const map: Record<string, string> = { Trip: 'trips', Driver: 'drivers', Vehicle: 'vehicles' };
  const seg = map[n.entity_type];
  return seg ? `/${seg}/${n.entity_id}` : undefined;
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.floor((Date.now() - then) / 1000);
  if (secs < 60) return 'Just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days !== 1 ? 's' : ''} ago`;
  return new Date(iso).toLocaleDateString();
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  const { data: notifications = [], isLoading, isError } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await notificationService.getAll()).data,
  });

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

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filteredNotifications = notifications.filter((n) =>
    activeTab === 'unread' ? !n.is_read : true,
  );

  const markAsRead = (id: string) => {
    // avoid redundant calls; the mutation is idempotent server-side anyway
    if (!markReadMutation.isPending) markReadMutation.mutate(id);
  };

  const markAllAsRead = () => {
    const ids = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (ids.length) markAllMutation.mutate(ids);
  };

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'alert': return <AlertTriangle size={18} className="text-[#DC2626]" />;
      case 'trip': return <Truck size={18} className="text-[#E8450F]" />;
      case 'document': return <FileText size={18} className="text-[#D97706]" />;
      case 'system': return <Bell size={18} className="text-[#2563EB]" />;
    }
  };

  const getBg = (type: NotificationType) => {
    switch (type) {
      case 'alert': return 'bg-[#FEF2F2] border-[#DC2626]/20';
      case 'trip': return 'bg-[#FFF0EB] border-[#E8450F]/20';
      case 'document': return 'bg-[#FFFBEB] border-[#D97706]/20';
      case 'system': return 'bg-[#EFF6FF] border-[#2563EB]/20';
    }
  };

  return (
    <DashboardLayout
      active="Dashboard"
      title="Notifications"
      pageTitle="Notifications Center"
      pageSub={isLoading ? 'Loading…' : `You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}.`}
      actions={
        <Btn
          label="Mark all as read"
          variant="outline"
          icon={<CheckCircle2 size={14} />}
          onClick={markAllAsRead}
          disabled={unreadCount === 0 || markAllMutation.isPending}
        />
      }
    >
      <div className="px-6 pb-6 max-w-4xl mx-auto w-full">

        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-black/[0.06] pb-px">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${
              activeTab === 'all' ? 'border-[#E8450F] text-[#E8450F]' : 'border-transparent text-[#6E6E80] hover:text-[#111]'
            }`}
          >
            All Notifications
          </button>
          <button
            onClick={() => setActiveTab('unread')}
            className={`px-4 py-2.5 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'unread' ? 'border-[#E8450F] text-[#E8450F]' : 'border-transparent text-[#6E6E80] hover:text-[#111]'
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <span className="bg-[#E8450F] text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* List */}
        <div className="bg-white border border-black/[0.08] rounded-none shadow-sm overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-[#6E6E80] text-sm">Loading notifications…</div>
          ) : isError ? (
            <div className="p-12 text-center text-[#DC2626] text-sm">Failed to load notifications.</div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-[#6E6E80]">
              <CheckCircle2 size={40} className="mx-auto mb-3 text-[#16A34A]/50" />
              <p className="text-base font-bold text-[#111] mb-1">All caught up!</p>
              <p className="text-sm">You have no new notifications.</p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.04]">
              {filteredNotifications.map((notif) => {
                const type = normalizeType(notif.type);
                const link = linkFor(notif);
                return (
                  <div
                    key={notif.id}
                    className={`p-5 flex gap-4 transition-colors hover:bg-[#FAFAFA] ${
                      !notif.is_read ? 'bg-[#FFF0EB]/30' : 'bg-white'
                    }`}
                    onClick={() => {
                      if (!notif.is_read) markAsRead(notif.id);
                    }}
                  >
                    <div className={`w-10 h-10 shrink-0 rounded-none flex items-center justify-center border ${getBg(type)}`}>
                      {getIcon(type)}
                    </div>

                    <div className="flex-1 pt-0.5 cursor-pointer">
                      <div className="flex justify-between items-start mb-1 gap-4">
                        <h4 className={`text-sm ${!notif.is_read ? 'font-bold text-[#111]' : 'font-semibold text-[#444]'}`}>
                          {notif.title}
                        </h4>
                        <span className="text-[11px] font-medium text-[#9898A4] whitespace-nowrap flex items-center gap-1">
                          <Clock size={10} /> {relativeTime(notif.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-[#6E6E80] leading-relaxed mb-3 pr-8">
                        {notif.message}
                      </p>

                      <div className="flex items-center gap-3">
                        {link && (
                          <a
                            href={link}
                            className="text-xs font-bold text-[#E8450F] hover:underline"
                            onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                          >
                            View Details
                          </a>
                        )}
                        {!notif.is_read && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                            className="text-xs font-semibold text-[#6E6E80] hover:text-[#111] flex items-center gap-1"
                          >
                            <Check size={12} /> Mark as read
                          </button>
                        )}
                      </div>
                    </div>

                    {!notif.is_read && (
                      <div className="w-2 h-2 rounded-full bg-[#E8450F] shrink-0 mt-2" />
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
