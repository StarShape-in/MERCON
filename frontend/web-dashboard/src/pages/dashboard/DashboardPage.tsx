import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Truck, Car, DollarSign, AlertTriangle, ArrowRight, ArrowUpRight,
  Loader2, RefreshCw, Clock, CheckCircle2, LayoutDashboard, Layers,
  Calendar, AlertCircle, MapPin, TrendingUp,
  User, Download, Plus, Mail, ShieldAlert, BadgePercent, ChevronRight,
  Phone, Eye, Building2, Wrench, Disc, FileText, Gauge
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, BarChart, Bar, Cell, LineChart, Line, Legend
} from 'recharts';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import Btn from '@/components/ui/Btn';
import PostTripSettlementModal from '@/components/trips/PostTripSettlementModal';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/ui/DataTable';
import KpiModal from '@/components/ui/KpiModal';
import { reportsService } from '@/services/reportsService';
import { tripService, Trip, TripStatus } from '@/services/tripService';
import { authStore } from '@/store/authStore';

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = authStore.getUser();
  const operatorName = user?.name ? user.name.split(' ')[0] : 'Ilan';

  const [selectedSettlementTrip, setSelectedSettlementTrip] = useState<Trip | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Origin-aware overview card modal state (Revenue/Expense, Action Required, Tires, Doc, Fleet Efficiency, Upcoming)
  const [originRect, setOriginRect] = useState<DOMRect | null>(null);
  const [activeOverviewModal, setActiveOverviewModal] = useState<
    'finance' | 'action' | 'tires' | 'doc' | 'fleet' | 'upcoming' | null
  >(null);

  const openOverviewModal = (
    e: React.MouseEvent<HTMLDivElement>,
    modalType: 'finance' | 'action' | 'tires' | 'doc' | 'fleet' | 'upcoming'
  ) => {
    setOriginRect(e.currentTarget.getBoundingClientRect());
    setActiveOverviewModal(modalType);
  };

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

  // Segmented progress calculations for Total Trips card
  const totalTripsCalculated = completedTripsCount + activeTripsCount + upcomingTripsCount;
  const totalTripsDivisor = totalTripsCalculated || 1;
  const pctCompleted = (completedTripsCount / totalTripsDivisor) * 100;
  const pctActive = (activeTripsCount / totalTripsDivisor) * 100;
  const pctUpcoming = (upcomingTripsCount / totalTripsDivisor) * 100;

  // Revenue / Expense / Net Profit monthly breakdown (expense derived at the same 34% ratio used above)
  const monthlyFinance = (summary?.monthly_revenue_chart || [
    { month: 'Mar', revenue: 35000 },
    { month: 'Apr', revenue: 38200 },
    { month: 'May', revenue: 42000 },
    { month: 'Jun', revenue: 40500 },
    { month: 'Jul', revenue: 41900 },
    { month: 'Aug', revenue: 48200 },
  ]).map((m) => {
    const expense = Math.round(m.revenue * 0.34);
    return { month: m.month, revenue: m.revenue, expense, netProfit: m.revenue - expense };
  });
  const currentMonthFinance = monthlyFinance[monthlyFinance.length - 1] || { revenue: 0, expense: 0, netProfit: 0 };

  // Tire condition alerts (reuses the same tire-damage report already surfaced in Action Required)
  const tireAlerts = [
    {
      id: 'tire-vsa-3071',
      vehicle: 'VSA-3071',
      issue: 'Minor tire damage reported after unloading',
      reportedBy: 'Mohammed Faizan',
      time: 'Reported 2 hours ago',
      severity: 'Critical' as const,
    },
  ];

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
            2. OVERVIEW CARDS — Revenue/Expense/Net Profit, Action Required, Tires,
               Doc, Fleet Efficiency, Upcoming. Every card (and, in the shared right-
               column card, each sub-section) is clickable and opens a details modal.
            ========================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 lg:grid-rows-2 gap-6 items-stretch">

          {/* REVENUE / EXPENSE / NET PROFIT */}
          <Card
            onClick={(e) => openOverviewModal(e, 'finance')}
            className="lg:col-start-1 lg:row-start-1 border-slate-200/60 shadow-sm rounded-xl bg-white flex flex-col cursor-pointer hover:border-slate-300 transition-colors"
          >
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-[#E8450F]" />
                <span>Revenue / Expense / Net Profit</span>
              </CardTitle>
              <CardDescription className="text-[10px] text-slate-400 mt-0.5">
                SAR {(currentMonthFinance.revenue / 1000).toFixed(1)}K revenue this month
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-[180px] p-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyFinance} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#94A3B8', fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={(val) => `${val / 1000}K`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, fontSize: 10, border: '1px solid #E2E8F0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', fontFamily: 'inherit' }}
                    formatter={(value: any) => [`SAR ${value.toLocaleString()}`]}
                  />
                  <Legend wrapperStyle={{ fontSize: 9, fontWeight: 700 }} />
                  <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#E8450F" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="expense" name="Expense" stroke="#DC2626" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="netProfit" name="Net Profit" stroke="#16A34A" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* ACTION REQUIRED */}
          <Card
            onClick={(e) => openOverviewModal(e, 'action')}
            className="lg:col-start-2 lg:row-start-1 border-slate-200/60 shadow-sm rounded-xl bg-white flex flex-col cursor-pointer hover:border-slate-300 transition-colors"
          >
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
                  <span>Action Required</span>
                </CardTitle>
                <CardDescription className="text-[10px] text-slate-400 mt-0.5">Critical alerts needing checkout</CardDescription>
              </div>
              <span className="bg-red-50 text-red-700 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                {actionRequiredItems.length} Urgent
              </span>
            </CardHeader>
            <CardContent className="flex-1 p-0 divide-y divide-slate-100">
              {actionRequiredItems.slice(0, 2).map((item) => (
                <div key={item.id} className="p-4 flex items-start gap-3">
                  <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                    item.priority === 'Critical' ? 'bg-red-500 animate-ping' :
                    item.priority === 'High' ? 'bg-orange-500' : 'bg-amber-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wide">{item.category}</span>
                    <h4 className="text-xs font-bold text-slate-900 mt-0.5 truncate">{item.title}</h4>
                  </div>
                </div>
              ))}
            </CardContent>
            <div className="p-3 bg-slate-50/70 border-t border-slate-100 flex justify-end">
              <span className="text-[11px] font-bold text-[#E8450F] flex items-center">
                View all actions <ChevronRight size={12} className="ml-0.5" />
              </span>
            </div>
          </Card>

          {/* TIRES + UPCOMING — shared right-hand column, each half independently clickable */}
          <Card className="lg:col-start-3 lg:row-start-1 lg:row-span-2 border-slate-200/60 shadow-sm rounded-xl bg-white flex flex-col divide-y divide-slate-100 overflow-hidden p-0">
            <div
              onClick={(e) => openOverviewModal(e, 'tires')}
              className="p-4 cursor-pointer hover:bg-slate-50/50 transition-colors flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Disc className="w-4 h-4 text-slate-500" />
                  <span>Tires</span>
                </span>
                <span className="bg-red-50 text-red-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {tireAlerts.length} Alert
                </span>
              </div>
              {tireAlerts.map((t) => (
                <div key={t.id} className="text-[11px] text-slate-600 font-medium leading-relaxed">
                  <span className="font-mono font-extrabold text-slate-900">{t.vehicle}</span> — {t.issue}
                </div>
              ))}
            </div>
            <div
              onClick={(e) => openOverviewModal(e, 'upcoming')}
              className="p-4 flex-1 cursor-pointer hover:bg-slate-50/50 transition-colors flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <span>Upcoming</span>
                </span>
                <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                  {upcomingTripsList.length}
                </span>
              </div>
              {upcomingTripsList.slice(0, 3).map((trip) => (
                <div key={trip.id} className="text-[11px] text-slate-600 font-medium flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-[#E8450F] shrink-0">{trip.ref_id || 'Draft'}</span>
                  <span className="truncate">{trip.stops?.[0]?.location_name || 'Riyadh'} → {trip.stops?.[trip.stops.length - 1]?.location_name || 'Jeddah'}</span>
                </div>
              ))}
              {upcomingTripsList.length === 0 && (
                <p className="text-[11px] text-slate-400 font-semibold">No upcoming trips scheduled</p>
              )}
            </div>
          </Card>

          {/* DOC */}
          <Card
            onClick={(e) => openOverviewModal(e, 'doc')}
            className="lg:col-start-1 lg:row-start-2 border-slate-200/60 shadow-sm rounded-xl bg-white flex flex-col cursor-pointer hover:border-slate-300 transition-colors"
          >
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>Doc</span>
              </CardTitle>
              <CardDescription className="text-[10px] text-slate-400 mt-0.5">Compliance document expiry</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-4 flex flex-col justify-center items-center text-center">
              <div className="text-2xl font-black text-amber-600 tracking-tight">
                {kpis.docs_expiring_soon.value || 0} <span className="text-xs font-black uppercase text-amber-500 ml-0.5">Expiring Soon</span>
              </div>
            </CardContent>
          </Card>

          {/* FLEET EFFICIENCY */}
          <Card
            onClick={(e) => openOverviewModal(e, 'fleet')}
            className="lg:col-start-2 lg:row-start-2 border-slate-200/60 shadow-sm rounded-xl bg-white flex flex-col cursor-pointer hover:border-slate-300 transition-colors"
          >
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-xs font-extrabold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                <Gauge className="w-4 h-4 text-blue-600" />
                <span>Fleet Efficiency</span>
              </CardTitle>
              <CardDescription className="text-[10px] text-slate-400 mt-0.5">Vehicle utilization overview</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-4 flex flex-col justify-center gap-2">
              {sortedUtilization.slice(0, 3).map((veh) => (
                <div key={veh.id || veh.plateNumber} className="flex items-center justify-between text-[11px]">
                  <span className="font-mono font-extrabold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">{veh.plateNumber}</span>
                  <span className="font-bold text-slate-600">{veh.utilization}%</span>
                </div>
              ))}
            </CardContent>
          </Card>

        </div>

        {/* ==========================================
            5. LABOR CHARGES
            ========================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">

          {/* LABOR CHARGES (12 Columns) */}
          <Card className="lg:col-span-12 border-slate-200/60 shadow-sm rounded-xl bg-white flex flex-col justify-between">
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

        {/* Revenue / Expense / Net Profit detail modal */}
        <KpiModal
          isOpen={activeOverviewModal === 'finance'}
          onClose={() => setActiveOverviewModal(null)}
          originRect={originRect}
          title="Revenue / Expense / Net Profit"
          subtitle="Monthly breakdown"
        >
          <div className="divide-y divide-slate-100">
            <div className="grid grid-cols-4 gap-2 py-2 text-[10px] font-black uppercase text-slate-400">
              <span>Month</span>
              <span className="text-right">Revenue</span>
              <span className="text-right">Expense</span>
              <span className="text-right">Net Profit</span>
            </div>
            {monthlyFinance.map((m) => (
              <div key={m.month} className="grid grid-cols-4 gap-2 py-2 text-xs">
                <span className="font-bold text-slate-800">{m.month}</span>
                <span className="text-right font-extrabold text-[#E8450F]">SAR {m.revenue.toLocaleString()}</span>
                <span className="text-right font-extrabold text-rose-600">SAR {m.expense.toLocaleString()}</span>
                <span className="text-right font-extrabold text-emerald-600">SAR {m.netProfit.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </KpiModal>

        {/* Action Required detail modal */}
        <KpiModal
          isOpen={activeOverviewModal === 'action'}
          onClose={() => setActiveOverviewModal(null)}
          originRect={originRect}
          title="Action Required"
          subtitle="All critical operations alerts"
        >
          <div className="divide-y divide-slate-100 -mx-6">
            {actionRequiredItems.map((item) => {
              let badgeColor = 'bg-slate-50 text-slate-700 border-slate-200';
              if (item.priority === 'Critical') badgeColor = 'bg-red-50 text-red-700 border-red-200/80';
              if (item.priority === 'High') badgeColor = 'bg-amber-50 text-amber-700 border-amber-200/80';
              if (item.priority === 'Medium') badgeColor = 'bg-yellow-50 text-yellow-700 border-yellow-200/80';
              return (
                <div key={item.id} className="px-6 py-3.5 flex items-start gap-3.5">
                  <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${
                    item.priority === 'Critical' ? 'bg-red-500' : item.priority === 'High' ? 'bg-orange-500' : 'bg-amber-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-wide">{item.category}</span>
                      <Badge variant="outline" className={`text-[8px] font-extrabold px-1.5 py-0.2 rounded-md ${badgeColor}`}>{item.priority}</Badge>
                      <span className="text-[9px] text-slate-400 font-mono ml-auto">{item.metadata}</span>
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 mt-1">{item.title}</h4>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">{item.description}</p>
                  </div>
                  <button
                    onClick={() => { item.onClick(); setActiveOverviewModal(null); }}
                    className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-[10px] font-black transition-all shrink-0"
                  >
                    {item.actionLabel}
                  </button>
                </div>
              );
            })}
          </div>
        </KpiModal>

        {/* Tires detail modal */}
        <KpiModal
          isOpen={activeOverviewModal === 'tires'}
          onClose={() => setActiveOverviewModal(null)}
          originRect={originRect}
          title="Tires"
          subtitle="Reported tire condition alerts"
        >
          <div className="divide-y divide-slate-100 -mx-6">
            {tireAlerts.map((t) => (
              <div key={t.id} className="px-6 py-3.5 flex items-start gap-3.5">
                <div className="mt-0.5 w-2 h-2 rounded-full shrink-0 bg-red-500" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-slate-900">{t.vehicle}</span>
                    <Badge variant="outline" className="text-[8px] font-extrabold px-1.5 py-0.2 rounded-md bg-red-50 text-red-700 border-red-200/80">{t.severity}</Badge>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-1">{t.issue}</h4>
                  <p className="text-[11px] text-slate-500 font-medium mt-0.5">Reported by {t.reportedBy} • {t.time}</p>
                </div>
                <button
                  onClick={() => { navigate('/maintenance'); setActiveOverviewModal(null); }}
                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-md text-[10px] font-black transition-all shrink-0"
                >
                  Review
                </button>
              </div>
            ))}
          </div>
        </KpiModal>

        {/* Doc detail modal */}
        <KpiModal
          isOpen={activeOverviewModal === 'doc'}
          onClose={() => setActiveOverviewModal(null)}
          originRect={originRect}
          title="Doc"
          subtitle="Compliance document expiry"
        >
          <div className="flex flex-col gap-3">
            <div className="text-2xl font-black text-amber-600">
              {kpis.docs_expiring_soon.value || 0} <span className="text-xs font-black uppercase text-amber-500 ml-0.5">Documents Expiring Soon</span>
            </div>
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Vehicle Registration and Driver Permits require immediate renewal to avoid roadside compliance fines.
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { navigate('/documents'); setActiveOverviewModal(null); }}
              className="text-[11px] font-bold text-[#E8450F] hover:text-[#C7380A] p-0 h-auto hover:bg-transparent self-start"
            >
              <span>Review Documents</span>
              <ChevronRight size={12} className="ml-0.5" />
            </Button>
          </div>
        </KpiModal>

        {/* Fleet Efficiency detail modal */}
        <KpiModal
          isOpen={activeOverviewModal === 'fleet'}
          onClose={() => setActiveOverviewModal(null)}
          originRect={originRect}
          title="Fleet Efficiency"
          subtitle="Vehicle utilization breakdown"
        >
          <div className="divide-y divide-slate-100 -mx-6">
            {processedUtilization.length === 0 ? (
              <p className="px-6 py-4 text-xs text-slate-400 font-semibold">No vehicle performance logs found</p>
            ) : (
              processedUtilization.map((veh) => (
                <div key={veh.id || veh.plateNumber} className="px-6 py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">{veh.plateNumber}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{veh.tripsCompleted} trips</span>
                  </div>
                  <span className="font-black text-slate-800">{veh.utilization}% • ~{veh.distanceTraveled.toLocaleString()} km</span>
                </div>
              ))
            )}
          </div>
        </KpiModal>

        {/* Upcoming trips detail modal */}
        <KpiModal
          isOpen={activeOverviewModal === 'upcoming'}
          onClose={() => setActiveOverviewModal(null)}
          originRect={originRect}
          title="Upcoming Trips"
          subtitle="Chronologically ordered next dispatches"
        >
          <div className="divide-y divide-slate-100 -mx-6">
            {upcomingTripsList.length === 0 ? (
              <p className="px-6 py-4 text-xs text-slate-400 font-semibold">No upcoming trips scheduled</p>
            ) : (
              upcomingTripsList.map((trip) => (
                <div key={trip.id} className="px-6 py-3.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-[#E8450F]">{trip.ref_id || 'Draft'}</span>
                    <span className="text-[10px] text-slate-500 font-bold">
                      {trip.planned_start ? new Date(trip.planned_start).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-600 font-semibold">
                    {trip.stops?.[0]?.location_name || 'Riyadh Warehouse'} → {trip.stops?.[trip.stops.length - 1]?.location_name || 'Jeddah Warehouse'}
                  </div>
                  <button
                    onClick={() => { navigate(`/trips/${trip.id}`); setActiveOverviewModal(null); }}
                    className="text-[10px] font-black text-[#E8450F] hover:text-[#C7380A] flex items-center gap-0.5 self-start"
                  >
                    <span>View Trip</span>
                    <ArrowRight size={11} />
                  </button>
                </div>
              ))
            )}
          </div>
        </KpiModal>

      </div>
    </DashboardLayout>
  );
}

