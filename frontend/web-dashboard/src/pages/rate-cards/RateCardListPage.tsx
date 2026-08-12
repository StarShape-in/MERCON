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
  Users,
  AlertTriangle,
  FileSpreadsheet,
  ChevronDown,
  Layers,
  UploadCloud,
  X
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import KpiCard from '@/components/ui/KpiCard';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { RouteCorridorKpi } from '@/components/ui/CustomKpiWidgets';
import { RevenueChart, CustomerBuilding, RouteLine, CheckBadge } from '@/components/ui/kpi-icons';
import { VEHICLE_TYPES, RATE_CATEGORIES } from '@mercon/shared-types';
import { rateCardService, RateCard } from '@/services/rateCardService';
import RateCardFormDialog from '@/components/rate-cards/RateCardFormDialog';
import AssignRateCardDialog from '@/components/rate-cards/AssignRateCardDialog';
import ExcelImportDialog from '@/components/fleet/ExcelImportDialog';
import { RATE_CARD_COLUMNS } from '@/utils/importUtils';
import { exportExcelTable, exportPDFTable } from '@/utils/exportUtils';
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
  'Price per Trip (SAR)', 'Status', 'Linked Lane'
];

const rateCardsToExportRows = (cards: RateCard[]) => cards.map((rc, idx) => [
  `RC-${String(idx + 1).padStart(3, '0')}`,
  rc.name,
  rc.customer?.name || 'Customer',
  rc.route_origin,
  rc.route_destination,
  Number(rc.base_price || 0),
  rc.is_active ? 'Active' : 'Inactive',
  (rc.originLocationId && rc.destinationLocationId) ? 'Linked' : 'Not Linked'
]);

export default function RateCardListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState<string>('');
  const [rateCategoryFilter, setRateCategoryFilter] = useState<string>('');
  const [viewMode, setViewMode] = useState<'ledger' | 'grid'>('ledger');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showPriceSummaryModal, setShowPriceSummaryModal] = useState(false);
  const [assignTarget, setAssignTarget] = useState<RateCard | null>(null);
  const [editTarget, setEditTarget] = useState<RateCard | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');

  const debouncedSearch = useDebouncedValue(search, 300);

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
    queryKey: ['rate-cards', { page: currentPage, per_page: pageSize, search: debouncedSearch, status: statusFilter, vehicle_type: vehicleTypeFilter, rate_category: rateCategoryFilter }],
    queryFn: () => rateCardService.getAll({
      page: currentPage,
      per_page: pageSize,
      search: debouncedSearch || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      vehicle_type: vehicleTypeFilter || undefined,
      rate_category: rateCategoryFilter || undefined,
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

  const handleExport = (format: 'excel' | 'pdf', filterType: 'all' | 'active') => {
    let dataToExport = filteredData;
    if (filterType === 'active') {
      dataToExport = rateCards.filter(rc => rc.is_active);
    }

    if (!dataToExport.length) {
      toast.warning('No rate cards available for export with selected filter.');
      return;
    }

    const rows = rateCardsToExportRows(dataToExport);
    const title = `Rate Cards Export (${filterType.toUpperCase()})`;
    const dateStr = new Date().toISOString().slice(0, 10);

    if (format === 'excel') {
      exportExcelTable(title, RATE_CARD_EXPORT_HEADERS, rows, `rate_cards_${filterType}_${dateStr}.xlsx`);
    } else {
      exportPDFTable(title, RATE_CARD_EXPORT_HEADERS, rows, `rate_cards_${filterType}_${dateStr}.pdf`);
    }
  };

  const columns = [
    {
      header: 'Rate Card Ref ID',
      accessor: (_row: RateCard, index?: number) => {
        const seq = (currentPage - 1) * pageSize + (index ?? 0) + 1;
        return (
          <div className="flex items-center min-w-[100px]">
            <span className="font-mono text-xs font-bold text-[#E8450F]">
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
        <div className="flex flex-col gap-1 min-w-[200px]">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{row.route_origin}</span>
            <ArrowRight className="w-3.5 h-3.5 text-[#E8450F] shrink-0" />
            <span>{row.route_destination}</span>
            {(!row.originLocationId || !row.destinationLocationId) && (
              <Badge
                variant="outline"
                className="ml-1 text-[9px] font-bold uppercase bg-amber-50 text-amber-700 border-amber-200"
                title="This lane is still free text, so trips never pick this rate up. Edit it and choose both places."
              >
                Not linked
              </Badge>
            )}
          </div>
          {(row.rate_category || row.vehicle_type) && (
            <div className="flex flex-wrap items-center gap-1">
              {row.rate_category && (
                <Badge variant="outline" className="text-[9px] font-bold uppercase px-1.5 py-0 bg-indigo-50 text-indigo-700 border-indigo-200">
                  {row.rate_category}
                </Badge>
              )}
              {row.vehicle_type && (
                <Badge variant="outline" className="text-[9px] font-bold uppercase px-1.5 py-0 bg-amber-50 text-amber-700 border-amber-200">
                  {row.vehicle_type}
                </Badge>
              )}
            </div>
          )}
        </div>
      ),
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
        <div className="flex items-center justify-end gap-1 min-w-[130px]" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setAssignTarget(row)}
            disabled={!row.originLocationId || !row.destinationLocationId}
            title={
              !row.originLocationId || !row.destinationLocationId
                ? 'Cannot assign unlinked lane to customers'
                : 'Apply rate card to customers'
            }
            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
          >
            <Users className="h-3.5 w-3.5" />
          </button>

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

  const bulkActions = [
    {
      label: 'Export Selected Excel',
      icon: <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />,
      variant: 'secondary' as const,
      onClick: (selectedRows: RateCard[]) => {
        exportExcelTable('Rate Cards Export', RATE_CARD_EXPORT_HEADERS, rateCardsToExportRows(selectedRows), 'selected_rate_cards.xlsx');
      }
    },
    {
      label: 'Export Selected PDF',
      icon: <FileText className="w-3.5 h-3.5 text-rose-600" />,
      variant: 'secondary' as const,
      onClick: (selectedRows: RateCard[]) => {
        exportPDFTable('Rate Cards Export', RATE_CARD_EXPORT_HEADERS, rateCardsToExportRows(selectedRows), 'selected_rate_cards.pdf');
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
          </div>

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
                  className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" /> Export
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
                <div className="flex items-center gap-1 p-1 mb-1 rounded-lg bg-slate-100">
                  <button
                    onClick={(e) => { e.preventDefault(); setExportFormat('excel'); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md text-[11px] font-bold transition-colors ${exportFormat === 'excel' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" />
                    Excel
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); setExportFormat('pdf'); }}
                    className={`flex-1 flex items-center justify-center gap-1.5 h-7 rounded-md text-[11px] font-bold transition-colors ${exportFormat === 'pdf' ? 'bg-white text-rose-700 shadow-2xs' : 'text-slate-500 hover:text-slate-700'}`}
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

                <DropdownMenuSeparator className="my-1 border-slate-100" />
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
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/rate-cards/new')}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5" /> Full form
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportDialogOpen(true)}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
            >
              <UploadCloud className="w-3.5 h-3.5 text-emerald-600" /> Import Excel
            </Button>

            <Button
              size="sm"
              onClick={() => setIsAddOpen(true)}
              className="h-9 gap-1.5 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold shadow-xs rounded-md px-4"
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
        </div>

        {/* 4-Card Instrument Panel KPI Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 shrink-0">
          
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

          {/* Card 2: Avg price per trip */}
          <KpiCard
            title="AVERAGE PRICE"
            value={
              <span>
                <span className="text-[16px] font-semibold mr-1.5 opacity-85">SAR</span>
                {kpis.avgPrice.toLocaleString()}
              </span>
            }
            variant="brand"
            description="Mean price across all rates"
            icon={RevenueChart}
            chartData={[1200, 1800, 1500, 2100, 2400, kpis.avgPrice || 2500]}
            onClick={() => setShowPriceSummaryModal(true)}
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
        {(statusFilter !== 'all' || vehicleTypeFilter || rateCategoryFilter) && (
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/40 px-3.5 py-2 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold text-orange-900 dark:text-orange-200 animate-fade-in shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-[#E8450F] shrink-0" />
              <span>
                Filtered by:{' '}
                {statusFilter !== 'all' && (
                  <span className="mr-2">
                    Status: <strong className="underline decoration-[#E8450F] text-slate-900 dark:text-slate-100 font-bold">{statusFilter === 'active' ? 'Active Only' : 'Inactive Only'}</strong>
                  </span>
                )}
                {vehicleTypeFilter && (
                  <span className="mr-2">
                    Vehicle Type: <strong className="underline decoration-[#E8450F] text-slate-900 dark:text-slate-100 font-bold">{vehicleTypeFilter}</strong>
                  </span>
                )}
                {rateCategoryFilter && (
                  <span className="mr-2">
                    Rate Category: <strong className="underline decoration-[#E8450F] text-slate-900 dark:text-slate-100 font-bold">{rateCategoryFilter}</strong>
                  </span>
                )}
                ({totalCount} agreement{totalCount === 1 ? '' : 's'} matching)
              </span>
            </div>
            <button
              onClick={() => {
                setStatusFilter('all');
                setVehicleTypeFilter('');
                setRateCategoryFilter('');
                setCurrentPage(1);
              }}
              className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-800 text-[11px] font-bold text-[#E8450F] hover:bg-orange-100 dark:hover:bg-orange-950 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5 shrink-0"
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
              filterElement={
                <div className="flex items-center gap-3">
                  <Select
                    value={statusFilter}
                    onValueChange={(val: any) => {
                      setStatusFilter(val);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-9 px-3 w-40 shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <Filter className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                        <SelectValue placeholder="Status" />
                      </div>
                    </SelectTrigger>
                    <SelectContent align="start" className="w-48 p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
                      <SelectGroup>
                        <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                          Status Filter
                        </SelectLabel>
                        <SelectItem value="all" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                          <span className="flex items-center gap-2 font-medium text-slate-700">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            All Statuses
                          </span>
                        </SelectItem>
                        <SelectItem value="active" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                          <span className="flex items-center gap-2 font-medium text-emerald-700">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            Active Only
                          </span>
                        </SelectItem>
                        <SelectItem value="inactive" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                          <span className="flex items-center gap-2 font-medium text-slate-500">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                            Inactive Only
                          </span>
                        </SelectItem>
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
                    <SelectTrigger className="h-9 px-3 w-44 shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold">
                      <div className="flex items-center gap-2">
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
                          <span className="flex items-center gap-2 font-medium text-slate-700">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
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
                    <SelectTrigger className="h-9 px-3 w-48 shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold">
                      <div className="flex items-center gap-2">
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
                          <span className="flex items-center gap-2 font-medium text-slate-700">
                            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
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
                </div>
              }
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                className="border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xs hover:border-[#E8450F]/45 hover:-translate-y-0.5 transition-all duration-150 ease-in-out cursor-pointer bg-white dark:bg-slate-900 flex flex-col justify-between group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#E8450F]/30"
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
                  <CardTitle className="text-sm font-extrabold text-slate-955 dark:text-slate-50 group-hover:text-[#E8450F] transition-colors mt-1">
                    {rc.name}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" /> {rc.customer?.name || 'Customer'}
                  </CardDescription>
                </CardHeader>

                <CardContent className="py-3 space-y-2">
                  <div className="bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{rc.route_origin}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#E8450F]/70" />
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
        )}

        <RateCardFormDialog isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
        <RateCardFormDialog
          isOpen={!!editTarget}
          rateCard={editTarget}
          onClose={() => setEditTarget(null)}
        />
        <AssignRateCardDialog rateCard={assignTarget} onClose={() => setAssignTarget(null)} />

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

        {/* Pricing Summary Modal */}
        <Dialog open={showPriceSummaryModal} onOpenChange={setShowPriceSummaryModal}>
          <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6">
            <DialogHeader>
              <RevenueChart className="w-7 h-7 text-orange-500 dark:text-orange-400 mb-2" />
              <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                Pricing Summary
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Averaged across the {kpis.total} rate{kpis.total === 1 ? '' : 's'} currently configured.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 my-4 text-xs">
              <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200/60">
                <div>
                  <div className="font-bold text-indigo-900 dark:text-indigo-300">Average Price per Trip</div>
                  <div className="text-[10px] text-indigo-700 dark:text-indigo-400">Mean price across active lanes</div>
                </div>
                <span className="font-mono font-extrabold text-indigo-700 dark:text-indigo-300 text-sm">SAR {kpis.avgPrice.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">Active Rate Contracts</div>
                  <div className="text-[10px] text-slate-400">Total rate agreements in effect</div>
                </div>
                <Badge className="bg-[#E8450F] text-white font-mono font-bold text-xs">{kpis.activeCount} Active</Badge>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-bold border-slate-200"
                onClick={() => setShowPriceSummaryModal(false)}
              >
                Close Summary
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

      </div>
    </DashboardLayout>
  );
}
