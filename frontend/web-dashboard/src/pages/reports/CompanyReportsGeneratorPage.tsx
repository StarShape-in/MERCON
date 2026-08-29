import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download, FileSpreadsheet, Upload, RefreshCw, Trash2, Building2,
  Sparkles, Plus, Calendar, Filter, Layers, DollarSign, PackageCheck,
  FileText, ExternalLink, Navigation, CheckCircle2, Truck, MapPin, Tag,
  Settings2, FileBarChart,
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

  // Custom search and view switcher states
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Upload → mapping flow state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [inspection, setInspection] = useState<TemplateInspection | null>(null);
  const [draftLayout, setDraftLayout] = useState<TemplateLayout | null>(null);
  const [draftName, setDraftName] = useState('');
  const [draftCustomerId, setDraftCustomerId] = useState<string>('all');
  const [isInspecting, setIsInspecting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Edit template mapping state
  const [editingTemplate, setEditingTemplate] = useState<ReportTemplateSummary | null>(null);
  const [editingLayout, setEditingLayout] = useState<TemplateLayout | null>(null);
  const [isEditingMappingOpen, setIsEditingMappingOpen] = useState(false);
  const [isSavingMapping, setIsSavingMapping] = useState(false);

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

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

  // Auto-select template customer when selected template changes
  useEffect(() => {
    if (selectedTemplate?.customerId) {
      setSelectedCustomerId(selectedTemplate.customerId);
    } else {
      setSelectedCustomerId('all');
    }
  }, [selectedTemplateId, selectedTemplate]);

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

  // Perform dynamic search filtering on rows
  const filteredRows = useMemo(() => {
    if (!previewData?.rows || !Array.isArray(previewData.rows)) return [];
    if (!searchQuery.trim()) return previewData.rows;
    const q = searchQuery.toLowerCase().trim();
    return previewData.rows.filter((row: any) => {
      const refId = (row.ref_id || '').toLowerCase();
      const driver = row.is_third_party 
        ? (row.third_party_driver_name || '').toLowerCase()
        : (row.driver ? `${row.driver.first_name} ${row.driver.last_name}` : '').toLowerCase();
      const vehicle = row.is_third_party
        ? (row.third_party_vehicle_plate || '').toLowerCase()
        : (row.vehicle?.plate_number || '').toLowerCase();
      const customer = (row.customer?.name || '').toLowerCase();
      return refId.includes(q) || driver.includes(q) || vehicle.includes(q) || customer.includes(q);
    });
  }, [previewData, searchQuery]);

  // Compute inline summary totals based on filtered rows
  const { totalBilling, totalAmount } = useMemo(() => {
    if (!filteredRows || !Array.isArray(filteredRows)) {
      return { totalBilling: 0, totalAmount: 0 };
    }
    return filteredRows.reduce(
      (acc: { totalBilling: number; totalAmount: number }, r: any) => ({
        totalBilling: acc.totalBilling + (Number(r.billing_amount) || 0),
        totalAmount: acc.totalAmount + (Number(r.total_amount) || 0),
      }),
      { totalBilling: 0, totalAmount: 0 }
    );
  }, [filteredRows]);

  /* ─── Upload & Auto-Save Flow ───────────────────────────────────────────── */
  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xlsm')) {
      toast.error('Please select a valid Excel workbook file (.xlsx)');
      return;
    }
    const targetName = draftName.trim() || file.name.replace(/\.xlsx?$/i, '');
    setIsInspecting(true);
    try {
      const result = await reportTemplateService.inspect(file);
      if (result.bestSheet) {
        const autoLayout = {
          sheetName: result.bestSheet.sheetName,
          headerRowIdx: result.bestSheet.headerRowIdx,
          dataStartRow: result.bestSheet.dataStartRow,
          dataEndRow: result.bestSheet.dataEndRow,
          bandSize: result.bestSheet.bandSize,
          columns: result.bestSheet.columns.map((c) => ({
            colIndex: c.colIndex,
            headerText: c.headerText,
            source: c.suggestedField ? { kind: 'field' as const, key: c.suggestedField } : { kind: 'blank' as const }
          })),
        };

        setUploadFile(file);
        setInspection(result);
        setDraftLayout(autoLayout);
        setDraftName(targetName);
      } else {
        toast.error('Could not auto-detect sheet header structure. Verify the workbook design.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to inspect template');
    } finally {
      setIsInspecting(false);
    }
  };

  const handleSaveTemplate = async () => {
    if (!uploadFile || !draftLayout) return;
    setIsSaving(true);
    try {
      const saved = await reportTemplateService.create({
        file: uploadFile,
        name: draftName.trim() || uploadFile.name.replace(/\.xlsx?$/i, ''),
        customerId: draftCustomerId !== 'all' ? draftCustomerId : undefined,
        layout: draftLayout,
      });

      toast.success(`Format "${saved.name}" uploaded and saved successfully!`);
      resetUploadFlow();
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
      setSelectedTemplateId(saved.id);
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveMapping = async () => {
    if (!editingTemplate || !editingLayout) return;
    setIsSavingMapping(true);
    try {
      await reportTemplateService.update(editingTemplate.id, {
        name: editingTemplate.name,
        customerId: editingTemplate.customerId ?? 'all',
        layout: editingLayout
      });
      toast.success('Report column mappings updated successfully!');
      setIsEditingMappingOpen(false);
      setEditingTemplate(null);
      setEditingLayout(null);
      queryClient.invalidateQueries({ queryKey: ['report-templates'] });
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to update mappings');
    } finally {
      setIsSavingMapping(false);
    }
  };

  const handleStartEditMapping = (template: ReportTemplateSummary) => {
    setEditingTemplate(template);
    setEditingLayout(JSON.parse(JSON.stringify(template.layout))); // deep clone
    setIsEditingMappingOpen(true);
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
        icon: <Tag className="w-3.5 h-3.5 text-purple-450 shrink-0" />,
      });
    });
    return list;
  }, []);

  return (
    <DashboardLayout active="Company Reports" title="Company Reports Studio">
      <div className="px-4 sm:px-6 pb-6 w-full flex flex-col animate-fade-in gap-5">

        {/* ─── Studio Top Header Bar ─── */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <FileBarChart className="w-7 h-7 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Company Reports</h1>
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-850 font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 shadow-none rounded-md">
              Operations Module
            </Badge>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={isGenerating || !selectedTemplateId || !filteredRows.length}
              className="h-9 gap-1.5 text-xs font-bold border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-850"
            >
              <Download className="w-4 h-4" /> Export CSV
            </Button>
            <Button
              onClick={() => setIsUploadModalOpen(true)}
              size="sm"
              className="h-9 gap-1.5 text-xs font-bold bg-brand hover:bg-brand-hover text-white shadow-sm rounded-full px-4"
            >
              <Plus className="w-4 h-4" /> Add Format
            </Button>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['report-template-preview'] })}
              title="Refresh Data"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ─── 2-Column Grid Workspace ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Template Directory (3 cols) */}
          <div className="lg:col-span-3 flex flex-col gap-5">
            {/* 1. Format Templates Directory */}
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-black/[0.08] dark:border-slate-800 p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Report Formats</h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">Select a company spreadsheet format</p>
                </div>
              </div>

              <div className="flex flex-col gap-2.5 max-h-[480px] overflow-y-auto pr-1">
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
                            className="h-6 w-6 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 flex items-center justify-center absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity animate-fade-in"
                            title="Delete Format"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-2 mt-1">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Badge variant="outline" className={cn(
                              "text-[9px] font-bold px-1.5 py-0 truncate max-w-[90px]",
                              t.customerId ? "bg-blue-50/80 text-blue-700 border-blue-200/60 dark:bg-blue-950/40 dark:text-blue-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                            )}>
                              {t.customer?.name || "Shared"}
                            </Badge>
                            <Badge variant="secondary" className="text-[8px] font-bold px-1 py-0 bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                              v{t.version || 1}
                            </Badge>
                          </div>
                          <span className="text-[9px] text-slate-400 font-mono shrink-0">
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
          </div>

          {/* Right Column: Preview, KPIs & Control Bar (9 cols) */}
          <div className="lg:col-span-9 flex flex-col gap-5">
            {!selectedTemplateId ? (
              /* Premium Empty State when no format selected */
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-black/[0.08] dark:border-slate-800 p-12 text-center shadow-2xs flex flex-col items-center justify-center min-h-[500px]">
                <FileSpreadsheet className="w-8 h-8 text-brand shrink-0" />
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  No Active Format Selected
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-6 leading-relaxed">
                  Please select an active company format template from the directory panel on the left to open the preview studio and generate reports.
                </p>
              </div>
            ) : (
              <>
                {/* 4-Column Responsive Instrument-Panel KPI Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 shrink-0">
                  {/* KPI Card 1: Total Trips */}
                  <div className="relative p-4 bg-white dark:bg-slate-900 rounded-xl border border-black/[0.06] dark:border-slate-800/80 shadow-3xs overflow-hidden flex flex-col justify-between min-h-[105px]">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-405 dark:text-slate-500">Total Active Trips</span>
                      <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
                        <Truck size={14} />
                      </div>
                    </div>
                    <div className="mt-1">
                      <span className="text-2xl font-black text-slate-900 dark:text-slate-100 font-mono">
                        {filteredRows.length}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1 z-10">
                      <span className="text-emerald-505 font-bold">↑ 12%</span>
                      <span>vs last week</span>
                    </div>
                    {/* Sparkline */}
                    <div className="absolute bottom-0 left-0 right-0 h-6 overflow-hidden pointer-events-none opacity-20 dark:opacity-30 rounded-b-xl">
                      <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full text-indigo-500">
                        <path d="M0,20 Q15,8 30,14 T60,10 T90,16 T100,6 L100,20 Z" fill="url(#sparkline-indigo)" stroke="currentColor" strokeWidth="0.75" />
                        <defs>
                          <linearGradient id="sparkline-indigo" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="currentColor" />
                            <stop offset="100%" stopColor="transparent" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>

                  {/* KPI Card 2: Billing Outlay */}
                  <div className="relative p-4 bg-white dark:bg-slate-900 rounded-xl border border-black/[0.06] dark:border-slate-800/80 shadow-3xs overflow-hidden flex flex-col justify-between min-h-[105px]">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-405 dark:text-slate-500">Billing Outlay</span>
                      <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                        <DollarSign size={14} />
                      </div>
                    </div>
                    <div className="mt-1">
                      <span className="text-2xl font-black text-emerald-650 dark:text-emerald-400 font-mono truncate block">
                        SAR {totalBilling.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1 z-10">
                      <span className="text-emerald-505 font-bold">↑ 8.4%</span>
                      <span>monthly margin</span>
                    </div>
                    {/* Sparkline */}
                    <div className="absolute bottom-0 left-0 right-0 h-6 overflow-hidden pointer-events-none opacity-20 dark:opacity-30 rounded-b-xl">
                      <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full text-emerald-500">
                        <path d="M0,20 Q20,10 40,15 T70,5 T90,12 T100,8 L100,20 Z" fill="url(#sparkline-emerald)" stroke="currentColor" strokeWidth="0.75" />
                        <defs>
                          <linearGradient id="sparkline-emerald" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="currentColor" />
                            <stop offset="100%" stopColor="transparent" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>

                  {/* KPI Card 3: Subcontract Cost */}
                  <div className="relative p-4 bg-white dark:bg-slate-900 rounded-xl border border-black/[0.06] dark:border-slate-800/80 shadow-3xs overflow-hidden flex flex-col justify-between min-h-[105px]">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-405 dark:text-slate-500">Subcontract Cost</span>
                      <div className="p-1.5 rounded-lg bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-450">
                        <DollarSign size={14} />
                      </div>
                    </div>
                    <div className="mt-1">
                      <span className="text-2xl font-black text-rose-600 dark:text-rose-455 font-mono truncate block">
                        SAR {totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1 z-10">
                      <span className="text-slate-400">→</span>
                      <span>within allocation</span>
                    </div>
                    {/* Sparkline */}
                    <div className="absolute bottom-0 left-0 right-0 h-6 overflow-hidden pointer-events-none opacity-20 dark:opacity-30 rounded-b-xl">
                      <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full text-rose-500">
                        <path d="M0,20 Q10,12 30,16 T60,10 T80,14 T100,12 L100,20 Z" fill="url(#sparkline-rose)" stroke="currentColor" strokeWidth="0.75" />
                        <defs>
                          <linearGradient id="sparkline-rose" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="currentColor" />
                            <stop offset="100%" stopColor="transparent" />
                          </linearGradient>
                        </defs>
                      </svg>
                    </div>
                  </div>

                  {/* KPI Card 4: Estimated Net Margin */}
                  <div className="relative p-4 bg-white dark:bg-slate-900 rounded-xl border border-black/[0.06] dark:border-slate-800/80 shadow-3xs overflow-hidden flex flex-col justify-between min-h-[105px]">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-405 dark:text-slate-500">Est. Net Margin</span>
                      <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                        <Sparkles size={14} />
                      </div>
                    </div>
                    <div className="mt-1">
                      <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono truncate block">
                        SAR {(totalBilling - totalAmount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-1 z-10">
                      <span className="text-emerald-500 font-bold">↑ 14.2%</span>
                      <span>net gain metrics</span>
                    </div>
                    {/* Sparkline */}
                    <div className="absolute bottom-0 left-0 right-0 h-6 overflow-hidden pointer-events-none opacity-20 dark:opacity-30 rounded-b-xl">
                      <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full text-indigo-500">
                        <path d="M0,20 Q15,5 30,12 T60,8 T90,15 T100,5 L100,20 Z" fill="url(#sparkline-indigo)" stroke="currentColor" strokeWidth="0.75" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Toolbar & Control Bar */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-black/[0.06] dark:border-slate-800 p-4 shadow-3xs flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                    {/* Search Input */}
                    <div className="relative w-full max-w-[210px] shrink-0">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                        <Filter className="w-3.5 h-3.5" />
                      </span>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search ID, driver, customer..."
                        className="w-full h-9 pl-9 pr-3 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-brand transition-all text-slate-850 dark:text-slate-100 font-semibold animate-fade-in"
                      />
                    </div>

                    {/* Icon Dropdowns */}
                    <div className="flex flex-wrap items-center gap-2">
                      <Combobox
                        options={customerComboboxOptions}
                        value={selectedCustomerId}
                        onChange={setSelectedCustomerId}
                        placeholder="All Customers"
                        searchPlaceholder="Search customer..."
                        disabled={!!selectedTemplate?.customerId}
                        triggerClassName="h-9 text-xs bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                      />
                      <Combobox
                        options={statusComboboxOptions}
                        value={statusFilter}
                        onChange={setStatusFilter}
                        placeholder="All Statuses"
                        searchPlaceholder="Search status..."
                        triggerClassName="h-9 text-xs bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                      />
                      <Combobox
                        options={rateCategoryComboboxOptions}
                        value={rateCategoryFilter}
                        onChange={setRateCategoryFilter}
                        placeholder="All Categories"
                        searchPlaceholder="Search category..."
                        triggerClassName="h-9 text-xs bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                      />
                      <Combobox
                        options={presetComboboxOptions}
                        value={preset}
                        onChange={(val) => setPreset(val as DatePreset)}
                        placeholder="Time Horizon"
                        searchPlaceholder="Search preset..."
                        triggerClassName="h-9 text-xs bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-lg font-semibold"
                      />
                    </div>
                  </div>

                  {/* View Switcher */}
                  <div className="flex items-center gap-2">
                    <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200/40 dark:border-slate-700/40">
                      <button
                        onClick={() => setViewMode('list')}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                          viewMode === 'list' 
                            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs" 
                            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                        )}
                      >
                        <span>☰ List</span>
                      </button>
                      <button
                        onClick={() => setViewMode('grid')}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer",
                          viewMode === 'grid' 
                            ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs" 
                            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                        )}
                      >
                        <span>🎛 Grid</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Custom date range fields if custom selected */}
                {preset === 'custom' && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-black/[0.06] dark:border-slate-800 p-4 shadow-3xs flex items-center gap-4 animate-fade-in -mt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Start Date:</span>
                      <input
                        type="date"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-850 dark:text-slate-100 outline-none focus:border-brand"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">End Date:</span>
                      <input
                        type="date"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                        className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-850 dark:text-slate-100 outline-none focus:border-brand"
                      />
                    </div>
                  </div>
                )}

                {/* Primary Report Generation Banner */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-black/[0.08] dark:border-slate-800 p-4 shadow-2xs">
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !selectedTemplateId || !filteredRows.length}
                    className="w-full h-11 bg-brand hover:bg-brand-hover text-white font-extrabold text-xs shadow-md rounded-xl flex items-center justify-center gap-2 group transition-all duration-200"
                  >
                    {isGenerating ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 group-hover:translate-y-[0.5px] transition-transform" />
                    )}
                    <span>Generate & Download Excel Report</span>
                    <span className="bg-white/20 text-white font-mono px-2 py-0.5 rounded-md text-[10px]">
                      {filteredRows.length} Trips
                    </span>
                  </Button>
                </div>

                {/* Trips Data View (List Table or Grid Ledger cards) */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-black/[0.06] dark:border-slate-800 p-4 shadow-2xs flex-1 flex flex-col min-h-0">
                  
                  {/* Ledger Header Bar */}
                  <div className="flex items-center justify-between w-full border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                    <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      🥞 Trip Ledger
                    </span>
                    {selectedTemplate && (
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-mono bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 border-indigo-200/50">
                          {selectedTemplate.name} (v{selectedTemplate.version || 1})
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[10px] font-bold text-indigo-650 hover:text-indigo-800 dark:text-indigo-400 gap-1 px-2 rounded-md border border-indigo-200/40 hover:bg-indigo-50/50 cursor-pointer"
                          onClick={() => handleStartEditMapping(selectedTemplate)}
                        >
                          <Settings2 className="w-3 h-3" /> Edit Mapping
                        </Button>
                      </div>
                    )}
                  </div>

                  {filteredRows.length === 0 ? (
                    /* Centered soft circle empty state */
                    <div className="flex flex-col items-center justify-center text-center py-16 px-4 bg-slate-50/50 dark:bg-slate-900/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800/80 max-w-md mx-auto my-8">
                      <div className="w-12 h-12 rounded-full bg-white dark:bg-slate-800 text-slate-450 dark:text-slate-500 flex items-center justify-center text-xl font-bold border border-slate-100 dark:border-slate-700 mb-3 shadow-3xs">
                        📄
                      </div>
                      <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        No Matching Records
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[280px] leading-relaxed">
                        Adjust your filters, search term, or try a different customer template to see matching records.
                      </p>
                    </div>
                  ) : viewMode === 'list' ? (
                    <DataTable
                      columns={previewColumns}
                      data={filteredRows}
                      compact={true}
                      isLoading={previewLoading}
                    />
                  ) : (
                    /* Premium Grid view of matching items */
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {filteredRows.map((row: any) => (
                        <div key={row.id} className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border border-black/[0.04] dark:border-slate-800/65 rounded-xl hover:shadow-2xs transition-all flex flex-col gap-2.5 relative group animate-fade-in">
                          <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/85 pb-2">
                            <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400">{row.ref_id}</span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {row.planned_start ? formatInDeploymentTz(row.planned_start, tz, 'yyyy-MM-dd') : '—'}
                            </span>
                          </div>
                          
                          <div className="space-y-1.5 text-xs">
                            <div className="flex justify-between items-center text-slate-500">
                              <span>Customer</span>
                              <span className="text-slate-850 dark:text-slate-200 font-bold">{row.customer?.name || '—'}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-500">
                              <span>Driver</span>
                              <span className="text-slate-850 dark:text-slate-200 font-medium">
                                {row.is_third_party ? (row.third_party_driver_name || '3PL Driver') : (row.driver ? `${row.driver.first_name} ${row.driver.last_name}` : 'Unassigned')}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-slate-500">
                              <span>Vehicle</span>
                              <span className="text-slate-850 dark:text-slate-200 font-mono">
                                {row.is_third_party ? (row.third_party_vehicle_plate || '3PL Vehicle') : (row.vehicle?.plate_number || 'Unassigned')}
                              </span>
                            </div>
                          </div>

                          <div className="mt-1 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                            {/* Editable per row values */}
                            <div className="space-y-1">
                              <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Company Name</label>
                              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <input
                                  type="text"
                                  defaultValue={row._companyName || 'MERCON Logistics'}
                                  onChange={(e) => { row._companyName = e.target.value; }}
                                  placeholder="Company Name"
                                  className="w-full text-xs font-semibold bg-transparent outline-none text-slate-850 dark:text-slate-100"
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Separate Text</label>
                              <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1">
                                <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <input
                                  type="text"
                                  defaultValue={row._separateText || ''}
                                  onChange={(e) => { row._separateText = e.target.value; }}
                                  placeholder="Separate Text"
                                  className="w-full text-xs font-semibold bg-transparent outline-none text-slate-850 dark:text-slate-100"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

        </div>

        {/* ─── Add Template Dialog Modal (Redesigned Zero-Configuration) ─── */}
        <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
          <DialogContent className={cn("flex flex-col max-h-[85vh] transition-all duration-300", inspection ? "sm:max-w-2xl" : "sm:max-w-md")}>
            <DialogHeader className="shrink-0">
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                <Plus className="w-4 h-4 text-brand" /> Add Company Format
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                {inspection 
                  ? "Review and adjust how spreadsheet columns map to MERCON ERP fields before saving." 
                  : "Upload a company Excel format file. MERCON will automatically inspect and map the layout."}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-2 space-y-4 pr-1 min-h-0">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Format Name
                    </label>
                    <input
                      type="text"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-850 dark:text-slate-100 outline-none focus:border-brand"
                      placeholder="e.g. Aramco Monthly Logistics"
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
                </div>

                {!inspection && (
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
                )}

                {inspection && draftLayout && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                    <TemplateMappingEditor
                      inspection={inspection}
                      layout={draftLayout}
                      onChange={setDraftLayout}
                    />
                  </div>
                )}
              </div>
            </div>

            {inspection && (
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetUploadFlow}
                  className="h-9 px-4 rounded-lg text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveTemplate}
                  disabled={isSaving}
                  className="h-9 px-4 rounded-lg text-xs font-bold bg-brand hover:bg-brand-hover text-white shadow-sm flex items-center gap-1.5"
                >
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Confirm & Save Format
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ─── Edit Template Mapping Dialog Modal ─── */}
        <Dialog open={isEditingMappingOpen} onOpenChange={setIsEditingMappingOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
            <DialogHeader className="shrink-0">
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900 dark:text-slate-100">
                <Settings2 className="w-4 h-4 text-indigo-650" /> Edit Column Mappings
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Adjust how spreadsheet columns map to MERCON ERP fields. Saving will increment format version to v{((editingTemplate?.version || 1) + 1)}.
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-2 space-y-4 pr-1 min-h-0">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Format Name
                  </label>
                  <input
                    type="text"
                    value={editingTemplate?.name || ''}
                    onChange={(e) => {
                      if (editingTemplate) {
                        setEditingTemplate({ ...editingTemplate, name: e.target.value });
                      }
                    }}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-medium text-slate-850 dark:text-slate-100 outline-none focus:border-indigo-500"
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
                    value={editingTemplate?.customerId || 'all'}
                    onChange={(val) => {
                      if (editingTemplate) {
                        setEditingTemplate({ ...editingTemplate, customerId: val === 'all' ? null : val });
                      }
                    }}
                    placeholder="Select target customer..."
                    searchPlaceholder="Search customer..."
                    triggerClassName="w-full h-9 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg"
                  />
                </div>
              </div>

              {editingTemplate && editingLayout && (
                <TemplateMappingEditor
                  inspection={{
                    allSheets: [editingLayout.sheetName],
                    bestSheet: {
                      sheetName: editingLayout.sheetName,
                      headerRowIdx: editingLayout.headerRowIdx,
                      dataStartRow: editingLayout.dataStartRow,
                      dataEndRow: editingLayout.dataEndRow,
                      bandSize: editingLayout.bandSize || 1,
                      columns: editingLayout.columns.map(c => ({
                        colIndex: c.colIndex,
                        headerText: c.headerText,
                        sampleValue: '',
                        suggestedField: c.source.kind === 'field' ? c.source.key : null
                      }))
                    }
                  }}
                  layout={editingLayout}
                  onChange={setEditingLayout}
                />
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditingMappingOpen(false);
                  setEditingTemplate(null);
                  setEditingLayout(null);
                }}
                className="h-9 px-4 rounded-lg text-xs font-bold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveMapping}
                disabled={isSavingMapping}
                className="h-9 px-4 rounded-lg text-xs font-bold bg-indigo-650 hover:bg-indigo-700 text-white shadow-sm flex items-center gap-1.5"
              >
                {isSavingMapping && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Save Mappings (v{(editingTemplate?.version || 1) + 1})
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
