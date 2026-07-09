import { useState } from 'react';
import { Bell, Check, Clock, AlertTriangle, FileText, Truck, MapPin, CheckCircle2 } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import Btn from '@/components/ui/Btn';

type NotificationType = 'alert' | 'trip' | 'document' | 'system';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  link?: string;
}

const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'alert',
    title: 'High Risk Driver Alert',
    message: 'Driver Ali Khan (ID: DRV-0042) AI risk score has exceeded threshold (7.5). Immediate review required.',
    time: '10 minutes ago',
    isRead: false,
    link: '/drivers/4',
  },
  {
    id: '2',
    type: 'trip',
    title: 'Trip TRP-9021 Delayed',
    message: 'Vehicle broke down on Highway 40. Recovery vehicle dispatched. Estimated delay: 4 hours.',
    time: '45 minutes ago',
    isRead: false,
    link: '/trips/1',
  },
  {
    id: '3',
    type: 'document',
    title: 'Vehicle Registration Expiring',
    message: 'Vehicle Plate ABC-1234 registration expires in 7 days. Please upload renewal documents.',
    time: '2 hours ago',
    isRead: true,
    link: '/vehicles/2/documents',
  },
  {
    id: '4',
    type: 'system',
    title: 'System Update Completed',
    message: 'MERCON Platform was updated to v1.2.0 successfully. Performance improvements applied.',
    time: 'Yesterday at 04:00 AM',
    isRead: true,
  },
  {
    id: '5',
    type: 'trip',
    title: 'Trip TRP-9018 Completed',
    message: 'Delivery successfully completed at Jeddah Port. Pod document uploaded.',
    time: 'Yesterday at 18:30 PM',
    isRead: true,
    link: '/trips/5',
  },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all');

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'unread') return !n.isRead;
    return true;
  });

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
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
      active="Dashboard" // Could be a separate nav item, but we'll map it to Dashboard context
      title="Notifications" 
      pageTitle="Notifications Center" 
      pageSub={`You have ${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}.`}
      actions={
        <Btn 
          label="Mark all as read" 
          variant="outline" 
          icon={<CheckCircle2 size={14} />} 
          onClick={markAllAsRead}
          disabled={unreadCount === 0}
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
        <div className="bg-white border border-black/[0.08] rounded-2xl shadow-sm overflow-hidden">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-[#6E6E80]">
              <CheckCircle2 size={40} className="mx-auto mb-3 text-[#16A34A]/50" />
              <p className="text-base font-bold text-[#111] mb-1">All caught up!</p>
              <p className="text-sm">You have no new notifications.</p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.04]">
              {filteredNotifications.map((notif) => (
                <div 
                  key={notif.id} 
                  className={`p-5 flex gap-4 transition-colors hover:bg-[#FAFAFA] ${
                    !notif.isRead ? 'bg-[#FFF0EB]/30' : 'bg-white'
                  }`}
                  onClick={() => {
                    if (!notif.isRead) markAsRead(notif.id);
                  }}
                >
                  <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border ${getBg(notif.type)}`}>
                    {getIcon(notif.type)}
                  </div>
                  
                  <div className="flex-1 pt-0.5 cursor-pointer">
                    <div className="flex justify-between items-start mb-1 gap-4">
                      <h4 className={`text-sm ${!notif.isRead ? 'font-bold text-[#111]' : 'font-semibold text-[#444]'}`}>
                        {notif.title}
                      </h4>
                      <span className="text-[11px] font-medium text-[#9898A4] whitespace-nowrap flex items-center gap-1">
                        <Clock size={10} /> {notif.time}
                      </span>
                    </div>
                    <p className="text-xs text-[#6E6E80] leading-relaxed mb-3 pr-8">
                      {notif.message}
                    </p>
                    
                    <div className="flex items-center gap-3">
                      {notif.link && (
                        <a 
                          href={notif.link} 
                          className="text-xs font-bold text-[#E8450F] hover:underline"
                          onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                        >
                          View Details
                        </a>
                      )}
                      {!notif.isRead && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                          className="text-xs font-semibold text-[#6E6E80] hover:text-[#111] flex items-center gap-1"
                        >
                          <Check size={12} /> Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {!notif.isRead && (
                    <div className="w-2 h-2 rounded-full bg-[#E8450F] shrink-0 mt-2" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
      </div>
    </DashboardLayout>
  );
}
