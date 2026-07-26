import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Users, AlertTriangle, CheckCircle2, Route } from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';

import DashboardLayout from '@/components/layout/DashboardLayout';
import KpiCard from '@/components/ui/KpiCard';
import Btn from '@/components/ui/Btn';
import { reportsService, type DriverPerfRow } from '@/services/reportsService';

/** AI risk score → level. Lower is safer. */
function riskLevel(score: number | null): { label: string; cls: string } {
  if (score == null) return { label: 'N/A', cls: 'bg-[#F5F5F7] text-[#6E6E80]' };
  if (score < 4) return { label: 'Low', cls: 'bg-[#F0FDF4] text-[#16A34A]' };
  if (score < 7) return { label: 'Medium', cls: 'bg-[#FFFBEB] text-[#D97706]' };
  return { label: 'High', cls: 'bg-[#FEF2F2] text-[#DC2626]' };
}

export default function DriverPerformancePage() {
  const { data: rows = [], isLoading, isError } = useQuery({
    queryKey: ['reports', 'drivers'],
    queryFn: reportsService.getDriverPerformance,
  });

  const kpis = useMemo(() => {
    const totalDrivers = rows.length;
    const available = rows.filter((d) => d.status === 'Available').length;
    const scored = rows.filter((d) => d.ai_risk_score != null);
    const avgRisk = scored.length ? (scored.reduce((s, d) => s + (d.ai_risk_score ?? 0), 0) / scored.length) : null;
    const totalTrips = rows.reduce((s, d) => s + d.total_trips, 0);
    return { totalDrivers, available, avgRisk, totalTrips };
  }, [rows]);

  const tripsByDriver = useMemo(
    () => [...rows]
      .sort((a, b) => b.completed_trips - a.completed_trips)
      .slice(0, 8)
      .map((d) => ({ name: d.name.split(' ')[0] || d.ref_id || '—', trips: d.completed_trips })),
    [rows],
  );

  const scatter = useMemo(
    () => rows
      .filter((d) => d.ai_risk_score != null)
      .map((d) => ({ x: d.total_trips, y: d.ai_risk_score as number, z: d.completed_trips, name: d.name })),
    [rows],
  );

  const topDrivers = useMemo(
    () => [...rows].sort((a, b) => b.completed_trips - a.completed_trips).slice(0, 5),
    [rows],
  );

  const completion = (d: DriverPerfRow) => (d.total_trips > 0 ? Math.round((d.completed_trips / d.total_trips) * 100) : 0);

  const chartState = isLoading ? 'loading' : isError ? 'error' : 'ready';
  const Fallback = ({ empty }: { empty: boolean }) => (
    <div className="h-full flex items-center justify-center text-xs text-[#9898A4]">
      {chartState === 'loading' ? 'Loading…' : chartState === 'error' ? 'Failed to load.' : empty ? 'No data yet.' : ''}
    </div>
  );

  return (
    <DashboardLayout
      active="Reports"
      breadcrumb="Reports"
      title="Driver Performance"
      pageTitle="Driver Performance & Safety"
      pageSub="Trips handled and AI risk scores per driver."
      actions={<Btn label="Export" variant="outline" icon={<Download size={14} />} />}
    >
      <div className="px-6 pb-6">

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard label="Total Drivers" value={isLoading ? '—' : kpis.totalDrivers.toString()} icon={Users} color="#2563EB" bg="#EFF6FF" />
          <KpiCard label="Available Now" value={isLoading ? '—' : kpis.available.toString()} icon={CheckCircle2} color="#16A34A" bg="#F0FDF4" />
          <KpiCard label="Avg. Risk Score" value={isLoading ? '—' : (kpis.avgRisk == null ? 'N/A' : kpis.avgRisk.toFixed(1))} icon={AlertTriangle} color="#DC2626" bg="#FEF2F2" />
          <KpiCard label="Total Trips" value={isLoading ? '—' : kpis.totalTrips.toLocaleString()} icon={Route} color="#D97706" bg="#FFFBEB" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          <div className="bg-white border border-black/[0.08] rounded-lg p-5 shadow-sm">
            <div className="mb-6">
              <h3 className="text-sm font-bold text-[#111]">Completed Trips per Driver</h3>
              <p className="text-xs text-[#6E6E80]">Busiest 8 drivers</p>
            </div>
            <div className="h-[280px]">
              {chartState === 'ready' && tripsByDriver.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tripsByDriver} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F2" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9898A4' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#9898A4' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: '#F5F5F7' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Bar dataKey="trips" name="Completed Trips" fill="#2563EB" radius={[4, 4, 0, 0]} barSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <Fallback empty={tripsByDriver.length === 0} />}
            </div>
          </div>

          <div className="bg-white border border-black/[0.08] rounded-lg p-5 shadow-sm">
            <div className="mb-6">
              <h3 className="text-sm font-bold text-[#111]">Risk vs Trip Volume</h3>
              <p className="text-xs text-[#6E6E80]">Risk score (Y) relative to total trips (X)</p>
            </div>
            <div className="h-[280px]">
              {chartState === 'ready' && scatter.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F2" />
                    <XAxis type="number" dataKey="x" name="Trips" tick={{ fontSize: 11, fill: '#9898A4' }} axisLine={false} tickLine={false} />
                    <YAxis type="number" dataKey="y" name="Risk" domain={[0, 10]} tick={{ fontSize: 11, fill: '#9898A4' }} axisLine={false} tickLine={false} />
                    <ZAxis type="number" dataKey="z" range={[100, 400]} name="Completed" />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                    <Scatter name="Drivers" data={scatter} fill="#E8450F" opacity={0.8} />
                  </ScatterChart>
                </ResponsiveContainer>
              ) : <Fallback empty={scatter.length === 0} />}
            </div>
          </div>

        </div>

        {/* Top Drivers Table */}
        <div className="bg-white rounded-lg border border-black/[0.06] shadow-sm overflow-hidden">
          <div className="p-5 border-b border-black/[0.04] bg-[#FAFAFA]">
            <h3 className="text-sm font-bold text-[#111]">Top Drivers by Completed Trips</h3>
          </div>

          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-black/[0.04]">
                <th className="px-5 py-3 font-semibold text-[10px] uppercase text-[#9898A4] tracking-wider">Driver</th>
                <th className="px-5 py-3 font-semibold text-[10px] uppercase text-[#9898A4] tracking-wider">Completed / Total</th>
                <th className="px-5 py-3 font-semibold text-[10px] uppercase text-[#9898A4] tracking-wider">Completion %</th>
                <th className="px-5 py-3 font-semibold text-[10px] uppercase text-[#9898A4] tracking-wider">AI Risk Level</th>
              </tr>
            </thead>
            <tbody>
              {topDrivers.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-xs text-[#9898A4]">{isLoading ? 'Loading…' : 'No drivers yet.'}</td></tr>
              ) : topDrivers.map((d) => {
                const risk = riskLevel(d.ai_risk_score);
                return (
                  <tr key={d.id} className="border-b border-black/[0.04] hover:bg-[#FAFAFA] transition-colors last:border-0">
                    <td className="px-5 py-3.5"><span className="font-semibold text-[#111]">{d.name}</span></td>
                    <td className="px-5 py-3.5 text-[#444] font-medium">{d.completed_trips} / {d.total_trips}</td>
                    <td className="px-5 py-3.5"><span className="font-bold text-[#16A34A]">{completion(d)}%</span></td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${risk.cls}`}>{risk.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </DashboardLayout>
  );
}
