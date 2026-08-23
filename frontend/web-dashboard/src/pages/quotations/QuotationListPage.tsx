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
  ChevronLeft,
  ChevronRight,
  Truck,
  Receipt,
  Calendar,
  CheckCircle2,
  Zap,
  MoreHorizontal,
  Copy,
  Power,
  Layers,
  UploadCloud,
  SlidersHorizontal,
  ArrowRight,
  Tag,
  CreditCard,
  Route as RouteIcon,
  ChevronDown,
  FileSpreadsheet,
  List,
  LayoutGrid,
  Eye,
  Sliders,
  Sparkles
} from 'lucide-react';

import { cn } from '@/lib/utils';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable, { Column, BulkAction } from '@/components/ui/DataTable';
import KpiCard from '@/components/ui/KpiCard';
import ConfirmModal from '@/components/ui/ConfirmModal';
import StatusBadge from '@/components/ui/StatusBadge';
import { quotationService, Quotation } from '@/services/quotationService';
import { customerService } from '@/services/customerService';
import QuotationFormDialog from '@/components/quotations/RateCardFormDialog';
import SurchargeFeesPanel from '@/components/quotations/SurchargeFeesPanel';
import ExcelImportDialog from '@/components/fleet/ExcelImportDialog';
import { RATE_CARD_COLUMNS } from '@/utils/importUtils';
import ExportModal, { ExportColumn } from '@/components/ui/ExportModal';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    return <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50 font-semibold text-[11px] px-2.5 py-0.5">Round Trip</Badge>;
  }
  if (lt.includes('10')) {
    return <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900/50 font-semibold text-[11px] px-2.5 py-0.5">10 Hrs Duty</Badge>;
  }
  if (lt.includes('12')) {
    return <Badge className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50 font-semibold text-[11px] px-2.5 py-0.5">12 Hrs Duty</Badge>;
  }
  return <Badge className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 font-semibold text-[11px] px-2.5 py-0.5">Single Trip</Badge>;
}

function getBillingTypeBadge(billingType?: string | null) {
  const bt = (billingType || '').toUpperCase();
  if (bt.includes('MONTHLY')) {
    return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50 font-semibold text-[11px] px-2.5 py-0.5">Monthly</Badge>;
  }
  return <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50 font-semibold text-[11px] px-2.5 py-0.5">Extra</Badge>;
}

function getPricingBasisBadge(pricingBasis?: string | null) {
  if (!pricingBasis) {
    return <span className="text-xs text-slate-400 font-medium">Not Specified</span>;
  }
  if (pricingBasis === 'PER_TRIP') {
    return <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50 font-medium text-[11px] px-2 py-0.5">Per Trip</Badge>;
  }
  if (pricingBasis === 'PER_MONTH') {
    return <Badge className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50 font-medium text-[11px] px-2 py-0.5">Per Month</Badge>;
  }
  return <span className="text-xs text-slate-400 font-medium">{pricingBasis}</span>;
}

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

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [selectedQuotationsForExport, setSelectedQuotationsForExport] = useState<Quotation[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

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

  const quotations = quotationsRes?.data || [];
  const meta = quotationsRes?.meta || { total: quotations.length, total_pages: 1 };

  // 1b. Fetch global quotations roster for KPI metrics
  const { data: allQuotationsRes } = useQuery({
    queryKey: ['quotations', 'kpi-stats-roster'],
    queryFn: () => quotationService.getAll({ per_page: 1000 }),
    enabled: activeTab === 'quotations',
  });
  const allQuotations = allQuotationsRes?.data || [];

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

  // Define Columns for Mercon Standard DataTable
  const columns: Column<Quotation>[] = useMemo(
    () => [
      {
        header: 'Customer',
        accessor: (q) => (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-bold border border-indigo-100 dark:border-indigo-900/50 shrink-0">
              {q.customer?.name ? q.customer.name.substring(0, 2).toUpperCase() : 'CU'}
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-slate-100 text-xs block">{q.customer?.name || 'Customer'}</span>
              <span className="text-[10px] text-slate-400 font-mono">ID: {q.id.substring(0, 8)}</span>
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
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50 text-[10px] font-semibold">Active</Badge>
          ) : (
            <Badge className="bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 text-[10px]">Inactive</Badge>
          )
        ),
        mobilePriority: 'primary',
      },
      {
        header: 'Actions',
        accessor: (q) => (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/quotations/${q.id}`)}
              title="View Details"
              className="h-8 w-8 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 text-xs">
                <DropdownMenuLabel>Quotation Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`/quotations/${q.id}`)}>
                  <FileText className="h-3.5 w-3.5 mr-2 text-slate-500" />
                  <span>View Details</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSelectedQuotation(q); setIsFormOpen(true); }}>
                  <Edit2 className="h-3.5 w-3.5 mr-2 text-blue-500" />
                  <span>Edit Quotation</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setSelectedQuotation({ ...q, id: undefined as any }); setIsFormOpen(true); }}>
                  <Copy className="h-3.5 w-3.5 mr-2 text-indigo-500" />
                  <span>Duplicate</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleToggleActive(q)}>
                  <Power className="h-3.5 w-3.5 mr-2 text-amber-500" />
                  <span>{q.is_active ? 'Deactivate' : 'Activate'}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setSelectedQuotation(q); setIsDeleteModalOpen(true); }} className="text-rose-600 dark:text-rose-400 focus:text-rose-600">
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
          clearSelection();
        } catch (e) {
          toast.error('Failed to delete selected quotations');
        }
      },
    },
  ];

  // Filter Element Slot for DataTable (compact horizontal bar)
  const filterElement = (
    <div className="flex items-center gap-1.5 overflow-x-auto max-w-full py-0.5 shrink-0 no-scrollbar">
      {/* Customer Filter */}
      <Select value={customerFilter} onValueChange={(val) => { setCustomerFilter(val); setPage(1); }}>
        <SelectTrigger className="h-8 text-xs w-[130px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shrink-0 px-2">
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 truncate">
            <Building2 className="h-3 w-3 text-slate-400 shrink-0" />
            <SelectValue placeholder="Customer" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Customers</SelectItem>
          {customers.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Billing Type Filter */}
      <Select value={billingTypeFilter} onValueChange={(val) => { setBillingTypeFilter(val); setPage(1); }}>
        <SelectTrigger className="h-8 text-xs w-[115px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shrink-0 px-2">
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 truncate">
            <Receipt className="h-3 w-3 text-slate-400 shrink-0" />
            <SelectValue placeholder="Billing" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Billing</SelectItem>
          <SelectItem value="MONTHLY">Monthly</SelectItem>
          <SelectItem value="EXTRA">Extra</SelectItem>
        </SelectContent>
      </Select>

      {/* Line Type Filter */}
      <Select value={lineTypeFilter} onValueChange={(val) => { setLineTypeFilter(val); setPage(1); }}>
        <SelectTrigger className="h-8 text-xs w-[115px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shrink-0 px-2">
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 truncate">
            <RouteIcon className="h-3 w-3 text-slate-400 shrink-0" />
            <SelectValue placeholder="Line Type" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Lines</SelectItem>
          <SelectItem value="SINGLE_TRIP">Single Trip</SelectItem>
          <SelectItem value="ROUND_TRIP">Round Trip</SelectItem>
          <SelectItem value="10_HRS">10 Hrs Duty</SelectItem>
          <SelectItem value="12_HRS">12 Hrs Duty</SelectItem>
        </SelectContent>
      </Select>

      {/* Vehicle Class Filter */}
      <Select value={vehicleClassFilter} onValueChange={(val) => { setVehicleClassFilter(val); setPage(1); }}>
        <SelectTrigger className="h-8 text-xs w-[115px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shrink-0 px-2">
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 truncate">
            <Truck className="h-3 w-3 text-slate-400 shrink-0" />
            <SelectValue placeholder="Vehicle" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Vehicles</SelectItem>
          <SelectItem value="3-4 TON">3-4 TON</SelectItem>
          <SelectItem value="5 TON">5 TON</SelectItem>
          <SelectItem value="10 TON">10 TON</SelectItem>
          <SelectItem value="20 TON">20 TON</SelectItem>
          <SelectItem value="40 FEET">40 FEET</SelectItem>
        </SelectContent>
      </Select>

      {/* Pricing Basis Filter */}
      <Select value={pricingBasisFilter} onValueChange={(val) => { setPricingBasisFilter(val); setPage(1); }}>
        <SelectTrigger className="h-8 text-xs w-[115px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shrink-0 px-2">
          <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 truncate">
            <CreditCard className="h-3 w-3 text-slate-400 shrink-0" />
            <SelectValue placeholder="Basis" />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Basis</SelectItem>
          <SelectItem value="PER_TRIP">Per Trip</SelectItem>
          <SelectItem value="PER_MONTH">Per Month</SelectItem>
          <SelectItem value="NULL">Not Specified</SelectItem>
        </SelectContent>
      </Select>

      {/* Status Filter */}
      <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
        <SelectTrigger className="h-8 text-xs w-[95px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-lg shrink-0 px-2">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">All Status</SelectItem>
          <SelectItem value="active">Active</SelectItem>
          <SelectItem value="inactive">Inactive</SelectItem>
        </SelectContent>
      </Select>

      {isFiltersActive && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg px-2 shrink-0 font-semibold"
        >
          <X className="h-3.5 w-3.5 mr-0.5" />
          <span>Clear</span>
        </Button>
      )}
    </div>
  );

  return (
    <DashboardLayout active="Quotations" title="Quotations">
      <div className="px-4 sm:px-6 pb-8 w-full flex flex-col animate-fade-in gap-5">
        
        {/* Top Header Layout with Context Selector & Primary Action */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1">
          <div className="flex items-center gap-3">
            <Receipt className="w-6 h-6 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                  <span>🏢 MERCON Logistics</span>
                  <span className="text-slate-400">↕</span>
                </div>
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800 font-semibold text-xs">
                  Operations Module
                </Badge>
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mt-0.5">
                Quotations
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 rounded-md transition-all text-xs flex items-center gap-1 font-semibold',
                  viewMode === 'list' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                )}
                title="List View"
              >
                <List size={14} />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded-md transition-all text-xs flex items-center gap-1 font-semibold',
                  viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                )}
                title="Grid View"
              >
                <LayoutGrid size={14} />
              </button>
            </div>

            {/* Export / Import Dropdown Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs dark:bg-slate-900 dark:border-slate-800"
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
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedQuotationsForExport([]);
                    setIsExportModalOpen(true);
                  }}
                  className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md"
                >
                  <FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                  Export CSV / Excel
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
              className="h-9 gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs rounded-md px-4"
              onClick={() => {
                setSelectedQuotation(null);
                setIsFormOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              <span>+ New Quotation</span>
            </Button>

            {/* Refresh Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              title="Refresh Data"
              className="h-9 w-9 text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl"
            >
              <RotateCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* Module Segmented Tab Switcher */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
          <Button
            variant={activeTab === 'quotations' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('quotations')}
            className={cn(
              "h-9 gap-2 rounded-xl text-xs font-semibold px-4 transition-all",
              activeTab === 'quotations'
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800"
            )}
          >
            <Receipt className="h-4 w-4" />
            <span>Commercial Quotation Master</span>
            <Badge className={cn("ml-1 text-[10px] px-1.5 py-0.2", activeTab === 'quotations' ? "bg-indigo-500 text-white border-transparent" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400")}>
              {meta.total}
            </Badge>
          </Button>

          <Button
            variant={activeTab === 'surcharges' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab('surcharges')}
            className={cn(
              "h-9 gap-2 rounded-xl text-xs font-semibold px-4 transition-all",
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard
                title="Active Quotations"
                value={activeCount}
                subtitle="Currently billable for trips"
                trend="up"
                icon={<CheckCircle2 className="h-5 w-5 text-emerald-600" />}
                onClick={() => {
                  setStatusFilter(statusFilter === 'active' ? 'ALL' : 'active');
                  setPage(1);
                }}
                className={cn("cursor-pointer transition-all hover:border-emerald-300 dark:hover:border-emerald-800", statusFilter === 'active' && "ring-2 ring-emerald-500 border-emerald-500")}
              />
              <KpiCard
                title="Monthly Quotations"
                value={monthlyCount}
                subtitle="Contracted monthly agreements"
                trend="neutral"
                icon={<Calendar className="h-5 w-5 text-purple-600" />}
                onClick={() => {
                  setBillingTypeFilter(billingTypeFilter === 'MONTHLY' ? 'ALL' : 'MONTHLY');
                  setPage(1);
                }}
                className={cn("cursor-pointer transition-all hover:border-purple-300 dark:hover:border-purple-800", billingTypeFilter === 'MONTHLY' && "ring-2 ring-purple-500 border-purple-500")}
              />
              <KpiCard
                title="Extra Quotations"
                value={extraCount}
                subtitle="Ad-hoc & extra trip rules"
                trend="neutral"
                icon={<Zap className="h-5 w-5 text-amber-600" />}
                onClick={() => {
                  setBillingTypeFilter(billingTypeFilter === 'EXTRA' ? 'ALL' : 'EXTRA');
                  setPage(1);
                }}
                className={cn("cursor-pointer transition-all hover:border-amber-300 dark:hover:border-amber-800", billingTypeFilter === 'EXTRA' && "ring-2 ring-amber-500 border-amber-500")}
              />
              <KpiCard
                title="Customers Billed"
                value={uniqueCustomersCount}
                subtitle="Customers with active rates"
                trend="up"
                icon={<Building2 className="h-5 w-5 text-blue-600" />}
                onClick={clearFilters}
                className="cursor-pointer transition-all hover:border-blue-300 dark:hover:border-blue-800"
              />
            </div>

            {/* View Mode Switch (List DataTable vs Grid Cards) */}
            {viewMode === 'list' ? (
              <DataTable<Quotation>
                title="Commercial Quotation Ledger"
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
                bulkActions={bulkActions}
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all cursor-pointer space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-xs border border-indigo-100 dark:border-indigo-900/50">
                              {q.customer?.name ? q.customer.name.substring(0, 2).toUpperCase() : 'CU'}
                            </div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                              {q.customer?.name || 'Customer'}
                            </span>
                          </div>
                          {q.is_active ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-semibold">Active</Badge>
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
                            <span className="text-slate-400 block text-[10px]">Vehicle</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{q.vehicle_class || 'Standard'}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-slate-400 block text-[10px]">Rate</span>
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
