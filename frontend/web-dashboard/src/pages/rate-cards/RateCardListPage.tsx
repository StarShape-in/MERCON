import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import KpiCard from '@/components/ui/KpiCard';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { RouteCorridorKpi } from '@/components/ui/CustomKpiWidgets';
import { CustomerBuilding, RouteLine, CheckBadge } from '@/components/ui/kpi-icons';
import { VEHICLE_TYPES, RATE_CATEGORIES, BILLING_TYPES } from '@mercon/shared-types';
import { rateCardService, RateCard } from '@/services/rateCardService';
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

export default function RateCardListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [companyFilter, setCompanyFilter] = useState<string>('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>('');
  const [rateCategoryFilter, setRateCategoryFilter] = useState<string>('');
  const [billingTypeFilter, setBillingTypeFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'ledger' | 'grid'>('ledger');
  const [activeTab, setActiveTab] = useState<'lanes' | 'surcharges'>('lanes');
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

  const debouncedSearch = useDebouncedValue(search, 300);

  // Fetch companies/customers for filter dropdown
  const { data: customersResponse } = useQuery({
    queryKey: ['customers-list-filter'],
    queryFn: () => customerService.getAll({ per_page: 200 }),
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

  // Filtered rate cards for view (data is already filtered server-side)
  const filteredData = rateCards;

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
        <div className="flex flex-col min-w-[160px]">
          <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
            <span>{row.customer?.name || 'Customer'}</span>
          </div>
        </div>
      ),
    },
    {
      header: 'Route Lane',
      accessor: (row: RateCard) => (
        <div className="flex flex-col gap-1 min-w-[180px]">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{row.route_origin}</span>
            <ArrowRight className="w-3.5 h-3.5 text-brand shrink-0" />
            <span>{row.route_destination}</span>
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

  const rateCardFilters = (
    <div className="flex items-center gap-3">
      <Select
        value={companyFilter || 'all'}
        onValueChange={(val: string) => {
          setCompanyFilter(val === 'all' ? '' : val);
          setCurrentPage(1);
        }}
      >
        <SelectTrigger className="h-9 px-3 w-[210px] shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold whitespace-nowrap">
          <div className="flex items-center gap-2 whitespace-nowrap overflow-hidden">
            <Building2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
            <SelectValue placeholder="Company / Customer" />
          </div>
        </SelectTrigger>
        <SelectContent align="start" className="w-60 max-h-[320px] p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
          <SelectGroup>
            <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
              Company / Customer
            </SelectLabel>
            <SelectItem value="all" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
              <span className="flex items-center gap-2 font-medium text-slate-700 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0"></span>
                All Companies
              </span>
            </SelectItem>
            {companyOptions.map((cust) => (
              <SelectItem key={cust.id} value={cust.id} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                {cust.name}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select
        value={vehicleTypeFilter || 'all'}
        onValueChange={(val: string) => {
          setVehicleTypeFilter(val === 'all' ? '' : val);
          setCurrentPage(1);
        }}
      >
        <SelectTrigger className="h-9 px-3 w-[200px] shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold whitespace-nowrap">
          <div className="flex items-center gap-2 whitespace-nowrap overflow-hidden">
            <Filter className="h-3.5 w-3.5 text-amber-600 shrink-0" />
            <SelectValue placeholder="Vehicle Type" />
          </div>
        </SelectTrigger>
        <SelectContent align="start" className="w-56 max-h-[320px] p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
          <SelectGroup>
            <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
              Vehicle Type
            </SelectLabel>
            <SelectItem value="all" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
              <span className="flex items-center gap-2 font-medium text-slate-700 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0"></span>
                All Vehicle Types
              </span>
            </SelectItem>
            {VEHICLE_TYPES.map((vType) => (
              <SelectItem key={vType} value={vType} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                {vType}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select
        value={rateCategoryFilter || 'all'}
        onValueChange={(val: string) => {
          setRateCategoryFilter(val === 'all' ? '' : val);
          setCurrentPage(1);
        }}
      >
        <SelectTrigger className="h-9 px-3 w-[220px] shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold whitespace-nowrap">
          <div className="flex items-center gap-2 whitespace-nowrap overflow-hidden">
            <Filter className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
            <SelectValue placeholder="Rate Category" />
          </div>
        </SelectTrigger>
        <SelectContent align="start" className="w-56 max-h-[320px] p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
          <SelectGroup>
            <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
              Rate Category
            </SelectLabel>
            <SelectItem value="all" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
              <span className="flex items-center gap-2 font-medium text-slate-700 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0"></span>
                All Rate Categories
              </span>
            </SelectItem>
            {RATE_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                {cat}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      <Select
        value={billingTypeFilter || 'all'}
        onValueChange={(val: string) => {
          setBillingTypeFilter(val === 'all' ? '' : val);
          setCurrentPage(1);
        }}
      >
        <SelectTrigger className="h-9 px-3 w-[200px] shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold whitespace-nowrap">
          <div className="flex items-center gap-2 whitespace-nowrap overflow-hidden">
            <Filter className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <SelectValue placeholder="Billing Type" />
          </div>
        </SelectTrigger>
        <SelectContent align="start" className="w-56 max-h-[320px] p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
          <SelectGroup>
            <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
              Billing Type
            </SelectLabel>
            <SelectItem value="all" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
              <span className="flex items-center gap-2 font-medium text-slate-700 whitespace-nowrap">
                <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0"></span>
                All Billing Types
              </span>
            </SelectItem>
            {BILLING_TYPES.map((bType) => (
              <SelectItem key={bType} value={bType} className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                {bType}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
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
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1">
          <div className="flex items-center gap-3">
            <FileText className="w-6 h-6 text-orange-500 dark:text-orange-400 shrink-0" />

            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Rate Cards
                </h1>
              </div>
            </div>

            {/* Lane Prices / Surcharge Fees tab */}
            <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg flex items-center border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setActiveTab('lanes')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  activeTab === 'lanes'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Lane Prices
              </button>
              <button
                onClick={() => setActiveTab('surcharges')}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                  activeTab === 'surcharges'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                Surcharge Fees
              </button>
            </div>
          </div>

          {activeTab === 'lanes' && (
          <div className="flex items-center gap-2.5">
            {/* Segmented View Switcher */}
            <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg flex items-center border border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setViewMode('ledger')}
                className={`p-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
                  viewMode === 'ledger'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
                title="Ledger Table View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1 ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
                title="Grid Card View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>

            <DropdownMenu open={exportMenuOpen} onOpenChange={setExportMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs dark:bg-slate-900 dark:border-slate-800"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" /> Export / Import
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-1.5 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl">
                <div className="flex items-center gap-1 p-1 mb-1 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <button
                    onClick={(e) => { e.preventDefault(); setExportFormat('excel'); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md text-[11px] font-bold transition-colors ${exportFormat === 'excel' ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                    Excel
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); setExportFormat('pdf'); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md text-[11px] font-bold transition-colors ${exportFormat === 'pdf' ? 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-400 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
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
              onClick={() => setIsAddOpen(true)}
              className="h-9 gap-1.5 text-xs bg-brand hover:bg-brand-hover text-white font-bold shadow-xs rounded-md px-4"
            >
              <Plus className="w-4 h-4" /> Add Rate
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-9 w-9 p-0 text-slate-600 border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
              title="Refresh Data"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          )}
        </div>

        {activeTab === 'lanes' && (
        <>
        {/* 3-Card Instrument Panel KPI Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 shrink-0">
          
          {/* Card 1: Active Rate Cards */}
          <KpiCard
            title="ACTIVE RATES"
            value={
              <span>
                {kpis.activeCount}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Active</span>
              </span>
            }
            variant="emerald"
            description="Rates applied to new trips"
            icon={CheckBadge}
            completionGauge={{
              percentage: kpis.activePct,
              label: "Active rate share",
              subtext: `${kpis.activeCount} Active • ${kpis.total - kpis.activeCount} Inactive`
            }}
            isActive={statusFilter === 'active'}
            onClick={() => setStatusFilter(prev => prev === 'active' ? 'all' : 'active')}
          />

          {/* Card 3: Most-priced lane */}
          <KpiCard
            title="PRICED ROUTE LANES"
            value={
              <span>
                {kpis.laneCount}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Lanes</span>
              </span>
            }
            variant="blue"
            description={kpis.topRoute ? `Top: ${kpis.topRoute}` : `${kpis.laneCount} distinct lanes`}
            icon={RouteLine}
            livePulseTrack={{
              statusText: kpis.topRoute ? `Top: ${kpis.topRouteOrigin} → ${kpis.topRouteDestination}` : "Corridors active",
              subText: `${kpis.topRouteCount} agreement${kpis.topRouteCount === 1 ? '' : 's'}`,
            }}
            isActive={!!search && kpis.topRouteOrigin !== null && search === kpis.topRouteOrigin}
            onClick={() => kpis.topRouteOrigin && setSearch(prev => prev === kpis.topRouteOrigin ? '' : kpis.topRouteOrigin!)}
          />

          {/* Card 4: Customers with a negotiated rate */}
          <KpiCard
            title="CUSTOMERS PRICED"
            value={
              <span>
                {kpis.uniqueCustomers}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Customers</span>
              </span>
            }
            variant="amber"
            description="Customers with at least one rate card"
            icon={CustomerBuilding}
          />
        </div>

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

        {/* Content Workspace: Ledger Table vs Grid Cards */}
        {viewMode === 'ledger' ? (
          <div className="w-full flex flex-col">
            <DataTable
              title={
                <span className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-500" />
                  <span>Rate Card Ledger</span>
                </span>
              }
              columns={columns}
              data={filteredData}
              sortAccessor={(row: RateCard) => row.createdAt}
              bulkActions={bulkActions}
              enableSelection={true}
              compact={true}
              isLoading={isLoading}
              isError={isError}
              errorMessage={(error as Error)?.message || 'Failed to load rate cards.'}
              searchPlaceholder="Search ID, customer, route..."
              searchValue={search}
              onSearchChange={(val) => {
                setSearch(val);
                setCurrentPage(1);
              }}
              filterElement={rateCardFilters}
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
            {/* Toolbar: matches the list view's search bar & filters, placed above the grid */}
            <div className="shrink-0 p-3 sm:p-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex flex-col gap-3">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3 w-full">
                <div className="flex items-center gap-2.5 sm:gap-3 flex-1 flex-wrap min-w-0">
                  <div className="flex items-center gap-2 shrink-0">
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-500" />
                      <span>Rate Card Ledger</span>
                    </h3>
                    <Badge variant="outline" className="bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 text-[11px] font-mono font-bold px-2 py-0.5">
                      {totalCount} {totalCount === 1 ? 'record' : 'records'}
                    </Badge>
                  </div>

                  <div className="relative w-full sm:w-72 lg:w-88 shrink-0">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Search ID, customer, route..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                      className="w-full pl-8.5 pr-8 h-9 text-xs bg-white dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700 focus-visible:ring-brand/20 focus-visible:border-brand rounded-md font-medium"
                      aria-label="Search Rate Cards"
                    />
                    {search && (
                      <button
                        onClick={() => setSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                        aria-label="Clear search"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex w-full xl:w-auto items-center flex-wrap gap-2 sm:shrink-0 xl:ml-auto rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-950/30 p-1.5">
                  {rateCardFilters}
                </div>
              </div>
            </div>

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
        />

      </div>
    </DashboardLayout>
  );
}
