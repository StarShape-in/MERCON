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
              <Combobox
                options={templateComboboxOptions}
                value={selectedTemplateId}
                onChange={setSelectedTemplateId}
                placeholder="Select template..."
                searchPlaceholder="Search report format..."
                triggerClassName="h-9 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
              />
            </div>

            {/* Customer Company Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-blue-500" /> Customer Company
              </label>
              <Combobox
                options={customerComboboxOptions}
                value={selectedCustomerId}
                onChange={setSelectedCustomerId}
                placeholder="All Customer Companies"
                searchPlaceholder="Search customer company..."
                triggerClassName="h-9 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
              />
            </div>

            {/* Time Horizon Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" /> Time Horizon
              </label>
              <Combobox
                options={presetComboboxOptions}
                value={preset}
                onChange={(val) => setPreset(val as DatePreset)}
                placeholder="Time horizon"
                searchPlaceholder="Search preset..."
                triggerClassName="h-9 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
              />
            </div>

            {/* Trip Status Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-amber-500" /> Trip Status
              </label>
              <Combobox
                options={statusComboboxOptions}
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="All Statuses"
                searchPlaceholder="Search status..."
                triggerClassName="h-9 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
              />
            </div>

            {/* Rate Category Filter */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-purple-500" /> Rate Category
              </label>
              <Combobox
                options={rateCategoryComboboxOptions}
                value={rateCategoryFilter}
                onChange={setRateCategoryFilter}
                placeholder="All Rate Categories"
                searchPlaceholder="Search category..."
                triggerClassName="h-9 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
              />
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

        {/* ─── Filtered Live Trips Ledger ─── */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-black/[0.08] dark:border-slate-800 p-4 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              {selectedTemplate && (
                <span className="text-xs text-slate-400 font-normal hidden md:inline">
                  — {selectedTemplate.name}
                </span>
              )}
            </div>
            <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs px-2.5 py-1 border border-slate-200 dark:border-slate-700">
              <PackageCheck className="w-3 h-3 mr-1 text-brand" />
              {previewData?.total ?? 0} Trips
            </Badge>
          </div>

          <DataTable
            title={<span className="text-xs font-bold text-slate-500">Filtered Live Trips Ledger</span>}
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
                        searchPlaceholder="Search customer or company..."
                        triggerClassName="w-full h-9 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg"
                      />
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
