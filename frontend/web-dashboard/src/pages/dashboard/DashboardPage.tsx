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
import FleetLiveMap from '@/components/maps/FleetLiveMap';
import TripCardSwiper from '@/components/trips/TripCardSwiper';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
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

        {/* Horizontal Trip Cards Swiper Section */}
        <div className="shrink-0 w-full">
          <TripCardSwiper />
        </div>

        {/* Live Fleet Radar Map Section (with shrink-0 layout stability) */}
        <div className="shrink-0 w-full">
          <FleetLiveMap />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 shrink-0">
          {/* Revenue / Trip Trend */}
          <Card className="lg:col-span-2 border-black/[0.06] shadow-sm rounded-2xl bg-white flex flex-col justify-between">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-[#111]">Revenue Trend</CardTitle>
              <CardDescription className="text-xs text-[#6E6E80]">Monthly completed freight payments (SAR)</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-[200px]">
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
            </CardContent>
          </Card>

          {/* Trip Status Distribution */}
          <Card className="border-black/[0.06] shadow-sm rounded-2xl bg-white flex flex-col justify-between">
            <CardHeader className="pb-0">
              <CardTitle className="text-sm font-bold text-[#111]">Trip Status Distribution</CardTitle>
              <CardDescription className="text-xs text-[#6E6E80]">Manifest progress status overview</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col justify-between flex-1 pt-2">
              <div className="flex items-center justify-center my-2">
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
            </CardContent>
          </Card>
        </div>

        {/* Recent Trips Table Ledger */}
        <Card className="border-black/[0.06] shadow-sm rounded-2xl bg-white overflow-hidden shrink-0">
          <CardHeader className="py-4 px-5 border-b border-[#F0F0F2] flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold text-[#111]">Recent Operations Trips</CardTitle>
              <CardDescription className="text-xs text-[#6E6E80]">Latest active and dispatched manifests</CardDescription>
            </div>
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => navigate('/trips')}
              className="text-xs text-[#E8450F] font-bold gap-1 hover:text-[#d03d0c]"
            >
              <span>View All Trips</span>
              <ArrowRight size={13} />
            </Button>
          </CardHeader>

          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-[#FAFAFA]">
                <TableRow>
                  <TableHead className="text-[10px] font-bold text-[#9898A4] uppercase tracking-wider">Trip ID</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#9898A4] uppercase tracking-wider">Customer</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#9898A4] uppercase tracking-wider">Cargo Type</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#9898A4] uppercase tracking-wider">Driver</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#9898A4] uppercase tracking-wider">Vehicle</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#9898A4] uppercase tracking-wider">Status</TableHead>
                  <TableHead className="text-[10px] font-bold text-[#9898A4] uppercase tracking-wider">Planned Start</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tripsLoading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><div className="h-4 skeleton w-12" /></TableCell>
                      <TableCell><div className="h-4 skeleton w-24" /></TableCell>
                      <TableCell><div className="h-4 skeleton w-20" /></TableCell>
                      <TableCell><div className="h-4 skeleton w-28" /></TableCell>
                      <TableCell><div className="h-4 skeleton w-16" /></TableCell>
                      <TableCell><div className="h-5 skeleton w-16 rounded-full" /></TableCell>
                      <TableCell><div className="h-4 skeleton w-24" /></TableCell>
                    </TableRow>
                  ))
                ) : recentTrips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-xs font-semibold text-[#9898A4]">
                      No recent trips available. Click 'New Trip' to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  recentTrips.map((t) => (
                    <TableRow 
                      key={t.id} 
                      onClick={() => navigate(`/trips/${t.id}`)}
                      className="cursor-pointer hover:bg-[#FAFAFA] transition-colors"
                    >
                      <TableCell className="font-mono text-xs font-bold text-[#E8450F]">{t.ref_id || 'Draft'}</TableCell>
                      <TableCell className="text-xs font-semibold text-[#111]">{t.customer?.name || '—'}</TableCell>
                      <TableCell className="text-xs font-medium text-[#444]">{t.cargo_type}</TableCell>
                      <TableCell className="text-xs font-medium text-[#444]">
                        {t.driver ? `${t.driver.first_name} ${t.driver.last_name}` : 'Unassigned'}
                      </TableCell>
                      <TableCell className="font-mono text-xs font-semibold text-[#6E6E80]">
                        {t.vehicle?.plate_number || 'Unassigned'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={t.status} />
                      </TableCell>
                      <TableCell className="text-xs font-medium text-[#9898A4]">
                        {t.planned_start ? new Date(t.planned_start).toLocaleDateString() : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

      </div>
    </DashboardLayout>
  );
}
