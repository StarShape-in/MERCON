import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download, FileSpreadsheet, Upload, RefreshCw, Trash2, Building2,
  Sparkles, Plus, Calendar, Filter, Layers, DollarSign, PackageCheck,
  FileText, ExternalLink, Navigation, CheckCircle2, Truck, MapPin, Tag,
} from 'lucide-react';
import { format, subDays, startOfMonth, subMonths, startOfWeek } from 'date-fns';
import { toast } from 'sonner';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/ui/DataTable';
import TemplateMappingEditor from '@/components/reports/TemplateMappingEditor';
import { cn } from '@/lib/utils';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
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
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

type DatePreset = 'this_week' | 'this_month' | 'last_month' | 'custom';

// (Maps removed from this page)



export default function CompanyReportsGeneratorPage() {
  const queryClient = useQueryClient();
  const tz = useDeploymentTimezone();

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
    queryFn: () => customerService.getAll({ per_page: 500, mode: 'lookup' }),
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

  /* ─── Upload & Auto-Save Flow ───────────────────────────────────────────── */
  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xlsm')) {
      toast.error('Please select a valid Excel workbook file (.xlsx)');
      return;
    }
    const targetName = draftName.trim() || file.name.replace(/\.xlsx?$/i, '');
    setIsInspecting(true);
    setIsSaving(true);
    try {
      const result = await reportTemplateService.inspect(file);
      if (result.bestSheet) {
        const autoLayout = {
          sheetName: result.bestSheet.sheetName,
          headerRowIdx: result.bestSheet.headerRowIdx,
          dataStartRow: result.bestSheet.dataStartRow,
          dataEndRow: result.bestSheet.dataEndRow,
          bandSize: result.bestSheet.bandSize,
          columns: result.bestSheet.columns
            .filter((c) => c.suggestedField)
            .map((c) => ({
              colIndex: c.colIndex,
              headerText: c.headerText,
              source: { kind: 'field' as const, key: c.suggestedField! }
            })),
        };

        const saved = await reportTemplateService.create({
          file,
          name: targetName,
          customerId: draftCustomerId !== 'all' ? draftCustomerId : undefined,
          layout: autoLayout,
        });

        toast.success(`Format "${saved.name}" uploaded and auto-mapped successfully!`);
        resetUploadFlow();
        queryClient.invalidateQueries({ queryKey: ['report-templates'] });
        setSelectedTemplateId(saved.id);
      } else {
        toast.error('Could not auto-detect sheet header structure. Verify the workbook design.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to inspect template');
    } finally {
      setIsInspecting(false);
      setIsSaving(false);
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
    { header: 'Ref ID', accessor: (row: any) => <span className="font-mono text-xs font-semibold text-brand">{row.ref_id}</span> },
    { header: 'Date', accessor: (row: any) => <span className="text-slate-600 dark:text-slate-400 text-xs">{row.planned_start ? formatInDeploymentTz(row.planned_start, tz, 'yyyy-MM-dd') : '—'}</span> },
    {
      header: 'Driver',
      accessor: (row: any) => (
        <span className="text-slate-800 dark:text-slate-200 font-medium text-xs">
          {row.is_third_party ? (row.third_party_driver_name || '3PL Driver') : (row.driver ? `${row.driver.first_name} ${row.driver.last_name}` : 'Unassigned')}
        </span>
      ),
    },
    {
      header: 'Vehicle',
      accessor: (row: any) => (
        <span className="text-slate-800 dark:text-slate-200 font-mono text-xs">
          {row.is_third_party ? (row.third_party_vehicle_plate || '3PL Vehicle') : (row.vehicle?.plate_number || 'Unassigned')}
        </span>
      ),
    },
    { header: 'Customer', accessor: (row: any) => <span className="text-slate-700 dark:text-slate-300 font-medium text-xs">{row.customer?.name || '—'}</span> },
    {
      header: 'Company Name (editable)',
      accessor: (row: any) => (
        <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 min-w-[150px]">
          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <input
            type="text"
            defaultValue={row._companyName || 'MERCON Logistics'}
            onChange={(e) => { row._companyName = e.target.value; }}
            placeholder="Add company name..."
            className="w-full text-xs font-semibold bg-transparent outline-none text-slate-900 dark:text-slate-100"
          />
        </div>
      ),
    },
    {
      header: 'Separate Text (per row)',
      accessor: (row: any) => (
        <div className="flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg px-2 py-1 min-w-[170px]">
          <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <input
            type="text"
            defaultValue={row._separateText || ''}
            onChange={(e) => { row._separateText = e.target.value; }}
            placeholder="Enter separate text..."
            className="w-full text-xs font-semibold bg-transparent outline-none text-slate-900 dark:text-slate-100 placeholder:text-indigo-300"
          />
        </div>
      ),
    },
  ];

  const templateComboboxOptions: ComboboxOption[] = useMemo(() => {
    if (templates.length === 0) return [{ value: '', label: 'No templates uploaded' }];
    return templates.map((t: ReportTemplateSummary) => ({
      value: t.id,
      label: `${t.name} (${t.customer?.name || 'Shared'})`,
      icon: <FileSpreadsheet className="w-3.5 h-3.5 text-brand shrink-0" />,
      keywords: `${t.name} ${t.customer?.name || ''}`,
    }));
  }, [templates]);

  const customerComboboxOptions: ComboboxOption[] = useMemo(() => {
    const list: ComboboxOption[] = [{
      value: 'all',
      label: 'All Customer Companies',
      icon: <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
    }];
    customers.forEach((c: any) => {
      list.push({
        value: c.id,
        label: c.name || c.company_name,
        icon: <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />,
        keywords: c.name || c.company_name,
      });
    });
    return list;
  }, [customers]);

  const presetComboboxOptions: ComboboxOption[] = [
    { value: 'this_week', label: 'This Week', icon: <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> },
    { value: 'this_month', label: 'This Month', icon: <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> },
    { value: 'last_month', label: 'Last Month', icon: <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> },
    { value: 'custom', label: 'Custom Range', icon: <Calendar className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> },
  ];

  const statusComboboxOptions: ComboboxOption[] = [
    { value: 'all', label: 'All Trip Statuses', icon: <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" /> },
    { value: 'Completed', label: 'Completed', icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> },
    { value: 'InTransit', label: 'In Transit', icon: <Truck className="w-3.5 h-3.5 text-blue-500 shrink-0" /> },
    { value: 'Draft', label: 'Scheduled', icon: <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" /> },
    { value: 'AtPickup', label: 'At Pickup', icon: <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" /> },
  ];

  const rateCategoryComboboxOptions: ComboboxOption[] = useMemo(() => {
    const list: ComboboxOption[] = [{
      value: 'all',
      label: 'All Rate Categories',
      icon: <Layers className="w-3.5 h-3.5 text-purple-500 shrink-0" />
    }];
    RATE_CATEGORIES.forEach((rc) => {
      list.push({
        value: rc,
        label: rc,
        icon: <Tag className="w-3.5 h-3.5 text-purple-400 shrink-0" />,
      });
    });
    return list;
  }, []);

  return (
    <DashboardLayout active="Company Reports" title="Company Reports Studio">
      <div className="px-4 sm:px-6 pb-6 w-full flex flex-col animate-fade-in gap-5">

        {/* ─── Studio Top Header Bar ─── */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-brand shrink-0" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Company Reports</h1>
                <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200/80 font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 shadow-none">
                  Report Studio
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['report-template-preview'] })}
              title="Refresh Preview"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── 2-Column Grid Workspace ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Template Directory & Studio Configuration (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-5">
            {/* 1. Format Templates Directory */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-black/[0.08] dark:border-slate-800 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Report Formats</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">Select a company spreadsheet format</p>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                {templatesLoading ? (
                  <div className="text-center py-6 text-xs text-slate-400 font-medium animate-pulse">
                    Loading formats...
                  </div>
                ) : templates.length === 0 ? (
                  <div className="text-center py-8 text-xs text-slate-400 font-medium border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                    No formats uploaded yet
                  </div>
                ) : (
                  templates.map((t) => {
                    const isSelected = selectedTemplateId === t.id;
                    return (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTemplateId(t.id)}
                        className={cn(
                          "p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 relative group",
                          isSelected
                            ? "bg-indigo-50/70 border-indigo-200/80 dark:bg-indigo-950/40 dark:border-indigo-800"
                            : "bg-white border-black/[0.06] hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800/80 dark:hover:bg-slate-800/40"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className={cn(
                              "p-2 rounded-lg shrink-0",
                              isSelected ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300" : "bg-slate-50 text-slate-500 dark:bg-slate-800"
                            )}>
                              <FileSpreadsheet className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate pr-4">
                                {t.name}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate mt-0.5" title={t.original_filename}>
                                {t.original_filename}
                              </div>
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTemplate(t.id, e);
                            }}
                            className="h-6 w-6 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 flex items-center justify-center absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete Format"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-1">
                          <Badge variant="outline" className={cn(
                            "text-[9px] font-bold px-1.5 py-0",
                            t.customerId ? "bg-blue-50/80 text-blue-700 border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                          )}>
                            {t.customer?.name || "Shared"}
                          </Badge>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {(t.file_size / 1024).toFixed(0)} KB
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <Button
                onClick={() => setIsUploadModalOpen(true)}
                size="sm"
                className="w-full h-9 gap-1.5 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 shadow-2xs rounded-lg"
              >
                <Plus className="w-4 h-4" /> Add Company Format
              </Button>
            </div>

            {/* 2. Studio Configuration Filters */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-black/[0.08] dark:border-slate-800 p-5 shadow-2xs space-y-4">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Studio Configuration</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Filter trip records matching the active template</p>
              </div>

              <div className="space-y-4">
                {/* Customer Company Filter */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-blue-500" /> Customer Company
                  </label>
                  <Combobox
                    options={customerComboboxOptions}
                    value={selectedCustomerId}
                    onChange={setSelectedCustomerId}
                    placeholder="All Customer Companies"
                    searchPlaceholder="Search customer company..."
                    disabled={!!selectedTemplate?.customerId}
                    triggerClassName={cn(
                      "w-full h-9 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700",
                      selectedTemplate?.customerId && "opacity-80 cursor-not-allowed bg-slate-100 dark:bg-slate-900"
                    )}
                  />
                  {selectedTemplate?.customerId && (
                    <span className="text-[10px] text-slate-400 font-medium">Locked to template customer context</span>
                  )}
                </div>

                {/* Time Horizon Filter */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-emerald-500" /> Time Horizon
                  </label>
                  <Combobox
                    options={presetComboboxOptions}
                    value={preset}
                    onChange={(val) => setPreset(val as DatePreset)}
                    placeholder="Time horizon"
                    searchPlaceholder="Search preset..."
                    triggerClassName="w-full h-9 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
                  />
                </div>

                {preset === 'custom' && (
                  <div className="grid grid-cols-2 gap-3.5 pt-1.5">
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Start Date</label>
                      <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-brand"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">End Date</label>
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-brand"
                      />
                    </div>
                  </div>
                )}

                {/* Trip Status Filter */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5 text-amber-500" /> Trip Status
                  </label>
                  <Combobox
                    options={statusComboboxOptions}
                    value={statusFilter}
                    onChange={setStatusFilter}
                    placeholder="All Statuses"
                    searchPlaceholder="Search status..."
                    triggerClassName="w-full h-9 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
                  />
                </div>

                {/* Rate Category Filter */}
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-purple-500" /> Rate Category
                  </label>
                  <Combobox
                    options={rateCategoryComboboxOptions}
                    value={rateCategoryFilter}
                    onChange={setRateCategoryFilter}
                    placeholder="All Rate Categories"
                    searchPlaceholder="Search category..."
                    triggerClassName="w-full h-9 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Preview & Action Ledger (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {!selectedTemplateId ? (
              /* Premium Empty State when no format selected */
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-black/[0.08] dark:border-slate-800 p-12 text-center shadow-2xs flex flex-col items-center justify-center min-h-[500px]">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center text-brand mb-4 shrink-0 shadow-2xs animate-pulse">
                  <FileSpreadsheet size={32} />
                </div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  No Active Format Selected
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6 leading-relaxed">
                  Please select an active company format template from the directory panel on the left to open the preview studio and generate reports.
                </p>
              </div>
            ) : (
              <>
                {/* 3-Column Mini KPI Metrics Banner */}
                <div className="grid grid-cols-3 gap-4 shrink-0">
                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs flex flex-col justify-between">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total Trips</span>
                    <span className="text-lg font-black text-slate-900 dark:text-slate-100 font-mono mt-1">
                      {previewData?.total ?? 0}
                    </span>
                  </div>
                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs flex flex-col justify-between">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Billing Outlay</span>
                    <span className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono mt-1 truncate">
                      SAR {totalBilling.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="p-3.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-2xs flex flex-col justify-between">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Subcontract Cost</span>
                    <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono mt-1 truncate">
                      SAR {totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                {/* Primary Report Generation Banner */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-black/[0.08] dark:border-slate-800 p-4 shadow-2xs">
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !selectedTemplateId || !previewData?.total}
                    className="w-full h-11 bg-brand hover:bg-brand-hover text-white font-extrabold text-xs shadow-md rounded-xl flex items-center justify-center gap-2 group transition-all duration-200"
                  >
                    {isGenerating ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 group-hover:translate-y-[0.5px] transition-transform" />
                    )}
                    <span>Generate & Download Excel Report</span>
                    <span className="bg-white/20 text-white font-mono px-2 py-0.5 rounded-md text-[10px]">
                      {previewData?.total ?? 0} Trips
                    </span>
                  </Button>
                </div>

                {/* Filtered Trips Ledger */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-black/[0.08] dark:border-slate-800 p-4 shadow-2xs">
                  <DataTable
                    title={
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                          <Layers className="w-3.5 h-3.5 text-indigo-600" /> Filtered Trips Ledger
                        </span>
                        {selectedTemplate && (
                          <Badge variant="outline" className="text-[10px] font-mono bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {selectedTemplate.name}
                          </Badge>
                        )}
                      </div>
                    }
                    columns={previewColumns}
                    data={previewData?.rows ?? []}
                    compact={true}
                    isLoading={previewLoading}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* ─── Add Template Dialog Modal (Redesigned Zero-Configuration) ─── */}
        <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                <Plus className="w-4 h-4 text-brand" /> Add Company Format
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Upload a company Excel format file. MERCON will automatically inspect and map the layout.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Format Name
                </label>
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-800 dark:text-slate-100 outline-none focus:border-brand"
                  placeholder="e.g. Aramco Monthly Logistics (optional)"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Target Customer (Optional)
                </label>
                <Combobox
                  options={[
                    { value: 'all', label: 'Shared / Any Customer', icon: <Building2 className="w-3.5 h-3.5 text-slate-400" /> },
                    ...customers.map((c: any) => ({
                      value: c.id,
                      label: c.name || c.company_name || 'Customer Account',
                      keywords: `${c.name || ''} ${c.company_name || ''}`,
                      icon: <Building2 className="w-3.5 h-3.5 text-brand" />,
                    })),
                  ]}
                  value={draftCustomerId}
                  onChange={setDraftCustomerId}
                  placeholder="Select target customer..."
                  searchPlaceholder="Search customer..."
                  triggerClassName="w-full h-9 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>

              <div className="space-y-1.5 pt-2">
                {(isInspecting || isSaving) ? (
                  <div className="flex flex-col items-center justify-center gap-3 py-8 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40">
                    <RefreshCw className="w-6 h-6 animate-spin text-brand" />
                    <span className="text-xs text-slate-500 font-semibold animate-pulse">
                      Analyzing and mapping format layout...
                    </span>
                  </div>
                ) : (
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
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}

            






