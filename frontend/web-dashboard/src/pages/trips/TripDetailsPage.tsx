import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronRight, ChevronDown, Copy, Check, Printer, Phone, RefreshCcw,
  Navigation, CheckCircle2, XCircle, AlertTriangle, ListChecks,
  Calendar, ReceiptText, FileStack, PackageCheck, Gauge,
  Building2, User as UserIcon, Truck, FileText, Route as RouteIcon,
  UploadCloud, ExternalLink, Timer, MapPin, ArrowRight, SquarePen, MessageCircle, UserCheck, History,
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
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import TripLiveMapCard from '@/components/maps/TripLiveMapCard';
import UserChip, { useUserLookup } from '@/components/trips/UserChip';
import {
  tripService, TripStatus,
  type TripStop,
} from '@/services/tripService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { documentService, type DocType } from '@/services/documentService';
import { docTypeLabel } from '@/lib/documents';
import { cn } from '@/lib/utils';

/** Matches DELAY_THRESHOLD_MINUTES on the server. Below this, lateness is
 *  ordinary variance and showing it would bury the delays that matter. */
const DELAY_THRESHOLD_MINUTES = 30;

/** Trip lifecycle stages in order, for the progress %. Cancelled isn't a
 *  stage on this line — it's a separate dead-end handled on its own. */
const STAGE_ORDER: TripStatus[] = ['Draft', 'Dispatched', 'AtPickup', 'InTransit', 'AtDelivery', 'Completed', 'Invoiced'];

function formatDelay(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function fullDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Same semantic mapping StatusBadge uses (success/warning/info/error/purple
 *  design tokens), just rendered as a larger pill for the hero row. */
function statusTone(status: string): { color: string; bg: string } {
  const normalized = status.toLowerCase().replace(/\s+/g, '');
  switch (normalized) {
    case 'completed':
    case 'invoiced':
      return { color: 'var(--color-success)', bg: 'var(--color-success-bg)' };
    case 'intransit':
    case 'dispatched':
    case 'atpickup':
    case 'atdelivery':
      return { color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' };
    case 'draft':
      return { color: 'var(--color-info)', bg: 'var(--color-info-bg)' };
    case 'cancelled':
      return { color: 'var(--color-purple)', bg: 'var(--color-purple-bg)' };
    default:
      return { color: 'var(--color-subtle)', bg: 'var(--color-border-soft)' };
  }
}

function statusLabel(status: string): string {
  return status.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase();
}

type StepStatus = 'done' | 'active' | 'pending';

export default function TripDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const users = useUserLookup();

  const [docTab, setDocTab] = useState<'documents' | 'invoice' | 'rate-card'>('documents');
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<TripStatus>('Draft');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadDocType, setUploadDocType] = useState<DocType | undefined>(undefined);
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

  const handleShareWhatsApp = () => {
    if (!trip) return;
    const pickupLoc = pickup?.location_name || 'Pickup location';
    const dropoffLoc = dropoff?.location_name || 'Drop-off location';
    const driverName = trip.driver ? `${trip.driver.first_name} ${trip.driver.last_name}` : 'Unassigned';
    const vehicleInfo = trip.vehicle ? trip.vehicle.plate_number : 'Unassigned';
    const etaText = trip.planned_end
      ? new Date(trip.planned_end).toLocaleString(undefined, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      : '—';

    const text = [
      `🚚 *MERCON Logistics - Trip Status Update*`,
      ``,
      `*Trip ID:* ${trip.ref_id || trip.id}`,
      `*Customer:* ${trip.customer?.name || 'Customer'}`,
      `*Status:* ${statusLabel(trip.status)}`,
      ``,
      `📍 *Pickup:* ${pickupLoc}`,
      `🎯 *Drop-off:* ${dropoffLoc}`,
      `⏱️ *ETA:* ${etaText}`,
      ``,
      `👤 *Driver:* ${driverName}`,
      `🚛 *Vehicle:* ${vehicleInfo}`,
      ``,
      `Thank you for shipping with MERCON Logistics!`,
    ].join('\n');

    const cleanPhone = trip.customer?.contact_phone?.replace(/[^0-9]/g, '');
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  if (isLoading || !trip) {
    return (
      <DashboardLayout active="Trips" title="Trip Details">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 -mt-3 sm:-mt-4 pb-6 space-y-4">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4">
            <div className="space-y-4">
              <Skeleton className="h-40 w-full rounded-2xl" />
              <Skeleton className="h-80 w-full rounded-2xl" />
              <Skeleton className="h-60 w-full rounded-2xl" />
            </div>
            <div className="space-y-4">
              <Skeleton className="h-64 w-full rounded-2xl" />
              <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
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

  const sidebarStats: { icon: typeof RouteIcon; tone: string; label: string; value: string }[] = [
    { icon: RouteIcon, tone: 'bg-rose-50 text-rose-500', label: 'Distance', value: trip.planned_distance != null ? `${trip.planned_distance} km` : '—' },
    { icon: Timer, tone: 'bg-emerald-50 text-emerald-600', label: 'Elapsed', value: elapsedMinutes != null ? formatDelay(elapsedMinutes) : (estDurationMinutes != null ? formatDelay(estDurationMinutes) : '—') },
    { icon: Gauge, tone: 'bg-blue-50 text-blue-600', label: 'Avg. Speed', value: avgSpeedKmh != null ? `${avgSpeedKmh} km/h` : '—' },
  ];

  // Activity checkpoints — 4 fixed lifecycle stages, derived from real stop/status data.
  const timelineSteps: { key: string; label: string; time: string | null; sub?: string; done: boolean }[] = [
    { key: 'created', label: 'Trip created', time: trip.createdAt, done: true },
    {
      key: 'departed',
      label: 'Departed from pickup',
      time: pickup?.actual_departure || pickup?.actual_arrival || null,
      done: !!(pickup?.actual_departure || pickup?.actual_arrival),
    },
    { key: 'transit', label: 'In transit', time: null, sub: 'On the way to destination', done: dropoffDone },
    {
      key: 'arrived',
      label: dropoffDone ? 'Reached destination' : 'Expected arrival',
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

  const tone = statusTone(trip.status);

  return (
    <DashboardLayout active="Trips" title="Trip Details">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 -mt-3 sm:-mt-4 pb-6 space-y-4 animate-fade-in">

        {/* Breadcrumb + action bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-1 border-b border-black/[0.08] dark:border-slate-800/80">
          <div className="flex items-center gap-2 text-sm min-w-0">
            <Link to="/trips" className="text-[#6E6E80] font-semibold hover:text-[#111] dark:hover:text-white transition-colors">Trips</Link>
            <ChevronRight size={15} className="text-[#9898A4] shrink-0" />
            <span className="text-[#111] dark:text-slate-100 font-bold truncate">Trip Details</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/trips/${trip.id}/edit`)}
              className="h-8.5 px-3.5 rounded-lg text-xs font-semibold text-[#111] dark:text-slate-200 border border-black/[0.12] dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-black/[0.03] dark:hover:bg-slate-800 shadow-2xs transition-all active:scale-[0.98] gap-1.5 cursor-pointer"
            >
              <SquarePen className="w-3.5 h-3.5 text-[#6E6E80]" />
              Edit Trip
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShareWhatsApp}
              className="h-8.5 px-3.5 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/70 dark:hover:bg-emerald-950/60 shadow-2xs transition-all active:scale-[0.98] gap-1.5 cursor-pointer"
              title="Share status update via WhatsApp"
            >
              <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Share to WhatsApp
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-8.5 px-3.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-bold gap-1.5 shadow-2xs transition-all active:scale-[0.98] cursor-pointer">
                  More Actions
                  <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                {trip.status === 'InTransit' && (
                  <DropdownMenuItem onClick={() => navigate(`/trips/${trip.id}/track`)}>
                    <Navigation size={14} className="mr-2 text-[#6E6E80]" /> Track Live
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => { setUploadDocType(trip.status === 'Completed' ? 'POD' : undefined); setIsUploadModalOpen(true); }}>
                  <UploadCloud size={14} className="mr-2 text-[#6E6E80]" /> Upload Document
                </DropdownMenuItem>
                {nextStatusOption && (
                  <DropdownMenuItem onClick={() => { setNextStatus(nextStatusOption); setIsStatusModalOpen(true); }}>
                    <CheckCircle2 size={14} className="mr-2 text-[#6E6E80]" /> Mark {nextStatusOption}
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

        {/* Main 2-column layout: content + persistent sidebar */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-4 items-start">

          {/* ───────────────────────── Left: content ───────────────────────── */}
          <div className="space-y-4 min-w-0">

            {/* Trip ID / status / audit info / customer-driver-vehicle-eta */}
            <Card className="rounded-xl border border-black/[0.12] bg-white p-6 gap-0">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                    <Truck size={20} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#9898A4]">Trip ID</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xl font-bold font-mono tracking-tight text-[#111] truncate">{trip.ref_id || trip.id}</p>
                      <button type="button" onClick={handleCopyId} aria-label="Copy trip ID" className="text-[#9898A4] hover:text-brand transition-colors shrink-0">
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Audit Trail Metadata - simple with dotted borders */}
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dotted border-black/20 dark:border-slate-700 text-xs bg-black/[0.01] dark:bg-slate-900/40">
                    <span className="text-[11px] font-medium text-[#9898A4]">Created:</span>
                    <UserChip userId={trip.created_by} users={users} size="sm" className="font-semibold text-[#111] dark:text-slate-200 decoration-slate-400" />
                    <span className="text-[10px] text-[#9898A4]">•</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="text-[11px] font-medium text-[#111] dark:text-slate-300 cursor-default">
                          {new Date(trip.createdAt).toLocaleDateString()}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{new Date(trip.createdAt).toLocaleString()}</TooltipContent>
                    </Tooltip>
                  </div>

                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dotted border-black/20 dark:border-slate-700 text-xs bg-black/[0.01] dark:bg-slate-900/40">
                    <span className="text-[11px] font-medium text-[#9898A4]">Updated:</span>
                    <UserChip userId={trip.updated_by} users={users} size="sm" className="font-semibold text-[#111] dark:text-slate-200 decoration-slate-400" />
                    <span className="text-[10px] text-[#9898A4]">•</span>
                    <Tooltip>
                      <TooltipTrigger>
                        <span className="text-[11px] font-medium text-[#111] dark:text-slate-300 cursor-default">
                          {new Date(trip.updatedAt).toLocaleDateString()}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>{new Date(trip.updatedAt).toLocaleString()}</TooltipContent>
                    </Tooltip>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#9898A4] mb-1.5">Status</p>
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                    style={{ color: tone.color, backgroundColor: tone.bg }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tone.color }} />
                    {statusLabel(trip.status)}
                  </span>
                </div>
              </div>

              <Separator className="my-5" />

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-6">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                    <Building2 size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#9898A4]">Customer</p>
                    <p className="text-sm font-semibold text-[#111] truncate mt-0.5">{trip.customer?.name || '—'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                    <UserIcon size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#9898A4]">Driver</p>
                      {trip.driver && !isClosed && (
                        <Popover open={isReplaceDriverOpen} onOpenChange={(open) => { setIsReplaceDriverOpen(open); if (!open) setReplaceDriverId(''); }}>
                          <PopoverTrigger asChild>
                            <button type="button" aria-label="Replace driver" className="text-[#9898A4] hover:text-brand transition-colors shrink-0">
                              <RefreshCcw size={10} />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-72 p-3 space-y-2">
                            <p className="text-xs font-semibold text-[#111]">Replace driver</p>
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
                    <p className="text-sm font-semibold text-[#111] truncate mt-0.5">
                      {trip.driver ? `${trip.driver.first_name} ${trip.driver.last_name}` : 'Unassigned'}
                    </p>
                    {trip.driver?.phone_primary && <p className="text-xs text-[#6E6E80] truncate">{trip.driver.phone_primary}</p>}
                  </div>
                </div>

                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Truck size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#9898A4]">Vehicle</p>
                    <p className="text-sm font-semibold text-[#111] truncate mt-0.5">{trip.vehicle?.plate_number || 'Unassigned'}</p>
                    {trip.vehicle?.asset_type && <p className="text-xs text-[#6E6E80] truncate">{trip.vehicle.asset_type}</p>}
                  </div>
                </div>

                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <ReceiptText size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#9898A4]">Rate & Price</p>
                    <p className="text-sm font-bold text-[#111] font-mono truncate mt-0.5">
                      {(trip.billing_amount ?? trip.trip_charges ?? trip.rateCard?.base_price)
                        ? `${trip.rateCard?.currency || 'SAR'} ${Number(trip.billing_amount ?? trip.trip_charges ?? trip.rateCard?.base_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : '—'}
                    </p>
                    <p className="text-xs text-[#6E6E80] truncate" title={trip.rateCard?.name || 'Manual / Fixed Rate'}>
                      {trip.rateCard?.name || 'Manual Rate'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-black/[0.05] text-[#6E6E80] flex items-center justify-center shrink-0">
                    <Calendar size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#9898A4]">ETA</p>
                    <p className="text-sm font-semibold text-[#111] truncate mt-0.5">
                      {trip.planned_end ? new Date(trip.planned_end).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </p>
                    {trip.planned_end && (
                      <p className="text-xs text-[#6E6E80] truncate">{new Date(trip.planned_end).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</p>
                    )}
                  </div>
                </div>
              </div>
            </Card>

            {/* Live map — the visual hero */}
            <TripLiveMapCard
              tripId={trip.id}
              refId={trip.ref_id || trip.id}
              pickupLat={pickup?.location_lat}
              pickupLng={pickup?.location_lng}
              dropoffLat={dropoff?.location_lat}
              dropoffLng={dropoff?.location_lng}
              pickupLabel={pickup?.location_name || undefined}
              dropoffLabel={dropoff?.location_name || undefined}
              showHeader={false}
              showTelemetryBar={false}
              className="rounded-xl shadow-none border border-black/[0.12]"
              mapHeightClassName="h-[320px]"
            />


            {/* Documents & Invoice Tabs Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-black/[0.08] dark:border-slate-800/80 px-1 pb-0">
                <div className="flex items-center gap-6">
                  <button
                    type="button"
                    onClick={() => setDocTab('documents')}
                    className={cn(
                      'flex items-center gap-2 pb-3 -mb-px border-b-2 text-sm font-semibold transition-colors cursor-pointer',
                      docTab === 'documents' ? 'border-brand text-brand' : 'border-transparent text-[#6E6E80] hover:text-[#111]',
                    )}
                  >
                    <FileStack size={15} />
                    Documents
                    {documents.length > 0 && (
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-orange-50 text-brand border border-orange-200">
                        {documents.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocTab('invoice')}
                    className={cn(
                      'flex items-center gap-2 pb-3 -mb-px border-b-2 text-sm font-semibold transition-colors cursor-pointer',
                      docTab === 'invoice' ? 'border-brand text-brand' : 'border-transparent text-[#6E6E80] hover:text-[#111]',
                    )}
                  >
                    <ReceiptText size={15} />
                    Invoice
                    {invoice && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200">
                        {invoice.ref_id}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocTab('rate-card')}
                    className={cn(
                      'flex items-center gap-2 pb-3 -mb-px border-b-2 text-sm font-semibold transition-colors cursor-pointer',
                      docTab === 'rate-card' ? 'border-brand text-brand' : 'border-transparent text-[#6E6E80] hover:text-[#111]',
                    )}
                  >
                    <ReceiptText size={15} />
                    Rate Card & Pricing
                    {trip.rateCard && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">
                        Linked
                      </span>
                    )}
                  </button>
                </div>

                {docTab === 'documents' && (
                  <Btn
                    label="Upload Document"
                    variant="primary"
                    size="sm"
                    icon={<UploadCloud size={14} />}
                    onClick={() => { setUploadDocType(trip.status === 'Completed' ? 'POD' : undefined); setIsUploadModalOpen(true); }}
                    className="bg-brand hover:bg-brand-hover text-white rounded-xl shadow-2xs font-semibold text-xs mb-2 cursor-pointer"
                  />
                )}
              </div>

              {docTab === 'documents' && (
                <Card className="rounded-xl border border-black/[0.12] bg-white overflow-hidden">
                  <CardHeader className="pb-3 border-b border-black/[0.06] dark:border-slate-800/80">
                    <CardTitle className="text-sm font-bold text-[#111] dark:text-slate-100 flex items-center justify-between gap-2">
                      <span>Attached Files & Manifests</span>
                    </CardTitle>
                    <CardDescription className="text-xs text-[#6E6E80] mt-0.5">
                      Most PODs and delivery receipts are uploaded directly by drivers via the MERCON Driver Mobile App. You can also manually upload documents here.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-5">
                    {isLoadingDocs ? (
                      <div className="space-y-3">
                        <Skeleton className="h-16 w-full rounded-xl" />
                        <Skeleton className="h-16 w-full rounded-xl" />
                      </div>
                    ) : documents.length === 0 ? (
                      <div className="text-center py-10 px-4 border-2 border-dashed border-black/[0.08] dark:border-slate-800/80 rounded-2xl bg-black/[0.02] dark:bg-slate-900/20">
                        <div className="w-12 h-12 rounded-2xl bg-black/[0.05] dark:bg-slate-800 text-[#9898A4] flex items-center justify-center mx-auto mb-3">
                          <FileText size={24} />
                        </div>
                        <p className="text-sm font-bold text-[#111] dark:text-slate-200">No documents uploaded yet</p>
                        <p className="text-xs text-[#6E6E80] max-w-md mx-auto mt-1 mb-4">
                          Most PODs and delivery receipts will be uploaded automatically by drivers via the MERCON Mobile App upon arrival.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setUploadDocType(trip.status === 'Completed' ? 'POD' : undefined); setIsUploadModalOpen(true); }}
                          className="h-8.5 px-4 rounded-xl text-xs font-semibold border-black/[0.12] text-[#111] hover:bg-black/[0.03] gap-1.5 cursor-pointer"
                        >
                          <UploadCloud size={14} className="text-brand" />
                          Upload Document Manually
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-black/[0.12] dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-black/[0.18] dark:hover:border-slate-700 transition-all group shadow-2xs"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-brand flex items-center justify-center shrink-0 border border-orange-100 dark:border-orange-900/50">
                                <FileText size={18} />
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-[#111] dark:text-slate-100 truncate">
                                  {docTypeLabel(doc.doc_type)}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#6E6E80]">
                                  <span>{new Date(doc.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <StatusBadge status={doc.status} />
                              <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-8 h-8 rounded-lg bg-black/[0.03] dark:bg-slate-800 text-[#6E6E80] dark:text-slate-300 hover:bg-brand hover:text-white dark:hover:bg-brand flex items-center justify-center transition-colors border border-black/[0.08] dark:border-slate-700"
                                aria-label="View document"
                                title="Open Document"
                              >
                                <ExternalLink size={14} />
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {docTab === 'invoice' && (
                <Card className="rounded-xl border border-black/[0.12] bg-white overflow-hidden">
                  <CardHeader className="pb-3 border-b border-black/[0.06] dark:border-slate-800/80">
                    <CardTitle className="text-sm font-bold text-[#111] dark:text-slate-100 flex items-center gap-2">
                      <ReceiptText size={16} className="text-blue-600" />
                      Trip Invoice Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-5">
                    {invoice ? (
                      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-black/[0.03] dark:bg-slate-900/40 border border-black/[0.08] dark:border-slate-800">
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-[#6E6E80]">Invoice Reference</p>
                          <p className="text-base font-bold font-mono text-[#111] dark:text-slate-100">{invoice.ref_id}</p>
                          <div className="flex items-center gap-2 pt-1">
                            <StatusBadge status={invoice.status} />
                            <span className="text-xs text-[#9898A4]">•</span>
                            <span className="text-xs font-bold text-[#111] dark:text-slate-100">
                              SAR {invoice.total_amount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <Btn
                          label="View Invoice"
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/invoices/${invoice.id}`)}
                          className="rounded-xl border-black/[0.12] text-xs font-semibold cursor-pointer"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-black/[0.02] dark:bg-slate-900/20 border border-dashed border-black/[0.12] dark:border-slate-800">
                        <div>
                          <p className="text-sm font-bold text-[#111] dark:text-slate-200">No external invoice linked yet</p>
                          <p className="text-xs font-medium text-[#6E6E80] mt-0.5">Invoicing status and ZATCA references are managed directly in the Company Billing Ledger.</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {docTab === 'rate-card' && (
                <Card className="rounded-xl border border-black/[0.12] bg-white overflow-hidden">
                  <CardHeader className="pb-3 border-b border-black/[0.06] dark:border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-bold text-[#111] dark:text-slate-100 flex items-center gap-2">
                        <ReceiptText size={16} className="text-indigo-600" />
                        Rate Card & Financial Breakdown
                      </CardTitle>
                      {trip.rateCard && (
                        <Btn
                          label="View Rate Card"
                          variant="outline"
                          size="sm"
                          icon={<ExternalLink size={13} />}
                          onClick={() => navigate(`/rate-cards/${trip.rateCard?.id}`)}
                          className="rounded-xl border-black/[0.12] text-xs font-semibold cursor-pointer"
                        />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 space-y-4">
                    {/* Rate Card Info Pill */}
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-[#9898A4]">Linked Rate Card</span>
                          {trip.rateCard ? (
                            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-semibold text-[10px]">
                              Active Rule
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 font-semibold text-[10px]">
                              Manual Pricing
                            </Badge>
                          )}
                        </div>
                        <p className="text-base font-bold text-[#111] dark:text-slate-100 mt-1">
                          {trip.rateCard?.name || 'Manual / Fixed Rate (No Linked Card)'}
                        </p>
                        {trip.rateCard && (
                          <p className="text-xs text-[#6E6E80] mt-0.5">
                            Lane: <span className="font-semibold text-slate-800 dark:text-slate-200">{trip.rateCard.route_origin}</span> ➔ <span className="font-semibold text-slate-800 dark:text-slate-200">{trip.rateCard.route_destination}</span>
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-[#9898A4]">Base Price</p>
                        <p className="text-lg font-bold text-brand font-mono">
                          {trip.rateCard?.currency || 'SAR'} {Number(trip.rateCard?.base_price ?? trip.trip_charges ?? trip.billing_amount ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    {/* Cost Breakdown Ledger */}
                    <div className="rounded-xl border border-black/[0.08] dark:border-slate-800 overflow-hidden">
                      <div className="bg-black/[0.02] dark:bg-slate-900/50 px-4 py-2.5 border-b border-black/[0.06] dark:border-slate-800">
                        <p className="text-xs font-bold text-[#111] dark:text-slate-200">Trip Financial Breakdown</p>
                      </div>
                      <div className="divide-y divide-black/[0.06] dark:divide-slate-800 text-xs">
                        <div className="flex items-center justify-between px-4 py-3">
                          <span className="text-[#6E6E80] font-medium">Base Freight Charges</span>
                          <span className="font-semibold font-mono text-[#111] dark:text-slate-200">
                            SAR {Number(trip.trip_charges || trip.rateCard?.base_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3">
                          <span className="text-[#6E6E80] font-medium">Waiting / Detention Charges</span>
                          <span className="font-semibold font-mono text-[#111] dark:text-slate-200">
                            SAR {Number(trip.waiting_labor_charges || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3">
                          <span className="text-[#6E6E80] font-medium">Additional Stop Charges</span>
                          <span className="font-semibold font-mono text-[#111] dark:text-slate-200">
                            SAR {Number(trip.additional_stop_charges || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3.5 bg-orange-50/50 dark:bg-orange-950/20 font-bold">
                          <span className="text-[#111] dark:text-slate-100">Total Billing Amount</span>
                          <span className="text-sm font-mono text-brand">
                            SAR {Number(trip.billing_amount ?? ((trip.trip_charges || trip.rateCard?.base_price || 0) + (trip.waiting_labor_charges || 0) + (trip.additional_stop_charges || 0))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* ───────────────────────── Right: sidebar ───────────────────────── */}
          <div className="space-y-4">
            {/* ── Trip Progress Card ───────────────────────────────── */}
            <Card className="rounded-xl border border-black/[0.08] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 gap-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-[#111] dark:text-slate-100">Trip Progress</p>
                <StatusBadge status={trip.status} />
              </div>

              <div className="mt-3">
                <p className="text-3xl font-extrabold text-[#111] dark:text-slate-100 tracking-tight">
                  {trip.status === 'Cancelled' ? '—' : `${stageProgress}%`}
                </p>
                <Progress
                  value={trip.status === 'Cancelled' ? 0 : stageProgress}
                  className="h-1.5 mt-2.5 [&_[data-slot=progress-track]]:bg-black/[0.04] dark:[&_[data-slot=progress-track]]:bg-slate-800 [&_[data-slot=progress-indicator]]:bg-brand"
                />
              </div>

              {/* Pickup & Drop-off route waypoints */}
              <div className="mt-4 pt-4 border-t border-black/[0.06] dark:border-slate-800/80 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <MapPin size={12} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#9898A4]">
                      Pickup Location{pickup?.location?.name ? ` · ${pickup.location.name}` : ''}
                    </p>
                    <p className="text-xs font-semibold text-[#111] dark:text-slate-100 truncate mt-0.5">
                      {pickup ? (pickup.location_name || `${pickup.location_lat.toFixed(4)}, ${pickup.location_lng.toFixed(4)}`) : 'No pickup stop on manifest'}
                    </p>
                    {/* The address the driver was actually given. Absent on trips
                        created before it was captured — say so rather than
                        showing a blank line. */}
                    {pickup && (
                      <p className="text-[11px] text-[#6E6E80] mt-0.5 break-words">
                        {pickup.location_address || pickup.location?.address || (
                          <span className="italic text-amber-600">No address — the driver only gets a map pin</span>
                        )}
                      </p>
                    )}
                    {pickup && (
                      <p className="text-[11px] text-[#6E6E80] mt-0.5">
                        {pickup.actual_arrival ? fullDateTime(pickup.actual_arrival) : pickup.planned_arrival ? fullDateTime(pickup.planned_arrival) : '—'}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pl-[11px] -my-1 py-0.5 flex items-center gap-2">
                  <div className="w-px h-3.5 bg-black/[0.1] dark:bg-slate-700" />
                </div>

                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <MapPin size={12} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#9898A4]">
                      Drop-off Location{dropoff?.location?.name ? ` · ${dropoff.location.name}` : ''}
                    </p>
                    <p className="text-xs font-semibold text-[#111] dark:text-slate-100 truncate mt-0.5">
                      {dropoff ? (dropoff.location_name || `${dropoff.location_lat.toFixed(4)}, ${dropoff.location_lng.toFixed(4)}`) : 'No dropoff stop on manifest'}
                    </p>
                    {dropoff && (
                      <p className="text-[11px] text-[#6E6E80] mt-0.5 break-words">
                        {dropoff.location_address || dropoff.location?.address || (
                          <span className="italic text-amber-600">No address — the driver only gets a map pin</span>
                        )}
                      </p>
                    )}
                    {dropoff && (
                      <p className="text-[11px] text-[#6E6E80] mt-0.5">
                        {dropoff.actual_arrival
                          ? fullDateTime(dropoff.actual_arrival)
                          : dropoff.planned_arrival
                            ? `${fullDateTime(dropoff.planned_arrival)} (Expected)`
                            : '—'}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              {/* Stats rows */}
              <div className="space-y-2.5">
                {sidebarStats.map((s) => (
                  <div key={s.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-[#6E6E80]">
                      <s.icon size={13} className="text-[#9898A4]" />
                      <span>{s.label}</span>
                    </div>
                    <span className="text-xs font-semibold text-[#111] dark:text-slate-100">{s.value}</span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2 mt-5">
                {trip.driver?.phone_primary ? (
                  <a href={`tel:${trip.driver.phone_primary}`} className="w-full">
                    <Button variant="outline" size="sm" className="w-full h-8.5 rounded-xl border-black/[0.08] dark:border-slate-800 bg-white dark:bg-slate-900 text-[#111] dark:text-slate-200 hover:bg-black/[0.03] text-xs font-semibold gap-1.5 cursor-pointer">
                      <Phone size={13} />
                      Call Driver
                    </Button>
                  </a>
                ) : (
                  <Button variant="outline" size="sm" className="w-full h-8.5 rounded-xl border-black/[0.06] dark:border-slate-800 bg-black/[0.02] dark:bg-slate-900 text-slate-400 text-xs font-semibold gap-1.5 cursor-not-allowed" disabled>
                    <Phone size={13} />
                    Call Driver
                  </Button>
                )}
                <Button
                  size="sm"
                  className="w-full h-8.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer active:scale-[0.98] transition-all"
                  onClick={() => navigate(`/trips/${trip.id}/track`)}
                >
                  <Navigation size={13} />
                  View Map
                </Button>
              </div>
            </Card>

            <Card className="rounded-xl border border-black/[0.12] bg-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold text-[#111]">Activity</CardTitle>
                  {trip.status === 'InTransit' && (
                    <Badge variant="outline" className="text-[10px] font-semibold border-emerald-200 bg-emerald-50 text-emerald-600 gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {timelineSteps.map((step, i) => (
                  <div key={step.key} className="flex items-start gap-2.5">
                    <StepCircle status={timelineStatus[i]} useTruckForDone={step.key === 'departed'} />
                    <div className="min-w-0 -mt-0.5">
                      <p className={cn('text-xs font-semibold', timelineStatus[i] === 'pending' ? 'text-[#9898A4]' : 'text-[#111]')}>
                        {step.label}
                      </p>
                      {step.time ? (
                        <p className="text-[11px] text-[#6E6E80] mt-0.5">{fullDateTime(step.time)}</p>
                      ) : step.sub ? (
                        <p className={cn('text-[11px] mt-0.5', timelineStatus[i] === 'active' ? 'text-brand font-semibold' : 'text-[#9898A4]')}>{step.sub}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
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

function StepCircle({ status, useTruckForDone }: { status: StepStatus; useTruckForDone?: boolean }) {
  if (status === 'done' && useTruckForDone) {
    return (
      <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
        <Truck size={12} />
      </span>
    );
  }
  if (status === 'done') {
    return (
      <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
        <Check size={13} strokeWidth={3} />
      </span>
    );
  }
  if (status === 'active') {
    return (
      <span className="w-6 h-6 rounded-full bg-brand text-white flex items-center justify-center shrink-0">
        <span className="w-2 h-2 rounded-full bg-white" />
      </span>
    );
  }
  return <span className="w-6 h-6 rounded-full border-2 border-black/[0.06] bg-white shrink-0" />;
}
