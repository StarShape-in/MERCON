import { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Download, FileSpreadsheet, Upload, RefreshCw, Trash2, Building2,
  Sparkles, Plus, Calendar, Filter, Layers, DollarSign, PackageCheck,
  FileText, ExternalLink, Navigation, CheckCircle2, Truck, MapPin, Tag,
  Settings2, FileBarChart, ArrowLeft, ArrowRight, Search, Check, Copy,
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
    period: '01/08/2026 - 31/08/2026',
    recordsCount: 50,
    generatedOn: '29/08/2026, 11:42 AM',
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
    period: '01/08/2026 - 31/08/2026',
    recordsCount: 32,
    generatedOn: '28/08/2026, 06:15 PM',
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
    period: '01/08/2026 - 31/08/2026',
    recordsCount: 18,
    generatedOn: '28/08/2026, 04:03 PM',
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
    period: '01/08/2026 - 31/08/2026',
    recordsCount: 26,
    generatedOn: '27/08/2026, 10:22 AM',
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
    period: '01/08/2026 - 31/08/2026',
    recordsCount: 12,
    generatedOn: '27/08/2026, 09:10 AM',
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
  const [selectedReportForDetails, setSelectedReportForDetails] = useState<GeneratedReportItem | null>(null);
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

  // Dedicated Format Details modal state
  const [selectedFormatForDetails, setSelectedFormatForDetails] = useState<ReportTemplateSummary | null>(null);
  const [activeFormatDetailsTab, setActiveFormatDetailsTab] = useState<'mock_preview' | 'edit_mappings'>('mock_preview');

  const formatInspection: TemplateInspection = useMemo(() => {
    if (!selectedFormatForDetails || !editingLayout) {
      return { allSheets: [], bestSheet: null };
    }
    const cols = editingLayout.columns.map((col) => ({
      colIndex: col.colIndex,
      headerText: col.headerText || `Column ${col.colIndex}`,
      sampleValue: '',
      suggestedField: col.source.kind === 'field' ? col.source.key : null,
    }));
    return {
      allSheets: [editingLayout.sheetName || 'Sheet1'],
      bestSheet: {
        sheetName: editingLayout.sheetName || 'Sheet1',
        headerRowIdx: editingLayout.headerRowIdx || 2,
        dataStartRow: editingLayout.dataStartRow || 4,
        dataEndRow: editingLayout.dataEndRow || 10,
        bandSize: 1,
        columns: cols,
      },
    };
  }, [selectedFormatForDetails, editingLayout]);

  const handleOpenFormatDetails = (template: ReportTemplateSummary) => {
    setSelectedFormatForDetails(template);
    setEditingTemplate(template);
    setEditingLayout(JSON.parse(JSON.stringify(template.layout)));
    setActiveFormatDetailsTab('mock_preview');
  };

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
    const target = editingTemplate || selectedFormatForDetails;
    if (!target || !editingLayout) return;
    setIsSavingMapping(true);
    try {
      await reportTemplateService.update(target.id, {
        name: target.name,
        customerId: target.customerId ?? 'all',
        layout: editingLayout
      });
      toast.success(`Format mappings for "${target.name}" updated successfully!`);
      setIsEditingMappingOpen(false);
      setSelectedFormatForDetails(null);
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

      // Construct and append new report run record to Generated Reports ledger
      const targetCustomer = customers.find((c: any) => c.id === selectedCustomerId);
      const companyName = targetCustomer?.name || (selectedCustomerId === 'all' ? 'All Customers' : 'Company Report');
      const companyLogo = companyName.length >= 2 ? companyName.slice(0, 2).toUpperCase() : 'CR';
      const formatName = `${selectedTemplate?.name || 'report.xlsx'} v${selectedTemplate?.version || 1}`;

      const periodText = startDate && endDate
        ? `${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')}`
        : preset === 'this_month'
          ? `${format(startOfMonth(new Date()), 'dd/MM/yyyy')} - ${format(new Date(), 'dd/MM/yyyy')}`
          : preset === 'this_week'
            ? `${format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'dd/MM/yyyy')} - ${format(new Date(), 'dd/MM/yyyy')}`
            : 'Custom Period';

      const newReport: GeneratedReportItem = {
        id: `rep-${Date.now()}`,
        companyId: selectedCustomerId || 'all',
        companyName,
        companyLogo,
        formatName,
        dataType: selectedDataType || 'Trips',
        period: periodText,
        recordsCount: previewData?.rows?.length || filteredRows.length || 0,
        generatedOn: format(new Date(), 'dd/MM/yyyy, hh:mm a'),
        generatedBy: 'Adarsh VP',
        status: 'Ready'
      };

      setGeneratedReports(prev => [newReport, ...prev]);
      toast.success('Report generated and logged to Generated Reports ledger');
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
        label: c.name,
        icon: <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />,
        keywords: c.name,
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
    <DashboardLayout active="Company Reports" title="Company Reports">
      <div className="px-4 sm:px-6 py-5 w-full flex flex-col animate-fade-in gap-4 bg-[#EEF1F6] dark:bg-slate-950 min-h-screen">

        {/* ─── Card 1: Generate Report Controls ─── */}
        <div id="generate-report-card" className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs space-y-4">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-3">
            <h2 className="text-sm font-bold text-[#3E3C3D] dark:text-slate-100">Generate Report</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUploadModalOpen(true)}
              className="h-8 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200"
            >
              <Upload className="w-3.5 h-3.5 text-slate-500" /> Import Format
            </Button>
          </div>

          {/* Form Filter Row */}
          <div className="flex flex-wrap items-end justify-between gap-3 w-full">
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-[220px] space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Customer</label>
                <Combobox
                  options={customerComboboxOptions}
                  value={selectedCustomerId || 'all'}
                  onChange={(val: string) => {
                    setSelectedCustomerId(val);
                    const firstTpl = templates.find(t => t.customerId === val);
                    if (firstTpl) setSelectedTemplateId(firstTpl.id);
                  }}
                  placeholder="Select Customer..."
                  searchPlaceholder="Search customer..."
                  className="h-8 text-xs font-semibold rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="w-[200px] space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Report Format</label>
                <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                  <SelectTrigger className="h-8 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-lg">
                    <SelectValue placeholder="Choose Template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates
                      .filter(t => !t.customerId || t.customerId === selectedCustomerId)
                      .map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <span className="flex items-center gap-2">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                            <span>{t.name}</span>
                            <span className="text-[9px] font-mono text-slate-400">v{t.version || 1}</span>
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[110px] space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Data Type</label>
                <Select value={selectedDataType} onValueChange={setSelectedDataType}>
                  <SelectTrigger className="h-8 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-lg">
                    <SelectValue placeholder="Data Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Trips">Trips</SelectItem>
                    <SelectItem value="Invoices">Invoices</SelectItem>
                    <SelectItem value="Expenses">Expenses</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="w-[125px] space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Period</label>
                <Select
                  value={preset}
                  onValueChange={(val: string) => {
                    setPreset(val as DatePreset);
                    if (val !== 'custom') {
                      setCustomStart('');
                      setCustomEnd('');
                    }
                  }}
                >
                  <SelectTrigger className="h-8 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-lg">
                    <SelectValue placeholder="Choose Period..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {preset === 'custom' && (
                <div className="w-[200px] space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-[#FA634E]">Date Range</label>
                  <DateRangePicker
                    value={{
                      from: customStart ? new Date(customStart) : undefined,
                      to: customEnd ? new Date(customEnd) : undefined
                    }}
                    onChange={(range) => {
                      if (!range) {
                        setCustomStart('');
                        setCustomEnd('');
                      } else {
                        if (range.from) setCustomStart(format(range.from, 'yyyy-MM-dd'));
                        if (range.to) setCustomEnd(format(range.to, 'yyyy-MM-dd'));
                      }
                    }}
                    buttonClassName="h-8 w-full bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-lg"
                  />
                </div>
              )}
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="h-8 px-4 rounded-lg bg-[#FA634E] hover:bg-[#FA634E]/90 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs shrink-0"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" /> Generate Report
                </>
              )}
            </Button>
          </div>

          {/* Format Info Strip */}
          {selectedTemplate && (
            <div className="bg-[#EEF1F6]/60 dark:bg-slate-800/40 rounded-lg px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs border border-slate-200/50 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-4 text-slate-600 dark:text-slate-300 font-medium">
                <span className="flex items-center gap-1">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                  Format: <strong className="text-slate-800 dark:text-slate-100">{selectedTemplate.name}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  Columns: <strong className="text-slate-800 dark:text-slate-100">{selectedTemplate.layout?.columns?.length || 18}</strong>
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Mapped: <strong className="text-slate-800 dark:text-slate-100">{selectedTemplate.layout?.columns?.filter(c => c.source?.kind === 'field').length || 18} / {selectedTemplate.layout?.columns?.filter(c => c.source?.kind === 'field').length || 18}</strong>
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (selectedTemplate) {
                    setSelectedReportForPreview({
                      id: 'temp-prev',
                      companyId: selectedCustomerId,
                      companyName: customers.find((c: any) => c.id === selectedCustomerId)?.name || 'Customer',
                      companyLogo: 'CR',
                      formatName: selectedTemplate.name,
                      dataType: selectedDataType,
                      period: preset === 'this_month' ? 'Active Month' : 'Active Period',
                      recordsCount: filteredRows.length,
                      generatedOn: '',
                      generatedBy: '',
                      status: 'Ready'
                    });
                  }
                }}
                className="h-6 px-2 gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-white dark:hover:bg-slate-800"
              >
                <Eye className="w-3 h-3" /> Preview Data
              </Button>
            </div>
          )}
        </div>

        {/* ─── 2-Column Operational Grid ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-4 items-start">

          {/* Left Column (70%): Generated Reports history table */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h2 className="text-sm font-bold text-[#3E3C3D] dark:text-slate-100">Generated Reports</h2>

              <div className="relative w-full max-w-[220px]">
                <Search className="absolute inset-y-0 left-2.5 h-full w-3.5 text-slate-400 flex items-center pointer-events-none" />
                <input
                  type="text"
                  value={reportSearchQuery}
                  onChange={(e) => setReportSearchQuery(e.target.value)}
                  placeholder="Search reports..."
                  className="w-full h-7 pl-8 pr-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md outline-none focus:border-[#FA634E] text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            {/* Generated Reports Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    <th className="py-2 px-2">Company</th>
                    <th className="py-2 px-2">Report Format</th>
                    <th className="py-2 px-2">Data Type</th>
                    <th className="py-2 px-2">Period</th>
                    <th className="py-2 px-2 text-center">Records</th>
                    <th className="py-2 px-2">Generated On</th>
                    <th className="py-2 px-2 text-center">Status</th>
                    <th className="py-2 px-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredReports.map((report) => {
                    return (
                      <tr 
                        key={report.id} 
                        onClick={() => setSelectedReportForDetails(report)}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                      >
                        <td className="py-2 px-2 font-semibold text-slate-900 dark:text-slate-100">
                          {report.companyName}
                        </td>
                        <td className="py-2 px-2 text-slate-600 dark:text-slate-400 font-mono text-[11px]">
                          {report.formatName}
                        </td>
                        <td className="py-2 px-2 text-slate-600 dark:text-slate-400">
                          {report.dataType}
                        </td>
                        <td className="py-2 px-2 text-slate-500 font-mono text-[10px]">
                          {report.period}
                        </td>
                        <td className="py-2 px-2 text-center font-semibold font-mono text-slate-800 dark:text-slate-200">
                          {report.recordsCount}
                        </td>
                        <td className="py-2 px-2 text-slate-500 text-[10px]">
                          {report.generatedOn}
                        </td>
                        <td className="py-2 px-2 text-center">
                          {report.status === 'Ready' && (
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px] shadow-none rounded px-1.5 py-0.2">
                              Ready
                            </Badge>
                          )}
                          {report.status === 'Processing' && (
                            <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px] shadow-none rounded px-1.5 py-0.2 animate-pulse">
                              Processing
                            </Badge>
                          )}
                          {report.status === 'Failed' && (
                            <Badge className="bg-rose-50 text-rose-700 border border-rose-200 font-bold text-[10px] shadow-none rounded px-1.5 py-0.2">
                              Failed
                            </Badge>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {report.status === 'Ready' ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadReportById(report);
                                }}
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900"
                                title="Download Report"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            ) : report.status === 'Processing' ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setGeneratedReports(prev => 
                                    prev.map(r => r.id === report.id ? { ...r, status: 'Processing' } : r)
                                  );
                                  setTimeout(() => {
                                    setGeneratedReports(prev => 
                                      prev.map(r => r.id === report.id ? { ...r, status: 'Ready' } : r)
                                    );
                                    toast.success('Report generation retried successfully');
                                  }, 2000);
                                }}
                                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900"
                                title="Retry Generation"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-rose-500" />
                              </button>
                            )}

                            <button 
                              onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteGeneratedReport(report.id);
                              }}
                              className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/20 text-slate-400 hover:text-rose-600"
                              title="Delete Record"
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
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 text-slate-500 text-[11px]">
              <span>Showing {filteredReports.length} reports</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" className="h-6 w-6 p-0 rounded border-slate-200 text-slate-500">&lt;</Button>
                <Button variant="outline" size="sm" className="h-6 w-6 p-0 rounded border-[#FA634E] text-[#FA634E] font-bold bg-orange-50/40">1</Button>
                <Button variant="outline" size="sm" className="h-6 w-6 p-0 rounded border-slate-200 text-slate-500">&gt;</Button>
              </div>
            </div>
          </div>

          {/* Right Column (30%): Active report formats list */}
          <div id="your-formats-card" className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <h2 className="text-sm font-bold text-[#3E3C3D] dark:text-slate-100">Report Formats</h2>
              <Badge variant="outline" className="text-[10px] font-mono text-slate-500 border-slate-200">
                {templates.length} Active
              </Badge>
            </div>

            <div className="flex flex-col gap-2">
              {templatesLoading ? (
                <div className="text-center py-6 text-xs text-slate-400 animate-pulse">
                  Loading formats...
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                  No formats loaded
                </div>
              ) : (
                templates.map((tpl) => (
                  <div 
                    key={tpl.id}
                    onClick={() => handleOpenFormatDetails(tpl)}
                    className={cn(
                      "p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 group",
                      selectedTemplateId === tpl.id
                        ? "bg-slate-50 border-[#FA634E]/60 dark:bg-slate-800/60 ring-1 ring-[#FA634E]/20"
                        : "bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileSpreadsheet className="w-4 h-4 text-slate-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {tpl.name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate font-mono">
                          {tpl.layout?.columns?.length || 11} cols · v{tpl.version || 1}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenFormatDetails(tpl);
                        }}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700"
                        title="Format Mappings"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                      </button>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteTemplate(tpl.id, e);
                        }}
                        className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete Template"
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
              className="w-full h-8 gap-1 text-xs font-semibold border-slate-200 hover:bg-slate-50 rounded-lg bg-white dark:bg-slate-800 dark:border-slate-700"
            >
              <Plus className="w-3.5 h-3.5 text-slate-500" /> Add New Format
            </Button>
          </div>

        </div>




        {/* ─── Report Run Details Modal (Clean Operational View) ─── */}
        <Dialog open={!!selectedReportForDetails} onOpenChange={() => setSelectedReportForDetails(null)}>
          <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col p-0 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl">
            <DialogHeader className="p-4 pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-[#FA634E]" />
                  <div>
                    <DialogTitle className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Report Run Details
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      Run parameters and column mapping summary
                    </DialogDescription>
                  </div>
                </div>

                {selectedReportForDetails && (
                  <Badge className={cn(
                    "font-bold text-xs shadow-none rounded px-2.5 py-0.5 border shrink-0",
                    selectedReportForDetails.status === 'Ready' && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
                    selectedReportForDetails.status === 'Processing' && "bg-amber-50 text-amber-700 border-amber-200 animate-pulse dark:bg-amber-950/40",
                    selectedReportForDetails.status === 'Failed' && "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40"
                  )}>
                    {selectedReportForDetails.status}
                  </Badge>
                )}
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-950">
              {selectedReportForDetails && (
                <>
                  {/* Company & Format Identity */}
                  <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {selectedReportForDetails.companyName}
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Format: <strong className="text-slate-800 dark:text-slate-200">{selectedReportForDetails.formatName}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded border border-slate-200/60 dark:border-slate-700 font-mono text-xs">
                      <span className="text-slate-400">Run ID:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedReportForDetails.id}</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedReportForDetails.id);
                          toast.success('Run ID copied');
                        }}
                        className="ml-1 text-slate-400 hover:text-slate-700"
                        title="Copy Run ID"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* 4 Focused Detail Pills */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Category</span>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {selectedReportForDetails.dataType}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Period</span>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                        {selectedReportForDetails.period}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Rows</span>
                      <div className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                        {selectedReportForDetails.recordsCount} Rows
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Generated On</span>
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono truncate">
                        {selectedReportForDetails.generatedOn}
                      </div>
                    </div>
                  </div>

                  {/* Schema Columns Mapping Section */}
                  <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 p-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                      <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Exported Columns Mapping
                      </h4>
                      <Badge variant="outline" className="text-[10px] font-mono text-slate-500">
                        Normalized
                      </Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[
                        { col: 'C', header: 'VENDOR NAME', field: 'Carrier / 3rd Party' },
                        { col: 'D', header: 'DATE', field: 'Trip Date' },
                        { col: 'E', header: 'FROM', field: 'Pickup Location (Origin)' },
                        { col: 'F', header: 'DESTINATION', field: 'Dropoff Location (Destination)' },
                        { col: 'G', header: 'Rental Method', field: 'Rate Category' },
                        { col: 'H', header: 'VEHCILE TYPE', field: 'Vehicle Class / Asset Type' },
                        { col: 'I', header: 'Vehcile Number', field: 'Vehicle Plate Number' },
                        { col: 'J', header: 'UUID NUMBER', field: 'Trip / Job Ref ID' },
                        { col: 'K', header: 'CHARGES', field: 'Billing Amount (Base Rate)' },
                      ].map((item, idx) => (
                        <div key={idx} className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded border border-slate-200/60 dark:border-slate-700 flex items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-200/70 dark:bg-slate-700 px-1 py-0.2 rounded shrink-0">
                              {item.col}
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {item.header}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 truncate text-right">
                            {item.field}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-3 px-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedReportForDetails(null)}
                className="h-8 px-3 rounded-lg text-xs font-semibold"
              >
                Close
              </Button>

              <div className="flex items-center gap-2">
                {selectedReportForDetails && selectedReportForDetails.status === 'Ready' && (
                  <Button
                    size="sm"
                    onClick={() => {
                      handleDownloadReportById(selectedReportForDetails);
                      setSelectedReportForDetails(null);
                    }}
                    className="bg-[#FA634E] hover:bg-[#FA634E]/90 text-white h-8 px-4 rounded-lg font-bold text-xs gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Report (.xlsx)
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* ─── Dedicated Report Format Details Dialog Modal ─── */}
        <Dialog open={!!selectedFormatForDetails} onOpenChange={() => setSelectedFormatForDetails(null)}>
          <DialogContent className="sm:max-w-4xl max-h-[88vh] flex flex-col p-0 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl">
            {/* Modal Header */}
            <DialogHeader className="p-4 pb-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileSpreadsheet className="w-4 h-4 text-slate-600 shrink-0" />
                  <div className="min-w-0">
                    <DialogTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                      {selectedFormatForDetails?.name || 'Report Format Details'}
                    </DialogTitle>
                    <DialogDescription className="text-[11px] text-slate-500 font-mono truncate">
                      {selectedFormatForDetails?.original_filename || 'Excel Template'} · Version v{selectedFormatForDetails?.version || 1}
                    </DialogDescription>
                  </div>
                </div>

                <Badge variant="outline" className="text-[10px] font-semibold border-slate-200 shrink-0">
                  Active Format
                </Badge>
              </div>

              {/* Navigation Tabs Bar */}
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveFormatDetailsTab('mock_preview')}
                  className={cn(
                    "px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                    activeFormatDetailsTab === 'mock_preview'
                      ? "bg-[#FA634E] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  )}
                >
                  <Eye className="w-3.5 h-3.5" /> Layout Preview
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFormatDetailsTab('edit_mappings')}
                  className={cn(
                    "px-3 py-1 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                    activeFormatDetailsTab === 'edit_mappings'
                      ? "bg-[#FA634E] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  )}
                >
                  <Settings2 className="w-3.5 h-3.5" /> Edit Column Mappings
                </button>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-950">
              {activeFormatDetailsTab === 'mock_preview' ? (
                <div className="space-y-3">
                  {/* Top Metadata Info Strip */}
                  <div className="bg-white dark:bg-slate-900 rounded-lg p-3 border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Target Customer</span>
                      <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                        {selectedFormatForDetails?.customer?.name || 'Shared / Any Customer'}
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Columns Mapped</span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono">
                        {editingLayout?.columns?.length || selectedFormatForDetails?.layout?.columns?.length || 11} Columns
                      </span>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Data Range</span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono">
                        Row {editingLayout?.dataStartRow || 4} - Row {editingLayout?.dataEndRow || 10}
                      </span>
                    </div>
                  </div>

                  {/* Spreadsheet Layout Preview */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden space-y-0">
                    <div className="bg-slate-100 dark:bg-slate-800 px-3 py-1.5 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between text-xs font-mono">
                      <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
                        Excel Layout Preview ({selectedFormatForDetails?.name || 'Format'})
                      </span>
                    </div>

                    {/* Interactive Mock Excel Table Grid */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-center border-collapse">
                        <thead className="bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-[11px] uppercase border-b border-slate-300 dark:border-slate-700">
                          <tr>
                            {(editingLayout?.columns || selectedFormatForDetails?.layout?.columns || []).map((col, idx) => (
                              <th key={idx} className="px-3 py-2 border-r border-slate-300 dark:border-slate-700 whitespace-nowrap min-w-[100px]">
                                {col.headerText || `HEADER ${col.colIndex}`}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-[11px]">
                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                            {(editingLayout?.columns || selectedFormatForDetails?.layout?.columns || []).map((col, idx) => (
                              <td key={idx} className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-mono text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                {col.headerText.toLowerCase().includes('vendor') ? 'MERCON' :
                                 col.headerText.toLowerCase().includes('date') ? '01-06-2026' :
                                 col.headerText.toLowerCase().includes('from') ? 'Khamis Station' :
                                 col.headerText.toLowerCase().includes('dest') ? 'Abha Station' :
                                 col.headerText.toLowerCase().includes('rental') || col.headerText.toLowerCase().includes('method') ? 'Monthly' :
                                 col.headerText.toLowerCase().includes('type') ? '10 TON' :
                                 col.headerText.toLowerCase().includes('number') || col.headerText.toLowerCase().includes('veh') ? '5049-3531' :
                                 col.headerText.toLowerCase().includes('uuid') ? 'TRP-9402' :
                                 col.headerText.toLowerCase().includes('charge') || col.headerText.toLowerCase().includes('rate') ? '13,500.00' : '—'}
                              </td>
                            ))}
                          </tr>

                          <tr className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                            {(editingLayout?.columns || selectedFormatForDetails?.layout?.columns || []).map((col, idx) => (
                              <td key={idx} className="px-3 py-2 border-r border-slate-200 dark:border-slate-800 font-mono text-slate-800 dark:text-slate-200 whitespace-nowrap">
                                {col.headerText.toLowerCase().includes('vendor') ? 'MERCON' :
                                 col.headerText.toLowerCase().includes('date') ? '02-06-2026' :
                                 col.headerText.toLowerCase().includes('from') ? 'Riyadh Station' :
                                 col.headerText.toLowerCase().includes('dest') ? 'Al Baha Station' :
                                 col.headerText.toLowerCase().includes('rental') || col.headerText.toLowerCase().includes('method') ? 'Monthly' :
                                 col.headerText.toLowerCase().includes('type') ? '10 TON' :
                                 col.headerText.toLowerCase().includes('number') || col.headerText.toLowerCase().includes('veh') ? '012-4207' :
                                 col.headerText.toLowerCase().includes('uuid') ? 'TRP-9403' :
                                 col.headerText.toLowerCase().includes('charge') || col.headerText.toLowerCase().includes('rate') ? '52,500.00' : '—'}
                              </td>
                            ))}
                          </tr>

                          {/* Excel Totals Summary Row */}
                          <tr className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-900 dark:text-slate-100 border-t-2 border-slate-300 dark:border-slate-700">
                            {(editingLayout?.columns || selectedFormatForDetails?.layout?.columns || []).map((col, idx) => (
                              <td key={idx} className="px-3 py-2 border-r border-slate-300 dark:border-slate-700 font-mono whitespace-nowrap">
                                {idx === 0 ? 'TOTAL' :
                                 col.headerText.toLowerCase().includes('charge') || col.headerText.toLowerCase().includes('rate') ? '66,000.00' : ''}
                              </td>
                            ))}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                /* Edit Column Mappings Tab */
                <div className="space-y-3">
                  {formatInspection && editingLayout && (
                    <TemplateMappingEditor
                      inspection={formatInspection}
                      layout={editingLayout}
                      onChange={setEditingLayout}
                    />
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-3 px-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedFormatForDetails(null)}
                className="h-8 px-3 rounded-lg text-xs font-semibold"
              >
                Close
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedTemplateId(selectedFormatForDetails?.id || '');
                    if (selectedFormatForDetails?.customerId) setSelectedCustomerId(selectedFormatForDetails.customerId);
                    setSelectedFormatForDetails(null);
                    const genCard = document.getElementById('generate-report-card');
                    if (genCard) genCard.scrollIntoView({ behavior: 'smooth' });
                    toast.success(`Selected "${selectedFormatForDetails?.name}" for generation`);
                  }}
                  className="bg-[#FA634E] hover:bg-[#FA634E]/90 text-white h-8 px-4 rounded-lg font-bold text-xs gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" /> Select Format
                </Button>
                {activeFormatDetailsTab === 'edit_mappings' && (
                  <Button
                    size="sm"
                    onClick={handleSaveMapping}
                    disabled={isSavingMapping}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-4 rounded-lg font-bold text-xs gap-1.5"
                  >
                    {isSavingMapping && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    Save Mappings
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

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

        {/* ─── Add Template Dialog Modal ─── */}
        <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
          <DialogContent className={cn("flex flex-col max-h-[88vh] transition-all duration-300", inspection ? "sm:max-w-4xl" : "sm:max-w-md")}>
            <DialogHeader className="shrink-0">
              <DialogTitle className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <Plus className="w-4 h-4 text-[#FA634E]" /> Add Company Format
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-2 space-y-3 pr-1 min-h-0">
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Format Name
                    </label>
                    <input
                      type="text"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-[#FA634E]"
                      placeholder="e.g. Aramco Logistics Format"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      Target Customer
                    </label>
                    <Combobox
                      options={[
                        { value: 'all', label: 'Shared / Any Customer', icon: <Building2 className="w-3.5 h-3.5 text-slate-400" /> },
                        ...customers.map((c: any) => ({
                          value: c.id,
                          label: c.name || 'Customer Account',
                          keywords: c.name || '',
                          icon: <Building2 className="w-3.5 h-3.5 text-slate-400" />,
                        })),
                      ]}
                      value={draftCustomerId}
                      onChange={setDraftCustomerId}
                      placeholder="Select customer..."
                      searchPlaceholder="Search customer..."
                      triggerClassName="w-full h-8 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg"
                    />
                  </div>
                </div>

                {!inspection && (
                  <div className="space-y-1.5 pt-1">
                    {(isInspecting || isSaving) ? (
                      <div className="flex flex-col items-center justify-center gap-2 py-6 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                        <RefreshCw className="w-5 h-5 animate-spin text-[#FA634E]" />
                        <span className="text-xs text-slate-500 font-semibold animate-pulse">
                          Analyzing format layout...
                        </span>
                      </div>
                    ) : (
                      <label className="cursor-pointer group flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-[#FA634E] bg-slate-50 dark:bg-slate-800/40 transition-all text-xs font-semibold text-slate-500 hover:text-[#FA634E] w-full">
                        <Upload className="w-5 h-5 text-slate-400 group-hover:text-[#FA634E] transition-all" />
                        <span className="font-bold">Upload Excel format file (.xlsx)</span>
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
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetUploadFlow}
                  className="h-8 px-3 rounded-lg text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveTemplate}
                  disabled={isSaving}
                  className="h-8 px-4 rounded-lg text-xs font-bold bg-[#FA634E] hover:bg-[#FA634E]/90 text-white flex items-center gap-1.5"
                >
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Save Format
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* ─── Edit Template Mapping Dialog Modal ─── */}
        <Dialog open={isEditingMappingOpen} onOpenChange={setIsEditingMappingOpen}>
          <DialogContent className="sm:max-w-4xl max-h-[88vh] flex flex-col">
            <DialogHeader className="shrink-0">
              <DialogTitle className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                <Settings2 className="w-4 h-4 text-slate-600" /> Edit Column Mappings
              </DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-2 space-y-3 pr-1 min-h-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
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
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 outline-none focus:border-[#FA634E]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Target Customer
                  </label>
                  <Combobox
                    options={[
                      { value: 'all', label: 'Shared / Any Customer', icon: <Building2 className="w-3.5 h-3.5 text-slate-400" /> },
                      ...customers.map((c: any) => ({
                        value: c.id,
                        label: c.name || 'Customer Account',
                        keywords: c.name || '',
                        icon: <Building2 className="w-3.5 h-3.5 text-slate-400" />,
                      })),
                    ]}
                    value={editingTemplate?.customerId || 'all'}
                    onChange={(val) => {
                      if (editingTemplate) {
                        setEditingTemplate({ ...editingTemplate, customerId: val === 'all' ? null : val });
                      }
                    }}
                    placeholder="Select customer..."
                    searchPlaceholder="Search customer..."
                    triggerClassName="w-full h-8 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg"
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

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditingMappingOpen(false);
                  setEditingTemplate(null);
                  setEditingLayout(null);
                }}
                className="h-8 px-3 rounded-lg text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSaveMapping}
                disabled={isSavingMapping}
                className="h-8 px-4 rounded-lg text-xs font-bold bg-[#FA634E] hover:bg-[#FA634E]/90 text-white flex items-center gap-1.5"
              >
                {isSavingMapping && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Save Mappings
              </Button>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
