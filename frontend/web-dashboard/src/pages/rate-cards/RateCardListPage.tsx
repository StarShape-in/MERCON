import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  ArrowRight,
  Building2,
  MapPin,
  LayoutGrid,
  List,
  AlertTriangle,
  FileSpreadsheet,
  ChevronDown,
  Layers,
  UploadCloud,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowDown,
  ArrowUp,
  Truck,
  Clock,
  User,
  DollarSign,
} from 'lucide-react';

import { Area, AreaChart, ResponsiveContainer } from 'recharts';
import { ChartContainer } from '@/components/ui/chart';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import KpiCard from '@/components/ui/KpiCard';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { RouteCorridorKpi } from '@/components/ui/CustomKpiWidgets';
import { CustomerBuilding, RouteLine, CheckBadge } from '@/components/ui/kpi-icons';
import { VEHICLE_TYPES, RATE_CATEGORIES, BILLING_TYPES } from '@mercon/shared-types';
import { getAllVehicleTypes } from '@/utils/customVehicleTypeStore';
import { getAllRateCategories } from '@/utils/customRateCategoryStore';
import { getAllBillingTypes } from '@/utils/customBillingTypeStore';
import { rateCardService, RateCard, surchargeRuleService } from '@/services/rateCardService';
import { customerService } from '@/services/customerService';
import RateCardFormDialog from '@/components/rate-cards/RateCardFormDialog';
import SurchargeFeesPanel from '@/components/rate-cards/SurchargeFeesPanel';
import ExcelImportDialog from '@/components/fleet/ExcelImportDialog';
import { RATE_CARD_COLUMNS } from '@/utils/importUtils';
import { exportExcelTable, exportPDFTable } from '@/utils/exportUtils';
import ExportModal, { ExportColumn, ExportFilter } from '@/components/ui/ExportModal';

const RATE_CARD_EXPORT_COLUMNS: ExportColumn<RateCard>[] = [
  { id: 'name', label: 'Rate Card Name', accessor: (r) => r.name || `${r.route_origin} → ${r.route_destination}` },
  { id: 'customer', label: 'Customer', accessor: (r) => r.customer?.name || 'Customer Agreement' },
  { id: 'origin', label: 'Origin', accessor: (r) => r.originLocation?.name || r.route_origin || '—' },
  { id: 'destination', label: 'Destination', accessor: (r) => r.destinationLocation?.name || r.route_destination || '—' },
  { id: 'vehicle_type', label: 'Vehicle Type', accessor: (r) => r.vehicle_type || 'Standard' },
  { id: 'rate_category', label: 'Rate Category', accessor: (r) => r.rate_category || 'Single Trip' },
  { id: 'billing_type', label: 'Billing Type', accessor: (r) => r.billing_type || 'Per Trip' },
  { id: 'base_price', label: 'Base Price (SAR)', accessor: (r) => (r.base_price ? `SAR ${r.base_price.toLocaleString()}` : '0') },
  { id: 'driver_charge', label: 'Driver Charge (SAR)', accessor: (r) => (r.default_trip_charge ? `SAR ${r.default_trip_charge.toLocaleString()}` : '—') },
  { id: 'status', label: 'Status', accessor: (r) => (r.is_active ? 'Active' : 'Inactive') },
  { id: 'created_at', label: 'Created Date', accessor: (r) => (r.createdAt ? new Date(r.createdAt).toLocaleDateString() : '—') },
];

const RATE_CARD_EXPORT_FILTERS: ExportFilter<RateCard>[] = [
  {
    id: 'status',
    label: 'Status',
    options: [
      { label: 'All Statuses', value: 'All' },
      { label: 'Active', value: 'Active' },
      { label: 'Inactive', value: 'Inactive' },
    ],
    filterFn: (r, val) => (val === 'Active' ? r.is_active : !r.is_active),
  },
  {
    id: 'vehicle_type',
    label: 'Vehicle Type',
    options: [
      { label: 'All Types', value: 'All' },
      ...VEHICLE_TYPES.map((t) => ({ label: t, value: t })),
    ],
    filterFn: (r, val) => r.vehicle_type === val,
  },
];
import { matchesSearch } from '@/lib/search';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';

import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { SortDropdown, SortOption } from '@/components/ui/SortDropdown';

const RATE_CARD_EXPORT_HEADERS = [
  'Rate Card ID', 'Contract Name', 'Applies To', 'Route Origin', 'Route Destination',
  'Vehicle Type', 'Rate Category', 'Billing Type', 'Price per Trip (SAR)', 'Status', 'Linked Lane'
];

const rateCardsToExportRows = (cards: RateCard[]) => cards.map((rc, idx) => [
  `RC-${String(idx + 1).padStart(3, '0')}`,
  rc.name,
  rc.customer?.name || 'Customer',
  rc.route_origin,
  rc.route_destination,
  rc.vehicle_type || 'All Vehicles',
  rc.rate_category || 'Standard',
  rc.billing_type || 'Unspecified',
  Number(rc.base_price || 0),
  rc.is_active ? 'Active' : 'Inactive',
  (rc.originLocationId && rc.destinationLocationId) ? 'Linked' : 'Not Linked'
]);

function getVehicleTypeChipColor(type: string): string {
  const t = type.toUpperCase();
  if (t.includes('DYNA') || t.includes('3 TON') || t.includes('3TON')) {
    return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50';
  }
  if (t.includes('5 TON') || t.includes('5TON')) {
    return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50';
  }
  if (t.includes('10 TON') || t.includes('10TON') || t.includes('HEAVY')) {
    return 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900/50';
  }
  if (t.includes('TRAILER') || t.includes('FLATBED') || t.includes('20TON') || t.includes('13.5M')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50';
  }
  return 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/50';
}

function getRateCategoryChipColor(category: string): string {
  const c = category.toUpperCase();
  if (c.includes('MONTHLY')) {
    return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/50';
  }
  if (c.includes('DAILY') || c.includes('LOCAL')) {
    return 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900/50';
  }
  if (c.includes('SURCHARGE') || c.includes('FLAT') || c.includes('FEE')) {
    return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50';
  }
  if (c.includes('TRIP') || c.includes('ROUND')) {
    return 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/50';
  }
  return 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-900/50';
}

function getBillingTypeChipColor(type: string): string {
  const t = type.toUpperCase();
  if (t.includes('MONTHLY')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50';
  }
  return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50';
}

type RateCardSortOption = 'latest' | 'oldest' | 'price_desc' | 'price_asc' | 'customer_asc' | 'route_asc' | 'status';

const RATE_CARD_SORT_OPTIONS: SortOption<RateCardSortOption>[] = [
  { value: 'latest', label: 'Newest Added', icon: <ArrowDown className="w-3.5 h-3.5 text-blue-600" /> },
  { value: 'oldest', label: 'Oldest Added', icon: <ArrowUp className="w-3.5 h-3.5 text-amber-600" /> },
  { value: 'price_desc', label: 'Price (High → Low)', icon: <ArrowDown className="w-3.5 h-3.5 text-emerald-600" /> },
  { value: 'price_asc', label: 'Price (Low → High)', icon: <ArrowUp className="w-3.5 h-3.5 text-emerald-600" /> },
  { value: 'customer_asc', label: 'Customer Name (A → Z)', icon: <Building2 className="w-3.5 h-3.5 text-purple-600" /> },
  { value: 'route_asc', label: 'Route Origin (A → Z)', icon: <RouteLine className="w-3.5 h-3.5 text-indigo-500" /> },
  { value: 'status', label: 'Agreement Status', icon: <Filter className="w-3.5 h-3.5 text-slate-500" /> },
];

export default function RateCardListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>('');
  const [rateCategoryFilter, setRateCategoryFilter] = useState<string>('');
  const [billingTypeFilter, setBillingTypeFilter] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<RateCardSortOption>('latest');
  const [viewMode, setViewMode] = useState<'ledger' | 'grid'>('ledger');
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = (searchParams.get('tab') as 'lanes' | 'surcharges') || 'lanes';
  const setActiveTab = (tab: 'lanes' | 'surcharges') => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });
  };
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editTarget, setEditTarget] = useState<RateCard | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedRateCardsForExport, setSelectedRateCardsForExport] = useState<RateCard[]>([]);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');

  // Fetch companies/customers for filter dropdown
  const { data: customersResponse } = useQuery({
    queryKey: ['customers-list-filter'],
    queryFn: () => customerService.getAll({ per_page: 200 , mode: 'lookup' }),
  });
  const customers = customersResponse?.data || [];

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void | Promise<void>;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Server-paginated query for the table / grid view
  const { data: response, isLoading, isError, error } = useQuery({
    queryKey: ['rate-cards', { page: currentPage, per_page: pageSize, search: debouncedSearch, status: statusFilter, vehicle_type: vehicleTypeFilter, rate_category: rateCategoryFilter, billing_type: billingTypeFilter, customerId: companyFilter }],
    queryFn: () => rateCardService.getAll({
      page: currentPage,
      per_page: pageSize,
      search: debouncedSearch || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      vehicle_type: vehicleTypeFilter || undefined,
      rate_category: rateCategoryFilter || undefined,
      billing_type: billingTypeFilter || undefined,
      customerId: companyFilter || undefined,
    }),
    // Keep the previous rows on screen while a new search/page loads.
    placeholderData: keepPreviousData,
  });

  // Summary query for KPI cards across all rate cards
  const { data: allResponse } = useQuery({
    queryKey: ['rate-cards-summary'],
    queryFn: () => rateCardService.getAll({ per_page: 'all' }),
  });

  const rateCards = response?.data || [];
  const totalCount = response?.meta?.total ?? rateCards.length;
  const totalPages = response?.meta?.total_pages ?? 1;

  const allRateCards = allResponse?.data || rateCards;

  // Dynamically extract unique companies that actually exist in the rate cards dataset
  const companyOptions = useMemo(() => {
    const map = new Map<string, string>();
    allRateCards.forEach((rc) => {
      if (rc.customerId) {
        const name = rc.customer?.name || customers.find((c) => c.id === rc.customerId)?.name || 'Customer';
        map.set(rc.customerId, name);
      }
    });

    // Fall back to general customer list if summary dataset is still empty
    if (map.size === 0 && customers.length > 0) {
      customers.forEach((c) => map.set(c.id, c.name));
    }

    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allRateCards, customers]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['rate-cards'] }),
      queryClient.invalidateQueries({ queryKey: ['rate-cards-summary'] }),
    ]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Filtered and sorted rate cards for view
  const filteredData = useMemo(() => {
    return [...rateCards].sort((a, b) => {
      if (sortOrder === 'price_desc') return (Number(b.base_price) || 0) - (Number(a.base_price) || 0);
      if (sortOrder === 'price_asc') return (Number(a.base_price) || 0) - (Number(b.base_price) || 0);
      if (sortOrder === 'customer_asc') return (a.customer?.name || '').localeCompare(b.customer?.name || '');
      if (sortOrder === 'route_asc') return (a.route_origin || '').localeCompare(b.route_origin || '');
      if (sortOrder === 'status') return (b.is_active ? 1 : 0) - (a.is_active ? 1 : 0);
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return sortOrder === 'oldest' ? dateA - dateB : dateB - dateA;
    });
  }, [rateCards, sortOrder]);

  // Calculated KPIs from complete set
  const kpis = useMemo(() => {
    const total = allRateCards.length;
    const activeCount = allRateCards.filter(rc => rc.is_active).length;
    const activePct = total > 0 ? Math.round((activeCount / total) * 100) : 0;

    const totalPrice = allRateCards.reduce((acc, rc) => acc + (Number(rc.base_price) || 0), 0);
    const avgPrice = total > 0 ? Math.round(totalPrice / total) : 0;

    const laneKeys = new Set(allRateCards.map(rc => `${rc.originLocationId}|${rc.destinationLocationId}`));
    const uniqueCustomers = new Set(allRateCards.map(rc => rc.customerId).filter(Boolean)).size;

    const unlinkedCount = allRateCards.filter(rc => !rc.originLocationId || !rc.destinationLocationId).length;

    const routeCounts: Record<string, number> = {};
    allRateCards.forEach(rc => {
      const routeKey = `${rc.route_origin} → ${rc.route_destination}`;
      routeCounts[routeKey] = (routeCounts[routeKey] || 0) + 1;
    });
    let topRoute: string | null = null;
    let topRouteCount = 0;
    Object.entries(routeCounts).forEach(([route, count]) => {
      if (count > topRouteCount) {
        topRouteCount = count;
        topRoute = route;
      }
    });
    const [topRouteOrigin, topRouteDestination] = (topRoute || '').split(' → ');

    return {
      total,
      activeCount,
      activePct,
      avgPrice,
      uniqueCustomers,
      laneCount: laneKeys.size,
      unlinkedCount,
      topRoute,
      topRouteCount,
      topRouteOrigin: topRouteOrigin || null,
      topRouteDestination: topRouteDestination || null,
    };
  }, [rateCards]);

  const { data: allRules = [] } = useQuery({
    queryKey: ['surcharge-rules', 'all'],
    queryFn: () => surchargeRuleService.list(undefined),
  });

  const rateTypesBreakdown = useMemo(() => {
    const laneCount = allRateCards.length;
    
    let labourCount = 0;
    let trolleyDemurrageCount = 0;
    let otherSurchargeCount = 0;
    
    allRules.forEach((rule) => {
      const type = (rule.charge_type || '').toLowerCase();
      if (type.includes('labor') || type.includes('labour') || type.includes('helper') || type.includes('offload') || type.includes('load')) {
        labourCount++;
      } else if (type.includes('trolley') || type.includes('demurrage') || type.includes('wait') || type.includes('delay')) {
        trolleyDemurrageCount++;
      } else {
        otherSurchargeCount++;
      }
    });
    
    return {
      laneCount,
      labourCount,
      trolleyDemurrageCount,
      otherSurchargeCount,
    };
  }, [allRateCards, allRules]);

  const handleExport = async (format: 'excel' | 'pdf', filterType: 'all' | 'active' | 'filtered') => {
    try {
      toast.info(`Preparing ${format.toUpperCase()} export...`);
      let dataToExport: RateCard[] = [];

      if (filterType === 'all' && !companyFilter && !vehicleTypeFilter && !rateCategoryFilter && !billingTypeFilter && statusFilter === 'all' && !debouncedSearch) {
        const res = await rateCardService.getAll({ per_page: 'all' });
        dataToExport = res.data || [];
      } else {
        const res = await rateCardService.getAll({
          per_page: 'all',
          search: debouncedSearch || undefined,
          status: filterType === 'active' ? 'active' : (statusFilter !== 'all' ? statusFilter : undefined),
          vehicle_type: vehicleTypeFilter || undefined,
          rate_category: rateCategoryFilter || undefined,
          billing_type: billingTypeFilter || undefined,
          customerId: companyFilter || undefined,
        });
        dataToExport = res.data || [];
      }

      if (!dataToExport.length) {
        toast.warning('No rate cards available for export with selected filter.');
        return;
      }

      const rows = rateCardsToExportRows(dataToExport);
      const title = `Rate Cards Export (${filterType.toUpperCase()})`;
      const dateStr = new Date().toISOString().slice(0, 10);

      if (format === 'excel') {
        await exportExcelTable(title, RATE_CARD_EXPORT_HEADERS, rows, `rate_cards_${filterType}_${dateStr}.xlsx`);
        toast.success('Excel export generated successfully');
      } else {
        exportPDFTable(title, RATE_CARD_EXPORT_HEADERS, rows, `rate_cards_${filterType}_${dateStr}.pdf`);
        toast.success('PDF export generated successfully');
      }
    } catch (err: any) {
      toast.error(`Export failed: ${err?.message || 'Error creating export'}`);
    }
  };

  const columns = [
    {
      header: 'Rate Card Ref ID',
      accessor: (_row: RateCard, index?: number) => {
        const seq = (currentPage - 1) * pageSize + (index ?? 0) + 1;
        return (
          <div className="flex items-center min-w-[100px]">
            <span className="font-mono text-xs font-bold text-brand">
              RC-{String(seq).padStart(3, '0')}
            </span>
          </div>
        );
      },
    },
    {
      header: 'Customer',
      accessor: (row: RateCard) => (
        <div className="flex flex-col min-w-[150px] max-w-[210px]">
          <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 truncate" title={row.customer?.name || 'Customer'}>
            <Building2 className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
            <span className="truncate">{row.customer?.name || 'Customer'}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Route Lane',
      accessor: (row: RateCard) => (
        <div className="flex flex-col gap-1 min-w-[180px] max-w-[240px]">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate max-w-[90px]" title={row.route_origin}>{row.route_origin}</span>
            <ArrowRight className="w-3.5 h-3.5 text-brand shrink-0" />
            <span className="truncate max-w-[90px]" title={row.route_destination}>{row.route_destination}</span>
            {(!row.originLocationId || !row.destinationLocationId) && (
              <Badge
                variant="outline"
                className="ml-1 text-[9px] font-bold uppercase bg-amber-50 text-amber-700 border-amber-200 shrink-0"
                title="This lane is still free text, so trips never pick this rate up. Edit it and choose both places."
              >
                Not linked
              </Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Payload Capacity',
      accessor: (row: RateCard) => {
        if (!row.vehicle_type) {
          return (
            <Badge variant="outline" className="text-[10px] font-medium text-slate-400 border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              All Vehicles
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${getVehicleTypeChipColor(row.vehicle_type)}`}>
            {row.vehicle_type}
          </Badge>
        );
      },
    },
    {
      header: 'Rate Category',
      accessor: (row: RateCard) => {
        if (!row.rate_category) {
          return (
            <Badge variant="outline" className="text-[10px] font-medium text-slate-400 border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              Standard Rate
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${getRateCategoryChipColor(row.rate_category)}`}>
            {row.rate_category}
          </Badge>
        );
      },
    },
    {
      header: 'Billing Type',
      accessor: (row: RateCard) => {
        if (!row.billing_type) {
          return (
            <Badge variant="outline" className="text-[10px] font-medium text-slate-400 border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
              Unspecified
            </Badge>
          );
        }
        return (
          <Badge variant="outline" className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md ${getBillingTypeChipColor(row.billing_type)}`}>
            {row.billing_type}
          </Badge>
        );
      },
    },
    {
      header: 'Price per Trip',
      accessor: (row: RateCard) => (
        <div className="font-mono text-xs font-extrabold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200/60 dark:border-slate-700 w-fit min-w-[120px]">
          {row.currency || 'SAR'} {Number(row.base_price).toLocaleString()}
        </div>
      ),
    },
    {
      header: 'Trip Charge',
      accessor: (row: RateCard) => (
        <div
          className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400 w-fit min-w-[100px]"
          title="What MERCON pays the driver on this lane — not the customer-billed price above"
        >
          {row.default_trip_charge ? `${row.currency || 'SAR'} ${Number(row.default_trip_charge).toLocaleString()}` : '—'}
        </div>
      ),
    },
    {
      header: 'Actions',
      headerClassName: 'text-right',
      accessor: (row: RateCard) => (
        <div className="flex items-center justify-end gap-1 min-w-[90px]" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setEditTarget(row)}
            title="Quick Edit Price"
            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors"
          >
            <Edit2 className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => navigate(`/rate-cards/${row.id}/edit`)}
            title="Open Full Rate Card Editor"
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <FileText className="h-3.5 w-3.5" />
          </button>

          <button
            onClick={() => {
              setConfirmModal({
                isOpen: true,
                title: 'Delete Rate Card',
                message: `Are you sure you want to delete rate card #${row.id.slice(0, 8).toUpperCase()} (${row.name})? This action cannot be undone.`,
                onConfirm: async () => {
                  await rateCardService.delete(row.id);
                  queryClient.invalidateQueries({ queryKey: ['rate-cards'] });
                }
              });
            }}
            title="Delete Rate"
            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ),
    },
  ];

  const activeFiltersCount = [
    companyFilter,
    vehicleTypeFilter,
    rateCategoryFilter,
    billingTypeFilter,
  ].filter(Boolean).length;

  const inlineSearchInput = (
    <div className="relative w-full sm:w-60 md:w-72 shrink-0">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
      <Input
        placeholder="Search ID, customer, route..."
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setCurrentPage(1);
        }}
        className="pl-9 h-9 text-xs bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 font-semibold"
      />
      {search && (
        <button
          onClick={() => {
            setSearch('');
            setCurrentPage(1);
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );

  const tabSwitcherAndFilters = (
    <div className="flex items-center flex-wrap gap-2.5">
      {/* Lane Prices / Surcharge Fees tab */}
      <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex items-center border border-slate-200 dark:border-slate-700 h-9 shrink-0">
        <button
          type="button"
          onClick={() => {
            setActiveTab('lanes');
            setCurrentPage(1);
          }}
          className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'lanes'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Lane Prices
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('surcharges');
            setCurrentPage(1);
          }}
          className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'surcharges'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Surcharge Fees
        </button>
      </div>

      {/* Multi-Filter Dropdown Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 text-xs font-semibold bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-xs cursor-pointer rounded-lg"
          >
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <span>Filters</span>
            {activeFiltersCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-brand text-white text-[9px] font-black leading-none">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 p-3.5 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl space-y-3 z-50">
          <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 p-0">
            Filter Ledger
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-850" />
          <div className="space-y-2.5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Company</label>
              <select
                value={companyFilter || 'all'}
                onChange={(e) => {
                  const val = e.target.value;
                  setCompanyFilter(val === 'all' ? '' : val);
                  setCurrentPage(1);
                }}
                className="w-full h-8 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all">All Companies</option>
                {companyOptions.map((cust) => (
                  <option key={cust.id} value={cust.id}>
                    {cust.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vehicle Type</label>
              <select
                value={vehicleTypeFilter || 'all'}
                onChange={(e) => {
                  const val = e.target.value;
                  setVehicleTypeFilter(val === 'all' ? '' : val);
                  setCurrentPage(1);
                }}
                className="w-full h-8 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all">All Vehicle Types</option>
                {getAllVehicleTypes().map((vType) => (
                  <option key={vType} value={vType}>
                    {vType}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rate Category</label>
              <select
                value={rateCategoryFilter || 'all'}
                onChange={(e) => {
                  const val = e.target.value;
                  setRateCategoryFilter(val === 'all' ? '' : val);
                  setCurrentPage(1);
                }}
                className="w-full h-8 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all">All Rate Categories</option>
                {getAllRateCategories().map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Billing Type</label>
              <select
                value={billingTypeFilter || 'all'}
                onChange={(e) => {
                  const val = e.target.value;
                  setBillingTypeFilter(val === 'all' ? '' : val);
                  setCurrentPage(1);
                }}
                className="w-full h-8 px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all">All Billing Types</option>
                {getAllBillingTypes().map((bType) => (
                  <option key={bType} value={bType}>
                    {bType}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {activeFiltersCount > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-center">
              <button
                type="button"
                onClick={() => {
                  setCompanyFilter('');
                  setVehicleTypeFilter('');
                  setRateCategoryFilter('');
                  setBillingTypeFilter('');
                  setCurrentPage(1);
                }}
                className="text-[10px] font-bold text-brand hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Sort Dropdown */}
      <SortDropdown
        value={sortOrder}
        onChange={(val) => {
          setSortOrder(val);
          setCurrentPage(1);
        }}
        options={RATE_CARD_SORT_OPTIONS}
      />
    </div>
  );

  const gridPageSizeOptions = [10, 25, 50, 100];
  const gridFromIndex = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const gridToIndex = totalCount === 0 ? 0 : gridFromIndex + filteredData.length - 1;

  const bulkActions = [
    {
      label: 'Export Documents',
      icon: <Download className="w-3.5 h-3.5" />,
      variant: 'secondary' as const,
      onClick: (selectedRows: RateCard[]) => {
        setSelectedRateCardsForExport(selectedRows);
        setIsExportOpen(true);
      }
    },
    {
      label: 'Delete Selected',
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: 'danger' as const,
      onClick: (selectedRows: RateCard[]) => {
        setConfirmModal({
          isOpen: true,
          title: 'Delete Selected Rate Cards',
          message: `Are you sure you want to delete ${selectedRows.length} selected rate cards? This action cannot be undone.`,
          onConfirm: async () => {
            try {
              await rateCardService.bulkDelete(selectedRows.map(r => r.id));
              queryClient.invalidateQueries({ queryKey: ['rate-cards'] });
            } catch (e) {
              toast.error('Failed to delete selected rate cards');
            }
          }
        });
      }
    }
  ];

  return (
    <DashboardLayout active="RateCards" title="Rate Cards">
      <div className="px-4 sm:px-6 pb-6 w-full flex flex-col animate-fade-in gap-5">
        {/* Page Content Header Row */}
        {activeTab !== 'surcharges' && (
          <div className="flex items-center justify-end gap-3 shrink-0 pb-1 border-b border-slate-200/80 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <DropdownMenu open={exportMenuOpen} onOpenChange={setExportMenuOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs dark:bg-slate-900 dark:border-slate-800 rounded-xl cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" /> Export / Import
                    <ChevronDown className="h-3 w-3 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-1.5 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl z-50">
                  <div className="flex items-center gap-1 p-1 mb-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                    <button
                      onClick={(e) => { e.preventDefault(); setExportFormat('excel'); }}
                      className={`flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${exportFormat === 'excel' ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                      Excel
                    </button>
                    <button
                      onClick={(e) => { e.preventDefault(); setExportFormat('pdf'); }}
                      className={`flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md text-[11px] font-bold transition-colors cursor-pointer ${exportFormat === 'pdf' ? 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-400 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      <FileText className="h-3.5 w-3.5 text-rose-600" />
                      PDF
                    </button>
                  </div>

                  <DropdownMenuItem
                    onClick={() => handleExport(exportFormat, 'all')}
                    className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md"
                  >
                    {exportFormat === 'excel'
                      ? <FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                      : <FileText className="mr-2 h-3.5 w-3.5 text-rose-600" />}
                    All Rate Cards
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />
                  <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                    By Filter
                  </DropdownMenuLabel>
                  
                  <DropdownMenuItem
                    onClick={() => handleExport(exportFormat, 'active')}
                    className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md"
                  >
                    {exportFormat === 'excel'
                      ? <FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                      : <FileText className="mr-2 h-3.5 w-3.5 text-rose-600" />}
                    Active Rates Only
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedRateCardsForExport([]);
                      setIsExportOpen(true);
                    }}
                    className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-brand hover:bg-orange-50 dark:hover:bg-orange-950/40"
                  >
                    <Filter className="mr-2 h-3.5 w-3.5 text-brand" />
                    Custom Export Settings...
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />
                  <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                    Import Data
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => setImportDialogOpen(true)}
                    className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  >
                    <UploadCloud className="mr-2 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    Import from Excel
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                size="sm"
                onClick={() => navigate('/rate-cards/new')}
                className="h-9 gap-1.5 text-xs bg-brand hover:bg-brand-hover text-white font-bold shadow-xs rounded-xl px-4 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add Rate
              </Button>
            </div>
          </div>
        )}
        



        {/* Tariff & Fee Categories Grid — hidden on surcharge tab */}
        <div className={activeTab === 'surcharges' ? 'hidden' : 'space-y-2 shrink-0'}>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Lane Prices */}
            <div 
              onClick={() => setActiveTab('lanes')}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex flex-col justify-between overflow-hidden cursor-pointer hover:shadow-md transition-all group min-h-[240px] shadow-xs border-t-[3.5px] border-t-blue-500"
            >
              <div className="p-5 pb-2 flex items-center gap-3.5">
                <span className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Truck className="w-5 h-5" />
                </span>
                <div className="min-w-0 text-left">
                  <h4 className="text-[14px] font-black text-slate-800 dark:text-slate-100 truncate">Lane Prices</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">Standard Routes</p>
                </div>
              </div>

              <div className="px-5 pb-5 pt-2 flex-1 flex flex-col justify-between relative min-h-[140px]">
                <div className="flex flex-col text-left">
                  <span className="text-4xl font-extrabold text-blue-600 dark:text-blue-400 leading-none">
                    {rateTypesBreakdown.laneCount}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1.5">
                    Active lanes
                  </span>
                </div>
                
                <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-[65%] text-left mt-4 z-10">
                  Negotiated base freight rates for specific origins &amp; destinations.
                </p>

                {/* SVG Illustration - Absolute Positioned */}
                <svg viewBox="0 0 140 120" fill="none" className="absolute right-1 bottom-3 w-32 h-26 opacity-[0.9] pointer-events-none select-none">
                  <circle cx="20" cy="20" r="1.5" fill="#E2E8F0" />
                  <circle cx="50" cy="20" r="1.5" fill="#E2E8F0" />
                  <circle cx="80" cy="20" r="1.5" fill="#E2E8F0" />
                  <circle cx="110" cy="20" r="1.5" fill="#E2E8F0" />
                  <circle cx="20" cy="50" r="1.5" fill="#E2E8F0" />
                  <circle cx="110" cy="50" r="1.5" fill="#E2E8F0" />
                  <circle cx="20" cy="80" r="1.5" fill="#E2E8F0" />
                  <circle cx="50" cy="80" r="1.5" fill="#E2E8F0" />
                  <circle cx="80" cy="80" r="1.5" fill="#E2E8F0" />
                  <circle cx="110" cy="80" r="1.5" fill="#E2E8F0" />
                  <path d="M10,80 C30,75 40,90 60,85 C80,80 90,95 110,90" stroke="#F8FAFC" strokeWidth="3" strokeLinecap="round" />
                  <path d="M15,40 C35,35 45,50 65,45 C85,40 95,55 115,50" stroke="#F8FAFC" strokeWidth="2.5" strokeLinecap="round" />
                  <path d="M 30,75 Q 65,25 110,45" stroke="#3B82F6" strokeWidth="2.5" strokeDasharray="4 3" strokeLinecap="round" fill="none" />
                  <path d="M110,45 L106,37 M110,45 L102,47" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" />
                  <g filter="drop-shadow(0px 2px 4px rgba(59, 130, 246, 0.3))">
                    <path d="M 65,37 C 65,31 71,26 77,26 C 83,26 89,31 89,37 C 89,45 77,53 77,53 C 77,53 65,45 65,37 Z" fill="#3B82F6" />
                    <circle cx="77" cy="37" r="3.5" fill="white" />
                  </g>
                </svg>
              </div>

              <div className="bg-blue-50/80 dark:bg-blue-950/40 border-t border-slate-100 dark:border-slate-800/60 py-2.5 px-5 flex items-center justify-center gap-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 group-hover:bg-blue-100/80 dark:group-hover:bg-blue-950/60 transition-colors">
                <span>Explore Lanes</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Card 2: Labour / Loading Charge */}
            <div 
              onClick={() => setActiveTab('surcharges')}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex flex-col justify-between overflow-hidden cursor-pointer hover:shadow-md transition-all group min-h-[240px] shadow-xs border-t-[3.5px] border-t-purple-500"
            >
              <div className="p-5 pb-2 flex items-center gap-3.5">
                <span className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5" />
                </span>
                <div className="min-w-0 text-left">
                  <h4 className="text-[14px] font-black text-slate-800 dark:text-slate-100 truncate">Labour / Loading Charge</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">Loading &amp; Offloading</p>
                </div>
              </div>

              <div className="px-5 pb-5 pt-2 flex-1 flex flex-col justify-between relative min-h-[140px]">
                <div className="flex flex-col text-left">
                  <span className="text-4xl font-extrabold text-purple-600 dark:text-purple-400 leading-none">
                    {rateTypesBreakdown.labourCount}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1.5">
                    Charge rules
                  </span>
                </div>
                
                <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-[65%] text-left mt-4 z-10">
                  Offloading assistance, loading help, helper charges.
                </p>

                {/* SVG Illustration - Absolute Positioned */}
                <svg viewBox="0 0 120 100" fill="none" className="absolute right-1 bottom-3 w-28 h-24 opacity-[0.9] pointer-events-none select-none">
                  <ellipse cx="60" cy="85" rx="45" ry="4" fill="#E2E8F0" />
                  <path d="M35,80 L80,80" stroke="#7C3AED" strokeWidth="3" strokeLinecap="round" />
                  <path d="M42,80 L42,50 L72,50 L72,80" stroke="#9F7AEA" strokeWidth="2" strokeLinejoin="round" />
                  <circle cx="48" cy="84" r="6" fill="#5B21B6" />
                  <circle cx="68" cy="84" r="6" fill="#5B21B6" />
                  <rect x="46" y="56" width="22" height="22" rx="2" fill="#C084FC" stroke="#7C3AED" strokeWidth="1.5" />
                  <path d="M46,67 L68,67" stroke="#7C3AED" strokeWidth="1.5" />
                  <rect x="52" y="38" width="16" height="16" rx="2" fill="#E9D5FF" stroke="#A855F7" strokeWidth="1.5" />
                  <path d="M52,46 L68,46" stroke="#A855F7" strokeWidth="1.5" />
                  <g transform="translate(10, 0)">
                    <path d="M78,25 C78,20 84,20 87,22 L92,23 L90,26 Z" fill="#7C3AED" />
                    <circle cx="82" cy="30" r="5.5" fill="#FDBA74" />
                    <path d="M82,35.5 C76,38 72,44 72,52 L72,68 C72,70 74,72 76,72 L86,72 L86,82 L92,82 L92,72 L94,72 C96,72 98,70 98,68 L98,52 C98,44 94,38 88,35.5 Z" fill="#8B5CF6" />
                    <path d="M74,52 L62,56" stroke="#FDBA74" strokeWidth="3.5" strokeLinecap="round" />
                    <path d="M74,56 L64,62" stroke="#FDBA74" strokeWidth="3.5" strokeLinecap="round" />
                    <path d="M60,80 L58,42 L52,42" stroke="#4C1D95" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                </svg>
              </div>

              <div className="bg-purple-50/80 dark:bg-purple-950/40 border-t border-slate-100 dark:border-slate-800/60 py-2.5 px-5 flex items-center justify-center gap-1.5 text-[11px] font-bold text-purple-600 dark:text-purple-400 group-hover:bg-purple-100/80 dark:group-hover:bg-purple-950/60 transition-colors">
                <span>View Charges</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Card 3: Trolley / Demurrage Charge */}
            <div 
              onClick={() => setActiveTab('surcharges')}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex flex-col justify-between overflow-hidden cursor-pointer hover:shadow-md transition-all group min-h-[240px] shadow-xs border-t-[3.5px] border-t-amber-500"
            >
              <div className="p-5 pb-2 flex items-center gap-3.5">
                <span className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5" />
                </span>
                <div className="min-w-0 text-left">
                  <h4 className="text-[14px] font-black text-slate-800 dark:text-slate-100 truncate">Trolley / Demurrage Charge</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">Detention &amp; Delay</p>
                </div>
              </div>

              <div className="px-5 pb-5 pt-2 flex-1 flex flex-col justify-between relative min-h-[140px]">
                <div className="flex flex-col text-left">
                  <span className="text-4xl font-extrabold text-amber-600 dark:text-amber-400 leading-none">
                    {rateTypesBreakdown.trolleyDemurrageCount}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1.5">
                    Charge rules
                  </span>
                </div>
                
                <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-[65%] text-left mt-4 z-10">
                  Waiting time fees, vehicle detention, trolley usage.
                </p>

                {/* SVG Illustration - Absolute Positioned */}
                <svg viewBox="0 0 120 100" fill="none" className="absolute right-1 bottom-3 w-32 h-26 opacity-[0.9] pointer-events-none select-none">
                  <ellipse cx="60" cy="85" rx="45" ry="4" fill="#FEE2E2" />
                  <circle cx="82" cy="42" r="24" stroke="#F59E0B" strokeWidth="2" strokeDasharray="4 3" fill="#FFFBEB" fillOpacity="0.6" />
                  <path d="M82,24 L82,42 L94,42" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" />
                  <g transform="translate(10, 8)">
                    <circle cx="34" cy="68" r="7" fill="#1F2937" stroke="#F59E0B" strokeWidth="1.5" />
                    <circle cx="34" cy="68" r="3" fill="#D1D5DB" />
                    <circle cx="68" cy="68" r="7" fill="#1F2937" stroke="#F59E0B" strokeWidth="1.5" />
                    <circle cx="68" cy="68" r="3" fill="#D1D5DB" />
                    <rect x="18" y="32" width="38" height="28" rx="2" fill="#F59E0B" stroke="#D97706" strokeWidth="1.5" />
                    <path d="M22,36 L52,36 L52,56 L22,56 Z" fill="#FFF3C4" fillOpacity="0.15" />
                    <path d="M56,36 L68,36 C72,36 76,40 76,46 L76,60 L56,60 Z" fill="#FEF3C7" stroke="#D97706" strokeWidth="1.5" strokeLinejoin="round" />
                    <path d="M62,40 L70,40 C72,40 73,42 73,44 L73,48 L62,48 Z" fill="#374151" />
                    <rect x="74" y="56" width="5" height="4" rx="1" fill="#9CA3AF" />
                  </g>
                </svg>
              </div>

              <div className="bg-amber-50/80 dark:bg-amber-950/40 border-t border-slate-100 dark:border-slate-800/60 py-2.5 px-5 flex items-center justify-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 group-hover:bg-amber-100/80 dark:group-hover:bg-amber-950/60 transition-colors">
                <span>View Charges</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

            {/* Card 4: Other Surcharges (Tolls & Fuel) */}
            <div 
              onClick={() => setActiveTab('surcharges')}
              className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl flex flex-col justify-between overflow-hidden cursor-pointer hover:shadow-md transition-all group min-h-[240px] shadow-xs border-t-[3.5px] border-t-emerald-500"
            >
              <div className="p-5 pb-2 flex items-center gap-3.5">
                <span className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <DollarSign className="w-5 h-5" />
                </span>
                <div className="min-w-0 text-left">
                  <h4 className="text-[14px] font-black text-slate-800 dark:text-slate-100 truncate">Other Surcharges</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">(Tolls &amp; Fuel)</p>
                </div>
              </div>

              <div className="px-5 pb-5 pt-2 flex-1 flex flex-col justify-between relative min-h-[140px]">
                <div className="flex flex-col text-left">
                  <span className="text-4xl font-extrabold text-emerald-600 dark:text-emerald-400 leading-none">
                    {rateTypesBreakdown.otherSurchargeCount}
                  </span>
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1.5">
                    Charge rules
                  </span>
                </div>
                
                <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed max-w-[65%] text-left mt-4 z-10">
                  Toll fees, fuel indexing, border crossings, multi-drop.
                </p>

                {/* SVG Illustration - Absolute Positioned */}
                <svg viewBox="0 0 120 100" fill="none" className="absolute right-1 bottom-3 w-32 h-26 opacity-[0.9] pointer-events-none select-none">
                  <ellipse cx="60" cy="85" rx="45" ry="4" fill="#E8F5E9" />
                  <path d="M15,80 L105,80" stroke="#10B981" strokeWidth="2" strokeLinecap="round" />
                  <rect x="76" y="35" width="16" height="45" rx="3" fill="#A7F3D0" stroke="#047857" strokeWidth="1.5" />
                  <path d="M72,35 L96,35 L92,30 L76,30 Z" fill="#34D399" stroke="#047857" strokeWidth="1.5" strokeLinejoin="round" />
                  <rect x="80" y="42" width="8" height="10" rx="1" fill="#ECFDF5" stroke="#047857" strokeWidth="1" />
                  <circle cx="84" cy="58" r="2.5" fill="#EF4444" />
                  <circle cx="84" cy="65" r="2.5" fill="#10B981" />
                  <g transform="translate(76, 52) rotate(-25)">
                    <path d="M 0,-2 L -65,-2 C -66,-2 -66,2 -65,2 L 0,2 Z" fill="#EF4444" />
                    <path d="M -10,-2 L -20,-2 L -25,2 L -15,2 Z" fill="white" />
                    <path d="M -30,-2 L -40,-2 L -45,2 L -35,2 Z" fill="white" />
                    <path d="M -50,-2 L -60,-2 L -65,2 L -55,2 Z" fill="white" />
                    <circle cx="0" cy="0" r="4.5" fill="#065F46" />
                  </g>
                </svg>
              </div>

              <div className="bg-emerald-50/80 dark:bg-emerald-950/40 border-t border-slate-100 dark:border-slate-800/60 py-2.5 px-5 flex items-center justify-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-100/80 dark:group-hover:bg-emerald-950/60 transition-colors">
                <span>View Charges</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>

          </div>
        </div>

        {activeTab === 'lanes' && (
        <>
        {/* Active Filter Indicator Banner */}
        {(statusFilter !== 'all' || vehicleTypeFilter || rateCategoryFilter || billingTypeFilter || companyFilter) && (
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/40 px-3.5 py-2 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold text-orange-900 dark:text-orange-200 animate-fade-in shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-brand shrink-0" />
              <span>
                Filtered by:{' '}
                {statusFilter !== 'all' && (
                  <span className="mr-2">
                    Status: <strong className="underline decoration-brand text-slate-900 dark:text-slate-100 font-bold">{statusFilter === 'active' ? 'Active Only' : 'Inactive Only'}</strong>
                  </span>
                )}
                {companyFilter && (
                  <span className="mr-2">
                    Company: <strong className="underline decoration-brand text-slate-900 dark:text-slate-100 font-bold">{companyOptions.find(c => c.id === companyFilter)?.name || customers.find(c => c.id === companyFilter)?.name || 'Selected Customer'}</strong>
                  </span>
                )}
                {vehicleTypeFilter && (
                  <span className="mr-2">
                    Vehicle Type: <strong className="underline decoration-brand text-slate-900 dark:text-slate-100 font-bold">{vehicleTypeFilter}</strong>
                  </span>
                )}
                {rateCategoryFilter && (
                  <span className="mr-2">
                    Rate Category: <strong className="underline decoration-brand text-slate-900 dark:text-slate-100 font-bold">{rateCategoryFilter}</strong>
                  </span>
                )}
                {billingTypeFilter && (
                  <span className="mr-2">
                    Billing Type: <strong className="underline decoration-brand text-slate-900 dark:text-slate-100 font-bold">{billingTypeFilter}</strong>
                  </span>
                )}
                ({totalCount} agreement{totalCount === 1 ? '' : 's'} matching)
              </span>
            </div>
            <button
              onClick={() => {
                setStatusFilter('all');
                setCompanyFilter('');
                setVehicleTypeFilter('');
                setRateCategoryFilter('');
                setBillingTypeFilter('');
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-800 text-[11px] font-bold text-brand hover:bg-orange-100 dark:hover:bg-orange-950 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <span>Show All Rates</span>
              <X className="w-3 h-3 shrink-0" />
            </button>
          </div>
        )}

        {/* Unlinked Lanes Warning Banner */}
        {kpis.unlinkedCount > 0 && (
          <div className="shrink-0 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-amber-900 dark:text-amber-200">
                {kpis.unlinkedCount} rate{kpis.unlinkedCount === 1 ? '' : 's'} not linked to a lane
              </p>
              <p className="text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                These still have free-text origin/destination, so trips never pick them up. Open each one
                and choose both places to fix it.
              </p>
            </div>
          </div>
        )}

        {/* Control Toolbar (Search, Filter, View Switcher) */}
        {viewMode === 'grid' && (
          <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs relative z-10">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              {tabSwitcherAndFilters}

              {/* Search Input (Grid view only) */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search ID, customer, route..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 h-9 text-xs bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 font-semibold"
                />
                {search && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setCurrentPage(1);
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Content Workspace: Ledger Table vs Grid Cards */}
        {viewMode === 'ledger' ? (
          <div className="w-full flex flex-col">
            <DataTable
              title={tabSwitcherAndFilters}
              hideRecordCount={true}
              columns={columns}
              data={filteredData}
              sortAccessor={(row: RateCard) => row.createdAt}
              bulkActions={bulkActions}
              enableSelection={true}
              compact={true}
              isLoading={isLoading}
              isError={isError}
              errorMessage={(error as Error)?.message || 'Failed to load rate cards.'}
              actionsElement={inlineSearchInput}
              currentPage={currentPage}
              totalPages={totalPages}
              totalRecords={totalCount}
              onPageChange={(p) => setCurrentPage(p)}
              pageSize={pageSize}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setCurrentPage(1);
              }}
              onRowClick={(row) => navigate(`/rate-cards/${row.id}`)}
            />
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col w-full animate-fade-in">
            {/* Grid Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-4 sm:p-5">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 h-[200px] skeleton"></div>
              ))
            ) : isError ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center">
                <div className="w-14 h-14 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-500 mb-2">
                  <AlertTriangle size={28} />
                </div>
                <p className="text-sm font-bold text-slate-900">Data Unavailable</p>
                <p className="text-xs text-slate-500 mt-1">{(error as Error)?.message || 'Failed to load rate cards.'}</p>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="col-span-full py-16 flex flex-col items-center justify-center">
                <p className="text-sm font-bold text-slate-900">No Records Found</p>
                <p className="text-xs text-slate-500 mt-1">There are no rate cards matching your filters.</p>
              </div>
            ) : filteredData.map((rc, idx) => (
              <Card 
                key={rc.id} 
                onClick={() => navigate(`/rate-cards/${rc.id}`)}
                className="border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xs hover:border-brand/45 hover:-translate-y-0.5 transition-all duration-150 ease-in-out cursor-pointer bg-white dark:bg-slate-900 flex flex-col justify-between group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-brand/30"
                tabIndex={0}
                role="button"
                aria-label={`Rate card ${rc.name}, price ${rc.currency || 'SAR'} ${rc.base_price}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate(`/rate-cards/${rc.id}`);
                  }
                }}
              >
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">
                      RC-{String((currentPage - 1) * pageSize + idx + 1).padStart(3, '0')}
                    </span>
                    <Badge 
                      variant="outline" 
                      className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0 ${
                        rc.is_active 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {rc.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-extrabold text-slate-955 dark:text-slate-50 group-hover:text-brand transition-colors mt-1">
                    {rc.name}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" /> {rc.customer?.name || 'Customer'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="py-3 space-y-2">
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{rc.route_origin}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-brand/70" />
                    <span className="font-bold text-slate-700 dark:text-slate-300">{rc.route_destination}</span>
                  </div>
                </CardContent>

                <CardFooter className="bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 p-3 flex items-center justify-between text-xs rounded-b-xl">
                  <span className="text-[10px] text-slate-500 font-medium">Price per Trip:</span>
                  <span className="font-mono font-extrabold text-slate-955 dark:text-slate-50">
                    {rc.currency || 'SAR'} {Number(rc.base_price).toLocaleString()}
                  </span>
                </CardFooter>
              </Card>
            ))}
            </div>

            {/* Pagination Footer — mirrors the list view's pagination */}
            <div className="shrink-0 p-3 sm:p-4 sm:px-5 border-t border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60 dark:bg-slate-900/60 text-xs font-semibold text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 dark:text-slate-400 font-medium">
                    <span className="hidden sm:inline">Rows per page:</span>
                    <span className="sm:hidden">Rows:</span>
                  </span>
                  <select
                    value={pageSize}
                    onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                    className="h-8 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand/20 cursor-pointer shadow-xs"
                    aria-label="Rows per page"
                  >
                    {gridPageSizeOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <span className="text-slate-500 dark:text-slate-400 font-medium border-l border-slate-200 dark:border-slate-700 pl-4 hidden sm:inline">
                  Showing <span className="font-extrabold text-slate-900 dark:text-slate-100">{gridFromIndex}</span> to <span className="font-extrabold text-slate-900 dark:text-slate-100">{gridToIndex}</span> of <span className="font-extrabold text-slate-900 dark:text-slate-100">{totalCount}</span> entries
                </span>
              </div>

              <div className="flex items-center gap-1.5 ml-auto" role="navigation" aria-label="Pagination Navigation">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1 || isLoading}
                  aria-label="First page"
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  <ChevronsLeft size={14} />
                </button>

                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1 || isLoading}
                  aria-label="Previous page"
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  <ChevronLeft size={14} />
                </button>

                <div className="flex items-center gap-1 px-2" aria-live="polite">
                  <span className="px-2.5 py-1 text-xs font-extrabold text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs">
                    {currentPage}
                  </span>
                  <span className="text-slate-400 text-xs font-medium">/</span>
                  <span className="text-slate-600 dark:text-slate-400 text-xs font-bold">{totalPages}</span>
                </div>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages || isLoading}
                  aria-label="Next page"
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  <ChevronRight size={14} />
                </button>

                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage >= totalPages || isLoading}
                  aria-label="Last page"
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  <ChevronsRight size={14} />
                </button>
              </div>
            </div>
          </div>
        )}
        </>
        )}

        {activeTab === 'surcharges' && <SurchargeFeesPanel />}

        <RateCardFormDialog isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
        <RateCardFormDialog
          isOpen={!!editTarget}
          rateCard={editTarget}
          onClose={() => setEditTarget(null)}
        />

        <ExcelImportDialog
          isOpen={importDialogOpen}
          onClose={() => setImportDialogOpen(false)}
          entityLabel="Rate Cards"
          columns={RATE_CARD_COLUMNS}
          requiredFields={['customer_name', 'origin', 'price']}
          preferSheet="rate"
          templateUrl="/templates/MERCON_RateCards_Import_Template.xlsx"
          matchLabel="customer + lane + vehicle type + rate category"
          onImport={(rows) => rateCardService.importRows(rows)}
          invalidateKeys={[['rate-cards']]}
        />

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          onConfirm={async () => {
            await confirmModal.onConfirm();
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
          }}
          title={confirmModal.title}
          message={confirmModal.message}
          isDestructive={true}
        />

        {/* ── Universal Export Modal ─────────────────────────────────── */}
        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          title="Export Rate Cards Ledger"
          description="Choose your export preferences, filters, and columns."
          fileNamePrefix="rate_cards_ledger"
          sheetName="Rate Cards"
          subtitle="MERCON Logistics Tariff & Rate Card Matrix"
          filteredData={filteredData}
          allData={response?.data || filteredData}
          selectedData={selectedRateCardsForExport}
          totalCount={totalCount}
          columns={RATE_CARD_EXPORT_COLUMNS}
          filters={RATE_CARD_EXPORT_FILTERS}
          formats={['xlsx', 'csv', 'pdf']}
          rowDateAccessor={(rc) => rc.createdAt}
        />

      </div>
    </DashboardLayout>
  );
}
