import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MapPin, Plus, Search, RotateCw, Edit2, Trash2, MoreVertical,
  AlertTriangle, Filter,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import KpiCard from '@/components/ui/KpiCard';
import ConfirmModal from '@/components/ui/ConfirmModal';
import LocationFormDialog from '@/components/locations/LocationFormDialog';
import { RouteLine, CheckBadge } from '@/components/ui/kpi-icons';
import { locationService, Location } from '@/services/locationService';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

/** Rate cards quoting this place, on either end of a lane. */
const rateCardUses = (l: Location) =>
  (l._count?.originRateCards ?? 0) + (l._count?.destinationRateCards ?? 0);

const tripUses = (l: Location) => l._count?.tripStops ?? 0;

/**
 * The shared list of places lanes are priced between.
 *
 * This page exists because places could only ever be created inline from a
 * dropdown — so nobody could see the whole list, fix a misspelling, fill in a
 * missing address, or retire an entry somebody typed by accident. Those
 * mistakes are invisible at the point of creation and permanent without this.
 *
 * The two things it makes answerable: which places are actually used (usage
 * counts), and which are incomplete or abandoned (no address, no coordinates,
 * zero uses).
 */
export default function LocationListPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'unused' | 'incomplete'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Location | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: response, isLoading, isError, error } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationService.getAll(),
  });

  const locations = response?.data || [];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['locations'] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const filteredData = useMemo(() => {
    const term = search.toLowerCase();
    return locations.filter((l) => {
      const matchesSearch =
        l.name.toLowerCase().includes(term) ||
        (l.address || '').toLowerCase().includes(term);

      const matchesFilter =
        filter === 'all' ? true :
        filter === 'unused' ? rateCardUses(l) === 0 && tripUses(l) === 0 :
        !l.address || l.lat == null;

      return matchesSearch && matchesFilter;
    });
  }, [locations, search, filter]);

  const kpis = useMemo(() => {
    const total = locations.length;
    const unused = locations.filter((l) => rateCardUses(l) === 0 && tripUses(l) === 0).length;
    const noAddress = locations.filter((l) => !l.address).length;
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
      setDeleteTarget(null);
    } catch (e: any) {
      // The API refuses to delete a place a live rate card still prices, and
      // says how many. Surfacing that verbatim beats a generic failure.
      setDeleteError(
        e.response?.data?.error?.message || 'Could not delete this location.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    {
      header: 'Location',
      accessor: (row: Location) => (
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-[#E8450F]" />
            <span className="font-extrabold text-slate-900 dark:text-slate-100 text-xs truncate">
              {row.name}
            </span>
            {!row.is_active && (
              <Badge variant="outline" className="text-[9px] font-bold uppercase text-slate-500 shrink-0">
                Inactive
              </Badge>
            )}
          </div>
          <div className="text-[11px] text-slate-500 truncate mt-0.5 pl-5">
            {row.address || <span className="italic text-amber-600">No address</span>}
          </div>
        </div>
      ),
    },
    {
      header: 'Coordinates',
      accessor: (row: Location) =>
        row.lat != null && row.lng != null ? (
          <span className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
            {row.lat.toFixed(4)}, {row.lng.toFixed(4)}
          </span>
        ) : (
          <span className="text-[11px] italic text-slate-400">Not set</span>
        ),
    },
    {
      header: 'Used by',
      accessor: (row: Location) => {
        const rates = rateCardUses(row);
        const trips = tripUses(row);
        if (rates === 0 && trips === 0) {
          return <span className="text-[11px] italic text-slate-400">Nothing yet</span>;
        }
        return (
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
            {rates > 0 && (
              <span className="text-indigo-700 dark:text-indigo-300">
                {rates} rate{rates === 1 ? '' : 's'}
              </span>
            )}
            {rates > 0 && trips > 0 && <span className="text-slate-300">•</span>}
            {trips > 0 && (
              <span className="text-slate-600 dark:text-slate-400">
                {trips} stop{trips === 1 ? '' : 's'}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: 'Actions',
      accessor: (row: Location) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-xl p-1.5">
            <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
              Location Actions
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => setEditTarget(row)}
              className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md"
            >
              <Edit2 className="w-3.5 h-3.5 mr-2 text-indigo-600" /> Edit / rename
            </DropdownMenuItem>
            <DropdownMenuSeparator className="my-1" />
            <DropdownMenuItem
              onClick={() => { setDeleteError(null); setDeleteTarget(row); }}
              className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md text-rose-600 focus:bg-rose-50"
            >
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <DashboardLayout active="Locations" title="Locations">
      <div className="px-4 sm:px-6 pb-6 h-full flex flex-col animate-fade-in gap-5 max-w-[1400px] mx-auto w-full">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1">
          <div className="flex items-center gap-3">
            <MapPin className="w-6 h-6 text-orange-500 dark:text-orange-400 shrink-0" />
            <div className="flex flex-col">
              <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Locations
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                The places lanes are priced between, and that trip stops sit inside.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              size="sm"
              onClick={() => setIsAddOpen(true)}
              className="h-9 gap-1.5 text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold shadow-xs rounded-md px-4"
            >
              <Plus className="w-4 h-4" /> Add Location
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-9 w-9 p-0 text-slate-600 border-slate-200 bg-white hover:bg-slate-50 shadow-2xs"
              title="Refresh"
            >
              <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* KPIs — all derived from the loaded rows */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 shrink-0">
          <KpiCard
            title="LOCATIONS"
            value={kpis.total}
            variant="brand"
            trend="neutral"
            trendValue={`${kpis.priced} on a rate`}
            description="Places available to pick"
            icon={RouteLine}
          />
          <KpiCard
            title="PRICED"
            value={kpis.priced}
            variant="emerald"
            trend="neutral"
            trendValue={`${kpis.total - kpis.priced} not on any rate`}
            description="Used by at least one rate card"
            icon={CheckBadge}
            completionGauge={{
              percentage: kpis.total > 0 ? Math.round((kpis.priced / kpis.total) * 100) : 0,
              label: 'Share on a rate card',
              subtext: `${kpis.priced} of ${kpis.total}`,
            }}
          />
          <KpiCard
            title="MISSING ADDRESS"
            value={kpis.noAddress}
            variant="amber"
            trend="neutral"
            trendValue={kpis.noAddress > 0 ? 'Drivers see no address' : 'All complete'}
            description="Add one so stops inherit it"
            icon={RouteLine}
            onClick={() => setFilter('incomplete')}
          />
          <KpiCard
            title="UNUSED"
            value={kpis.unused}
            variant="blue"
            trend="neutral"
            trendValue={kpis.unused > 0 ? 'Check for typos' : 'Nothing stale'}
            description="No rate card, no trip stop"
            icon={RouteLine}
            onClick={() => setFilter('unused')}
          />
        </div>

        {/* Places with no address hand the driver a pin and nothing else */}
        {kpis.noAddress > 0 && (
          <div className="shrink-0 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold text-amber-900 dark:text-amber-200">
                {kpis.noAddress} location{kpis.noAddress === 1 ? ' has' : 's have'} no address
              </p>
              <p className="text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                A trip stop defaulting to one of these gives the driver coordinates and nothing
                to read. Open each and add the address.
              </p>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-white dark:bg-slate-900 rounded-xl p-2.5 shadow-2xs border border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between gap-3 overflow-x-auto">
            <div className="flex items-center gap-3 shrink-0">
              <div className="relative w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  placeholder="Search name or address..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 text-xs pl-8 rounded-lg font-medium"
                />
              </div>

              <Select value={filter} onValueChange={(val: any) => setFilter(val)}>
                <SelectTrigger className="h-9 px-3 w-48 shrink-0 border-slate-200 bg-white rounded-lg text-xs font-semibold text-slate-800 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <SelectValue placeholder="Show" />
                  </div>
                </SelectTrigger>
                <SelectContent align="start" className="w-52 p-1.5 rounded-xl">
                  <SelectGroup>
                    <SelectLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                      Show
                    </SelectLabel>
                    <SelectItem value="all" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">All locations</SelectItem>
                    <SelectItem value="unused" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">Unused only</SelectItem>
                    <SelectItem value="incomplete" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">Missing address or pin</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="text-xs font-semibold text-slate-500 shrink-0 ml-auto">
              <span className="font-extrabold text-slate-900 dark:text-slate-100">{filteredData.length}</span>{' '}
              location{filteredData.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 min-h-0 flex flex-col">
          <DataTable
            title={
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-500" />
                <span>Locations</span>
              </span>
            }
            columns={columns}
            data={filteredData}
            compact={true}
            enableSelection={false}
            isLoading={isLoading}
            isError={isError}
            errorMessage={(error as Error)?.message || 'Failed to load locations.'}
            searchPlaceholder="Search locations..."
            onSearchChange={setSearch}
            onRowClick={(row) => setEditTarget(row)}
          />
        </div>

        <LocationFormDialog isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
        <LocationFormDialog
          isOpen={!!editTarget}
          location={editTarget}
          onClose={() => setEditTarget(null)}
        />

        <ConfirmModal
          isOpen={!!deleteTarget}
          onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
          title="Delete location"
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

      </div>
    </DashboardLayout>
  );
}
