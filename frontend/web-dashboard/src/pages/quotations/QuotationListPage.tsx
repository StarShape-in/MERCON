import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
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
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  FileSpreadsheet,
  Eye,
  ArrowDown,
  ArrowUp,
  List,
  Sparkles,
  Banknote,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable, { Column, BulkAction } from '@/components/ui/DataTable';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
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
    return <Badge variant="secondary" className="font-medium text-[11px] px-2 py-0.5">Round Trip</Badge>;
  }
  if (lt.includes('10')) {
    return <Badge variant="outline" className="font-medium text-[11px] px-2 py-0.5">10 Hrs Duty</Badge>;
  }
  if (lt.includes('12')) {
    return <Badge variant="outline" className="font-medium text-[11px] px-2 py-0.5">12 Hrs Duty</Badge>;
  }
  return <Badge variant="outline" className="font-medium text-[11px] px-2 py-0.5 text-slate-600 dark:text-slate-400">Single Trip</Badge>;
}

function getBillingTypeBadge(billingType?: string | null) {
  const bt = (billingType || '').toUpperCase();
  if (bt.includes('MONTHLY')) {
    return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50 font-medium text-[11px] px-2 py-0.5">Monthly</Badge>;
  }
  return <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50 font-medium text-[11px] px-2 py-0.5">Extra</Badge>;
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
  const [viewMode, setViewMode] = useState<'company_grouped' | 'flat_list'>('company_grouped');

  const [search, setSearch] = useState('');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [billingTypeFilter, setBillingTypeFilter] = useState('ALL');
  const [lineTypeFilter, setLineTypeFilter] = useState('ALL');
  const [vehicleClassFilter, setVehicleClassFilter] = useState('ALL');
  const [pricingBasisFilter, setPricingBasisFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortOrder, setSortOrder] = useState<QuotationSortOption>('latest');

  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(100);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [selectedQuotationsForExport, setSelectedQuotationsForExport] = useState<Quotation[]>([]);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectionResetKey, setSelectionResetKey] = useState(0);

  // Set of Expanded Company Accordion Cards
  const [expandedCompanies, setExpandedCompanies] = useState<Record<string, boolean>>({});

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

  // Fetch Customers lookup for filter
  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 200, mode: 'lookup' }),
  });
  const sortedCustomers = customersRes?.data || [];

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

  // Group Quotations by Customer Company
  const companyGroups = useMemo(() => {
    const groups: Array<{
      id: string;
      name: string;
      quotations: Quotation[];
      totalValue: number;
      monthlyCount: number;
      extraCount: number;
    }> = [];

    const map = new Map<string, { id: string; name: string; quotations: Quotation[] }>();

    quotations.forEach((q) => {
      const custId = q.customerId || 'unassigned';
      const custName = q.customer?.name || 'Unassigned / General Customer';

      if (!map.has(custId)) {
        map.set(custId, { id: custId, name: custName, quotations: [] });
      }
      map.get(custId)!.quotations.push(q);
    });

    map.forEach((value) => {
      let totalValue = 0;
      let monthlyCount = 0;
      let extraCount = 0;

      value.quotations.forEach((q) => {
        const val = Number(q.rate || q.base_price || 0);
        totalValue += val;
        if ((q.billing_type || '').toUpperCase() === 'MONTHLY') {
          monthlyCount++;
        } else {
          extraCount++;
        }
      });

      groups.push({
        id: value.id,
        name: value.name,
        quotations: value.quotations,
        totalValue,
        monthlyCount,
        extraCount,
      });
    });

    return groups.sort((a, b) => a.name.localeCompare(b.name));
  }, [quotations]);

  // Auto-expand all company dropdowns initially
  useEffect(() => {
    if (companyGroups.length > 0 && Object.keys(expandedCompanies).length === 0) {
      const init: Record<string, boolean> = {};
      companyGroups.forEach((g) => {
        init[g.id] = true;
      });
      setExpandedCompanies(init);
    }
  }, [companyGroups]);

  const isAllExpanded = useMemo(() => {
    if (companyGroups.length === 0) return false;
    return companyGroups.every((g) => expandedCompanies[g.id]);
  }, [companyGroups, expandedCompanies]);

  const toggleExpandCompany = (id: string) => {
    setExpandedCompanies((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleExpandAll = () => {
    const allExpanded: Record<string, boolean> = {};
    companyGroups.forEach((g) => {
      allExpanded[g.id] = true;
    });
    setExpandedCompanies(allExpanded);
  };

  const handleCollapseAll = () => {
    setExpandedCompanies({});
  };

  const handleDelete = async () => {
    if (!selectedQuotation) return;
    try {
      await quotationService.delete(selectedQuotation.id);
      toast.success('Quotation deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      setSelectionResetKey((k) => k + 1);
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

  const clearFilters = () => {
    setSearch('');
    setCustomerFilter('ALL');
    setBillingTypeFilter('ALL');
    setLineTypeFilter('ALL');
    setVehicleClassFilter('ALL');
    setPricingBasisFilter('ALL');
    setStatusFilter('ALL');
    setSortOrder('latest');
    setPage(1);
  };

  const isFiltersActive =
    search !== '' ||
    customerFilter !== 'ALL' ||
    billingTypeFilter !== 'ALL' ||
    lineTypeFilter !== 'ALL' ||
    vehicleClassFilter !== 'ALL' ||
    pricingBasisFilter !== 'ALL' ||
    statusFilter !== 'ALL';

  const handleQuickExport = async (format: 'xlsx' | 'pdf') => {
    const toastId = toast.loading('Preparing export…');
    try {
      const headers = ['Customer', 'Vehicle Class', 'Source Vehicle', 'Line Type', 'Billing', 'Pricing Basis', 'Commercial Rate', 'Status'];
      const rows = quotations.map((q) => [
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
        header: 'Customer Company',
        accessor: (q) => (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-xs font-semibold shrink-0 border border-slate-200/60 dark:border-slate-700">
              {q.customer?.name ? q.customer.name.substring(0, 2).toUpperCase() : 'CU'}
            </div>
            <div>
              <span className="font-semibold text-slate-900 dark:text-slate-100 text-xs block">{q.customer?.name || 'Customer'}</span>
              <span className="text-[10px] text-slate-400 font-mono">{q.agreement_ref || `QT-${q.id.substring(0, 8).toUpperCase()}`}</span>
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
          const stopCount = (q.stops || []).filter((s) => s.stop_type !== 'Pickup' && s.stop_type !== 'Dropoff').length;

          return (
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100 text-xs">
                <span className="truncate max-w-[140px]">{origin}</span>
                <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                <span className="truncate max-w-[140px]">{dest}</span>
              </div>
              {stopCount > 0 && (
                <div className="text-[10px] text-slate-400 font-normal">
                  Via {stopCount} stop{stopCount > 1 ? 's' : ''}
                </div>
              )}
            </div>
          );
        },
        mobilePriority: 'primary',
      },
      {
        header: 'Operation Type',
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
          <Badge variant="outline" className="font-normal text-xs border-slate-200 dark:border-slate-700">
            {q.vehicle_class || 'Standard'}
          </Badge>
        ),
        mobilePriority: 'secondary',
      },
      {
        header: 'Agreed Rate',
        accessor: (q) => (
          <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 text-xs">
            {q.currency || 'SAR'} {Number(q.rate ?? q.base_price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        ),
        mobilePriority: 'primary',
      },
      {
        header: 'Driver Payout',
        accessor: (q) => (
          <span className="font-mono text-slate-500 dark:text-slate-400 text-xs">
            {q.driver_payout != null ? `${q.currency || 'SAR'} ${Number(q.driver_payout).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
          </span>
        ),
        mobilePriority: 'secondary',
      },
      {
        header: 'Status',
        accessor: (q) => (
          q.is_active ? (
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50 text-[10px] font-medium">Active</Badge>
          ) : (
            <Badge variant="outline" className="text-slate-400 text-[10px]">Inactive</Badge>
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
              className="h-8 w-8 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg cursor-pointer"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg cursor-pointer">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 p-1.5 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl z-[9999]">
                <DropdownMenuLabel className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 px-2 py-1">Actions</DropdownMenuLabel>
                <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />
                <DropdownMenuItem onClick={() => navigate(`/quotations/${q.id}`)} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                  <FileText className="h-3.5 w-3.5 mr-2 text-slate-500" />
                  <span>View Details</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/quotations/${q.id}/edit`)} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                  <Edit2 className="h-3.5 w-3.5 mr-2 text-blue-600" />
                  <span>Edit Quotation</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/quotations/new?customer_id=${q.customerId}&origin_id=${q.originLocationId || ''}&dest_id=${q.destinationLocationId || ''}`)} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                  <Copy className="h-3.5 w-3.5 mr-2 text-slate-500" />
                  <span>Duplicate</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleToggleActive(q)} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                  <Power className="h-3.5 w-3.5 mr-2 text-emerald-600" />
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
  ];

  // Prioritized Streamlined Filter Elements
  const filterElement = (
    <div className="flex items-center gap-2 flex-wrap shrink-0">
      {/* Operation Type Filter */}
      <Select value={billingTypeFilter} onValueChange={(val) => { setBillingTypeFilter(val); setPage(1); }}>
        <SelectTrigger className="h-8.5 px-3 w-auto min-w-[155px] whitespace-nowrap shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium rounded-xl">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <Receipt className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <SelectValue placeholder="All Operations" />
          </div>
        </SelectTrigger>
        <SelectContent align="start" className="w-44 p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl z-[9999]">
          <SelectGroup>
            <SelectLabel className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 px-2 py-1">Operation Type</SelectLabel>
            <SelectItem value="ALL" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">All Operations</SelectItem>
            <SelectItem value="MONTHLY" className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md text-emerald-600">MONTHLY</SelectItem>
            <SelectItem value="EXTRA" className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md text-blue-600">EXTRA</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      {/* Vehicle Class Filter */}
      <Select value={vehicleClassFilter} onValueChange={(val) => { setVehicleClassFilter(val); setPage(1); }}>
        <SelectTrigger className="h-8.5 px-3 w-auto min-w-[135px] whitespace-nowrap shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium rounded-xl">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <Truck className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            <SelectValue placeholder="All Vehicles" />
          </div>
        </SelectTrigger>
        <SelectContent align="start" className="w-44 p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl z-[9999]">
          <SelectGroup>
            <SelectLabel className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 px-2 py-1">Vehicle Class</SelectLabel>
            <SelectItem value="ALL" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">All Vehicles</SelectItem>
            <SelectItem value="3-4 TON" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">3-4 TON</SelectItem>
            <SelectItem value="5 TON" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">5 TON</SelectItem>
            <SelectItem value="10 TON" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">10 TON</SelectItem>
            <SelectItem value="20 TON" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">20 TON</SelectItem>
            <SelectItem value="40 FEET" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">40 FEET</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      {isFiltersActive && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="h-8.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl px-2.5 shrink-0 font-medium"
        >
          <X className="h-3.5 w-3.5 mr-1" />
          <span>Clear</span>
        </Button>
      )}
    </div>
  );

  return (
    <DashboardLayout active="Quotations" title="Quotations Ledger">
      <div className="px-4 sm:px-6 pb-10 w-full flex flex-col animate-fade-in gap-4">
        
        {/* Top Header Layout with Title, Badge & Grouped Top Bar Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1 border-b border-slate-200 dark:border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
              Commercial Quotations
            </h1>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Switcher Segmented Control (Quotations vs Surcharges) */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => setActiveTab('quotations')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                  activeTab === 'quotations'
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                <Receipt className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                <span>Quotations</span>
              </button>
              <button
                onClick={() => setActiveTab('surcharges')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                  activeTab === 'surcharges'
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                )}
              >
                <Tag className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                <span>Surcharge Fees</span>
              </button>
            </div>

            {/* View Mode Switcher (Company Grouped Accordion vs Flat Table) - Always Visible */}
            <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => {
                  setActiveTab('quotations');
                  setViewMode('company_grouped');
                }}
                title="Company Accordions View"
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                  activeTab === 'quotations' && viewMode === 'company_grouped'
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                )}
              >
                <Building2 className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                <span>Company View</span>
              </button>
              <button
                onClick={() => {
                  setActiveTab('quotations');
                  setViewMode('flat_list');
                }}
                title="Flat Ledger Table View"
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer",
                  activeTab === 'quotations' && viewMode === 'flat_list'
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400"
                )}
              >
                <List className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                <span>Flat List</span>
              </button>
            </div>

            {/* Grouped Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 text-xs font-medium border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 cursor-pointer rounded-xl"
                >
                  <Download className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                  <span>Export &amp; Data</span>
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl z-[9999]">
                <DropdownMenuLabel className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 px-2 py-1">
                  Export Ledger
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => handleQuickExport('xlsx')} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-lg">
                  <FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                  Export Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleQuickExport('pdf')} className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-lg">
                  <FileText className="mr-2 h-3.5 w-3.5 text-rose-600" />
                  Export PDF (.pdf)
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />

                <DropdownMenuLabel className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 px-2 py-1">
                  Import &amp; Sync
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => setIsImportModalOpen(true)}
                  className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-lg text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                >
                  <UploadCloud className="mr-2 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  Import from Excel
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => refetch()}
                  className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-lg text-slate-700 dark:text-slate-300"
                >
                  <RotateCw className={cn("mr-2 h-3.5 w-3.5 text-slate-500", isFetching && "animate-spin")} />
                  Refresh Ledger
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* AI Import Pill Button */}
            <Button
              size="sm"
              variant="outline"
              className="h-9 gap-1.5 text-xs font-medium border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 rounded-xl px-3.5 cursor-pointer transition-all"
              onClick={() => navigate('/quotations/import')}
            >
              <Sparkles className="h-4 w-4 text-slate-600 dark:text-slate-400" />
              <span>AI Import</span>
            </Button>

            {/* Primary Action Button (New Quotation) */}
            <Button
              size="sm"
              className="h-9 gap-1.5 text-xs font-semibold rounded-xl px-4 cursor-pointer transition-all"
              onClick={() => navigate('/quotations/new')}
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>New Quotation</span>
            </Button>
          </div>
        </div>

        {activeTab === 'surcharges' ? (
          <SurchargeFeesPanel />
        ) : viewMode === 'company_grouped' ? (
          /* COMPANY-WISE GROUPED ACCORDION VIEW */
          <div className="space-y-3">
            
            {/* Clean Prioritized Toolbar */}
            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0 flex-wrap sm:flex-nowrap">
                <div className="relative flex-1 min-w-[220px] max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <Input
                    placeholder="Search company, route, vehicle class..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8.5 text-xs bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 pl-9 rounded-xl"
                  />
                </div>
                {filterElement}
              </div>

              {/* Single Expand / Collapse Toggle Button */}
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (isAllExpanded) {
                      handleCollapseAll();
                    } else {
                      handleExpandAll();
                    }
                  }}
                  className="h-8.5 text-xs font-medium border-slate-200 dark:border-slate-800 rounded-xl px-3.5 gap-1.5 cursor-pointer"
                >
                  {isAllExpanded ? (
                    <>
                      <ChevronsDownUp className="w-3.5 h-3.5 text-slate-500" />
                      <span>Collapse All</span>
                    </>
                  ) : (
                    <>
                      <ChevronsUpDown className="w-3.5 h-3.5 text-slate-500" />
                      <span>Expand All</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Company Accordion Cards Stack */}
            {isLoading ? (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                <RotateCw className="w-6 h-6 animate-spin text-slate-400" />
                <span>Loading company commercial agreements...</span>
              </div>
            ) : companyGroups.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <Building2 className="w-8 h-8 text-slate-300 mx-auto" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">No Commercial Quotations Found</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {isFiltersActive ? 'Try adjusting your active search terms or filters.' : 'Create a new commercial agreement to get started.'}
                </p>
                {isFiltersActive && (
                  <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2 h-8 text-xs font-medium rounded-xl">
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              companyGroups.map((group) => {
                const isExpanded = !!expandedCompanies[group.id];

                return (
                  <div
                    key={group.id}
                    className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden transition-all"
                  >
                    {/* Clean Minimalist Shadcn Header */}
                    <div
                      onClick={() => toggleExpandCompany(group.id)}
                      className="p-4 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700">
                          {group.name.substring(0, 2).toUpperCase()}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {group.name}
                            </h3>
                            <Badge variant="secondary" className="text-[10px] font-medium px-2 py-0">
                              {group.quotations.length} {group.quotations.length === 1 ? 'Route' : 'Routes'}
                            </Badge>
                          </div>
                          <div className="text-xs text-slate-500 font-normal flex items-center gap-2 mt-0.5">
                            <span>{group.monthlyCount} Monthly</span>
                            <span>•</span>
                            <span>{group.extraCount} Extra</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Side Info & Actions */}
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <div className="text-[11px] text-slate-400 font-normal">Agreed Contract Sum</div>
                          <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                            SAR {group.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/quotations/new?customer_id=${group.id}`);
                          }}
                          className="h-8 text-xs font-medium rounded-lg gap-1 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Plus size={13} /> <span>Add Line</span>
                        </Button>

                        <div className="text-slate-400">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>

                    {/* Company Quotations Table (Expandable Drawer) */}
                    {isExpanded && (
                      <div className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-900/40 p-1 overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-semibold text-slate-500">
                              <th className="py-2.5 px-3 font-medium">Ref ID</th>
                              <th className="py-2.5 px-3 font-medium">Commercial Route Corridor</th>
                              <th className="py-2.5 px-3 font-medium">Vehicle Class</th>
                              <th className="py-2.5 px-3 font-medium">Operation Type</th>
                              <th className="py-2.5 px-3 font-medium">Line Type</th>
                              <th className="py-2.5 px-3 font-medium text-right">Agreed Rate</th>
                              <th className="py-2.5 px-3 font-medium text-right">Driver Payout</th>
                              <th className="py-2.5 px-3 font-medium text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                            {group.quotations.map((row) => {
                              const stops = row.stops || [];
                              const pickup = stops.find((s: any) => s.stop_type === 'Pickup') || stops[0];
                              const dropoff = [...stops].reverse().find((s: any) => s.stop_type === 'Dropoff') || stops[stops.length - 1];

                              const origin = pickup?.source_label || pickup?.location?.name || row.route_origin || 'Origin';
                              const dest = dropoff?.source_label || dropoff?.location?.name || row.route_destination || 'Destination';
                              const stopCount = (row.stops || []).filter((s) => s.stop_type !== 'Pickup' && s.stop_type !== 'Dropoff').length;

                              return (
                                <tr
                                  key={row.id}
                                  onClick={() => navigate(`/quotations/${row.id}`)}
                                  className="hover:bg-white dark:hover:bg-slate-800/60 cursor-pointer transition-colors"
                                >
                                  <td className="py-3 px-3 font-mono font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                    {row.agreement_ref || `QT-${row.id.substring(0, 8).toUpperCase()}`}
                                  </td>

                                  <td className="py-3 px-3">
                                    <div className="flex items-center gap-1.5 font-medium text-slate-900 dark:text-slate-100">
                                      <span>{origin}</span>
                                      <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
                                      <span>{dest}</span>
                                      {stopCount > 0 && (
                                        <Badge variant="outline" className="text-[9px] font-normal px-1.5 py-0 ml-1">
                                          +{stopCount} Via
                                        </Badge>
                                      )}
                                    </div>
                                  </td>

                                  <td className="py-3 px-3">
                                    <Badge variant="outline" className="text-[11px] font-normal border-slate-200 dark:border-slate-700">
                                      {row.vehicle_class || '10 TON'}
                                    </Badge>
                                  </td>

                                  <td className="py-3 px-3">
                                    {getBillingTypeBadge(row.billing_type)}
                                  </td>

                                  <td className="py-3 px-3">
                                    {getLineTypeBadge(row.line_type || row.rate_category)}
                                  </td>

                                  <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900 dark:text-slate-100 text-xs whitespace-nowrap">
                                    {row.currency || 'SAR'} {Number(row.rate ?? row.base_price ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                  </td>

                                  <td className="py-3 px-3 text-right font-mono text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                                    {row.driver_payout != null ? `${row.currency || 'SAR'} ${Number(row.driver_payout).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                                  </td>

                                  <td className="py-3 px-3 text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-end gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => navigate(`/quotations/${row.id}`)}
                                        className="h-7 w-7 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg"
                                        title="View Details"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </Button>

                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => navigate(`/quotations/${row.id}/edit`)}
                                        className="h-7 w-7 text-slate-400 hover:text-blue-600 rounded-lg"
                                        title="Edit Commercial Line"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </Button>

                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => {
                                          setSelectedQuotation(row);
                                          setIsDeleteModalOpen(true);
                                        }}
                                        className="h-7 w-7 text-slate-400 hover:text-rose-600 rounded-lg"
                                        title="Delete Line"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
            )}

          </div>
        ) : (
          /* FLAT LEDGER TABLE VIEW */
          <DataTable<Quotation>
            title={
              <span className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                <span>
                  {customerFilter === 'ALL'
                    ? 'Commercial Quotations Ledger'
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
