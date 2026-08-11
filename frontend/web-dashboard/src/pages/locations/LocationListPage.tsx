import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MapPin, Plus, RotateCw, Edit2, Trash2, MoreVertical,
  AlertTriangle, Filter, Download, FileSpreadsheet, FileText,
  Building2, Navigation, Layers, ChevronDown, X,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable, { BulkAction } from '@/components/ui/DataTable';
import KpiCard from '@/components/ui/KpiCard';
import ConfirmModal from '@/components/ui/ConfirmModal';
import LocationFormDialog from '@/components/locations/LocationFormDialog';
import { RouteLine, CheckBadge, ClockIcon } from '@/components/ui/kpi-icons';
import { locationService, Location } from '@/services/locationService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { exportExcelTable, exportPDFTable } from '@/utils/exportUtils';
import { matchesSearch } from '@/lib/search';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Rate cards quoting this place, on either end of a lane. */
const rateCardUses = (l: Location) =>
  (l._count?.originRateCards ?? 0) + (l._count?.destinationRateCards ?? 0);

const tripUses = (l: Location) => l._count?.tripStops ?? 0;

const LOCATION_EXPORT_HEADERS = [
  'Ref ID', 'Location Name', 'Address', 'Latitude', 'Longitude', 'Status', 'Rate Cards Count', 'Trip Stops Count'
];

const locationsToExportRows = (locs: Location[]) => locs.map((l) => [
  `LOC-${l.id.slice(0, 6).toUpperCase()}`,
  l.name,
  l.address || 'No Address Provided',
  l.lat != null ? l.lat.toFixed(6) : '',
  l.lng != null ? l.lng.toFixed(6) : '',
  l.is_active ? 'Active' : 'Inactive',
  rateCardUses(l),
  tripUses(l),
]);

export default function LocationListPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'priced' | 'unused' | 'incomplete' | 'active' | 'inactive'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Location | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectionResetKey, setSelectionResetKey] = useState(0);
  const [pageSize, setPageSize] = useState(25);

  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<Location[] | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const { data: response, isLoading, isError, error } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationService.getAll(),
  });

  const locations = response?.data || [];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['locations'] });
    setSelectionResetKey((prev) => prev + 1);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const filteredData = useMemo(() => {
    return locations.filter((l) => {
      const refId = `loc-${l.id.slice(0, 6)}`;
      const matchesTerm = matchesSearch(search, [l.name, l.address, refId]);

      let matchesFilter = true;
      if (filter === 'priced') matchesFilter = rateCardUses(l) > 0;
      else if (filter === 'unused') matchesFilter = rateCardUses(l) === 0 && tripUses(l) === 0;
      else if (filter === 'incomplete') matchesFilter = !l.address || l.lat == null;
      else if (filter === 'active') matchesFilter = l.is_active === true;
      else if (filter === 'inactive') matchesFilter = l.is_active === false;

      return matchesTerm && matchesFilter;
    });
  }, [locations, search, filter]);

  const kpis = useMemo(() => {
    const total = locations.length;
    const unused = locations.filter((l) => rateCardUses(l) === 0 && tripUses(l) === 0).length;
    const noAddress = locations.filter((l) => !l.address || l.lat == null).length;
    const priced = locations.filter((l) => rateCardUses(l) > 0).length;
    return { total, unused, noAddress, priced };
  }, [locations]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await locationService.delete(deleteTarget.id);
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      setSelectionResetKey((prev) => prev + 1);
      setDeleteTarget(null);
    } catch (e: any) {
      setDeleteError(
        e.response?.data?.error?.message || 'Could not delete this location.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!bulkDeleteTargets || bulkDeleteTargets.length === 0) return;
    setIsBulkDeleting(true);

    for (const target of bulkDeleteTargets) {
      try {
        await locationService.delete(target.id);
      } catch {
        // Silently skip locked locations
      }
    }

    queryClient.invalidateQueries({ queryKey: ['locations'] });
    setSelectionResetKey((prev) => prev + 1);
    setIsBulkDeleting(false);
    setBulkDeleteTargets(null);
  };

  const handleExportLocations = (dataToExport: Location[], filename = 'mercon_locations_registry') => {
    const rows = locationsToExportRows(dataToExport);
    exportExcelTable(filename, LOCATION_EXPORT_HEADERS, rows, 'Locations');
  };

  const handleExportPDFLocations = (dataToExport: Location[], filename = 'mercon_locations_registry') => {
    const rows = locationsToExportRows(dataToExport);
    exportPDFTable('MERCON Logistics - Locations Registry', LOCATION_EXPORT_HEADERS, rows, filename);
  };

  const bulkActions: BulkAction<Location>[] = [
    {
      label: 'Export Excel',
      icon: <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />,
      variant: 'secondary',
      onClick: (selectedRows) => handleExportLocations(selectedRows, 'selected_locations'),
    },
    {
      label: 'Export PDF',
      icon: <FileText className="w-3.5 h-3.5 text-rose-600" />,
      variant: 'secondary',
      onClick: (selectedRows) => handleExportPDFLocations(selectedRows, 'selected_locations'),
    },
    {
      label: 'Delete Selected',
      icon: <Trash2 className="w-3.5 h-3.5" />,
      variant: 'danger',
      onClick: (selectedRows) => setBulkDeleteTargets(selectedRows),
    },
  ];

  const columns = [
    {
      header: 'Location Ref ID',
      className: 'whitespace-nowrap',
      accessor: (row: Location) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs font-bold text-[#E8450F]">
            LOC-{row.id.slice(0, 6).toUpperCase()}
          </span>
        </div>
      ),
    },
    {
      header: 'Location Name',
      className: 'whitespace-nowrap min-w-[200px]',
      accessor: (row: Location) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-900/50 flex items-center justify-center shrink-0">
            <MapPin className="w-3.5 h-3.5 text-[#E8450F]" />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate" title={row.name}>
                {row.name}
              </span>
              {!row.is_active && (
                <Badge variant="outline" className="text-[9px] font-extrabold uppercase text-slate-500 bg-slate-100 dark:bg-slate-800 shrink-0">
                  Inactive
                </Badge>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: 'Street Address',
      className: 'min-w-[240px]',
      accessor: (row: Location) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {row.address ? (
            <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate" title={row.address}>
              {row.address}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-900/40">
              <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />
              No address provided
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Coordinates',
      className: 'whitespace-nowrap',
      accessor: (row: Location) =>
        row.lat != null && row.lng != null ? (
          <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md border border-slate-200/80 dark:border-slate-700">
            <Navigation className="w-3 h-3 text-indigo-500 shrink-0" />
            <span>{row.lat.toFixed(4)}, {row.lng.toFixed(4)}</span>
          </div>
        ) : (
          <span className="text-xs italic text-slate-400 font-medium">Unmapped coordinates</span>
        ),
    },
    {
      header: 'Usage & Activity',
      className: 'whitespace-nowrap',
      accessor: (row: Location) => {
        const rates = rateCardUses(row);
        const trips = tripUses(row);
        if (rates === 0 && trips === 0) {
          return (
            <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-200 dark:border-slate-700 text-[10px] font-semibold">
              Unlinked (0 uses)
            </Badge>
          );
        }
        return (
          <div className="flex items-center gap-1.5">
            {rates > 0 && (
              <Badge className="bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800 font-bold text-[11px] px-2 py-0.5">
                {rates} Rate Card{rates === 1 ? '' : 's'}
              </Badge>
            )}
            {trips > 0 && (
              <Badge className="bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800 font-bold text-[11px] px-2 py-0.5">
                {trips} Trip Stop{trips === 1 ? '' : 's'}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      header: 'Status',
      className: 'whitespace-nowrap',
      accessor: (row: Location) => (
        row.is_active ? (
          <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800 font-bold text-xs px-2.5 py-0.5 flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 font-bold text-xs px-2.5 py-0.5 flex items-center gap-1.5 w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Inactive
          </Badge>
        )
      ),
    },
    {
      header: 'Actions',
      className: 'whitespace-nowrap text-right',
      headerClassName: 'text-right',
      accessor: (row: Location) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditTarget(row)}
            className="h-8 w-8 p-0 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
            title="Edit location"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5 shadow-lg border border-slate-200 bg-white">
              <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                Location Options
              </DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setEditTarget(row)}
                className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md"
              >
                <Edit2 className="w-3.5 h-3.5 mr-2 text-indigo-600" /> Edit / Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuItem
                onClick={() => { setDeleteError(null); setDeleteTarget(row); }}
                className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md text-rose-600 focus:bg-rose-50"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Location
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout active="Locations" title="Locations">
      <div className="px-4 sm:px-6 pb-6 h-full flex flex-col animate-fade-in gap-5 max-w-[1400px] mx-auto w-full">

        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-900/50">
              <MapPin className="w-6 h-6 text-[#E8450F] shrink-0" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Locations
                </h1>
                <Badge className="bg-orange-50 dark:bg-orange-950/50 text-[#E8450F] border-orange-200/80 dark:border-orange-900/50 font-bold text-xs px-2.5 py-0.5">
                  Master Data Module
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                The physical & logistical nodes rate cards pricing and trip stops sit inside.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-bold border-slate-200 bg-white text-slate-700 shadow-2xs hover:bg-slate-50">
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Export</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl p-1.5 shadow-lg border border-slate-200 bg-white">
                <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                  Export Registry
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => handleExportLocations(filteredData, 'locations_registry')}
                  className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-2 text-emerald-600" /> Export Excel / CSV
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleExportPDFLocations(filteredData, 'locations_registry')}
                  className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md"
                >
                  <FileText className="w-3.5 h-3.5 mr-2 text-rose-600" /> Export PDF Document
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              size="sm"
              onClick={() => setIsAddOpen(true)}
              className="h-9 gap-1.5 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold shadow-xs rounded-lg px-4"
            >
              <Plus className="w-4 h-4" /> Add Location
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-9 w-9 p-0 text-slate-600 border-slate-200 bg-white hover:bg-slate-50 shadow-2xs rounded-lg"
              title="Refresh Locations Data"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Instrument-Panel KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 shrink-0">
          <KpiCard
            title="TOTAL LOCATIONS"
            value={
              <span>
                {kpis.total}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Places</span>
              </span>
            }
            variant="brand"
            description="All logistics nodes & stops"
            icon={RouteLine}
            semiCircleGauge={{
              segments: [
                { label: "Priced", count: kpis.priced, color: "#16A34A" },
                { label: "Unused", count: kpis.unused, color: "#2563EB" },
                { label: "Incomplete", count: kpis.noAddress, color: "#D97706" },
              ]
            }}
            isActive={filter === 'all'}
            onClick={() => setFilter('all')}
          />
          <KpiCard
            title="PRICED LOCATIONS"
            value={
              <span>
                {kpis.priced}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Priced</span>
              </span>
            }
            variant="emerald"
            description="Linked to active rate cards"
            icon={CheckBadge}
            completionGauge={{
              percentage: kpis.total > 0 ? Math.round((kpis.priced / kpis.total) * 100) : 0,
              label: "Rate coverage",
              subtext: `${kpis.priced} of ${kpis.total} places`,
            }}
            isActive={filter === 'priced'}
            onClick={() => setFilter(prev => prev === 'priced' ? 'all' : 'priced')}
          />
          <KpiCard
            title="MISSING ADDRESS / PIN"
            value={
              <span>
                {kpis.noAddress}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Incomplete</span>
              </span>
            }
            variant="amber"
            description="Locations lacking address or coords"
            icon={ClockIcon}
            pipelineStages={[
              { name: "Incomplete", count: kpis.noAddress, color: "bg-amber-500" },
              { name: "Complete", count: Math.max(0, kpis.total - kpis.noAddress), color: "bg-emerald-500" },
            ]}
            isActive={filter === 'incomplete'}
            onClick={() => setFilter(prev => prev === 'incomplete' ? 'all' : 'incomplete')}
          />
          <KpiCard
            title="UNUSED LOCATIONS"
            value={
              <span>
                {kpis.unused}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Unused</span>
              </span>
            }
            variant="blue"
            description="No rate card or trip stops"
            icon={RouteLine}
            livePulseTrack={{
              statusText: kpis.unused > 0 ? "Needs Review" : "Clean Registry",
              subText: kpis.unused > 0 ? `${kpis.unused} unlinked places` : "0 unlinked",
            }}
            isActive={filter === 'unused'}
            onClick={() => setFilter(prev => prev === 'unused' ? 'all' : 'unused')}
          />
        </div>

        {/* Active Filter Banner */}
        {filter !== 'all' && (
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/40 px-3.5 py-2 rounded-xl flex items-center justify-between gap-3 text-xs font-semibold text-orange-900 dark:text-orange-200 animate-fade-in shrink-0">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-[#E8450F] shrink-0" />
              <span>
                Filtered view: <strong className="underline decoration-[#E8450F] font-bold text-slate-900 dark:text-slate-100">
                  {filter === 'priced' ? 'Priced Locations Only' :
                   filter === 'unused' ? 'Unused Locations Only' :
                   filter === 'incomplete' ? 'Missing Address or Coords' :
                   filter === 'active' ? 'Active Locations Only' : 'Inactive Locations Only'}
                </strong> ({filteredData.length} location{filteredData.length === 1 ? '' : 's'})
              </span>
            </div>
            <button
              onClick={() => setFilter('all')}
              className="px-2.5 py-1 rounded-md bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-800 text-[11px] font-bold text-[#E8450F] hover:bg-orange-100 dark:hover:bg-orange-950 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5"
            >
              <span>Show All Locations</span>
              <X className="w-3 h-3 shrink-0" />
            </button>
          </div>
        )}

        {/* Missing Address Banner */}
        {kpis.noAddress > 0 && filter === 'all' && (
          <div className="shrink-0 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-amber-900 dark:text-amber-200">
                {kpis.noAddress} location{kpis.noAddress === 1 ? ' has' : 's have'} no street address or geographic coordinates
              </p>
              <p className="text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                Trip stops assigned to incomplete locations give drivers empty details. Click edit on any flagged row to supply complete details.
              </p>
            </div>
          </div>
        )}

        {/* Full Ledger Data Table */}
        <div className="w-full flex-1 flex flex-col min-h-0">
          <DataTable
            title={
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span>Locations Ledger</span>
              </span>
            }
            data={filteredData}
            columns={columns}
            enableSelection={true}
            selectionResetKey={selectionResetKey}
            compact={true}
            isLoading={isLoading}
            isError={isError}
            errorMessage={(error as Error)?.message || 'Failed to load locations.'}
            searchPlaceholder="Search location name, address, ref ID..."
            searchValue={search}
            onSearchChange={setSearch}
            filterElement={
              <div className="flex items-center gap-2.5">
                <Select value={filter} onValueChange={(val: any) => setFilter(val)}>
                  <SelectTrigger className="h-9 px-3 w-auto min-w-[200px] whitespace-nowrap shrink-0 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold">
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <Filter className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                      <SelectValue placeholder="All Locations" className="whitespace-nowrap" />
                    </div>
                  </SelectTrigger>
                  <SelectContent align="start" className="w-64 p-1.5 shadow-lg border border-slate-200 bg-white rounded-xl">
                    <SelectGroup>
                      <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                        Filter View
                      </SelectLabel>
                      <SelectItem value="all" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                        <span className="flex items-center gap-2 font-medium text-slate-700">
                          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                          All Locations
                        </span>
                      </SelectItem>
                      <SelectItem value="priced" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                        <span className="flex items-center gap-2 font-medium text-indigo-700">
                          <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                          Priced Locations Only
                        </span>
                      </SelectItem>
                      <SelectItem value="unused" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                        <span className="flex items-center gap-2 font-medium text-blue-700">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          Unused / Unlinked Only
                        </span>
                      </SelectItem>
                      <SelectItem value="incomplete" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                        <span className="flex items-center gap-2 font-medium text-amber-700">
                          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                          Missing Address / Coords
                        </span>
                      </SelectItem>
                    </SelectGroup>
                    <SelectSeparator className="my-1 border-slate-100" />
                    <SelectGroup>
                      <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                        Status
                      </SelectLabel>
                      <SelectItem value="active" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                        <span className="flex items-center gap-2 font-semibold text-emerald-700">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          Active Locations
                        </span>
                      </SelectItem>
                      <SelectItem value="inactive" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
                        <span className="flex items-center gap-2 font-medium text-slate-600">
                          <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                          Inactive Locations
                        </span>
                      </SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
            }
            actionsElement={
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportLocations(filteredData, 'locations_ledger')}
                className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs"
              >
                <Download className="h-3.5 w-3.5 text-slate-500" />
                <span>Export CSV</span>
              </Button>
            }
            bulkActions={bulkActions}
            pageSize={pageSize}
            onPageSizeChange={(size) => setPageSize(size)}
            onRowClick={(row) => setEditTarget(row)}
            emptyTitle="No Locations Found"
            emptyMessage="There are no logistics locations matching your current search term or filter settings."
          />
        </div>

        {/* Dialogs & Modals */}
        <LocationFormDialog isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
        <LocationFormDialog
          isOpen={!!editTarget}
          location={editTarget}
          onClose={() => setEditTarget(null)}
        />

        <ConfirmModal
          isOpen={!!deleteTarget}
          onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
          title="Delete Location"
          message={
            deleteError
              ? deleteError
              : deleteTarget && tripUses(deleteTarget) > 0
              ? `"${deleteTarget.name}" is on ${tripUses(deleteTarget)} trip stop${tripUses(deleteTarget) === 1 ? '' : 's'}. Those trips keep their own address and coordinates, but the place disappears from the picker.`
              : `Delete "${deleteTarget?.name}"? It disappears from the location picker. Rate cards still using it will block this.`
          }
          confirmLabel={deleteError ? 'Close' : 'Yes, delete'}
          isDestructive={!deleteError}
          isLoading={isDeleting}
          onConfirm={() => {
            if (deleteError) { setDeleteTarget(null); setDeleteError(null); return; }
            handleDelete();
          }}
        />

        <ConfirmModal
          isOpen={!!bulkDeleteTargets}
          onClose={() => setBulkDeleteTargets(null)}
          title="Delete Selected Locations"
          message={`Are you sure you want to delete ${bulkDeleteTargets?.length ?? 0} selected locations? Locations tied to active rate cards will be preserved automatically.`}
          confirmLabel="Yes, delete selected"
          isDestructive={true}
          isLoading={isBulkDeleting}
          onConfirm={handleBulkDelete}
        />

      </div>
    </DashboardLayout>
  );
}
