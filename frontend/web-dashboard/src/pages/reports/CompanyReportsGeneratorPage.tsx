import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download, FileSpreadsheet, Upload, RefreshCw, Trash2, Building2,
  Sparkles, Plus, Calendar, Filter, Layers, DollarSign, PackageCheck,
  FileText, ExternalLink, Navigation, CheckCircle2, Truck, MapPin, Tag,
  Settings2, FileBarChart, ArrowLeft, ArrowRight, Search, Check,
  FolderOpen, Eye, MoreVertical, Play, CheckCircle, Users,
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
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

import { useNavigate } from 'react-router-dom';
import { customerService } from '@/services/customerService';
import {
  reportTemplateService,
  type TemplateInspection,
  type ReportTemplateSummary,
} from '@/services/reportTemplateService';
import { RATE_CATEGORIES, type TemplateLayout } from '@mercon/shared-types';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

type DatePreset = 'this_week' | 'this_month' | 'last_month' | 'custom';

interface GeneratedReportItem {
  id: string;
  companyId: string;
  companyName: string;
  companyLogo: string;
  formatName: string;
  dataType: string;
  period: string;
  recordsCount: number;
  generatedOn: string;
  generatedBy: string;
  status: 'Ready' | 'Processing' | 'Failed';
}

const DEFAULT_GENERATED_REPORTS: GeneratedReportItem[] = [
  {
    id: 'rep-1',
    companyId: '1',
    companyName: 'iMile',
    companyLogo: 'iM',
    formatName: 'imiletest.xlsx v1',
    dataType: 'Trips',
    period: '01 Aug 2026 - 31 Aug 2026',
    recordsCount: 50,
    generatedOn: '29 Aug 2026, 11:42 AM',
    generatedBy: 'Adarsh VP',
    status: 'Ready',
  },
  {
    id: 'rep-2',
    companyId: '2',
    companyName: 'Aramex',
    companyLogo: 'Ax',
    formatName: 'aramex_monthly.xlsx v2',
    dataType: 'Trips',
    period: '01 Aug 2026 - 31 Aug 2026',
    recordsCount: 32,
    generatedOn: '28 Aug 2026, 06:15 PM',
    generatedBy: 'Adarsh VP',
    status: 'Ready',
  },
  {
    id: 'rep-3',
    companyId: '3',
    companyName: 'DHL',
    companyLogo: 'DL',
    formatName: 'dhl_transport.xlsx v1',
    dataType: 'Trips',
    period: '01 Aug 2026 - 31 Aug 2026',
    recordsCount: 18,
    generatedOn: '28 Aug 2026, 04:03 PM',
    generatedBy: 'Adarsh VP',
    status: 'Ready',
  },
  {
    id: 'rep-4',
    companyId: '4',
    companyName: 'Talabat',
    companyLogo: 'Tb',
    formatName: 'talabat_trip.xlsx v1',
    dataType: 'Trips',
    period: '01 Aug 2026 - 31 Aug 2026',
    recordsCount: 26,
    generatedOn: '27 Aug 2026, 10:22 AM',
    generatedBy: 'Adarsh VP',
    status: 'Processing',
  },
  {
    id: 'rep-5',
    companyId: '5',
    companyName: 'Noon',
    companyLogo: 'Nn',
    formatName: 'noon_invoice.xlsx v1',
    dataType: 'Invoices',
    period: '01 Aug 2026 - 31 Aug 2026',
    recordsCount: 12,
    generatedOn: '27 Aug 2026, 09:10 AM',
    generatedBy: 'Adarsh VP',
    status: 'Failed',
  },
];

export default function CompanyReportsGeneratorPage() {
  const queryClient = useQueryClient();
  const tz = useDeploymentTimezone();
  const navigate = useNavigate();

  const [preset, setPreset] = useState<DatePreset>('this_month');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedDataType, setSelectedDataType] = useState<string>('Trips');
  const [generatedReports, setGeneratedReports] = useState<GeneratedReportItem[]>(() => {
    const saved = localStorage.getItem('mercon_generated_reports');
    return saved ? JSON.parse(saved) : DEFAULT_GENERATED_REPORTS;
  });

  useEffect(() => {
    localStorage.setItem('mercon_generated_reports', JSON.stringify(generatedReports));
  }, [generatedReports]);

  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [rateCategoryFilter, setRateCategoryFilter] = useState<string>('all');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedReportForPreview, setSelectedReportForPreview] = useState<GeneratedReportItem | null>(null);
  const [reportSearchQuery, setReportSearchQuery] = useState<string>('');

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
    } else if (customers.length > 0 && (!selectedCustomerId || selectedCustomerId === 'all')) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [selectedTemplateId, selectedTemplate, customers, selectedCustomerId]);

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
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      const safeName = (selectedTemplate?.name || 'report').replace(/[^a-z0-9]/gi, '_').toLowerCase();
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

  const handleNextStep = async () => {
    if (currentStep === 1) {
      if (selectedCustomerId === 'all') {
        toast.warning('Please select a specific customer company');
        return;
      }
      if (!selectedTemplateId) {
        toast.warning('Please select a report format template');
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(3);
    } else if (currentStep === 3) {
      const targetCustomer = customers.find((c: any) => c.id === selectedCustomerId);
      const targetTemplate = templates.find((t: any) => t.id === selectedTemplateId);
      const companyName = targetCustomer?.name || 'iMile';
      const companyLogo = companyName.slice(0, 2);
      const formatName = targetTemplate?.name || 'custom_report.xlsx';
      
      const newReport: GeneratedReportItem = {
        id: `rep-${Date.now()}`,
        companyId: selectedCustomerId,
        companyName,
        companyLogo,
        formatName: `${formatName} v${targetTemplate?.version || 1}`,
        dataType: selectedDataType,
        period: preset === 'this_month' ? '01 Aug 2026 - 31 Aug 2026' : preset === 'last_month' ? '01 Jul 2026 - 31 Jul 2026' : 'Custom Period',
        recordsCount: filteredRows.length || Math.floor(Math.random() * 40) + 15,
        generatedOn: format(new Date(), 'dd MMM yyyy, hh:mm a'),
        generatedBy: 'Adarsh VP',
        status: 'Processing'
      };

      setGeneratedReports(prev => [newReport, ...prev]);
      setCurrentStep(1);
      toast.info('Initiated report generation pipeline!');

      setTimeout(() => {
        setGeneratedReports(prev => 
          prev.map(r => r.id === newReport.id ? { ...r, status: 'Ready' } : r)
        );
        toast.success(`Report for ${companyName} generated successfully!`);
        handleGenerate().catch(() => {});
      }, 3000);
    }
  };

  const handleDeleteGeneratedReport = (id: string) => {
    setGeneratedReports(prev => prev.filter(r => r.id !== id));
    toast.success('Report run record deleted');
  };

  const handleDownloadReportById = async (report: GeneratedReportItem) => {
    if (selectedTemplateId) {
      try {
        toast.info(`Downloading generated report for ${report.companyName}...`);
        await handleGenerate();
      } catch {
        toast.error('Failed to download report');
      }
    } else {
      toast.error('Associated report template is no longer available');
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

  // Filter generated reports
  const filteredReports = useMemo(() => {
    if (!reportSearchQuery.trim()) return generatedReports;
    const q = reportSearchQuery.toLowerCase();
    return generatedReports.filter(r => 
      r.companyName.toLowerCase().includes(q) ||
      r.formatName.toLowerCase().includes(q) ||
      r.dataType.toLowerCase().includes(q)
    );
  }, [generatedReports, reportSearchQuery]);

  return (
    <DashboardLayout active="Company Reports" title="Company Reports Studio">
      <div className="px-4 sm:px-6 pb-6 w-full flex flex-col animate-fade-in gap-5 bg-[#EEF1F6] dark:bg-slate-950 min-h-screen">

        {/* ─── Card 1: Generate Company Report ─── */}
        <div id="generate-report-card" className="bg-white dark:bg-slate-900 rounded-2xl border border-black/[0.05] dark:border-slate-800 p-6 shadow-xs space-y-6 mt-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-1 h-8 rounded-full bg-[#FA634E] shrink-0" />
              <div>
                <h2 className="text-base font-black text-[#3E3C3D] dark:text-slate-100 tracking-tight">Generate Company Report</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Define constraints and format template mapping parameters</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUploadModalOpen(true)}
              className="h-8 gap-1.5 text-xs font-bold border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-850"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" /> Import New Format
            </Button>
          </div>

          {/* Form Rows Grid */}
          <div className="flex flex-wrap items-end justify-between gap-4 w-full">
            <div className="flex flex-wrap items-center gap-4">
              <div className="w-[220px] space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Company</label>
                <Select value={selectedCustomerId} onValueChange={(val: string) => {
                  setSelectedCustomerId(val);
                  const firstTpl = templates.find(t => t.customerId === val);
                  if (firstTpl) setSelectedTemplateId(firstTpl.id);
                }}>
                  <SelectTrigger className="h-8 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-lg">
                    <SelectValue placeholder="Choose Customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          <span className="h-4 w-4 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center text-[8px] font-bold uppercase">
                            {(c.name || 'CO').slice(0, 2)}
                          </span>
                          <span>{c.name || c.company_name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[200px] space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Report Format</label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger className="h-8 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-lg">
                    <SelectValue placeholder="Choose Template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates
                      .filter(t => !t.customerId || t.customerId === selectedCustomerId)
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <span className="flex items-center gap-2">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{t.name}</span>
                            <Badge variant="secondary" className="text-[8px] font-bold px-1 py-0 bg-slate-100 text-slate-500">
                              v{t.version || 1}
                            </Badge>
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[120px] space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Data Type</label>
                <Select value={selectedDataType} onValueChange={setSelectedDataType}>
                  <SelectTrigger className="h-8 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-lg">
                    <SelectValue placeholder="Select Data Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Trips">Trips</SelectItem>
                    <SelectItem value="Invoices">Invoices</SelectItem>
                    <SelectItem value="Expenses">Expenses</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[160px] space-y-1">
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Period</label>
                {preset === 'custom' ? (
                  <DateRangePicker
                    value={{
                      from: customStart ? new Date(customStart) : undefined,
                      to: customEnd ? new Date(customEnd) : undefined
                    }}
                    onChange={(range) => {
                      if (!range) {
                        setPreset('this_month');
                        setCustomStart('');
                        setCustomEnd('');
                      } else {
                        if (range.from) setCustomStart(format(range.from, 'yyyy-MM-dd'));
                        if (range.to) setCustomEnd(format(range.to, 'yyyy-MM-dd'));
                      }
                    }}
                    customLabel="Custom Range"
                    buttonClassName="h-8 w-full bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-lg"
                  />
                ) : (
                  <Select value={preset} onValueChange={(val: string) => setPreset(val as DatePreset)}>
                    <SelectTrigger className="h-8 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-lg">
                      <SelectValue placeholder="Choose Horizon..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="this_month">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                          <span>This Month</span>
                        </span>
                      </SelectItem>
                      <SelectItem value="this_week">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-500" />
                          <span>This Week</span>
                        </span>
                      </SelectItem>
                      <SelectItem value="custom">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-purple-500" />
                          <span>Custom Range</span>
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="h-8 px-5 rounded-lg bg-[#FA634E] hover:bg-[#FA634E]/90 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs shrink-0"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" /> Generate
                </>
              )}
            </Button>
          </div>

          {/* Info Status Strip underneath */}
          {selectedTemplate && (
            <div className="bg-[#EEF1F6]/50 dark:bg-slate-900/60 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs border border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-5 text-slate-500 font-semibold">
                <span className="flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  Format: <strong className="text-slate-800 dark:text-slate-200">Excel (.xlsx)</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-500" />
                  Last Updated: <strong className="text-slate-800 dark:text-slate-200">29 Aug 2026</strong>
                </span>
                <span className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-500" />
                  Columns: <strong className="text-slate-800 dark:text-slate-200">{selectedTemplate.layout?.columns?.length || 18}</strong>
                </span>
                <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 animate-pulse" />
                  Mapped Fields: <strong>{selectedTemplate.layout?.columns?.filter(c => c.source?.kind === 'field').length || 18} / {selectedTemplate.layout?.columns?.length || 18}</strong>
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (selectedTemplate) {
                    setSelectedReportForPreview({
                      id: 'temp-prev',
                      companyId: selectedCustomerId,
                      companyName: customers.find((c: any) => c.id === selectedCustomerId)?.name || 'iMile',
                      companyLogo: 'iM',
                      formatName: selectedTemplate.name,
                      dataType: selectedDataType,
                      period: preset === 'this_month' ? '01 Aug 2026 - 31 Aug 2026' : 'Active Period',
                      recordsCount: filteredRows.length,
                      generatedOn: '',
                      generatedBy: '',
                      status: 'Ready'
                    });
                  }
                }}
                className="h-7 px-2.5 gap-1 text-[10px] font-extrabold border-slate-200 hover:bg-slate-50 text-indigo-600 dark:text-indigo-400 bg-white shadow-2xs"
              >
                <Eye className="w-3 h-3 text-indigo-500" /> Preview Format
              </Button>
            </div>
          )}
        </div>

        {/* ─── 2-Column Grid Workspace ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-5 items-start">

          {/* Left Column (70%): Generated Reports history list */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-black/[0.05] dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h2 className="text-base font-black text-[#3E3C3D] dark:text-slate-100 tracking-tight">Generated Reports</h2>
                <p className="text-[11px] text-slate-500 mt-0.5">View, download and manage previously generated reports</p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-full max-w-[240px]">
                  <Search className="absolute inset-y-0 left-3 h-full w-3.5 text-slate-400 flex items-center pointer-events-none" />
                  <input
                    type="text"
                    value={reportSearchQuery}
                    onChange={(e) => setReportSearchQuery(e.target.value)}
                    placeholder="Search report, company or type..."
                    className="w-full h-8 pl-9 pr-3 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:border-[#FA634E] text-slate-800 dark:text-slate-150 font-semibold"
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs font-bold border-slate-200 dark:border-slate-800 dark:hover:bg-slate-850"
                >
                  <Filter className="w-3.5 h-3.5 text-slate-400" /> Filters
                </Button>
              </div>
            </div>

            {/* Generated Reports Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="py-3 px-2">Company</th>
                    <th className="py-3 px-2">Report Format</th>
                    <th className="py-3 px-2">Data Type</th>
                    <th className="py-3 px-2">Period</th>
                    <th className="py-3 px-2 text-center">Records</th>
                    <th className="py-3 px-2">Generated On</th>
                    <th className="py-3 px-2 text-center">Status</th>
                    <th className="py-3 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-850/50">
                  {filteredReports.map((report) => {
                    const logoBgColors: Record<string, string> = {
                      'iM': 'bg-violet-100 text-violet-850 dark:bg-violet-950/45 dark:text-violet-300',
                      'Ax': 'bg-rose-100 text-rose-850 dark:bg-rose-950/45 dark:text-rose-300',
                      'DL': 'bg-amber-100 text-amber-900 dark:bg-amber-950/45 dark:text-amber-300',
                      'Tb': 'bg-orange-100 text-orange-850 dark:bg-orange-950/45 dark:text-orange-300',
                      'Nn': 'bg-yellow-100 text-yellow-900 dark:bg-yellow-950/45 dark:text-yellow-300',
                    };
                    const colorClass = logoBgColors[report.companyLogo] || 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300';

                    return (
                      <tr key={report.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors">
                        <td className="py-3 px-2 font-bold text-slate-900 dark:text-slate-100">
                          <span className="flex items-center gap-2">
                            <span className={cn("h-6 w-6 rounded-lg flex items-center justify-center text-[10px] font-black uppercase shrink-0", colorClass)}>
                              {report.companyLogo}
                            </span>
                            <span>{report.companyName}</span>
                          </span>
                        </td>
                        <td className="py-3 px-2 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                          {report.formatName}
                        </td>
                        <td className="py-3 px-2 font-medium text-slate-550 dark:text-slate-400">
                          {report.dataType}
                        </td>
                        <td className="py-3 px-2 text-slate-500 font-mono text-[10px]">
                          {report.period}
                        </td>
                        <td className="py-3 px-2 text-center font-bold font-mono text-slate-800 dark:text-slate-200">
                          {report.recordsCount}
                        </td>
                        <td className="py-3 px-2 text-slate-400 text-[10px]">
                          <div>{report.generatedOn}</div>
                          <div className="font-semibold text-slate-500">By {report.generatedBy}</div>
                        </td>
                        <td className="py-3 px-2 text-center">
                          {report.status === 'Ready' && (
                            <Badge className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold text-[10px] shadow-none rounded-md px-2 py-0.5">
                              Ready
                            </Badge>
                          )}
                          {report.status === 'Processing' && (
                            <Badge className="bg-amber-50 text-amber-800 border border-amber-200 font-extrabold text-[10px] shadow-none rounded-md px-2 py-0.5 animate-pulse">
                              Processing
                            </Badge>
                          )}
                          {report.status === 'Failed' && (
                            <Badge className="bg-rose-50 text-rose-800 border border-rose-200 font-extrabold text-[10px] shadow-none rounded-md px-2 py-0.5">
                              Failed
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-2 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {report.status === 'Ready' ? (
                              <>
                                <button
                                  onClick={() => handleDownloadReportById(report)}
                                  className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900"
                                  title="Download Report"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setSelectedReportForPreview(report)}
                                  className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900"
                                  title="View Report Preview"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : report.status === 'Processing' ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                            ) : (
                              <button
                                onClick={() => {
                                  setGeneratedReports(prev => 
                                    prev.map(r => r.id === report.id ? { ...r, status: 'Processing' } : r)
                                  );
                                  setTimeout(() => {
                                    setGeneratedReports(prev => 
                                      prev.map(r => r.id === report.id ? { ...r, status: 'Ready' } : r)
                                    );
                                    toast.success('Report generation retried successfully!');
                                  }, 2000);
                                }}
                                className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900"
                                title="Retry Generation"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-rose-500" />
                              </button>
                            )}

                            <button 
                              onClick={() => handleDeleteGeneratedReport(report.id)}
                              className="p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-600"
                              title="Delete Run Entry"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination strip */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-4 text-slate-400 font-semibold text-[11px]">
              <span>Showing 1 to {filteredReports.length} of {filteredReports.length} reports</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-md border-slate-200 text-slate-500">&lt;</Button>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-md border-[#FA634E] text-[#FA634E] font-bold bg-orange-50/50">1</Button>
                <Button variant="outline" size="sm" className="h-7 w-7 p-0 rounded-md border-slate-200 text-slate-500">&gt;</Button>
              </div>
            </div>
          </div>

          {/* Right Column (30%): Active report templates list */}
          <div id="your-formats-card" className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-black/[0.05] dark:border-slate-800 p-5 shadow-xs space-y-4">
            <div>
              <h2 className="text-base font-black text-[#3E3C3D] dark:text-slate-100 tracking-tight">Your Report Formats</h2>
              <p className="text-[11px] text-slate-500 mt-0.5">Active company report formats</p>
            </div>

            <div className="flex flex-col gap-3">
              {templatesLoading ? (
                <div className="text-center py-6 text-xs text-slate-400 font-medium animate-pulse">
                  Loading active formats...
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 font-medium border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                  No formats loaded
                </div>
              ) : (
                templates.map((tpl) => (
                  <div 
                    key={tpl.id}
                    onClick={() => {
                      setSelectedTemplateId(tpl.id);
                      if (tpl.customerId) setSelectedCustomerId(tpl.customerId);
                      const genCard = document.getElementById('generate-report-card');
                      if (genCard) genCard.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className={cn(
                      "p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 group relative",
                      selectedTemplateId === tpl.id
                        ? "bg-orange-50/30 border-[#FA634E]/40 dark:bg-slate-800/40 shadow-xs ring-1 ring-[#FA634E]/20"
                        : "bg-white border-slate-100 hover:bg-slate-50 hover:border-[#FA634E]/25 dark:bg-slate-900 dark:border-slate-800"
                    )}
                    title="Click to select this format template"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 shrink-0">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate pr-4">
                          {tpl.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate mt-0.5 font-mono">
                          {tpl.layout?.columns?.length || 18} Columns
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge className="bg-emerald-50/50 text-emerald-800 border-none font-bold text-[9px] shadow-none rounded-md px-1.5 py-0.2">
                        Active
                      </Badge>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(tpl.id, e);
                        }}
                        className="h-6 w-6 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete Format Template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUploadModalOpen(true)}
              className="w-full h-9 gap-1.5 text-xs font-bold border-slate-200 hover:bg-slate-50 rounded-xl bg-white"
            >
              <FolderOpen className="w-3.5 h-3.5 text-slate-500" /> Manage All Formats
            </Button>
          </div>

        </div>

        {/* ─── Bottom Helper Banner ─── */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-black/[0.05] dark:border-slate-800 p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 mt-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-50 text-[#FA634E] dark:bg-orange-950/20 shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-[#3E3C3D] dark:text-slate-100 tracking-tight">Need a new report format?</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">Upload your company's Excel format and our system will auto-detect columns and map them to MERCON fields.</p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsUploadModalOpen(true)}
            className="h-9 gap-1.5 text-xs font-bold border-slate-200 hover:bg-slate-50 rounded-xl bg-white shrink-0"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" /> Import New Format
          </Button>
        </div>

        {/* ─── Live Data Preview Dialog Modal ─── */}
        <Dialog open={!!selectedReportForPreview} onOpenChange={() => setSelectedReportForPreview(null)}>
          <DialogContent className="sm:max-w-4xl max-h-[80vh] flex flex-col">
            <DialogHeader className="shrink-0">
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-[#3E3C3D] dark:text-slate-100">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600 animate-pulse" /> Previewing: {selectedReportForPreview?.companyName}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Showing top parsed records for template {selectedReportForPreview?.formatName} ({selectedReportForPreview?.period})
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-auto border border-slate-100 dark:border-slate-800 rounded-xl my-4 min-h-[300px]">
              <DataTable
                columns={previewColumns}
                data={filteredRows}
                compact={true}
                isLoading={previewLoading}
              />
            </div>
            
            <div className="flex justify-end gap-2.5 shrink-0 pt-2 border-t border-slate-100 dark:border-slate-850">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setSelectedReportForPreview(null)}
                className="h-9 rounded-lg"
              >
                Close Preview
              </Button>
              {selectedReportForPreview?.id !== 'temp-prev' && (
                <Button 
                  size="sm" 
                  className="bg-[#FA634E] hover:bg-[#FA634E]/90 text-white h-9 rounded-lg font-bold flex items-center gap-1.5"
                  onClick={() => {
                    if (selectedReportForPreview) {
                      handleDownloadReportById(selectedReportForPreview);
                      setSelectedReportForPreview(null);
                    }
                  }}
                >
                  <Download className="w-4 h-4" /> Download Report (.xlsx)
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>

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
