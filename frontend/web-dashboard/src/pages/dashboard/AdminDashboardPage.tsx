import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, AlertTriangle } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import Btn from '@/components/ui/Btn';
import KpiCard from '@/components/ui/KpiCard';
import { KpiRouteFooter } from '@/components/ui/KpiRouteFooter';
import { RouteLine, MoneyBills, FleetTruck, RevenueChart } from '@/components/ui/kpi-icons';
import PostTripSettlementModal from '@/components/trips/PostTripSettlementModal';
import ActiveTripsWidget from '@/components/dashboard/ActiveTripsWidget';
import LaborChargeQueueWidget from '@/components/dashboard/LaborChargeQueueWidget';
import TopCustomersWidget from '@/components/dashboard/TopCustomersWidget';
import ActionsNeededWidget from '@/components/dashboard/ActionsNeededWidget';
import { reportsService } from '@/services/reportsService';
import { tripService, Trip } from '@/services/tripService';
import { documentService } from '@/services/documentService';
import { maintenanceService } from '@/services/maintenanceService';

const ACTIVE_TRIP_STATUSES = 'Dispatched,AtPickup,InTransit,AtDelivery';

export default function AdminDashboardPage() {
  const queryClient = useQueryClient();
  const [selectedSettlementTrip, setSelectedSettlementTrip] = useState<Trip | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

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

  const { data: expiringDocsRes, isLoading: docsLoading } = useQuery({
    queryKey: ['admin-dashboard', 'expiring-docs'],
    queryFn: () => documentService.getAll({ expiring_within_days: 30, per_page: 50 }),
  });

  const { data: maintenanceRes, isLoading: maintenanceLoading } = useQuery({
    queryKey: ['admin-dashboard', 'maintenance'],
    queryFn: () => maintenanceService.getAll({ per_page: 100 }),
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

  return (
    <DashboardLayout active="Admin Dashboard" title="Admin Dashboard">
      <div className="px-4 sm:px-6 pb-6 animate-fade-in max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">Admin Dashboard</h1>
            <p className="text-xs text-slate-400 mt-0.5">Fleet operations at a glance</p>
          </div>
          <Btn label="Refresh All" variant="secondary" size="sm" icon={<RefreshCw size={13} />} onClick={handleRefreshAll} />
        </div>

        {toast && (
          <div className="mb-4 px-4 py-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
            {toast}
          </div>
        )}

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
            description="Completed trips awaiting labor charges"
            icon={MoneyBills}
            customFooter={
              <KpiRouteFooter
                id="settlement-queue"
                accentHex="#D97706"
                bgLightClass="bg-[#FFFBEB]"
                bgDarkClass="dark:bg-[#D97706]/10"
                borderClass="border-amber-500/10"
                networkHex="#FDE68A"
                truckFilter="hue-rotate(20deg) saturate(1.4) brightness(1)"
                pulseClass="bg-amber-500/25 animate-ping"
                badge={unsettledTrips.length > 0 ? { icon: <AlertTriangle className="w-2.5 h-2.5 shrink-0" />, text: 'PENDING' } : undefined}
              />
            }
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
            description="Completed freight payments this month"
            icon={RevenueChart}
            customFooter={
              <KpiRouteFooter
                id="revenue"
                accentHex="#E8450F"
                bgLightClass="bg-[#FFF8F6]"
                bgDarkClass="dark:bg-[#E8450F]/10"
                borderClass="border-[#E8450F]/10"
                networkHex="#FDBA74"
                truckFilter="none"
                pulseClass="bg-orange-500/25 animate-ping"
              />
            }
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

        {/* Top customers + Actions needed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mb-5">
          <div className="lg:col-span-5">
            <TopCustomersWidget customers={revenueReport?.top_customers || []} isLoading={revenueLoading} />
          </div>
          <div className="lg:col-span-7">
            <ActionsNeededWidget
              expiringDocs={expiringDocsRes?.data || []}
              dueMaintenance={maintenanceRes?.data || []}
              isLoading={docsLoading || maintenanceLoading}
            />
          </div>
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
      </div>
    </DashboardLayout>
  );
}
