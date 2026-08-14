import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, Upload, CheckCircle2, FileSpreadsheet, Sparkles, RefreshCw, AlertCircle, BarChart3 } from 'lucide-react';
import { format, subDays, startOfMonth, subMonths, startOfWeek } from 'date-fns';
import { toast } from 'sonner';

import DashboardLayout from '@/components/layout/DashboardLayout';
import KpiCard from '@/components/ui/KpiCard';
import { TruckMotion, RevenueChart } from '@/components/ui/kpi-icons';
import Btn from '@/components/ui/Btn';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { reportsService } from '@/services/reportsService';
import { customerService } from '@/services/customerService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';

import { exportExcelTable } from '@/utils/exportUtils';
import { inspectExcelTemplate, generateCustomTemplateExcel, TemplateInspectionResult } from '@/utils/customTemplateExport';
import ReportsHeader from '@/components/reports/ReportsHeader';

type DatePreset = 'this_week' | 'this_month' | 'last_month' | 'custom';
type EntityType = 'drivers' | 'trips' | 'vehicles' | 'customers';

export default function CustomReportPage() {
  const [preset, setPreset] = useState<DatePreset>('this_month');
  const [customerId, setCustomerId] = useState<string>('all');
  
  // Custom date range state
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  // Client Excel Template State
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<TemplateInspectionResult | null>(null);
  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [selectedEntity, setSelectedEntity] = useState<EntityType>('trips');

  const { data: customersResponse } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerService.getAll(),
  });

  const customers = useMemo(() => {
    return Array.isArray(customersResponse) ? customersResponse : (customersResponse as any)?.data || [];
  }, [customersResponse]);

  // Query drivers for custom template export
  const { data: driversResponse } = useQuery({
    queryKey: ['drivers-export-pool'],
    queryFn: () => driverService.getAll({ per_page: 500 }),
    enabled: selectedEntity === 'drivers',
  });

  // Query vehicles for custom template export
  const { data: vehiclesResponse } = useQuery({
    queryKey: ['vehicles-export-pool'],
    queryFn: () => vehicleService.getAll({ per_page: 500 }),
    enabled: selectedEntity === 'vehicles',
  });

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

  // Query custom report
  const { data: reportData, isLoading, refetch } = useQuery({
    queryKey: ['custom-report', startDate, endDate, customerId],
    queryFn: () => reportsService.getCustomReport({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      customerId: customerId !== 'all' ? customerId : undefined,
    }),
  });

  const handleTemplateFileUpload = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please select a valid Excel file (.xlsx)');
      return;
    }

    setTemplateFile(file);
    setIsInspecting(true);
    try {
      const res = await inspectExcelTemplate(file);
      setInspection(res);
      if (res.detectedEntity !== 'unknown') {
        setSelectedEntity(res.detectedEntity);
      }
      toast.success(`Template inspected! Found sheet "${res.sheetInfo?.sheetName || res.allSheets[0]}"`);
    } catch (e: any) {
      toast.error(e.message || 'Failed to parse Excel template');
      setInspection(null);
    } finally {
      setIsInspecting(false);
    }
  };

  const handleGenerateFromTemplate = async () => {
    if (!templateFile) {
      toast.error('Upload an Excel template first');
      return;
    }

    setIsGenerating(true);
    try {
      let records: any[] = [];
      if (selectedEntity === 'trips') {
        records = reportData?.trips || [];
      } else if (selectedEntity === 'drivers') {
        records = Array.isArray(driversResponse) ? driversResponse : (driversResponse as any)?.data || [];
      } else if (selectedEntity === 'vehicles') {
        records = Array.isArray(vehiclesResponse) ? vehiclesResponse : (vehiclesResponse as any)?.data || [];
      } else if (selectedEntity === 'customers') {
        records = customers;
      }

      if (!records || records.length === 0) {
        toast.warning(`No database records available for ${selectedEntity}`);
        setIsGenerating(false);
        return;
      }

      const outName = `${templateFile.name.replace(/\.[^/.]+$/, '')}_populated_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
      await generateCustomTemplateExcel(templateFile, records, outName);
      toast.success(`Custom Client Excel generated with ${records.length} records!`);
    } catch (err: any) {
      console.error('Template export error:', err);
      toast.error(err.message || 'Failed to generate Excel file');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCSV = async () => {
    if (!reportData?.trips || reportData.trips.length === 0) return;
    
    const headers = [
      'S/L', 'DATE', 'JOB #', 'DRIVER NAME', 'VEHICLE NO:', 'VEHICLE TYPE',
      'MOBILE NUMBER', 'ASTOOL AL SHAHLA OR 3RD PARTY', 'SENDER/CUSTOMER',
      'RECEIVER', 'WAITING/LABOR CHARGES', 'ADDITIONAL STOPS', 'BILLING AMOUNT',
      'TOTAL AMOUNT', 'TRIP CHARGES', 'BALANCE AMOUNT', 'COMPANY NAME'
    ];

    let sumWaitingLabor = 0;
    let sumAdditionalStops = 0;
    let sumBilling = 0;
    let sumTotal = 0;
    let sumTripCharges = 0;
    let sumBalance = 0;

    const rows = reportData.trips.map((t: any, index: number) => {
      const waiting = Number(t.waiting_labor_charges || 0);
      const stops = Number(t.additional_stop_charges || 0);
      const billing = Number(t.billing_amount || 0);
      const total = Number(t.total_amount || 0);
      const tripCharges = Number(t.trip_charges || 0);
      const balance = Number(t.balance_amount || 0);

      sumWaitingLabor += waiting;
      sumAdditionalStops += stops;
      sumBilling += billing;
      sumTotal += total;
      sumTripCharges += tripCharges;
      sumBalance += balance;

      return [
        index + 1, format(new Date(t.date), 'dd-MM-yyyy'), t.ref_id || 'N/A',
        t.driver, t.vehicle, t.vehicle_type || '10 TON', t.driver_phone || '',
        t.carrier_name || 'MERCON LOGISTICS', t.customer, t.receiver || '',
        waiting, stops, billing, total, tripCharges, balance, t.company_name || t.customer
      ];
    });

    const summaryRow = [
      'TOTALS', '', '', '', '', '', '', '', '', '',
      sumWaitingLabor, sumAdditionalStops, sumBilling, sumTotal, sumTripCharges, sumBalance, ''
    ];

    const selectedCust = customers.find((c: any) => c.id === customerId);
    const titleText = selectedCust 
      ? `MERCON Trip Ledger Report - ${selectedCust.name || selectedCust.company_name}`
      : 'MERCON Custom Operational & Trip Ledger Report';

    await exportExcelTable(titleText, headers, [...rows, summaryRow], `mercon_trip_ledger_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
  };

  const columns = [
    { header: 'S/L', accessor: (_row: any, idx: number) => <span className="text-gray-400 font-mono text-xs">{idx + 1}</span> },
    { header: 'Date', accessor: (row: any) => format(new Date(row.date), 'dd-MM-yyyy') },
    { header: 'Job #', accessor: (row: any) => <span className="font-mono text-xs font-bold text-brand">{row.ref_id}</span> },
    { header: 'Driver Name', accessor: (row: any) => <span className="font-semibold text-[#111]">{row.driver}</span> },
    { header: 'Vehicle No:', accessor: (row: any) => <span className="font-mono text-xs">{row.vehicle}</span> },
    { header: 'Carrier / Provider', accessor: (row: any) => <span className="text-xs text-gray-600">{row.carrier_name || 'MERCON LOGISTICS'}</span> },
    { header: 'Sender / Customer', accessor: (row: any) => <span className="font-semibold text-[#111]">{row.customer}</span> },
    { header: 'Waiting / Labor', accessor: (row: any) => <span className="font-mono text-xs font-semibold text-amber-700">SAR {Number(row.waiting_labor_charges || 0).toLocaleString()}</span> },
    { header: 'Billing Amount', accessor: (row: any) => <span className="font-mono text-xs font-semibold">SAR {Number(row.billing_amount || 0).toLocaleString()}</span> },
    { header: 'Total Amount', accessor: (row: any) => <span className="font-mono text-xs font-bold text-green-700">SAR {Number(row.total_amount || 0).toLocaleString()}</span> },
    { header: 'Trip Charges', accessor: (row: any) => <span className="font-mono text-xs font-bold text-red-600">SAR {Number(row.trip_charges || 0).toLocaleString()}</span> },
    { header: 'Balance Amount', accessor: (row: any) => <span className="font-mono text-xs font-bold text-indigo-700">SAR {Number(row.balance_amount || 0).toLocaleString()}</span> },
    { header: 'Status', accessor: (row: any) => <StatusBadge status={row.status} /> },
  ];

  return (
    <DashboardLayout active="Reports" title="Custom Generator">
      <div className="px-4 sm:px-6 pb-6 animate-fade-in max-w-[1400px] mx-auto gap-6 flex flex-col">
        <ReportsHeader 
          activeTab="custom" 
          onRefresh={() => refetch()}
          onExport={handleExportCSV}
        />

        {/* ─── CUSTOM CLIENT EXCEL TEMPLATE GENERATOR BANNER ─── */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl border border-indigo-500/20 p-6 shadow-xl text-white relative overflow-hidden">
          <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
          
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-400" /> Client Template Engine
                </Badge>
                <span className="text-xs text-slate-400 font-mono">Custom Excel Stylist</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Upload Customer Excel & Export in Their Style
              </h2>
              <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                Upload any client's custom Excel spreadsheet template (<code className="text-indigo-300 font-mono">.xlsx</code>). The engine inspects banners, instruction tabs, column layouts, and populates live database records preserving 100% of their visual design.
              </p>
            </div>

            {/* Dropzone & Actions */}
            <div className="w-full lg:w-auto shrink-0 flex flex-col sm:flex-row items-center gap-3">
              <label className="cursor-pointer group relative flex items-center justify-center gap-3 px-5 py-3 rounded-xl border-2 border-dashed border-indigo-400/40 hover:border-indigo-400 bg-white/5 hover:bg-white/10 transition-all text-xs font-semibold text-white w-full sm:w-auto">
                <Upload className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span>{templateFile ? templateFile.name : 'Upload Template (.xlsx)'}</span>
                <input 
                  type="file" 
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleTemplateFileUpload(e.target.files[0]);
                  }}
                />
              </label>

              {templateFile && (
                <button
                  onClick={handleGenerateFromTemplate}
                  disabled={isGenerating || isInspecting}
                  className="w-full sm:w-auto px-5 py-3 rounded-xl bg-brand hover:bg-brand/90 text-white text-xs font-bold shadow-lg shadow-brand/20 transition-all flex items-center justify-center gap-2 shrink-0 disabled:opacity-50"
                >
                  {isGenerating ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>Generate & Export Excel</span>
                </button>
              )}
            </div>
          </div>

          {/* Inspection Summary Bar */}
          {inspection && (
            <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-200">
                  Detected Sheet: <strong className="text-white font-mono">{inspection.sheetInfo?.sheetName}</strong> (Header at Row {inspection.sheetInfo?.headerRowIdx})
                </span>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                  {inspection.sheetInfo?.columns.filter(c => c.mappedField).length || 0} Columns Mapped
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-xs font-medium">Data Target:</span>
                <select
                  value={selectedEntity}
                  onChange={(e) => setSelectedEntity(e.target.value as EntityType)}
                  className="bg-slate-800 text-white border border-slate-700 rounded-lg px-3 py-1 text-xs outline-none focus:border-indigo-400"
                >
                  <option value="trips">Trip Ledger Data</option>
                  <option value="drivers">Drivers Directory</option>
                  <option value="vehicles">Fleet Vehicles</option>
                  <option value="customers">Customers List</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-lg border border-black/[0.08] p-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-bold text-[#111] mb-2">Time Range</label>
              <select 
                value={preset} 
                onChange={(e) => setPreset(e.target.value as DatePreset)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-brand"
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
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#111] mb-2">End Date</label>
                  <input 
                    type="date"
                    value={customEnd}
                    onChange={e => setCustomEnd(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-brand"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold text-[#111] mb-2">Customer</label>
              <select 
                value={customerId} 
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-brand"
              >
                <option value="all">All Customers</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name || c.company_name}</option>
                ))}
              </select>
            </div>

            {(preset === 'custom') ? (
              <div className="md:col-span-1">
                <Btn label="Generate Report" onClick={() => refetch()} className="w-full" disabled={!customStart || !customEnd} />
              </div>
            ) : null}
          </div>
        </div>

        {/* KPIs */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            <div className="h-28 bg-black/5 rounded-lg"></div>
            <div className="h-28 bg-black/5 rounded-lg"></div>
            <div className="h-28 bg-black/5 rounded-lg"></div>
          </div>
        ) : reportData ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <KpiCard
                label="Total Trips"
                value={reportData.kpis.total_trips.toString()}
                icon={TruckMotion}
                variant="slate"
              />
              <KpiCard
                label="Total Revenue"
                value={`SAR ${reportData.kpis.total_revenue.toLocaleString()}`}
                icon={RevenueChart}
                color="#16A34A"
                bg="#F0FDF4"
                iconVariant="light"
              />
              <div className="bg-white border border-black/[0.08] rounded-lg p-4 shadow-sm flex items-center gap-4">
                <FileText size={28} className="text-orange-500 dark:text-orange-400" />
                <div>
                  <p className="text-xs font-bold text-[#6E6E80] uppercase tracking-wider mb-0.5">Top Status</p>
                  <h3 className="text-xl font-black text-[#111]">
                    {Object.entries(reportData.trip_status_distribution)
                      .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}
                  </h3>
                </div>
              </div>
            </div>

            <div className="flex-1 min-h-0 flex flex-col">
              <DataTable
                title={
                  <span className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-brand" />
                    <span>
                      {customerId !== 'all' && customers.find((c: any) => c.id === customerId)
                        ? `Customer Report: ${customers.find((c: any) => c.id === customerId)?.name || customers.find((c: any) => c.id === customerId)?.company_name}`
                        : "Custom Operational & Trip Ledger Report"}
                    </span>
                  </span>
                }
                columns={columns}
                data={reportData.trips}
                enableSelection={true}
                compact={true}
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
