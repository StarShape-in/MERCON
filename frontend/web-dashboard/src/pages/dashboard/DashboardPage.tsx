import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Truck, Car, DollarSign, AlertTriangle, 
  ArrowRight, ArrowUpRight, Loader2, RefreshCw 
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, PieChart, Pie, Cell 
} from 'recharts';

import DashboardLayout from '@/components/layout/DashboardLayout';
import KpiCard from '@/components/ui/KpiCard';
import { TruckMotion, FleetTruck, MoneyBills, CalendarAlert } from '@/components/ui/kpi-icons';
import { HeroStatBanner, TelemetryDarkCard, GlassmeterCard, CompactCapsulePill } from '@/components/ui/NewKpiCardStyles';
import { DispatchTelemetryRadarKpi, SpeedometerGaugeKpi } from '@/components/ui/CustomKpiWidgets';
import StatusBadge from '@/components/ui/StatusBadge';
import Btn from '@/components/ui/Btn';
import { reportsService } from '@/services/reportsService';
import { tripService } from '@/services/tripService';
import { authStore } from '@/store/authStore';

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = authStore.getUser();
  const operatorName = user?.name ? user.name.split(' ')[0] : 'Mohammed';

  // Fetch Reports Summary
  const { 
    data: summary, 
    isLoading: summaryLoading, 
    error: summaryError,
    refetch: refetchSummary 
  } = useQuery({
    queryKey: ['reports-summary'],
    queryFn: reportsService.getSummary,
  });

  // Fetch Recent Trips
  const { 
    data: recentTripsRes, 
    isLoading: tripsLoading,
  } = useQuery({
    queryKey: ['recent-trips'],
    queryFn: () => tripService.getAll({ per_page: 5 }),
  });

  const recentTrips = recentTripsRes?.data || [];

  // Default values and trend/status mapping
  const kpis = summary?.kpis || {
    total_trips: { value: 0, delta: null },
    active_drivers: { value: 0, delta: null },
    fleet_available: { value: 0, delta: null },
    fleet_on_trip: { value: 0, delta: null },
    revenue_this_month: { value: 0, delta: null },
    docs_expiring_soon: { value: 0, delta: null },
  };

  const trendData = summary?.monthly_revenue_chart || [];

  const pieDataRaw = summary?.trip_status_distribution || {};
  const pieData = Object.keys(pieDataRaw).map((key) => {
    let color = '#9898A4';
    if (key === 'Completed') color = '#16A34A';
    if (key === 'InTransit') color = '#D97706';
    if (key === 'Draft') color = '#2563EB';
    if (key === 'Cancelled') color = '#DC2626';

    return {
      name: key,
      value: pieDataRaw[key],
      color,
    };
  });

  return (
    <DashboardLayout 
      active="Dashboard" 
      title="Dashboard" 
      pageTitle="Dashboard" 
      pageSub={`Good morning, ${operatorName}. Here's what's happening today.`}
      actions={
        <Btn 
          label="Refresh" 
          variant="secondary" 
          size="sm" 
          icon={<RefreshCw size={13} />} 
          onClick={() => refetchSummary()} 
        />
      }
    >
      <div className="px-6 pb-6 h-full flex flex-col gap-5 animate-fade-in">
        
        {/* Instrument Panel KPI Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          
          {/* Card 1: Total Freight Trips with Telemetry Radar Widget */}
          <KpiCard
            title="TOTAL FREIGHT TRIPS"
            value={kpis.total_trips.value}
            variant="brand"
            trend={kpis.total_trips.delta !== null ? (kpis.total_trips.delta >= 0 ? 'up' : 'down') : 'up'}
            trendValue={kpis.total_trips.delta !== null ? `${Math.abs(kpis.total_trips.delta)}%` : '+12.4%'}
            description="→ Active & completed manifests"
            icon={TruckMotion}
            onClick={() => navigate('/trips')}
          >
            <DispatchTelemetryRadarKpi 
              activeCount={kpis.fleet_on_trip.value || 0} 
              totalCount={kpis.total_trips.value || 1} 
              label="Live Dispatch Telemetry" 
            />
          </KpiCard>

          {/* Card 2: Active Fleet with Speedometer Dial Widget */}
          <KpiCard
            title="ACTIVE FLEET (ON ROAD)"
            value={kpis.fleet_on_trip.value}
            variant="blue"
            trend="up"
            trendValue={`${Math.round(((kpis.fleet_on_trip.value || 1) / ((kpis.fleet_on_trip.value || 0) + (kpis.fleet_available.value || 1))) * 100)}%`}
            description="↑ Fleet active capacity"
            icon={FleetTruck}
            onClick={() => navigate('/vehicles')}
          >
            <SpeedometerGaugeKpi 
              percentage={Math.round(((kpis.fleet_on_trip.value || 1) / ((kpis.fleet_on_trip.value || 0) + (kpis.fleet_available.value || 1))) * 100)} 
              label="Fleet Capacity Utilized"
              subtext={`${kpis.fleet_available.value || 0} Standby Trucks`}
            />
          </KpiCard>

          {/* Card 3: Monthly Revenue — Donut Gauge */}
          <KpiCard
            title="MONTHLY REVENUE"
            value={`SAR ${((kpis.revenue_this_month.value || 0) / 1000).toFixed(1)}K`}
            variant="emerald"
            trend={kpis.revenue_this_month.delta !== null ? (kpis.revenue_this_month.delta >= 0 ? 'up' : 'down') : 'up'}
            trendValue={kpis.revenue_this_month.delta !== null ? `${Math.abs(kpis.revenue_this_month.delta)}%` : '+14.8%'}
            description="↑ Gross settled payments"
            icon={MoneyBills}
            completionGauge={{
              percentage: 84,
              label: '84% Monthly Target Reached',
              subtext: 'SAR 420K Monthly Target'
            }}
            onClick={() => navigate('/invoices')}
          />

          {/* Card 4: Compliance Renewals — Urgency Segments */}
          <KpiCard
            title="COMPLIANCE RENEWALS"
            value={kpis.docs_expiring_soon.value}
            variant="amber"
            trend={kpis.docs_expiring_soon.value > 0 ? 'down' : 'neutral'}
            trendValue={kpis.docs_expiring_soon.value > 0 ? 'Action Required' : 'All Clear'}
            description="→ Permits expiring within 30d"
            icon={CalendarAlert}
            progressSegments={[
              { label: `${kpis.docs_expiring_soon.value} Due Soon`, value: kpis.docs_expiring_soon.value > 0 ? 80 : 0, color: 'bg-amber-500' },
              { label: 'Clear', value: kpis.docs_expiring_soon.value > 0 ? 20 : 100, color: 'bg-slate-300' },
            ]}
            onClick={() => navigate('/documents/expiring')}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 shrink-0">
          {/* Revenue / Trip Trend */}
          <div className="lg:col-span-2 bg-white rounded-lg p-5 border border-black/[0.06] shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4 shrink-0">
              <div>
                <p className="text-sm font-bold text-[#111]">Revenue Trend</p>
                <p className="text-xs text-[#6E6E80]">Monthly completed payments (SAR)</p>
              </div>
            </div>
            <div className="flex-1 min-h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#E8450F" stopOpacity={0.12} />
                      <stop offset="95%" stopColor="#E8450F" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F2" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9898A4' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9898A4' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, fontSize: 11, border: '1px solid #F0F0F2', fontFamily: 'Plus Jakarta Sans' }} />
                  <Area type="monotone" dataKey="revenue" stroke="#E8450F" strokeWidth={2} fill="url(#revenueGrad)" name="Revenue" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Trip Status distribution */}
          <div className="bg-white rounded-lg p-5 border border-black/[0.06] shadow-sm flex flex-col justify-between">
            <div className="shrink-0">
              <p className="text-sm font-bold text-[#111] mb-1">Trip Status</p>
              <p className="text-xs text-[#6E6E80] mb-3">Distribution this month</p>
            </div>
            
            <div className="flex items-center justify-center flex-1 my-2">
              <PieChart width={160} height={140}>
                <Pie 
                  data={pieData} 
                  cx="50%" 
                  cy="50%" 
                  innerRadius={42} 
                  outerRadius={62} 
                  dataKey="value" 
                  strokeWidth={0}
                >
                  {pieData.map((e, index) => (
                    <Cell key={`cell-${index}`} fill={e.color} />
                  ))}
                </Pie>
              </PieChart>
            </div>

            <div className="space-y-1.5 shrink-0 border-t border-black/[0.04] pt-3">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-[#444]">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                    {d.name}
                  </span>
                  <span className="font-bold text-[#111]">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Trips Table */}
        <div className="bg-white rounded-lg border border-black/[0.06] shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F0F2] shrink-0">
            <p className="text-sm font-bold text-[#111]">Recent Operations Trips</p>
            <button 
              onClick={() => navigate('/trips')}
              className="text-xs text-[#E8450F] font-bold flex items-center gap-1 hover:underline hover:scale-[1.02] transition-all"
            >
              <span>View All Trips</span>
              <ArrowRight size={13} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#FAFAFA] border-b border-black/[0.04]">
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-[#9898A4] uppercase tracking-wider">Trip ID</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-[#9898A4] uppercase tracking-wider">Customer</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-[#9898A4] uppercase tracking-wider">Cargo Type</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-[#9898A4] uppercase tracking-wider">Driver</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-[#9898A4] uppercase tracking-wider">Vehicle</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-[#9898A4] uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3 text-left text-[10px] font-bold text-[#9898A4] uppercase tracking-wider">Planned Start</th>
                </tr>
              </thead>
              <tbody>
                {tripsLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <tr key={index} className="border-b border-[#F5F5F7]">
                      <td className="px-5 py-4"><div className="h-4 skeleton w-12" /></td>
                      <td className="px-5 py-4"><div className="h-4 skeleton w-24" /></td>
                      <td className="px-5 py-4"><div className="h-4 skeleton w-20" /></td>
                      <td className="px-5 py-4"><div className="h-4 skeleton w-28" /></td>
                      <td className="px-5 py-4"><div className="h-4 skeleton w-16" /></td>
                      <td className="px-5 py-4"><div className="h-5 skeleton w-16 rounded-full" /></td>
                      <td className="px-5 py-4"><div className="h-4 skeleton w-24" /></td>
                    </tr>
                  ))
                ) : recentTrips.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-xs font-semibold text-[#9898A4]">
                      No recent trips available. Click 'New Trip' to create one.
                    </td>
                  </tr>
                ) : (
                  recentTrips.map((t) => (
                    <tr 
                      key={t.id} 
                      onClick={() => navigate(`/trips/${t.id}`)}
                      className="border-b border-[#F5F5F7] last:border-0 hover:bg-[#FAFAFA] cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-3.5 font-mono text-xs font-bold text-[#E8450F]">{t.ref_id || 'Draft'}</td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-[#111]">{t.customer?.name || '—'}</td>
                      <td className="px-5 py-3.5 text-xs font-medium text-[#444]">{t.cargo_type}</td>
                      <td className="px-5 py-3.5 text-xs font-medium text-[#444]">
                        {t.driver ? `${t.driver.first_name} ${t.driver.last_name}` : 'Unassigned'}
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs font-semibold text-[#6E6E80]">
                        {t.vehicle?.plate_number || 'Unassigned'}
                      </td>
                      <td className="px-5 py-3.5">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-5 py-3.5 text-xs font-medium text-[#9898A4]">
                        {t.planned_start ? new Date(t.planned_start).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
