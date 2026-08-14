import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download, FileSpreadsheet, Upload, RefreshCw, Trash2, Building2,
  Sparkles, Plus, X,
} from 'lucide-react';
import { format, subDays, startOfMonth, subMonths, startOfWeek } from 'date-fns';
import { toast } from 'sonner';

import DashboardLayout from '@/components/layout/DashboardLayout';
import KpiCard from '@/components/ui/KpiCard';
import { TruckMotion, FleetTruck } from '@/components/ui/kpi-icons';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/ui/DataTable';
import TemplateMappingEditor from '@/components/reports/TemplateMappingEditor';

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
        toast.success(`Detected sheet "${result.bestSheet.sheetName}" — confirm the column mapping below`);
      } else {
        toast.warning('Could not auto-detect a header row. You can still map columns manually.');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to inspect the template');
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
  };

  const handleSaveTemplate = async () => {
    if (!uploadFile || !draftLayout || !draftName.trim()) {
      toast.error('Upload a file and confirm the mapping before saving');
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

  const handleDeleteTemplate = async (id: string) => {
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
      toast.success('Report generated');
    } catch (err: any) {
      toast.error(err?.response?.data?.error?.message || 'Failed to generate report');
    } finally {
      setIsGenerating(false);
    }
  };

  const previewColumns = [
    { header: 'S/L', accessor: (_row: any, idx: number) => <span className="text-slate-400 font-mono text-xs">{idx + 1}</span> },
    { header: 'Ref', accessor: (row: any) => <span className="font-mono text-xs font-bold text-brand">{row.ref_id}</span> },
    { header: 'Date', accessor: (row: any) => (row.date ? format(new Date(row.date), 'dd-MM-yyyy') : '') },
    { header: 'Driver', accessor: (row: any) => row.driver_name },
    { header: 'Vehicle', accessor: (row: any) => row.vehicle_plate },
    { header: 'Customer', accessor: (row: any) => row.customer_name },
    { header: 'Billing', accessor: (row: any) => `SAR ${Number(row.billing_amount || 0).toLocaleString()}` },
    { header: 'Total', accessor: (row: any) => `SAR ${Number(row.total_amount || 0).toLocaleString()}` },
  ];

  return (
    <DashboardLayout active="Company Reports" title="Custom Company Reports Generator">
      <div className="px-4 sm:px-6 pb-6 animate-fade-in max-w-[1400px] mx-auto gap-5 flex flex-col">

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-black/[0.08] shadow-2xs">
          <div className="flex items-center gap-3">
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold px-2.5 py-1">
              <Sparkles className="w-3 h-3 mr-1" /> Customer Formats Engine
            </Badge>
            <span className="text-xs text-slate-500 font-medium hidden md:inline">
              Upload any customer's Excel format once, confirm the mapping, and generate byte-exact branded reports.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard title="SAVED TEMPLATES" value={templates.length} variant="slate" trend="neutral" trendValue={`${templates.length} Ready`} description="Company Excel formats" icon={FileSpreadsheet} />
          <KpiCard title="MATCHING TRIPS" value={previewData?.total ?? 0} variant="emerald" trend="up" trendValue={selectedTemplateId ? 'In range' : 'Pick a template'} description="For the selected filters" icon={TruckMotion} />
          <KpiCard title="CUSTOMERS" value={customers.length} variant="blue" trend="neutral" trendValue={`${customers.length} Companies`} description="Available to target" icon={Building2} />
          <KpiCard title="ACTIVE TEMPLATE" value={selectedTemplate ? (selectedTemplate.name.length > 18 ? selectedTemplate.name.slice(0, 16) + '...' : selectedTemplate.name) : 'None selected'} variant="amber" trend={selectedTemplate ? 'up' : 'neutral'} trendValue={selectedTemplate?.customer?.name || 'Shared'} description="Currently generating from" icon={FleetTruck} />
        </div>

        {/* ─── Upload & mapping flow ─── */}
        <div className="bg-white rounded-xl border border-black/[0.08] p-4 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Plus className="w-4 h-4 text-brand" /> Add a Company Template
            </h3>
            {uploadFile && (
              <Button variant="ghost" size="sm" onClick={resetUploadFlow} className="h-7 text-xs gap-1">
                <X className="w-3.5 h-3.5" /> Cancel
              </Button>
            )}
          </div>

          {!uploadFile ? (
            <label className="cursor-pointer group flex items-center justify-center gap-2.5 px-4 py-6 rounded-xl border-2 border-dashed border-slate-200 hover:border-brand bg-slate-50 hover:bg-brand/5 transition-all text-sm font-semibold text-slate-500 hover:text-brand w-full">
              <Upload className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span>Upload the customer's Excel format (.xlsx)</span>
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
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Template name</label>
                  <input
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-brand"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Customer (optional)</label>
                  <select
                    value={draftCustomerId}
                    onChange={(e) => setDraftCustomerId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 outline-none focus:border-brand"
                  >
                    <option value="all">Shared / any customer</option>
                    {customers.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name || c.company_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {isInspecting && <div className="text-sm text-slate-500">Inspecting workbook…</div>}

              {inspection && draftLayout && (
                <>
                  <TemplateMappingEditor inspection={inspection} layout={draftLayout} onChange={setDraftLayout} />
                  <div className="flex justify-end">
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

        {/* ─── Saved templates ─── */}
        <div className="bg-white rounded-xl border border-black/[0.08] p-4 shadow-2xs">
          <h3 className="text-sm font-bold text-slate-800 mb-3">Saved Templates</h3>
          {templatesLoading ? (
            <div className="text-sm text-slate-400">Loading…</div>
          ) : templates.length === 0 ? (
            <div className="text-sm text-slate-400">No templates yet — upload one above.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map((t: ReportTemplateSummary) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTemplateId(t.id)}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    selectedTemplateId === t.id ? 'border-brand bg-brand/5 ring-1 ring-brand/30' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-800 truncate">{t.name}</div>
                      <div className="text-xs text-slate-400 truncate">{t.customer?.name || 'Shared'}</div>
                    </div>
                    <Trash2
                      className="w-3.5 h-3.5 text-slate-300 hover:text-red-500 shrink-0 mt-0.5"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTemplate(t.id);
                      }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ─── Filters + generate ─── */}
        <div className="bg-white rounded-xl border border-black/[0.08] p-3 shadow-2xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Customer Company</label>
              <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-brand">
                <option value="all">🏢 All Customer Companies</option>
                {customers.map((c: any) => (
                  <option key={c.id} value={c.id}>🏢 {c.name || c.company_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Time Horizon</label>
              <select value={preset} onChange={(e) => setPreset(e.target.value as DatePreset)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-brand">
                <option value="this_week">📅 This Week</option>
                <option value="this_month">📅 This Month</option>
                <option value="last_month">📅 Last Month</option>
                <option value="custom">📅 Custom Range</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Trip Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-brand">
                <option value="all">🔀 All Trip Statuses</option>
                <option value="Completed">Completed</option>
                <option value="InTransit">In Transit</option>
                <option value="Dispatched">Dispatched</option>
                <option value="AtPickup">At Pickup</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1">Rate Category</label>
              <select value={rateCategoryFilter} onChange={(e) => setRateCategoryFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-brand">
                <option value="all">💰 All Rate Categories</option>
                {RATE_CATEGORIES.map((rc) => (
                  <option key={rc} value={rc}>{rc}</option>
                ))}
              </select>
            </div>
            <Button onClick={handleGenerate} disabled={isGenerating || !selectedTemplateId} className="h-9 text-xs bg-brand hover:bg-brand-hover text-white font-bold gap-1.5 shadow-xs">
              {isGenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Generate Company Excel
            </Button>
          </div>
          {preset === 'custom' && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs" />
              <input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs" />
            </div>
          )}
        </div>

        {/* ─── Live preview ─── */}
        <div className="bg-white rounded-xl border border-black/[0.08] p-4 shadow-2xs">
          <DataTable
            title={
              <span className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-brand" />
                <span>Live Trip Preview{selectedTemplate ? ` — ${selectedTemplate.name}` : ''}</span>
              </span>
            }
            columns={previewColumns}
            data={previewData?.rows ?? []}
            compact={true}
            isLoading={previewLoading}
          />
        </div>

      </div>
    </DashboardLayout>
  );
}
