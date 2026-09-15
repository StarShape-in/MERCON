import { useState, useMemo } from 'react';
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
  Edit3,
} from 'lucide-react';

import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
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
import { tripService } from '@/services/tripService';
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

interface MonthlyGroupLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: TemplateGroup | null;
  companyName: string;
  companyLogo?: string | null;
  onRefresh?: () => void;
}

export default function MonthlyGroupLedgerModal({
  isOpen,
  onClose,
  group,
  companyName,
  companyLogo,
  onRefresh,
}: MonthlyGroupLedgerModalProps) {
  const queryClient = useQueryClient();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Unassigned' | 'Completed' | 'Scheduled' | 'InTransit'>('All');
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([]);

  // Bulk assignment staging state
  const [bulkDriverId, setBulkDriverId] = useState<string>('');
  const [bulkVehicleId, setBulkVehicleId] = useState<string>('');

  // Active inline popover trip tracking
  const [activeDriverTripId, setActiveDriverTripId] = useState<string | null>(null);
  const [activeVehicleTripId, setActiveVehicleTripId] = useState<string | null>(null);

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
    mutationFn: (payload: { trip_ids: string[]; driver_id?: string; vehicle_id?: string; status?: string }) =>
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

  const allTrips = group?.trips || [];

  // Filtered trips
  const filteredTrips = useMemo(() => {
    return allTrips.filter((trip) => {
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
  }, [allTrips, statusFilter, search]);

  const totalCount = allTrips.length;
  const completedCount = allTrips.filter(
    (t) => (t.status || '').toLowerCase() === 'completed' || (t.status || '').toLowerCase() === 'invoiced'
  ).length;
  const remainingCount = Math.max(0, totalCount - completedCount);
  const unassignedCount = allTrips.filter(isUnassigned).length;

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

  if (!group) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-[96vw] max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl">
        {/* ── Modal Header: Template Route & Metadata ── */}
        <div className="p-4 sm:p-5 bg-[#3E3C3D] text-white border-b border-white/10 flex flex-col gap-3 shrink-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt={companyName}
                  className="h-10 w-10 shrink-0 rounded-xl object-contain bg-white p-1 border border-white/20 shadow-sm"
                />
              ) : (
                <div className="h-10 w-10 shrink-0 rounded-xl bg-[#FA634E] text-white font-black text-sm flex items-center justify-center shadow-sm">
                  {initialsOf(companyName)}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#FA634E]/20 text-[#FA634E] border border-[#FA634E]/40">
                    {group.lineType}
                  </span>
                  <span className="text-xs font-black text-slate-200 uppercase tracking-wide">
                    {group.vehicleClass}
                  </span>
                  <span className="text-xs text-slate-300 font-bold">· {companyName}</span>
                </div>
                <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2 mt-1 truncate">
                  <span>{formatLocationClean(group.origin)}</span>
                  <ArrowRight className="h-4 w-4 text-[#FA634E] shrink-0" />
                  <span>{formatLocationClean(group.destination)}</span>
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">Monthly Rate</span>
                <span className="text-sm sm:text-base font-black text-emerald-400">{group.rateStr}</span>
              </div>
            </div>
          </div>

          {/* KPI Summary Metric Pills */}
          <div className="flex items-center flex-wrap gap-2 pt-1 border-t border-white/10 text-xs">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 text-white font-bold">
              <Calendar className="w-3.5 h-3.5 text-slate-300" />
              <span>{totalCount} Total Trips</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{completedCount} Completed</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-950/70 border border-amber-500/40 text-amber-300 font-bold">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{remainingCount} Remaining</span>
            </div>
            {unassignedCount > 0 && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-950/70 border border-rose-500/40 text-rose-300 font-bold animate-pulse">
                <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                <span>{unassignedCount} Unassigned Resource(s)</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Toolbar: Search, Filters & Bulk Action Bar ── */}
        <div className="p-3 sm:px-5 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          {/* Left: Search input + Status Filter Chips */}
          <div className="flex items-center flex-wrap gap-2 min-w-0">
            <div className="relative w-52 sm:w-60">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                placeholder="Search ref, driver, plate..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs bg-white dark:bg-slate-950 rounded-lg border-slate-200 dark:border-slate-700"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-0.5 text-xs font-semibold">
              {(['All', 'Unassigned', 'Scheduled', 'InTransit', 'Completed'] as const).map((filterOpt) => (
                <button
                  key={filterOpt}
                  type="button"
                  onClick={() => setStatusFilter(filterOpt)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    statusFilter === filterOpt
                      ? 'bg-[#FA634E] text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {filterOpt}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Quick Selection Count */}
          <div className="flex items-center gap-2 text-xs">
            {selectedTripIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedTripIds([])}
                className="text-[#FA634E] font-bold hover:underline"
              >
                Clear Selection ({selectedTripIds.length})
              </button>
            )}
            <span className="text-slate-400 font-medium">
              Showing {filteredTrips.length} of {allTrips.length} trips
            </span>
          </div>
        </div>

        {/* ── Sticky Bulk Actions Bar (Visible when >= 1 trips selected) ── */}
        {selectedTripIds.length > 0 && (
          <div className="px-4 py-2.5 bg-[#FA634E]/10 dark:bg-[#FA634E]/15 border-b border-[#FA634E]/30 flex flex-wrap items-center justify-between gap-3 shrink-0 animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-[#3E3C3D] dark:text-white bg-[#FA634E]/20 px-2.5 py-0.5 rounded-md border border-[#FA634E]/30">
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
                  className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-300"
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
                  className="h-8 text-xs bg-white dark:bg-slate-900 border-slate-300"
                />
              </div>

              {/* Bulk Status Selector */}
              <Select onValueChange={handleApplyBulkStatus}>
                <SelectTrigger className="h-8 w-36 text-xs bg-white dark:bg-slate-900 border-slate-300 text-[#3E3C3D] dark:text-white font-bold">
                  <SelectValue placeholder="Set Status..." />
                </SelectTrigger>
                <SelectContent align="end" className="bg-white dark:bg-slate-900">
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
            </div>
          </div>
        )}

        {/* ── Main Ledger Table ── */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <Table>
            <TableHeader className="sticky top-0 bg-slate-100 dark:bg-slate-900 z-10 shadow-xs border-b border-slate-200 dark:border-slate-800">
              <TableRow className="hover:bg-slate-100">
                <TableHead className="w-10 px-4">
                  <Checkbox
                    checked={isAllSelected ? true : isSomeSelected ? 'indeterminate' : false}
                    onCheckedChange={handleToggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300 data-[state=checked]:bg-[#FA634E] data-[state=checked]:border-[#FA634E]"
                  />
                </TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 w-36">
                  Date & Time
                </TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 w-28">
                  Trip Ref
                </TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Assigned Driver
                </TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                  Assigned Vehicle
                </TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 w-32">
                  Status
                </TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 text-right w-24">
                  Amount
                </TableHead>
                <TableHead className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 text-center w-20">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
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
                          ? 'bg-amber-50/40 dark:bg-amber-950/10 hover:bg-amber-50/70'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                      }`}
                    >
                      {/* Checkbox */}
                      <TableCell className="px-4 py-2.5">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleToggleTrip(trip.id)}
                          className="h-4 w-4 rounded border-slate-300 data-[state=checked]:bg-[#FA634E] data-[state=checked]:border-[#FA634E]"
                        />
                      </TableCell>

                      {/* Date & Time */}
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{formatDayHeading(trip.date)}</span>
                          <span className="text-[10px] font-normal text-slate-400">
                            {formatTime(trip.planned_start)}
                          </span>
                        </div>
                      </TableCell>

                      {/* Trip Ref ID */}
                      <TableCell className="py-2.5">
                        <span className="font-mono text-xs font-bold text-[#3E3C3D] dark:text-slate-200 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded-md shadow-3xs">
                          {trip.ref_id || 'TRP-NEW'}
                        </span>
                      </TableCell>

                      {/* Driver Column: Inline Combobox Popover */}
                      <TableCell className="py-2.5">
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
                              <Edit3 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 shrink-0 ml-auto" />
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
                      <TableCell className="py-2.5">
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
                              <Edit3 className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 shrink-0 ml-auto" />
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

                      {/* Status Column: Quick Status Select */}
                      <TableCell className="py-2.5">
                        <Select
                          value={trip.status}
                          onValueChange={(val) => handleSingleStatusChange(trip.id, val)}
                        >
                          <SelectTrigger className="h-7 text-[11px] font-extrabold w-28 px-2 rounded-md border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
                            <SelectValue />
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
                      <TableCell className="py-2.5 text-right font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {trip.billing_amount != null ? formatMoney(trip.billing_amount, trip.currency) : '—'}
                      </TableCell>

                      {/* Action: Open Trip Details */}
                      <TableCell className="py-2.5 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(`/trips/${trip.id}`, '_blank')}
                          className="h-7 w-7 p-0 text-slate-400 hover:text-[#FA634E] hover:bg-[#FA634E]/10"
                          title="Open trip details in new tab"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── Modal Footer ── */}
        <div className="p-3.5 px-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 font-medium">
            Click any Driver, Truck, or Status cell to update immediately.
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 px-4 text-xs font-bold rounded-lg border-slate-300"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
