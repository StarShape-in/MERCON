import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronRight, ChevronDown, Copy, Check, Printer, Phone, RefreshCcw,
  Navigation, CheckCircle2, XCircle, AlertTriangle, ListChecks,
  Calendar, ReceiptText, FileStack, PackageCheck, Gauge,
  Building2, User as UserIcon, Truck, FileText, Route as RouteIcon,
  UploadCloud, ExternalLink, Timer, MapPin, ArrowRight, ArrowDown, SquarePen, MessageCircle, UserCheck, History,
  Coins, Pencil, Plus, PlusCircle, Minus, Wallet, DollarSign, HardHat, X, Camera, Eye, Maximize2, Trash2, ShieldCheck,
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

  const cleanedStr = String(result)
    .replace(/\[RETURN:.*?\]/gi, '')
    .replace(/🔁\s*/g, '')
    .trim();

  return cleanedStr || fallback;
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
import { ScrollArea } from '@/components/ui/scroll-area';
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
    refetchInterval: 10000,
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
      <div className="bg-[#EEF1F6] min-h-screen -mt-3 sm:-mt-4 -mb-8 p-4 sm:p-6 space-y-4 text-[#3E3C3D] animate-fade-in">
        <div className="max-w-[1600px] mx-auto space-y-4">

          {/* ── Sticky Context Bar (Active on Scroll) ── */}
          {isSticky && (
            <div className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E5E7EB] py-2 px-4 sm:px-8 shadow-xs flex items-center justify-between transition-all animate-fade-in">
              <div className="flex items-center gap-3 min-w-0">
                <Link to="/trips" className="text-[#6E6E80] hover:text-[#3E3C3D] transition-colors shrink-0">
                  <ChevronRight className="rotate-180" size={16} />
                </Link>
                <span className="font-bold font-mono text-sm text-[#3E3C3D] shrink-0">
                  {trip.ref_id || trip.id}
                </span>
                <span className="text-[#9898A4] shrink-0">•</span>
                <span className="text-xs text-[#6E6E80] truncate font-medium max-w-[280px]">
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
                  className="h-7.5 px-2.5 text-xs font-medium text-[#3E3C3D] border-[#E5E7EB] hover:bg-slate-50 cursor-pointer bg-white"
                >
                  <SquarePen size={12} className="mr-1 text-[#6E6E80]" /> Edit
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="h-7.5 px-3 bg-[#FA634E] hover:bg-[#e0523d] text-white text-xs font-semibold gap-1 shadow-none cursor-pointer">
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

          {/* ── 1. ACTION REQUIRED BANNER (OPERATIONAL & MINIMAL) ── */}
          {!isClosed && (
            <div className="bg-[#FA634E]/5 border border-[#FA634E]/20 text-[#3E3C3D] rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#FA634E]/15 text-[#FA634E] flex items-center justify-center shrink-0 border border-[#FA634E]/30">
                  <CheckCircle2 className="w-4 h-4 text-[#FA634E]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#FA634E] bg-[#FA634E]/15 px-2 py-0.5 rounded border border-[#FA634E]/30">
                      ACTION REQUIRED
                    </span>
                  </div>
                  <span className="text-xs font-medium text-[#3E3C3D] mt-0.5 block">
                    {needsAssignment && 'Resources assigned. Dispatch trip to begin pickup.'}
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
                    <Button size="sm" className="text-xs font-semibold bg-[#FA634E] hover:bg-[#e0523d] text-white shrink-0 shadow-none cursor-pointer border-none px-3.5 py-1.5 rounded-lg">
                      Dispatch Trip →
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 p-4 space-y-3 bg-white text-[#3E3C3D] border-[#E5E7EB] shadow-lg rounded-2xl">
                    <p className="text-xs font-semibold text-[#3E3C3D]">Assign Driver & Vehicle</p>
                    <div className="space-y-2">
                      <label className="text-[11px] font-medium text-[#6E6E80]">Driver</label>
                      <Combobox
                        value={pendingDriverId}
                        onChange={setPendingDriverId}
                        options={driverOptions}
                        placeholder="Select driver..."
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[11px] font-medium text-[#6E6E80]">Vehicle</label>
                      <Combobox
                        value={pendingVehicleId}
                        onChange={setPendingVehicleId}
                        options={vehicleOptions}
                        placeholder="Select vehicle..."
                      />
                    </div>
                    <Button
                      size="sm"
                      className="w-full text-xs font-semibold bg-[#FA634E] hover:bg-[#e0523d] text-white rounded-lg"
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
                    className="text-xs font-semibold bg-[#FA634E] hover:bg-[#e0523d] text-white shrink-0 shadow-none cursor-pointer border-none px-3.5 py-1.5 rounded-lg"
                  >
                    Advance to {nextStatusOption} →
                  </Button>
                )
              )}
            </div>
          )}

          {/* ── 2. TOP TRIP HEADER BAR ── */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4.5 sm:p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-wrap items-center justify-between gap-4">
            {/* Left Title, Route, Status & Metadata */}
            <div className="space-y-1 min-w-0">
              {/* Row 1: Trip ID, Route, Compact Status Badge */}
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[22px] font-bold font-mono tracking-tight text-[#3E3C3D] flex items-center gap-1.5">
                  {trip.ref_id || trip.id}
                  <button type="button" onClick={handleCopyId} aria-label="Copy trip ID" className="text-[#9898A4] hover:text-[#FA634E] transition-colors p-0.5">
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </h1>

                <span className="text-[#9898A4]">•</span>

                <span className="text-[15px] font-semibold text-[#3E3C3D] truncate">
                  {routeLabel}
                </span>

                <span
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ml-0.5 shrink-0"
                  style={{ color: tone.color, backgroundColor: tone.bg }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tone.color }} />
                  {statusLabel(trip.status)}
                </span>
              </div>

              {/* Row 2: Created / Updated Metadata Underneath */}
              <p className="text-xs font-normal text-[#6E6E80] pt-0.5">
                Created {formatInDeploymentTz(trip.createdAt, tz, 'MMM dd')} · Updated {formatInDeploymentTz(trip.updatedAt, tz, 'MMM dd')}
              </p>
            </div>

            {/* Right Action Bar (Hierarchy: Primary = More Actions, Secondary = Share WhatsApp, Tertiary = Edit / Reassign) */}
            <div className="flex items-center gap-2 flex-wrap shrink-0">
              {/* TERTIARY */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/trips/${trip.id}/edit`)}
                className="h-8.5 px-3 rounded-xl text-xs font-medium text-[#3E3C3D] border-[#E5E7EB] bg-white hover:bg-slate-50 gap-1.5 cursor-pointer shadow-none"
              >
                <SquarePen className="w-3.5 h-3.5 text-[#6E6E80]" />
                Edit Trip
              </Button>

              {/* TERTIARY */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8.5 px-3 rounded-xl text-xs font-medium text-[#3E3C3D] border-[#E5E7EB] bg-white hover:bg-slate-50 gap-1.5 cursor-pointer shadow-none"
                  >
                    <RefreshCcw className="w-3.5 h-3.5 text-[#6E6E80]" />
                    Reassign
                    <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 border-[#E5E7EB]">
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

              {/* SECONDARY */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleShareWhatsApp}
                className="h-8.5 px-3 rounded-xl text-xs font-medium text-emerald-700 border-emerald-600 bg-white hover:bg-emerald-50 gap-1.5 cursor-pointer shadow-none"
              >
                <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                Share to WhatsApp
              </Button>

              {/* PRIMARY */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="h-8.5 px-3.5 rounded-xl bg-[#FA634E] hover:bg-[#e0523d] text-white text-xs font-semibold gap-1.5 shadow-none cursor-pointer">
                    More Actions
                    <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60 border-[#E5E7EB]">
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

          {/* ── 3. TOP ROW BENTO GRID: OPERATIONAL HUB & FINANCIAL HUB ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">

            {/* Left Panel (7 Cols): Resource Summary + Route & Stop Sequence + Live Route Map */}
            <Card className="lg:col-span-7 rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-6 gap-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)] flex flex-col justify-between">
              <div>
                {/* Horizontal Resource Information Strip (Clean 5-Col Grid without cards) */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pb-5 border-b border-[#E5E7EB]">
                  
                  {/* Customer */}
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-[#6E6E80] block">CUSTOMER</span>
                    <div className="flex items-center gap-2 pt-0.5 min-w-0">
                      <Avatar
                        className="w-7 h-7 shrink-0 border border-[#E5E7EB] bg-slate-100 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => trip.customer?.id && navigate(`/customers/${trip.customer.id}`)}
                      >
                        {custAvatarUrl && (
                          <AvatarImage src={resolveFileUrl(custAvatarUrl)} alt={custPersonName} />
                        )}
                        <AvatarFallback className="text-[10px] font-bold text-slate-700 bg-slate-100">
                          {getInitials(custPersonName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p
                            onClick={() => trip.customer?.id && navigate(`/customers/${trip.customer.id}`)}
                            className="text-[14px] font-semibold text-[#3E3C3D] truncate cursor-pointer hover:text-blue-600 transition-colors"
                          >
                            {custPersonName}
                          </p>
                          {trip.customer?.id && (
                            <button
                              type="button"
                              onClick={() => navigate(`/customers/${trip.customer!.id}`)}
                              className="text-[#6E6E80] hover:text-[#3E3C3D] transition-colors shrink-0"
                              title="View Customer Profile"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-[12px] font-normal text-[#6E6E80] truncate">
                          {custCompanyName || trip.customer?.contact_phone || '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Driver */}
                  <div className="space-y-0.5 min-w-0 px-2 sm:border-l border-[#E5E7EB]">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-medium uppercase tracking-wider text-[#6E6E80]">DRIVER</span>
                      {trip.driver && !isClosed && !trip.is_third_party && (
                        <Popover open={isReplaceDriverOpen} onOpenChange={(open) => { setIsReplaceDriverOpen(open); if (!open) setReplaceDriverId(''); }}>
                          <PopoverTrigger asChild>
                            <button type="button" aria-label="Replace driver" className="text-[#6E6E80] hover:text-[#FA634E] transition-colors p-0.5">
                              <RefreshCcw size={11} />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-72 p-3 space-y-2 border-[#E5E7EB] shadow-lg rounded-2xl">
                            <p className="text-xs font-semibold text-[#3E3C3D]">Swap driver</p>
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
                              className="w-full bg-[#FA634E] text-white rounded-lg"
                              disabled={!replaceDriverId || replaceDriverMutation.isPending}
                              onClick={() => replaceDriverMutation.mutate(replaceDriverId)}
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                    <div className="flex items-center gap-2 pt-0.5 min-w-0">
                      <Avatar
                        className="w-7 h-7 shrink-0 border border-[#E5E7EB] bg-slate-100 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => trip.driver?.id && navigate(`/drivers/${trip.driver.id}`)}
                      >
                        {driverAvatarUrl && (
                          <AvatarImage src={resolveFileUrl(driverAvatarUrl)} alt={driverFullName} />
                        )}
                        <AvatarFallback className="text-[10px] font-bold text-slate-700 bg-slate-100">
                          {getInitials(driverFullName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1">
                          <p
                            onClick={() => trip.driver?.id && navigate(`/drivers/${trip.driver.id}`)}
                            className="text-[14px] font-semibold text-[#3E3C3D] truncate cursor-pointer hover:text-violet-600 transition-colors"
                          >
                            {driverFullName}
                          </p>
                          {trip.driver?.id && (
                            <button
                              type="button"
                              onClick={() => navigate(`/drivers/${trip.driver!.id}`)}
                              className="text-[#6E6E80] hover:text-[#3E3C3D] transition-colors shrink-0"
                              title="View Driver Profile"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-[12px] font-normal text-[#6E6E80] font-mono truncate">
                          {trip.driver?.phone_primary || 'Internal Fleet'}
                        </p>
                        
                        {/* Multi-Driver Team Badges */}
                        {trip.tripDrivers && trip.tripDrivers.length > 1 && (
                          <div className="flex items-center gap-1 mt-1 flex-wrap">
                            {trip.tripDrivers.map((td) => (
                              <span
                                key={td.id}
                                className={cn(
                                  "text-[9px] font-extrabold px-1.5 py-0.2 rounded-md border",
                                  td.role === 'PRIMARY'
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : "bg-blue-50 text-blue-700 border-blue-200"
                                )}
                              >
                                {td.driver ? `${td.driver.first_name} ${td.driver.last_name}` : 'Driver'} ({td.role})
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Vehicle */}
                  <div className="space-y-0.5 min-w-0 px-2 border-t sm:border-t-0 sm:border-l border-[#E5E7EB] pt-2 sm:pt-0">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-[#6E6E80] block">VEHICLE</span>
                    <div className="flex items-center gap-2 pt-0.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-slate-100 border border-[#E5E7EB] flex items-center justify-center shrink-0 text-[#6E6E80]">
                        <Truck className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-[#3E3C3D] truncate">
                          {trip.is_third_party
                            ? trip.third_party_vehicle_plate || 'Rented Truck'
                            : trip.vehicle?.plate_number || 'Unassigned'}
                        </p>
                        <p className="text-[12px] font-normal text-[#6E6E80] truncate">
                          {trip.vehicle?.asset_type || 'Fleet Truck'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Rate */}
                  <div className="space-y-0.5 min-w-0 px-2 border-t sm:border-t-0 sm:border-l border-[#E5E7EB] pt-2 sm:pt-0">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-[#6E6E80] block">RATE</span>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-[14px] font-semibold text-[#3E3C3D] font-mono">
                        SAR {baseRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className="text-[12px] font-normal text-[#6E6E80] truncate">Base Contract</p>
                    </div>
                  </div>

                  {/* ETA */}
                  <div className="space-y-0.5 min-w-0 pl-2 border-t sm:border-t-0 sm:border-l border-[#E5E7EB] pt-2 sm:pt-0">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-[#6E6E80] block">ETA</span>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-[14px] font-semibold text-[#3E3C3D]">
                        {trip.planned_end ? formatInDeploymentTz(trip.planned_end, tz, 'hh:mm a') : '—'}
                      </p>
                      <p className="text-[12px] font-normal text-[#6E6E80] truncate">Planned Arrival</p>
                    </div>
                  </div>

                </div>

                {/* Sub Grid Split: Route & Stop Sequence (~40% Left) | Live Route Map (~60% Right) */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-5">
                  
                  {/* Left Column (~40%): Route & Stop Sequence Timeline */}
                  <div className="lg:col-span-5 space-y-4 min-w-0">
                    <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E7EB]">
                      <h3 className="text-base font-semibold text-[#3E3C3D]">
                        Route & Stop Sequence
                      </h3>
                      <span className="text-xs font-normal text-[#6E6E80]">
                        {(trip.stops || []).length} { (trip.stops || []).length === 1 ? 'Stop' : 'Stops' }
                      </span>
                    </div>

                    <ScrollArea className="max-h-[230px] pr-1 pt-1">
                      <div className="space-y-1.5">
                        {(() => {
                          const timelineStops = (trip.stops || []).map((stop, sIdx) => ({
                            id: stop.id || `stop-${sIdx}`,
                            typeEn: sIdx === 0 ? 'Pickup' : sIdx === (trip.stops || []).length - 1 ? 'Destination' : `Stop #${sIdx}`,
                            name: resolveStopName(stop, 'Location'),
                            address: cleanAddressStr(stop.location_address || stop.location?.address),
                            isIntermediate: sIdx > 0 && sIdx < (trip.stops || []).length - 1,
                            isReturnStop: false,
                            actual_arrival: stop.actual_arrival,
                            planned_arrival: stop.planned_arrival,
                          }));

                          return timelineStops.map((stop: any, sIdx: number) => {
                            const totalStops = timelineStops.length;
                            const isFirst = sIdx === 0;
                            const isLast = sIdx === totalStops - 1;
                            const stopCategoryLabel = stop.typeEn ? stop.typeEn.toUpperCase() : (isFirst ? 'PICKUP' : isLast ? 'DESTINATION' : `STOP ${sIdx}`);

                            const nameStr = stop.name || resolveStopName(stop, 'Location');
                            const cleanAddress = stop.address || cleanAddressStr(stop.location_address || stop.location?.address);

                            const isCompleted = !!stop.actual_arrival;
                            const isCurrent = !isCompleted && (isFirst || (sIdx > 0 && !!timelineStops[sIdx - 1]?.actual_arrival));

                            return (
                              <React.Fragment key={stop.id || sIdx}>
                                {/* Compact Stop Row */}
                                <div className={cn(
                                  "p-2 rounded-lg border transition-all flex items-center justify-between gap-3 text-xs",
                                  isCompleted
                                    ? "bg-emerald-50/40 border-emerald-200/60"
                                    : isCurrent
                                    ? "bg-rose-50/30 border-rose-200/50"
                                    : "bg-slate-50/50 border-[#E5E7EB]"
                                )}>
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <span className={cn(
                                      "w-2 h-2 rounded-full shrink-0",
                                      isCompleted ? "bg-emerald-600" : isCurrent ? "bg-[#FA634E]" : "bg-slate-400"
                                    )} />
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className={cn(
                                          "text-[10px] font-bold uppercase tracking-wider shrink-0",
                                          isCompleted ? "text-emerald-700" : isCurrent ? "text-[#FA634E]" : "text-[#6E6E80]"
                                        )}>
                                          {stopCategoryLabel}
                                        </span>
                                        <span className="text-xs font-semibold text-[#3E3C3D] truncate">
                                          {nameStr}
                                        </span>
                                      </div>
                                      {cleanAddress && (
                                        <p className="text-[11px] font-normal text-[#6E6E80] truncate max-w-[200px]">
                                          {cleanAddress}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {stop.actual_arrival ? (
                                    <span className="text-[11px] text-emerald-700 font-mono font-semibold shrink-0">
                                      {formatInDeploymentTz(stop.actual_arrival, tz, 'hh:mm a')}
                                    </span>
                                  ) : stop.planned_arrival ? (
                                    <span className="text-[11px] text-[#6E6E80] font-mono shrink-0">
                                      {formatInDeploymentTz(stop.planned_arrival, tz, 'hh:mm a')}
                                    </span>
                                  ) : null}
                                </div>

                                {/* Down Arrow Connector between stops */}
                                {!isLast && (
                                  <div className="flex items-center justify-center py-0.5">
                                    <div className="w-4 h-4 rounded-full bg-slate-100 border border-[#E5E7EB] flex items-center justify-center text-slate-400">
                                      <ArrowDown size={10} />
                                    </div>
                                  </div>
                                )}
                              </React.Fragment>
                            );
                          });
                        })()}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* Right Column (~60%): Live Route Map with Subtle Vertical Divider */}
                  <div className="lg:col-span-7 space-y-3 min-w-0 lg:border-l border-[#E5E7EB] lg:pl-6">
                    <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E7EB]">
                      <h3 className="text-base font-semibold text-[#3E3C3D]">
                        Live Route Map
                      </h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsExpandMapOpen(true)}
                        className="h-7 px-2.5 text-xs font-medium text-[#3E3C3D] border-[#E5E7EB] hover:bg-slate-50 gap-1.5 cursor-pointer bg-white shadow-none"
                      >
                        <Maximize2 size={12} className="text-[#6E6E80]" />
                        Expand
                      </Button>
                    </div>

                    <div className="rounded-xl overflow-hidden border border-[#E5E7EB] h-[460px] sm:h-[480px]">
                      <TripLiveMapCard
                        tripId={trip.id}
                        refId={trip.ref_id || trip.id}
                        pickupLat={pickup?.location_lat}
                        pickupLng={pickup?.location_lng}
                        dropoffLat={dropoff?.location_lat}
                        dropoffLng={dropoff?.location_lng}
                        pickupLabel={pickup?.location_name || undefined}
                        dropoffLabel={dropoff?.location_name || undefined}
                        resolvedLocation={trip.vehicle?.resolved_location}
                        showHeader={false}
                        showTelemetryBar={true}
                        className="rounded-none border-none h-full"
                        mapHeightClassName="h-[460px] sm:h-[480px]"
                      />
                    </div>
                  </div>

                </div>
              </div>
            </Card>

            {/* Right Panel (5 Cols): Financials & Additional Charges (TOP-RIGHT) */}
            <Card className="lg:col-span-5 rounded-2xl border border-[#E5E7EB] bg-white p-4.5 gap-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              {/* Section Header */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                <h3 className="text-sm font-bold text-[#3E3C3D]">
                  Financials & Additional Charges
                </h3>
                <Button
                  size="sm"
                  onClick={() => {
                    setChargeLines(chargesToInputs(trip.charges));
                    setIsLaborModalOpen(true);
                  }}
                  className="h-7 px-3 rounded-lg text-xs font-semibold bg-[#FA634E] hover:bg-[#e0523d] text-white gap-1 cursor-pointer shadow-none"
                >
                  <Plus size={13} />
                  Add Charge
                </Button>
              </div>

              {/* Financial Summary Top Rows */}
              <div className="space-y-2.5 py-3 border-b border-[#E5E7EB]">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-100/80 border border-slate-200/60 flex items-center justify-center text-slate-500 shrink-0">
                      <Wallet size={13} />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">TOTAL AMOUNT</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-[#3E3C3D]">
                    SAR {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center text-[#FA634E] shrink-0">
                      <Wallet size={13} />
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">BALANCE DUE</span>
                  </div>
                  <span className="font-mono text-sm font-bold text-[#FA634E]">
                    SAR {balanceAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Additional Charges Item List or Clean Compact Empty State */}
              <div className="py-3 text-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">ADDITIONAL CHARGES</span>
                {(trip.charges || []).length === 0 ? (
                  <div className="flex items-start gap-3 py-1">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-400 shrink-0 mt-0.5">
                      <FileText size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#3E3C3D]">No additional charges</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">Waiting, labour and extra-stop charges will appear here.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {(trip.charges || []).map((c, idx) => (
                      <div key={c.id || idx} className="py-1.5 px-2 rounded-lg flex items-center justify-between gap-2 hover:bg-[#EEF1F6]/60 transition-colors">
                        <div className="min-w-0 flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-center text-slate-500 shrink-0">
                            {c.charge_type.toLowerCase().includes('wait') ? (
                              <Timer size={13} />
                            ) : c.charge_type.toLowerCase().includes('labour') || c.charge_type.toLowerCase().includes('labor') ? (
                              <HardHat size={13} />
                            ) : c.charge_type.toLowerCase().includes('stop') ? (
                              <MapPin size={13} />
                            ) : (
                              <Plus size={13} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-[#3E3C3D] truncate">
                              {c.charge_type}
                            </p>
                            <p className="text-[11px] text-[#6E6E80] font-mono">
                              {c.quantity} {c.unit || 'qty'} × SAR {Number(c.rate || 0).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-semibold font-mono text-xs text-[#3E3C3D]">
                            SAR {Number(c.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteChargeLine(idx)}
                            className="text-[#9898A4] hover:text-red-600 transition-colors p-0.5"
                            title="Delete Charge"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Financial Totals Breakdown Box (Exact Boxed Container from Screenshot) */}
              <div className="mt-2 p-3.5 rounded-2xl bg-[#EEF1F6]/50 border border-[#E5E7EB] space-y-2.5 text-xs">
                {/* Base Rate */}
                <div className="flex items-center justify-between pb-2 border-b border-dashed border-[#E5E7EB]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-center text-slate-500 shrink-0">
                      <FileText size={13} />
                    </div>
                    <span className="text-xs font-semibold text-[#3E3C3D]">Base Rate</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#3E3C3D]">
                    SAR {baseRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Additional Charges */}
                <div className="flex items-center justify-between pb-2 border-b border-dashed border-[#E5E7EB]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-center text-[#FA634E] shrink-0">
                      <Plus size={13} className="text-[#FA634E]" />
                    </div>
                    <span className="text-xs font-semibold text-[#3E3C3D]">Additional Charges</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#FA634E]">
                    + SAR {chargesTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Driver Payout */}
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-center text-slate-500 shrink-0">
                      <Minus size={13} />
                    </div>
                    <span className="text-xs font-semibold text-[#3E3C3D]">Driver Payout</span>
                  </div>
                  <span className="font-mono text-xs font-medium text-slate-500">
                    − SAR {driverCharge.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                {/* Balance Due Line inside box */}
                <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider font-bold text-[#3E3C3D]">BALANCE DUE</span>
                  <span className="font-mono text-[18px] font-extrabold text-[#FA634E]">
                    SAR {balanceAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </Card>

          </div>

          {/* ── 4. SECONDARY BENTO GRID: ACTIVITY LOG & DOCUMENTS / INVOICE WORKSPACE ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">

            {/* Activity Log (4 Columns) - Compact Chronological Timeline */}
            <Card className="lg:col-span-4 rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-6 gap-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-[#E5E7EB]">
                <h3 className="text-base font-semibold text-[#3E3C3D]">
                  Activity Log
                </h3>
              </div>

              {/* Timeline List */}
              <div className="pt-4 space-y-4">
                {timelineSteps.map((step, i) => {
                  const isLast = i === timelineSteps.length - 1;
                  const status = timelineStatus[i];

                  return (
                    <div key={step.key} className="relative flex items-start gap-3">
                      {/* Left Marker Column with Connecting Line */}
                      <div className="relative flex flex-col items-center shrink-0 w-3.5">
                        {/* Event Marker */}
                        <div className="relative z-10 mt-1 flex items-center justify-center">
                          {status === 'done' ? (
                            <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] shrink-0" />
                          ) : status === 'active' ? (
                            <div className="w-2.5 h-2.5 rounded-full bg-[#FA634E] shrink-0" />
                          ) : (
                            <div className="w-2.5 h-2.5 rounded-full bg-[#D1D5DB] shrink-0" />
                          )}
                        </div>

                        {/* Connector Line (rendered between items) */}
                        {!isLast && (
                          <div className="absolute top-[14px] bottom-[-18px] w-[1px] bg-[#D9DCE3] z-0" />
                        )}
                      </div>

                      {/* Event Details */}
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <p className={cn(
                          "text-[13px] font-semibold",
                          status === 'pending' ? "text-[#6E6E80]" : "text-[#3E3C3D]"
                        )}>
                          {step.label}
                        </p>
                        {step.time ? (
                          <p className="text-xs font-mono font-medium text-[#6E6E80]">
                            {fullDateTime(step.time, tz)}
                          </p>
                        ) : step.sub ? (
                          <p className="text-xs font-normal text-[#6E6E80]">
                            {step.sub}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Documents & Attachments (8 Columns) - Professional Document Ledger Format */}
            <Card className="lg:col-span-8 rounded-2xl border border-[#E5E7EB] bg-white p-5 sm:p-6 gap-0 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-[#E5E7EB]">
                <h3 className="text-base font-semibold text-[#3E3C3D] flex items-center gap-2">
                  Documents & Attachments
                  <span className="text-xs font-medium text-[#6E6E80]">({documents.length})</span>
                </h3>

                <Button
                  size="sm"
                  onClick={() => { setUploadDocType(trip.status === 'Completed' ? 'POD' : undefined); setIsUploadModalOpen(true); }}
                  className="h-9 px-3.5 rounded-[10px] text-sm font-semibold bg-[#FA634E] hover:bg-[#e0523d] text-white gap-1.5 cursor-pointer shadow-none"
                >
                  <UploadCloud size={16} />
                  Upload Document
                </Button>
              </div>

              {/* Document Ledger Content */}
              <div className="pt-4 space-y-5">
                {isLoadingDocs ? (
                  <Skeleton className="h-32 w-full rounded-xl" />
                ) : documents.length === 0 ? (
                  <p className="text-xs text-[#6E6E80] py-4">No documents uploaded yet for this trip.</p>
                ) : (
                  (() => {
                    const loadingDocs = documents.filter(d => {
                      const t = (d.doc_type || d.documentType?.name || '').toUpperCase();
                      const name = (d.doc_type || d.documentType?.name || '').toLowerCase();
                      return t.includes('LOAD') || t.includes('CARGO') || name.includes('load') || name.includes('cargo') || name.includes('photo');
                    });
                    const podDocs = documents.filter(d => {
                      const t = (d.doc_type || d.documentType?.name || '').toUpperCase();
                      const name = (d.doc_type || d.documentType?.name || '').toLowerCase();
                      return (t.includes('POD') || t.includes('DELIVERY') || name.includes('pod') || name.includes('delivery')) && !loadingDocs.includes(d);
                    });
                    const otherDocs = documents.filter(d => !podDocs.includes(d) && !loadingDocs.includes(d));

                    const DocRowItem = ({ doc }: { doc: any }) => {
                      const isImg = isImageFile(doc.file_url, doc.mime_type);
                      const fileUrl = resolveFileUrl(doc.file_url);
                      const [hasImgError, setHasImgError] = useState(false);

                      return (
                        <div key={doc.id} className="py-2.5 flex items-center justify-between gap-4 border-b border-[#E5E7EB] last:border-0">
                          <div className="flex items-center gap-3.5 min-w-0">
                            {/* 64x64 Thumbnail with Controlled Fallback */}
                            {!isImg || hasImgError ? (
                              <div className="w-16 h-16 rounded-[10px] bg-[#EEF1F6] border border-[#E5E7EB] flex items-center justify-center text-[#6E6E80] shrink-0">
                                <FileText size={22} className="text-[#6E6E80]" />
                              </div>
                            ) : (
                              <div
                                onClick={() => setPreviewImage({ url: fileUrl, title: documentDisplayName(doc), date: doc.createdAt })}
                                className="w-16 h-16 rounded-[10px] overflow-hidden shrink-0 border border-[#E5E7EB] bg-[#EEF1F6] cursor-pointer group relative"
                              >
                                <img
                                  src={fileUrl}
                                  alt={documentDisplayName(doc)}
                                  onError={() => setHasImgError(true)}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                />
                                <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                  <Eye size={16} />
                                </div>
                              </div>
                            )}

                            {/* Document Information */}
                            <div className="min-w-0 flex-1 space-y-1">
                              <p className="text-sm font-semibold text-[#3E3C3D] truncate" title={documentDisplayName(doc)}>
                                {documentDisplayName(doc)}
                              </p>
                              <p className="text-xs font-normal text-[#6E6E80]">
                                Uploaded {formatInDeploymentTz(doc.createdAt, tz, 'dd MMM yyyy · hh:mm a')}
                              </p>
                            </div>
                          </div>

                          {/* Document Actions */}
                          <div className="flex items-center gap-2 shrink-0">
                            {isImg && !hasImgError && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPreviewImage({ url: fileUrl, title: documentDisplayName(doc), date: doc.createdAt })}
                                className="h-8.5 px-3 rounded-lg text-xs font-semibold text-[#FA634E] border-[#FA634E] bg-white hover:bg-rose-50 gap-1.5 cursor-pointer shadow-none"
                              >
                                <Eye size={13} />
                                Preview
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              asChild
                              className="h-8.5 px-3 rounded-lg text-xs font-medium text-[#3E3C3D] border-[#E5E7EB] bg-white hover:bg-slate-50 gap-1.5 cursor-pointer shadow-none"
                            >
                              <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink size={13} />
                                Open
                              </a>
                            </Button>
                          </div>
                        </div>
                      );
                    };

                    return (
                      <>
                        {/* 1. Loaded / Cargo Photos */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 pb-1">
                            <Camera className="w-4 h-4 text-[#3E3C3D]" />
                            <h4 className="text-[13px] font-semibold text-[#3E3C3D]">
                              1. Loaded / Cargo Photos
                            </h4>
                            <span className="text-xs font-normal text-[#6E6E80]">({loadingDocs.length})</span>
                          </div>

                          {loadingDocs.length === 0 ? (
                            <p className="text-xs text-[#6E6E80] py-1">No cargo/loading photos uploaded.</p>
                          ) : (
                            <div className="divide-y divide-[#E5E7EB]">
                              {loadingDocs.map((doc) => <DocRowItem key={doc.id} doc={doc} />)}
                            </div>
                          )}
                        </div>

                        <Separator className="bg-[#E5E7EB]" />

                        {/* 2. Proof of Delivery (POD) */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 pb-1">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <h4 className="text-[13px] font-semibold text-[#3E3C3D]">
                              2. Proof of Delivery (POD)
                            </h4>
                            <span className="text-xs font-normal text-[#6E6E80]">({podDocs.length})</span>
                          </div>

                          {podDocs.length === 0 ? (
                            <p className="text-xs text-[#6E6E80] py-1">No POD documents uploaded.</p>
                          ) : (
                            <div className="divide-y divide-[#E5E7EB]">
                              {podDocs.map((doc) => <DocRowItem key={doc.id} doc={doc} />)}
                            </div>
                          )}
                        </div>

                        <Separator className="bg-[#E5E7EB]" />

                        {/* 3. Waybill & Other Documents */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 pb-1">
                            <FileText className="w-4 h-4 text-[#3E3C3D]" />
                            <h4 className="text-[13px] font-semibold text-[#3E3C3D]">
                              3. Waybill & Other Documents
                            </h4>
                            <span className="text-xs font-normal text-[#6E6E80]">({otherDocs.length})</span>
                          </div>

                          {otherDocs.length === 0 ? (
                            <p className="text-xs text-[#6E6E80] py-1">No waybill or secondary documents uploaded.</p>
                          ) : (
                            <div className="divide-y divide-[#E5E7EB]">
                              {otherDocs.map((doc) => <DocRowItem key={doc.id} doc={doc} />)}
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()
                )}
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
              resolvedLocation={trip.vehicle?.resolved_location}
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
