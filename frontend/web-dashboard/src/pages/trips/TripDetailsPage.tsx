import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronRight, ChevronDown, Copy, Check, Printer, Phone, RefreshCcw,
  Navigation, CheckCircle2, XCircle, AlertTriangle, ListChecks,
  Calendar, ReceiptText, FileStack, PackageCheck, Gauge,
  Building2, User as UserIcon, Truck, FileText, Route as RouteIcon,
  UploadCloud, ExternalLink, Timer, MapPin, ArrowRight, SquarePen, MessageCircle, UserCheck, History,
  Coins, Pencil, Plus, DollarSign, HardHat, X, Camera, Eye, Maximize2, Trash2, ShieldCheck,
} from 'lucide-react';

function resolveFileUrl(url?: string | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (!trimmed.startsWith('/') && trimmed.length > 30 && !trimmed.includes(' ')) {
    return `data:image/png;base64,${trimmed}`;
  }
  const base = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '') : '';
  return `${base}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

function isImageFile(fileUrl?: string | null, mimeType?: string | null): boolean {
  if (!fileUrl && !mimeType) return false;
  if (mimeType && mimeType.startsWith('image/')) return true;
  if (fileUrl) {
    const cleanUrl = fileUrl.split('?')[0].toLowerCase();
    return cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg') || cleanUrl.endsWith('.png') || cleanUrl.endsWith('.webp') || cleanUrl.endsWith('.gif') || cleanUrl.endsWith('.heic');
  }
  return false;
}

function getInitials(name?: string | null): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '?';
}

const isUuidVal = (str?: string | null) =>
  str ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim()) : false;

function cleanAddressStr(addr?: string | null): string | null {
  if (!addr) return null;
  const trimmed = addr.trim();
  if (isUuidVal(trimmed)) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(trimmed)) {
    const parts = trimmed.split(',').map((p) => p.trim()).filter((p) => !isUuidVal(p));
    return parts.length > 0 ? parts.join(', ') : null;
  }
  return trimmed;
}

function resolveStopName(stop: any, fallback: string): string {
  if (!stop) return fallback;

  const code = stop.location?.codes?.[0] || stop.location?.code;
  const locName = !isUuidVal(stop.location?.name) ? stop.location?.name : null;
  const locCity = !isUuidVal(stop.location?.city) ? stop.location?.city : null;

  const rawLocName = !isUuidVal(stop.location_name) ? stop.location_name : null;
  const rawSourceLabel = !isUuidVal(stop.source_label) ? stop.source_label : null;
  const rawName = !isUuidVal(stop.name) ? stop.name : null;
  const rawLabel = !isUuidVal(stop.label) ? stop.label : null;

  const result =
    code ||
    locName ||
    locCity ||
    rawLocName ||
    rawSourceLabel ||
    rawName ||
    rawLabel ||
    fallback;

  return String(result).replace(/🔁\s*/g, '').trim();
}

import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import DeletedBadge from '@/components/ui/DeletedBadge';
import Btn from '@/components/ui/Btn';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import ConfirmModal from '@/components/ui/ConfirmModal';
import UploadDocumentModal from '@/components/ui/UploadDocumentModal';
import { Combobox } from '@/components/ui/combobox';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import TripLiveMapCard from '@/components/maps/TripLiveMapCard';
import UserChip, { useUserLookup } from '@/components/trips/UserChip';
import {
  tripService, TripStatus,
  type TripStop, type TripChargeInput, type Trip,
} from '@/services/tripService';
import TripChargeLineEditor from '@/components/trips/TripChargeLineEditor';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { ReassignTripModal, ReassignMode } from '@/components/trips/ReassignTripModal';
import { documentService, type DocType } from '@/services/documentService';
import { documentDisplayName } from '@/lib/documents';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';
import { cn } from '@/lib/utils';

const STAGE_ORDER: TripStatus[] = ['Draft', 'Dispatched', 'AtPickup', 'InTransit', 'AtDelivery', 'Completed', 'Invoiced'];

function formatDelay(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function fullDateTime(iso: string, tz: string): string {
  return formatInDeploymentTz(iso, tz, 'dd MMM yyyy, hh:mm a');
}

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
  const normalized = (status || '').toLowerCase().replace(/[\s_-]+/g, '');
  switch (normalized) {
    case 'draft':
    case 'dispatched':
      return 'SCHEDULED';
    case 'atpickup':
      return 'LOADING';
    case 'intransit':
      return 'IN TRANSIT';
    case 'atdelivery':
    case 'completed':
      return 'COMPLETED';
    case 'invoiced':
      return 'INVOICED';
    case 'cancelled':
      return 'CANCELLED';
    default:
      return status.replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase();
  }
}

const chargesToInputs = (charges: Trip['charges']): TripChargeInput[] =>
  (charges || []).map((c) => ({
    surchargeRuleId: c.surchargeRuleId,
    charge_type: c.charge_type,
    unit: c.unit,
    rate: c.rate,
    quantity: c.quantity,
    amount: c.amount,
  }));

type StepStatus = 'done' | 'active' | 'pending';

export default function TripDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const users = useUserLookup();
  const tz = useDeploymentTimezone();

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
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [reassignMode, setReassignMode] = useState<ReassignMode>('driver');
  const [isExpandMapOpen, setIsExpandMapOpen] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; date?: string } | null>(null);

  // Sticky header scroll listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 110) {
        setIsSticky(true);
      } else {
        setIsSticky(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleOpenReassign = (mode: ReassignMode) => {
    setReassignMode(mode);
    setIsReassignModalOpen(true);
  };

  // Fetch single trip
  const { data: trip, isLoading, isError, refetch } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => tripService.getById(id!),
    enabled: !!id,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) return false;
      return failureCount < 1;
    },
  });

  // URL normalization
  useEffect(() => {
    if (trip && trip.id && id !== trip.id) {
      navigate(`/trips/${trip.id}`, { replace: true });
    }
  }, [trip?.id, id, navigate]);

  const tripEntityId = trip?.id || id;

  // Trip documents
  const { data: docsRes, isLoading: isLoadingDocs } = useQuery({
    queryKey: ['documents', 'Trip', tripEntityId],
    queryFn: () => documentService.getAll({ entity_type: 'Trip', entity_id: tripEntityId, per_page: 50 }),
    enabled: !!tripEntityId,
  });
  const documents = docsRes?.data || [];
  const uploadedPhotos = documents.filter((d) => isImageFile(d.file_url, d.mime_type));

  // Drivers/vehicles lookup
  const { data: driversRes } = useQuery({
    queryKey: ['drivers-select', 'Available'],
    queryFn: () => driverService.getAll({ per_page: 100, status: 'Available', mode: 'lookup' }),
    enabled: !!trip && (!trip.driver || isReplaceDriverOpen),
  });
  const { data: vehiclesRes } = useQuery({
    queryKey: ['vehicles-select', 'Available'],
    queryFn: () => vehicleService.getAll({ per_page: 100, status: 'Available', mode: 'lookup' }),
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

  // Assign driver/vehicle mutation
  const assignMutation = useMutation({
    mutationFn: (payload: { driver_id?: string; vehicle_id?: string }) => tripService.dispatch(tripEntityId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripEntityId] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      setPendingDriverId('');
      setPendingVehicleId('');
    },
  });

  // Swap driver mutation
  const replaceDriverMutation = useMutation({
    mutationFn: (newDriverId: string) => tripService.replaceDriver(tripEntityId!, newDriverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripEntityId] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      setIsReplaceDriverOpen(false);
      setReplaceDriverId('');
    },
  });

  // Mutate Trip Status
  const updateStatusMutation = useMutation({
    mutationFn: (status: TripStatus) => tripService.updateStatus(tripEntityId!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripEntityId] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      setIsStatusModalOpen(false);
      setIsCancelModalOpen(false);
    },
  });

  // Additional Charges state & mutation
  const [isLaborModalOpen, setIsLaborModalOpen] = useState(false);
  const [chargeLines, setChargeLines] = useState<TripChargeInput[]>(chargesToInputs(trip?.charges));

  useEffect(() => {
    if (trip?.charges) {
      setChargeLines(chargesToInputs(trip.charges));
    }
  }, [trip?.charges, isLaborModalOpen]);

  const updateLaborMutation = useMutation({
    mutationFn: (payload: { charges: TripChargeInput[] }) =>
      tripService.updateFinancials(tripEntityId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripEntityId] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['surcharge-rules'] });
      setIsLaborModalOpen(false);
    },
  });

  const handleDeleteChargeLine = (index: number) => {
    const updated = chargeLines.filter((_, i) => i !== index);
    setChargeLines(updated);
    updateLaborMutation.mutate({ charges: updated });
  };

  const handleCopyId = async () => {
    if (!trip) return;
    try {
      await navigator.clipboard.writeText(trip.ref_id || trip.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleShareWhatsApp = () => {
    if (!trip) return;
    const pickupLoc = pickup ? resolveStopName(pickup, 'Pickup location') : 'Pickup location';
    const dropoffLoc = dropoff ? resolveStopName(dropoff, 'Drop-off location') : 'Drop-off location';
    const driverName = trip.driver ? `${trip.driver.first_name} ${trip.driver.last_name}` : 'Unassigned';
    const vehicleInfo = trip.vehicle ? trip.vehicle.plate_number : 'Unassigned';
    const etaText = trip.planned_end
      ? formatInDeploymentTz(trip.planned_end, tz, 'dd MMM yyyy, hh:mm a')
      : '—';

    const text = [
      `*MERCON Logistics - Trip Status Update*`,
      ``,
      `*Trip ID:* ${trip.ref_id || trip.id}`,
      `*Customer:* ${trip.customer?.name || 'Customer'}`,
      `*Status:* ${statusLabel(trip.status)}`,
      ``,
      `*Pickup:* ${pickupLoc}`,
      `*Drop-off:* ${dropoffLoc}`,
      `*ETA:* ${etaText}`,
      ``,
      `*Driver:* ${driverName}`,
      `*Vehicle:* ${vehicleInfo}`,
      ``,
      `Thank you for shipping with MERCON Logistics!`,
    ].join('\n');

    const cleanPhone = trip.customer?.contact_phone?.replace(/[^0-9]/g, '');
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;

    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <DashboardLayout active="Trips" title="Trip Details">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 -mt-3 sm:-mt-4 pb-6 space-y-4">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-4">
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

  if (isError || !trip) {
    return (
      <DashboardLayout active="Trips" title="Trip Details">
        <div className="px-4 sm:px-6 pb-6 max-w-[1400px] mx-auto w-full flex flex-col items-center justify-center text-center h-[60vh] gap-3">
          <AlertTriangle className="w-8 h-8 text-rose-500 shrink-0" />
          <h2 className="text-xl font-extrabold text-[#3E3C3D] dark:text-slate-100">
            {isError ? 'Failed to Load Trip' : 'Trip Not Found'}
          </h2>
          <p className="text-xs text-slate-500 max-w-md">
            {isError
              ? 'This can happen on a slow or unstable connection. Try again.'
              : 'The requested trip does not exist or may have been deleted.'}
          </p>
          {isError ? (
            <Button onClick={() => refetch()} size="sm" className="mt-2 text-xs font-bold bg-[#FA634E] hover:bg-[#e0523d] text-white shadow-xs">
              Retry
            </Button>
          ) : (
            <Button onClick={() => navigate('/trips')} size="sm" className="mt-2 text-xs font-bold bg-[#FA634E] hover:bg-[#e0523d] text-white shadow-xs">
              Return to Trips
            </Button>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // Helper calculation
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

  const rawNextStatus = getNextStatus(trip.status);
  const nextStatusOption =
    rawNextStatus === 'Dispatched' && (!trip.driver || !trip.vehicle) ? null : rawNextStatus;

  const canCancel = !['Completed', 'Invoiced', 'Cancelled'].includes(trip.status);
  const isClosed = ['Completed', 'Invoiced', 'Cancelled'].includes(trip.status);
  const chargesTotal = (trip.charges || []).reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const pickup = trip.stops && trip.stops.length > 0 ? trip.stops[0] : undefined;
  const dropoff = trip.stops && trip.stops.length > 1 ? trip.stops[trip.stops.length - 1] : trip.stops?.find((s) => s.stop_type === 'Dropoff');
  const invoice = trip.invoices?.[0];
  const needsAssignment = trip.status === 'Draft' && (!trip.driver || !trip.vehicle);

  // Compute Financial Totals & Balance
  const baseRate = Number(trip.billing_amount ?? trip.applied_rate ?? trip.rateCard?.base_price ?? 0);
  const totalAmount = baseRate + chargesTotal;
  const driverCharge = trip.is_third_party ? Number(trip.third_party_cost || 0) : Number(trip.driver_charge ?? trip.trip_charges ?? 0);
  const balanceAmount = totalAmount - (chargesTotal + driverCharge);
  const totalTripBilling = totalAmount;

  const dropoffDone = !!dropoff?.actual_arrival;

  // Activity checkpoints
  let timelineSteps: { key: string; label: string; time: string | null; sub?: string; done: boolean }[] = [];
  if (trip.stops && trip.stops.length >= 3) {
    timelineSteps = [
      { key: 'created', label: 'Trip created', time: trip.createdAt, done: true },
      ...trip.stops.flatMap((stgStop, idx) => {
        const isFirst = idx === 0;
        const isLast = idx === trip.stops!.length - 1;
        const defaultLabel = isFirst ? 'Pickup' : isLast ? 'Destination' : `Stop ${idx}`;
        const nameStr = resolveStopName(stgStop, defaultLabel);
        return [
          { key: `arr_${stgStop.id}`, label: `Arrived at ${nameStr}`, time: stgStop.actual_arrival || null, done: !!stgStop.actual_arrival },
          { key: `dep_${stgStop.id}`, label: `Departed ${nameStr}`, time: stgStop.actual_departure || null, done: !!stgStop.actual_departure },
        ];
      }),
      { key: 'completed_trip', label: 'Trip completed', time: trip.actual_end || (trip.status === 'Completed' ? trip.updatedAt : null), done: trip.status === 'Completed' || trip.status === 'Invoiced' }
    ];
  } else {
    timelineSteps = [
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
  }

  let activeAssigned = false;
  const timelineStatus: StepStatus[] = timelineSteps.map((s) => {
    if (s.done) return 'done';
    if (trip.status === 'Cancelled') return 'pending';
    if (!activeAssigned) { activeAssigned = true; return 'active'; }
    return 'pending';
  });

  const tone = statusTone(trip.status);

  // Route header text
  const pickupCityName = pickup ? resolveStopName(pickup, 'Pickup') : 'Origin';
  const dropoffCityName = dropoff ? resolveStopName(dropoff, 'Destination') : 'Destination';
  const routeLabel = `${pickupCityName} → ${dropoffCityName}`;

  // Customer Profile display values
  const custAvatarUrl = (trip.customer as any)?.avatar_url || (trip.customer as any)?.logo_url;
  const custPersonName = (trip.customer as any)?.primary_contact_person || trip.customer?.name || 'Customer Profile';
  const custCompanyName = (trip.customer as any)?.company_name || (trip.customer?.name !== custPersonName ? trip.customer?.name : undefined);

  // Driver Profile display values
  const driverAvatarUrl = (trip.driver as any)?.avatar_url;
  const driverFullName = trip.is_third_party
    ? trip.third_party_driver_name || '3PL Driver'
    : trip.driver
    ? `${trip.driver.first_name} ${trip.driver.last_name}`
    : 'Unassigned Driver';

  return (
    <DashboardLayout active="Trips" title="Trip Details">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 -mt-3 sm:-mt-4 pb-8 space-y-3 animate-fade-in text-[#3E3C3D]">

        {/* ── Sticky Context Bar (Active on Scroll) ── */}
        {isSticky && (
          <div className="fixed top-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-black/[0.08] dark:border-slate-800 py-2 px-4 sm:px-8 shadow-sm flex items-center justify-between transition-all animate-fade-in">
            <div className="flex items-center gap-3 min-w-0">
              <Link to="/trips" className="text-[#6E6E80] hover:text-[#3E3C3D] transition-colors shrink-0">
                <ChevronRight className="rotate-180" size={16} />
              </Link>
              <span className="font-bold font-mono text-sm text-[#3E3C3D] dark:text-slate-100 shrink-0">
                {trip.ref_id || trip.id}
              </span>
              <span className="text-[#9898A4] shrink-0">•</span>
              <span className="text-xs font-bold text-[#3E3C3D] dark:text-slate-200 truncate max-w-[180px] sm:max-w-[240px]">
                {custPersonName}
              </span>
              <span className="text-[#9898A4] hidden md:inline shrink-0">•</span>
              <span className="text-xs text-[#6E6E80] truncate hidden md:inline font-medium max-w-[280px]">
                {routeLabel}
              </span>
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                style={{ color: tone.color, backgroundColor: tone.bg }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tone.color }} />
                {statusLabel(trip.status)}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/trips/${trip.id}/edit`)}
                className="h-7.5 px-2.5 text-xs font-semibold text-[#3E3C3D] border-black/[0.12] hover:bg-black/[0.03] cursor-pointer"
              >
                <SquarePen size={12} className="mr-1 text-[#6E6E80]" /> Edit
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="h-7.5 px-3 bg-[#FA634E] hover:bg-[#e0523d] text-white text-xs font-bold gap-1 shadow-2xs cursor-pointer">
                    Actions <ChevronDown size={12} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={handleShareWhatsApp}>
                    <WhatsAppIcon className="w-3.5 h-3.5 mr-2 text-emerald-600" /> Share WhatsApp
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleOpenReassign('driver')}>
                    <UserIcon size={14} className="mr-2 text-[#6E6E80]" /> Reassign Driver
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleOpenReassign('truck')}>
                    <Truck size={14} className="mr-2 text-[#6E6E80]" /> Reassign Truck
                  </DropdownMenuItem>
                  {nextStatusOption && (
                    <DropdownMenuItem onClick={() => { setNextStatus(nextStatusOption); setIsStatusModalOpen(true); }}>
                      <CheckCircle2 size={14} className="mr-2 text-[#6E6E80]" /> Mark {nextStatusOption}
                    </DropdownMenuItem>
                  )}
                  {canCancel && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setIsCancelModalOpen(true)} className="text-red-600">
                        <XCircle size={14} className="mr-2" /> Cancel Trip
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        )}

        {/* ── 5. ACTION REQUIRED BANNER (TOPMOST PLACEMENT - DARK SIDEBAR COLOR) ── */}
        {!isClosed && (
          <div className="bg-[#3E3C3D] dark:bg-slate-950 text-white rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md border border-[#4E4C4D] dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#FA634E]/20 text-[#FA634E] flex items-center justify-center shrink-0 border border-[#FA634E]/30">
                <CheckCircle2 className="w-4.5 h-4.5 text-[#FA634E]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#FA634E] bg-[#FA634E]/15 px-2 py-0.5 rounded border border-[#FA634E]/30">
                    ACTION REQUIRED
                  </span>
                </div>
                <span className="text-xs font-bold text-white dark:text-slate-100 mt-1 block">
                  {needsAssignment && 'Assign driver and vehicle to dispatch this trip.'}
                  {trip.status === 'Draft' && !needsAssignment && 'Trip ready to dispatch. Advance status to Dispatched.'}
                  {trip.status === 'Dispatched' && 'Trip dispatched. Monitor driver arrival at origin facility.'}
                  {trip.status === 'AtPickup' && 'Vehicle arrived at pickup. Await cargo loading and departure.'}
                  {trip.status === 'InTransit' && 'Cargo in transit. Monitor live navigation progress to destination.'}
                  {trip.status === 'AtDelivery' && 'Vehicle at delivery location. Complete trip and verify POD receipt.'}
                  {trip.status === 'Completed' && 'Trip execution completed. Review POD documents and customer invoice.'}
                </span>
              </div>
            </div>

            {needsAssignment ? (
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" className="text-xs font-bold bg-[#FA634E] hover:bg-[#e0523d] text-white shrink-0 shadow-xs cursor-pointer border-none">
                    Assign Resources →
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-4 space-y-3 bg-white text-[#3E3C3D]">
                  <p className="text-xs font-bold text-[#3E3C3D]">Assign Driver & Vehicle</p>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6E6E80]">Driver</label>
                    <Combobox
                      value={pendingDriverId}
                      onChange={setPendingDriverId}
                      options={driverOptions}
                      placeholder="Select driver..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-[#6E6E80]">Vehicle</label>
                    <Combobox
                      value={pendingVehicleId}
                      onChange={setPendingVehicleId}
                      options={vehicleOptions}
                      placeholder="Select vehicle..."
                    />
                  </div>
                  <Button
                    size="sm"
                    className="w-full text-xs font-bold bg-[#FA634E] hover:bg-[#e0523d] text-white"
                    disabled={(!pendingDriverId && !pendingVehicleId) || assignMutation.isPending}
                    onClick={() => assignMutation.mutate({ driver_id: pendingDriverId || undefined, vehicle_id: pendingVehicleId || undefined })}
                  >
                    {assignMutation.isPending ? 'Assigning...' : 'Confirm Assignment'}
                  </Button>
                </PopoverContent>
              </Popover>
            ) : (
              nextStatusOption && (
                <Button
                  size="sm"
                  onClick={() => { setNextStatus(nextStatusOption); setIsStatusModalOpen(true); }}
                  className="text-xs font-bold bg-[#FA634E] hover:bg-[#e0523d] text-white shrink-0 shadow-xs cursor-pointer border-none px-4 py-2"
                >
                  Advance to {nextStatusOption} →
                </Button>
              )
            )}
          </div>
        )}

        {/* ── 3. CLEAN COMPACT HEADER ── */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-black/[0.08] dark:border-slate-800 p-4 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3">
            
            {/* Left Header Info */}
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 text-xs font-medium text-[#6E6E80]">
                <Link to="/trips" className="hover:text-[#3E3C3D] transition-colors flex items-center gap-1 font-semibold">
                  Trips
                </Link>
                <ChevronRight size={13} className="text-[#9898A4] shrink-0" />
                <span className="text-[#3E3C3D] font-bold">Trip Details</span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                <h1 className="text-xl font-bold font-mono tracking-tight text-[#3E3C3D] dark:text-slate-100 flex items-center gap-1.5">
                  {trip.ref_id || trip.id}
                  <button type="button" onClick={handleCopyId} aria-label="Copy trip ID" className="text-[#9898A4] hover:text-[#FA634E] transition-colors">
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </h1>
                
                <span className="text-[#9898A4]">•</span>
                <div className="flex items-center gap-1.5">
                  <Avatar className="w-5 h-5 shrink-0 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950">
                    {custAvatarUrl && (
                      <AvatarImage src={resolveFileUrl(custAvatarUrl)} alt={custPersonName} />
                    )}
                    <AvatarFallback className="text-[9px] font-extrabold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900">
                      {getInitials(custPersonName)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-bold text-[#3E3C3D] dark:text-slate-200 truncate">
                    {custPersonName}
                  </span>
                </div>

                <span className="text-[#9898A4]">•</span>
                <span className="text-xs font-semibold text-[#6E6E80] dark:text-slate-300 truncate">
                  {routeLabel}
                </span>

                <span
                  className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold ml-1 shrink-0"
                  style={{ color: tone.color, backgroundColor: tone.bg }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tone.color }} />
                  {statusLabel(trip.status)}
                </span>
              </div>
            </div>

            {/* Right Header Actions */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/trips/${trip.id}/edit`)}
                className="h-8.5 px-3 rounded-lg text-xs font-semibold text-[#3E3C3D] dark:text-slate-200 border-black/[0.12] dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-black/[0.03] gap-1.5 cursor-pointer shadow-2xs"
              >
                <SquarePen className="w-3.5 h-3.5 text-[#6E6E80]" />
                Edit Trip
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareWhatsApp}
                className="h-8.5 px-3 rounded-lg text-xs font-semibold text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 hover:bg-emerald-100/70 gap-1.5 cursor-pointer shadow-2xs"
              >
                <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                Share to WhatsApp
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8.5 px-3 rounded-lg text-xs font-semibold text-[#3E3C3D] dark:text-slate-200 border-black/[0.12] dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-black/[0.03] gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <RefreshCcw className="w-3.5 h-3.5 text-[#6E6E80]" />
                    Reassign
                    <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => handleOpenReassign('driver')}>
                    <UserIcon size={14} className="mr-2 text-[#6E6E80]" /> Reassign Driver
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleOpenReassign('truck')}>
                    <Truck size={14} className="mr-2 text-[#6E6E80]" /> Reassign Truck
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleOpenReassign('both')}>
                    <RefreshCcw size={14} className="mr-2 text-[#6E6E80]" /> Reassign Both
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="h-8.5 px-3.5 rounded-lg bg-[#FA634E] hover:bg-[#e0523d] text-white text-xs font-bold gap-1.5 shadow-2xs cursor-pointer active:scale-[0.98] transition-all">
                    More Actions
                    <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  {trip.status === 'InTransit' && (
                    <DropdownMenuItem onClick={() => navigate(`/trips/${trip.id}/track`)}>
                      <Navigation size={14} className="mr-2 text-[#6E6E80]" /> Track Live Map
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
                      <DropdownMenuItem onClick={() => setIsCancelModalOpen(true)} className="text-red-600 hover:bg-red-50">
                        <XCircle size={14} className="mr-2" /> Cancel Trip
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* ── 4. TRIP SUMMARY (CLEAN HORIZONTAL BAR - 4 COLUMNS WITH FULL PROFILES) ── */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-black/[0.08] dark:border-slate-800 p-4 shadow-2xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-black/[0.06] dark:divide-slate-800">
            
            {/* Customer Profile */}
            <div className="space-y-0.5 min-w-0 pr-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9898A4] block">Customer</span>
              <div className="flex items-center gap-2 pt-0.5">
                <Avatar
                  className="w-8 h-8 shrink-0 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => trip.customer?.id && navigate(`/customers/${trip.customer.id}`)}
                >
                  {custAvatarUrl && (
                    <AvatarImage src={resolveFileUrl(custAvatarUrl)} alt={custPersonName} />
                  )}
                  <AvatarFallback className="text-xs font-extrabold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900">
                    {getInitials(custPersonName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p
                      onClick={() => trip.customer?.id && navigate(`/customers/${trip.customer.id}`)}
                      className="text-xs font-bold text-[#3E3C3D] dark:text-slate-100 truncate cursor-pointer hover:text-blue-600 transition-colors"
                    >
                      {custPersonName}
                    </p>
                    {trip.customer?.id && (
                      <button
                        type="button"
                        onClick={() => navigate(`/customers/${trip.customer!.id}`)}
                        className="text-[10px] text-indigo-600 hover:underline shrink-0"
                        title="View Customer Profile"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {custCompanyName ? (
                    <p className="text-[11px] text-[#6E6E80] truncate font-medium">{custCompanyName}</p>
                  ) : trip.customer?.contact_phone ? (
                    <p className="text-[11px] text-[#6E6E80] font-mono truncate">{trip.customer.contact_phone}</p>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Driver Profile */}
            <div className="space-y-0.5 min-w-0 pt-2 sm:pt-0 sm:px-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#9898A4]">Driver</span>
                {trip.driver && !isClosed && !trip.is_third_party && (
                  <Popover open={isReplaceDriverOpen} onOpenChange={(open) => { setIsReplaceDriverOpen(open); if (!open) setReplaceDriverId(''); }}>
                    <PopoverTrigger asChild>
                      <button type="button" aria-label="Replace driver" className="text-[#9898A4] hover:text-[#FA634E] transition-colors">
                        <RefreshCcw size={11} />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-72 p-3 space-y-2">
                      <p className="text-xs font-semibold text-[#3E3C3D]">Swap assigned driver</p>
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
                        className="w-full bg-[#FA634E] text-white"
                        disabled={!replaceDriverId || replaceDriverMutation.isPending}
                        onClick={() => replaceDriverMutation.mutate(replaceDriverId)}
                      />
                    </PopoverContent>
                  </Popover>
                )}
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <Avatar
                  className="w-8 h-8 shrink-0 border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => trip.driver?.id && navigate(`/drivers/${trip.driver.id}`)}
                >
                  {driverAvatarUrl && (
                    <AvatarImage src={resolveFileUrl(driverAvatarUrl)} alt={driverFullName} />
                  )}
                  <AvatarFallback className="text-xs font-extrabold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900">
                    {getInitials(driverFullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <p
                      onClick={() => trip.driver?.id && navigate(`/drivers/${trip.driver.id}`)}
                      className="text-xs font-bold text-[#3E3C3D] dark:text-slate-100 truncate cursor-pointer hover:text-violet-600 transition-colors"
                    >
                      {driverFullName}
                    </p>
                    {trip.driver?.id && (
                      <button
                        type="button"
                        onClick={() => navigate(`/drivers/${trip.driver!.id}`)}
                        className="text-[10px] text-indigo-600 hover:underline shrink-0"
                        title="View Driver Profile"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {trip.driver?.phone_primary ? (
                    <p className="text-[11px] text-[#6E6E80] font-mono truncate">{trip.driver.phone_primary}</p>
                  ) : (
                    <p className="text-[11px] text-[#6E6E80] truncate font-medium">Internal Operator</p>
                  )}
                </div>
              </div>
            </div>

            {/* Vehicle */}
            <div className="space-y-0.5 min-w-0 pt-2 sm:pt-0 sm:px-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9898A4] block">Vehicle</span>
              <div className="flex items-center gap-1.5 pt-0.5">
                <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[#3E3C3D] dark:text-slate-100 truncate">
                    {trip.is_third_party
                      ? trip.third_party_vehicle_plate || 'Rented Truck'
                      : trip.vehicle?.plate_number || 'Unassigned'}
                  </p>
                  {trip.vehicle?.asset_type && (
                    <p className="text-[11px] text-[#6E6E80] truncate">{trip.vehicle.asset_type}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="space-y-0.5 min-w-0 pt-2 sm:pt-0 sm:pl-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9898A4] block">Financial Summary</span>
              <div className="flex items-center gap-2 pt-0.5">
                <ReceiptText className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    <span className="text-[10px] font-bold text-slate-500">TOTAL:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      SAR {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">BALANCE:</span>
                    <span className="font-extrabold text-emerald-700 dark:text-emerald-300">
                      SAR {balanceAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 6. MAIN OPERATIONAL WORKSPACE (2-COLUMN LAYOUT) ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-4 items-start">

          {/* ───────────────────────── LEFT: Route & Map Split Panel ───────────────────────── */}
          <div className="space-y-4 min-w-0">

            <Card className="rounded-xl border border-black/[0.08] dark:border-slate-800 bg-white dark:bg-slate-900 p-4 gap-0 shadow-2xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                
                {/* Left Sub-Column: Route & Stop Sequence */}
                <div className="space-y-3 min-w-0">
                  <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <RouteIcon className="w-4 h-4 text-[#FA634E]" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#3E3C3D] dark:text-slate-100">
                        Route & Stop Sequence
                      </h3>
                    </div>
                    <span className="text-[10px] font-semibold text-[#6E6E80] bg-black/[0.03] px-2 py-0.5 rounded-md">
                      {(trip.stops || []).length} { (trip.stops || []).length === 1 ? 'Stop' : 'Stops' }
                    </span>
                  </div>

                  <div className="space-y-3 pt-0.5">
                    {(trip.stops || []).map((stop, sIdx) => {
                      const totalStops = (trip.stops || []).length;
                      const isFirst = sIdx === 0;
                      const isLast = sIdx === totalStops - 1;
                      const stType = String(stop.stop_type || '');

                      // Precise taxonomy rule: Only label Pickup / Drop-off if explicitly defined or at ends
                      let stopCategoryLabel = 'Stop';
                      if (stType === 'Pickup' || (isFirst && stType !== 'Dropoff')) {
                        stopCategoryLabel = 'Pickup';
                      } else if (stType === 'Dropoff' || (isLast && stType !== 'Pickup')) {
                        stopCategoryLabel = 'Destination';
                      } else {
                        stopCategoryLabel = `Stop ${sIdx}`;
                      }

                      const defaultFallback = stopCategoryLabel === 'Pickup' ? 'Pickup Location' : stopCategoryLabel === 'Destination' ? 'Destination' : 'Intermediate Stop';
                      const nameStr = resolveStopName(stop, defaultFallback);
                      const cleanAddress = cleanAddressStr(stop.location_address || stop.location?.address);
                      const locCity = stop.location?.city || (!isUuidVal(stop.location?.name) ? stop.location?.name : null);

                      const isCompleted = !!stop.actual_arrival;
                      const isCurrent = !isCompleted && (!isFirst ? !!trip.stops![sIdx - 1]?.actual_departure : true);

                      return (
                        <React.Fragment key={stop.id || sIdx}>
                          <div className="flex items-start gap-2.5">
                            {/* Dot indicator */}
                            <div className={cn(
                              "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[11px] font-bold shadow-2xs",
                              isCompleted ? "bg-emerald-600 text-white" : isCurrent ? "bg-[#FA634E] text-white animate-pulse" : "bg-slate-200 text-slate-600"
                            )}>
                              {isCompleted ? <Check size={12} /> : <MapPin size={11} />}
                            </div>

                            {/* Details */}
                            <div className="min-w-0 flex-1 space-y-0.5">
                              <div className="flex items-center justify-between gap-1">
                                <span className={cn(
                                  "text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border",
                                  stopCategoryLabel === 'Pickup' ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                  stopCategoryLabel === 'Destination' ? "bg-rose-50 text-rose-700 border-rose-200" :
                                  "bg-blue-50 text-blue-700 border-blue-200"
                                )}>
                                  {stopCategoryLabel} {locCity ? `· ${locCity}` : ''}
                                </span>
                                {stop.actual_arrival ? (
                                  <span className="text-[9px] font-bold text-emerald-600 font-mono">
                                    Arrived {formatInDeploymentTz(stop.actual_arrival, tz, 'hh:mm a')}
                                  </span>
                                ) : stop.planned_arrival ? (
                                  <span className="text-[9px] font-medium text-slate-500 font-mono">
                                    Expected {formatInDeploymentTz(stop.planned_arrival, tz, 'hh:mm a')}
                                  </span>
                                ) : null}
                              </div>

                              <p className="text-xs font-bold text-[#3E3C3D] dark:text-slate-100 truncate pt-0.5">
                                {nameStr}
                              </p>

                              {cleanAddress ? (
                                <p className="text-[10px] text-[#6E6E80] break-words line-clamp-1">
                                  {cleanAddress}
                                </p>
                              ) : (
                                <p className="text-[10px] text-amber-600 italic">
                                  No written address
                                </p>
                              )}
                            </div>
                          </div>

                          {!isLast && (
                            <div className="pl-3 -my-2 py-0.5">
                              <div className="w-0.5 h-4 bg-black/[0.1] dark:bg-slate-700 ml-px" />
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>

                {/* Right Sub-Column: Live Route Map (Half height: ~200px) */}
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Navigation className="w-4 h-4 text-[#FA634E]" />
                      <span className="text-xs font-bold uppercase tracking-wider text-[#3E3C3D] dark:text-slate-100">
                        Live Route Map
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsExpandMapOpen(true)}
                      className="h-6 px-2 text-[10px] font-semibold text-[#3E3C3D] border-black/[0.12] hover:bg-black/[0.04] gap-1 cursor-pointer"
                    >
                      <Maximize2 size={11} className="text-[#6E6E80]" />
                      Expand Map
                    </Button>
                  </div>

                  <div className="rounded-lg overflow-hidden border border-black/[0.08] dark:border-slate-800">
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
                      className="rounded-none border-none"
                      mapHeightClassName="h-[200px]"
                    />
                  </div>
                </div>

              </div>
            </Card>

            {/* ── 14. DOCUMENTS & BILLING TABS ── */}
            <Card className="rounded-xl border border-black/[0.08] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 gap-0 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-black/[0.06] dark:border-slate-800">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setDocTab('documents')}
                    className={cn(
                      'text-xs font-bold pb-1.5 -mb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5',
                      docTab === 'documents' ? 'border-[#FA634E] text-[#FA634E]' : 'border-transparent text-[#6E6E80] hover:text-[#3E3C3D]',
                    )}
                  >
                    <FileStack size={14} />
                    Documents ({documents.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocTab('invoice')}
                    className={cn(
                      'text-xs font-bold pb-1.5 -mb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5',
                      docTab === 'invoice' ? 'border-[#FA634E] text-[#FA634E]' : 'border-transparent text-[#6E6E80] hover:text-[#3E3C3D]',
                    )}
                  >
                    <ReceiptText size={14} />
                    Invoice {invoice ? `(#${invoice.ref_id})` : ''}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocTab('rate-card')}
                    className={cn(
                      'text-xs font-bold pb-1.5 -mb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5',
                      docTab === 'rate-card' ? 'border-[#FA634E] text-[#FA634E]' : 'border-transparent text-[#6E6E80] hover:text-[#3E3C3D]',
                    )}
                  >
                    <ReceiptText size={14} />
                    Rate Card Breakdown
                  </button>
                </div>

                {docTab === 'documents' && (
                  <Button
                    size="sm"
                    onClick={() => { setUploadDocType(trip.status === 'Completed' ? 'POD' : undefined); setIsUploadModalOpen(true); }}
                    className="h-7.5 px-3 rounded-lg text-xs font-bold bg-white border border-black/[0.12] text-[#3E3C3D] hover:bg-black/[0.03] gap-1 cursor-pointer shadow-2xs"
                  >
                    <UploadCloud size={13} className="text-[#FA634E]" />
                    Upload Document
                  </Button>
                )}
              </div>

              {/* Tab Content: Documents */}
              {docTab === 'documents' && (
                <div className="mt-4 space-y-4">
                  {isLoadingDocs ? (
                    <Skeleton className="h-20 w-full rounded-xl" />
                  ) : documents.length === 0 ? (
                    <div className="text-center py-8 px-4 border border-dashed border-black/[0.1] rounded-xl bg-black/[0.01]">
                      <FileText className="w-7 h-7 text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-[#3E3C3D] mt-2">No documents uploaded</p>
                      <p className="text-[11px] text-[#6E6E80] mt-0.5">PODs uploaded by drivers automatically show up here.</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setUploadDocType(trip.status === 'Completed' ? 'POD' : undefined); setIsUploadModalOpen(true); }}
                        className="mt-3 h-7.5 px-3 rounded-lg text-xs font-semibold border-black/[0.12] gap-1"
                      >
                        <UploadCloud size={13} className="text-[#FA634E]" />
                        Upload Document
                      </Button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl border border-black/[0.08] dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-black/[0.15] transition-all"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {isImageFile(doc.file_url, doc.mime_type) ? (
                              <div
                                onClick={() => setPreviewImage({ url: resolveFileUrl(doc.file_url), title: documentDisplayName(doc), date: doc.createdAt })}
                                className="w-10 h-10 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-100 cursor-pointer"
                              >
                                <img src={resolveFileUrl(doc.file_url)} alt="" className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <FileText className="w-5 h-5 text-[#FA634E] shrink-0" />
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#3E3C3D] dark:text-slate-100 truncate">
                                {documentDisplayName(doc)}
                              </p>
                              <p className="text-[10px] text-[#6E6E80]">
                                {formatInDeploymentTz(doc.createdAt, tz, 'dd MMM yyyy')}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {isImageFile(doc.file_url, doc.mime_type) && (
                              <button
                                type="button"
                                onClick={() => setPreviewImage({ url: resolveFileUrl(doc.file_url), title: documentDisplayName(doc), date: doc.createdAt })}
                                className="p-1 text-[#6E6E80] hover:text-[#FA634E] transition-colors"
                                title="Preview"
                              >
                                <Eye size={14} />
                              </button>
                            )}
                            <a
                              href={resolveFileUrl(doc.file_url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-[#6E6E80] hover:text-[#FA634E] transition-colors"
                              title="Download"
                            >
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Photo Preview Strip if photos exist */}
                  {uploadedPhotos.length > 0 && (
                    <div className="pt-3 border-t border-black/[0.06] space-y-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-[#9898A4]">Proof of Delivery & Cargo Photos</p>
                      <div className="flex items-center gap-2 overflow-x-auto pb-1">
                        {uploadedPhotos.map((doc) => (
                          <div
                            key={doc.id}
                            onClick={() => setPreviewImage({ url: resolveFileUrl(doc.file_url), title: documentDisplayName(doc), date: doc.createdAt })}
                            className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-slate-200 bg-slate-100 cursor-pointer hover:opacity-90"
                          >
                            <img src={resolveFileUrl(doc.file_url)} alt="" className="w-full h-full object-cover" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab Content: Invoice */}
              {docTab === 'invoice' && (
                <div className="mt-4 p-4 rounded-xl bg-black/[0.02] border border-black/[0.06]">
                  {invoice ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold font-mono text-[#3E3C3D]">Ref: {invoice.ref_id}</p>
                        <p className="text-sm font-extrabold text-[#FA634E] font-mono mt-0.5">
                          SAR {Number(invoice.total_amount || 0).toLocaleString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/invoices/${invoice.id}`)}
                        className="text-xs font-semibold"
                      >
                        View Invoice →
                      </Button>
                    </div>
                  ) : (
                    <p className="text-xs text-[#6E6E80] text-center py-4">No invoice generated yet for this trip.</p>
                  )}
                </div>
              )}

              {/* Tab Content: Rate Card */}
              {docTab === 'rate-card' && (
                <div className="mt-4 space-y-3 text-xs">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-black/[0.02] border border-black/[0.06]">
                    <div>
                      <p className="font-bold text-[#3E3C3D]">{trip.rateCard?.name || 'Base Rate'}</p>
                      <p className="text-[11px] text-[#6E6E80]">Base commercial rate</p>
                    </div>
                    <span className="font-extrabold font-mono text-sm">
                      SAR {baseRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              )}
            </Card>

          </div>

          {/* ───────────────────────── RIGHT: Additional Charges + Activity Log ───────────────────────── */}
          <div className="space-y-4 min-w-0">

            {/* ── 9. ADDITIONAL CHARGES PANEL (TOP-RIGHT PLACEMENT) ── */}
            <Card className="rounded-xl border border-black/[0.08] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 gap-0 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-slate-800">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#3E3C3D] dark:text-slate-100 flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-[#FA634E]" />
                    ADDITIONAL CHARGES
                  </h3>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setChargeLines(chargesToInputs(trip.charges));
                    setIsLaborModalOpen(true);
                  }}
                  className="h-7.5 px-3 rounded-lg text-xs font-bold bg-[#FA634E] hover:bg-[#e0523d] text-white gap-1 cursor-pointer shadow-2xs"
                >
                  <Plus size={13} />
                  Add Charge
                </Button>
              </div>

              {/* Charge rows */}
              <div className="mt-3 divide-y divide-black/[0.06] dark:divide-slate-800 text-xs">
                {(trip.charges || []).length === 0 ? (
                  <div className="py-6 text-center text-[#9898A4]">
                    <p className="text-xs font-semibold">No additional charges added</p>
                    <p className="text-[11px] mt-0.5">Click + Add Charge to log waiting, labour, or extra stops.</p>
                  </div>
                ) : (
                  (trip.charges || []).map((c, idx) => (
                    <div key={c.id || idx} className="py-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#3E3C3D] dark:text-slate-200 truncate">
                          {c.charge_type}
                        </p>
                        <p className="text-[11px] text-[#6E6E80] font-mono">
                          {c.quantity} {c.unit || 'qty'} × SAR {Number(c.rate || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-extrabold font-mono text-xs text-[#3E3C3D] dark:text-slate-100">
                          SAR {Number(c.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteChargeLine(idx)}
                          className="text-[#9898A4] hover:text-red-600 transition-colors p-1"
                          title="Delete Charge"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Financial Totals Breakdown Box */}
              <div className="mt-4 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span className="font-medium">Billing Amount (Base Rate)</span>
                  <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                    SAR {baseRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span className="font-medium">Additional Charges</span>
                  <span className="font-mono font-semibold text-brand">
                    + SAR {chargesTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100 pt-1 border-t border-slate-200 dark:border-slate-700">
                  <span>TOTAL AMOUNT</span>
                  <span className="font-mono text-sm font-extrabold text-slate-900 dark:text-slate-100">
                    SAR {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 pt-1 border-t border-dashed border-slate-200 dark:border-slate-700">
                  <span className="font-medium">Driver Charge / Payout</span>
                  <span className="font-mono font-semibold text-amber-600 dark:text-amber-400">
                    - SAR {driverCharge.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between font-extrabold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 p-2 rounded-lg border border-emerald-300 dark:border-emerald-700 mt-2">
                  <span className="uppercase tracking-wider">BALANCE AMOUNT</span>
                  <span className="font-mono text-sm font-black text-emerald-800 dark:text-emerald-300">
                    SAR {balanceAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </Card>

            {/* ── ACTIVITY LOG ── */}
            <Card className="rounded-xl border border-black/[0.08] dark:border-slate-800 bg-white dark:bg-slate-900 p-5 gap-0 shadow-2xs">
              <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-slate-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#3E3C3D] dark:text-slate-100 flex items-center gap-1.5">
                  <History size={14} className="text-[#FA634E]" /> Activity Log
                </h3>
              </div>

              <div className="mt-4 space-y-3.5">
                {timelineSteps.map((step, i) => (
                  <div key={step.key} className="flex items-start gap-2.5">
                    <StepCircle status={timelineStatus[i]} useTruckForDone={step.key === 'departed'} />
                    <div className="min-w-0 -mt-0.5">
                      <p className={cn('text-xs font-semibold', timelineStatus[i] === 'pending' ? 'text-[#9898A4]' : 'text-[#3E3C3D]')}>
                        {step.label}
                      </p>
                      {step.time ? (
                        <p className="text-[10px] font-mono text-[#6E6E80] mt-0.5">{fullDateTime(step.time, tz)}</p>
                      ) : step.sub ? (
                        <p className={cn('text-[10px] mt-0.5', timelineStatus[i] === 'active' ? 'text-[#FA634E] font-[#FA634E]' : 'text-[#9898A4]')}>{step.sub}</p>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>

      </div>

      {/* ── Status Confirmation Modal ── */}
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

      {/* ── Cancel Trip Modal ── */}
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

      {/* ── Upload Document Modal ── */}
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

      {/* ── Extra Charges Modal ── */}
      {isLaborModalOpen && trip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-black/10 dark:border-slate-800 shadow-2xl max-w-xl w-full overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-black/[0.06] dark:border-slate-800 flex items-center justify-between bg-black/[0.02] shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <Coins className="w-5 h-5 text-[#FA634E] shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-[#3E3C3D] dark:text-slate-100">Add / Edit Additional Charges</h3>
                  <p className="text-xs text-[#6E6E80] font-mono truncate">
                    Trip #{trip.ref_id || trip.id.substring(0, 8)} · {trip.customer?.name || 'Customer'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLaborModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateLaborMutation.mutate({ charges: chargeLines });
              }}
              className="flex flex-col overflow-hidden flex-1"
            >
              <div className="px-6 py-4 overflow-y-auto flex-1">
                <TripChargeLineEditor
                  customerId={trip.customer?.id}
                  rateCardId={trip.rateCardId}
                  value={chargeLines}
                  onChange={setChargeLines}
                />
              </div>

              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-black/[0.06] dark:border-slate-800 shrink-0 bg-black/[0.015]">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLaborModalOpen(false)}
                  className="rounded-xl border-black/[0.12] text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={updateLaborMutation.isPending}
                  className="rounded-xl bg-[#FA634E] hover:bg-[#e0523d] text-white text-xs font-bold px-4 cursor-pointer shadow-2xs"
                >
                  {updateLaborMutation.isPending ? 'Saving...' : 'Save Charges'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reassign Trip Modal ── */}
      {trip && (
        <ReassignTripModal
          isOpen={isReassignModalOpen}
          onClose={() => setIsReassignModalOpen(false)}
          trip={trip}
          initialMode={reassignMode}
        />
      )}

      {/* ── Expand Map Dialog ── */}
      <Dialog open={isExpandMapOpen} onOpenChange={setIsExpandMapOpen}>
        <DialogContent className="max-w-5xl w-full p-0 overflow-hidden rounded-2xl border-none">
          <DialogHeader className="p-4 border-b border-black/[0.06] bg-white flex flex-row items-center justify-between">
            <DialogTitle className="text-sm font-bold text-[#3E3C3D]">
              Full Route Radar — {trip.ref_id || trip.id} ({routeLabel})
            </DialogTitle>
          </DialogHeader>
          <div className="w-full h-[650px]">
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
              showTelemetryBar={true}
              mapHeightClassName="h-[650px]"
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Lightbox Image Preview Modal ── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-white dark:bg-slate-900 rounded-2xl overflow-hidden shadow-2xl space-y-3 p-4 border border-slate-200 dark:border-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#3E3C3D] dark:text-slate-100">{previewImage.title}</h3>
                {previewImage.date && (
                  <p className="text-xs text-[#6E6E80]">{formatInDeploymentTz(previewImage.date, tz, 'dd MMM yyyy, hh:mm a')}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
                >
                  <ExternalLink size={14} /> Open Original File
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center bg-black/90 rounded-xl overflow-hidden max-h-[75vh] p-2">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[72vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function StepCircle({ status, useTruckForDone }: { status: StepStatus; useTruckForDone?: boolean }) {
  if (status === 'done' && useTruckForDone) {
    return (
      <Truck className="w-4 h-4 text-blue-500 shrink-0" />
    );
  }
  if (status === 'done') {
    return (
      <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
        <Check className="w-3 h-3" />
      </div>
    );
  }
  if (status === 'active') {
    return (
      <span className="w-5 h-5 rounded-full bg-[#FA634E] text-white flex items-center justify-center shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-white" />
      </span>
    );
  }
  return <span className="w-5 h-5 rounded-full border-2 border-black/[0.1] bg-white shrink-0" />;
}
