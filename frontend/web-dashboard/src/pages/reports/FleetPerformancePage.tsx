import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Settings, Activity, Truck, Wrench } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';

import DashboardLayout from '@/components/layout/DashboardLayout';
import KpiCard from '@/components/ui/KpiCard';
import { FleetTruck, ActivityPulse, MaintenanceWrench, Gear } from '@/components/ui/kpi-icons';
import Btn from '@/components/ui/Btn';
import { reportsService } from '@/services/reportsService';

function sar(value: number): string {
  if (Math.abs(value) >= 1000) return `SAR ${(value / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}K`;
  return `SAR ${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export default function FleetPerformancePage() {
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ['reports', 'fleet'],
    queryFn: reportsService.getFleetPerformance,
  });

  const kpis = useMemo(() => {
    const totalVehicles = rows.length;
    const inMaintenance = rows.filter((v) => v.status === 'Maintenance').length;
    const totalMaintenanceCost = rows.reduce((s, v) => s + (v.maintenance_cost ?? 0), 0);
    const totalTrips = rows.reduce((s, v) => s + v.total_trips, 0);
    const completed = rows.reduce((s, v) => s + v.completed_trips, 0);
    const completionRate = totalTrips > 0 ? Math.round((completed / totalTrips) * 100) : 0;
    return { totalVehicles, inMaintenance, totalMaintenanceCost, completionRate };
  }, [rows]);

  const tripsByVehicle = useMemo(
    () => [...rows]
      .sort((a, b) => b.total_trips - a.total_trips)
      .slice(0, 8)
      .map((v) => ({ name: v.plate_number || v.ref_id || '—', Completed: v.completed_trips, Total: v.total_trips })),
    [rows],
  );

  const maintenanceByVehicle = useMemo(
    () => [...rows]
      .filter((v) => (v.maintenance_cost ?? 0) > 0)
      .sort((a, b) => b.maintenance_cost - a.maintenance_cost)
      .slice(0, 8)
      .map((v) => ({ name: v.plate_number || v.ref_id || '—', cost: v.maintenance_cost })),
    [rows],
  );

  const chartState = isLoading ? 'loading' : isError ? 'error' : 'ready';
  const ChartFallback = ({ empty }: { empty: boolean }) => (
    <div className="h-full flex items-center justify-center text-xs text-[#9898A4]">
      {chartState === 'loading' ? 'Loading…' : chartState === 'error' ? 'Failed to load.' : empty ? 'No data yet.' : ''}
    </div>
  );

  return (
    <DashboardLayout
      active="Reports"
      breadcrumb="Reports"
      title="Fleet Performance"
      pageTitle="Fleet Performance Analytics"
      pageSub="Trips handled and maintenance spend per vehicle."
      actions={<Btn label="Export" variant="outline" icon={<Download size={14} />} />}
    >
      <div className="px-6 pb-6">

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard label="Total Vehicles" value={isLoading ? '—' : kpis.totalVehicles.toString()} icon={FleetTruck} color="#2563EB" bg="#EFF6FF" iconVariant="light" />
          <KpiCard label="Trip Completion Rate" value={isLoading ? '—' : `${kpis.completionRate}%`} icon={ActivityPulse} color="#16A34A" bg="#F0FDF4" iconVariant="light" />
          <KpiCard label="In Maintenance" value={isLoading ? '—' : kpis.inMaintenance.toString()} icon={MaintenanceWrench} color="#D97706" bg="#FFFBEB" iconVariant="light" />
          <KpiCard label="Total Maintenance Cost" value={isLoading ? '—' : sar(kpis.totalMaintenanceCost)} icon={Gear} color="#DC2626" bg="#FEF2F2" iconVariant="light" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          <div className="bg-white border border-black/[0.08] rounded-lg p-5 shadow-sm">
            <div className="mb-6">
              <h3 className="text-sm font-bold text-[#111]">Trips per Vehicle</h3>
              <p className="text-xs text-[#6E6E80]">Completed vs total trips — busiest 8 vehicles</p>
            </div>
            <div className="h-[280px]">
              {chartState === 'ready' && tripsByVehicle.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tripsByVehicle} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F2" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9898A4' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9898A4' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: '#F5F5F7' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    <Bar dataKey="Total" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Completed" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <ChartFallback empty={tripsByVehicle.length === 0} />}
            </div>
          </div>

          <div className="bg-white border border-black/[0.08] rounded-lg p-5 shadow-sm">
            <div className="mb-6">
              <h3 className="text-sm font-bold text-[#111]">Maintenance Cost per Vehicle</h3>
              <p className="text-xs text-[#6E6E80]">Total recorded maintenance spend (SAR)</p>
            </div>
            <div className="h-[280px]">
              {chartState === 'ready' && maintenanceByVehicle.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={maintenanceByVehicle} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F2" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9898A4' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9898A4' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                    <Tooltip formatter={(v) => sar(Number(v))} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="cost" name="Maintenance (SAR)" fill="#DC2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <ChartFallback empty={maintenanceByVehicle.length === 0} />}
            </div>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
