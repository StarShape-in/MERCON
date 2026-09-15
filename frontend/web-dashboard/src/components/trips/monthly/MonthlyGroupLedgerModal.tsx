import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Calendar,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  Search,
  X,
  ArrowRight,
  Trash2,
  MapPin,
  SlidersHorizontal,
  Lightbulb,
  ChevronDown,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

import type { TemplateGroup } from './MonthlyCompanyBoard';
import { tripService, type MonthlyBoardTrip } from '@/services/tripService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { formatDayHeading, formatMoney, formatTime, initialsOf, isUnassigned, formatLocationClean } from './monthlyBoardUtils';

const STATUS_LIST = [
  'Scheduled',
  'Loading',
  'InTransit',
  'Completed',
  'Invoiced',
  'Cancelled',
];

const CORE_CATEGORIES = ['Single Trip', 'Round Trip', '10 Hours Duty', '12 Hours Duty'];

interface MonthlyGroupLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: TemplateGroup | null;
  companyName: string;
  companyLogo?: string | null;
  allCompanyTrips?: MonthlyBoardTrip[];
  onRefresh?: () => void;
}

export default function MonthlyGroupLedgerModal({
  isOpen,
  onClose,
  group,
  companyName,
  companyLogo,
  allCompanyTrips = [],
  onRefresh,
}: MonthlyGroupLedgerModalProps) {
  const queryClient = useQueryClient();

  // Search, Filter & Sort state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Unassigned' | 'Completed' | 'Scheduled' | 'InTransit'>('All');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'latest' | 'oldest' | 'driver' | 'vehicle'>('latest');
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([]);

  useEffect(() => {
    if (group?.lineType) {
      setCategoryFilter(group.lineType);
    } else {
      setCategoryFilter('ALL');
    }
  }, [group?.key, group?.lineType]);

  const availableCategories = useMemo(() => {
    const set = new Set<string>(CORE_CATEGORIES);
    if (group?.lineType) set.add(group.lineType);
    if (allCompanyTrips) {
      allCompanyTrips.forEach((t) => {
        const cat = t.rate_category || t.billing_type;
        if (cat) set.add(cat);
      });
    }
    return Array.from(set);
  }, [group, allCompanyTrips]);

  // Bulk assignment staging state
  const [bulkDriverId, setBulkDriverId] = useState<string>('');
  const [bulkVehicleId, setBulkVehicleId] = useState<string>('');

  // Active inline popover trip tracking
  const [activeDriverTripId, setActiveDriverTripId] = useState<string | null>(null);
  const [activeVehicleTripId, setActiveVehicleTripId] = useState<string | null>(null);

  // Deletion confirmation state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [tripToDelete, setTripToDelete] = useState<string | null>(null);

  // Fetch all available drivers
  const { data: driversRes } = useQuery({
    queryKey: ['drivers-ledger-lookup'],
    queryFn: () => driverService.getAll({ per_page: 1000, mode: 'lookup' }),
    enabled: isOpen,
  });

  // Fetch all available vehicles
  const { data: vehiclesRes } = useQuery({
    queryKey: ['vehicles-ledger-lookup'],
    queryFn: () => vehicleService.getAll({ per_page: 1000, mode: 'lookup' }),
    enabled: isOpen,
  });

  const rawDrivers = driversRes?.data || [];
  const rawVehicles = vehiclesRes?.data || [];

  const driverOptions = useMemo<ComboboxOption[]>(() => {
    const opts: ComboboxOption[] = [
      { value: 'unassigned', label: '— Unassign Driver —', keywords: 'none unassign remove' },
    ];
    rawDrivers.forEach((d) => {
      const isNotAvailable = d.status && d.status !== 'Available' && d.status.toLowerCase() !== 'available';
      const statusTag = isNotAvailable ? (d.status === 'OnTrip' ? 'On Trip' : d.status === 'OffDuty' ? 'Off Duty' : d.status) : '';
      const phoneStr = (d as any).phone || d.phone_primary || '';
      const details = [phoneStr, statusTag].filter(Boolean).join(' · ');

      opts.push({
        value: d.id,
        label: details ? `${d.first_name} ${d.last_name} (${details})` : `${d.first_name} ${d.last_name}`,
        keywords: `${d.first_name} ${d.last_name} ${phoneStr} ${d.status || ''}`,
      });
    });
    return opts;
  }, [rawDrivers]);

  const vehicleOptions = useMemo<ComboboxOption[]>(() => {
    const opts: ComboboxOption[] = [
      { value: 'unassigned', label: '— Unassign Vehicle —', keywords: 'none unassign remove' },
    ];
    rawVehicles.forEach((v) => {
      const capTon = v.capacity_kg ? (v.capacity_kg / 1000).toFixed(0) + 'T' : '';
      const typeStr = (v as any).type || v.asset_type || 'Truck';
      const meta = [typeStr, capTon].filter(Boolean).join(' · ');

      opts.push({
        value: v.id,
        label: meta ? `${v.plate_number} (${meta})` : v.plate_number,
        keywords: `${v.plate_number} ${typeStr} ${capTon}`,
      });
    });
    return opts;
  }, [rawVehicles]);

  // Bulk / single assign mutation
  const assignMutation = useMutation({
    mutationFn: (payload: { trip_ids: string[]; driver_id?: string; vehicle_id?: string; status?: string; rate_category?: string }) =>
      tripService.bulkAssign(payload),
    onSuccess: (data, vars) => {
      toast.success(
        vars.trip_ids.length === 1
          ? 'Trip updated successfully'
          : `Updated ${vars.trip_ids.length} selected trip(s)`
      );
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trips', 'monthly-board'] });
      onRefresh?.();
      setBulkDriverId('');
      setBulkVehicleId('');
      setActiveDriverTripId(null);
      setActiveVehicleTripId(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to update trip assignments');
    },
  });

  // Delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => tripService.bulkDelete(ids),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trips', 'monthly-board'] });
      onRefresh?.();
      setSelectedTripIds([]);
      setIsDeleteConfirmOpen(false);
      setTripToDelete(null);

      if (res?.skippedCount > 0) {
        if (res.deletedCount > 0) {
          toast.warning(`Deleted ${res.deletedCount} trip(s). ${res.skippedCount} trip(s) were protected from deletion (invoiced/settled).`);
        } else {
          toast.error(`Cannot delete trip(s): selected trip(s) are already invoiced or completed.`);
        }
      } else {
        toast.success(
          res.deletedCount === 1
            ? 'Trip deleted successfully'
            : `Deleted ${res.deletedCount} trip(s)`
        );
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to delete trips');
    },
  });

  const baseTrips = useMemo(() => {
    if (allCompanyTrips && allCompanyTrips.length > 0) {
      if (group?.origin && group?.destination) {
        const routeTrips = allCompanyTrips.filter((t) => {
          const o = formatLocationClean(t.origin);
          const d = formatLocationClean(t.destination);
          return o === group.origin && d === group.destination;
        });
        return routeTrips.length > 0 ? routeTrips : allCompanyTrips;
      }
      return allCompanyTrips;
    }
    return group?.trips || [];
  }, [allCompanyTrips, group]);

  const normalizeCat = (c: string) => (c || '').toLowerCase().replace(/[\s_-]+/g, '');

  const allTrips = useMemo(() => {
    if (categoryFilter === 'ALL') return baseTrips;
    const target = normalizeCat(categoryFilter);
    return baseTrips.filter((trip) => {
      const tripCat = trip.rate_category || trip.billing_type || 'Single Trip';
      const norm = normalizeCat(tripCat);
      return (
        norm === target ||
        (target.includes('10hour') && norm.includes('10hour')) ||
        (target.includes('12hour') && norm.includes('12hour')) ||
        (target.includes('round') && norm.includes('round')) ||
        (target.includes('single') && norm.includes('single'))
      );
    });
  }, [baseTrips, categoryFilter]);

  // Filtered & Sorted trips
  const filteredTrips = useMemo(() => {
    const list = allTrips.filter((trip) => {
      // Status filter
      if (statusFilter === 'Unassigned' && !isUnassigned(trip)) return false;
      if (statusFilter === 'Completed' && trip.status !== 'Completed' && trip.status !== 'Invoiced') return false;
      if (statusFilter === 'Scheduled' && trip.status !== 'Scheduled' && trip.status !== 'Draft') return false;
      if (statusFilter === 'InTransit' && trip.status !== 'InTransit' && trip.status !== 'Loading') return false;

      // Search filter
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const refMatch = (trip.ref_id || '').toLowerCase().includes(q);
        const driverMatch = (trip.driver?.name || '').toLowerCase().includes(q);
        const vehicleMatch = (trip.vehicle?.plate_number || '').toLowerCase().includes(q);
        const dateMatch = (trip.date || '').toLowerCase().includes(q);
        if (!refMatch && !driverMatch && !vehicleMatch && !dateMatch) return false;
      }

      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'latest') {
        const dCompare = b.date.localeCompare(a.date);
        if (dCompare !== 0) return dCompare;
        return (b.planned_start || '').localeCompare(a.planned_start || '');
      }
      if (sortBy === 'oldest') {
        const dCompare = a.date.localeCompare(b.date);
        if (dCompare !== 0) return dCompare;
        return (a.planned_start || '').localeCompare(b.planned_start || '');
      }
      if (sortBy === 'driver') {
        return (a.driver?.name || 'zzz').localeCompare(b.driver?.name || 'zzz');
      }
      if (sortBy === 'vehicle') {
        return (a.vehicle?.plate_number || 'zzz').localeCompare(b.vehicle?.plate_number || 'zzz');
      }
      return 0;
    });
  }, [allTrips, statusFilter, search, sortBy]);

  const totalAmount = useMemo(() => {
    return allTrips.reduce((sum, t) => sum + (t.billing_amount ?? 0), 0);
  }, [allTrips]);

  const activeRateStr = useMemo(() => {
    if (allTrips.length > 0 && allTrips[0].billing_amount != null) {
      return formatMoney(allTrips[0].billing_amount, allTrips[0].currency);
    }
    return group?.rateStr;
  }, [allTrips, group?.rateStr]);

  const allVisibleIds = filteredTrips.map((t) => t.id);
  const isAllSelected = allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedTripIds.includes(id));
  const isSomeSelected = !isAllSelected && allVisibleIds.some((id) => selectedTripIds.includes(id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTripIds((prev) => prev.filter((id) => !allVisibleIds.includes(id)));
    } else {
      setSelectedTripIds((prev) => Array.from(new Set([...prev, ...allVisibleIds])));
    }
  };

  const handleToggleTrip = (id: string) => {
    setSelectedTripIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Handlers for single trip inline updates
  const handleSingleDriverChange = (tripId: string, newDriverId: string) => {
    assignMutation.mutate({
      trip_ids: [tripId],
      driver_id: newDriverId,
    });
  };

  const handleSingleVehicleChange = (tripId: string, newVehicleId: string) => {
    assignMutation.mutate({
      trip_ids: [tripId],
      vehicle_id: newVehicleId,
    });
  };

  const handleSingleStatusChange = (tripId: string, newStatus: string) => {
    assignMutation.mutate({
      trip_ids: [tripId],
      status: newStatus,
    });
  };

  const handleApplyBulkStatus = (val: string) => {
    if (!val || selectedTripIds.length === 0) return;
    assignMutation.mutate({
      trip_ids: selectedTripIds,
      status: val,
    });
  };

  const handleApplyBulkCategory = (val: string) => {
    if (!val || selectedTripIds.length === 0) return;
    assignMutation.mutate({
      trip_ids: selectedTripIds,
      rate_category: val,
    });
  };

  const handleGroupCategoryChange = (newCat: string) => {
    if (!newCat) return;
    const tripIdsToUpdate = allTrips.map((t) => t.id);
    if (tripIdsToUpdate.length > 0) {
      assignMutation.mutate({
        trip_ids: tripIdsToUpdate,
        rate_category: newCat,
      });
      setCategoryFilter(newCat);
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'invoiced') {
      return 'bg-emerald-50 text-emerald-600 border border-emerald-200/80 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-400';
    }
    if (s === 'intransit' || s === 'loading') {
      return 'bg-blue-50 text-blue-600 border border-blue-200/80 dark:bg-blue-950/40 dark:border-blue-800/60 dark:text-blue-400';
    }
    if (s === 'scheduled' || s === 'draft') {
      return 'bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300';
    }
    if (s === 'cancelled') {
      return 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-950/40 dark:border-rose-800/60 dark:text-rose-400';
    }
    return 'bg-slate-100 text-slate-600 border border-slate-200';
  };

  if (!group) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[96vw] max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-[24px] border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl [&>button]:right-6 [&>button]:top-6 [&>button]:text-slate-400 [&>button]:hover:text-slate-600">
        
        {/* ── 1. Top Header Area (Clean Light Design matching reference) ── */}
        <div className="p-6 sm:px-8 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4 shrink-0">
          
          {/* Left: Company Partner Logo, Title & Route */}
          <div className="flex items-center gap-4 min-w-0">
            {companyLogo ? (
              <img
                src={companyLogo}
                alt={companyName}
                className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-full object-contain p-1 border border-slate-200/80 dark:border-slate-800 shadow-sm bg-white"
              />
            ) : (
              <div className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded-full bg-blue-600 text-white font-black text-xl flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900">
                {initialsOf(companyName)}
              </div>
            )}

            <div className="min-w-0">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block mb-0.5">
                DELIVERY PARTNER
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-tight truncate">
                {companyName}
              </h2>
              
              <div className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-slate-100 mt-1 capitalize">
                <MapPin className="w-4 h-4 text-slate-700 dark:text-slate-300 stroke-[2.2] shrink-0" />
                <span>{formatLocationClean(group.origin)}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <MapPin className="w-4 h-4 text-slate-700 dark:text-slate-300 stroke-[2.2] shrink-0" />
                <span>{formatLocationClean(group.destination)}</span>
              </div>
              <span className="text-[11px] font-medium text-slate-400 block mt-0.5">
                Kingdom of Saudi Arabia
              </span>
            </div>
          </div>

          {/* Right: Total Amount & Per-Trip Rate with Feature Badges */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="text-right">
              <div className="flex items-center justify-end gap-2">
                <span className="text-2xl sm:text-3xl font-black text-emerald-500 dark:text-emerald-400 leading-none">
                  {formatMoney(totalAmount)}
                </span>
                {activeRateStr && activeRateStr !== '—' && (
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/40 whitespace-nowrap shadow-3xs">
                    ({activeRateStr} / trip)
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap justify-end">
              {/* Vehicle Class Badge */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs shadow-3xs">
                <Truck className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
                <span>{group.vehicleClass}</span>
              </div>

              {/* Interactive Line Type / Category Badge */}
              <Select
                value={categoryFilter !== 'ALL' ? categoryFilter : (group.lineType || '10 Hours Duty')}
                onValueChange={handleGroupCategoryChange}
              >
                <SelectTrigger className="h-7 px-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60 text-rose-600 dark:text-rose-400 font-bold text-xs shadow-3xs hover:bg-rose-100 dark:hover:bg-rose-900/50 cursor-pointer flex items-center gap-1.5 focus:ring-0">
                  <Clock className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                  <span className="uppercase">
                    {categoryFilter !== 'ALL'
                      ? categoryFilter.replace(/_/g, ' ')
                      : (group.lineType || 'Category').replace(/_/g, ' ')}
                  </span>
                </SelectTrigger>
                <SelectContent align="end" className="bg-white dark:bg-slate-900 z-50">
                  <SelectGroup>
                    <SelectLabel className="text-[10px] uppercase font-bold text-slate-400">
                      Change Category (All {allTrips.length} Trips)
                    </SelectLabel>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs font-semibold">
                        {cat.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* ── 2. Toolbar: Search Bar, Filter Chips, Category Select & Sort Select ── */}
        <div className="p-3.5 sm:px-8 bg-white dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          {/* Left / Center: Search Input + Status Filter Chips + Category Filter */}
          <div className="flex items-center flex-wrap gap-3 min-w-0">
            <div className="relative w-56 sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by trip ref, driver, vehicle, or plate..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 text-xs bg-slate-50/80 dark:bg-slate-900 rounded-xl border-slate-200 dark:border-slate-800 placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-[#FA634E]"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1">
              {(['All', 'Unassigned', 'Scheduled', 'InTransit', 'Completed'] as const).map((filterOpt) => {
                const isActive = statusFilter === filterOpt;
                return (
                  <button
                    key={filterOpt}
                    type="button"
                    onClick={() => setStatusFilter(filterOpt)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-[#FA634E] text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span>{filterOpt}</span>
                    {filterOpt === 'All' && (
                      <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-white/25 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      }`}>
                        {allTrips.length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Trip Category / Line Type Filter Dropdown */}
            <Select value={categoryFilter} onValueChange={(val) => setCategoryFilter(val)}>
              <SelectTrigger className="h-10 text-xs font-bold min-w-[145px] max-w-[190px] rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-3xs hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer">
                <Clock className="w-3.5 h-3.5 text-[#FA634E] shrink-0" />
                <span className="truncate">
                  {categoryFilter === 'ALL' ? 'All Categories' : categoryFilter.replace(/_/g, ' ')}
                </span>
              </SelectTrigger>
              <SelectContent align="start" className="bg-white dark:bg-slate-900 z-50">
                <SelectGroup>
                  <SelectLabel className="text-[10px] uppercase font-bold text-slate-400">Trip Category</SelectLabel>
                  <SelectItem value="ALL" className="text-xs font-semibold">
                    All Categories
                  </SelectItem>
                  {availableCategories.map((cat) => (
                    <SelectItem key={cat} value={cat} className="text-xs font-semibold">
                      {cat.replace(/_/g, ' ')}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {/* Right: Quick Selection Count / Sort dropdown */}
          <div className="flex items-center gap-3">
            {selectedTripIds.length > 0 && (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setTripToDelete(null);
                    setIsDeleteConfirmOpen(true);
                  }}
                  disabled={bulkDeleteMutation.isPending}
                  className="h-8 px-2.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-2xs cursor-pointer rounded-xl"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete ({selectedTripIds.length})</span>
                </Button>

                <button
                  type="button"
                  onClick={() => setSelectedTripIds([])}
                  className="text-xs font-bold text-[#FA634E] hover:underline cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
            )}

            {/* Sort Dropdown */}
            <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
              <SelectTrigger className="h-10 text-xs font-bold w-36 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 flex items-center gap-1.5 shadow-3xs">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" className="bg-white dark:bg-slate-900">
                <SelectItem value="latest" className="text-xs font-semibold">Latest First</SelectItem>
                <SelectItem value="oldest" className="text-xs font-semibold">Oldest First</SelectItem>
                <SelectItem value="driver" className="text-xs font-semibold">By Driver</SelectItem>
                <SelectItem value="vehicle" className="text-xs font-semibold">By Vehicle</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── 3. Sticky Bulk Actions Bar (When >= 1 trips selected) ── */}
        {selectedTripIds.length > 0 && (
          <div className="px-6 py-2.5 bg-[#FA634E]/10 dark:bg-[#FA634E]/15 border-b border-[#FA634E]/30 flex flex-wrap items-center justify-between gap-3 shrink-0 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-[#3E3C3D] dark:text-white bg-[#FA634E]/20 px-2.5 py-0.5 rounded-lg border border-[#FA634E]/30">
                {selectedTripIds.length} Selected
              </span>
              <span className="text-xs text-slate-700 dark:text-slate-200 font-semibold hidden sm:inline">
                Bulk assign to all selected dates:
              </span>
            </div>

            <div className="flex items-center flex-wrap gap-2">
              {/* Bulk Driver Selector */}
              <div className="w-48 sm:w-56">
                <Combobox
                  options={driverOptions}
                  value={bulkDriverId}
                  onChange={(val) => {
                    setBulkDriverId(val);
                    if (val) {
                      assignMutation.mutate({
                        trip_ids: selectedTripIds,
                        driver_id: val,
                      });
                    }
                  }}
                  placeholder="Set Driver for all..."
                  searchPlaceholder="Search drivers..."
                  className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-300 rounded-lg"
                />
              </div>

              {/* Bulk Vehicle Selector */}
              <div className="w-48 sm:w-56">
                <Combobox
                  options={vehicleOptions}
                  value={bulkVehicleId}
                  onChange={(val) => {
                    setBulkVehicleId(val);
                    if (val) {
                      assignMutation.mutate({
                        trip_ids: selectedTripIds,
                        vehicle_id: val,
                      });
                    }
                  }}
                  placeholder="Set Vehicle for all..."
                  searchPlaceholder="Search vehicles..."
                  className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-300 rounded-lg"
                />
              </div>

              {/* Bulk Category Selector */}
              <Select onValueChange={handleApplyBulkCategory}>
                <SelectTrigger className="h-8 w-36 text-xs bg-white dark:bg-slate-900 border-slate-300 text-[#3E3C3D] dark:text-white font-bold rounded-lg">
                  <SelectValue placeholder="Set Category..." />
                </SelectTrigger>
                <SelectContent align="end" className="bg-white dark:bg-slate-900 z-50">
                  <SelectGroup>
                    <SelectLabel className="text-[10px] uppercase font-bold text-slate-400">Change Category</SelectLabel>
                    {availableCategories.map((cat) => (
                      <SelectItem key={cat} value={cat} className="text-xs font-semibold">
                        {cat.replace(/_/g, ' ')}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              {/* Bulk Status Selector */}
              <Select onValueChange={handleApplyBulkStatus}>
                <SelectTrigger className="h-8 w-36 text-xs bg-white dark:bg-slate-900 border-slate-300 text-[#3E3C3D] dark:text-white font-bold rounded-lg">
                  <SelectValue placeholder="Set Status..." />
                </SelectTrigger>
                <SelectContent align="end" className="bg-white dark:bg-slate-900 z-50">
                  <SelectGroup>
                    <SelectLabel className="text-[10px] uppercase font-bold text-slate-400">Change Status</SelectLabel>
                    {STATUS_LIST.map((st) => (
                      <SelectItem key={st} value={st} className="text-xs font-semibold">
                        Set to {st}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              {/* Bulk Delete Button */}
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => {
                  setTripToDelete(null);
                  setIsDeleteConfirmOpen(true);
                }}
                disabled={bulkDeleteMutation.isPending}
                className="h-8 px-3 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1.5 shadow-2xs cursor-pointer rounded-lg"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedTripIds.length})</span>
              </Button>
            </div>
          </div>
        )}

        {/* ── 4. Main Ledger Table ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <Table>
            <TableHeader className="sticky top-0 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur z-10 shadow-xs border-y border-slate-100 dark:border-slate-800">
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-10 px-6 py-3">
                  <Checkbox
                    checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                    onCheckedChange={handleToggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 data-[state=checked]:bg-[#FA634E] data-[state=checked]:border-[#FA634E]"
                  />
                </TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 w-40">
                  DATE & TIME
                </TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 w-28">
                  TRIP REF
                </TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  ASSIGNED DRIVER
                </TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  ASSIGNED VEHICLE
                </TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 w-32">
                  STATUS
                </TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 text-right w-24">
                  AMOUNT
                </TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 text-center w-24">
                  ACTION
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredTrips.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-40 text-center text-xs text-slate-400 font-medium">
                    No trips match the selected filter criteria.
                  </TableCell>
                </TableRow>
              ) : (
                filteredTrips.map((trip) => {
                  const isSelected = selectedTripIds.includes(trip.id);
                  const isMissingResource = isUnassigned(trip);

                  return (
                    <TableRow
                      key={trip.id}
                      className={`transition-colors ${
                        isSelected
                          ? 'bg-[#FA634E]/5 dark:bg-[#FA634E]/10'
                          : isMissingResource
                          ? 'bg-amber-50/30 dark:bg-amber-950/10 hover:bg-amber-50/60'
                          : 'hover:bg-slate-50/80 dark:hover:bg-slate-900/50'
                      }`}
                    >
                      {/* Checkbox */}
                      <TableCell className="px-6 py-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleTrip(trip.id)}
                          className="h-4 w-4 rounded border-slate-300 data-[state=checked]:bg-[#FA634E] data-[state=checked]:border-[#FA634E]"
                        />
                      </TableCell>

                      {/* Date & Time */}
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2 font-bold text-xs text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatDayHeading(trip.date)}</span>
                          <span className="text-[11px] font-medium text-slate-400">
                            {formatTime(trip.planned_start)}
                          </span>
                        </div>
                      </TableCell>

                      {/* Trip Ref ID */}
                      <TableCell className="py-3">
                        <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-md shadow-3xs">
                          {trip.ref_id || 'TRP-NEW'}
                        </span>
                      </TableCell>

                      {/* Driver Column: Inline Combobox Popover */}
                      <TableCell className="py-3">
                        <Popover
                          open={activeDriverTripId === trip.id}
                          onOpenChange={(open) => setActiveDriverTripId(open ? trip.id : null)}
                        >
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="group flex items-center gap-2 text-xs font-semibold text-left max-w-[200px] truncate p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Click to change driver"
                            >
                              {trip.driver ? (
                                <>
                                  {trip.driver.avatar_url ? (
                                    <img
                                      src={trip.driver.avatar_url}
                                      alt={trip.driver.name}
                                      className="h-5 w-5 rounded-full object-cover shrink-0"
                                    />
                                  ) : (
                                    <span className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-extrabold text-[9px] flex items-center justify-center shrink-0">
                                      {initialsOf(trip.driver.name)}
                                    </span>
                                  )}
                                  <span className="truncate text-slate-800 dark:text-slate-200 group-hover:text-[#FA634E] font-bold">
                                    {trip.driver.name}
                                  </span>
                                </>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-bold text-[11px] bg-amber-50 dark:bg-amber-950/50 border border-amber-200 px-2 py-0.5 rounded-md">
                                  <AlertCircle className="w-3 h-3 text-amber-600" />
                                  No Driver
                                </span>
                              )}
                              <ChevronDown className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 shrink-0 ml-auto" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-72 p-2 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-50">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-1.5">
                              Assign Driver for {trip.ref_id || 'Trip'}
                            </div>
                            <Combobox
                              options={driverOptions}
                              value={trip.driver?.id || 'unassigned'}
                              onChange={(val) => {
                                handleSingleDriverChange(trip.id, val);
                              }}
                              placeholder="Select driver..."
                              searchPlaceholder="Search driver name, phone..."
                              className="h-8 text-xs"
                            />
                          </PopoverContent>
                        </Popover>
                      </TableCell>

                      {/* Vehicle Column: Inline Combobox Popover */}
                      <TableCell className="py-3">
                        <Popover
                          open={activeVehicleTripId === trip.id}
                          onOpenChange={(open) => setActiveVehicleTripId(open ? trip.id : null)}
                        >
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="group flex items-center gap-2 text-xs font-semibold text-left max-w-[180px] truncate p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Click to change vehicle"
                            >
                              {trip.vehicle ? (
                                <>
                                  <Truck className="h-4 w-4 text-slate-500 shrink-0 group-hover:text-[#FA634E]" />
                                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-[#FA634E]">
                                    {trip.vehicle.plate_number}
                                  </span>
                                </>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-bold text-[11px] bg-amber-50 dark:bg-amber-950/50 border border-amber-200 px-2 py-0.5 rounded-md">
                                  <AlertCircle className="w-3 h-3 text-amber-600" />
                                  No Truck
                                </span>
                              )}
                              <ChevronDown className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 shrink-0 ml-auto" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-72 p-2 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-50">
                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1 pb-1.5">
                              Assign Truck for {trip.ref_id || 'Trip'}
                            </div>
                            <Combobox
                              options={vehicleOptions}
                              value={trip.vehicle?.id || 'unassigned'}
                              onChange={(val) => {
                                handleSingleVehicleChange(trip.id, val);
                              }}
                              placeholder="Select truck..."
                              searchPlaceholder="Search plate, type..."
                              className="h-8 text-xs"
                            />
                          </PopoverContent>
                        </Popover>
                      </TableCell>

                      {/* Status Column: Quick Status Select with Styled Pill Trigger */}
                      <TableCell className="py-3">
                        <Select
                          value={trip.status}
                          onValueChange={(val) => handleSingleStatusChange(trip.id, val)}
                        >
                          <SelectTrigger className={`h-7 text-xs font-bold w-32 px-2.5 rounded-full shadow-3xs flex items-center justify-between ${getStatusBadgeStyle(trip.status)}`}>
                            <div className="flex items-center gap-1.5 truncate">
                              {(trip.status === 'Completed' || trip.status === 'Invoiced') && (
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                              )}
                              <SelectValue />
                            </div>
                          </SelectTrigger>
                          <SelectContent align="start" className="bg-white dark:bg-slate-900">
                            {STATUS_LIST.map((st) => (
                              <SelectItem key={st} value={st} className="text-xs font-semibold">
                                {st}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Billing Amount */}
                      <TableCell className="py-3 text-right font-bold text-xs text-slate-900 dark:text-slate-100">
                        {trip.billing_amount != null ? formatMoney(trip.billing_amount, trip.currency) : '—'}
                      </TableCell>

                      {/* Action: Open Trip Details & Delete Trip */}
                      <TableCell className="py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/trips/${trip.id}`, '_blank')}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-[#FA634E] hover:bg-[#FA634E]/10 rounded-md"
                            title="Open trip details in new tab"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setTripToDelete(trip.id);
                              setIsDeleteConfirmOpen(true);
                            }}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-md"
                            title="Delete this trip"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── 5. Modal Footer (matching reference layout) ── */}
        <div className="p-4 px-8 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Lightbulb className="w-4 h-4 text-blue-500 shrink-0" />
            <span>Click on any driver, vehicle, or status cell to update immediately.</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-9 px-6 text-xs font-bold rounded-xl border-slate-200 dark:border-slate-800 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-900"
          >
            Done
          </Button>
        </div>
      </DialogContent>

      <ConfirmModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setTripToDelete(null);
        }}
        onConfirm={() => {
          const idsToDelete = tripToDelete ? [tripToDelete] : selectedTripIds;
          if (idsToDelete.length > 0) {
            bulkDeleteMutation.mutate(idsToDelete);
          }
        }}
        title={tripToDelete ? 'Delete Trip?' : `Delete ${selectedTripIds.length} Selected Trip(s)?`}
        message={
          tripToDelete
            ? 'Are you sure you want to permanently delete this trip? This action cannot be undone.'
            : `Are you sure you want to delete ${selectedTripIds.length} selected trip(s)? Completed or invoiced trips will be protected.`
        }
        confirmLabel={bulkDeleteMutation.isPending ? 'Deleting...' : 'Delete'}
        isDestructive
        isLoading={bulkDeleteMutation.isPending}
      />
    </Dialog>
  );
}
