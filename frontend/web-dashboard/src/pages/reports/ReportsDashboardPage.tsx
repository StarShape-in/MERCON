import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { TrendingUp, Truck, Users, FileText, AlertTriangle, Download, RotateCw, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import DashboardLayout from '@/components/layout/DashboardLayout';
import KpiCard from '@/components/ui/KpiCard';
import { RevenueChart, TruckMotion, FleetTruck, DriverBadge } from '@/components/ui/kpi-icons';
import Btn from '@/components/ui/Btn';
import { reportsService } from '@/services/reportsService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const CHART_COLORS = ['#E8450F', '#111111', '#16A34A', '#2563EB', '#CA8A04', '#9898A4'];

export default function ReportsDashboardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { data: summary, isLoading, error } = useQuery({
    queryKey: ['reports-summary'],
    queryFn: reportsService.getSummary,
  });

  if (isLoading) {
    return (
      <DashboardLayout active="Reports" title="Reports & Analytics">
        <div className="p-6">
          <div className="animate-pulse grid grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-28 bg-black/5 rounded-lg"></div>)}
          </div>
          <div className="animate-pulse h-96 bg-black/5 rounded-lg"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !summary) {
    return (
      <DashboardLayout active="Reports" title="Reports & Analytics">
        <div className="p-6 text-center text-[#6E6E80] mt-20">
          <AlertTriangle size={48} className="mx-auto mb-4 text-red-500 opacity-50" />
          Failed to load reports. Make sure the analytics engine is online.
        </div>
      </DashboardLayout>
    );
  }

  const { kpis, trip_status_distribution, monthly_revenue_chart } = summary;

  const donutData = Object.entries(trip_status_distribution || {}).map(([name, value]) => ({
    name,
    value,
  })).filter(d => d.value > 0);

  return (
    <DashboardLayout 
      active="Reports" 
      title="Reports" 
    >
      <div className="px-6 pb-6 h-full flex flex-col animate-fade-in gap-5">
        
        {/* Page Content Header Row */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-2xs">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Reports
                </h1>
                <Badge variant="outline" className="bg-indigo-50 text-indigo-600 border-indigo-200/80 text-[10px] font-bold tracking-wide uppercase px-2 py-0.5">
                  Analytics Module
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Scope: Fleet operations, revenue trends, and driver safety reports
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
              onClick={() => navigate('/reports/custom')}
            >
              Build Custom Report
            </Button>

            <Button
              size="sm"
              className="h-9 gap-1.5 text-xs font-bold bg-[#E8450F] hover:bg-[#d03d0c] text-white shadow-xs rounded-md px-4"
              onClick={() => alert('Exporting full analytics report...')}
            >
              <Download className="h-4 w-4" />
              Export Report
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 text-slate-600 border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
              onClick={async () => {
                setIsRefreshing(true);
                await queryClient.invalidateQueries({ queryKey: ['reports-summary'] });
                setTimeout(() => setIsRefreshing(false), 500);
              }}
              title="Refresh Data"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <KpiCard
            title="Total Revenue (Month)"
            value={`SAR ${kpis?.revenue_this_month?.value?.toLocaleString() || '0'}`}
            variant="emerald"
            trend="up"
            trendValue={kpis?.revenue_this_month?.delta ? `${kpis.revenue_this_month.delta}%` : '+8.5%'}
            description="vs previous month"
            icon={RevenueChart}
            chartData={monthly_revenue_chart?.map((d: any) => d.revenue || 5000)}
          />
          <KpiCard
            title="Total Trips"
            value={kpis?.total_trips?.value?.toString() || '0'}
            variant="brand"
            trend="up"
            trendValue={kpis?.total_trips?.delta ? `${kpis.total_trips.delta}%` : '+12%'}
            description="completed trips"
            icon={TruckMotion}
            chartData={monthly_revenue_chart?.map((d: any) => d.trips || 10)}
          />
          <KpiCard
            title="Fleet Available"
            value={kpis?.fleet_available?.value?.toString() || '0'}
            variant="blue"
            trend="neutral"
            trendValue="Available"
            description={`${kpis?.fleet_on_trip?.value || 0} Currently on Trip`}
            icon={FleetTruck}
            chartData={[12, 15, 14, 18, 16, 20, 24]}
          />
          <KpiCard
            title="Active Drivers"
            value={kpis?.active_drivers?.value?.toString() || '0'}
            variant="amber"
            trend="neutral"
            trendValue="Active"
            description="Licensed & ready"
            icon={DriverBadge}
            chartData={[10, 14, 12, 16, 18, 17, 21]}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 bg-white border border-black/[0.08] rounded-lg p-6 shadow-sm">
            <h3 className="text-sm font-bold text-[#111] mb-6">Monthly Revenue Trend</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly_revenue_chart || []} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#00000010" />
                  <XAxis 
                    dataKey="month" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6E6E80', fontSize: 12, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6E6E80', fontSize: 12, fontWeight: 500 }}
                    tickFormatter={(val) => `SAR ${val / 1000}k`}
                    dx={-10}
                  />
                  <RechartsTooltip 
                    cursor={{ fill: '#00000005' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #00000015', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: any) => [`SAR ${Number(value).toLocaleString()}`, 'Revenue']}
                  />
                  <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={50}>
                    {(monthly_revenue_chart || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === (monthly_revenue_chart?.length || 1) - 1 ? '#E8450F' : '#E8450F40'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-black/[0.08] rounded-lg p-6 shadow-sm flex flex-col">
            <h3 className="text-sm font-bold text-[#111] mb-6">Trip Status Distribution</h3>
            <div className="flex-1 flex flex-col justify-center relative min-h-[200px]">
              {donutData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ fontWeight: 600, fontSize: '12px' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle"
                      formatter={(value) => <span className="text-xs font-semibold text-[#111]">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-[#6E6E80] text-xs font-medium">No trip data available</div>
              )}
            </div>
          </div>
        </div>

        {/* Compliance Row */}
        <div className="bg-white border border-black/[0.08] rounded-lg p-6 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111]">Compliance Alert</h3>
              <p className="text-xs text-[#6E6E80] font-medium mt-0.5">
                <span className="text-red-600 font-bold">{kpis?.docs_expiring_soon?.value || 0}</span> documents are expiring within 30 days.
              </p>
            </div>
          </div>
          <Btn label="View Documents" variant="outline" />
        </div>
      </div>
    </DashboardLayout>
  );
}
