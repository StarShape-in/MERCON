import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download, FileSpreadsheet, Upload, RefreshCw, Trash2, Building2,
  Sparkles, Plus, Calendar, Filter, Layers, DollarSign, PackageCheck,
} from 'lucide-react';
import { format, subDays, startOfMonth, subMonths, startOfWeek } from 'date-fns';
import { toast } from 'sonner';

import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Map, Table2, ShieldCheck, Globe, FileText, Navigation, ExternalLink } from 'lucide-react';

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

type DatePreset = 'this_week' | 'this_month' | 'last_month' | 'custom';

const COMPANY_MAP_OPTIONS: ComboboxOption[] = [
  {
    value: 'our_company',
    label: 'Our Company Name',
    keywords: 'our company name mercon logistics',
    icon: <Building2 className="w-3.5 h-3.5 text-brand" />,
  },
  {
    value: 'separate_row',
    label: 'Separate value for each row',
    keywords: 'separate value for each row per row custom company',
    icon: <FileText className="w-3.5 h-3.5 text-indigo-500" />,
  },
  {
    value: 'separate_text',
    label: 'Separate text for each',
    keywords: 'separate text for each vehicle truck carrier',
    icon: <FileText className="w-3.5 h-3.5 text-purple-500" />,
  },
  {
    value: 'mercon',
    label: 'MERCON Logistics',
    keywords: 'mercon logistics fleet',
    icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />,
  },
  {
    value: 'all',
    label: 'All Companies',
    keywords: 'all companies',
    icon: <Globe className="w-3.5 h-3.5 text-slate-400" />,
  },
  {
    value: 'aramco',
    label: 'Saudi Aramco Logistics',
    keywords: 'saudi aramco logistics',
    icon: <Building2 className="w-3.5 h-3.5 text-blue-500" />,
  },
  {
    value: 'sabic',
    label: 'SABIC Supply Chain',
    keywords: 'sabic supply chain',
    icon: <Building2 className="w-3.5 h-3.5 text-purple-500" />,
  },
];

function createReportTruckMapIcon(plate: string) {
  const svgIconHtml = `
    <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;">
      <div class="animate-ping" style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background-color: rgba(255, 85, 0, 0.4);"></div>
      <div style="width: 32px; height: 32px; border-radius: 50%; background: #0F1017; color: #FF5500; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 14px rgba(255,85,0,0.8); border: 2px solid #FF5500; z-index: 2;">
        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
      </div>
      <div style="position: absolute; bottom: -6px; background: #0F1017; color: #FFFFFF; font-family: monospace; font-size: 8px; font-weight: 800; padding: 1px 4px; border-radius: 4px; white-space: nowrap; border: 1px solid #FF5500; z-index: 3;">
        ${plate || 'MERCON'}
      </div>
    </div>
  `;
  return L.divIcon({
    html: svgIconHtml,
    className: '',
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
}

const getApproxCoords = (idx: number): [number, number] => {
  const points: [number, number][] = [
    [24.7136, 46.6753], // Riyadh
    [21.5433, 39.1728], // Jeddah
    [26.4350, 50.1040], // Dammam
    [24.4672, 39.6112], // Medina
    [21.3891, 39.8579], // Mecca
    [28.3835, 36.5662], // Tabuk
    [25.3835, 49.5862], // Al Ahsa
    [26.2172, 50.1971], // Khobar
  ];
  return points[idx % points.length];
};

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

  // View & Per-Row Company Map State
  const [viewMode, setViewMode] = useState<'ledger' | 'map'>('ledger');
  const [companyFilter, setCompanyFilter] = useState<string>('our_company');
  const [rowCompanies, setRowCompanies] = useState<Record<string, string>>({});

  const getReportCompanyLabel = (row: any) => {
    const rowId = row.ref_id || row.id;
    if (rowCompanies[rowId]) return rowCompanies[rowId];
    if (companyFilter === 'our_company' || companyFilter === 'mercon') return 'MERCON Logistics';
    if (companyFilter === 'separate_row') return `${row.ref_id || 'TRP'} • MERCON Fleet`;
    if (companyFilter === 'separate_text') return `${row.ref_id || 'TRP'} • ${row.driver_name || 'Fleet Truck'}`;
    if (companyFilter === 'aramco') return 'Saudi Aramco Logistics';
    if (companyFilter === 'sabic') return 'SABIC Supply Chain';
    return 'MERCON Logistics';
  };

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
    {
      header: 'Company Name (Editable)',
      accessor: (row: any) => {
        const rowId = row.ref_id || row.id;
        const currentVal = rowCompanies[rowId] ?? getReportCompanyLabel(row);
        return (
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 min-w-[170px]">
            <Building2 className="w-3.5 h-3.5 text-brand shrink-0" />
            <input
              type="text"
              value={currentVal}
              onChange={(e) => {
                const val = e.target.value;
                setRowCompanies((prev) => ({ ...prev, [rowId]: val }));
              }}
              placeholder="Add company name..."
              className="w-full text-xs font-semibold bg-transparent outline-none text-slate-900 dark:text-slate-100"
            />
          </div>
        );
      },
    },
    { header: 'Billing', accessor: (row: any) => <span className="font-medium text-slate-700 dark:text-slate-200">SAR {Number(row.billing_amount || 0).toLocaleString()}</span> },
    { header: 'Total', accessor: (row: any) => <span className="font-bold text-slate-900 dark:text-slate-100">SAR {Number(row.total_amount || 0).toLocaleString()}</span> },
  ];

  const templateComboboxOptions: ComboboxOption[] = useMemo(() => {
    if (templates.length === 0) return [{ value: '', label: 'No templates uploaded' }];
    return templates.map((t: ReportTemplateSummary) => ({
      value: t.id,
      label: `📄 ${t.name} (${t.customer?.name || 'Shared'})`,
      keywords: `${t.name} ${t.customer?.name || ''}`,
    }));
  }, [templates]);

  const customerComboboxOptions: ComboboxOption[] = useMemo(() => {
    const list: ComboboxOption[] = [{ value: 'all', label: '🏢 All Customer Companies' }];
    customers.forEach((c: any) => {
      list.push({
        value: c.id,
        label: `🏢 ${c.name || c.company_name}`,
        keywords: c.name || c.company_name,
      });
    });
    return list;
  }, [customers]);

  const presetComboboxOptions: ComboboxOption[] = [
    { value: 'this_week', label: '📅 This Week' },
    { value: 'this_month', label: '📅 This Month' },
    { value: 'last_month', label: '📅 Last Month' },
    { value: 'custom', label: '📅 Custom Range' },
  ];

  const statusComboboxOptions: ComboboxOption[] = [
    { value: 'all', label: '🔀 All Trip Statuses' },
    { value: 'Completed', label: 'Completed' },
    { value: 'InTransit', label: 'In Transit' },
    { value: 'Dispatched', label: 'Dispatched' },
    { value: 'AtPickup', label: 'At Pickup' },
  ];

  const rateCategoryComboboxOptions: ComboboxOption[] = useMemo(() => {
    const list: ComboboxOption[] = [{ value: 'all', label: '💰 All Rate Categories' }];
    RATE_CATEGORIES.forEach((rc) => {
      list.push({ value: rc, label: rc });
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

        {/* ─── Main View Segment Switcher (Ledger Table vs. Maps & Radar) ─── */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-black/[0.08] dark:border-slate-800 p-4 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex items-center gap-1 border border-slate-200 dark:border-slate-700">
                <button
                  onClick={() => setViewMode('ledger')}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5",
                    viewMode === 'ledger'
                      ? "bg-brand text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  )}
                >
                  <Table2 className="w-3.5 h-3.5" /> Live Trip Ledger
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={cn(
                    "px-3 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5",
                    viewMode === 'map'
                      ? "bg-brand text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                  )}
                >
                  <Map className="w-3.5 h-3.5" /> Maps & Live Telemetry Radar
                </button>
              </div>

              {selectedTemplate && (
                <span className="text-xs text-slate-400 font-normal hidden md:inline">
                  — {selectedTemplate.name}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Company Combobox Selector for Maps & Ledger */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-brand" /> Maps Company:
                </span>
                <div className="w-56">
                  <Combobox
                    options={COMPANY_MAP_OPTIONS}
                    value={companyFilter}
                    onChange={setCompanyFilter}
                    placeholder="Select company..."
                    searchPlaceholder="Search company mode..."
                    triggerClassName="h-8 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-bold"
                  />
                </div>
              </div>

              {/* Compact Metrics */}
              <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono font-bold text-xs px-2.5 py-1 border border-slate-200 dark:border-slate-700">
                <PackageCheck className="w-3 h-3 mr-1 text-brand" />
                {previewData?.total ?? 0} Trips
              </Badge>
            </div>
          </div>

          {viewMode === 'ledger' ? (
            <DataTable
              title={<span className="text-xs font-bold text-slate-500">Filtered Live Trips Ledger</span>}
              columns={previewColumns}
              data={previewData?.rows ?? []}
              compact={true}
              isLoading={previewLoading}
            />
          ) : (
            <div className="relative h-[520px] rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner">
              
              {/* Floating Top Left HUD Info */}
              <div className="absolute top-3 left-3 z-[1000] px-3.5 py-2 rounded-xl shadow-lg border border-slate-900/15 bg-white/90 dark:bg-[#090A0F]/90 backdrop-blur-xl text-slate-900 dark:text-white text-xs flex items-center gap-2.5 font-mono font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5500] animate-ping shrink-0" />
                <span>{previewData?.rows?.length || 0} REPORT VEHICLES ON MAP</span>
                <span className="opacity-40">|</span>
                <span className="text-brand flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 inline" />
                  {companyFilter === 'our_company'
                    ? 'MERCON Logistics (Our Company)'
                    : companyFilter === 'separate_row'
                    ? 'Separate Row Custom Value'
                    : companyFilter === 'separate_text'
                    ? 'Separate Text per Vehicle'
                    : companyFilter === 'mercon'
                    ? 'MERCON Logistics'
                    : companyFilter === 'all'
                    ? 'All Companies'
                    : 'Company Selected'}
                </span>
              </div>

              <MapContainer
                center={[24.0, 45.0]}
                zoom={5}
                scrollWheelZoom={true}
                zoomControl={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />
                <ZoomControl position="bottomright" />

                {(previewData?.rows || []).map((row: any, idx: number) => {
                  const coords = getApproxCoords(idx);
                  const displayCompany = getReportCompanyLabel(row);
                  return (
                    <Marker
                      key={row.ref_id || row.id || idx}
                      position={coords}
                      icon={createReportTruckMapIcon(row.vehicle_plate)}
                    >
                      <Popup className="custom-map-popup">
                        <div className="p-1 space-y-2 min-w-[200px] text-slate-900">
                          <div className="flex items-center justify-between border-b pb-1.5">
                            <span className="text-[10px] text-gray-500 font-bold uppercase">{row.ref_id}</span>
                            <span className="text-xs font-bold text-brand">{row.vehicle_plate}</span>
                          </div>
                          <div className="space-y-1 text-xs">
                            <p className="font-semibold text-slate-800">Driver: {row.driver_name || 'Assigned Driver'}</p>
                            <p className="text-[11px] text-slate-500">Customer: {row.customer_name}</p>
                            <div className="bg-brand/10 p-1.5 rounded border border-brand/20 flex items-center justify-between">
                              <span className="text-[10px] font-bold uppercase text-slate-500">Operating Company</span>
                              <span className="text-xs font-bold text-brand">{displayCompany}</span>
                            </div>
                            <div className="pt-1 flex justify-between font-mono text-[11px] text-slate-700">
                              <span>Billing: SAR {Number(row.billing_amount || 0).toLocaleString()}</span>
                              <span className="font-bold">Total: SAR {Number(row.total_amount || 0).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MapContainer>
            </div>
          )}
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
