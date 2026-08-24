import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { 
  Plus, 
  Edit2, 
  FileText, 
  Download, 
  Trash2, 
  RotateCw, 
  Filter,
  Search,
  Building2,
  MapPin,
  X,
  Truck,
  Receipt,
  Calendar,
  CheckCircle2,
  Zap,
  MoreHorizontal,
  Copy,
  Power,
  UploadCloud,
  ArrowRight,
  Tag,
  CreditCard,
  Route as RouteIcon,
  ChevronDown,
  FileSpreadsheet,
  List,
  LayoutGrid,
  Eye,
  ArrowDown,
  ArrowUp,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable, { Column, BulkAction } from '@/components/ui/DataTable';
import KpiCard from '@/components/ui/KpiCard';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { quotationService, Quotation } from '@/services/quotationService';
import { customerService } from '@/services/customerService';
import QuotationFormDialog from '@/components/quotations/RateCardFormDialog';
import SurchargeFeesPanel from '@/components/quotations/SurchargeFeesPanel';
import ExcelImportDialog from '@/components/fleet/ExcelImportDialog';
import { RATE_CARD_COLUMNS } from '@/utils/importUtils';
import ExportModal, { ExportColumn } from '@/components/ui/ExportModal';
import { SortDropdown, SortOption } from '@/components/ui/SortDropdown';
import { exportExcelTable, exportPDFTable } from '@/utils/exportUtils';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const QUOTATION_EXPORT_COLUMNS: ExportColumn<Quotation>[] = [
  { id: 'name', label: 'Quotation Name', accessor: (q) => q.name || 'Quotation' },
  { id: 'customer', label: 'Customer', accessor: (q) => q.customer?.name || 'Customer' },
  { id: 'vehicle_class', label: 'Vehicle Class', accessor: (q) => q.vehicle_class || '—' },
  { id: 'source_vehicle_label', label: 'Source Vehicle Label', accessor: (q) => q.source_vehicle_label || q.vehicle_type || '—' },
  { id: 'line_type', label: 'Line Type', accessor: (q) => q.line_type || q.rate_category || 'SINGLE_TRIP' },
  { id: 'billing_type', label: 'Billing Type', accessor: (q) => q.billing_type || 'EXTRA' },
  { id: 'pricing_basis', label: 'Pricing Basis', accessor: (q) => q.pricing_basis ? (q.pricing_basis === 'PER_TRIP' ? 'Per Trip' : 'Per Month') : 'Not Specified' },
  { id: 'rate', label: 'Rate (SAR)', accessor: (q) => `SAR ${Number(q.rate || q.base_price || 0).toLocaleString()}` },
  { id: 'status', label: 'Status', accessor: (q) => (q.is_active ? 'Active' : 'Inactive') },
  { id: 'validity', label: 'Validity', accessor: (q) => q.valid_from ? `${q.valid_from.substring(0, 10)} to ${q.valid_to ? q.valid_to.substring(0, 10) : 'Ongoing'}` : 'Ongoing' },
];

function getLineTypeBadge(lineType?: string | null) {
  const lt = (lineType || '').toUpperCase();
  if (lt.includes('ROUND')) {
    return <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50 font-bold text-[11px] px-2.5 py-0.5">Round Trip</Badge>;
  }
  if (lt.includes('10')) {
    return <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900/50 font-bold text-[11px] px-2.5 py-0.5">10 Hrs Duty</Badge>;
  }
  if (lt.includes('12')) {
    return <Badge className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50 font-bold text-[11px] px-2.5 py-0.5">12 Hrs Duty</Badge>;
  }
  return <Badge className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-bold text-[11px] px-2.5 py-0.5">Single Trip</Badge>;
}

function getBillingTypeBadge(billingType?: string | null) {
  const bt = (billingType || '').toUpperCase();
  if (bt.includes('MONTHLY')) {
    return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50 font-bold text-[11px] px-2.5 py-0.5">Monthly</Badge>;
  }
  return <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50 font-bold text-[11px] px-2.5 py-0.5">Extra</Badge>;
}

function getPricingBasisBadge(pricingBasis?: string | null) {
  if (!pricingBasis) {
    return <span className="text-xs text-slate-400 font-medium">Not Specified</span>;
  }
  if (pricingBasis === 'PER_TRIP') {
    return <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50 font-semibold text-[11px] px-2 py-0.5">Per Trip</Badge>;
  }
  if (pricingBasis === 'PER_MONTH') {
    return <Badge className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50 font-semibold text-[11px] px-2 py-0.5">Per Month</Badge>;
  }
  return <span className="text-xs text-slate-400 font-medium">{pricingBasis}</span>;
}

type QuotationSortOption = 'latest' | 'oldest' | 'rate_desc' | 'rate_asc' | 'customer_asc';

const QUOTATION_SORT_OPTIONS: SortOption<QuotationSortOption>[] = [
  { value: 'latest', label: 'Newest Added', icon: <ArrowDown className="w-3.5 h-3.5 text-blue-600" /> },
  { value: 'oldest', label: 'Oldest Added', icon: <ArrowUp className="w-3.5 h-3.5 text-amber-600" /> },
  { value: 'rate_desc', label: 'Rate (High → Low)', icon: <CreditCard className="w-3.5 h-3.5 text-emerald-600" /> },
  { value: 'rate_asc', label: 'Rate (Low → High)', icon: <CreditCard className="w-3.5 h-3.5 text-purple-600" /> },
  { value: 'customer_asc', label: 'Customer (A → Z)', icon: <Building2 className="w-3.5 h-3.5 text-indigo-600" /> },
];

export default function QuotationListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'quotations' | 'surcharges'>('quotations');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [billingTypeFilter, setBillingTypeFilter] = useState('ALL');
  const [lineTypeFilter, setLineTypeFilter] = useState('ALL');
  const [vehicleClassFilter, setVehicleClassFilter] = useState('ALL');
  const [pricingBasisFilter, setPricingBasisFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<QuotationSortOption>('latest');

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [selectedQuotationsForExport, setSelectedQuotationsForExport] = useState<Quotation[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [selectionResetKey, setSelectionResetKey] = useState(0);

  // 1. Fetch Quotations list
  const { data: quotationsRes, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['quotations', page, perPage, search, customerFilter, billingTypeFilter, lineTypeFilter, vehicleClassFilter, pricingBasisFilter, statusFilter],
    queryFn: () =>
      quotationService.getAll({
        page,
        per_page: perPage,
        ...(search ? { search } : {}),
        ...(customerFilter !== 'ALL' ? { customerId: customerFilter } : {}),
        ...(billingTypeFilter !== 'ALL' ? { billing_type: billingTypeFilter } : {}),
        ...(lineTypeFilter !== 'ALL' ? { line_type: lineTypeFilter } : {}),
        ...(vehicleClassFilter !== 'ALL' ? { vehicle_class: vehicleClassFilter } : {}),
        ...(pricingBasisFilter !== 'ALL' ? { pricing_basis: pricingBasisFilter } : {}),
        ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
      }),
    placeholderData: keepPreviousData,
    enabled: activeTab === 'quotations',
  });

  const rawQuotations = quotationsRes?.data || [];
  const meta = quotationsRes?.meta || { total: rawQuotations.length, total_pages: 1 };

  // Sort client-side
  const quotations = useMemo(() => {
    return [...rawQuotations].sort((a, b) => {
      if (sortOrder === 'rate_desc') return Number(b.rate ?? b.base_price ?? 0) - Number(a.rate ?? a.base_price ?? 0);
      if (sortOrder === 'rate_asc')  return Number(a.rate ?? a.base_price ?? 0) - Number(b.rate ?? b.base_price ?? 0);
      if (sortOrder === 'customer_asc') return (a.customer?.name || '').localeCompare(b.customer?.name || '');
      const dA = new Date(a.createdAt || 0).getTime();
      const dB = new Date(b.createdAt || 0).getTime();
      return sortOrder === 'oldest' ? dA - dB : dB - dA;
    });
  }, [rawQuotations, sortOrder]);

  // 1b. Fetch global quotations roster for KPI metrics
  const { data: allQuotationsRes } = useQuery({
    queryKey: ['quotations', 'kpi-stats-roster'],
    queryFn: () => quotationService.getAll({ per_page: 1000 }),
    enabled: activeTab === 'quotations',
  });
  const allQuotations = allQuotationsRes?.data || [];
  const totalCount = allQuotations.length > 0 ? allQuotations.length : meta.total;

  // Compute KPI metrics across full dataset
  const activeCount = useMemo(() => {
    const list = allQuotations.length > 0 ? allQuotations : quotations;
    return list.filter((q) => q.is_active).length;
  }, [allQuotations, quotations]);

  const monthlyCount = useMemo(() => {
    const list = allQuotations.length > 0 ? allQuotations : quotations;
    return list.filter((q) => (q.billing_type || '').toUpperCase() === 'MONTHLY').length;
  }, [allQuotations, quotations]);

  const extraCount = useMemo(() => {
    const list = allQuotations.length > 0 ? allQuotations : quotations;
    return list.filter((q) => (q.billing_type || '').toUpperCase() === 'EXTRA').length;
  }, [allQuotations, quotations]);

  const uniqueCustomersCount = useMemo(() => {
    const list = allQuotations.length > 0 ? allQuotations : quotations;
    return new Set(list.map((q) => q.customerId).filter(Boolean)).size;
  }, [allQuotations, quotations]);

  // 2. Fetch Customers list for filter
  const { data: customersRes } = useQuery({
    queryKey: ['customers-lookup'],
    queryFn: () => customerService.getAll({ per_page: 100, mode: 'lookup' }),
  });
  const customers = customersRes?.data || [];

  const isFiltersActive =
    search !== '' ||
    customerFilter !== 'ALL' ||
    billingTypeFilter !== 'ALL' ||
    lineTypeFilter !== 'ALL' ||
    vehicleClassFilter !== 'ALL' ||
    pricingBasisFilter !== 'ALL' ||
    statusFilter !== 'ALL';

  const clearFilters = () => {
    setSearch('');
    setCustomerFilter('ALL');
    setBillingTypeFilter('ALL');
    setLineTypeFilter('ALL');
    setVehicleClassFilter('ALL');
    setPricingBasisFilter('ALL');
    setStatusFilter('ALL');
    setPage(1);
  };

  const handleDelete = async () => {
    if (!selectedQuotation) return;
    try {
      await quotationService.delete(selectedQuotation.id);
      toast.success('Quotation deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      setSelectionResetKey(k => k + 1);
      setIsDeleteModalOpen(false);
      setSelectedQuotation(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete quotation');
    }
  };

  const handleToggleActive = async (q: Quotation) => {
    try {
      await quotationService.update(q.id, { is_active: !q.is_active });
      toast.success(`Quotation ${q.is_active ? 'deactivated' : 'activated'} successfully`);
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
    } catch (err: any) {
      toast.error(err.message || 'Failed to update quotation status');
    }
  };

  const handleQuickExport = async (format: 'xlsx' | 'pdf') => {
    const toastId = toast.loading('Preparing export…');
    try {
      const headers = ['Customer', 'Vehicle Class', 'Source Vehicle', 'Line Type', 'Billing', 'Pricing Basis', 'Commercial Rate', 'Status'];
      const rows = quotations.map(q => [
        q.customer?.name || 'Customer',
        q.vehicle_class || 'Standard',
        q.source_vehicle_label || q.vehicle_type || '—',
        q.line_type || q.rate_category || 'SINGLE_TRIP',
        q.billing_type || 'EXTRA',
        q.pricing_basis || 'Not Specified',
        `${q.currency || 'SAR'} ${Number(q.rate ?? q.base_price ?? 0).toLocaleString()}`,
        q.is_active ? 'Active' : 'Inactive',
      ]);
      toast.dismiss(toastId);
      if (format === 'xlsx') await exportExcelTable('MERCON Commercial Quotations', headers, rows, `quotations_${new Date().toISOString().slice(0, 10)}.xlsx`);
      else exportPDFTable('MERCON Commercial Quotations', headers, rows, `quotations_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch {
      toast.dismiss(toastId);
      toast.error('Failed to generate export');
    }
  };

  // Define Columns for Mercon Standard DataTable
  const columns: Column<Quotation>[] = useMemo(
    () => [
      {
        header: 'Customer',
        accessor: (q) => (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-extrabold border border-indigo-100 dark:border-indigo-900/50 shrink-0">
              {q.customer?.name ? q.customer.name.substring(0, 2).toUpperCase() : 'CU'}
            </div>
            <div>
              <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs block">{q.customer?.name || 'Customer'}</span>
              <span className="text-[10px] text-slate-400 font-mono font-semibold">ID: {q.id.substring(0, 8)}</span>
            </div>
          </div>
        ),
        mobilePriority: 'primary',
      },
      {
        header: 'Route / Corridor',
        accessor: (q) => {
          const stops = q.stops || [];
          const pickup = stops.find((s) => s.stop_type === 'Pickup') || stops[0];
          const dropoff = [...stops].reverse().find((s) => s.stop_type === 'Dropoff') || stops[stops.length - 1];
          const originName = pickup?.source_label || pickup?.location?.name || q.route_origin || 'Origin';
          const destName = dropoff?.source_label || dropoff?.location?.name || q.route_destination || 'Destination';
          const intermediateStops = stops.filter((s) => s.sequence > 1 && s.id !== dropoff?.id);

          return (
            <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-semibold text-xs max-w-[260px]">
              <span className="truncate">{originName}</span>
              <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              {intermediateStops.length > 0 && (
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded-full font-semibold shrink-0 border border-slate-200/60 dark:border-slate-700/60">
                  +{intermediateStops.length} via
                </span>
              )}
              <span className="truncate">{destName}</span>
            </div>
          );
        },
        mobilePriority: 'primary',
      },
      {
        header: 'Vehicle Class',
        accessor: (q) => (
          <div>
            <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">{q.vehicle_class || 'Standard'}</span>
            {q.source_vehicle_label && q.source_vehicle_label !== q.vehicle_class && (
              <span className="block text-[10px] text-slate-400 font-normal">{q.source_vehicle_label}</span>
            )}
          </div>
        ),
        mobilePriority: 'secondary',
      },
      {
        header: 'Line Type',
        accessor: (q) => getLineTypeBadge(q.line_type || q.rate_category),
        mobilePriority: 'secondary',
      },
      {
        header: 'Billing',
        accessor: (q) => getBillingTypeBadge(q.billing_type),
        mobilePriority: 'secondary',
      },
      {
        header: 'Pricing Basis',
        accessor: (q) => getPricingBasisBadge(q.pricing_basis),
        mobilePriority: 'hidden',
      },
      {
        header: 'Commercial Rate',
        accessor: (q) => (
          <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs">
            {q.currency || 'SAR'} {Number(q.rate ?? q.base_price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ),
        mobilePriority: 'primary',
      },
      {
        header: 'Validity Period',
        accessor: (q) => (
          <span className="text-slate-500 text-[11px] font-medium">
            {q.valid_from ? (
              <span>
                {q.valid_from.substring(0, 10)} {q.valid_to ? `→ ${q.valid_to.substring(0, 10)}` : '→ Ongoing'}
              </span>
            ) : (
              <span className="text-slate-400 font-medium">Ongoing</span>
            )}
          </span>
        ),
        mobilePriority: 'hidden',
      },
      {
        header: 'Status',
        accessor: (q) => (
          q.is_active ? (
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50 text-[10px] font-bold">Active</Badge>
          ) : (
            <Badge className="bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 text-[10px]">Inactive</Badge>
          )
        ),
        mobilePriority: 'primary',
      },
      {
        header: 'Actions',
        headerClassName: 'text-right',
        className: 'text-right whitespace-nowrap',
        accessor: (q) => (
          <div className="flex items-center justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/quotations/${q.id}`)}
              title="View Details"
              className="h-8 w-8 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg cursor-pointer"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg cursor-pointer">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 p-1.5 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl">
                <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">Quotation Actions</DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />
                <DropdownMenuItem onClick={() => navigate(`/quotations/${q.id}`)} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                  <FileText className="h-3.5 w-3.5 mr-2 text-indigo-600" />
                  <span>View Details</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/quotations/${q.id}/edit`)} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                  <Edit2 className="h-3.5 w-3.5 mr-2 text-blue-600" />
                  <span>Edit Quotation</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/quotations/new?customer_id=${q.customerId}&origin_id=${q.originLocationId || ''}&dest_id=${q.destinationLocationId || ''}`)} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                  <Copy className="h-3.5 w-3.5 mr-2 text-purple-600" />
                  <span>Duplicate</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleToggleActive(q)} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                  <Power className="h-3.5 w-3.5 mr-2 text-amber-600" />
                  <span>{q.is_active ? 'Deactivate' : 'Activate'}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  onClick={() => { setSelectedQuotation(q); setIsDeleteModalOpen(true); }}
                  className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                  <span>Delete</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ),
        mobilePriority: 'primary',
      },
    ],
    [navigate]
  );

  // Bulk Actions
  const bulkActions: BulkAction<Quotation>[] = [
    {
      label: 'Export Selected',
      icon: <Download size={13} />,
      variant: 'secondary',
      onClick: (selectedRows) => {
        setSelectedQuotationsForExport(selectedRows);
        setIsExportModalOpen(true);
      },
    },
    {
      label: 'Delete Selected',
      icon: <Trash2 size={13} />,
      variant: 'danger',
      onClick: async (selectedRows, clearSelection) => {
        try {
          await Promise.all(selectedRows.map((q) => quotationService.delete(q.id)));
          toast.success(`Deleted ${selectedRows.length} quotations successfully`);
          queryClient.invalidateQueries({ queryKey: ['quotations'] });
          setSelectionResetKey((k) => k + 1);
          clearSelection();
        } catch (e) {
          toast.error('Failed to delete selected quotations');
        }
      },
    },
  ];

  // Filter Element Slot for DataTable
  const filterElement = (
    <div className="flex items-center gap-2 flex-wrap shrink-0">
      {/* Customer Filter */}
      <Select value={customerFilter} onValueChange={(val) => { setCustomerFilter(val); setPage(1); }}>
        <SelectTrigger className="h-9 px-3 w-40 shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Building2 className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <SelectValue placeholder="All Customers" />
          </div>
        </SelectTrigger>
        <SelectContent align="start" className="w-52 p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
          <SelectGroup>
            <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">Customer</SelectLabel>
            <SelectItem value="ALL" className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md">All Customers</SelectItem>
          </SelectGroup>
          <SelectSeparator className="my-1 border-slate-100" />
          <SelectGroup>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                {c.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {/* Billing Type Filter */}
      <Select value={billingTypeFilter} onValueChange={(val) => { setBillingTypeFilter(val); setPage(1); }}>
        <SelectTrigger className="h-9 px-3 w-36 shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Receipt className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <SelectValue placeholder="All Billing" />
          </div>
        </SelectTrigger>
        <SelectContent align="start" className="w-44 p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
          <SelectGroup>
            <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">Billing Type</SelectLabel>
            <SelectItem value="ALL" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">All Billing</SelectItem>
            <SelectItem value="MONTHLY" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-emerald-700 font-semibold">Monthly</SelectItem>
            <SelectItem value="EXTRA" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-amber-700 font-semibold">Extra</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      {/* Line Type Filter */}
      <Select value={lineTypeFilter} onValueChange={(val) => { setLineTypeFilter(val); setPage(1); }}>
        <SelectTrigger className="h-9 px-3 w-36 shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <RouteIcon className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <SelectValue placeholder="All Lines" />
          </div>
        </SelectTrigger>
        <SelectContent align="start" className="w-48 p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
          <SelectGroup>
            <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">Line Type</SelectLabel>
            <SelectItem value="ALL" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">All Lines</SelectItem>
            <SelectItem value="SINGLE_TRIP" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">Single Trip</SelectItem>
            <SelectItem value="ROUND_TRIP" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-indigo-700 font-semibold">Round Trip</SelectItem>
            <SelectItem value="10_HRS" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">10 Hrs Duty</SelectItem>
            <SelectItem value="12_HRS" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">12 Hrs Duty</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      {/* Vehicle Class Filter */}
      <Select value={vehicleClassFilter} onValueChange={(val) => { setVehicleClassFilter(val); setPage(1); }}>
        <SelectTrigger className="h-9 px-3 w-36 shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Truck className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <SelectValue placeholder="All Vehicles" />
          </div>
        </SelectTrigger>
        <SelectContent align="start" className="w-44 p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
          <SelectGroup>
            <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">Vehicle Class</SelectLabel>
            <SelectItem value="ALL" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">All Vehicles</SelectItem>
            <SelectItem value="3-4 TON" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">3-4 TON</SelectItem>
            <SelectItem value="5 TON" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">5 TON</SelectItem>
            <SelectItem value="10 TON" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">10 TON</SelectItem>
            <SelectItem value="20 TON" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">20 TON</SelectItem>
            <SelectItem value="40 FEET" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">40 FEET</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      {/* Sort */}
      <SortDropdown value={sortOrder} onChange={setSortOrder} options={QUOTATION_SORT_OPTIONS} />

      {isFiltersActive && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-9 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg px-2.5 shrink-0 font-bold"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          <span>Clear</span>
        </Button>
      )}
    </div>
  );

  return (
    <DashboardLayout active="Quotations" title="Quotations Ledger">
      <div className="px-4 sm:px-6 pb-6 w-full flex flex-col animate-fade-in gap-5">
        
        {/* Top Header Layout with Context Selector & Primary Action */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1">
          <div className="flex items-center gap-3">
            <Receipt className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Commercial Quotations
                </h1>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={cn(
                  'px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5',
                  viewMode === 'list' ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                <List className="w-3.5 h-3.5" /> List
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'px-3 py-1 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5',
                  viewMode === 'grid' ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 shadow-2xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                )}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Grid
              </button>
            </div>

            {/* Export / Import Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs dark:bg-slate-900 dark:border-slate-800 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                  Export / Import
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl">
                <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                  Export Data
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleQuickExport('xlsx')} className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md">
                  <FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                  Export Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickExport('pdf')} className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md">
                  <FileText className="mr-2 h-3.5 w-3.5 text-rose-600" />
                  Export PDF (.pdf)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedQuotationsForExport([]);
                    setIsExportModalOpen(true);
                  }}
                  className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-brand hover:bg-orange-50 dark:hover:bg-orange-950/40"
                >
                  <Filter className="mr-2 h-3.5 w-3.5 text-brand" />
                  Custom Export Settings…
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />

                <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                  Import Data
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => setIsImportModalOpen(true)}
                  className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                >
                  <UploadCloud className="mr-2 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Import from Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Primary Action Button */}
            <Button
              size="sm"
              className="h-9 gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs rounded-md px-4 cursor-pointer"
              onClick={() => navigate('/quotations/new')}
            >
              <Plus className="h-4 w-4" />
              <span>New Quotation</span>
            </Button>

            {/* Refresh Button */}
            <button
              onClick={() => refetch()}
              title="Refresh Quotations"
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <RotateCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Module Segmented Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <Button
            variant={activeTab === 'quotations' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('quotations')}
            className={cn(
              "h-9 gap-2 rounded-xl text-xs font-bold px-4 transition-all cursor-pointer",
              activeTab === 'quotations'
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Receipt className="h-4 w-4" />
            <span>Commercial Quotation Master</span>
            <Badge className={cn("ml-1 text-[10px] px-1.5 py-0.2 font-bold", activeTab === 'quotations' ? "bg-indigo-500 text-white border-transparent" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400")}>
              {totalCount}
            </Badge>
          </Button>

          <Button
            variant={activeTab === 'surcharges' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('surcharges')}
            className={cn(
              "h-9 gap-2 rounded-xl text-xs font-bold px-4 transition-all cursor-pointer",
              activeTab === 'surcharges'
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Tag className="h-4 w-4" />
            <span>Ancillary Surcharge Fees</span>
          </Button>
        </div>

        {activeTab === 'surcharges' ? (
          <SurchargeFeesPanel />
        ) : (
          <>
            {/* Instrument-Panel KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 shrink-0">
              <KpiCard
                title="ACTIVE QUOTATIONS"
                value={
                  <span>
                    {activeCount}
                    <span className="text-[16px] font-semibold ml-1.5 opacity-85">Active</span>
                  </span>
                }
                variant="emerald"
                trend="up"
                trendValue="Billable"
                description="Currently billable for trips"
                icon={CheckCircle2}
                completionGauge={{
                  percentage: Math.round((activeCount / (totalCount || 1)) * 100) || 0,
                  label: `${Math.round((activeCount / (totalCount || 1)) * 100)}% Active`,
                  subtext: `${activeCount} Active • ${totalCount - activeCount} Inactive`,
                }}
                isActive={statusFilter === 'active'}
                onClick={() => {
                  setStatusFilter(statusFilter === 'active' ? 'ALL' : 'active');
                  setPage(1);
                }}
              />

              <KpiCard
                title="MONTHLY CONTRACTS"
                value={
                  <span>
                    {monthlyCount}
                    <span className="text-[16px] font-semibold ml-1.5 opacity-85">Monthly</span>
                  </span>
                }
                variant="purple"
                trend="neutral"
                trendValue="Agreements"
                description="Contracted monthly agreements"
                icon={Calendar}
                progressSegments={[
                  { label: `Monthly (${monthlyCount})`, value: Math.round((monthlyCount / (totalCount || 1)) * 100) || 10, color: 'bg-purple-500' },
                  { label: `Extra (${extraCount})`, value: Math.round((extraCount / (totalCount || 1)) * 100) || 10, color: 'bg-amber-500' },
                ]}
                isActive={billingTypeFilter === 'MONTHLY'}
                onClick={() => {
                  setBillingTypeFilter(billingTypeFilter === 'MONTHLY' ? 'ALL' : 'MONTHLY');
                  setPage(1);
                }}
              />

              <KpiCard
                title="EXTRA TRIP RATES"
                value={
                  <span>
                    {extraCount}
                    <span className="text-[16px] font-semibold ml-1.5 opacity-85">Ad-Hoc</span>
                  </span>
                }
                variant="amber"
                trend="neutral"
                trendValue="Ad-Hoc"
                description="Ad-hoc & extra trip rules"
                icon={Zap}
                chartData={[3, 5, 8, extraCount || 12, 10, 8, extraCount || 12]}
                isActive={billingTypeFilter === 'EXTRA'}
                onClick={() => {
                  setBillingTypeFilter(billingTypeFilter === 'EXTRA' ? 'ALL' : 'EXTRA');
                  setPage(1);
                }}
              />

              <KpiCard
                title="CUSTOMERS BILLED"
                value={
                  <span>
                    {uniqueCustomersCount}
                    <span className="text-[16px] font-semibold ml-1.5 opacity-85">Clients</span>
                  </span>
                }
                variant="blue"
                trend="up"
                trendValue="Active Rates"
                description="Customers with active rates"
                icon={Building2}
                semiCircleGauge={{
                  segments: [
                    { label: 'Active', count: activeCount, color: '#10B981' },
                    { label: 'Total', count: totalCount, color: '#3B82F6' },
                  ],
                }}
                isActive={customerFilter !== 'ALL'}
                onClick={clearFilters}
              />
            </div>

            {/* View Mode Switch (List DataTable vs Grid Cards) */}
            {viewMode === 'list' ? (
              <DataTable<Quotation>
                title={
                  <span className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-indigo-600" />
                    <span>Commercial Quotation Ledger</span>
                  </span>
                }
                columns={columns}
                data={quotations}
                isLoading={isLoading}
                searchPlaceholder="Search customer, route, vehicle..."
                searchValue={search}
                onSearchChange={(val) => {
                  setSearch(val);
                  setPage(1);
                }}
                filterElement={filterElement}
                currentPage={page}
                totalPages={meta.total_pages}
                onPageChange={setPage}
                pageSize={perPage}
                onPageSizeChange={(newSize) => {
                  setPerPage(newSize);
                  setPage(1);
                }}
                totalRecords={meta.total}
                enableSelection={true}
                compact={true}
                bulkActions={bulkActions}
                selectionResetKey={selectionResetKey}
                onRowClick={(row) => navigate(`/quotations/${row.id}`)}
                emptyTitle={isFiltersActive ? 'No Quotations Match Your Filters' : 'No Commercial Quotations Yet'}
                emptyMessage={
                  isFiltersActive
                    ? 'Try changing your search terms or clearing active filters.'
                    : 'Create your first customer quotation to start dispatching with commercial rates.'
                }
              />
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
                  {filterElement}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {quotations.map((q) => {
                    const stops = q.stops || [];
                    const pickup = stops.find((s) => s.stop_type === 'Pickup') || stops[0];
                    const dropoff = [...stops].reverse().find((s) => s.stop_type === 'Dropoff') || stops[stops.length - 1];
                    const originName = pickup?.source_label || pickup?.location?.name || q.route_origin || 'Origin';
                    const destName = dropoff?.source_label || dropoff?.location?.name || q.route_destination || 'Destination';

                    return (
                      <div
                        key={q.id}
                        onClick={() => navigate(`/quotations/${q.id}`)}
                        className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-indigo-500/40 hover:-translate-y-0.5 hover:shadow-md transition-all duration-150 ease-in-out cursor-pointer space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-extrabold text-xs border border-indigo-100 dark:border-indigo-900/50">
                              {q.customer?.name ? q.customer.name.substring(0, 2).toUpperCase() : 'CU'}
                            </div>
                            <span className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                              {q.customer?.name || 'Customer'}
                            </span>
                          </div>
                          {q.is_active ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">Active</Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-500 border-slate-200 text-[10px]">Inactive</Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200 pt-1">
                          <span className="truncate">{originName}</span>
                          <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{destName}</span>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div>
                            <span className="text-slate-400 block text-[10px] font-medium">Vehicle</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{q.vehicle_class || 'Standard'}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 block text-[10px] font-medium">Rate</span>
                            <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                              {q.currency || 'SAR'} {Number(q.rate ?? q.base_price ?? 0).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          {getLineTypeBadge(q.line_type || q.rate_category)}
                          {getBillingTypeBadge(q.billing_type)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Quotation Form Modal */}
      <QuotationFormDialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setSelectedQuotation(null);
        }}
        quotation={selectedQuotation}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Delete Commercial Quotation"
        message="Are you sure you want to delete this quotation? Historical trips billed with this quotation will retain their commercial snapshot."
        confirmLabel="Delete Quotation"
        isDestructive
      />

      {/* Excel Import Modal */}
      <ExcelImportDialog
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        entityLabel="Quotations"
        columns={RATE_CARD_COLUMNS}
        requiredFields={['rate']}
        preferSheet="Quotations"
        templateUrl="/templates/Quotations_Template.xlsx"
        onImport={(rows) => quotationService.importRows(rows as any)}
        invalidateKeys={[['quotations']]}
      />

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        filteredData={selectedQuotationsForExport.length > 0 ? selectedQuotationsForExport : quotations}
        allData={quotations}
        columns={QUOTATION_EXPORT_COLUMNS}
        fileNamePrefix="Mercon_Commercial_Quotations"
        title="Export Commercial Quotations"
      />
    </DashboardLayout>
  );
}

export const RateCardListPage = QuotationListPage;
