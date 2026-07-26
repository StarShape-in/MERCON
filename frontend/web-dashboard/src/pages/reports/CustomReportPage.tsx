import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Truck, TrendingUp } from 'lucide-react';
import { format, subDays, startOfMonth, subMonths, startOfWeek } from 'date-fns';

import DashboardLayout from '@/components/layout/DashboardLayout';
import KpiCard from '@/components/ui/KpiCard';
import Btn from '@/components/ui/Btn';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { reportsService } from '@/services/reportsService';
import { customerService } from '@/services/customerService';

type DatePreset = 'this_week' | 'this_month' | 'last_month' | 'custom';

export default function CustomReportPage() {
  const [preset, setPreset] = useState<DatePreset>('this_month');
  const [customerId, setCustomerId] = useState<string>('all');
  
  // Custom date range state
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const { data: customersResponse } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerService.getAll(),
  });

  const customers = useMemo(() => {
    return Array.isArray(customersResponse) ? customersResponse : (customersResponse as any)?.data || [];
  }, [customersResponse]);

  // Compute active dates based on preset
  const { startDate, endDate } = useMemo(() => {
    const today = new Date();
    if (preset === 'this_week') {
      return { 
        startDate: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'), 
        endDate: format(today, 'yyyy-MM-dd') 
      };
    }
    if (preset === 'this_month') {
      return { 
        startDate: format(startOfMonth(today), 'yyyy-MM-dd'), 
        endDate: format(today, 'yyyy-MM-dd') 
      };
    }
    if (preset === 'last_month') {
      const lastMonth = subMonths(today, 1);
      const start = startOfMonth(lastMonth);
      const end = subDays(startOfMonth(today), 1);
      return { 
        startDate: format(start, 'yyyy-MM-dd'), 
        endDate: format(end, 'yyyy-MM-dd') 
      };
    }
    return { startDate: customStart, endDate: customEnd };
  }, [preset, customStart, customEnd]);

  // Fetch report data based on current active filters
  const { data: reportData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['custom-report', startDate, endDate, customerId],
    queryFn: () => reportsService.getCustomReport({ startDate, endDate, customerId }),
    enabled: !!startDate || preset !== 'custom' // Don't run automatically if custom is selected but no dates
  });

  const handleGenerate = () => {
    refetch();
  };

  const handleExportCSV = () => {
    if (!reportData?.trips || reportData.trips.length === 0) return;
    
    const headers = ['Ref ID', 'Customer', 'Driver', 'Vehicle', 'Status', 'Date'];
    const rows = reportData.trips.map(t => [
      t.ref_id,
      `"${t.customer}"`,
      `"${t.driver}"`,
      t.vehicle,
      t.status,
      format(new Date(t.date), 'yyyy-MM-dd HH:mm')
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `mercon_custom_report_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    { header: 'Ref ID', accessor: (row: any) => <span className="font-mono text-xs">{row.ref_id}</span> },
    { header: 'Customer', accessor: (row: any) => <span className="font-semibold text-[#111]">{row.customer}</span> },
    { header: 'Driver', accessor: (row: any) => row.driver },
    { header: 'Vehicle', accessor: (row: any) => row.vehicle },
    { header: 'Date', accessor: (row: any) => format(new Date(row.date), 'MMM dd, yyyy HH:mm') },
    { header: 'Status', accessor: (row: any) => <StatusBadge status={row.status} /> },
  ];

  return (
    <DashboardLayout 
      active="Reports" 
      title="Reports & Analytics"
      pageTitle="Custom Report Builder"
      pageSub="Generate instant reports based on specific dates or customers"
      actions={
        <Btn 
          label="Export CSV" 
          variant="outline" 
          icon={<Download size={14} />} 
          onClick={handleExportCSV}
          disabled={!reportData || reportData.trips.length === 0}
        />
      }
    >
      <div className="p-6">
        {/* Filters Section */}
        <div className="bg-white rounded-lg border border-black/[0.08] p-6 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-[#111] mb-2">Time Range</label>
              <select 
                value={preset} 
                onChange={(e) => setPreset(e.target.value as DatePreset)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#E8450F]"
              >
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="custom">Custom Range</option>
              </select>
            </div>

            {preset === 'custom' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-[#111] mb-2">Start Date</label>
                  <input 
                    type="date"
                    value={customStart}
                    onChange={e => setCustomStart(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#E8450F]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#111] mb-2">End Date</label>
                  <input 
                    type="date"
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#E8450F]"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-[#111] mb-2">Customer</label>
              <select 
                value={customerId} 
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#E8450F]"
              >
                <option value="all">All Customers</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.company_name}</option>
                ))}
              </select>
            </div>

            {(preset === 'custom') ? (
              <div className="md:col-span-1">
                <Btn label="Generate Report" onClick={handleGenerate} className="w-full" disabled={!customStart || !customEnd} />
              </div>
            ) : null}
          </div>
        </div>

        {/* KPIs */}
        {(isLoading || isFetching) ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 animate-pulse">
            <div className="h-28 bg-black/5 rounded-lg"></div>
            <div className="h-28 bg-black/5 rounded-lg"></div>
            <div className="h-28 bg-black/5 rounded-lg"></div>
          </div>
        ) : reportData ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              <KpiCard
                label="Total Trips"
                value={reportData.kpis.total_trips.toString()}
                icon={Truck}
                color="#E8450F"
                bg="#E8450F1A"
              />
              <KpiCard
                label="Total Revenue"
                value={`SAR ${reportData.kpis.total_revenue.toLocaleString()}`}
                icon={TrendingUp}
                color="#16A34A"
                bg="#F0FDF4"
              />
              <div className="bg-white border border-black/[0.08] rounded-lg p-4 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
                  <FileText size={20} />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#6E6E80] uppercase tracking-wider mb-0.5">Top Status</p>
                  <h3 className="text-xl font-black text-[#111]">
                    {Object.entries(reportData.trip_status_distribution)
                      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
                  </h3>
                </div>
              </div>
            </div>

            <div className="h-[500px]">
              <DataTable
                columns={columns}
                data={reportData.trips}
                isLoading={false}
              />
            </div>
          </>
        ) : (
          <div className="text-center text-[#6E6E80] py-12">
            No data generated yet. Adjust your filters above to build a report.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
