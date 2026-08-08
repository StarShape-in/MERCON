import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronRight, ChevronDown, Copy, Check, Printer,
  Navigation, CheckCircle2, XCircle, RefreshCcw,
  MapPin, Calendar, Clock, ReceiptText, FileStack, PackageCheck,
  Building2, User as UserIcon, Truck, FileText,
  UploadCloud, ExternalLink, Timer, Route, Gauge, Layers,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

type StepStatus = 'done' | 'active' | 'pending';

function connectorColor(a: StepStatus, b: StepStatus): string {
  if (a === 'done' && b !== 'pending') return 'bg-emerald-500';
  if (b === 'active') return 'bg-[#E8450F]';
  return 'bg-slate-200';
}

export default function TripDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const users = useUserLookup();

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
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <Skeleton className="h-64 w-full rounded-3xl" />
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <Skeleton className="xl:col-span-4 h-80 w-full rounded-3xl" />
            <Skeleton className="xl:col-span-8 h-80 w-full rounded-3xl" />
          </div>
          <Skeleton className="h-24 w-full rounded-3xl" />
          <Skeleton className="h-40 w-full rounded-3xl" />
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
  // vehicle are assigned — otherwise assign them first via the cards below.
  const rawNextStatus = getNextStatus(trip.status);
  const nextStatusOption =
    rawNextStatus === 'Dispatched' && (!trip.driver || !trip.vehicle) ? null : rawNextStatus;

  const canCancel = !['Completed', 'Invoiced', 'Cancelled'].includes(trip.status);
  const isClosed = ['Completed', 'Invoiced', 'Cancelled'].includes(trip.status);
  const pickup = trip.stops?.find((s) => s.stop_type === 'Pickup');
  const dropoff = trip.stops?.find((s) => s.stop_type === 'Dropoff');
  const invoice = trip.invoices?.[0];

  // Overall trip progress, for the hero panel — Cancelled is its own dead-end state, not a stage.
  const stageIndex = STAGE_ORDER.indexOf(trip.status);
  const stageProgress = stageIndex >= 0 ? Math.round((stageIndex / (STAGE_ORDER.length - 1)) * 100) : 0;
  const pickupDone = !!pickup?.actual_arrival;
  const dropoffDone = !!dropoff?.actual_arrival;
  const nextStopId = (trip.stops || []).find((s) => !s.actual_arrival)?.id;

  // KPI strip — every value is computed from real trip fields, never invented.
  const estDurationMinutes = trip.planned_start && trip.planned_end
    ? Math.round((new Date(trip.planned_end).getTime() - new Date(trip.planned_start).getTime()) / 60000)
    : null;
  const elapsedMinutes = trip.actual_start
    ? Math.round((new Date(trip.actual_end || new Date()).getTime() - new Date(trip.actual_start).getTime()) / 60000)
    : null;
  const avgSpeedKmh = trip.planned_distance && elapsedMinutes && elapsedMinutes > 0
    ? Math.round((trip.planned_distance / (elapsedMinutes / 60)) * 10) / 10
    : null;
  const billingAmount = invoice?.total_amount ?? trip.billing_amount ?? null;

  const kpis: { icon: typeof MapPin; label: string; value: string; sub?: string; tone: 'orange' | 'emerald' | 'slate' }[] = [
    { icon: Route, label: 'Distance', value: trip.planned_distance != null ? `${trip.planned_distance} km` : '—', tone: 'orange' },
    { icon: Clock, label: 'Estimated Duration', value: estDurationMinutes != null ? formatDelay(estDurationMinutes) : '—', tone: 'slate' },
    { icon: Timer, label: 'Elapsed', value: elapsedMinutes != null ? formatDelay(elapsedMinutes) : '—', sub: trip.actual_end ? 'Trip finished' : trip.actual_start ? 'In progress' : undefined, tone: 'emerald' },
    { icon: Layers, label: 'Stops', value: String(trip.stops?.length ?? 0), tone: 'slate' },
    { icon: Gauge, label: 'Average Speed', value: avgSpeedKmh != null ? `${avgSpeedKmh} km/h` : '—', tone: 'orange' },
    { icon: ReceiptText, label: 'Billing Amount', value: billingAmount != null ? `SAR ${billingAmount.toLocaleString()}` : '—', tone: 'slate' },
  ];

  // Live Timeline — 4 fixed lifecycle checkpoints, derived from real stop/status data.
  const timelineSteps: { key: string; label: string; time: string | null; sub?: string; done: boolean }[] = [
    { key: 'created', label: 'Trip Created', time: trip.createdAt, done: true },
    {
      key: 'departed',
      label: 'Departed from Pickup',
      time: pickup?.actual_departure || pickup?.actual_arrival || null,
      done: !!(pickup?.actual_departure || pickup?.actual_arrival),
    },
    {
      key: 'transit',
      label: 'In Transit',
      time: null,
      sub: 'On the way to destination',
      done: dropoffDone,
    },
    {
      key: 'arrived',
      label: dropoffDone ? 'Reached Destination' : 'Reached Destination (Expected)',
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

  return (
    <DashboardLayout active="Trips" title="Trip Details">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6 animate-fade-in">

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
              className="h-10 rounded-xl border-slate-200"
              onClick={() => navigate(`/trips/${trip.id}/edit`)}
            />
            <Btn
              label="Print"
              variant="outline"
              icon={<Printer size={14} />}
              className="h-10 rounded-xl border-slate-200"
              onClick={() => window.print()}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-10 rounded-xl bg-[#E8450F] hover:bg-[#C7380A] text-white font-semibold gap-1.5 px-4">
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
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <XCircle size={18} className="text-red-600 shrink-0" />
            <p className="text-xs font-bold text-red-700">This trip was cancelled. Its driver and vehicle were released back to Available.</p>
          </div>
        )}

        {/* Hero card */}
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm p-0 gap-0">
          <div className="grid grid-cols-1 xl:grid-cols-10">
            {/* Left ~70% */}
            <div className="xl:col-span-7 p-6 space-y-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-[#E8450F]/10 text-[#E8450F] flex items-center justify-center shrink-0">
                    <Truck size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Trip ID</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-lg font-semibold font-mono tracking-tight text-slate-900 truncate">{trip.ref_id || trip.id}</p>
                      <button
                        type="button"
                        onClick={handleCopyId}
                        aria-label="Copy trip ID"
                        className="text-slate-400 hover:text-[#E8450F] transition-colors shrink-0"
                      >
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-1.5">Status</p>
                  <StatusBadge status={trip.status} />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                <InfoBlock
                  icon={Building2}
                  tone="blue"
                  label="Customer"
                  value={trip.customer?.name || '—'}
                  sub={trip.customer?.contact_phone}
                />
                <InfoBlock
                  icon={UserIcon}
                  tone="purple"
                  label="Driver"
                  value={trip.driver ? `${trip.driver.first_name} ${trip.driver.last_name}` : 'Unassigned'}
                  sub={trip.driver?.phone_primary}
                />
                <InfoBlock
                  icon={Truck}
                  tone="green"
                  label="Vehicle"
                  value={trip.vehicle?.plate_number || 'Unassigned'}
                  sub={trip.vehicle?.asset_type}
                />
                <InfoBlock
                  icon={Calendar}
                  tone="slate"
                  label="Scheduled"
                  value={trip.planned_start ? new Date(trip.planned_start).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                  sub={trip.planned_start ? new Date(trip.planned_start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : undefined}
                />
              </div>
            </div>

            {/* Right ~30% — Trip Progress panel */}
            <div className="xl:col-span-3 p-6 xl:pl-0">
              <div className="bg-orange-50 rounded-2xl p-5 h-full flex flex-col justify-center gap-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Trip Progress</p>
                <p className="text-3xl font-bold text-[#E8450F]">{trip.status === 'Cancelled' ? '—' : `${stageProgress}%`}</p>
                <Progress
                  value={trip.status === 'Cancelled' ? 0 : stageProgress}
                  className="h-2 [&_[data-slot=progress-track]]:bg-orange-200 [&_[data-slot=progress-indicator]]:bg-[#E8450F]"
                />
                <div className="pt-1 space-y-1.5">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {(pickup?.location_name || 'Pickup')} → {(dropoff?.location_name || 'Drop-off')}
                  </p>
                  <p className="text-xs text-slate-500">
                    ETA: {trip.planned_end ? new Date(trip.planned_end).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Route section */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <Card className="xl:col-span-4 rounded-3xl border border-slate-200 bg-white shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-base font-semibold text-slate-900">Route</CardTitle>
              <Btn
                label="View Full Map"
                variant="outline"
                size="sm"
                className="rounded-xl border-slate-200"
                onClick={() => navigate(`/trips/${trip.id}/track`)}
              />
            </CardHeader>
            <CardContent>
              <div className="space-y-8">
                <div className="relative pl-8">
                  <span className="absolute left-0 top-0.5 w-5 h-5 rounded-full bg-emerald-500 border-4 border-emerald-100 flex items-center justify-center" />
                  {pickup && (
                    <span className="absolute left-[9px] top-6 bottom-[-2rem] w-px border-l-2 border-dashed border-slate-200" />
                  )}
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Pickup Location</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {pickup ? (pickup.location_name || `${pickup.location_lat.toFixed(4)}, ${pickup.location_lng.toFixed(4)}`) : 'No pickup stop on manifest'}
                  </p>
                  {pickup && (
                    <p className="text-xs text-slate-500 mt-1">
                      {pickup.actual_arrival
                        ? `Arrived ${new Date(pickup.actual_arrival).toLocaleString()}`
                        : pickup.planned_arrival
                          ? `Planned ${new Date(pickup.planned_arrival).toLocaleString()}`
                          : '—'}
                    </p>
                  )}
                </div>

                <div className="relative pl-8">
                  <span className="absolute left-0 top-0.5 w-5 h-5 rounded-full bg-[#E8450F] border-4 border-orange-100 flex items-center justify-center" />
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Drop-off Location</p>
                  <p className="text-sm font-semibold text-slate-900 mt-1">
                    {dropoff ? (dropoff.location_name || `${dropoff.location_lat.toFixed(4)}, ${dropoff.location_lng.toFixed(4)}`) : 'No dropoff stop on manifest'}
                  </p>
                  {dropoff && (
                    <p className="text-xs text-slate-500 mt-1">
                      {dropoff.actual_arrival
                        ? `Arrived ${new Date(dropoff.actual_arrival).toLocaleString()}`
                        : dropoff.planned_arrival
                          ? `Expected ${new Date(dropoff.planned_arrival).toLocaleString()}`
                          : '—'}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

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
        </div>

        {/* KPI metrics strip */}
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm p-0 gap-0">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 divide-y divide-slate-100 xl:divide-y-0 xl:divide-x">
            {kpis.map((kpi) => (
              <div key={kpi.label} className="p-5 flex flex-col gap-2">
                <div className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center',
                  kpi.tone === 'orange' && 'bg-[#E8450F]/10 text-[#E8450F]',
                  kpi.tone === 'emerald' && 'bg-emerald-50 text-emerald-600',
                  kpi.tone === 'slate' && 'bg-slate-100 text-slate-500',
                )}>
                  <kpi.icon size={16} />
                </div>
                <p className="text-xs text-slate-500">{kpi.label}</p>
                <p className="text-lg font-bold text-slate-900">{kpi.value}</p>
                {kpi.sub && <p className="text-[11px] text-slate-400">{kpi.sub}</p>}
              </div>
            ))}
          </div>
        </Card>

        {/* Live Timeline */}
        <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-slate-900">Live Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Horizontal — sm and up */}
            <div className="hidden sm:flex items-start">
              {timelineSteps.map((step, i) => (
                <div key={step.key} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center text-center w-32 shrink-0">
                    <StepCircle status={timelineStatus[i]} />
                    <p className={cn('text-xs font-semibold mt-2', timelineStatus[i] === 'pending' ? 'text-slate-400' : 'text-slate-900')}>
                      {step.label}
                    </p>
                    {step.time ? (
                      <p className="text-[11px] text-slate-500 mt-0.5">{new Date(step.time).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    ) : step.sub ? (
                      <p className={cn('text-[11px] mt-0.5', timelineStatus[i] === 'active' ? 'text-[#E8450F] font-semibold' : 'text-slate-400')}>{step.sub}</p>
                    ) : null}
                  </div>
                  {i < timelineSteps.length - 1 && (
                    <div className={cn('h-0.5 flex-1 mt-[9px] rounded-full', connectorColor(timelineStatus[i], timelineStatus[i + 1]))} />
                  )}
                </div>
              ))}
            </div>

            {/* Vertical — mobile */}
            <div className="sm:hidden space-y-6">
              {timelineSteps.map((step, i) => (
                <div key={step.key} className="relative pl-8">
                  <StepCircle status={timelineStatus[i]} className="absolute left-0 top-0" />
                  {i < timelineSteps.length - 1 && (
                    <span className={cn('absolute left-[9px] top-5 bottom-[-1.5rem] w-0.5 rounded-full', connectorColor(timelineStatus[i], timelineStatus[i + 1]))} />
                  )}
                  <p className={cn('text-xs font-semibold', timelineStatus[i] === 'pending' ? 'text-slate-400' : 'text-slate-900')}>
                    {step.label}
                  </p>
                  {step.time ? (
                    <p className="text-[11px] text-slate-500 mt-0.5">{new Date(step.time).toLocaleString()}</p>
                  ) : step.sub ? (
                    <p className={cn('text-[11px] mt-0.5', timelineStatus[i] === 'active' ? 'text-[#E8450F] font-semibold' : 'text-slate-400')}>{step.sub}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Assignment, invoice & audit trail */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Driver Card */}
          <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-slate-500 flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                  <UserIcon size={12} />
                </div>
                Assigned Driver
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trip.driver ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{trip.driver.first_name} {trip.driver.last_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{trip.driver.phone_primary}</p>
                    </div>
                    <Btn label="View" variant="ghost" size="sm" onClick={() => navigate(`/drivers/${trip.driver?.id}`)} />
                  </div>

                  {!isClosed && (
                    isReplaceDriverOpen ? (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <Combobox
                          value={replaceDriverId}
                          onChange={setReplaceDriverId}
                          options={driverOptions}
                          placeholder="Choose replacement driver..."
                          searchPlaceholder="Search drivers..."
                          emptyText="No available drivers found."
                        />
                        <div className="flex gap-2">
                          <Btn
                            label={replaceDriverMutation.isPending ? 'Replacing...' : 'Confirm Swap'}
                            size="sm"
                            className="flex-1"
                            disabled={!replaceDriverId || replaceDriverMutation.isPending}
                            onClick={() => replaceDriverMutation.mutate(replaceDriverId)}
                          />
                          <Btn
                            label="Cancel"
                            variant="secondary"
                            size="sm"
                            onClick={() => { setIsReplaceDriverOpen(false); setReplaceDriverId(''); }}
                          />
                        </div>
                        {replaceDriverMutation.isError && (
                          <p className="text-[11px] text-red-600 font-semibold">Could not replace driver — they may no longer be available.</p>
                        )}
                      </div>
                    ) : (
                      <Btn
                        label="Replace Driver"
                        variant="outline"
                        size="sm"
                        icon={<RefreshCcw size={12} />}
                        className="w-full rounded-xl border-slate-200"
                        onClick={() => setIsReplaceDriverOpen(true)}
                      />
                    )
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500">No driver assigned yet.</p>
                  <Combobox
                    value={pendingDriverId}
                    onChange={setPendingDriverId}
                    options={driverOptions}
                    placeholder="Choose available driver..."
                    searchPlaceholder="Search drivers..."
                    emptyText="No available drivers found."
                  />
                  <Btn
                    label={assignMutation.isPending ? 'Assigning...' : 'Assign Driver'}
                    size="sm"
                    className="w-full"
                    disabled={!pendingDriverId || assignMutation.isPending}
                    onClick={() => assignMutation.mutate({ driver_id: pendingDriverId })}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vehicle Card */}
          <Card className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wide text-slate-500 flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <Truck size={12} />
                </div>
                Assigned Vehicle
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trip.vehicle ? (
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
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-slate-500">No vehicle assigned yet.</p>
                  <Combobox
                    value={pendingVehicleId}
                    onChange={setPendingVehicleId}
                    options={vehicleOptions}
                    placeholder="Choose available vehicle..."
                    searchPlaceholder="Search vehicles..."
                    emptyText="No available vehicles found."
                  />
                  <Btn
                    label={assignMutation.isPending ? 'Assigning...' : 'Assign Vehicle'}
                    size="sm"
                    className="w-full"
                    disabled={!pendingVehicleId || assignMutation.isPending}
                    onClick={() => assignMutation.mutate({ vehicle_id: pendingVehicleId })}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Invoice */}
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

          {/* Audit Trail */}
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
        </div>

        {/* Trip Stops Log */}
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

        {/* Documents */}
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

function InfoBlock({
  icon: Icon,
  tone,
  label,
  value,
  sub,
}: {
  icon: typeof Building2;
  tone: 'blue' | 'purple' | 'green' | 'slate';
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="min-w-0">
      <div className={cn(
        'w-8 h-8 rounded-lg flex items-center justify-center mb-2',
        tone === 'blue' && 'bg-blue-50 text-blue-600',
        tone === 'purple' && 'bg-violet-50 text-violet-600',
        tone === 'green' && 'bg-emerald-50 text-emerald-600',
        tone === 'slate' && 'bg-slate-100 text-slate-500',
      )}>
        <Icon size={15} />
      </div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-base font-semibold text-slate-900 truncate mt-0.5">{value}</p>
      {sub && <p className="text-xs text-slate-500 truncate mt-0.5">{sub}</p>}
    </div>
  );
}

function StepCircle({ status, className }: { status: StepStatus; className?: string }) {
  if (status === 'done') {
    return (
      <span className={cn('w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0', className)}>
        <Check size={12} strokeWidth={3} />
      </span>
    );
  }
  if (status === 'active') {
    return (
      <span className={cn('w-5 h-5 rounded-full border-2 border-[#E8450F] bg-white flex items-center justify-center shrink-0', className)}>
        <span className="w-2 h-2 rounded-full bg-[#E8450F]" />
      </span>
    );
  }
  return <span className={cn('w-5 h-5 rounded-full border-2 border-slate-200 bg-white shrink-0', className)} />;
}
