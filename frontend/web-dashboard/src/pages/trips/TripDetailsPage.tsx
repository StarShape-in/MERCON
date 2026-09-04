import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronRight, ChevronDown, Copy, Check, Printer, Phone, RefreshCcw,
  Navigation, CheckCircle2, XCircle, AlertTriangle, ListChecks,
  Calendar, ReceiptText, FileStack, PackageCheck, Gauge,
  Building2, User as UserIcon, Truck, FileText, Route as RouteIcon,
  UploadCloud, ExternalLink, Timer, MapPin, ArrowRight, ArrowDown, SquarePen, MessageCircle, UserCheck, History,
  Coins, Pencil, Plus, PlusCircle, Minus, Wallet, DollarSign, HardHat, X, Camera, Eye, Maximize2, Trash2, ShieldCheck, Clock,
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
          {/* ── UNIFIED TRIP OPERATIONAL SURFACE ── */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xs divide-y divide-[#E5E7EB] overflow-hidden">

            {/* 1. TOP COMBINED TRIP HEADER (DRIVER AVATAR + TRIP ID + DRIVER + VEHICLE + ROUTE + STATUS) */}
            <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
              {/* Left: Primary Driver Avatar & Combined Trip/Resource Details */}
              <div className="flex items-center gap-4 min-w-0">
                {/* Primary Driver Avatar (Bigger Profile) */}
                <Avatar
                  className="w-13 h-13 sm:w-14 sm:h-14 shrink-0 border-2 border-white ring-1 ring-[#E5E7EB] bg-slate-100 cursor-pointer hover:opacity-90 transition-opacity shadow-sm"
                  onClick={() => trip.driver?.id && navigate(`/drivers/${trip.driver.id}`)}
                >
                  {driverAvatarUrl && (
                    <AvatarImage src={resolveFileUrl(driverAvatarUrl)} alt={driverFullName} />
                  )}
                  <AvatarFallback className="text-base font-bold text-slate-700 bg-slate-100">
                    {getInitials(driverFullName)}
                  </AvatarFallback>
                </Avatar>

                {/* Combined Metadata Lines */}
                <div className="space-y-1 min-w-0">
                  {/* Line 1: Trip ID, Route, Status Badge */}
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-[20px] font-bold font-mono tracking-tight text-[#3E3C3D] flex items-center gap-1">
                      {trip.ref_id || trip.id}
                      <button type="button" onClick={handleCopyId} aria-label="Copy trip ID" className="text-[#9898A4] hover:text-[#FA634E] transition-colors p-0.5 cursor-pointer">
                        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </h1>

                    <span className="text-[#9898A4]">•</span>

                    <span className="text-sm font-semibold text-[#3E3C3D] truncate">
                      {routeLabel}
                    </span>

                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0"
                      style={{ color: tone.color, backgroundColor: tone.bg }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tone.color }} />
                      {statusLabel(trip.status)}
                    </span>
                  </div>

                  {/* Line 2: Driver Name (Bigger), Driver Phone, Swap Button, Vehicle Plate/Asset */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#6E6E80]">
                    <span className="font-bold text-sm text-[#3E3C3D] flex items-center gap-1 cursor-pointer hover:text-violet-600 transition-colors" onClick={() => trip.driver?.id && navigate(`/drivers/${trip.driver.id}`)}>
                      {driverFullName}
                      {trip.driver?.id && <ExternalLink className="w-3.5 h-3.5 text-[#9898A4]" />}
                    </span>

                    {trip.driver && !isClosed && !trip.is_third_party && (
                      <Popover open={isReplaceDriverOpen} onOpenChange={(open) => { setIsReplaceDriverOpen(open); if (!open) setReplaceDriverId(''); }}>
                        <PopoverTrigger asChild>
                          <button type="button" aria-label="Replace driver" className="text-[#6E6E80] hover:text-[#FA634E] transition-colors p-0.5 cursor-pointer" title="Swap Driver">
                            <RefreshCcw size={12} />
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

                    <span className="text-[#9898A4]">•</span>
                    <span className="font-mono text-xs text-[#3E3C3D] font-medium">{trip.driver?.phone_primary || 'Internal Fleet'}</span>

                    <span className="text-[#9898A4]">•</span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100/90 border border-slate-200/80 font-semibold text-xs text-[#3E3C3D]">
                      <Truck className="w-3.5 h-3.5 text-[#FA634E]" />
                      <span>
                        {trip.is_third_party
                          ? trip.third_party_vehicle_plate || 'Rented Truck'
                          : trip.vehicle?.plate_number || 'Unassigned'}
                        {trip.vehicle?.asset_type
                          ? ` (${trip.vehicle.asset_type})`
                          : trip.vehicle?.vehicle_class
                          ? ` (${trip.vehicle.vehicle_class})`
                          : ''}
                      </span>
                    </span>

                    <span className="text-[#9898A4]">•</span>
                    <span className="text-xs font-normal text-[#6E6E80] inline-flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#9898A4]" />
                      Created {formatInDeploymentTz(trip.createdAt, tz, 'MMM dd, yyyy · hh:mm a')}
                    </span>
                  </div>

                  {/* Multi-Driver Team Badges */}
                  {trip.tripDrivers && trip.tripDrivers.length > 1 && (
                    <div className="flex items-center gap-1 pt-0.5 flex-wrap">
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

              {/* Right: Quick Action Buttons (Prominent Share to WhatsApp & More Actions) */}
              <div className="flex items-center gap-2.5 shrink-0">
                <Button
                  onClick={handleShareWhatsApp}
                  className="h-9 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-2 shadow-none cursor-pointer"
                >
                  <WhatsAppIcon className="w-4 h-4 fill-current text-white shrink-0" />
                  Share WhatsApp
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="h-9 px-4 rounded-xl bg-[#FA634E] hover:bg-[#e0523d] text-white text-xs font-semibold gap-1.5 shadow-none cursor-pointer">
                      More Actions
                      <ChevronDown className="w-3.5 h-3.5 opacity-80" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 border-[#E5E7EB]">
                    <DropdownMenuItem onClick={() => navigate(`/trips/${trip.id}/edit`)}>
                      <SquarePen size={14} className="mr-2 text-[#6E6E80]" /> Edit Trip Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShareWhatsApp}>
                      <WhatsAppIcon className="w-3.5 h-3.5 mr-2 text-emerald-600" /> Share to WhatsApp
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleOpenReassign('driver')}>
                      <UserIcon size={14} className="mr-2 text-[#6E6E80]" /> Reassign Driver
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenReassign('truck')}>
                      <Truck size={14} className="mr-2 text-[#6E6E80]" /> Reassign Truck
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenReassign('both')}>
                      <RefreshCcw size={14} className="mr-2 text-[#6E6E80]" /> Reassign Both
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
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

            {/* 2. MAIN OPERATIONAL WORKSPACE (ROUTE, STOPS & MAP ON LEFT | FINANCIALS, CHARGES & CUSTOMER ON RIGHT) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E5E7EB]">
              
              {/* Left Column (8 Cols): Route, Stop Sequence & Live Route Map */}
              <div className="lg:col-span-8 p-4.5 sm:p-6 space-y-6">
                
                {/* Live Route Map (Full-Width Clean Map View) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
                    <h3 className="text-base font-semibold text-[#3E3C3D]">
                      Live Route Map
                    </h3>
                    <Button
                      size="sm"
                      onClick={() => setIsExpandMapOpen(true)}
                      className="h-7.5 px-3 rounded-lg text-xs font-semibold bg-[#FA634E] hover:bg-[#e0523d] text-white gap-1.5 cursor-pointer shadow-none"
                    >
                      <Route size={14} />
                      Live Stops
                    </Button>
                  </div>

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
                    showTelemetryBar={false}
                    mapHeightClassName="h-[400px]"
                  />
                </div>

              </div>

              {/* Right Column (4 Cols): Customer Profile & Financials & Additional Charges */}
              <div className="lg:col-span-4 p-4.5 sm:p-5 space-y-3.5">
                
                {/* Section Header */}
                <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E7EB]">
                  <h3 className="text-sm font-bold text-[#3E3C3D]">
                    Customer & Financials
                  </h3>
                  <Button
                    size="sm"
                    onClick={() => {
                      setChargeLines(chargesToInputs(trip.charges));
                      setIsLaborModalOpen(true);
                    }}
                    className="h-6.5 px-2.5 rounded-lg text-[11px] font-semibold bg-[#FA634E] hover:bg-[#e0523d] text-white gap-1 cursor-pointer shadow-none"
                  >
                    <Plus size={12} />
                    Add Charge
                  </Button>
                </div>

                {/* Integrated Customer Profile Section */}
                <div className="pb-3 border-b border-[#E5E7EB] flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar
                      className="w-9 h-9 shrink-0 border border-[#E5E7EB] bg-slate-100 cursor-pointer hover:opacity-90 transition-opacity shadow-2xs"
                      onClick={() => trip.customer?.id && navigate(`/customers/${trip.customer.id}`)}
                    >
                      {custAvatarUrl && (
                        <AvatarImage src={resolveFileUrl(custAvatarUrl)} alt={custPersonName} />
                      )}
                      <AvatarFallback className="text-[11px] font-bold text-slate-700 bg-slate-100">
                        {getInitials(custPersonName)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <p
                        onClick={() => trip.customer?.id && navigate(`/customers/${trip.customer.id}`)}
                        className="text-xs font-bold text-[#3E3C3D] truncate cursor-pointer hover:text-blue-600 transition-colors"
                      >
                        {custPersonName}
                      </p>
                      <p className="text-[11px] text-[#6E6E80] truncate font-medium mt-0.5">
                        {custCompanyName || trip.customer?.contact_phone || '—'}
                      </p>
                    </div>
                  </div>

                  {trip.customer?.id && (
                    <button
                      type="button"
                      onClick={() => navigate(`/customers/${trip.customer!.id}`)}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 transition-colors cursor-pointer shrink-0"
                    >
                      View Profile <ExternalLink size={11} />
                    </button>
                  )}
                </div>

                {/* Financial Summary Metric Cards */}
                <div className="space-y-2.5 py-2 border-b border-[#E5E7EB]">
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

                {/* Additional Charges Item List */}
                <div className="py-2 text-xs space-y-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">ADDITIONAL CHARGES</span>
                  {(trip.charges || []).length === 0 ? (
                    <div className="flex items-start gap-3 py-2 px-3 bg-slate-50/60 rounded-xl border border-[#E5E7EB]">
                      <div className="w-7 h-7 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-center text-slate-400 shrink-0 mt-0.5">
                        <FileText size={14} />
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
                              className="text-[#9898A4] hover:text-red-600 transition-colors p-0.5 cursor-pointer"
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

                {/* Financial Breakdown Summary Box */}
                <div className="p-3.5 rounded-xl bg-slate-50/80 border border-[#E5E7EB] space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-dashed border-[#E5E7EB]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-center text-slate-500 shrink-0">
                        <FileText size={12} />
                      </div>
                      <span className="text-xs font-medium text-[#3E3C3D]">Base Rate</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#3E3C3D]">
                      SAR {baseRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-2 border-b border-dashed border-[#E5E7EB]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-center text-[#FA634E] shrink-0">
                        <Plus size={12} />
                      </div>
                      <span className="text-xs font-medium text-[#3E3C3D]">Additional Charges</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-[#FA634E]">
                      + SAR {chargesTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-lg bg-white border border-[#E5E7EB] flex items-center justify-center text-slate-500 shrink-0">
                        <Minus size={12} />
                      </div>
                      <span className="text-xs font-medium text-[#3E3C3D]">Driver Payout</span>
                    </div>
                    <span className="font-mono text-xs font-medium text-slate-500">
                      − SAR {driverCharge.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wider font-bold text-[#3E3C3D]">BALANCE DUE</span>
                    <span className="font-mono text-[18px] font-extrabold text-[#FA634E]">
                      SAR {balanceAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

              </div>

            </div>

          {/* 3. SECONDARY OPERATIONAL WORKSPACE (ACTIVITY LOG ON LEFT | DOCUMENTS & ATTACHMENTS ON RIGHT) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
            
            {/* Left Column (4 Cols): Activity Log Card */}
            <div className="lg:col-span-4 bg-white rounded-2xl border border-[#E5E7EB] p-4.5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                <h3 className="text-base font-semibold text-[#3E3C3D]">
                  Activity Log
                </h3>
              </div>

              <div className="space-y-4 pt-1">
                {timelineSteps.map((step, i) => {
                  const isLast = i === timelineSteps.length - 1;
                  const status = timelineStatus[i];

                  return (
                    <div key={step.key} className="relative flex items-start gap-3">
                      <div className="relative flex flex-col items-center shrink-0 w-3.5">
                        <div className="relative z-10 mt-1 flex items-center justify-center">
                          {status === 'done' ? (
                            <div className="w-2.5 h-2.5 rounded-full bg-[#10B981] shrink-0" />
                          ) : status === 'active' ? (
                            <div className="w-2.5 h-2.5 rounded-full bg-[#FA634E] shrink-0" />
                          ) : (
                            <div className="w-2.5 h-2.5 rounded-full bg-[#D1D5DB] shrink-0" />
                          )}
                        </div>

                        {!isLast && (
                          <div className="absolute top-[14px] bottom-[-18px] w-[1px] bg-[#D9DCE3] z-0" />
                        )}
                      </div>

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
            </div>

            {/* Right Column (8 Cols): Documents & Attachments Card */}
            <div className="lg:col-span-8 bg-white rounded-2xl border border-[#E5E7EB] p-4.5 sm:p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                  <h3 className="text-base font-semibold text-[#3E3C3D] flex items-center gap-2">
                    Documents & Attachments
                    <span className="text-xs font-medium text-[#6E6E80]">({documents.length})</span>
                  </h3>

                  <Button
                    size="sm"
                    onClick={() => { setUploadDocType(trip.status === 'Completed' ? 'POD' : undefined); setIsUploadModalOpen(true); }}
                    className="h-8.5 px-3.5 rounded-[10px] text-xs font-semibold bg-[#FA634E] hover:bg-[#e0523d] text-white gap-1.5 cursor-pointer shadow-none"
                  >
                    <UploadCloud size={15} />
                    Upload Document
                  </Button>
                </div>

                <div className="space-y-5 pt-1">
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
                              {!isImg || hasImgError ? (
                                <div className="w-14 h-14 rounded-[10px] bg-[#EEF1F6] border border-[#E5E7EB] flex items-center justify-center text-[#6E6E80] shrink-0">
                                  <FileText size={20} className="text-[#6E6E80]" />
                                </div>
                              ) : (
                                <div
                                  onClick={() => setPreviewImage({ url: fileUrl, title: documentDisplayName(doc), date: doc.createdAt })}
                                  className="w-14 h-14 rounded-[10px] overflow-hidden shrink-0 border border-[#E5E7EB] bg-[#EEF1F6] cursor-pointer group relative"
                                >
                                  <img
                                    src={fileUrl}
                                    alt={documentDisplayName(doc)}
                                    onError={() => setHasImgError(true)}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                  />
                                  <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                    <Eye size={14} />
                                  </div>
                                </div>
                              )}

                              <div className="min-w-0 flex-1 space-y-1">
                                <p className="text-xs font-semibold text-[#3E3C3D] truncate" title={documentDisplayName(doc)}>
                                  {documentDisplayName(doc)}
                                </p>
                                <p className="text-[11px] font-normal text-[#6E6E80]">
                                  Uploaded {formatInDeploymentTz(doc.createdAt, tz, 'dd MMM yyyy · hh:mm a')}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {isImg && !hasImgError && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPreviewImage({ url: fileUrl, title: documentDisplayName(doc), date: doc.createdAt })}
                                  className="h-8 px-2.5 rounded-lg text-xs font-semibold text-[#FA634E] border-[#FA634E] bg-white hover:bg-rose-50 gap-1.5 cursor-pointer shadow-none"
                                >
                                  <Eye size={12} />
                                  Preview
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="h-8 px-2.5 rounded-lg text-xs font-medium text-[#3E3C3D] border-[#E5E7EB] bg-white hover:bg-slate-50 gap-1.5 cursor-pointer shadow-none"
                              >
                                <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink size={12} />
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
                              <h4 className="text-xs font-semibold text-[#3E3C3D]">
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
                              <h4 className="text-xs font-semibold text-[#3E3C3D]">
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
                              <h4 className="text-xs font-semibold text-[#3E3C3D]">
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
                </div>
              </div>
            </div>

            {/* 4. LIVE VEHICLE STATUS (BOTTOM OPERATIONAL TELEMETRY HUD SUMMARY) */}
            <TripLiveMapCard
              tripId={trip.id}
              refId={trip.ref_id || trip.id}
              pickupLat={pickup?.location_lat}
              pickupLng={pickup?.location_lng}
              dropoffLat={dropoff?.location_lat}
              dropoffLng={dropoff?.location_lng}
              resolvedLocation={trip.vehicle?.resolved_location}
              showOnlyTelemetry={true}
            />
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

      {/* ── Live Stops Full-Screen Operational Radar View ── */}
      <Dialog open={isExpandMapOpen} onOpenChange={setIsExpandMapOpen}>
        <DialogContent className="max-w-[96vw] w-full h-[90vh] max-h-[90vh] p-0 overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl bg-slate-900 flex flex-col">
          {/* Top Control Header */}
          <div className="px-5 py-3 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-[#FA634E]/20 border border-[#FA634E]/30 flex items-center justify-center text-[#FA634E] shrink-0">
                <Route size={16} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-white">Live Route & Stops Radar</h3>
                  <span className="font-mono text-xs font-bold text-slate-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                    {trip.ref_id || trip.id}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-medium truncate">
                  {routeLabel} · {(trip.stops || []).length} Total Stops
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpandMapOpen(false)}
              className="h-8 px-3 rounded-lg text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 gap-1.5 cursor-pointer shrink-0"
            >
              <X size={16} /> Close Radar
            </Button>
          </div>

          {/* Main Workspace: Map on Left (Flex-1) | Live Stops Sidebar on Right (Width 96) */}
          <div className="flex-1 flex flex-col lg:flex-row h-full overflow-hidden">
            {/* Left: Map Viewport Canvas */}
            <div className="flex-1 h-full min-w-0 relative">
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
                mapHeightClassName="h-full"
              />
            </div>

            {/* Right: Live Stops Sidebar */}
            <div className="w-full lg:w-96 h-full shrink-0 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-5 space-y-4 overflow-y-auto no-scrollbar">
              {/* Title Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FA634E] animate-ping" />
                  <h4 className="text-sm font-extrabold uppercase tracking-wider text-[#3E3C3D] dark:text-slate-100">
                    Live Stops Sequence
                  </h4>
                </div>
                <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                  {(trip.stops || []).length} STOPS
                </span>
              </div>

              {/* Detailed Stops Timeline List */}
              <div className="space-y-3 pt-1">
                {(() => {
                  const timelineStops = (trip.stops || []).map((stop, sIdx) => ({
                    id: stop.id || `stop-${sIdx}`,
                    typeEn: sIdx === 0 ? 'Pickup' : sIdx === (trip.stops || []).length - 1 ? 'Destination' : `Stop #${sIdx}`,
                    name: resolveStopName(stop, 'Location'),
                    actual_arrival: stop.actual_arrival,
                    planned_arrival: stop.planned_arrival,
                  }));

                  return timelineStops.map((stop: any, sIdx: number) => {
                    const isFirst = sIdx === 0;
                    const isLast = sIdx === timelineStops.length - 1;
                    const isCompleted = !!stop.actual_arrival;
                    const isCurrent = !isCompleted && (isFirst || (sIdx > 0 && !!timelineStops[sIdx - 1]?.actual_arrival));
                    const stopCategoryLabel = stop.typeEn ? stop.typeEn.toUpperCase() : (isFirst ? 'PICKUP' : isLast ? 'DESTINATION' : `STOP ${sIdx}`);

                    return (
                      <div key={stop.id || sIdx} className="relative flex items-start gap-3 min-w-0">
                        {/* Connector dot and vertical guide line */}
                        <div className="flex flex-col items-center shrink-0 w-4 pt-1">
                          <span className={cn(
                            "w-3 h-3 rounded-full shrink-0 z-10 transition-all",
                            isCompleted
                              ? "bg-emerald-500 ring-4 ring-emerald-100 dark:ring-emerald-950"
                              : isCurrent
                              ? "bg-[#FA634E] ring-4 ring-rose-200 dark:ring-rose-950 animate-pulse"
                              : "bg-slate-300 dark:bg-slate-700"
                          )} />
                          {!isLast && (
                            <div className="w-[2px] h-10 bg-slate-200 dark:bg-slate-800 my-1" />
                          )}
                        </div>

                        {/* Stop Information Box */}
                        <div className={cn(
                          "flex-1 min-w-0 p-3 rounded-xl border text-xs transition-all shadow-2xs space-y-1",
                          isCompleted
                            ? "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-900/50 text-emerald-900 dark:text-emerald-300"
                            : isCurrent
                            ? "bg-rose-50/90 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 ring-2 ring-rose-400/20"
                            : "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-800 text-[#3E3C3D] dark:text-slate-200"
                        )}>
                          <div className="flex items-center justify-between gap-1 min-w-0">
                            <span className={cn(
                              "text-[10px] font-extrabold uppercase tracking-wider truncate",
                              isCompleted ? "text-emerald-700 dark:text-emerald-400" : isCurrent ? "text-[#FA634E]" : "text-slate-500"
                            )}>
                              {stopCategoryLabel}
                            </span>
                            {stop.actual_arrival ? (
                              <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-mono font-bold shrink-0">
                                {formatInDeploymentTz(stop.actual_arrival, tz, 'hh:mm a')}
                              </span>
                            ) : isCurrent ? (
                              <span className="text-[9px] font-extrabold uppercase bg-rose-100 text-rose-800 dark:bg-rose-900/80 dark:text-rose-200 px-1.5 py-0.5 rounded shrink-0">
                                IN PROGRESS
                              </span>
                            ) : null}
                          </div>
                          <p className="font-bold text-sm text-[#3E3C3D] dark:text-slate-100 truncate" title={stop.name}>
                            {stop.name}
                          </p>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
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
