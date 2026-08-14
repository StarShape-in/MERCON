import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Download, FileSpreadsheet, Upload, CheckCircle2, RefreshCw, 
  Sparkles, Layers, Calendar as CalendarIcon, Filter, Building2, 
  FileText, Truck, AlertTriangle, ArrowRight, BookmarkPlus, Trash2
} from 'lucide-react';
import { format, subDays, startOfMonth, subMonths, startOfWeek } from 'date-fns';
import { toast } from 'sonner';

import DashboardLayout from '@/components/layout/DashboardLayout';
import KpiCard from '@/components/ui/KpiCard';
import { RevenueChart, TruckMotion, FleetTruck, DriverBadge } from '@/components/ui/kpi-icons';
import Btn from '@/components/ui/Btn';
import DataTable from '@/components/ui/DataTable';
import StatusBadge from '@/components/ui/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import ReportsHeader from '@/components/reports/ReportsHeader';
import { reportsService } from '@/services/reportsService';
import { customerService } from '@/services/customerService';
import { exportExcelTable } from '@/utils/exportUtils';
import { 
  inspectExcelTemplate, 
  generateCustomTemplateExcel, 
  TemplateInspectionResult,
  getSavedCompanyTemplates,
  saveCompanyTemplatePreset,
  fileToBase64,
  base64ToArrayBuffer,
  SavedTemplatePreset
} from '@/utils/customTemplateExport';

type DatePreset = 'this_week' | 'this_month' | 'last_month' | 'custom';

export default function CompanyReportTemplatesPage() {
  const [preset, setPreset] = useState<DatePreset>('this_month');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Custom date range state
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  // Template state
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateBuffer, setTemplateBuffer] = useState<ArrayBuffer | null>(null);
  const [templateName, setTemplateName] = useState<string>('');
  const [inspection, setInspection] = useState<TemplateInspectionResult | null>(null);
  const [isInspecting, setIsInspecting] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  // Saved Presets state
  const [savedPresets, setSavedPresets] = useState<SavedTemplatePreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('none');

  useEffect(() => {
    setSavedPresets(getSavedCompanyTemplates());
  }, []);

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

  // Query custom trip report data for selected customer company
  const { data: reportData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['company-template-trips', startDate, endDate, selectedCustomerId],
    queryFn: () => reportsService.getCustomReport({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      customerId: selectedCustomerId !== 'all' ? selectedCustomerId : undefined,
    }),
  });

  // Filtered trips dataset
  const filteredTrips = useMemo(() => {
    if (!reportData?.trips) return [];
    if (statusFilter === 'all') return reportData.trips;
    return reportData.trips.filter((t: any) => t.status?.toLowerCase() === statusFilter.toLowerCase());
  }, [reportData?.trips, statusFilter]);

  // Calculate totals
  const totalBilling = useMemo(() => {
    return filteredTrips.reduce((acc: number, t: any) => acc + Number(t.billing_amount || t.total_amount || 0), 0);
  }, [filteredTrips]);

  const uniqueDriversCount = useMemo(() => {
    const drivers = new Set(filteredTrips.map((t: any) => t.driver).filter(Boolean));
    return drivers.size;
  }, [filteredTrips]);

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Please select a valid Excel workbook file (.xlsx)');
      return;
    }

    setTemplateFile(file);
    setTemplateName(file.name);
    setSelectedPresetId('none');
    setIsInspecting(true);

    try {
      const buf = await file.arrayBuffer();
      setTemplateBuffer(buf);

      const res = await inspectExcelTemplate(buf);
      setInspection(res);
      toast.success(`Excel Template Inspected! Found worksheet "${res.sheetInfo?.sheetName || res.allSheets[0]}"`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to inspect Excel template');
      setInspection(null);
    } finally {
      setIsInspecting(false);
    }
  };

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (presetId === 'none') return;

    const target = savedPresets.find(p => p.id === presetId);
    if (target) {
      const buf = base64ToArrayBuffer(target.dataBase64);
      setTemplateBuffer(buf);
      setTemplateName(target.templateName);
      setTemplateFile(null);
      
      inspectExcelTemplate(buf).then(res => {
        setInspection(res);
        toast.success(`Loaded preset template "${target.templateName}" for ${target.companyName}`);
      }).catch(err => {
        toast.error('Failed to load preset template');
      });
    }
  };

  const handleSaveAsPreset = async () => {
    if (!templateFile) {
      toast.error('Upload an Excel file first before saving as a preset');
      return;
    }

    const selectedCustObj = customers.find((c: any) => c.id === selectedCustomerId);
    const companyName = selectedCustObj ? (selectedCustObj.name || selectedCustObj.company_name) : 'General Client';

    try {
      const base64 = await fileToBase64(templateFile);
      const saved = saveCompanyTemplatePreset({
        companyId: selectedCustomerId,
        companyName,
        templateName: templateFile.name,
        dataBase64: base64,
      });

      setSavedPresets(getSavedCompanyTemplates());
      setSelectedPresetId(saved.id);
      toast.success(`Saved template preset "${templateFile.name}" for ${companyName}`);
    } catch (e) {
      toast.error('Failed to save template preset');
    }
  };

  const handleGenerateCompanyExcel = async () => {
    if (!templateBuffer) {
      toast.error('Please upload or select a company Excel template first');
      return;
    }

    if (filteredTrips.length === 0) {
      toast.warning('No trips match the selected company and date filters');
      return;
    }

    setIsGenerating(true);
    try {
      const selectedCustObj = customers.find((c: any) => c.id === selectedCustomerId);
      const companySlug = selectedCustObj 
        ? (selectedCustObj.name || selectedCustObj.company_name).toLowerCase().replace(/[^a-z0-9]+/g, '_')
        : 'company';
      
      const outFilename = `${companySlug}_trips_report_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
      
      await generateCustomTemplateExcel(templateBuffer, filteredTrips, outFilename);
      toast.success(`Successfully generated & downloaded ${outFilename} matching company format!`);
    } catch (err: any) {
      console.error('Company report export error:', err);
      toast.error(err.message || 'Failed to generate company Excel report');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportCSVFallback = async () => {
    if (!filteredTrips || filteredTrips.length === 0) return;

    const headers = [
      'S/L', 'DATE', 'JOB #', 'DRIVER NAME', 'VEHICLE NO:', 'VEHICLE TYPE',
      'MOBILE NUMBER', 'CARRIER / 3RD PARTY', 'SENDER/CUSTOMER',
      'RECEIVER', 'WAITING/LABOR CHARGES', 'ADDITIONAL STOPS', 'BILLING AMOUNT',
      'TOTAL AMOUNT', 'TRIP CHARGES', 'BALANCE AMOUNT'
    ];

    const rows = filteredTrips.map((t: any, idx: number) => [
      idx + 1,
      format(new Date(t.date), 'dd-MM-yyyy'),
      t.ref_id || 'N/A',
      t.driver,
      t.vehicle,
      t.vehicle_type || '10 TON',
      t.driver_phone || '',
      t.carrier_name || 'MERCON LOGISTICS',
      t.customer,
      t.receiver || '',
      Number(t.waiting_labor_charges || 0),
      Number(t.additional_stop_charges || 0),
      Number(t.billing_amount || 0),
      Number(t.total_amount || 0),
      Number(t.trip_charges || 0),
      Number(t.balance_amount || 0)
    ]);

    const selectedCustObj = customers.find((c: any) => c.id === selectedCustomerId);
    const titleText = selectedCustObj 
      ? `MERCON Trip Ledger - ${selectedCustObj.name || selectedCustObj.company_name}`
      : 'MERCON Company Trip Ledger Export';

    await exportExcelTable(titleText, headers, rows, `company_trips_export_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const columns = [
    { header: 'S/L', accessor: (_row: any, idx: number) => <span className="text-slate-400 font-mono text-xs">{idx + 1}</span> },
    { header: 'Date', accessor: (row: any) => format(new Date(row.date), 'dd-MM-yyyy') },
    { header: 'Job / Ref #', accessor: (row: any) => <span className="font-mono text-xs font-bold text-brand">{row.ref_id}</span> },
    { header: 'Driver Name', accessor: (row: any) => <span className="font-semibold text-slate-900">{row.driver}</span> },
    { header: 'Vehicle Plate', accessor: (row: any) => <span className="font-mono text-xs font-medium bg-slate-100 px-2 py-0.5 rounded">{row.vehicle}</span> },
    { header: 'Customer / Company', accessor: (row: any) => <span className="font-semibold text-slate-800">{row.customer}</span> },
    { header: 'Carrier Provider', accessor: (row: any) => <span className="text-xs text-slate-500">{row.carrier_name || 'MERCON LOGISTICS'}</span> },
    { header: 'Labor / Waiting', accessor: (row: any) => <span className="font-mono text-xs font-semibold text-amber-700">SAR {Number(row.waiting_labor_charges || 0).toLocaleString()}</span> },
    { header: 'Billing Amount', accessor: (row: any) => <span className="font-mono text-xs font-bold text-slate-900">SAR {Number(row.billing_amount || 0).toLocaleString()}</span> },
    { header: 'Total Amount', accessor: (row: any) => <span className="font-mono text-xs font-bold text-emerald-700">SAR {Number(row.total_amount || 0).toLocaleString()}</span> },
    { header: 'Status', accessor: (row: any) => <StatusBadge status={row.status} /> },
  ];

  return (
    <DashboardLayout active="Reports" title="Company Excel Reports">
      <div className="px-4 sm:px-6 pb-6 animate-fade-in max-w-[1400px] mx-auto gap-5 flex flex-col">
        
        {/* Header & Navigation */}
        <ReportsHeader 
          activeTab="custom" 
          onRefresh={() => refetch()}
          isRefreshing={isFetching}
          onExport={handleExportCSVFallback}
        />

        {/* Page Context Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-black/[0.08] shadow-2xs">
          <div className="flex items-center gap-3">
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold px-2.5 py-1">
              Customer Formats Module
            </Badge>
            <span className="text-xs text-slate-500 font-medium hidden md:inline">
              Generate company-formatted trip reports matching exact client Excel spreadsheets.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSVFallback}
              className="h-8 text-xs font-semibold gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              Export CSV
            </Button>
            <Button
              size="sm"
              onClick={handleGenerateCompanyExcel}
              disabled={isGenerating || !templateBuffer}
              className="h-8 text-xs bg-brand hover:bg-brand-hover text-white font-bold gap-1.5 shadow-xs"
            >
              {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
              + Generate Company Excel
            </Button>
          </div>
        </div>

        {/* 4-Card Instrument Panel KPI Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="FILTERED COMPANY TRIPS"
            value={filteredTrips.length}
            variant="slate"
            trend="up"
            trendValue={`${filteredTrips.length} Ready`}
            description="Matching selected filters"
            icon={TruckMotion}
          />

          <KpiCard
            title="TOTAL BILLING (SAR)"
            value={`SAR ${totalBilling.toLocaleString()}`}
            variant="emerald"
            trend="up"
            trendValue="100% Billing"
            description="Gross customer billing"
            icon={RevenueChart}
          />

          <KpiCard
            title="ACTIVE COMPANY DRIVERS"
            value={uniqueDriversCount}
            variant="blue"
            trend="neutral"
            trendValue={`${uniqueDriversCount} Drivers`}
            description="Operating on company routes"
            icon={FleetTruck}
          />

          <KpiCard
            title="ACTIVE TEMPLATE"
            value={templateName ? (templateName.length > 18 ? templateName.slice(0, 16) + '...' : templateName) : 'No Template'}
            variant="amber"
            trend={inspection ? 'up' : 'neutral'}
            trendValue={inspection ? `${inspection.sheetInfo?.columns.filter(c => c.mappedField).length || 0} Cols` : 'Upload File'}
            description={inspection?.sheetInfo?.sheetName || 'Ready for upload'}
            icon={FileSpreadsheet}
          />
        </div>

        {/* ─── COMPANY TEMPLATE UPLOADER & PRESET MANAGER BANNER ─── */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl border border-indigo-500/20 p-5 shadow-xl text-white relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 relative z-10">
            
            <div className="max-w-xl">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[11px] font-semibold">
                  <Sparkles className="w-3 h-3 mr-1 text-indigo-400" /> Excel Format Stylist
                </Badge>
                <span className="text-xs text-slate-400 font-mono">Client Excel Generator</span>
              </div>
              <h3 className="text-lg font-extrabold tracking-tight text-white">
                Upload Client Spreadsheet or Select Presets
              </h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Upload any customer's official Excel template file (<code className="text-indigo-300 font-mono">.xlsx</code>). All banners, instruction worksheets, fonts, and colors will be preserved when database trip rows are populated.
              </p>
            </div>

            {/* Uploader Box */}
            <div className="w-full lg:w-auto flex flex-col sm:flex-row items-center gap-3">
              <label className="cursor-pointer group relative flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl border-2 border-dashed border-indigo-400/40 hover:border-indigo-400 bg-white/5 hover:bg-white/10 transition-all text-xs font-semibold text-white w-full sm:w-auto">
                <Upload className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span>{templateFile ? templateFile.name : 'Upload Company Excel (.xlsx)'}</span>
                <input 
                  type="file" 
                  accept=".xlsx, .xls"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                  }}
                />
              </label>

              {templateFile && (
                <Button
                  onClick={handleSaveAsPreset}
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs font-semibold bg-white/10 hover:bg-white/20 border-white/20 text-white gap-1.5"
                >
                  <BookmarkPlus className="w-3.5 h-3.5 text-indigo-300" />
                  Save as Preset
                </Button>
              )}
            </div>
          </div>

          {/* Inspection Details Summary Bar */}
          {inspection && (
            <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-200">
                  Target Sheet: <strong className="text-white font-mono">{inspection.sheetInfo?.sheetName}</strong> (Header at Row {inspection.sheetInfo?.headerRowIdx})
                </span>
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px]">
                  {inspection.sheetInfo?.columns.filter(c => c.mappedField).length || 0} Auto-Mapped Columns
                </Badge>
              </div>

              {templateName && (
                <div className="text-slate-400 text-xs font-mono">
                  File: <span className="text-slate-200">{templateName}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Toolbar & Filter Controls Bar */}
        <div className="bg-white rounded-xl border border-black/[0.08] p-3 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-center">
            
            {/* Customer Company Selector */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Customer Company
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-brand"
              >
                <option value="all">🏢 All Customer Companies</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>
                    🏢 {c.name || c.company_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Horizon Preset */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Time Horizon
              </label>
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value as DatePreset)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-brand"
              >
                <option value="this_week">📅 This Week</option>
                <option value="this_month">📅 This Month</option>
                <option value="last_month">📅 Last Month</option>
                <option value="custom">📅 Custom Range</option>
              </select>
            </div>

            {/* Saved Template Presets */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Template Preset
              </label>
              <select
                value={selectedPresetId}
                onChange={(e) => handleSelectPreset(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-brand"
              >
                <option value="none">📁 Pick Saved Company Preset...</option>
                {savedPresets.map((p) => (
                  <option key={p.id} value={p.id}>
                    📁 {p.companyName} — {p.templateName}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Trip Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-brand"
              >
                <option value="all">🔀 All Trip Statuses</option>
                <option value="completed">Completed</option>
                <option value="intransit">In Transit</option>
                <option value="dispatched">Dispatched</option>
                <option value="atpickup">At Pickup</option>
              </select>
            </div>

          </div>
        </div>

        {/* Trip Ledger Preview Table Section */}
        <div className="bg-white rounded-xl border border-black/[0.08] p-4 shadow-2xs">
          <DataTable
            title={
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-brand" />
                <span>
                  {selectedCustomerId !== 'all' && customers.find((c: any) => c.id === selectedCustomerId)
                    ? `Company Trip Ledger Preview: ${customers.find((c: any) => c.id === selectedCustomerId)?.name || customers.find((c: any) => c.id === selectedCustomerId)?.company_name}`
                    : "Company Trip Ledger Preview"}
                </span>
              </span>
            }
            columns={columns}
            data={filteredTrips}
            enableSelection={true}
            compact={true}
            isLoading={isLoading}
          />
        </div>

      </div>
    </DashboardLayout>
  );
}
