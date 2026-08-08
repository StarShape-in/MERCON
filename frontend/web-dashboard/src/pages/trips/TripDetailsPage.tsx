import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronRight, ChevronDown, Copy, Check, Printer, Phone, RefreshCcw,
  Navigation, CheckCircle2, XCircle, AlertTriangle,
  Calendar, Clock, ReceiptText, FileStack, PackageCheck,
  Building2, User as UserIcon, Truck, FileText,
  UploadCloud, ExternalLink, Timer, MapPin,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import Btn from '@/components/ui/Btn';
import { Button } from '@/components/ui/button';
import ConfirmModal from '@/components/ui/ConfirmModal';
import UploadDocumentModal from '@/components/ui/UploadDocumentModal';
import { Combobox } from '@/components/ui/combobox';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import TripLiveMapCard from '@/components/maps/TripLiveMapCard';
import UserChip, { useUserLookup } from '@/components/trips/UserChip';
import {
  tripService, TripStatus,
  DELAY_REASONS, DELAY_REASON_LABELS, type DelayReason, type TripStop,
} from '@/services/tripService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { documentService, type DocType } from '@/services/documentService';
import { docTypeLabel } from '@/lib/documents';
import { cn } from '@/lib/utils';

/** Matches DELAY_THRESHOLD_MINUTES on the server. Below this, lateness is
 *  ordinary variance and showing it would bury the delays that matter. */
const DELAY_THRESHOLD_MINUTES = 30;

/** Trip lifecycle stages in order, for the header progress bar. Cancelled isn't
 *  a stage on this line — it's a separate dead-end handled on its own. */
const STAGE_ORDER: TripStatus[] = ['Draft', 'Dispatched', 'AtPickup', 'InTransit', 'AtDelivery', 'Completed', 'Invoiced'];

/** Minutes a stop was reached late, or null when it isn't late / can't be judged. */
function arrivalDelayMinutes(stop: TripStop): number | null {
  if (!stop.planned_arrival || !stop.actual_arrival) return null;
  const mins = Math.round(
    (new Date(stop.actual_arrival).getTime() - new Date(stop.planned_arrival).getTime()) / 60000,
  );
  return mins >= DELAY_THRESHOLD_MINUTES ? mins : null;
}

function formatDelay(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Dwell time at a stop: how long the driver was held there. */
function dwellMinutes(stop: TripStop): number | null {
  if (!stop.actual_arrival || !stop.actual_departure) return null;
  return Math.round((new Date(stop.actual_departure).getTime() - new Date(stop.actual_arrival).getTime()) / 60000);
}

function shortDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

type StepStatus = 'done' | 'active' | 'pending';

export default function TripDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const users = useUserLookup();

  const [activeTab, setActiveTab] = useState('overview');
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<TripStatus>('Draft');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadDocType, setUploadDocType] = useState<DocType | undefined>(undefined);
  // Which stop's reason form is open, and what's typed into it.
  const [delayFormStopId, setDelayFormStopId] = useState<string | null>(null);
  const [delayReason, setDelayReason] = useState<DelayReason>('Traffic');
  const [delayNote, setDelayNote] = useState('');
  const [pendingDriverId, setPendingDriverId] = useState('');
  const [pendingVehicleId, setPendingVehicleId] = useState('');
  const [isReplaceDriverOpen, setIsReplaceDriverOpen] = useState(false);
  const [replaceDriverId, setReplaceDriverId] = useState('');
  const [copied, setCopied] = useState(false);

  // Fetch single trip
  const { data: trip, isLoading } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => tripService.getById(id!),
    enabled: !!id,
  });

  // Trip documents
  const { data: docsRes, isLoading: isLoadingDocs } = useQuery({
    queryKey: ['documents', 'Trip', id],
    queryFn: () => documentService.getAll({ entity_type: 'Trip', entity_id: id, per_page: 50 }),
    enabled: !!id,
  });
  const documents = docsRes?.data || [];

  // Available drivers/vehicles for late assignment
  const { data: driversRes } = useQuery({
    queryKey: ['drivers-select', 'Available'],
    queryFn: () => driverService.getAll({ per_page: 100, status: 'Available' }),
    enabled: !!trip && (!trip.driver || isReplaceDriverOpen),
  });
  const { data: vehiclesRes } = useQuery({
    queryKey: ['vehicles-select', 'Available'],
    queryFn: () => vehicleService.getAll({ per_page: 100, status: 'Available' }),
    enabled: !!trip && !trip.vehicle,
  });
  const driverOptions = (driversRes?.data || []).map((d) => ({
    value: d.id,
    label: `${d.first_name} ${d.last_name}`,
    keywords: `${d.first_name} ${d.last_name}`,
  }));
  const vehicleOptions = (vehiclesRes?.data || []).map((v) => ({
    value: v.id,
    label: `${v.plate_number} (${v.asset_type} • ${v.capacity_kg.toLocaleString()} kg)`,
    keywords: `${v.plate_number} ${v.asset_type}`,
  }));

  // Assign a driver and/or vehicle to a trip created with "assign later"
  const assignMutation = useMutation({
    mutationFn: (payload: { driver_id?: string; vehicle_id?: string }) => tripService.dispatch(id!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      setPendingDriverId('');
      setPendingVehicleId('');
    },
  });

  // Swap the assigned driver mid-trip
  const replaceDriverMutation = useMutation({
    mutationFn: (newDriverId: string) => tripService.replaceDriver(id!, newDriverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      setIsReplaceDriverOpen(false);
      setReplaceDriverId('');
    },
  });

  // Record why a stop ran late
  const logDelayMutation = useMutation({
    mutationFn: (vars: { stopId: string; delay_reason: DelayReason; delay_note?: string }) =>
      tripService.logStopDelay(id!, vars.stopId, {
        delay_reason: vars.delay_reason,
        delay_note: vars.delay_note,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
      setDelayFormStopId(null);
      setDelayNote('');
    },
  });

  const openDelayForm = (stop: TripStop) => {
    // Pre-load whatever is already recorded so editing corrects it rather
    // than starting from a blank guess.
    setDelayReason(stop.delay_reason ?? 'Traffic');
    setDelayNote(stop.delay_note ?? '');
    setDelayFormStopId(stop.id);
  };

  // Mutate Trip Status
  const updateStatusMutation = useMutation({
    mutationFn: (status: TripStatus) => tripService.updateStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      setIsStatusModalOpen(false);
      setIsCancelModalOpen(false);
    },
  });

  const handleCopyId = async () => {
    if (!trip) return;
    try {
      await navigator.clipboard.writeText(trip.ref_id || trip.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access denied — silently ignore, the id is visible on screen anyway.
    }
  };

  if (isLoading || !trip) {
    return (
      <DashboardLayout active="Trips" title="Trip Details">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-4">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <Skeleton className="h-60 w-full rounded-3xl" />
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <Skeleton className="xl:col-span-8 h-80 w-full rounded-3xl" />
            <Skeleton className="xl:col-span-4 h-80 w-full rounded-3xl" />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Get Next Status Option
  const getNextStatus = (current: TripStatus): TripStatus | null => {
    switch (current) {
      case 'Draft': return 'Dispatched';
      case 'Dispatched': return 'AtPickup';
      case 'AtPickup': return 'InTransit';
      case 'InTransit': return 'AtDelivery';
      case 'AtDelivery': return 'Completed';
      case 'Completed': return 'Invoiced';
      default: return null;
    }
  };

  // A Draft trip can only move to Dispatched once both a driver and a
  // vehicle are assigned — otherwise assign them first via the banner below.
  const rawNextStatus = getNextStatus(trip.status);
  const nextStatusOption =
    rawNextStatus === 'Dispatched' && (!trip.driver || !trip.vehicle) ? null : rawNextStatus;

  const canCancel = !['Completed', 'Invoiced', 'Cancelled'].includes(trip.status);
  const isClosed = ['Completed', 'Invoiced', 'Cancelled'].includes(trip.status);
  const pickup = trip.stops?.find((s) => s.stop_type === 'Pickup');
  const dropoff = trip.stops?.find((s) => s.stop_type === 'Dropoff');
  const invoice = trip.invoices?.[0];
  const needsAssignment = trip.status === 'Draft' && (!trip.driver || !trip.vehicle);

  // Overall trip progress — Cancelled is its own dead-end state, not a stage.
  const stageIndex = STAGE_ORDER.indexOf(trip.status);
  const stageProgress = stageIndex >= 0 ? Math.round((stageIndex / (STAGE_ORDER.length - 1)) * 100) : 0;
  const pickupDone = !!pickup?.actual_arrival;
  const dropoffDone = !!dropoff?.actual_arrival;
  const nextStopId = (trip.stops || []).find((s) => !s.actual_arrival)?.id;

  // Mini stats — every value is computed from real trip fields, never invented.
  const estDurationMinutes = trip.planned_start && trip.planned_end
    ? Math.round((new Date(trip.planned_end).getTime() - new Date(trip.planned_start).getTime()) / 60000)
    : null;
  const elapsedMinutes = trip.actual_start
    ? Math.round((new Date(trip.actual_end || new Date()).getTime() - new Date(trip.actual_start).getTime()) / 60000)
    : null;
  const avgSpeedKmh = trip.planned_distance && elapsedMinutes && elapsedMinutes > 0
    ? Math.round((trip.planned_distance / (elapsedMinutes / 60)) * 10) / 10
    : null;

  const miniStats: { label: string; value: string }[] = [
    { label: 'Distance', value: trip.planned_distance != null ? `${trip.planned_distance} km` : '—' },
    { label: 'Elapsed', value: elapsedMinutes != null ? formatDelay(elapsedMinutes) : (estDurationMinutes != null ? formatDelay(estDurationMinutes) : '—') },
    { label: 'Stops', value: String(trip.stops?.length ?? 0) },
    { label: 'Avg speed', value: avgSpeedKmh != null ? `${avgSpeedKmh} km/h` : '—' },
  ];

  // Activity checkpoints — 4 fixed lifecycle stages, derived from real stop/status data.
  const timelineSteps: { key: string; label: string; time: string | null; sub?: string; done: boolean }[] = [
    { key: 'created', label: 'Trip Created', time: trip.createdAt, done: true },
    {
      key: 'departed',
      label: 'Departed from Pickup',
      time: pickup?.actual_departure || pickup?.actual_arrival || null,
      done: !!(pickup?.actual_departure || pickup?.actual_arrival),
    },
    { key: 'transit', label: 'In Transit', time: null, sub: 'On the way to destination', done: dropoffDone },
    {
      key: 'arrived',
      label: dropoffDone ? 'Reached Destination' : 'Expected Arrival',
      time: dropoff?.actual_arrival || dropoff?.planned_arrival || null,
      done: dropoffDone,
    },
  ];
  let activeAssigned = false;
  const timelineStatus: StepStatus[] = timelineSteps.map((s) => {
    if (s.done) return 'done';
    if (trip.status === 'Cancelled') return 'pending';
    if (!activeAssigned) { activeAssigned = true; return 'active'; }
    return 'pending';
  });

  const routeLabel = `${pickup?.location_name || 'Pickup'} → ${dropoff?.location_name || 'Drop-off'}`;

  return (
    <DashboardLayout active="Trips" title="Trip Details">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-4 animate-fade-in">

        {/* Breadcrumb + action bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-sm min-w-0">
            <Link to="/trips" className="text-slate-500 font-medium hover:text-slate-900 transition-colors">Trips</Link>
            <ChevronRight size={14} className="text-slate-300 shrink-0" />
            <span className="text-slate-900 font-semibold truncate">Trip Details</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Btn
              label="Edit Trip"
              variant="outline"
              className="h-9 rounded-xl border-slate-200"
              onClick={() => navigate(`/trips/${trip.id}/edit`)}
            />
            <Btn
              label="Print"
              variant="outline"
              icon={<Printer size={14} />}
              className="h-9 rounded-xl border-slate-200"
              onClick={() => window.print()}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-9 rounded-xl bg-[#E8450F] hover:bg-[#C7380A] text-white font-semibold gap-1.5 px-4">
                  More Actions
                  <ChevronDown size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                {trip.status === 'InTransit' && (
                  <DropdownMenuItem onClick={() => navigate(`/trips/${trip.id}/track`)}>
                    <Navigation size={14} className="mr-2 text-slate-500" /> Track Live
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => { setUploadDocType(trip.status === 'Completed' ? 'POD' : undefined); setIsUploadModalOpen(true); }}>
                  <UploadCloud size={14} className="mr-2 text-slate-500" /> Upload Document
                </DropdownMenuItem>
                {nextStatusOption && (
                  <DropdownMenuItem onClick={() => { setNextStatus(nextStatusOption); setIsStatusModalOpen(true); }}>
                    <CheckCircle2 size={14} className="mr-2 text-slate-500" /> Mark {nextStatusOption}
                  </DropdownMenuItem>
                )}
                {canCancel && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsCancelModalOpen(true)} className="text-red-600 focus:text-red-600 hover:bg-red-50">
                      <XCircle size={14} className="mr-2" /> Cancel Trip
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {trip.status === 'Cancelled' && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 flex items-center gap-3">
            <XCircle size={16} className="text-red-600 shrink-0" />
            <p className="text-xs font-semibold text-red-700">This trip was cancelled. Its driver and vehicle were released back to Available.</p>
          </div>
        )}

        {/* Action needed — Draft trip missing driver and/or vehicle */}
        {needsAssignment && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-600 shrink-0" />
              <p className="text-xs font-semibold text-amber-800">
                Blocked from dispatch — assign {!trip.driver && !trip.vehicle ? 'a driver and vehicle' : !trip.driver ? 'a driver' : 'a vehicle'} to continue.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {!trip.driver && (
                <div className="flex gap-2">
                  <Combobox
                    value={pendingDriverId}
                    onChange={setPendingDriverId}
                    options={driverOptions}
                    placeholder="Choose available driver..."
                    searchPlaceholder="Search drivers..."
                    emptyText="No available drivers found."
                    className="flex-1"
                  />
                  <Btn
                    label={assignMutation.isPending ? 'Assigning...' : 'Assign'}
                    size="sm"
                    disabled={!pendingDriverId || assignMutation.isPending}
                    onClick={() => assignMutation.mutate({ driver_id: pendingDriverId })}
                  />
                </div>
              )}
              {!trip.vehicle && (
                <div className="flex gap-2">
                  <Combobox
                    value={pendingVehicleId}
                    onChange={setPendingVehicleId}
                    options={vehicleOptions}
                    placeholder="Choose available vehicle..."
                    searchPlaceholder="Search vehicles..."
                    emptyText="No available vehicles found."
                    className="flex-1"
                  />
                  <Btn
                    label={assignMutation.isPending ? 'Assigning...' : 'Assign'}
                    size="sm"
                    disabled={!pendingVehicleId || assignMutation.isPending}
                    onClick={() => assignMutation.mutate({ vehicle_id: pendingVehicleId })}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="stops">Stops{trip.stops && trip.stops.length > 0 ? ` (${trip.stops.length})` : ''}</TabsTrigger>
            <TabsTrigger value="documents">Documents{documents.length > 0 ? ` (${documents.length})` : ''}</TabsTrigger>
            <TabsTrigger value="audit">Audit</TabsTrigger>
          </TabsList>

          {/* ───────────────────────── Overview — the operational cockpit ───────────────────────── */}
          <TabsContent value="overview" className="space-y-4 mt-4">

            {/* Compact status strip */}
            <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm p-5 gap-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-[#E8450F]/10 text-[#E8450F] flex items-center justify-center shrink-0">
                    <Truck size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[15px] font-semibold font-mono tracking-tight text-slate-900 truncate">{trip.ref_id || trip.id}</p>
                      <button type="button" onClick={handleCopyId} aria-label="Copy trip ID" className="text-slate-400 hover:text-[#E8450F] transition-colors shrink-0">
                        {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                      </button>
                    </div>
                    <div className="mt-0.5"><StatusBadge status={trip.status} /></div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {trip.driver?.phone_primary && (
                    <a href={`tel:${trip.driver.phone_primary}`}>
                      <Btn label="Call Driver" variant="outline" size="sm" icon={<Phone size={13} />} className="rounded-xl border-slate-200" />
                    </a>
                  )}
                  <Btn
                    label="View Map"
                    variant="outline"
                    size="sm"
                    icon={<Navigation size={13} />}
                    className="rounded-xl border-slate-200"
                    onClick={() => navigate(`/trips/${trip.id}/track`)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-4 border-t border-slate-100">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Customer</p>
                  <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">{trip.customer?.name || '—'}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Driver</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {trip.driver ? `${trip.driver.first_name} ${trip.driver.last_name}` : 'Unassigned'}
                    </p>
                    {trip.driver && !isClosed && (
                      <Popover open={isReplaceDriverOpen} onOpenChange={(open) => { setIsReplaceDriverOpen(open); if (!open) setReplaceDriverId(''); }}>
                        <PopoverTrigger asChild>
                          <button type="button" aria-label="Replace driver" className="text-slate-400 hover:text-[#E8450F] transition-colors shrink-0">
                            <RefreshCcw size={11} />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-72 p-3 space-y-2">
                          <p className="text-xs font-semibold text-slate-900">Replace driver</p>
                          <Combobox
                            value={replaceDriverId}
                            onChange={setReplaceDriverId}
                            options={driverOptions}
                            placeholder="Choose replacement driver..."
                            searchPlaceholder="Search drivers..."
                            emptyText="No available drivers found."
                          />
                          <Btn
                            label={replaceDriverMutation.isPending ? 'Replacing...' : 'Confirm Swap'}
                            size="sm"
                            className="w-full"
                            disabled={!replaceDriverId || replaceDriverMutation.isPending}
                            onClick={() => replaceDriverMutation.mutate(replaceDriverId)}
                          />
                          {replaceDriverMutation.isError && (
                            <p className="text-[10px] text-red-600 font-semibold">Could not replace driver — they may no longer be available.</p>
                          )}
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Vehicle</p>
                  <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">{trip.vehicle?.plate_number || 'Unassigned'}</p>
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">ETA</p>
                  <p className="text-sm font-semibold text-slate-900 truncate mt-0.5">
                    {trip.planned_end ? shortDateTime(trip.planned_end) : '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-x-2 gap-y-1 mt-3 text-[11px] text-slate-500 flex-wrap">
                <span className={cn('font-medium', 'text-slate-700')}>Created {shortDateTime(trip.createdAt)}</span>
                {(pickup?.actual_departure || pickup?.actual_arrival) && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="font-medium text-slate-700">Departed {shortDateTime((pickup?.actual_departure || pickup?.actual_arrival)!)}</span>
                  </>
                )}
                {trip.status === 'InTransit' && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="font-semibold text-[#E8450F] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#E8450F] animate-pulse" /> In transit now
                    </span>
                  </>
                )}
                {dropoffDone && dropoff?.actual_arrival && (
                  <>
                    <span className="text-slate-300">·</span>
                    <span className="font-medium text-emerald-600">Delivered {shortDateTime(dropoff.actual_arrival)}</span>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-8 gap-y-3 mt-4 pt-4 border-t border-slate-100">
                <div className="flex items-center gap-3 min-w-[180px] flex-1">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Trip Progress</p>
                    <p className="text-xl font-bold text-[#E8450F] leading-tight">{trip.status === 'Cancelled' ? '—' : `${stageProgress}%`}</p>
                  </div>
                  <Progress
                    value={trip.status === 'Cancelled' ? 0 : stageProgress}
                    className="h-1.5 flex-1 [&_[data-slot=progress-track]]:bg-orange-100 [&_[data-slot=progress-indicator]]:bg-[#E8450F]"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
                  {miniStats.map((s) => (
                    <div key={s.label} className="text-xs">
                      <span className="text-slate-400">{s.label}: </span>
                      <span className="font-semibold text-slate-900">{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Map + Activity */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
              <div className="xl:col-span-8">
                <TripLiveMapCard
                  tripId={trip.id}
                  refId={trip.ref_id || trip.id}
                  pickupLat={pickup?.location_lat}
                  pickupLng={pickup?.location_lng}
                  dropoffLat={dropoff?.location_lat}
                  dropoffLng={dropoff?.location_lng}
                />
              </div>

              <Card className="xl:col-span-4 rounded-3xl border border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-slate-900">Activity</CardTitle>
                    {trip.status === 'InTransit' && (
                      <Badge variant="outline" className="text-[10px] font-semibold border-[#E8450F]/30 bg-[#E8450F]/10 text-[#E8450F] gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E8450F] animate-pulse" /> Live
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {timelineSteps.map((step, i) => (
                    <div key={step.key} className="flex items-start gap-2.5">
                      <StepCircle status={timelineStatus[i]} />
                      <div className="min-w-0 -mt-0.5">
                        <p className={cn('text-xs font-semibold', timelineStatus[i] === 'pending' ? 'text-slate-400' : 'text-slate-900')}>
                          {step.label}
                        </p>
                        {step.time ? (
                          <p className="text-[11px] text-slate-500 mt-0.5">{shortDateTime(step.time)}</p>
                        ) : step.sub ? (
                          <p className={cn('text-[11px] mt-0.5', timelineStatus[i] === 'active' ? 'text-[#E8450F] font-semibold' : 'text-slate-400')}>{step.sub}</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ───────────────────────── Stops ───────────────────────── */}
          <TabsContent value="stops" className="mt-4">
            <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#E8450F]/10 text-[#E8450F] flex items-center justify-center shrink-0">
                    <MapPin size={14} />
                  </div>
                  Trip Stops Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(trip.stops || []).length === 0 ? (
                  <div className="text-center py-8">
                    <MapPin size={24} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-500">No stops on this manifest yet.</p>
                  </div>
                ) : (
                  <div className="relative border-l border-slate-200 ml-3 space-y-6">
                    {(trip.stops || []).map((stop) => {
                      const dwell = dwellMinutes(stop);
                      return (
                      <div key={stop.id} className="relative pl-6">
                        <div className={cn(
                          'absolute -left-[7px] top-1.5 w-3.5 h-3.5 rounded-full border-2',
                          stop.actual_arrival
                            ? 'bg-emerald-500 border-white'
                            : stop.id === nextStopId
                              ? 'bg-[#E8450F] border-white'
                              : 'bg-white border-slate-200',
                        )} />
                        <div>
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <p className="text-[13px] font-semibold text-slate-900">{stop.stop_type} Stop ({stop.stop_sequence})</p>
                            {stop.actual_arrival && (
                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                Checked-in
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {stop.location_name || `Lat: ${stop.location_lat}, Lng: ${stop.location_lng}`}
                          </p>
                          <div className="flex gap-4 mt-2 text-[10px] text-slate-500 font-medium flex-wrap">
                            {stop.planned_arrival && (
                              <span className="flex items-center gap-1"><Calendar size={10} /> Planned: {new Date(stop.planned_arrival).toLocaleString()}</span>
                            )}
                            {stop.actual_arrival && (
                              <span className="flex items-center gap-1 text-emerald-600"><Clock size={10} /> Actual: {new Date(stop.actual_arrival).toLocaleString()}</span>
                            )}
                            {stop.actual_departure && (
                              <span className="flex items-center gap-1"><Clock size={10} /> Left: {new Date(stop.actual_departure).toLocaleString()}</span>
                            )}
                            {dwell !== null && (
                              <span className="flex items-center gap-1 font-semibold text-slate-900"><Timer size={10} /> Dwell: {formatDelay(dwell)}</span>
                            )}
                          </div>

                          {(() => {
                            const late = arrivalDelayMinutes(stop);
                            if (late === null) return null;
                            const isFormOpen = delayFormStopId === stop.id;

                            return (
                              <div className="mt-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                  <span className="text-[11px] font-semibold text-amber-800">
                                    Arrived {formatDelay(late)} late
                                  </span>
                                  {!isFormOpen && (
                                    <button
                                      type="button"
                                      onClick={() => openDelayForm(stop)}
                                      className="text-[10px] font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-700"
                                    >
                                      {stop.delay_reason ? 'Change reason' : 'Add reason'}
                                    </button>
                                  )}
                                </div>

                                {stop.delay_reason && !isFormOpen && (
                                  <div className="flex items-center justify-between gap-2 mt-1 flex-wrap">
                                    <p className="text-[11px] text-amber-900">
                                      {DELAY_REASON_LABELS[stop.delay_reason]}
                                      {stop.delay_note ? ` — ${stop.delay_note}` : ''}
                                    </p>
                                    {stop.delay_logged_by && (
                                      <span className="text-[10px] text-amber-700">
                                        by <UserChip userId={stop.delay_logged_by} users={users} size="sm" />
                                      </span>
                                    )}
                                  </div>
                                )}
                                {!stop.delay_reason && !isFormOpen && (
                                  <p className="text-[10px] text-amber-700 mt-1">
                                    No reason recorded yet.
                                  </p>
                                )}

                                {isFormOpen && (
                                  <div className="mt-2 space-y-2">
                                    <Select value={delayReason} onValueChange={(v) => setDelayReason(v as DelayReason)}>
                                      <SelectTrigger className="w-full h-8 bg-white border-amber-300 text-[11px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {DELAY_REASONS.map((r) => (
                                          <SelectItem key={r} value={r} className="text-xs">{DELAY_REASON_LABELS[r]}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                    <input
                                      type="text"
                                      value={delayNote}
                                      onChange={(e) => setDelayNote(e.target.value)}
                                      maxLength={500}
                                      placeholder="Note (optional)"
                                      className="w-full h-8 rounded border border-amber-300 bg-white px-2 text-[11px] outline-none focus:border-amber-500"
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        disabled={logDelayMutation.isPending}
                                        onClick={() => logDelayMutation.mutate({
                                          stopId: stop.id,
                                          delay_reason: delayReason,
                                          delay_note: delayNote.trim() || undefined,
                                        })}
                                        className="h-7 px-3 rounded bg-amber-600 text-white text-[10px] font-bold hover:bg-amber-700 disabled:opacity-50"
                                      >
                                        {logDelayMutation.isPending ? 'Saving…' : 'Save reason'}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setDelayFormStopId(null)}
                                        className="h-7 px-3 rounded border border-amber-300 text-amber-900 text-[10px] font-bold hover:bg-amber-100"
                                      >
                                        Cancel
                                      </button>
                                    </div>
                                    {logDelayMutation.isError && (
                                      <p className="text-[10px] text-red-600">
                                        Could not save that reason. Try again.
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    );})}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ───────────────────────── Documents ───────────────────────── */}
          <TabsContent value="documents" className="mt-4">
            <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#E8450F]/10 text-[#E8450F] flex items-center justify-center shrink-0">
                    <FileStack size={14} />
                  </div>
                  Documents
                </CardTitle>
                <CardDescription className="text-[11px] mt-0.5">POD, waybills, and other files attached to this trip.</CardDescription>
                <CardAction>
                  <Btn
                    label="Upload"
                    variant="secondary"
                    size="sm"
                    icon={<UploadCloud size={13} />}
                    onClick={() => { setUploadDocType(trip.status === 'Completed' ? 'POD' : undefined); setIsUploadModalOpen(true); }}
                  />
                </CardAction>
              </CardHeader>
              <CardContent>
                {isLoadingDocs ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-6">
                    <FileText size={22} className="text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-500">No documents uploaded for this trip yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-[#E8450F]/10 text-[#E8450F] flex items-center justify-center shrink-0">
                            <FileText size={14} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">{docTypeLabel(doc.doc_type)}</p>
                            <p className="text-[10px] text-slate-500">{new Date(doc.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <StatusBadge status={doc.status} />
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-[#E8450F] p-1"
                            aria-label="View document"
                          >
                            <ExternalLink size={13} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ───────────────────────── Audit ───────────────────────── */}
          <TabsContent value="audit" className="mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium uppercase tracking-wide text-slate-500 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-[#E8450F]/10 text-[#E8450F] flex items-center justify-center shrink-0">
                      <ReceiptText size={12} />
                    </div>
                    Invoice
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {invoice ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-base font-semibold text-slate-900">{invoice.ref_id}</p>
                        <p className="text-xs text-slate-500 mt-0.5">SAR {invoice.total_amount.toLocaleString()}</p>
                        <div className="mt-1.5"><StatusBadge status={invoice.status} /></div>
                      </div>
                      <Btn label="View" variant="ghost" size="sm" onClick={() => navigate(`/invoices/${invoice.id}`)} />
                    </div>
                  ) : (
                    <p className="text-xs font-medium text-slate-500">No invoice generated yet.</p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium uppercase tracking-wide text-slate-500 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                      <PackageCheck size={12} />
                    </div>
                    Audit Trail
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">Created by</span>
                    <UserChip userId={trip.created_by} users={users} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">Created</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="text-[11px] font-semibold text-slate-900 cursor-default">
                          {new Date(trip.createdAt).toLocaleDateString()}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{new Date(trip.createdAt).toLocaleString()}</TooltipContent>
                    </Tooltip>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">Last updated by</span>
                    <UserChip userId={trip.updated_by} users={users} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 font-medium">Updated</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="text-[11px] font-semibold text-slate-900 cursor-default">
                          {new Date(trip.updatedAt).toLocaleDateString()}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{new Date(trip.updatedAt).toLocaleString()}</TooltipContent>
                    </Tooltip>
                  </div>
                </CardContent>
              </Card>

              {trip.vehicle && (
                <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium uppercase tracking-wide text-slate-500 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                        <Truck size={12} />
                      </div>
                      Assigned Vehicle
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-base font-semibold text-slate-900">{trip.vehicle.plate_number}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {trip.vehicle.asset_type} Asset{trip.vehicle.capacity_kg != null ? ` • ${trip.vehicle.capacity_kg.toLocaleString()} kg` : ''}
                        </p>
                        <Badge variant="outline" className={cn('mt-1.5 text-[10px] font-semibold', trip.vehicle.icces_device_id ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500')}>
                          {trip.vehicle.icces_device_id ? 'GPS tracker connected' : 'No GPS tracker'}
                        </Badge>
                      </div>
                      <Btn label="View" variant="ghost" size="sm" onClick={() => navigate(`/vehicles/${trip.vehicle?.id}`)} />
                    </div>
                  </CardContent>
                </Card>
              )}

              {trip.customer && (
                <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm md:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-medium uppercase tracking-wide text-slate-500 flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Building2 size={12} />
                      </div>
                      Customer
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-base font-semibold text-slate-900">{trip.customer.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{trip.customer.contact_phone}</p>
                      </div>
                      <Btn label="View" variant="ghost" size="sm" onClick={() => navigate(`/customers/${trip.customer?.id}`)} />
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Status Confirmation Modal */}
      <ConfirmModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Update Trip Status"
        message={`Are you sure you want to transition this trip status to ${nextStatus}?`}
        confirmLabel="Yes, Update"
        isLoading={updateStatusMutation.isPending}
        onConfirm={() => {
          updateStatusMutation.mutate(nextStatus);
        }}
      />

      {/* Cancel Trip Modal */}
      <ConfirmModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel This Trip?"
        message="This releases the assigned driver and vehicle back to Available. This cannot be undone."
        confirmLabel="Yes, Cancel Trip"
        isDestructive
        isLoading={updateStatusMutation.isPending}
        onConfirm={() => updateStatusMutation.mutate('Cancelled')}
      />

      {/* Upload Document Modal */}
      {trip && (
        <UploadDocumentModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          entityType="Trip"
          entityId={trip.id}
          docType={uploadDocType}
          onUploadSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['trip', id] });
            queryClient.invalidateQueries({ queryKey: ['documents', 'Trip', id] });
          }}
        />
      )}
    </DashboardLayout>
  );
}

function StepCircle({ status }: { status: StepStatus }) {
  if (status === 'done') {
    return (
      <span className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
        <Check size={12} strokeWidth={3} />
      </span>
    );
  }
  if (status === 'active') {
    return (
      <span className="w-5 h-5 rounded-full border-2 border-[#E8450F] bg-white flex items-center justify-center shrink-0">
        <span className="w-2 h-2 rounded-full bg-[#E8450F]" />
      </span>
    );
  }
  return <span className="w-5 h-5 rounded-full border-2 border-slate-200 bg-white shrink-0" />;
}
