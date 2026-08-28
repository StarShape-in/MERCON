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
import { Sparkles } from 'lucide-react';

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
    return <Badge className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50 font-bold text-[11px] px-2.5 py-0.5">Round Trip</Badge>;
  }
  if (lt.includes('10')) {
    return <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900/50 font-bold text-[11px] px-2.5 py-0.5">10 Hrs Duty</Badge>;
  }
  if (lt.includes('12')) {
    return <Badge className="bg-orange-50 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/50 font-bold text-[11px] px-2.5 py-0.5">12 Hrs Duty</Badge>;
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
    return <Badge className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50 font-semibold text-[11px] px-2 py-0.5">Per Month</Badge>;
  }
  return <span className="text-xs text-slate-400 font-medium">{pricingBasis}</span>;
}

type QuotationSortOption = 'latest' | 'oldest' | 'rate_desc' | 'rate_asc' | 'customer_asc';

const QUOTATION_SORT_OPTIONS: SortOption<QuotationSortOption>[] = [
  { value: 'latest', label: 'Newest Added', icon: <ArrowDown className="w-3.5 h-3.5 text-blue-600" /> },
  { value: 'oldest', label: 'Oldest Added', icon: <ArrowUp className="w-3.5 h-3.5 text-amber-600" /> },
  { value: 'rate_desc', label: 'Rate (High → Low)', icon: <CreditCard className="w-3.5 h-3.5 text-emerald-600" /> },
  { value: 'rate_asc', label: 'Rate (Low → High)', icon: <CreditCard className="w-3.5 h-3.5 text-amber-600" /> },
  { value: 'customer_asc', label: 'Customer (A → Z)', icon: <Building2 className="w-3.5 h-3.5 text-amber-600" /> },
];

export default function QuotationListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'quotations' | 'surcharges'>('quotations');

  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [billingTypeFilter, setBillingTypeFilter] = useState('ALL');
  const [lineTypeFilter, setLineTypeFilter] = useState('ALL');
  const [vehicleClassFilter, setVehicleClassFilter] = useState('ALL');
  const [pricingBasisFilter, setPricingBasisFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<QuotationSortOption>('latest');

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [selectedQuotationsForExport, setSelectedQuotationsForExport] = useState<Quotation[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
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

  // 1b. Fetch global quotations roster for customer stats
  const { data: allQuotationsRes } = useQuery({
    queryKey: ['quotations', 'kpi-stats-roster'],
    queryFn: () => quotationService.getAll({ per_page: 1000 }),
    enabled: activeTab === 'quotations',
  });
  const allQuotations = allQuotationsRes?.data || [];
  const totalCount = allQuotations.length > 0 ? allQuotations.length : meta.total;

  // Compute quotation counts per customer for Company Tabs
  const companyCounts = useMemo(() => {
    const map: Record<string, number> = {};
    const list = allQuotations.length > 0 ? allQuotations : rawQuotations;
    for (const q of list) {
      if (q.customerId) {
        map[q.customerId] = (map[q.customerId] || 0) + 1;
      }
    }
    return map;
  }, [allQuotations, rawQuotations]);

  // 2. Fetch Customers list for filter & company tabs
  const { data: customersRes } = useQuery({
    queryKey: ['customers-lookup'],
    queryFn: () => customerService.getAll({ per_page: 100, mode: 'lookup' }),
  });
  const customers = customersRes?.data || [];

  // Sort customers so those with active quotations appear first
  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => {
      const countA = companyCounts[a.id] || 0;
      const countB = companyCounts[b.id] || 0;
      if (countB !== countA) return countB - countA;
      return a.name.localeCompare(b.name);
    });
  }, [customers, companyCounts]);

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
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 flex items-center justify-center text-xs font-extrabold border border-amber-100 dark:border-amber-900/50 shrink-0">
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
          const pickup = stops.find((s: any) => s.stop_type === 'Pickup') || stops[0];
          const dropoff = [...stops].reverse().find((s: any) => s.stop_type === 'Dropoff') || stops[stops.length - 1];

          const origin = pickup?.source_label || pickup?.location?.name || q.route_origin || 'Origin';
          const dest = dropoff?.source_label || dropoff?.location?.name || q.route_destination || 'Destination';

          return (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100 text-xs">
                <span className="truncate max-w-[120px] sm:max-w-[160px]">{origin}</span>
                <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                <span className="truncate max-w-[120px] sm:max-w-[160px]">{dest}</span>
              </div>
              {stops.length > 2 && (
                <div className="text-[10px] text-slate-400 font-semibold">
                  Via {stops.length - 2} stop{stops.length - 2 > 1 ? 's' : ''}
                </div>
              )}
            </div>
          );
        },
        mobilePriority: 'primary',
      },
      {
        header: 'Billing Type',
        accessor: (q) => getBillingTypeBadge(q.billing_type),
        mobilePriority: 'secondary',
      },
      {
        header: 'Line Type',
        accessor: (q) => getLineTypeBadge(q.line_type || q.rate_category),
        mobilePriority: 'secondary',
      },
      {
        header: 'Vehicle Class',
        accessor: (q) => (
          <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
            {q.vehicle_class || 'Standard'}
          </span>
        ),
        mobilePriority: 'secondary',
      },
      {
        header: 'Rate / Price',
        accessor: (q) => (
          <span className="font-black text-slate-900 dark:text-slate-100 text-xs">
            {q.currency || 'SAR'} {Number(q.rate ?? q.base_price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ),
        mobilePriority: 'primary',
      },
      {
        header: 'Driver Charge',
        accessor: (q) => (
          <span className="font-extrabold text-amber-700 dark:text-amber-400 text-xs">
            {q.driver_payout != null ? `${q.currency || 'SAR'} ${Number(q.driver_payout).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
          </span>
        ),
        mobilePriority: 'secondary',
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
              className="h-8 w-8 text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 rounded-lg cursor-pointer"
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
                  <FileText className="h-3.5 w-3.5 mr-2 text-amber-600" />
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
      {/* Billing Type Filter */}
      <Select value={billingTypeFilter} onValueChange={(val) => { setBillingTypeFilter(val); setPage(1); }}>
        <SelectTrigger className="h-9 px-3 w-36 shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Receipt className="h-3.5 w-3.5 text-amber-600 shrink-0" />
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
            <RouteIcon className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <SelectValue placeholder="All Lines" />
          </div>
        </SelectTrigger>
        <SelectContent align="start" className="w-48 p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
          <SelectGroup>
            <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">Line Type</SelectLabel>
            <SelectItem value="ALL" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">All Lines</SelectItem>
            <SelectItem value="SINGLE_TRIP" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">Single Trip</SelectItem>
            <SelectItem value="ROUND_TRIP" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-amber-700 font-semibold">Round Trip</SelectItem>
            <SelectItem value="10_HRS" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">10 Hrs Duty</SelectItem>
            <SelectItem value="12_HRS" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">12 Hrs Duty</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      {/* Vehicle Class Filter */}
      <Select value={vehicleClassFilter} onValueChange={(val) => { setVehicleClassFilter(val); setPage(1); }}>
        <SelectTrigger className="h-9 px-3 w-36 shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <Truck className="h-3.5 w-3.5 text-amber-600 shrink-0" />
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
      <div className="px-4 sm:px-6 pb-6 w-full flex flex-col animate-fade-in gap-4">
        
        {/* Top Header Layout with Title, Badge & Grouped Top Bar Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1 border-b border-slate-200 dark:border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
              Commercial Quotations
            </h1>
            <Badge className="bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/60 font-bold px-2.5 py-0.5 text-xs">
              Commercial Module
            </Badge>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Switcher Segmented Control */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setActiveTab('quotations')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  activeTab === 'quotations'
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-extrabold"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                <Receipt className="h-3.5 w-3.5 text-amber-600" />
                <span>Quotations</span>
              </button>
              <button
                onClick={() => setActiveTab('surcharges')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  activeTab === 'surcharges'
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs font-extrabold"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                <Tag className="h-3.5 w-3.5 text-amber-600" />
                <span>Surcharge Fees</span>
              </button>
            </div>

            {/* Grouped Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 text-xs font-bold border-slate-200/90 bg-white hover:bg-slate-50 shadow-2xs dark:bg-slate-900 dark:border-slate-800 cursor-pointer rounded-xl"
                >
                  <Download className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                  <span>Export &amp; Data</span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl">
                <DropdownMenuLabel className="text-[10px] font-extrabold tracking-wider uppercase text-slate-400 px-2 py-1">
                  Export Ledger
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleQuickExport('xlsx')} className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-lg">
                  <FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                  Export Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickExport('pdf')} className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-lg">
                  <FileText className="mr-2 h-3.5 w-3.5 text-rose-600" />
                  Export PDF (.pdf)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedQuotationsForExport([]);
                    setIsExportModalOpen(true);
                  }}
                  className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-lg text-brand hover:bg-orange-50 dark:hover:bg-orange-950/40"
                >
                  <Filter className="mr-2 h-3.5 w-3.5 text-brand" />
                  Custom Export Settings…
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />

                <DropdownMenuLabel className="text-[10px] font-extrabold tracking-wider uppercase text-slate-400 px-2 py-1">
                  Import &amp; Sync
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => setIsImportModalOpen(true)}
                  className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                >
                  <UploadCloud className="mr-2 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Import from Excel
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => refetch()}
                  className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-lg text-slate-700 dark:text-slate-300"
                >
                  <RotateCw className={cn("mr-2 h-3.5 w-3.5 text-slate-500", isFetching && "animate-spin")} />
                  Refresh Ledger
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* AI Import Pill Button */}
            <Button
              size="sm"
              className="h-9 gap-1.5 text-xs font-black bg-gradient-to-r from-orange-500 via-amber-600 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md rounded-xl px-3.5 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all"
              onClick={() => navigate('/quotations/import')}
            >
              <Sparkles className="h-4 w-4" />
              <span>AI Import</span>
            </Button>

            {/* Primary Action Button (+ New Quotation) */}
            <Button
              size="sm"
              className="h-9 gap-1.5 text-xs font-extrabold bg-brand hover:bg-brand/90 text-white shadow-md rounded-xl px-4 cursor-pointer hover:scale-[1.02] active:scale-95 transition-all"
              onClick={() => navigate('/quotations/new')}
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>+ New Quotation</span>
            </Button>
          </div>
        </div>

        {activeTab === 'surcharges' ? (
          <SurchargeFeesPanel />
        ) : (
          <>
            {/* Company Tabs Bar */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar scroll-smooth">
              <button
                onClick={() => { setCustomerFilter('ALL'); setPage(1); }}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 cursor-pointer",
                  customerFilter === 'ALL'
                    ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 shadow-xs"
                    : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80"
                )}
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>All Companies</span>
                <span className={cn(
                  "px-2 py-0.5 rounded-md text-[11px] font-extrabold",
                  customerFilter === 'ALL'
                    ? "bg-slate-800 text-slate-100 dark:bg-slate-200 dark:text-slate-800"
                    : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                )}>
                  {totalCount}
                </span>
              </button>

              {sortedCustomers.map((cust) => {
                const isSelected = customerFilter === cust.id;
                const count = companyCounts[cust.id] || 0;
                return (
                  <button
                    key={cust.id}
                    onClick={() => { setCustomerFilter(cust.id); setPage(1); }}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border shrink-0 cursor-pointer",
                      isSelected
                        ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-amber-50/50 dark:hover:bg-slate-800/80"
                    )}
                  >
                    <span className={cn(
                      "w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black uppercase shrink-0",
                      isSelected
                        ? "bg-amber-700 text-white"
                        : "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                    )}>
                      {cust.name.substring(0, 2)}
                    </span>
                    <span className="max-w-[160px] truncate">{cust.name}</span>
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[11px] font-extrabold",
                      isSelected
                        ? "bg-amber-700 text-white"
                        : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Commercial Quotation DataTable Ledger */}
            <DataTable<Quotation>
              title={
                <span className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-600" />
                  <span>
                    {customerFilter === 'ALL'
                      ? 'All Commercial Quotations'
                      : `${sortedCustomers.find((c) => c.id === customerFilter)?.name || 'Company'} Quotations`}
                  </span>
                </span>
              }
              columns={columns}
              data={quotations}
              isLoading={isLoading}
              searchPlaceholder="Search route, vehicle, price..."
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
              emptyTitle={isFiltersActive ? 'No Quotations Match Your Filters' : 'No Commercial Quotations Found'}
              emptyMessage={
                isFiltersActive
                  ? 'Try changing your search terms or clearing active filters.'
                  : 'No quotations found for this company.'
              }
            />
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
        requiredFields={['price']}
        preferSheet="Quotations"
        templateUrl="/templates/MERCON_RateCards_Import_Template.xlsx"
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
