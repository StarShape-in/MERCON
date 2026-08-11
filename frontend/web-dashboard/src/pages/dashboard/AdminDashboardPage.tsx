import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Car, DollarSign, Gauge } from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import Btn from '@/components/ui/Btn';
import KpiCard from '@/components/ui/KpiCard';
import { DispatchTelemetryRadarKpi, VehicleTelematicsKpi } from '@/components/ui/CustomKpiWidgets';
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
  const revenueChartData = (summary?.monthly_revenue_chart || []).map((m) => ({ value: m.revenue }));

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

        {/* KPI strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <KpiCard
            title="Active Trips"
            value={activeTripsLoading ? '—' : activeTripsTotal}
            icon={<Gauge />}
            variant="blue"
            customFooter={
              <div className="mt-4">
                <DispatchTelemetryRadarKpi activeCount={activeTripsTotal} totalCount={activeTripsTotal} label="In-Flight" />
              </div>
            }
          />
          <KpiCard
            title="Settlement Queue"
            value={unsettledLoading ? '—' : unsettledTrips.length}
            icon={<DollarSign />}
            variant="amber"
            description="Completed trips awaiting labor charges"
          />
          <KpiCard
            title="Fleet Snapshot"
            value={summaryLoading ? '—' : kpis?.fleet_available.value ?? 0}
            icon={<Car />}
            variant="emerald"
            description="Available vehicles"
            customFooter={
              <div className="mt-4">
                <VehicleTelematicsKpi
                  activeCount={kpis?.fleet_on_trip.value ?? 0}
                  maintenanceCount={0}
                />
              </div>
            }
          />
          <KpiCard
            title="Revenue This Month"
            value={summaryLoading ? '—' : `SAR ${(kpis?.revenue_this_month.value ?? 0).toLocaleString()}`}
            icon={<DollarSign />}
            variant="brand"
            trend={kpis?.revenue_this_month.delta != null ? (kpis.revenue_this_month.delta >= 0 ? 'up' : 'down') : undefined}
            trendValue={kpis?.revenue_this_month.delta != null ? `${Math.abs(kpis.revenue_this_month.delta)}%` : undefined}
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
