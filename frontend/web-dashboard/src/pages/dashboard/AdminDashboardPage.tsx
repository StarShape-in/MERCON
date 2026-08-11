import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient, useIsFetching } from '@tanstack/react-query';
import { RefreshCw, LayoutDashboard, ShieldCheck } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import KpiCard from '@/components/ui/KpiCard';
import { KpiRouteFooter } from '@/components/ui/KpiRouteFooter';
import { RouteLine, MoneyBills, FleetTruck, RevenueChart } from '@/components/ui/kpi-icons';
import PostTripSettlementModal from '@/components/trips/PostTripSettlementModal';
import LogDelayReasonModal from '@/components/trips/LogDelayReasonModal';
import ActiveTripsWidget from '@/components/dashboard/ActiveTripsWidget';
import LaborChargeQueueWidget from '@/components/dashboard/LaborChargeQueueWidget';
import TopCustomersWidget from '@/components/dashboard/TopCustomersWidget';
import ActionsNeededWidget from '@/components/dashboard/ActionsNeededWidget';
import { reportsService, DelayLogRow } from '@/services/reportsService';
import { tripService, Trip } from '@/services/tripService';
import { documentService } from '@/services/documentService';
import { maintenanceService } from '@/services/maintenanceService';
import { invoiceService } from '@/services/invoiceService';
import { rateCardService } from '@/services/rateCardService';
import { locationService } from '@/services/locationService';
import { customerService, Customer } from '@/services/customerService';

const ACTIVE_TRIP_STATUSES = 'Dispatched,AtPickup,InTransit,AtDelivery';

/** "Just now" / "3m ago" / "2h ago" — small enough here that day-level granularity isn't needed. */
function formatRelativeTime(from: number, now: number): string {
  const seconds = Math.max(0, Math.round((now - from) / 1000));
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [selectedSettlementTrip, setSelectedSettlementTrip] = useState<Trip | null>(null);
  const [selectedDelayStop, setSelectedDelayStop] = useState<DelayLogRow | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  // Keep the "Updated Xm ago" label ticking without needing a refetch.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(interval);
  }, []);

  const isFetchingAny = useIsFetching({ queryKey: ['admin-dashboard'] }) > 0;
  useEffect(() => {
    if (!isFetchingAny) setLastUpdatedAt(Date.now());
  }, [isFetchingAny]);

  const { data: activeTripsRes, isLoading: activeTripsLoading } = useQuery({
    queryKey: ['admin-dashboard', 'active-trips'],
    queryFn: () => tripService.getAll({ status: ACTIVE_TRIP_STATUSES, per_page: 25 }),
  });
  const activeTrips = activeTripsRes?.data || [];
  const activeTripsTotal = activeTripsRes?.meta?.total ?? activeTrips.length;

  const { data: unsettledTrips = [], isLoading: unsettledLoading } = useQuery({
    queryKey: ['admin-dashboard', 'unsettled-trips'],
    queryFn: tripService.getUnsettled,
  });

  const { data: revenueReport, isLoading: revenueLoading } = useQuery({
    queryKey: ['admin-dashboard', 'revenue-report'],
    queryFn: () => reportsService.getRevenueReport(6),
  });
  const topCustomerIds = (revenueReport?.top_customers || []).map((c) => c.id);

  const { data: topCustomerDetails = {} } = useQuery({
    queryKey: ['admin-dashboard', 'top-customer-details', topCustomerIds.join(',')],
    queryFn: async () => {
      const details = await Promise.all(topCustomerIds.map((id) => customerService.getById(id)));
      return details.reduce<Record<string, Customer>>((acc, c) => { acc[c.id] = c; return acc; }, {});
    },
    enabled: topCustomerIds.length > 0,
  });

  const { data: expiringDocsRes, isLoading: docsLoading } = useQuery({
    queryKey: ['admin-dashboard', 'expiring-docs'],
    queryFn: () => documentService.getAll({ expiring_within_days: 30, per_page: 50 }),
  });

  const { data: maintenanceRes, isLoading: maintenanceLoading } = useQuery({
    queryKey: ['admin-dashboard', 'maintenance'],
    queryFn: () => maintenanceService.getAll({ per_page: 100 }),
  });

  const { data: delayLogRes, isLoading: delayLoading } = useQuery({
    queryKey: ['admin-dashboard', 'delay-log'],
    queryFn: () => reportsService.getDelayLog({ needs_reason: 'true', per_page: 50 }),
  });

  const { data: invoicesRes, isLoading: invoicesLoading } = useQuery({
    queryKey: ['admin-dashboard', 'invoices'],
    queryFn: () => invoiceService.getAll({ per_page: 200 }),
  });

  const { data: rateCardsRes, isLoading: rateCardsLoading } = useQuery({
    queryKey: ['admin-dashboard', 'rate-cards'],
    queryFn: () => rateCardService.getAll(),
  });

  const { data: locationsRes, isLoading: locationsLoading } = useQuery({
    queryKey: ['admin-dashboard', 'locations'],
    queryFn: () => locationService.getAll(),
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['admin-dashboard', 'summary'],
    queryFn: reportsService.getSummary,
  });

  const handleRefreshAll = () => {
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    showToast('Dashboard refreshed');
  };

  const kpis = summary?.kpis;

  // How long each pending trip has been waiting for its labor charges to be
  // entered — real distribution, not decoration, so the queue's staleness is
  // visible at a glance rather than just its size.
  const settlementAgingSegments = useMemo(() => {
    const buckets = [
      { label: '≤1d', color: '#FCD34D', count: 0 },
      { label: '2-3d', color: '#F59E0B', count: 0 },
      { label: '4d+', color: '#DC2626', count: 0 },
    ];
    const nowMs = Date.now();
    unsettledTrips.forEach((t) => {
      const completedAtMs = t.actual_end ? new Date(t.actual_end).getTime() : nowMs;
      const daysWaiting = Math.max(0, Math.floor((nowMs - completedAtMs) / (1000 * 60 * 60 * 24)));
      if (daysWaiting <= 1) buckets[0].count++;
      else if (daysWaiting <= 3) buckets[1].count++;
      else buckets[2].count++;
    });
    return buckets.map((b) => ({ label: b.label, value: b.count, color: b.color }));
  }, [unsettledTrips]);

  // Real 6-month revenue trend for the Revenue card's sparkline.
  const revenueChartData = (summary?.monthly_revenue_chart || []).map((m) => m.revenue);

  return (
    <DashboardLayout active="Admin Dashboard" title="Admin Dashboard">
      {/* Toast — fixed slide-in, matches the main Dashboard's own toast rather than
          pushing the header down with an inline banner. */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-[999] bg-slate-900 border border-slate-800 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 animate-in slide-in-from-bottom-5 fade-in duration-200">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      <div className="px-4 sm:px-6 pb-6 animate-fade-in max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5 pt-1 mb-5">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-[#E8450F]/10 text-[#E8450F] flex items-center justify-center shrink-0">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-extrabold text-slate-950 dark:text-slate-100 tracking-tight">
                  Admin Dashboard
                </h1>
                <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-slate-200/80 dark:border-slate-700 shrink-0">
                  <ShieldCheck className="w-3 h-3" />
                  Admin Only
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mt-1">
                Live active trips, settlements, top customers and actions needed — in one place.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 self-start md:self-center">
            <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 font-mono whitespace-nowrap">
              Updated {formatRelativeTime(lastUpdatedAt, now)}
            </span>
            <button
              onClick={handleRefreshAll}
              className="inline-flex items-center gap-2 px-4.5 py-2 bg-[#EFF2FC] hover:bg-[#E4E9FC] dark:bg-indigo-950/50 dark:hover:bg-indigo-950/70 border border-[#D5DEFB] dark:border-indigo-900 text-xs font-extrabold text-[#2F54EB] dark:text-indigo-300 rounded-full shadow-2xs transition-colors cursor-pointer shrink-0"
              title="Refresh all dashboard data"
            >
              <RefreshCw size={12} className={isFetchingAny ? 'animate-spin' : ''} />
              <span>Refresh All</span>
            </button>
          </div>
        </div>

        {/* KPI strip — matches the Vehicles page instrument panel styling */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-5">
          {/* Card 1: Active Trips */}
          <KpiCard
            title="ACTIVE TRIPS"
            value={
              <span>
                {activeTripsLoading ? '—' : activeTripsTotal}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">In-Flight</span>
              </span>
            }
            variant="blue"
            trend={activeTripsTotal > 0 ? 'up' : 'neutral'}
            trendValue={`${activeTripsTotal} In-Flight`}
            description="Dispatched, at pickup, in transit or at delivery"
            icon={RouteLine}
            customFooter={
              <KpiRouteFooter
                id="active-trips"
                accentHex="#3B82F6"
                bgLightClass="bg-[#F0F6FF]"
                bgDarkClass="dark:bg-[#1E3A8A]/10"
                borderClass="border-blue-500/10"
                networkHex="#93C5FD"
                truckFilter="hue-rotate(200deg) saturate(1.2) brightness(0.95)"
                pulseClass="bg-blue-500/30 animate-ping"
              />
            }
          />

          {/* Card 2: Settlement Queue */}
          <KpiCard
            title="SETTLEMENT QUEUE"
            value={
              <span>
                {unsettledLoading ? '—' : unsettledTrips.length}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Pending</span>
              </span>
            }
            variant="amber"
            trend={unsettledTrips.length > 0 ? 'up' : 'down'}
            trendValue={unsettledTrips.length > 0 ? 'Needs Review' : 'All Clear'}
            description="Completed trips awaiting labor charges, by days pending"
            icon={MoneyBills}
            progressSegments={settlementAgingSegments}
          />

          {/* Card 3: Fleet Available */}
          <KpiCard
            title="FLEET AVAILABLE"
            value={
              <span>
                {summaryLoading ? '—' : kpis?.fleet_available.value ?? 0}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Ready</span>
              </span>
            }
            variant="emerald"
            trend="up"
            trendValue={`${kpis?.fleet_on_trip.value ?? 0} On Trip`}
            description="Ready for dispatch right now"
            icon={FleetTruck}
            customFooter={
              <KpiRouteFooter
                id="fleet-available"
                accentHex="#10B981"
                bgLightClass="bg-[#E8F5E9]"
                bgDarkClass="dark:bg-[#1B5E20]/15"
                borderClass="border-emerald-500/10"
                networkHex="#A7F3D0"
                truckFilter="hue-rotate(100deg) saturate(1.3) brightness(0.95)"
                pulseClass="bg-emerald-500/20 animate-ping"
              />
            }
          />

          {/* Card 4: Revenue This Month */}
          <KpiCard
            title="REVENUE THIS MONTH"
            value={
              <span>
                {summaryLoading ? '—' : `SAR ${(kpis?.revenue_this_month.value ?? 0).toLocaleString()}`}
              </span>
            }
            variant="brand"
            trend={kpis?.revenue_this_month.delta != null ? (kpis.revenue_this_month.delta >= 0 ? 'up' : 'down') : undefined}
            trendValue={kpis?.revenue_this_month.delta != null ? `${Math.abs(kpis.revenue_this_month.delta)}%` : undefined}
            description="Completed freight payments — 6-month trend"
            icon={RevenueChart}
            chartData={revenueChartData.length > 0 ? revenueChartData : undefined}
          />
        </div>

        {/* Active trips */}
        <div className="mb-5">
          <ActiveTripsWidget trips={activeTrips} total={activeTripsTotal} isLoading={activeTripsLoading} />
        </div>

        {/* Labor charge / settlement queue */}
        <div className="mb-5">
          <LaborChargeQueueWidget
            trips={unsettledTrips}
            isLoading={unsettledLoading}
            onSettle={(trip) => setSelectedSettlementTrip(trip)}
          />
        </div>

        {/* Top customers */}
        <div className="mb-5">
          <TopCustomersWidget
            customers={revenueReport?.top_customers || []}
            customerDetails={topCustomerDetails}
            invoices={invoicesRes?.data || []}
            isLoading={revenueLoading}
          />
        </div>

        {/* Actions needed — the dashboard's action center */}
        <div className="mb-5">
          <ActionsNeededWidget
            expiringDocs={expiringDocsRes?.data || []}
            dueMaintenance={maintenanceRes?.data || []}
            delaysNeedingReason={delayLogRes?.data || []}
            invoices={invoicesRes?.data || []}
            rateCards={rateCardsRes?.data || []}
            locations={locationsRes?.data || []}
            isLoading={docsLoading || maintenanceLoading || delayLoading || invoicesLoading || rateCardsLoading || locationsLoading}
            onLogDelayReason={(row) => setSelectedDelayStop(row)}
          />
        </div>

        <PostTripSettlementModal
          isOpen={!!selectedSettlementTrip}
          trip={selectedSettlementTrip}
          onClose={() => setSelectedSettlementTrip(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-dashboard', 'unsettled-trips'] });
            queryClient.invalidateQueries({ queryKey: ['admin-dashboard', 'active-trips'] });
            showToast('Trip settled successfully');
          }}
        />

        <LogDelayReasonModal
          isOpen={!!selectedDelayStop}
          stop={selectedDelayStop}
          onClose={() => setSelectedDelayStop(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['admin-dashboard', 'delay-log'] });
            showToast('Delay reason logged');
          }}
        />
      </div>
    </DashboardLayout>
  );
}
