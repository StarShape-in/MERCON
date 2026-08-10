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
  Globe2,
  Users,
  AlertTriangle,
  FileSpreadsheet,
  ChevronDown,
  Layers
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import KpiCard from '@/components/ui/KpiCard';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { RouteCorridorKpi } from '@/components/ui/CustomKpiWidgets';
import { RevenueChart, CustomerBuilding, RouteLine, CheckBadge } from '@/components/ui/kpi-icons';
import { rateCardService, RateCard } from '@/services/rateCardService';
import RateCardFormDialog from '@/components/rate-cards/RateCardFormDialog';
import AssignRateCardDialog from '@/components/rate-cards/AssignRateCardDialog';
import { exportExcelTable, exportPDFTable } from '@/utils/exportUtils';
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

const RATE_CARD_EXPORT_HEADERS = [
  'Rate Card ID', 'Contract Name', 'Applies To', 'Route Origin', 'Route Destination',
  'Base Tariff Rate (SAR)', 'Status', 'Linked Lane'
];

const rateCardsToExportRows = (cards: RateCard[]) => cards.map(rc => [
  `#${rc.id.slice(0, 8).toUpperCase()}`,
  rc.name,
  rc.customerId ? (rc.customer?.name || 'Customer') : 'All Customers (Standard)',
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
  const [scopeFilter, setScopeFilter] = useState<'all' | 'standard' | 'customer'>('all');
  const [viewMode, setViewMode] = useState<'ledger' | 'grid'>('ledger');
  const [pageSize, setPageSize] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showTariffModal, setShowTariffModal] = useState(false);
  const [assignTarget, setAssignTarget] = useState<RateCard | null>(null);
  const [editTarget, setEditTarget] = useState<RateCard | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');

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

  const { data: response, isLoading, isError, error } = useQuery({
    queryKey: ['rate-cards'],
    queryFn: () => rateCardService.getAll(),
  });

  const rateCards = response?.data || [];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['rate-cards'] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Filtered rate cards
  const filteredData = useMemo(() => {
    return rateCards.filter((rc) => {
      const matchesSearch = 
        rc.name.toLowerCase().includes(search.toLowerCase()) || 
        rc.id.toLowerCase().includes(search.toLowerCase()) ||
        (rc.customer?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        rc.route_origin.toLowerCase().includes(search.toLowerCase()) ||
        rc.route_destination.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ? true :
        statusFilter === 'active' ? rc.is_active : !rc.is_active;

      const matchesScope =
        scopeFilter === 'all' ? true :
        scopeFilter === 'standard' ? !rc.customerId : !!rc.customerId;

      return matchesSearch && matchesStatus && matchesScope;
    });
  }, [rateCards, search, statusFilter, scopeFilter]);

  // Calculated KPIs
  const kpis = useMemo(() => {
    const total = rateCards.length;
    const activeCount = rateCards.filter(rc => rc.is_active).length;
    const activePct = total > 0 ? Math.round((activeCount / total) * 100) : 0;

    const totalPrice = rateCards.reduce((acc, rc) => acc + (Number(rc.base_price) || 0), 0);
    const avgPrice = total > 0 ? Math.round(totalPrice / total) : 0;

    const laneKeys = new Set(rateCards.map(rc => `${rc.originLocationId}|${rc.destinationLocationId}`));
    const standardCount = rateCards.filter(rc => !rc.customerId).length;
    const customerCount = total - standardCount;
    const uniqueCustomers = new Set(rateCards.map(rc => rc.customerId).filter(Boolean)).size;

    const unlinkedCount = rateCards.filter(rc => !rc.originLocationId || !rc.destinationLocationId).length;

    const routeCounts: Record<string, number> = {};
    rateCards.forEach(rc => {
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
      standardCount,
      customerCount,
      unlinkedCount,
      topRoute,
      topRouteCount,
      topRouteOrigin: topRouteOrigin || null,
      topRouteDestination: topRouteDestination || null,
    };
  }, [rateCards]);

  const handleExport = (format: 'excel' | 'pdf', filterType: 'all' | 'active' | 'standard') => {
    let dataToExport = filteredData;
    if (filterType === 'active') {
      dataToExport = rateCards.filter(rc => rc.is_active);
    } else if (filterType === 'standard') {
      dataToExport = rateCards.filter(rc => !rc.customerId);
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
      accessor: (row: RateCard) => (
        <div className="flex flex-col gap-0.5 min-w-[160px]">
          <span className="font-mono text-xs font-bold text-[#E8450F]">
            #{row.id.slice(0, 8).toUpperCase()}
          </span>
          <span className="text-[11px] text-slate-500 font-medium truncate max-w-[220px]" title={row.name}>
            {row.name}
          </span>
        </div>
      ),
    },
    {
      header: 'Applies to',
      accessor: (row: RateCard) => (
        <div className="flex flex-col min-w-[160px]">
          {row.customerId ? (
            <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 shrink-0 text-indigo-500" />
              <span>{row.customer?.name || 'Customer'}</span>
            </div>
          ) : (
            <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Globe2 className="w-3.5 h-3.5 shrink-0 text-[#E8450F]" />
              <span>All customers (Standard)</span>
            </div>
          )}
        </div>
      ),
    },
    {
      header: 'Route Lane',
      accessor: (row: RateCard) => (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200 min-w-[200px]">
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
      ),
    },
    {
      header: 'Base Tariff Rate',
      accessor: (row: RateCard) => (
        <div className="font-mono text-xs font-extrabold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200/60 dark:border-slate-700 w-fit min-w-[120px]">
          {row.currency || 'SAR'} {Number(row.base_price).toLocaleString()}
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row: RateCard) => (
        <Badge 
          variant="outline" 
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 flex items-center gap-1.5 w-fit ${
            row.is_active 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' 
              : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${row.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
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
            title="Delete Tariff Rate"
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

                <DropdownMenuItem
                  onClick={() => handleExport(exportFormat, 'standard')}
                  className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md"
                >
                  {exportFormat === 'excel'
                    ? <FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                    : <FileText className="mr-2 h-3.5 w-3.5 text-rose-600" />}
                  Standard Rates Only
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
            value={kpis.activeCount}
            variant="emerald"
            trend="neutral"
            trendValue={`${kpis.activePct}% Active`}
            description="Rates applied to new trips"
            icon={CheckBadge}
            isActive={statusFilter === 'active'}
            completionGauge={{
              percentage: kpis.activePct,
              label: `${kpis.activePct}% Active`,
              subtext: `${kpis.activeCount} Active • ${kpis.total - kpis.activeCount} Inactive`
            }}
            onClick={() => setStatusFilter(prev => prev === 'active' ? 'all' : 'active')}
          />

          {/* Card 2: Avg Base Tariff Rate */}
          <KpiCard
            title="AVERAGE PRICE"
            value={`SAR ${kpis.avgPrice.toLocaleString()}`}
            variant="brand"
            trend="neutral"
            trendValue={`${kpis.total} rate${kpis.total === 1 ? '' : 's'}`}
            description="Mean price across all rates"
            icon={RevenueChart}
            onClick={() => setShowTariffModal(true)}
          />

          {/* Card 3: Most-priced lane */}
          <KpiCard
            title="MOST-PRICED LANE"
            value={kpis.topRoute || 'No lanes yet'}
            variant="blue"
            trend="neutral"
            trendValue={kpis.topRoute ? `${kpis.topRouteCount} rate${kpis.topRouteCount === 1 ? '' : 's'}` : 'Add a rate'}
            description={`${kpis.laneCount} distinct lane${kpis.laneCount === 1 ? '' : 's'} priced`}
            icon={RouteLine}
            isActive={!!search && kpis.topRouteOrigin !== null && search === kpis.topRouteOrigin}
            onClick={() => kpis.topRouteOrigin && setSearch(prev => prev === kpis.topRouteOrigin ? '' : kpis.topRouteOrigin!)}
          >
            {kpis.topRouteOrigin && kpis.topRouteDestination && (
              <RouteCorridorKpi
                origin={kpis.topRouteOrigin}
                destination={kpis.topRouteDestination}
                tripCount={kpis.topRouteCount}
              />
            )}
          </KpiCard>

          {/* Card 4: Standard vs customer-specific split */}
          <KpiCard
            title="STANDARD RATES"
            value={kpis.standardCount}
            variant="amber"
            trend="neutral"
            trendValue={`${kpis.customerCount} customer-specific`}
            description={`Used by all customers • ${kpis.uniqueCustomers} with own rates`}
            icon={CustomerBuilding}
            isActive={scopeFilter === 'standard'}
            completionGauge={{
              percentage: kpis.total > 0 ? Math.round((kpis.standardCount / kpis.total) * 100) : 0,
              label: 'Share that are standard',
              subtext: `${kpis.standardCount} standard • ${kpis.customerCount} customer`
            }}
            onClick={() => setScopeFilter(prev => prev === 'standard' ? 'all' : 'standard')}
          />
        </div>

        {/* Active Filter Indicator Banner */}
        {(statusFilter !== 'all' || scopeFilter !== 'all') && (
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/40 px-3.5 py-2 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold text-orange-900 dark:text-orange-200 animate-fade-in shrink-0">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-[#E8450F] shrink-0" />
              <span>
                Filtered by:{' '}
                {statusFilter !== 'all' && (
                  <span className="mr-2">
                    Status: <strong className="underline decoration-[#E8450F] text-slate-900 dark:text-slate-100 font-bold">{statusFilter === 'active' ? 'Active Only' : 'Inactive Only'}</strong>
                  </span>
                )}
                {scopeFilter !== 'all' && (
                  <span>
                    Scope: <strong className="underline decoration-[#E8450F] text-slate-900 dark:text-slate-100 font-bold">{scopeFilter === 'standard' ? 'Standard (All Customers)' : 'Customer-Specific'}</strong>
                  </span>
                )}
                {' '}({filteredData.length} agreement{filteredData.length === 1 ? '' : 's'} matching)
              </span>
            </div>
            <button
              onClick={() => {
                setStatusFilter('all');
                setScopeFilter('all');
              }}
              className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-800 text-[11px] font-bold text-[#E8450F] hover:bg-orange-100 dark:hover:bg-orange-950 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <span>Show All Rates</span>
              <span className="text-[10px]">✕</span>
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
              onSearchChange={setSearch}
              filterElement={
                <div className="flex items-center gap-3">
                  <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
                    <SelectTrigger className="h-9 px-3 w-40 shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <Filter className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                        <SelectValue placeholder="Tariff Status" />
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

                  <Select value={scopeFilter} onValueChange={(val: any) => setScopeFilter(val)}>
                    <SelectTrigger className="h-9 px-3 w-44 shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <Globe2 className="h-3.5 w-3.5 text-[#E8450F] shrink-0" />
                        <SelectValue placeholder="Applies to" />
                      </div>
                    </SelectTrigger>
                    <SelectContent align="start" className="w-56 p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
                      <SelectGroup>
                        <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                          Applies To
                        </SelectLabel>
                        <SelectItem value="all" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">All Rates</SelectItem>
                        <SelectItem value="standard" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                          <span className="flex items-center gap-2 font-medium text-[#E8450F]">
                            <Globe2 className="w-3 h-3 text-[#E8450F]" />
                            Standard (all customers)
                          </span>
                        </SelectItem>
                        <SelectItem value="customer" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                          <span className="flex items-center gap-2 font-medium text-indigo-700">
                            <Building2 className="w-3 h-3 text-indigo-600" />
                            Customer-specific
                          </span>
                        </SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
              }
              pageSize={pageSize}
              onPageSizeChange={(size) => setPageSize(size)}
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
            ) : filteredData.map((rc) => (
              <Card 
                key={rc.id} 
                onClick={() => navigate(`/rate-cards/${rc.id}`)}
                className="border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xs hover:border-[#E8450F]/45 hover:-translate-y-0.5 transition-all duration-150 ease-in-out cursor-pointer bg-white dark:bg-slate-900 flex flex-col justify-between group rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[#E8450F]/30"
                tabIndex={0}
                role="button"
                aria-label={`Rate card ${rc.name}, base tariff ${rc.currency || 'SAR'} ${rc.base_price}`}
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
                      #{rc.id.slice(0, 8).toUpperCase()}
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
                    {rc.customerId ? (
                      <><Building2 className="w-3 h-3 text-slate-400" /> {rc.customer?.name || 'Customer'}</>
                    ) : (
                      <><Globe2 className="w-3 h-3 text-[#E8450F]" /> All customers</>
                    )}
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
                  <span className="text-[10px] text-slate-500 font-medium">Base Tariff Rate:</span>
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

        {/* Tariff Market Benchmark Modal */}
        <Dialog open={showTariffModal} onOpenChange={setShowTariffModal}>
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
                  <div className="font-bold text-indigo-900 dark:text-indigo-300">Average Freight Tariff</div>
                  <div className="text-[10px] text-indigo-700 dark:text-indigo-400">Mean base rate across active corridors</div>
                </div>
                <span className="font-mono font-extrabold text-indigo-700 dark:text-indigo-300 text-sm">SAR {kpis.avgPrice.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <div>
                  <div className="font-bold text-slate-900 dark:text-slate-100">Active Rate Contracts</div>
                  <div className="text-[10px] text-slate-400">Total tariff agreements in effect</div>
                </div>
                <Badge className="bg-[#E8450F] text-white font-mono font-bold text-xs">{kpis.activeCount} Active</Badge>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-bold border-slate-200"
                onClick={() => setShowTariffModal(false)}
              >
                Close Benchmark Summary
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
