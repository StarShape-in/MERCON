import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download, FileSpreadsheet, Upload, RefreshCw, Trash2, Building2,
  Sparkles, Plus, Calendar, Filter, Layers, DollarSign, PackageCheck,
} from 'lucide-react';
import { format, subDays, startOfMonth, subMonths, startOfWeek } from 'date-fns';
import { toast } from 'sonner';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/ui/DataTable';
import TemplateMappingEditor from '@/components/reports/TemplateMappingEditor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

import { customerService } from '@/services/customerService';
import {
  reportTemplateService,
  type TemplateInspection,
  type ReportTemplateSummary,
} from '@/services/reportTemplateService';
import { RATE_CATEGORIES, type TemplateLayout } from '@mercon/shared-types';

type DatePreset = 'this_week' | 'this_month' | 'last_month' | 'custom';

export default function CompanyReportsGeneratorPage() {
  const queryClient = useQueryClient();

  const [preset, setPreset] = useState<DatePreset>('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [rateCategoryFilter, setRateCategoryFilter] = useState<string>('all');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Upload → mapping flow state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<TemplateInspection | null>(null);
  const [draftLayout, setDraftLayout] = useState<TemplateLayout | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftCustomerId, setDraftCustomerId] = useState<string>('all');
  const [isInspecting, setIsInspecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { data: customersResponse } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customerService.getAll(),
  });
  const customers = useMemo(() => {
    return Array.isArray(customersResponse) ? customersResponse : (customersResponse as any)?.data || [];
  }, [customersResponse]);

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['report-templates'],
    queryFn: () => reportTemplateService.list(),
  });

  // Auto-select first template when templates load if none selected
  useEffect(() => {
    if (templates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [templates, selectedTemplateId]);

  const { startDate, endDate } = useMemo(() => {
    const today = new Date();
    if (preset === 'this_week') {
      return { startDate: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'), endDate: format(today, 'yyyy-MM-dd') };
    }
    if (preset === 'this_month') {
      return { startDate: format(startOfMonth(today), 'yyyy-MM-dd'), endDate: format(today, 'yyyy-MM-dd') };
    }
    if (preset === 'last_month') {
      const lastMonth = subMonths(today, 1);
      return { startDate: format(startOfMonth(lastMonth), 'yyyy-MM-dd'), endDate: format(subDays(startOfMonth(today), 1), 'yyyy-MM-dd') };
    }
    return { startDate: customStart, endDate: customEnd };
  }, [preset, customStart, customEnd]);

  const filters = {
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    customerId: selectedCustomerId !== 'all' ? selectedCustomerId : undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    rateCategory: rateCategoryFilter !== 'all' ? rateCategoryFilter : undefined,
  };

  const { data: previewData, isFetching: previewLoading } = useQuery({
    queryKey: ['report-template-preview', selectedTemplateId, filters],
    queryFn: () => reportTemplateService.preview(selectedTemplateId, filters),
    enabled: !!selectedTemplateId,
  });

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Compute inline summary totals
  const { totalBilling, totalAmount } = useMemo(() => {
    if (!previewData?.rows || !Array.isArray(previewData.rows)) {
      return { totalBilling: 0, totalAmount: 0 };
    }
    return previewData.rows.reduce(
      (acc: { totalBilling: number; totalAmount: number }, r: any) => ({
        totalBilling: acc.totalBilling + (Number(r.billing_amount) || 0),
        totalAmount: acc.totalAmount + (Number(r.total_amount) || 0),
      }),
      { totalBilling: 0, totalAmount: 0 }
    );
  }, [previewData]);

  /* ─── Upload → inspect → mapping flow ───────────────────────────────────── */
  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xlsm')) {
      toast.error('Please select a valid Excel workbook file (.xlsx)');
      return;
    }
    setUploadFile(file);
    setDraftName(file.name.replace(/\.xlsx?$/i, ''));
    setIsInspecting(true);
    try {
      const result = await reportTemplateService.inspect(file);
      setInspection(result);
      if (result.bestSheet) {
        setDraftLayout({
          sheetName: result.bestSheet.sheetName,
          headerRowIdx: result.bestSheet.headerRowIdx,
          dataStartRow: result.bestSheet.dataStartRow,
          dataEndRow: result.bestSheet.dataEndRow,
          bandSize: result.bestSheet.bandSize,
          columns: result.bestSheet.columns
            .filter((c) => c.suggestedField)
            .map((c) => ({ colIndex: c.colIndex, headerText: c.headerText, source: { kind: 'field' as const, key: c.suggestedField! } })),
        });
        toast.success(`Detected sheet "${result.bestSheet.sheetName}" — confirm column mapping below`);
      } else {
        toast.warning('Could not auto-detect a header row. Map columns manually.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to inspect template');
      setInspection(null);
    } finally {
      setIsInspecting(false);
    }
  };

  const resetUploadFlow = () => {
    setUploadFile(null);
    setInspection(null);
    setDraftLayout(null);
    setDraftName('');
    setDraftCustomerId('all');
    setIsUploadModalOpen(false);
  };

  const handleSaveTemplate = async () => {
    if (!uploadFile || !draftLayout || !draftName.trim()) {
      toast.error('Upload a file and confirm mapping before saving');
      return;
    }
    setIsSaving(true);
    try {
      const saved = await reportTemplateService.create({
        file: uploadFile,
        name: draftName.trim(),
        customerId: draftCustomerId !== 'all' ? draftCustomerId : undefined,
        layout: draftLayout,
      });
      toast.success(`Saved template "${saved.name}"`);
      resetUploadFlow();
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      setSelectedTemplateId(saved.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTemplate = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await reportTemplateService.remove(id);
      toast.success('Template deleted');
      if (selectedTemplateId === id) setSelectedTemplateId('');
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to delete template');
    }
  };

  const handleGenerate = async () => {
    if (!selectedTemplateId) {
      toast.error('Pick a template first');
      return;
    }
    if (!previewData || previewData.total === 0) {
      toast.warning('No trips match the selected filters');
      return;
    }
    setIsGenerating(true);
    try {
      const blob = await reportTemplateService.generate(selectedTemplateId, filters);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const safeName = (selectedTemplate?.name || 'report').replace(/[^a-zA-Z0-9_-]+/g, '_');
      link.href = url;
      link.setAttribute('download', `${safeName}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Report generated successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const previewColumns = [
    { header: 'S/L', accessor: (_row: any, idx: number) => <span className="text-slate-400 font-mono text-xs">{idx + 1}</span> },
    { header: 'Ref ID', accessor: (row: any) => <span className="font-mono text-xs font-bold text-brand">{row.ref_id}</span> },
    { header: 'Date', accessor: (row: any) => (row.date ? format(new Date(row.date), 'dd-MM-yyyy') : '') },
    { header: 'Driver', accessor: (row: any) => row.driver_name },
    { header: 'Vehicle', accessor: (row: any) => row.vehicle_plate },
    { header: 'Customer', accessor: (row: any) => row.customer_name },
    { header: 'Billing', accessor: (row: any) => <span className="font-medium text-slate-700 dark:text-slate-200">SAR {Number(row.billing_amount || 0).toLocaleString()}</span> },
    { header: 'Total', accessor: (row: any) => <span className="font-bold text-slate-900 dark:text-slate-100">SAR {Number(row.total_amount || 0).toLocaleString()}</span> },
  ];

  return (
    <DashboardLayout active="Company Reports" title="Company Reports Studio">
      <div className="px-4 sm:px-6 pb-6 animate-fade-in max-w-[1400px] mx-auto gap-4 flex flex-col">

        {/* ─── Studio Top Header Bar ─── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-black/[0.08] dark:border-slate-800 shadow-2xs">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-brand" /> Company Reports
            </h2>
            <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 font-semibold px-2.5 py-0.5 text-xs">
              <Sparkles className="w-3 h-3 mr-1 text-indigo-500" /> Report Studio
            </Badge>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['report-templates'] })}
              className="h-9 px-3 text-xs gap-1.5 font-semibold text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh ↻
            </Button>
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              size="sm"
              className="h-9 px-3.5 text-xs bg-brand hover:bg-brand-hover text-white font-bold gap-1.5 shadow-xs rounded-lg"
            >
              <Plus className="w-4 h-4" /> Add Company Template
            </Button>
          </div>
        </div>

        {/* ─── Unified Control Toolbar & Filters ─── */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-black/[0.08] dark:border-slate-800 p-4 shadow-2xs space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            
            {/* Report Template Selector */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <FileSpreadsheet className="w-3.5 h-3.5 text-brand" /> Active Format
              </label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger className="h-9 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Select template..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Available Company Formats</SelectLabel>
                    {templatesLoading ? (
                      <SelectItem value="loading" disabled>Loading templates...</SelectItem>
                    ) : templates.length === 0 ? (
                      <SelectItem value="empty" disabled>No formats uploaded</SelectItem>
                    ) : (
                      templates.map((t: ReportTemplateSummary) => (
                        <SelectItem key={t.id} value={t.id}>
                          <span className="flex items-center justify-between w-full gap-2">
                            <span>📄 {t.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({t.customer?.name || 'Shared'})</span>
                          </span>
                        </SelectItem>
                      ))
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {/* Customer Company Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-blue-500" /> Customer Company
              </label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger className="h-9 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="All Customer Companies" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🏢 All Customer Companies</SelectItem>
                  {customers.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      🏢 {c.name || c.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Time Horizon Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" /> Time Horizon
              </label>
              <Select value={preset} onValueChange={(val) => setPreset(val as DatePreset)}>
                <SelectTrigger className="h-9 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="Time horizon" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this_week">📅 This Week</SelectItem>
                  <SelectItem value="this_month">📅 This Month</SelectItem>
                  <SelectItem value="last_month">📅 Last Month</SelectItem>
                  <SelectItem value="custom">📅 Custom Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Trip Status Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-amber-500" /> Trip Status
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">🔀 All Trip Statuses</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="InTransit">In Transit</SelectItem>
                  <SelectItem value="Dispatched">Dispatched</SelectItem>
                  <SelectItem value="AtPickup">At Pickup</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Rate Category Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-purple-500" /> Rate Category
              </label>
              <Select value={rateCategoryFilter} onValueChange={setRateCategoryFilter}>
                <SelectTrigger className="h-9 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700">
                  <SelectValue placeholder="All Rate Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">💰 All Rate Categories</SelectItem>
                  {RATE_CATEGORIES.map((rc) => (
                    <SelectItem key={rc} value={rc}>
                      {rc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {preset === 'custom' && (
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">End Date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-brand"
                />
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              {selectedTemplate ? (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-medium">Selected Format:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedTemplate.name}</span>
                  <Badge variant="outline" className="text-[10px] font-mono bg-slate-50 dark:bg-slate-800">
                    {selectedTemplate.customer?.name || 'Shared / General'}
                  </Badge>
                  <button
                    onClick={(e) => handleDeleteTemplate(selectedTemplate.id, e)}
                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                    title="Delete template"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Please select a company format template to generate report
                </span>
              )}
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !selectedTemplateId}
              className="h-9 px-4 text-xs bg-brand hover:bg-brand-hover text-white font-bold gap-2 shadow-xs rounded-lg"
            >
              {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Generate Excel Report
              {previewData?.total !== undefined && (
                <span className="bg-white/20 text-white font-mono px-1.5 py-0.5 rounded text-[10px]">
                  {previewData.total} trips
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* ─── Full-Focus Live Trip Ledger with Compact Inline Summary ─── */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-black/[0.08] dark:border-slate-800 p-4 shadow-2xs">
          <DataTable
            title={
              <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full pr-4 gap-2">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-brand" />
                  <span className="font-bold text-slate-800 dark:text-slate-100">Live Trip Ledger</span>
                  {selectedTemplate && (
                    <span className="text-xs text-slate-400 font-normal hidden sm:inline">
                      — {selectedTemplate.name}
                    </span>
                  )}
                </div>

                {/* Compact Inline Metrics Strip */}
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs px-2.5 py-1 border border-slate-200 dark:border-slate-700">
                    <PackageCheck className="w-3 h-3 mr-1 text-brand" />
                    {previewData?.total ?? 0} Trips
                  </Badge>
                  <Badge className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-xs px-2.5 py-1 border border-emerald-200 dark:border-emerald-800">
                    <DollarSign className="w-3 h-3 mr-0.5 text-emerald-500" />
                    Billing: SAR {totalBilling.toLocaleString()}
                  </Badge>
                  <Badge className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-mono font-bold text-xs px-2.5 py-1 border border-blue-200 dark:border-blue-800">
                    Total: SAR {totalAmount.toLocaleString()}
                  </Badge>
                </div>
              </div>
            }
            columns={previewColumns}
            data={previewData?.rows ?? []}
            compact={true}
            isLoading={previewLoading}
          />
        </div>

        {/* ─── Add Template Dialog Modal ─── */}
        <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
          <DialogContent className={cn("transition-all duration-300 max-h-[90vh] overflow-y-auto", uploadFile ? "sm:max-w-5xl md:max-w-6xl w-full" : "sm:max-w-2xl")}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                <Plus className="w-4 h-4 text-brand" /> Add Company Excel Template
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Upload a customer's branded Excel file (.xlsx) to inspect layout and configure column mapping.
              </DialogDescription>
            </DialogHeader>

            <div className="mt-2 space-y-4">
              {!uploadFile ? (
                <label className="cursor-pointer group flex flex-col items-center justify-center gap-2.5 px-4 py-8 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-brand bg-slate-50 dark:bg-slate-800/40 hover:bg-brand/5 transition-all text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-brand w-full">
                  <Upload className="w-6 h-6 text-slate-400 group-hover:text-brand group-hover:scale-110 transition-all" />
                  <span className="text-xs font-bold">Upload customer Excel format (.xlsx)</span>
                  <span className="text-[11px] font-normal text-slate-400">Drag & drop or click to browse</span>
                  <input
                    type="file"
                    accept=".xlsx,.xlsm"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleFileSelect(e.target.files[0]);
                    }}
                  />
                </label>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Template Name
                      </label>
                      <input
                        type="text"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-brand"
                        placeholder="e.g. Aramco Monthly Logistics"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                        Target Customer (Optional)
                      </label>
                      <select
                        value={draftCustomerId}
                        onChange={(e) => setDraftCustomerId(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-brand"
                      >
                        <option value="all">Shared / Any Customer</option>
                        {customers.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.name || c.company_name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {isInspecting && (
                    <div className="flex items-center gap-2 text-xs text-slate-500 py-4 justify-center">
                      <RefreshCw className="w-4 h-4 animate-spin text-brand" /> Inspecting workbook structure...
                    </div>
                  )}

                  {inspection && draftLayout && (
                    <>
                      <TemplateMappingEditor inspection={inspection} layout={draftLayout} onChange={setDraftLayout} />
                      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <Button variant="ghost" size="sm" onClick={resetUploadFlow} className="h-9 text-xs">
                          Cancel
                        </Button>
                        <Button onClick={handleSaveTemplate} disabled={isSaving} className="h-9 text-xs bg-brand hover:bg-brand-hover text-white font-bold gap-1.5">
                          {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                          Save Template
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
