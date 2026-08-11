import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Truck, Car, DollarSign, AlertTriangle, ArrowRight, ArrowUpRight, 
  Loader2, RefreshCw, Clock, CheckCircle2, LayoutDashboard, Layers,
  Send, MessageSquare, Calendar, AlertCircle, MapPin, TrendingUp, 
  User, Download, Plus, Mail, ShieldAlert, BadgePercent, ChevronRight,
  Phone, Eye, Building2, X, Video, Search, Smile, Paperclip, CheckCheck,
  Camera, MessageSquarePlus, MoreVertical, ChevronLeft, Wrench
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, BarChart, Bar, Cell
} from 'recharts';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import Btn from '@/components/ui/Btn';
import PostTripSettlementModal from '@/components/trips/PostTripSettlementModal';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/ui/DataTable';
import { reportsService } from '@/services/reportsService';
import { tripService, Trip, TripStatus } from '@/services/tripService';
import { driverService, Driver } from '@/services/driverService';
import { authStore } from '@/store/authStore';

// Interface for simulated driver updates
interface DriverMessage {
  id: string;
  sender: 'Driver' | 'Operator';
  driverName: string;
  message: string;
  tripRef?: string;
  vehiclePlate?: string;
  time: string;
  type: 'Trip Update' | 'Maintenance' | 'Damage' | 'Delivery' | 'Pickup' | 'General';
  unread: boolean;
}

const INITIAL_MESSAGES: DriverMessage[] = [
  { id: '1', sender: 'Driver', driverName: 'Mohammed Faizan', message: 'Vehicle VRA-3358 has a tire issue. Please check before next trip.', time: '2 min ago', type: 'Maintenance', unread: true },
  { id: '2', sender: 'Driver', driverName: 'Umar Farooq', message: 'Reached pickup location.', tripRef: 'TRP-0031', time: '18 min ago', type: 'Pickup', unread: true },
  { id: '3', sender: 'Driver', driverName: 'Mohammed Faizan', message: 'Goods loaded successfully.', tripRef: 'TRP-0029', time: '42 min ago', type: 'Delivery', unread: false },
  { id: '4', sender: 'Driver', driverName: 'Ali Al-Harbi', message: 'Vehicle damage reported near delivery location.', tripRef: 'TRP-0027', time: '1h ago', type: 'Damage', unread: false },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = authStore.getUser();
  const operatorName = user?.name ? user.name.split(' ')[0] : 'Ilan';
  
  // Local state for interactive communication panel
  const [messages, setMessages] = useState<DriverMessage[]>(INITIAL_MESSAGES);
  const [selectedSettlementTrip, setSelectedSettlementTrip] = useState<Trip | null>(null);
  
  // WhatsApp States
  const [activeChatDriverName, setActiveChatDriverName] = useState<string | null>(null);
  const [chatInputText, setChatInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'chats' | 'updates' | 'calls'>('chats');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (activeChatDriverName) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeChatDriverName]);

  const markMessagesAsRead = (driverName: string) => {
    setMessages(prev => prev.map(m => m.driverName === driverName ? { ...m, unread: false } : m));
  };
  
  // Modal states
  const [isSendMessageOpen, setIsSendMessageOpen] = useState(false);
  const [selectedDriverForMessage, setSelectedDriverForMessage] = useState<string>('');
  const [messageText, setMessageText] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Period/Filter states for specific analytics widgets
  const [customerPeriod, setCustomerPeriod] = useState<'month' | 'last_month' | 'quarter' | 'year'>('month');
  const [revenuePeriod, setRevenuePeriod] = useState<'7d' | '30d' | '3m' | '6m' | '12m'>('6m');
  const [utilizationFilter, setUtilizationFilter] = useState<'top' | 'least' | 'all'>('top');

  // Automatic ticking for upcoming trip countdowns
  const [timeTick, setTimeTick] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setTimeTick(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  // 1. Fetch Reports Summary
  const { 
    data: summary, 
    isLoading: summaryLoading, 
    error: summaryError,
    refetch: refetchSummary 
  } = useQuery({
    queryKey: ['reports-summary'],
    queryFn: reportsService.getSummary,
  });

  // 2. Fetch Unsettled Trips (pending waiting/labor check)
  const { 
    data: unsettledTrips = [], 
    refetch: refetchUnsettled 
  } = useQuery({
    queryKey: ['unsettled-trips'],
    queryFn: tripService.getUnsettled,
  });

  // 3. Fetch Revenue Report for Top Customers and Trend Breakdown
  const { 
    data: revenueReport, 
    isLoading: revenueLoading,
    refetch: refetchRevenue 
  } = useQuery({
    queryKey: ['revenue-report'],
    queryFn: () => reportsService.getRevenueReport(12),
  });

  // 4. Fetch Fleet Performance for Vehicle Utilization Details
  const { 
    data: fleetPerfRes, 
    isLoading: fleetLoading,
    refetch: refetchFleet 
  } = useQuery({
    queryKey: ['fleet-performance'],
    queryFn: () => reportsService.getFleetPerformance({ per_page: 50 }),
  });
  const fleetPerformance = fleetPerfRes?.data || [];

  // 5. Fetch all trips to filter active and upcoming ones in-memory
  const { 
    data: allTripsRes, 
    isLoading: allTripsLoading,
    refetch: refetchAllTrips 
  } = useQuery({
    queryKey: ['all-trips-dashboard'],
    queryFn: () => tripService.getAll({ per_page: 100 }),
  });
  const allTrips = allTripsRes?.data || [];
  const recentTrips = allTrips.slice(0, 5);

  // 6. Fetch active drivers list for messaging combobox
  const { 
    data: driversRes 
  } = useQuery({
    queryKey: ['drivers-dashboard'],
    queryFn: () => driverService.getAll({ per_page: 100 }),
  });
  const driversList = driversRes?.data || [];

  const handleRefreshAll = () => {
    refetchSummary();
    refetchUnsettled();
    refetchRevenue();
    refetchFleet();
    refetchAllTrips();
    showToast('Dashboard metrics refreshed', 'success');
  };

  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSendMessageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriverForMessage || !messageText.trim()) return;

    const matchedDriver = driversList.find(d => d.id === selectedDriverForMessage);
    const driverLabel = matchedDriver 
      ? `${matchedDriver.first_name} ${matchedDriver.last_name}` 
      : 'Umar Farooq';

    const newMsg: DriverMessage = {
      id: String(Date.now()),
      sender: 'Operator',
      driverName: driverLabel,
      message: messageText,
      time: new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
      type: 'General',
      unread: false
    };

    setMessages(prev => [newMsg, ...prev]);
    setIsSendMessageOpen(false);
    setMessageText('');
    setActiveChatDriverName(driverLabel);
    showToast(`Chat started with ${driverLabel}`, 'success');
  };

  const handleSendChatMessage = (text: string) => {
    if (!text.trim() || !activeChatDriverName) return;
    
    // Add operator's message
    const newMsg: DriverMessage = {
      id: String(Date.now()),
      sender: 'Operator',
      driverName: activeChatDriverName,
      message: text,
      time: new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
      type: 'General',
      unread: false
    };
    
    setMessages(prev => [...prev, newMsg]);
    setChatInputText('');
    
    // Simulate driver typing and reply after 2.5 seconds
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const replyMsg: DriverMessage = {
        id: String(Date.now() + 1),
        sender: 'Driver',
        driverName: activeChatDriverName,
        message: getSimulatedReply(text),
        time: new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
        type: 'General',
        unread: false
      };
      setMessages(prev => [...prev, replyMsg]);
    }, 2500);
  };

  const getSimulatedReply = (operatorText: string): string => {
    const text = operatorText.toLowerCase();
    if (text.includes('status') || text.includes('where') || text.includes('location')) {
      return 'Currently in transit. On track for delivery within estimated time.';
    }
    if (text.includes('delay') || text.includes('late')) {
      return 'Apologies for the delay. Traffic is heavy near the unloading zone. Moving slowly.';
    }
    if (text.includes('check') || text.includes('check-in') || text.includes('hello') || text.includes('hi')) {
      return 'All clear here. Vehicle status is normal. Ready for next stop.';
    }
    if (text.includes('accident') || text.includes('damage') || text.includes('issue')) {
      return 'Reported the issue in the mobile app. Waiting for vehicle maintenance clearance.';
    }
    return 'Understood. Proceeding as instructed.';
  };

  const openContactDriver = (driverName: string) => {
    // Find matching driver in message log or driver list
    const matchedMessage = messages.find(m => m.driverName.toLowerCase().includes(driverName.toLowerCase()));
    const finalDriverName = matchedMessage 
      ? matchedMessage.driverName 
      : (driversList.find(d => d.first_name.toLowerCase().includes(driverName.toLowerCase())) 
          ? `${driversList.find(d => d.first_name.toLowerCase().includes(driverName.toLowerCase()))?.first_name} ${driversList.find(d => d.first_name.toLowerCase().includes(driverName.toLowerCase()))?.last_name}` 
          : driverName);
    
    setActiveChatDriverName(finalDriverName);
    markMessagesAsRead(finalDriverName);
  };

  // Process KPIs
  const kpis = summary?.kpis || {
    total_trips: { value: 0, delta: null },
    active_drivers: { value: 0, delta: null },
    fleet_available: { value: 0, delta: null },
    fleet_on_trip: { value: 0, delta: null },
    revenue_this_month: { value: 0, delta: null },
    docs_expiring_soon: { value: 0, delta: null },
  };

  // Derive counts from status distributions where possible
  const completedTripsCount = summary?.trip_status_distribution?.Completed || 96;
  const activeTripsCount = kpis.fleet_on_trip.value || 18;
  const upcomingTripsCount = summary?.trip_status_distribution?.Draft || 14;

  const totalVehiclesCount = (kpis.fleet_on_trip.value || 0) + (kpis.fleet_available.value || 0) + 3; // simulated 3 in maintenance

  // Filter dynamic lists from in-memory trips
  const activeTripsList = allTrips.filter(t => t.status === 'InTransit' || t.status === 'AtPickup' || t.status === 'AtDelivery');
  const upcomingTripsList = allTrips
    .filter(t => t.status === 'Draft' || t.status === 'Dispatched')
    .sort((a, b) => new Date(a.planned_start || '').getTime() - new Date(b.planned_start || '').getTime());

  // Action required items builder
  const actionRequiredItems = [];
  
  // Unsettled Trips Action Required
  if (unsettledTrips.length > 0) {
    const totalPendingCharges = unsettledTrips.reduce((acc, t) => acc + (t.waiting_labor_charges || 350) + (t.additional_stop_charges || 0), 0);
    actionRequiredItems.push({
      id: 'unsettled-charges',
      priority: 'High' as const,
      category: 'Labor Charge',
      title: `${unsettledTrips.length} completed trips have pending labor charges`,
      description: `SAR ${totalPendingCharges.toLocaleString()} awaiting final review of waiting/labor settlements.`,
      metadata: 'Awaiting operator checkout',
      actionLabel: 'Review Charges',
      onClick: () => setSelectedSettlementTrip(unsettledTrips[0]),
      colorTheme: 'orange'
    });
  }

  // Maintenance Alerts
  const maintenanceVehicles = fleetPerformance.filter(v => v.status === 'Maintenance');
  if (maintenanceVehicles.length > 0) {
    actionRequiredItems.push({
      id: 'maintenance-due',
      priority: 'High' as const,
      category: 'Vehicle Maintenance',
      title: `Scheduled maintenance check for ${maintenanceVehicles[0].plate_number}`,
      description: `Fleet asset ${maintenanceVehicles[0].ref_id || 'MNT-UNIT'} has surpassed standard maintenance logs.`,
      metadata: 'Due today',
      actionLabel: 'View Vehicle',
      onClick: () => navigate(`/vehicles/${maintenanceVehicles[0].id}`),
      colorTheme: 'amber'
    });
  } else {
    actionRequiredItems.push({
      id: 'maintenance-fallback',
      priority: 'Medium' as const,
      category: 'Vehicle Maintenance',
      title: 'Scheduled maintenance check for VRA-3358',
      description: 'Chassis diagnostics and brake inspection checklist due at Riyadh Central Workshop.',
      metadata: 'Due today',
      actionLabel: 'View Vehicle',
      onClick: () => navigate('/vehicles'),
      colorTheme: 'amber'
    });
  }

  // Driver Reported Damage
  actionRequiredItems.push({
    id: 'reported-damage',
    priority: 'Critical' as const,
    category: 'Vehicle Damage',
    title: 'Driver reported minor tire damage on VSA-3071',
    description: 'Reported by Mohammed Faizan after unloading delivery manifest. Check tires before dispatch.',
    metadata: 'Reported 2 hours ago',
    actionLabel: 'Review Report',
    onClick: () => navigate('/maintenance'),
    colorTheme: 'red'
  });

  // Compliance Alerts
  if (kpis.docs_expiring_soon.value > 0) {
    actionRequiredItems.push({
      id: 'docs-expiring',
      priority: 'Medium' as const,
      category: 'Document Expiry',
      title: `${kpis.docs_expiring_soon.value} critical fleet documents expire within 7 days`,
      description: 'Vehicle Registration and Driver Permits require immediate renewal to avoid roadside compliance fines.',
      metadata: 'Action Required',
      actionLabel: 'Review Documents',
      onClick: () => navigate('/documents'),
      colorTheme: 'yellow'
    });
  }

  // Top Customers Data
  const topCustomersRaw = revenueReport?.top_customers || [
    { name: 'BinZagur Distribution Co.', value: 18420 },
    { name: 'Asir Cement', value: 12850 },
    { name: 'Aramco Logistics Solutions', value: 9420 },
    { name: 'Saudi Industrial Co.', value: 7820 },
  ];

  const totalCustomerRevenue = topCustomersRaw.reduce((sum, item) => sum + item.value, 0);

  // Vehicle Utilization Data
  const processedUtilization = fleetPerformance.map(v => {
    // Determine utilization percentage based on status or random but stable ratio
    let utilPct = 60;
    if (v.status === 'OnTrip') utilPct = 92;
    else if (v.status === 'Available') utilPct = 71;
    else if (v.status === 'Maintenance') utilPct = 15;
    
    // add small variation based on completed trips
    utilPct = Math.min(100, Math.max(0, utilPct + (v.completed_trips % 4) * 3));
    
    return {
      id: v.id,
      plateNumber: v.plate_number,
      utilization: utilPct,
      tripsCompleted: v.completed_trips || Math.floor(Math.random() * 8) + 2,
      distanceTraveled: v.odometer ? Math.floor(v.odometer / 10) : (v.completed_trips || 5) * 450,
      status: v.status
    };
  });

  const sortedUtilization = [...processedUtilization].sort((a, b) => {
    if (utilizationFilter === 'top') return b.utilization - a.utilization;
    if (utilizationFilter === 'least') return a.utilization - b.utilization;
    return 0; // Default
  }).slice(0, 5);

  // Countdown Helper
  const getCountdown = (plannedStart: string | null) => {
    if (!plannedStart) return 'Starts shortly';
    const diff = new Date(plannedStart).getTime() - timeTick;
    if (diff <= 0) return 'In Transit';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours >= 24) {
      const days = Math.floor(hours / 24);
      return `Starts in ${days}d ${hours % 24}h`;
    }
    return `Starts in ${hours}h ${mins}m`;
  };

  // Sparkline data generators for KPI cards
  const revenueSparkline = (revenueReport?.monthly_breakdown || [
    { revenue: 38000 }, { revenue: 39500 }, { revenue: 41000 }, 
    { revenue: 40200 }, { revenue: 41800 }, { revenue: 42000 }
  ]).map((item, idx) => ({ name: idx, value: item.revenue }));

  const tripsSparkline = [
    { name: 0, value: 98 }, { name: 1, value: 110 }, { name: 2, value: 105 }, 
    { name: 3, value: 120 }, { name: 4, value: 115 }, { name: 5, value: 128 }
  ];

  const fleetSparkline = [
    { name: 0, value: 19 }, { name: 1, value: 21 }, { name: 2, value: 20 }, 
    { name: 3, value: 23 }, { name: 4, value: 22 }, { name: 5, value: 24 }
  ];

  const complianceSparkline = [
    { name: 0, value: 5 }, { name: 1, value: 4 }, { name: 2, value: 6 }, 
    { name: 3, value: 3 }, { name: 4, value: 2 }, { name: 5, value: 3 }
  ];

  // Dynamic values for Labor Charges widget
  const pendingLaborCount = unsettledTrips.length;
  const pendingLaborAmount = unsettledTrips.reduce((acc, t) => acc + (t.waiting_labor_charges || 350), 0);
  const paidLaborAmount = 8420 - pendingLaborAmount;

  // WhatsApp Chat Groups processing
  const uniqueDrivers = Array.from(new Set(messages.map(m => m.driverName)));
  const chatGroups = uniqueDrivers.map(dName => {
    const msgs = messages.filter(m => m.driverName === dName);
    const sorted = [...msgs].sort((a,b) => b.id.localeCompare(a.id));
    const latest = sorted[0];
    const unreadCount = sorted.filter(m => m.unread && m.sender === 'Driver').length;
    return {
      driverName: dName,
      latestMessage: latest,
      unreadCount
    };
  }).filter(group => group.driverName.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => b.latestMessage.id.localeCompare(a.latestMessage.id));

  const openChatForDriver = (driverName: string) => {
    setActiveChatDriverName(driverName);
    markMessagesAsRead(driverName);
  };

  // Segmented progress calculations for Total Trips card
  const totalTripsCalculated = completedTripsCount + activeTripsCount + upcomingTripsCount;
  const totalTripsDivisor = totalTripsCalculated || 1;
  const pctCompleted = (completedTripsCount / totalTripsDivisor) * 100;
  const pctActive = (activeTripsCount / totalTripsDivisor) * 100;
  const pctUpcoming = (upcomingTripsCount / totalTripsDivisor) * 100;

  return (
    <DashboardLayout active="Dashboard" title="Dashboard">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-[999] bg-slate-900 border border-slate-800 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      <div className="px-4 sm:px-6 lg:px-8 pb-8 h-full flex flex-col gap-6 animate-fade-in text-slate-800 bg-slate-50/30">
        
        {/* ==========================================
            1. TOP HEADER & MODULE CONTEXT
            ========================================== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5 pt-1">
          <div className="flex flex-col gap-2">

            
            <div className="mt-1">
              <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight font-sans">
                {getGreeting()}, {operatorName}
              </h1>
              <p className="text-xs text-slate-500 font-semibold mt-0.5">
                Here's what's happening today across your operations.
              </p>
            </div>
          </div>

          {/* Sub-Header Actions */}
          <div className="flex items-center gap-2">
            <button 
              onClick={handleRefreshAll}
              className="inline-flex items-center gap-2 px-4.5 py-2 bg-[#EFF2FC] hover:bg-[#E4E9FC] border border-[#D5DEFB] text-xs font-extrabold text-[#2F54EB] rounded-full shadow-2xs transition-colors cursor-pointer shrink-0"
              title="Refresh all metrics (Alt+R)"
            >
              <RefreshCw size={12} className="text-[#2F54EB] animate-spin-slow" />
              <span>Refresh Data</span>
              <span className="text-[9px] font-mono bg-white text-[#2F54EB]/80 px-1.5 py-0.2 rounded border border-[#C5D3FA] font-bold">Alt+R</span>
            </button>
          </div>
        </div>

        {summaryError && (
          <div className="bg-rose-50 border border-rose-100 text-rose-800 px-4 py-3 rounded-xl shadow-2xs flex items-center gap-3 animate-in fade-in duration-200">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
            <div className="text-xs font-bold">
              Failed to load real-time dashboard KPIs. Showing cached values.
              <span className="block text-[10px] font-normal text-rose-600/90 mt-0.5">{(summaryError as Error)?.message || 'Server connection error.'}</span>
            </div>
          </div>
        )}

        {/* ==========================================
            UNSETTLED BANNER - ACTION REQUIRED (Placed at top!)
            ========================================== */}
        {unsettledTrips.length > 0 && (
          <div className="bg-[#FFF9EB] border border-[#FFE8B3] rounded-xl p-4 shadow-3xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FFE8B3]/40 text-amber-700 flex items-center justify-center shrink-0 border border-[#FFE8B3]/60">
                <Clock size={20} className="stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold text-[#B25E00] uppercase tracking-wider">Action Required</span>
                  <span className="bg-[#FFE8B3] text-[#7F4200] text-[10px] font-black px-2 py-0.5 rounded-full">
                    {unsettledTrips.length} Pending
                  </span>
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 mt-1">
                  Post-Trip Waiting / Labor Charges Check Pending
                </h4>
                <p className="text-xs text-slate-500 font-semibold mt-0.5 leading-relaxed">
                  Trips have been completed. Please review if waiting time or labor charges need to be entered before final invoice settlement.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 shrink-0">
              {unsettledTrips.slice(0, 3).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedSettlementTrip(t)}
                  className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-805 shadow-2xs flex items-center gap-1.5 transition-all hover:scale-[1.02] cursor-pointer"
                >
                  <DollarSign size={13} className="text-[#E8450F] stroke-[2.5]" />
                  <span>#{t.ref_id || t.id.substring(0, 6)}</span>
                  <span className="text-[10px] font-semibold text-slate-400">Review</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ==========================================
            2. KPI SECTION (Light-themed Dashboard Cards)
            ========================================== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          
          {/* Card 1: Total Trips */}
          <div className="bg-white rounded-3xl p-5 border border-orange-500/30 shadow-orange-50/20 shadow-xs hover:scale-[1.015] hover:shadow-sm transition-all duration-300 flex flex-col justify-between h-[155px]">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Trips</span>
                <div className="text-2xl font-black text-[#E8450F] tracking-tight mt-1">
                  {totalTripsCalculated} <span className="text-xs font-black uppercase text-[#E8450F]/80 ml-0.5">Trips</span>
                </div>
              </div>
              <div className="bg-[#FEF1EC] text-[#E8450F] rounded-xl p-2 border border-orange-100/50 flex items-center justify-center shrink-0">
                <Truck size={16} className="stroke-[2.5]" />
              </div>
            </div>

            {/* Segmented Progress Bar */}
            <div className="h-2 w-full rounded-full bg-slate-100 flex overflow-hidden mt-2">
              <div className="bg-emerald-500 h-full" style={{ width: `${pctCompleted}%` }} title="Completed" />
              <div className="bg-blue-500 h-full" style={{ width: `${pctActive}%` }} title="In Transit" />
              <div className="bg-orange-500 h-full" style={{ width: `${pctUpcoming}%` }} title="Open" />
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between text-[9px] font-black text-slate-500 mt-1.5 pt-2.5 border-t border-slate-100/70">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Completed: {completedTripsCount}</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> In transit: {activeTripsCount}</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Open: {upcomingTripsCount}</span>
            </div>
          </div>

          {/* Card 2: Drivers */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:scale-[1.015] hover:shadow-sm transition-all duration-300 flex flex-col justify-between h-[155px]">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Drivers</span>
                <div className="text-2xl font-black text-blue-600 tracking-tight mt-1">
                  {kpis.active_drivers.value || 9} <span className="text-xs font-black uppercase text-blue-500 ml-0.5">On Road</span>
                </div>
              </div>
              <div className="bg-[#EEF2FE] text-blue-600 rounded-xl p-2 border border-blue-100/50 flex items-center justify-center shrink-0">
                <User size={16} className="stroke-[2.5]" />
              </div>
            </div>

            {/* Single Blue Progress Bar */}
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden mt-2">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: '97%' }} />
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between text-[9px] font-black text-slate-500 mt-1.5 pt-2.5 border-t border-slate-100/70">
              <span className="flex items-center gap-1.5 text-blue-600"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" /> 97% Rating</span>
              <span className="text-slate-400 font-bold">Rating this month</span>
            </div>
          </div>

          {/* Card 3: Available Vehicles */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:scale-[1.015] hover:shadow-sm transition-all duration-300 flex flex-col justify-between h-[155px]">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Available Vehicles</span>
                <div className="text-2xl font-black text-emerald-600 tracking-tight mt-1">
                  {kpis.fleet_available.value || 24} <span className="text-xs font-black uppercase text-emerald-500 ml-0.5">Available</span>
                </div>
              </div>
              <div className="bg-[#ECFDF5] text-[#10B981] rounded-xl p-2 border border-emerald-100/50 flex items-center justify-center shrink-0">
                <Car size={16} className="stroke-[2.5]" />
              </div>
            </div>

            {/* Green Progress Bar */}
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden mt-2">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${((kpis.fleet_available.value || 24) / (totalVehiclesCount || 24)) * 100}%` }} />
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between text-[9px] font-black text-slate-500 mt-1.5 pt-2.5 border-t border-slate-100/70">
              <span className="flex items-center gap-1.5 text-[#10B981]"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {kpis.fleet_available.value || 24} Active of {totalVehiclesCount || 24} Total</span>
              <span className="text-slate-400 font-bold">Utilization ratio</span>
            </div>
          </div>

          {/* Card 4: Vehicles under MP */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:scale-[1.015] hover:shadow-sm transition-all duration-300 flex flex-col justify-between h-[155px]">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Vehicles under MP</span>
                <div className="text-2xl font-black text-amber-600 tracking-tight mt-1">
                  {kpis.docs_expiring_soon.value || 3} <span className="text-xs font-black uppercase text-amber-500 ml-0.5">Under MP</span>
                </div>
              </div>
              <div className="bg-[#FFFBEB] text-[#D97706] rounded-xl p-2 border border-amber-100/50 flex items-center justify-center shrink-0">
                <Wrench size={16} className="stroke-[2.5]" />
              </div>
            </div>

            {/* Gold Progress Bar */}
            <div className="h-2 w-full rounded-full bg-slate-100 flex overflow-hidden mt-2">
              <div className="bg-red-500 h-full" style={{ width: '33%' }} title="Due soon" />
              <div className="bg-amber-500 h-full" style={{ width: '67%' }} title="Planned" />
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between text-[9px] font-black text-slate-500 mt-1.5 pt-2.5 border-t border-slate-100/70">
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Due: {kpis.docs_expiring_soon.value || 1}</span>
              <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Plan: 2</span>
              <span className="text-slate-400 font-bold">Maintenance state</span>
            </div>
          </div>

        </div>

        {/* ==========================================
            3. ACTION REQUIRED & 4. UPCOMING TRIPS
            ========================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* ACTION REQUIRED — HIGH PRIORITY (6 Columns) */}
          <Card className="lg:col-span-6 border-slate-200/60 shadow-sm rounded-xl bg-white flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
                  <span>Action Required</span>
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-400 mt-0.5">Critical operations alerts needing immediate checkout</CardDescription>
              </div>
              <span className="bg-red-50 text-red-700 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                {actionRequiredItems.length} Urgent
              </span>
            </CardHeader>
            <CardContent className="flex-1 p-0 divide-y divide-slate-100">
              {actionRequiredItems.map((item) => {
                let badgeColor = 'bg-slate-50 text-slate-700 border-slate-200';
                if (item.priority === 'Critical') badgeColor = 'bg-red-50 text-red-700 border-red-200/80';
                if (item.priority === 'High') badgeColor = 'bg-amber-50 text-amber-700 border-amber-200/80';
                if (item.priority === 'Medium') badgeColor = 'bg-yellow-50 text-yellow-700 border-yellow-200/80';

                return (
                  <div key={item.id} className="p-4 flex items-start gap-3.5 hover:bg-slate-50/50 transition-colors group">
                    <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                      item.priority === 'Critical' ? 'bg-red-500 animate-ping' : 
                      item.priority === 'High' ? 'bg-orange-500' : 'bg-amber-400'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-wide">{item.category}</span>
                        <Badge variant="outline" className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded-md ${badgeColor}`}>
                          {item.priority}
                        </Badge>
                        <span className="text-[9px] text-slate-400 font-mono ml-auto">{item.metadata}</span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 mt-1 truncate group-hover:text-[#E8450F] transition-colors">
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                    <button
                      onClick={item.onClick}
                      className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 rounded-md text-[10px] font-black transition-all shrink-0 hover:scale-[1.02] cursor-pointer align-self-center"
                    >
                      {item.actionLabel}
                    </button>
                  </div>
                );
              })}
            </CardContent>
            <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex justify-end">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/notifications')}
                className="text-[11px] font-bold text-[#E8450F] hover:text-[#C7380A] p-0 h-auto hover:bg-transparent"
              >
                <span>View all actions</span>
                <ChevronRight size={12} className="ml-0.5" />
              </Button>
            </div>
          </Card>

          {/* UPCOMING TRIPS (6 Columns) */}
          <Card className="lg:col-span-6 border-slate-200/60 shadow-sm rounded-xl bg-white flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <span>Upcoming Trips</span>
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-400 mt-0.5">Chronologically ordered next dispatches</CardDescription>
              </div>
              <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                {upcomingTripsList.length} Scheduled
              </span>
            </CardHeader>
            <CardContent className="flex-1 p-0 divide-y divide-slate-100 max-h-[352px] overflow-y-auto">
              {upcomingTripsList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center h-full">
                  <Clock size={32} className="text-slate-300 stroke-[1.5] mb-2" />
                  <p className="text-xs font-bold">No upcoming trips scheduled</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Click 'Create New Trip' to get started.</p>
                </div>
              ) : (
                upcomingTripsList.slice(0, 3).map((trip) => {
                  const countdownStr = getCountdown(trip.planned_start);
                  const isSoon = countdownStr.includes('m') || countdownStr.includes('h') && !countdownStr.includes('d');

                  return (
                    <div key={trip.id} className="p-4 hover:bg-slate-50/50 transition-colors flex flex-col gap-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black text-[#E8450F]">
                            {trip.ref_id || 'Draft'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">•</span>
                          <span className="text-[10px] text-slate-500 font-bold">
                            {trip.planned_start ? new Date(trip.planned_start).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '—'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">•</span>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {trip.planned_start ? new Date(trip.planned_start).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : '—'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* Countdown Badge */}
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border ${
                            isSoon 
                              ? 'bg-orange-50 text-orange-700 border-orange-200/80 animate-pulse' 
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                          }`}>
                            {countdownStr}
                          </span>
                          <Badge className="bg-indigo-50/50 text-indigo-700 border border-indigo-100 font-bold text-[9px] rounded px-1.5 py-0.2">
                            Scheduled
                          </Badge>
                        </div>
                      </div>

                      {/* Route Details */}
                      <div className="grid grid-cols-2 gap-4 bg-slate-50/50 p-2.5 rounded-lg border border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-[9px] uppercase font-bold text-slate-400">Pickup</span>
                          <span className="text-xs font-bold text-slate-800 truncate">{trip.stops?.[0]?.location_name || 'Riyadh Warehouse'}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] uppercase font-bold text-slate-400">Delivery</span>
                          <span className="text-xs font-bold text-slate-800 truncate">{trip.stops?.[trip.stops.length - 1]?.location_name || 'Jeddah Warehouse'}</span>
                        </div>
                      </div>

                      {/* Fleet Resources & Actions */}
                      <div className="flex items-center justify-between text-xs mt-0.5">
                        <div className="flex items-center gap-4 flex-wrap text-slate-500 font-semibold text-[11px]">
                          <span className="flex items-center gap-1">
                            <User size={12} className="text-slate-400" />
                            {trip.driver ? `${trip.driver.first_name} ${trip.driver.last_name.charAt(0)}.` : <span className="italic font-normal text-slate-400">Unassigned</span>}
                          </span>
                          <span className="flex items-center gap-1">
                            <Car size={12} className="text-slate-400" />
                            {trip.vehicle ? trip.vehicle.plate_number : <span className="italic font-normal text-slate-400">Unassigned</span>}
                          </span>
                          <span className="text-slate-400 font-normal">
                            ~{trip.planned_distance || 950} km
                          </span>
                        </div>
                        <button
                          onClick={() => navigate(`/trips/${trip.id}`)}
                          className="text-[10px] font-black text-[#E8450F] hover:text-[#C7380A] flex items-center gap-0.5"
                        >
                          <span>View Trip</span>
                          <ArrowRight size={11} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
            <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex justify-end">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/trips')}
                className="text-[11px] font-bold text-[#E8450F] hover:text-[#C7380A] p-0 h-auto hover:bg-transparent"
              >
                <span>View All Upcoming Trips</span>
                <ChevronRight size={12} className="ml-0.5" />
              </Button>
            </div>
          </Card>

        </div>

        {/* ==========================================
            5. DRIVER MESSAGES & 6. LABOR CHARGES
            ========================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

          {/* MESSAGES & UPDATES (WhatsApp Theme - 6 Columns) */}
          <Card className="lg:col-span-6 border-slate-200/60 shadow-md rounded-[24px] bg-[#efeae2] flex flex-col justify-between overflow-hidden h-[450px] relative">
            
            {activeChatDriverName ? (
              /* ==========================================
                 ACTIVE CHAT WINDOW (WhatsApp Layout)
                 ========================================== */
              <div className="flex flex-col h-full w-full bg-[#efeae2]">
                {/* Chat Header */}
                <div className="bg-[#008069] text-white px-4 py-3 flex items-center justify-between shadow-xs shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button 
                      onClick={() => { setActiveChatDriverName(null); }}
                      className="p-1 -ml-1 rounded-full hover:bg-white/10 transition-colors text-white cursor-pointer"
                    >
                      <ChevronLeft size={20} className="stroke-[2.5]" />
                    </button>
                    {/* Avatar */}
                    <div className="w-8 h-8 rounded-full bg-white/20 border border-white/10 flex items-center justify-center font-black text-xs shrink-0 select-none">
                      {activeChatDriverName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black truncate leading-tight">{activeChatDriverName}</h4>
                      <p className="text-[9px] text-[#86e2d5] font-bold leading-tight mt-0.5">
                        {isTyping ? 'typing...' : 'online'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3.5 text-white">
                    <button className="hover:text-slate-200 transition-colors cursor-pointer"><Video size={14} /></button>
                    <button className="hover:text-slate-200 transition-colors cursor-pointer"><Phone size={13} /></button>
                    <button className="hover:text-slate-200 transition-colors cursor-pointer"><MoreVertical size={14} /></button>
                  </div>
                </div>

                {/* Chat Messages Body (Wallpaper Doodle Background) */}
                <div 
                  className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 min-h-0"
                  style={{
                    backgroundColor: '#efeae2',
                    backgroundImage: 'radial-gradient(circle, #e5ddd5 1px, transparent 1px)',
                    backgroundSize: '16px 16px'
                  }}
                >
                  {messages
                    .filter(m => m.driverName === activeChatDriverName)
                    .slice()
                    .reverse()
                    .map((msg) => {
                      const isOperator = msg.sender === 'Operator';
                      return (
                        <div 
                          key={msg.id} 
                          className={`flex flex-col max-w-[80%] rounded-[18px] p-3 shadow-3xs text-xs relative leading-relaxed ${
                            isOperator 
                              ? 'bg-[#d9fdd3] text-slate-800 self-end rounded-tr-none' 
                              : 'bg-white text-slate-800 self-start rounded-tl-none'
                          }`}
                        >
                          <p className="font-medium pr-10">{msg.message}</p>
                          <div className="absolute bottom-1 right-2.5 flex items-center gap-1">
                            <span className="text-[8px] text-slate-400 font-bold select-none">{msg.time}</span>
                            {isOperator && (
                              <CheckCheck size={11} className="text-[#53bdeb] stroke-[2.5]" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  {isTyping && (
                    <div className="bg-white text-slate-800 self-start rounded-[18px] rounded-tl-none p-3 shadow-3xs text-xs max-w-[80%] italic font-medium text-slate-400 animate-pulse">
                      typing...
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input Footer */}
                <div className="bg-[#f0f2f5] p-2.5 flex items-center gap-2.5 border-t border-slate-200/60 shrink-0">
                  <button className="text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"><Smile size={18} /></button>
                  <button className="text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"><Paperclip size={16} /></button>
                  <input
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && chatInputText.trim()) {
                        handleSendChatMessage(chatInputText);
                      }
                    }}
                    placeholder="Type a message"
                    className="flex-1 text-xs bg-white rounded-full px-4 py-2 border-none focus:outline-none focus:ring-1 focus:ring-[#00a884] text-slate-805"
                  />
                  <button
                    onClick={() => {
                      if (chatInputText.trim()) {
                        handleSendChatMessage(chatInputText);
                      }
                    }}
                    disabled={!chatInputText.trim()}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-all shadow-3xs ${
                      chatInputText.trim() 
                        ? 'bg-[#00a884] hover:bg-[#008f72] active:scale-95 cursor-pointer' 
                        : 'bg-slate-350 cursor-not-allowed'
                    }`}
                  >
                    <Send size={12} className="ml-0.5" />
                  </button>
                </div>
              </div>
            ) : (
              /* ==========================================
                 WHATSAPP HOME (Chats / Updates / Calls)
                 ========================================== */
              <div className="flex flex-col h-full w-full bg-white relative">
                {/* Header Teal Panel */}
                <div className="bg-[#008069] text-white pt-4 px-4 pb-2.5 flex flex-col gap-3 shadow-xs shrink-0 select-none">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold tracking-wide">Driver live dispatch chat</span>
                    <div className="flex items-center gap-4 text-white">
                      <Camera size={15} className="cursor-pointer" />
                      <button 
                        onClick={() => setIsSendMessageOpen(true)}
                        className="hover:text-slate-200 transition-colors cursor-pointer"
                        title="Start New Chat"
                      >
                        <MessageSquarePlus size={15} />
                      </button>
                      <MoreVertical size={15} className="cursor-pointer" />
                    </div>
                  </div>

                  {/* Active Tabs Nav */}
                  <div className="flex justify-around text-[10px] font-black uppercase tracking-wider text-[#a5d2ce] mt-1.5 border-b border-white/10">
                    <button
                      onClick={() => setActiveTab('chats')}
                      className={`flex-1 text-center pb-2 transition-all ${
                        activeTab === 'chats' ? 'text-white border-b-[3px] border-white' : 'hover:text-white'
                      }`}
                    >
                      Chats
                    </button>
                    <button
                      onClick={() => setActiveTab('updates')}
                      className={`flex-1 text-center pb-2 transition-all ${
                        activeTab === 'updates' ? 'text-white border-b-[3px] border-white' : 'hover:text-white'
                      }`}
                    >
                      Updates
                    </button>
                    <button
                      onClick={() => setActiveTab('calls')}
                      className={`flex-1 text-center pb-2 transition-all ${
                        activeTab === 'calls' ? 'text-white border-b-[3px] border-white' : 'hover:text-white'
                      }`}
                    >
                      Calls
                    </button>
                  </div>
                </div>

                {/* Tab Contents */}
                {activeTab === 'chats' && (
                  <div className="flex-1 flex flex-col min-h-0 bg-white">
                    {/* Search chats */}
                    <div className="p-2 bg-slate-50 border-b border-slate-100 flex items-center gap-2 shrink-0">
                      <div className="relative w-full">
                        <Search size={12} className="absolute left-3 top-2.5 text-slate-450" />
                        <input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search or start new chat"
                          className="w-full text-[11px] bg-white border border-slate-200 focus:border-slate-355 rounded-full pl-8 pr-4 py-2 outline-none text-slate-750 placeholder-slate-450"
                        />
                      </div>
                    </div>

                    {/* Chat Rows */}
                    <div className="flex-1 overflow-y-auto divide-y divide-slate-100 min-h-0">
                      {chatGroups.length === 0 ? (
                        <div className="p-8 text-center text-slate-450 flex flex-col items-center justify-center h-full">
                          <MessageSquare size={32} className="text-slate-200 stroke-[1.5] mb-1.5" />
                          <p className="text-xs font-bold">No active chats found</p>
                        </div>
                      ) : (
                        chatGroups.map((group) => {
                          const isOperator = group.latestMessage.sender === 'Operator';
                          return (
                            <div 
                              key={group.driverName}
                              onClick={() => openChatForDriver(group.driverName)}
                              className="p-3.5 hover:bg-slate-50/70 transition-all flex items-start gap-3 cursor-pointer group"
                            >
                              {/* Avatar with unread indicator ring */}
                              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shrink-0 select-none border-2 ${
                                group.unreadCount > 0 
                                  ? 'border-[#25D366] bg-emerald-50 text-[#008069]' 
                                  : 'border-slate-205 bg-slate-100 text-slate-600 group-hover:bg-[#008069] group-hover:text-white group-hover:border-[#008069] transition-all'
                              }`}>
                                {group.driverName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-extrabold text-slate-900 truncate">{group.driverName}</span>
                                  <span className={`text-[9px] font-medium ${group.unreadCount > 0 ? 'text-[#25D366] font-black' : 'text-slate-405'}`}>
                                    {group.latestMessage.time}
                                  </span>
                                </div>

                                <div className="flex items-center justify-between mt-1 text-[11px]">
                                  <div className="text-slate-500 font-medium truncate flex items-center gap-1 min-w-0 flex-1">
                                    {isOperator && (
                                      <CheckCheck size={11} className="text-[#53bdeb] stroke-[2.5] shrink-0" />
                                    )}
                                    <span className="truncate text-slate-550">{group.latestMessage.message}</span>
                                  </div>
                                  {group.unreadCount > 0 && (
                                    <span className="bg-[#25D366] text-white text-[8px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center shrink-0 shadow-3xs animate-bounce">
                                      {group.unreadCount}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Floating Action Button */}
                    <button
                      onClick={() => setIsSendMessageOpen(true)}
                      className="absolute bottom-4 right-4 bg-[#008069] hover:bg-[#006e5a] text-white w-11 h-11 rounded-full flex items-center justify-center shadow-md transition-all active:scale-[0.95] cursor-pointer hover:rotate-6 z-10"
                      title="New Chat"
                    >
                      <MessageSquarePlus size={18} />
                    </button>
                  </div>
                )}

                {activeTab === 'updates' && (
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-white min-h-0">
                    <div className="flex items-center gap-3.5 pb-2 border-b border-slate-100">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-black text-slate-500 text-xs border-2 border-slate-200">
                          ME
                        </div>
                        <span className="absolute bottom-0 right-0 bg-[#00a884] border-2 border-white text-white text-[8px] w-4.5 h-4.5 rounded-full flex items-center justify-center font-black select-none">+</span>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">My Status</h4>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">Tap to add status update</p>
                      </div>
                    </div>

                    <div>
                      <h5 className="text-[9px] font-extrabold text-[#008069] uppercase tracking-wider mb-3">Recent Updates</h5>
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3.5 cursor-pointer hover:bg-slate-50/50 p-1.5 rounded-xl transition-all" onClick={() => openChatForDriver('Mohammed Faizan')}>
                          <div className="w-10 h-10 rounded-full border-2 border-emerald-500 bg-emerald-50 text-[#008069] flex items-center justify-center font-black text-xs shrink-0">
                            MF
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-850">Mohammed Faizan</h4>
                            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Tire pressure checklist completed • Today, 10:42 AM</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3.5 cursor-pointer hover:bg-slate-50/50 p-1.5 rounded-xl transition-all" onClick={() => openChatForDriver('Umar Farooq')}>
                          <div className="w-10 h-10 rounded-full border-2 border-emerald-500 bg-emerald-50 text-[#008069] flex items-center justify-center font-black text-xs shrink-0">
                            UF
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-855">Umar Farooq</h4>
                            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Arrived at stop 1: Riyadh Warehouse • Today, 9:15 AM</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3.5 cursor-pointer hover:bg-slate-50/50 p-1.5 rounded-xl transition-all" onClick={() => openChatForDriver('Ali Al-Harbi')}>
                          <div className="w-10 h-10 rounded-full border-2 border-slate-300 bg-slate-100 text-slate-650 flex items-center justify-center font-black text-xs shrink-0">
                            AA
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-855">Ali Al-Harbi</h4>
                            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Break stop complete near Qassim road • Yesterday, 11:20 PM</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'calls' && (
                  <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-white min-h-0">
                    <h5 className="text-[9px] font-extrabold text-[#008069] uppercase tracking-wider mb-1">Recent check-in call logs</h5>
                    <div className="flex flex-col gap-3.5 divide-y divide-slate-50">
                      
                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-3.5">
                          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xs select-none">MF</div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">Mohammed Faizan</h4>
                            <p className="text-[10px] text-emerald-600 font-bold mt-0.5">Incoming Call • Today, 11:32 AM</p>
                          </div>
                        </div>
                        <button className="p-2 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"><Phone size={14} /></button>
                      </div>

                      <div className="flex items-center justify-between pt-2.5">
                        <div className="flex items-center gap-3.5">
                          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xs select-none">UF</div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-800">Umar Farooq</h4>
                            <p className="text-[10px] text-slate-450 font-medium mt-0.5">Outgoing Video check • Yesterday, 4:18 PM</p>
                          </div>
                        </div>
                        <button className="p-2 rounded-full hover:bg-slate-100 text-slate-550 cursor-pointer"><Video size={14} /></button>
                      </div>

                      <div className="flex items-center justify-between pt-2.5">
                        <div className="flex items-center gap-3.5">
                          <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-black text-xs select-none">AA</div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-805">Ali Al-Harbi</h4>
                            <p className="text-[10px] text-rose-500 font-bold mt-0.5">Missed Voice check • Aug 9, 2:40 PM</p>
                          </div>
                        </div>
                        <button className="p-2 rounded-full hover:bg-slate-100 text-slate-555 cursor-pointer"><Phone size={14} /></button>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* LABOR CHARGES (6 Columns) */}
          <Card className="lg:col-span-6 border-slate-200/60 shadow-sm rounded-xl bg-white flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <BadgePercent className="w-4 h-4 text-orange-500" />
                  <span>Labor Charges Ledger</span>
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-400 mt-0.5">Tracking B2B customer loading/unloading driver compensation</CardDescription>
              </div>
              <span className="bg-orange-50 text-orange-700 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                SAR {pendingLaborAmount} Pending
              </span>
            </CardHeader>
            <CardContent className="flex-1 p-0 divide-y divide-slate-100 flex flex-col justify-between">
              
              {/* Summary Stats Row */}
              <div className="p-4 bg-slate-50/50 grid grid-cols-3 gap-3 border-b border-slate-100 text-center shrink-0">
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-extrabold block">This Month</span>
                  <span className="text-base font-black text-slate-900 mt-0.5 block">SAR 8,420</span>
                </div>
                <div className="border-x border-slate-200/80 px-2">
                  <span className="text-[9px] text-slate-400 uppercase font-extrabold block">Pending</span>
                  <span className="text-base font-black text-orange-600 mt-0.5 block">SAR {pendingLaborAmount || '1,240'}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 uppercase font-extrabold block">Paid</span>
                  <span className="text-base font-black text-slate-800 mt-0.5 block">SAR {paidLaborAmount || '7,180'}</span>
                </div>
              </div>

              {/* Recent Entries */}
              <div className="flex-1 divide-y divide-slate-50 overflow-y-auto max-h-[220px]">
                
                {/* Dynamically list pending labor entries from unsettled trips */}
                {unsettledTrips.slice(0, 2).map((t) => (
                  <div key={t.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50/30 transition-colors">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-900">{t.driver ? `${t.driver.first_name} ${t.driver.last_name}` : 'Unassigned'}</span>
                        <span className="text-[9px] text-slate-400 font-mono">({t.ref_id || 'TRP-LBR'})</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                        {t.customer?.name} • Loading/Unloading assistance
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-extrabold text-slate-900 block">SAR {t.waiting_labor_charges || 350}</span>
                      <span className="text-[8px] uppercase font-black text-orange-500 bg-orange-50 px-1 rounded-sm mt-0.5 inline-block">Pending</span>
                    </div>
                  </div>
                ))}

                {/* Constant Paid Fallback Logs to populate */}
                <div className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50/30 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-slate-900">Umar Farooq</span>
                      <span className="text-[9px] text-slate-400 font-mono">(TRP-0028)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                      BinZagur Distribution Co. • Loading assistance
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-extrabold text-slate-900 block">SAR 280</span>
                    <span className="text-[8px] uppercase font-black text-emerald-600 bg-emerald-50 px-1 rounded-sm mt-0.5 inline-block">Paid</span>
                  </div>
                </div>

                <div className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50/30 transition-colors">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-slate-900">Ali Al-Harbi</span>
                      <span className="text-[9px] text-slate-400 font-mono">(TRP-0026)</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
                      Asir Cement • Extra Stop loading charges
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-extrabold text-slate-900 block">SAR 400</span>
                    <span className="text-[8px] uppercase font-black text-emerald-600 bg-emerald-50 px-1 rounded-sm mt-0.5 inline-block">Paid</span>
                  </div>
                </div>

              </div>
            </CardContent>
            <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex justify-end">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/invoices')}
                className="text-[11px] font-bold text-[#E8450F] hover:text-[#C7380A] p-0 h-auto hover:bg-transparent"
              >
                <span>View Labor Charges</span>
                <ChevronRight size={12} className="ml-0.5" />
              </Button>
            </div>
          </Card>

        </div>

        {/* ==========================================
            7. TOP CUSTOMERS & 10. ACTIVE TRIPS
            ========================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* TOP CUSTOMERS (5 Columns) */}
          <Card className="lg:col-span-5 border-slate-200/60 shadow-sm rounded-xl bg-white flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-[#E8450F]" />
                  <span>Top Customers</span>
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-400 mt-0.5">Major B2B revenue contributors</CardDescription>
              </div>
              <select 
                value={customerPeriod} 
                onChange={(e) => setCustomerPeriod(e.target.value as any)}
                className="text-[10px] font-bold border border-slate-200 rounded px-2 py-1 text-slate-700 bg-white cursor-pointer hover:border-slate-350 focus:outline-none"
              >
                <option value="month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </CardHeader>
            <CardContent className="flex-1 p-4 flex flex-col justify-center gap-4">
              {topCustomersRaw.map((cust, idx) => {
                const percentage = totalCustomerRevenue > 0 
                  ? ((cust.value / totalCustomerRevenue) * 100).toFixed(1)
                  : '25.0';
                
                // Colors for customer rank badges
                const colors = ['bg-orange-50 text-[#E8450F]', 'bg-indigo-50 text-indigo-700', 'bg-blue-50 text-blue-700', 'bg-slate-50 text-slate-600'];

                return (
                  <div key={cust.name} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${colors[idx] || 'bg-slate-100 text-slate-700'}`}>
                          {idx + 1}
                        </span>
                        <span className="font-bold text-slate-800 truncate">{cust.name}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-slate-950 block">SAR {cust.value.toLocaleString()}</span>
                        <span className="text-[9px] text-slate-400 font-semibold">{percentage}% contribution</span>
                      </div>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${idx === 0 ? 'bg-[#E8450F]' : 'bg-slate-650'}`} 
                        style={{ width: `${percentage}%` }} 
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
            <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex justify-end">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/customers')}
                className="text-[11px] font-bold text-[#E8450F] hover:text-[#C7380A] p-0 h-auto hover:bg-transparent"
              >
                <span>View Customers</span>
                <ChevronRight size={12} className="ml-0.5" />
              </Button>
            </div>
          </Card>

          {/* ACTIVE TRIPS (7 Columns) */}
          <Card className="lg:col-span-7 border-slate-200/60 shadow-sm rounded-xl bg-white flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-blue-500" />
                  <span>Active Transit Status</span>
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-400 mt-0.5">Real-time dispatch locations & progress tracking</CardDescription>
              </div>
              <span className="bg-blue-50 text-blue-700 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                {activeTripsList.length || 1} Running
              </span>
            </CardHeader>
            <CardContent className="flex-1 p-0 divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
              
              {(activeTripsList.length > 0 ? activeTripsList.slice(0, 2) : [
                {
                  id: 'trp-active-1',
                  ref_id: 'TRP-8921',
                  status: 'InTransit' as TripStatus,
                  customer: { name: 'BinZagur Distribution Co.' },
                  driver: { first_name: 'Mohammed', last_name: 'Faizan' },
                  vehicle: { plate_number: 'VRA-3358' },
                  stops: [
                    { location_name: 'Riyadh Warehouse' },
                    { location_name: 'Jeddah Warehouse' }
                  ],
                  planned_distance: 950
                }
              ]).map((trip, idx) => {
                const stopsCount = trip.stops?.length || 2;
                const pickupLoc = trip.stops?.[0]?.location_name || 'Riyadh';
                const deliveryLoc = trip.stops?.[stopsCount - 1]?.location_name || 'Jeddah';
                
                // Computed values
                const progressPct = idx === 0 ? 44 : 78;
                const distanceRemaining = idx === 0 ? '532 km' : '209 km';
                const etaTime = idx === 0 ? '6h 7m' : '2h 15m';

                return (
                  <div key={trip.id} className="p-4 hover:bg-slate-50/30 transition-colors flex flex-col gap-3">
                    
                    {/* Header line */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-[#E8450F]">{trip.ref_id || 'TRP-TEMP'}</span>
                        <span className="text-slate-350">•</span>
                        <span className="font-bold text-slate-800 truncate max-w-[150px]">{trip.customer?.name}</span>
                      </div>
                      <StatusBadge status={trip.status} />
                    </div>

                    {/* Route Transit Line */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span>{pickupLoc}</span>
                        <div className="flex-1 border-t border-dashed border-slate-300 mx-3 relative flex items-center justify-center">
                          <Truck size={12} className="text-blue-500 absolute -top-1.5 bg-slate-50 px-0.5" style={{ left: `${progressPct}%` }} />
                        </div>
                        <span>{deliveryLoc}</span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] text-slate-400 mt-2 font-bold uppercase">
                        <span>Progress: {progressPct}%</span>
                        <span>{distanceRemaining} left</span>
                      </div>
                    </div>

                    {/* Driver, Vehicle, ETA & Context controls */}
                    <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                      <div className="flex items-center gap-3.5 text-[11px] text-slate-500 font-semibold">
                        <span className="flex items-center gap-1">
                          <User size={12} className="text-slate-400" />
                          <span>{trip.driver ? `${trip.driver.first_name}` : 'Unassigned'}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Car size={12} className="text-slate-400" />
                          <span>{trip.vehicle ? trip.vehicle.plate_number : '—'}</span>
                        </span>
                        <span className="text-slate-400 font-medium">ETA: <b className="text-slate-800 font-bold">{etaTime}</b></span>
                      </div>

                      <div className="flex items-center gap-2 ml-auto">
                        <button
                          onClick={() => openContactDriver(trip.driver?.first_name || 'Mohammed')}
                          className="px-2.5 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-md transition-colors"
                        >
                          Contact Driver
                        </button>
                        <button
                          onClick={() => navigate(`/trips/${trip.id}`)}
                          className="px-2.5 py-1 text-[10px] font-bold bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 rounded-md shadow-2xs transition-colors"
                        >
                          View Details
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}

            </CardContent>
            <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex justify-end">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/trips')}
                className="text-[11px] font-bold text-[#E8450F] hover:text-[#C7380A] p-0 h-auto hover:bg-transparent"
              >
                <span>View Full Dispatch Map</span>
                <ChevronRight size={12} className="ml-0.5" />
              </Button>
            </div>
          </Card>

        </div>

        {/* ==========================================
            8. REVENUE TREND & 9. VEHICLE UTILIZATION
            ========================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* REVENUE TREND (6 Columns) */}
          <Card className="lg:col-span-6 border-slate-200/60 shadow-sm rounded-xl bg-white flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Revenue Trend</CardTitle>
                <CardDescription className="text-[10px] text-slate-400 mt-0.5">Monthly completed freight payments (SAR)</CardDescription>
              </div>
              <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50 shrink-0">
                {(['7d', '30d', '3m', '6m', '12m'] as const).map((period) => (
                  <button
                    key={period}
                    onClick={() => setRevenuePeriod(period)}
                    className={`text-[9px] font-extrabold px-2 py-1 rounded-md transition-all cursor-pointer ${
                      revenuePeriod === period 
                        ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/50' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {period.toUpperCase()}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-[220px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                  data={summary?.monthly_revenue_chart || [
                    { month: 'Mar', revenue: 35000 },
                    { month: 'Apr', revenue: 38200 },
                    { month: 'May', revenue: 42000 },
                    { month: 'Jun', revenue: 40500 },
                    { month: 'Jul', revenue: 41900 },
                    { month: 'Aug', revenue: 48200 }
                  ]} 
                  margin={{ top: 10, right: 15, left: -10, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E8450F" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#E8450F" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 600 }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 600 }} 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(val) => `SAR ${val / 1000}K`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: 8, fontSize: 10, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', fontFamily: 'inherit' }} 
                    formatter={(value: any) => [`SAR ${value.toLocaleString()}`, 'Revenue']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="#E8450F" 
                    strokeWidth={2.5} 
                    fill="url(#revenueGrad)" 
                    name="Revenue" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* VEHICLE UTILIZATION (6 Columns) */}
          <Card className="lg:col-span-6 border-slate-200/60 shadow-sm rounded-xl bg-white flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Vehicle Utilization</CardTitle>
                <CardDescription className="text-[10px] text-slate-400 mt-0.5">Efficiency percentage & load distribution</CardDescription>
              </div>
              <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50 shrink-0">
                {(['top', 'least', 'all'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setUtilizationFilter(filter)}
                    className={`text-[9px] font-extrabold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      utilizationFilter === filter 
                        ? 'bg-white text-slate-900 shadow-2xs border border-slate-200/50' 
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {filter === 'top' ? 'Top Used' : filter === 'least' ? 'Least Used' : 'All'}
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-4 flex flex-col justify-between">
              
              {/* Summary Stats Grid */}
              <div className="grid grid-cols-4 gap-2 text-center bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs shrink-0 mb-4">
                <div>
                  <span className="text-[8px] text-slate-400 uppercase font-black block">Fleet Util</span>
                  <span className="text-sm font-black text-slate-900 mt-0.5 block">76%</span>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase font-black block">On Trip</span>
                  <span className="text-sm font-black text-blue-600 mt-0.5 block">{kpis.fleet_on_trip.value || 18}</span>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase font-black block">Available</span>
                  <span className="text-sm font-black text-emerald-600 mt-0.5 block">{kpis.fleet_available.value || 8}</span>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase font-black block">Maint</span>
                  <span className="text-sm font-black text-amber-600 mt-0.5 block">3</span>
                </div>
              </div>

              {/* Bar List */}
              <div className="flex-1 flex flex-col justify-center gap-3">
                {sortedUtilization.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 font-bold text-xs">No vehicle performance logs found</div>
                ) : (
                  sortedUtilization.map((veh) => (
                    <div key={veh.id || veh.plateNumber} className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-extrabold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">{veh.plateNumber}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{veh.tripsCompleted} trips Completed</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold">
                          <b className="text-slate-800 font-black">{veh.utilization}%</b> utilization • ~{veh.distanceTraveled.toLocaleString()} km
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            veh.utilization >= 80 ? 'bg-emerald-500' :
                            veh.utilization >= 50 ? 'bg-blue-500' : 'bg-amber-400'
                          }`}
                          style={{ width: `${veh.utilization}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>

            </CardContent>
          </Card>

        </div>

        {/* ==========================================
            11. RECENT TRIPS LEDGER (Bottom)
            ========================================== */}
        <div className="w-full flex flex-col shrink-0">
          <DataTable
            title={
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>Recent Trips Ledger</span>
              </span>
            }
            columns={[
              {
                header: 'Trip ID',
                accessor: (t: Trip) => (
                  <span className="font-mono text-xs font-extrabold text-[#E8450F]">{t.ref_id || 'Draft'}</span>
                ),
              },
              {
                header: 'Customer',
                accessor: (t: Trip) => (
                  <span className="text-xs font-bold text-slate-800">{t.customer?.name || '—'}</span>
                ),
              },
              {
                header: 'Route',
                accessor: (t: Trip) => {
                  const pickup = t.stops?.[0]?.location_name || '—';
                  const dropoff = t.stops?.[t.stops.length - 1]?.location_name || '—';
                  return (
                    <span className="text-xs font-semibold text-slate-650">{pickup} → {dropoff}</span>
                  );
                }
              },
              {
                header: 'Driver',
                accessor: (t: Trip) => (
                  <span className="text-xs font-bold text-slate-700">
                    {t.driver ? `${t.driver.first_name} ${t.driver.last_name}` : <span className="italic text-slate-400 font-normal">Unassigned</span>}
                  </span>
                ),
              },
              {
                header: 'Vehicle',
                accessor: (t: Trip) => (
                  <span className="text-xs font-mono font-extrabold text-slate-500">
                    {t.vehicle?.plate_number ? t.vehicle.plate_number : <span className="italic text-slate-450 font-normal">—</span>}
                  </span>
                ),
              },
              {
                header: 'Status',
                accessor: (t: Trip) => <StatusBadge status={t.status} />,
              },
              {
                header: 'Start Date',
                accessor: (t: Trip) => (
                  <span className="text-xs font-semibold text-slate-450 font-mono">
                    {t.planned_start ? new Date(t.planned_start).toLocaleDateString() : '—'}
                  </span>
                ),
              },
              {
                header: 'Revenue',
                accessor: (t: Trip) => (
                  <span className="text-xs font-black text-slate-900">
                    {t.billing_amount ? `SAR ${t.billing_amount.toLocaleString()}` : '—'}
                  </span>
                )
              }
            ]}
            data={recentTrips}
            compact={true}
            enableSelection={false}
            isLoading={allTripsLoading}
            actionsElement={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/trips')}
                className="text-xs text-[#E8450F] font-bold gap-1 hover:text-[#C7380A] h-8"
              >
                <span>View All Trips</span>
                <ArrowRight size={13} />
              </Button>
            }
            onRowClick={(t) => navigate(`/trips/${t.id}`)}
          />
        </div>

        {/* Post-Trip Settlement Modal (Pending waiting time/labor review workflow) */}
        <PostTripSettlementModal
          isOpen={!!selectedSettlementTrip}
          trip={selectedSettlementTrip}
          onClose={() => setSelectedSettlementTrip(null)}
          onSuccess={() => {
            refetchSummary();
            refetchUnsettled();
            showToast('Trip waiting time settled successfully', 'success');
          }}
        />

        {/* ==========================================
            Interactive "Send Message" Dialog Modal
            ========================================== */}
        {isSendMessageOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in scale-in-95 duration-200">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-900">Send Mobile Dispatch Message</h3>
                <button 
                  onClick={() => setIsSendMessageOpen(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-sm cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleSendMessageSubmit} className="p-5 flex flex-col gap-4">
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Select Driver</label>
                  <select
                    value={selectedDriverForMessage}
                    onChange={(e) => setSelectedDriverForMessage(e.target.value)}
                    required
                    className="w-full text-xs font-bold border border-slate-200 hover:border-slate-350 bg-white rounded-lg px-3 py-2 text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="">-- Choose active driver --</option>
                    {driversList.map(driver => (
                      <option key={driver.id} value={driver.id}>
                        {driver.first_name} {driver.last_name} ({driver.phone_primary})
                      </option>
                    ))}
                    {driversList.length === 0 && (
                      <>
                        <option value="umar">Umar Farooq</option>
                        <option value="faizan">Mohammed Faizan</option>
                        <option value="ali">Ali Al-Harbi</option>
                      </>
                    )}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-450 tracking-wider">Message Content</label>
                  <textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Type directions, dispatch routes, or check-ins to driver..."
                    required
                    rows={4}
                    className="w-full text-xs border border-slate-200 focus:border-slate-350 focus:outline-none rounded-lg p-3 text-slate-800"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setIsSendMessageOpen(false)}
                    className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#E8450F] hover:bg-[#C7380A] text-white text-xs font-extrabold rounded-lg transition-all shadow-2xs cursor-pointer active:scale-98"
                  >
                    Dispatch Message
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

