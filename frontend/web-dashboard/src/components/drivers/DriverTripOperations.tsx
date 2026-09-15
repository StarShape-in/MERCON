import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin, Calendar, Truck, Building2, ChevronRight, Plus,
  Search, Eye, ArrowRight, Package, Clock, ShieldCheck,
  CheckCircle2, ArrowUpRight, Navigation, Layers, CalendarRange, FileText
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import StatusBadge from '@/components/ui/StatusBadge';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';
import { cn } from '@/lib/utils';

export interface TripOperationItem {
  id: string;
  ref_id?: string | null;
  status?: string | null;
  planned_start?: string | null;
  planned_end?: string | null;
  createdAt?: string | Date | null;
  vehicle_type?: string | null;
  rate_category?: string | null;
  billing_amount?: number | null;
  trip_charges?: number | null;
  pickup?: string | null;
  dropoff?: string | null;
  origin_city?: string | null;
  destination_city?: string | null;
  route_origin?: string | null;
  route_destination?: string | null;
  customer?: {
    id?: string;
    name?: string;
    ref_id?: string;
  } | null;
  vehicle?: {
    id?: string;
    plate_number?: string;
    asset_type?: string;
  } | null;
  stops?: Array<{
    id?: string;
    sequence?: number;
    stop_type?: string;
    source_label?: string;
    location_name?: string;
    location_address?: string;
    location?: {
      id?: string;
      code?: string;
      codes?: string[];
      name?: string;
      city?: string;
      address?: string;
    };
  }> | null;
}

interface DriverTripOperationsProps {
  driverId: string;
  driverName: string;
  trips: TripOperationItem[];
}

const isUuidVal = (str?: string | null) =>
  str ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim()) : false;

function resolveStopLocationName(stop: any, fallback: string): string {
  if (!stop) return fallback;

  const code = stop.location?.codes?.[0] || stop.location?.code;
  const locName = !isUuidVal(stop.location?.name) ? stop.location?.name : null;
  const locCity = !isUuidVal(stop.location?.city) ? stop.location?.city : null;

  const rawLocName = !isUuidVal(stop.location_name) ? stop.location_name : null;
  const rawSourceLabel = !isUuidVal(stop.source_label) ? stop.source_label : null;
  const rawName = !isUuidVal(stop.name) ? stop.name : null;
  const rawLabel = !isUuidVal(stop.label) ? stop.label : null;
  const rawAddress = !isUuidVal(stop.location_address) ? stop.location_address : null;

  const result =
    code ||
    locName ||
    locCity ||
    rawLocName ||
    rawSourceLabel ||
    rawName ||
    rawLabel ||
    rawAddress ||
    fallback;

  return String(result).replace(/🔁\s*/g, '').trim();
}

function getTripRouteInfo(trip: TripOperationItem) {
  const t = trip as any;

  if (trip.stops && Array.isArray(trip.stops) && trip.stops.length > 0) {
    const sortedStops = [...trip.stops].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    const pickupStop = sortedStops.find((s) => (s as any).stop_type === 'Pickup') || sortedStops[0];
    const dropoffStop = sortedStops.find((s) => (s as any).stop_type === 'Dropoff') || sortedStops[sortedStops.length - 1];

    const defaultPickup = !isUuidVal(t.pickup)
      ? t.pickup
      : !isUuidVal(t.origin_city)
      ? t.origin_city
      : !isUuidVal(t.route_origin)
      ? t.route_origin
      : 'Dispatch Depot';

    const defaultDropoff = !isUuidVal(t.dropoff)
      ? t.dropoff
      : !isUuidVal(t.destination_city)
      ? t.destination_city
      : !isUuidVal(t.route_destination)
      ? t.route_destination
      : trip.customer?.name
      ? `${trip.customer.name} Facility`
      : 'Delivery Site';

    const pickup = resolveStopLocationName(pickupStop, defaultPickup);
    const dropoff = resolveStopLocationName(dropoffStop, defaultDropoff);

    return { pickup, dropoff, stopCount: sortedStops.length };
  }

  const rawPickup = !isUuidVal(t.pickup)
    ? t.pickup
    : !isUuidVal(t.origin_city)
    ? t.origin_city
    : !isUuidVal(t.route_origin)
    ? t.route_origin
    : null;

  const rawDropoff = !isUuidVal(t.dropoff)
    ? t.dropoff
    : !isUuidVal(t.destination_city)
    ? t.destination_city
    : !isUuidVal(t.route_destination)
    ? t.route_destination
    : null;

  return {
    pickup: rawPickup || 'Central Terminal',
    dropoff: rawDropoff || (trip.customer?.name ? `${trip.customer.name} Facility` : 'Client Site'),
    stopCount: 2,
  };
}

export default function DriverTripOperations({ driverId, driverName, trips = [] }: DriverTripOperationsProps) {
  const navigate = useNavigate();
  const tz = useDeploymentTimezone();
  const [searchTerm, setSearchTerm] = useState('');

  // Categorize active/upcoming vs history
  const activeUpcomingTrips = useMemo(() => {
    return trips.filter((t) => {
      const s = (t.status || '').toLowerCase();
      return s !== 'completed' && s !== 'invoiced' && s !== 'cancelled';
    });
  }, [trips]);

  const historyTrips = useMemo(() => {
    return trips.filter((t) => {
      const s = (t.status || '').toLowerCase();
      return s === 'completed' || s === 'invoiced' || s === 'cancelled';
    });
  }, [trips]);

  // Filter history by search term
  const filteredHistory = useMemo(() => {
    if (!searchTerm.trim()) return historyTrips;
    const term = searchTerm.toLowerCase();
    return historyTrips.filter((t) => {
      const refMatch = (t.ref_id || '').toLowerCase().includes(term);
      const custMatch = (t.customer?.name || '').toLowerCase().includes(term);
      const vehicleMatch = (t.vehicle?.plate_number || '').toLowerCase().includes(term);
      const statusMatch = (t.status || '').toLowerCase().includes(term);
      return refMatch || custMatch || vehicleMatch || statusMatch;
    });
  }, [historyTrips, searchTerm]);

  return (
    <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-16px_rgba(16,24,40,0.14)] py-0 gap-0 ring-0 overflow-hidden">
      <Tabs defaultValue="active" className="gap-0">
        {/* Module Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  Trip Operations
                </h3>
                <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800 text-[10px] font-bold py-0 h-4">
                  Logistics Command
                </Badge>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Dispatch schedule, active routes & assignment ledger
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <TabsList className="h-8 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
              <TabsTrigger
                value="active"
                className="h-7 gap-1.5 rounded-md text-xs font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-2xs"
              >
                Active & Scheduled
                <span className={cn(
                  'rounded-full px-1.5 py-0.2 text-[10px] font-extrabold',
                  activeUpcomingTrips.length > 0
                    ? 'bg-brand/10 text-brand dark:bg-brand/20 dark:text-orange-400'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                )}>
                  {activeUpcomingTrips.length}
                </span>
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="h-7 gap-1.5 rounded-md text-xs font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:shadow-2xs"
              >
                Dispatch History
                <span className="rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-1.5 text-[10px] font-bold">
                  {trips.length}
                </span>
              </TabsTrigger>
            </TabsList>

          </div>
        </div>

        {/* ── TAB 1: ACTIVE & SCHEDULED DISPATCHES ───────────────────────────── */}
        <TabsContent value="active" className="mt-0 p-4 space-y-3">
          {activeUpcomingTrips.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Calendar className="w-7 h-7 text-slate-400 shrink-0" />
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-100">No Active or Scheduled Trips</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                {driverName} is currently clear with no active dispatches or upcoming assigned trips.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
              {activeUpcomingTrips.map((trip) => {
                const route = getTripRouteInfo(trip);
                const dateStr = trip.planned_start || trip.createdAt;
                const formattedDate = dateStr
                  ? formatInDeploymentTz(dateStr, tz, 'EEE, MMM d • HH:mm')
                  : 'Date TBD';
                
                const isOngoing = trip.status === 'InTransit' || trip.status === 'AtPickup' || trip.status === 'AtDelivery';
                const railTone = isOngoing
                  ? 'from-blue-500 to-indigo-600'
                  : trip.status === 'Dispatched'
                  ? 'from-amber-500 to-orange-500'
                  : 'from-slate-400 to-slate-500';

                return (
                  <div
                    key={trip.id}
                    onClick={() => navigate(`/trips/${trip.id}`)}
                    className="group relative flex flex-col justify-between p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 hover:border-brand/50 dark:hover:border-brand/50 hover:shadow-md transition-all cursor-pointer overflow-hidden"
                  >
                    {/* Status Top Accent Bar */}
                    <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', railTone)} />

                    <div className="space-y-3">
                      {/* Card Header */}
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-xs font-black text-brand tracking-tight bg-brand/5 dark:bg-brand/15 px-2 py-0.5 rounded border border-brand/20">
                            {trip.ref_id || 'TRIP-N/A'}
                          </span>
                          <StatusBadge status={trip.status as any} />
                        </div>
                        <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {formattedDate}
                        </span>
                      </div>

                      {/* Route Pathways */}
                      <div className="rounded-lg bg-slate-50 dark:bg-slate-800/40 p-2.5 border border-slate-100 dark:border-slate-800/60">
                        <div className="flex items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                              {route.pickup}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 text-slate-400 shrink-0 px-1">
                            <span className="w-4 border-b border-dashed border-slate-300 dark:border-slate-600" />
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                            <span className="w-4 border-b border-dashed border-slate-300 dark:border-slate-600" />
                          </div>

                          <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end">
                            <span className="font-bold text-slate-800 dark:text-slate-200 truncate text-right">
                              {route.dropoff}
                            </span>
                            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                          </div>
                        </div>
                      </div>

                      {/* Details Row: Customer + Vehicle + Cargo */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 dark:text-slate-400 pt-0.5">
                        {trip.customer?.name && (
                          <div className="flex items-center gap-1.5 font-medium truncate max-w-[180px]">
                            <Building2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="truncate">{trip.customer.name}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 ml-auto">
                          {trip.vehicle?.plate_number && (
                            <span className="flex items-center gap-1 font-mono font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 px-2 py-0.5 rounded text-slate-700 dark:text-slate-300">
                              <Truck className="w-3 h-3 text-slate-500 shrink-0" />
                              {trip.vehicle.plate_number}
                            </span>
                          )}

                          {trip.vehicle_type && (
                            <span className="flex items-center gap-1 font-semibold text-slate-500 bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 px-1.5 py-0.5 rounded">
                              <Package className="w-3 h-3 text-slate-400 shrink-0" />
                              {trip.vehicle_type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Card Footer Hover Bar */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 group-hover:text-brand transition-colors">
                      <span className="font-semibold text-slate-500 dark:text-slate-400">
                        {route.stopCount} {route.stopCount === 1 ? 'Stop' : 'Stops'} Route
                      </span>
                      <span className="font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                        Open Operations Hub <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── TAB 2: DISPATCH HISTORY LEDGER ─────────────────────────────────── */}
        <TabsContent value="history" className="mt-0">
          {/* Ledger Toolbar & Header Bar (User Rule #4) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/10">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <CalendarRange className="w-4 h-4 text-brand" /> Trip Ledger
              </span>
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 text-[10px] font-bold">
                {filteredHistory.length} {filteredHistory.length === 1 ? 'trip record' : 'trips'}
              </span>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search trip ID, customer, vehicle..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8.5 pl-8 text-xs border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          {filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {searchTerm ? 'No matching dispatch records' : 'No Dispatch History Available'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                {searchTerm
                  ? 'Try broadening your search term or filter criteria.'
                  : 'Completed and archived trip dispatches for this driver will be recorded here.'}
              </p>
            </div>
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-white dark:bg-slate-900 shadow-2xs">
                  <TableRow className="border-slate-100 dark:border-slate-800 hover:bg-transparent">
                    <TableHead className="h-9 text-[10px] font-black uppercase tracking-wider text-slate-400">Trip ID</TableHead>
                    <TableHead className="h-9 text-[10px] font-black uppercase tracking-wider text-slate-400">Customer</TableHead>
                    <TableHead className="h-9 text-[10px] font-black uppercase tracking-wider text-slate-400">Route Lane</TableHead>
                    <TableHead className="h-9 text-[10px] font-black uppercase tracking-wider text-slate-400">Vehicle</TableHead>
                    <TableHead className="h-9 text-[10px] font-black uppercase tracking-wider text-slate-400">Dispatch Date</TableHead>
                    <TableHead className="h-9 text-[10px] font-black uppercase tracking-wider text-slate-400">Status</TableHead>
                    <TableHead className="h-9 w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredHistory.map((trip) => {
                    const route = getTripRouteInfo(trip);
                    const dateStr = trip.planned_start || trip.createdAt;
                    return (
                      <TableRow
                        key={trip.id}
                        onClick={() => navigate(`/trips/${trip.id}`)}
                        className="cursor-pointer border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <TableCell className="py-2.5">
                          <span className="font-mono text-xs font-black text-brand tracking-tight">
                            {trip.ref_id || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                            {trip.customer?.name || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                            <span className="font-semibold truncate max-w-[110px]">{route.pickup}</span>
                            <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="font-semibold truncate max-w-[110px]">{route.dropoff}</span>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5">
                          {trip.vehicle?.plate_number ? (
                            <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                              <Truck className="w-3 h-3 text-slate-400" />
                              {trip.vehicle.plate_number}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5">
                          <span className="font-mono text-xs text-slate-600 dark:text-slate-300">
                            {dateStr ? formatInDeploymentTz(dateStr, tz, 'MM/dd/yyyy') : 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
                            {trip.trip_charges
                              ? `SAR ${Number(trip.trip_charges).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                              : '—'}
                          </span>
                        </TableCell>
                        <TableCell className="py-2.5">
                          <StatusBadge status={trip.status as any} />
                        </TableCell>
                        <TableCell className="py-2.5 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-slate-400 hover:text-brand hover:bg-brand/5"
                            title="Inspect trip"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
