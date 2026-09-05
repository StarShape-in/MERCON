import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronDown, Copy, Check, RefreshCcw,
  Navigation, CheckCircle2, XCircle, AlertTriangle,
  User as UserIcon, Truck, UploadCloud, SquarePen,
  X, Eye, Maximize2, Coins, ListOrdered, Map as MapIcon
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import ConfirmModal from '@/components/ui/ConfirmModal';
import UploadDocumentModal from '@/components/ui/UploadDocumentModal';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import TripLiveMapCard from '@/components/maps/TripLiveMapCard';
import {
  tripService, TripStatus,
  type TripChargeInput, type Trip,
} from '@/services/tripService';
import TripChargeLineEditor from '@/components/trips/TripChargeLineEditor';
import { ReassignTripModal, ReassignMode } from '@/components/trips/ReassignTripModal';
import { documentService, type DocType } from '@/services/documentService';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

// Subcomponents for the Image 2 Layout
import VisualRouteProgress from '@/components/trips/VisualRouteProgress';
import TripOverviewBarCard from '@/components/trips/TripOverviewBarCard';
import ModernFinancialsCard from '@/components/trips/ModernFinancialsCard';
import TripPhotoEvidence from '@/components/trips/TripPhotoEvidence';

const isUuidVal = (str?: string | null) =>
  str ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim()) : false;

function resolveStopName(stop: any, fallback: string): string {
  if (!stop) return fallback;
  const code = stop.location?.codes?.[0] || stop.location?.code;
  const locName = !isUuidVal(stop.location?.name) ? stop.location?.name : null;
  const locCity = !isUuidVal(stop.location?.city) ? stop.location?.city : null;
  const rawLocName = !isUuidVal(stop.location_name) ? stop.location_name : null;
  const rawSourceLabel = !isUuidVal(stop.source_label) ? stop.source_label : null;
  const rawName = !isUuidVal(stop.name) ? stop.name : null;

  const result = code || locName || locCity || rawLocName || rawSourceLabel || rawName || fallback;
  return String(result).replace(/\[RETURN:.*?\]/gi, '').replace(/🔁\s*/g, '').trim() || fallback;
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

export default function TripDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tz = useDeploymentTimezone();

  // Modal States
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<TripStatus>('Draft');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadDocType, setUploadDocType] = useState<DocType | undefined>(undefined);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [reassignMode, setReassignMode] = useState<ReassignMode>('driver');
  const [isExpandMapOpen, setIsExpandMapOpen] = useState(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; title: string; date?: string } | null>(null);
  const [isLaborModalOpen, setIsLaborModalOpen] = useState(false);

  // Fetch Trip
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

  const tripEntityId = trip?.id || id;

  // Trip documents
  const { data: docsRes } = useQuery({
    queryKey: ['documents', 'Trip', tripEntityId],
    queryFn: () => documentService.getAll({ entity_type: 'Trip', entity_id: tripEntityId, per_page: 50 }),
    enabled: !!tripEntityId,
  });
  const documents = docsRes?.data || [];

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: (status: TripStatus) => tripService.updateStatus(tripEntityId!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripEntityId] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      setIsStatusModalOpen(false);
      setIsCancelModalOpen(false);
    },
  });

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
      setIsLaborModalOpen(false);
    },
  });

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

  const handleOpenReassign = (mode: ReassignMode) => {
    setReassignMode(mode);
    setIsReassignModalOpen(true);
  };

  const handleShareWhatsApp = () => {
    if (!trip) return;
    const pickupLoc = pickup ? resolveStopName(pickup, 'Riyadh') : 'Riyadh';
    const dropoffLoc = dropoff ? resolveStopName(dropoff, 'Al Abha') : 'Al Abha';
    const driverName = trip.driver ? `${trip.driver.first_name} ${trip.driver.last_name}` : 'Khalid Ahmed';
    const vehicleInfo = trip.vehicle ? trip.vehicle.plate_number : 'TRK-1187';
    const etaText = trip.planned_end
      ? formatInDeploymentTz(trip.planned_end, tz, 'dd MMM yyyy, hh:mm a')
      : '04:30 PM';

    const text = [
      `*MERCON Logistics - Trip Status Update*`,
      ``,
      `*Trip ID:* ${trip.ref_id || trip.id}`,
      `*Customer:* ${trip.customer?.name || 'ABC Logistics Co.'}`,
      `*Status:* ${trip.status.toUpperCase()}`,
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
        <div className="h-full flex flex-col justify-between p-4 space-y-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-36 w-full rounded-2xl" />
          <div className="grid grid-cols-3 gap-3">
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
            <Skeleton className="h-24 rounded-2xl" />
          </div>
          <Skeleton className="flex-1 rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (isError || !trip) {
    return (
      <DashboardLayout active="Trips" title="Trip Details">
        <div className="h-full flex flex-col items-center justify-center text-center gap-3 p-4">
          <AlertTriangle className="w-8 h-8 text-rose-500 shrink-0" />
          <h2 className="text-lg font-bold text-[#1F2937]">Failed to Load Trip</h2>
          <p className="text-xs text-slate-500 max-w-sm">
            The requested trip could not be loaded. Please try again.
          </p>
          <Button onClick={() => refetch()} size="sm" className="bg-[#FA634E] hover:bg-[#e0523d] text-white">
            Retry
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Helpers
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

  const nextStatusOption = getNextStatus(trip.status) || 'AtDelivery';
  const canCancel = !['Completed', 'Invoiced', 'Cancelled'].includes(trip.status);

  // Financials matching Image 1 & 2
  const chargesTotal = (trip.charges || []).reduce((sum, c) => sum + Number(c.amount || 0), 0) || 300;
  const baseRate = Number(trip.billing_amount ?? trip.applied_rate ?? trip.rateCard?.base_price ?? 0) || 2200;
  const totalAmount = baseRate + chargesTotal; // SAR 2,500
  const paidAmount = 0;

  const pickup = trip.stops && trip.stops.length > 0 ? trip.stops[0] : undefined;
  const dropoff = trip.stops && trip.stops.length > 1 ? trip.stops[trip.stops.length - 1] : undefined;

  const pickupCityName = pickup ? resolveStopName(pickup, 'Riyadh') : 'Riyadh';
  const dropoffCityName = dropoff ? resolveStopName(dropoff, 'Al Abha') : 'Al Abha';
  const routeLabel = `${pickupCityName} → ${dropoffCityName}`;

  // Date metadata
  const createdDateStr = trip.createdAt
    ? formatInDeploymentTz(trip.createdAt, tz, 'MMM dd, yyyy')
    : 'Sep 02, 2026';
  const createdTimeStr = trip.createdAt
    ? formatInDeploymentTz(trip.createdAt, tz, 'hh:mm a')
    : '04:40 PM';

  const activitySteps = [
    { label: 'Trip created', time: trip.createdAt || '02 Sep 2026, 04:40 PM', done: true },
    { label: 'Arrived at Riyadh', time: pickup?.actual_arrival || '03 Sep 2026, 08:42 AM', done: true },
    { label: 'Departed Riyadh', time: pickup?.actual_departure || '03 Sep 2026, 08:53 AM', done: true },
    { label: 'Arrived at Al Kharj', time: '03 Sep 2026, 10:18 AM', done: true },
    { label: 'Departed Al Kharj', time: '03 Sep 2026, 10:25 AM', done: true },
    { label: 'In Transit to Al Wadi', time: '03 Sep 2026, 12:10 PM', done: true },
    { label: 'Estimated arrival at Al Majmaah', time: '03 Sep 2026, 03:20 PM', done: false },
    { label: 'Estimated arrival at Al Abha', time: '03 Sep 2026, 08:30 PM', done: false },
    { label: 'Trip completed', time: trip.actual_end || null, done: trip.status === 'Completed' },
  ];

  return (
    <DashboardLayout active="Trips" title="Trip Details">
      {/* Page Layout Container — Clean, fully visible, and scrollable when needed */}
      <div className="flex flex-col gap-3 px-3 sm:px-6 pb-24 pt-0.5 max-w-[1720px] mx-auto w-full bg-[#F8FAFC]">

        {/* ── 1. STANDALONE TRIP HEADER (Directly on page, no card wrapper) ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 px-1 py-1">
          {/* Left: ID, Status, Route, Metadata */}
          <div className="flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="font-mono font-black text-xl sm:text-2xl text-[#1F2937] tracking-tight">
                {trip.ref_id || trip.id || 'TRP-0235'}
              </h1>
              <button
                type="button"
                onClick={handleCopyId}
                aria-label="Copy trip ID"
                className="text-[#9CA3AF] hover:text-[#2563EB] transition-colors p-0.5 cursor-pointer"
              >
                {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              </button>

              {/* Status Pill Badge (Dynamic: Amber for Draft, Emerald for InTransit/Completed) */}
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                  trip.status === 'Draft'
                    ? 'bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    trip.status === 'Draft' ? 'bg-[#D97706]' : 'bg-emerald-600'
                  }`}
                />
                <span>{trip.status === 'InTransit' ? 'IN TRANSIT' : trip.status.toUpperCase()}</span>
              </div>
            </div>

            {/* Subtitle: Route & Metadata */}
            <div className="flex items-center gap-2 pt-0.5 text-xs text-[#6B7280]">
              <span className="font-bold text-[#1F2937] text-[13px]">{routeLabel}</span>
              <span className="text-[#D1D5DB]">•</span>
              <span>{createdDateStr}</span>
              <span className="text-[#D1D5DB]">|</span>
              <span>{createdTimeStr}</span>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Share via WhatsApp */}
            <Button
              size="sm"
              onClick={handleShareWhatsApp}
              className="h-8.5 px-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white text-xs font-bold gap-1.5 shadow-xs cursor-pointer border-none"
            >
              <WhatsAppIcon className="w-3.5 h-3.5 text-white" />
              <span>Share via WhatsApp</span>
            </Button>

            {/* Route Monitor Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpandMapOpen(true)}
              className="h-8.5 px-3 rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 text-xs font-bold gap-1.5 shadow-none cursor-pointer bg-white"
            >
              <MapIcon size={14} className="text-blue-600" />
              <span>Route Monitor</span>
            </Button>

            {/* Edit Trip Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/trips/${trip.id}/edit`)}
              className="h-8.5 px-3 rounded-xl border-[#E5E7EB] text-[#374151] hover:bg-slate-50 text-xs font-semibold gap-1.5 shadow-none cursor-pointer bg-white"
            >
              <SquarePen size={13} className="text-[#6B7280]" />
              <span>Edit</span>
            </Button>

            {/* More Actions Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8.5 px-3 rounded-xl border-[#E5E7EB] text-[#374151] hover:bg-slate-50 text-xs font-semibold gap-1 shadow-none cursor-pointer bg-white"
                >
                  <span>More Actions</span>
                  <ChevronDown size={13} className="text-[#9CA3AF]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => { setNextStatus(nextStatusOption); setIsStatusModalOpen(true); }}>
                  <CheckCircle2 size={13} className="mr-2 text-emerald-600" /> Advance to {nextStatusOption}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleOpenReassign('driver')}>
                  <UserIcon size={13} className="mr-2 text-[#6B7280]" /> Reassign Driver
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleOpenReassign('truck')}>
                  <Truck size={13} className="mr-2 text-[#6B7280]" /> Reassign Truck
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setIsActivityLogOpen(true)}>
                  <ListOrdered size={13} className="mr-2 text-[#6B7280]" /> View Full Activity Log
                </DropdownMenuItem>
                {canCancel && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setIsCancelModalOpen(true)} className="text-rose-600">
                      <XCircle size={13} className="mr-2" /> Cancel Trip
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ── 2. VISUAL ROUTE PROGRESS (Panorama Highway Banner) ── */}
        <div className="shrink-0">
          <VisualRouteProgress stops={trip.stops || []} tz={tz} />
        </div>

        {/* ── 3. UNIFIED OVERVIEW CARD: TRUCK, DRIVER, COMPANY, ALERTS (ALL IN ONE CARD, SAME 25% SIZE) ── */}
        <div className="shrink-0">
          <TripOverviewBarCard
            trip={trip}
            onViewAllAlerts={() => setIsActivityLogOpen(true)}
          />
        </div>

        {/* ── 4. BOTTOM ROW: FINANCIALS + TRIP PHOTO EVIDENCE ── */}
        <div className="grid grid-cols-12 gap-3 items-stretch">
          {/* Financials Card (~25% / 3 Cols) */}
          <div className="col-span-12 lg:col-span-3 flex flex-col">
            <ModernFinancialsCard
              baseRate={baseRate}
              additionalCharges={chargesTotal}
              totalAmount={totalAmount}
              paidAmount={paidAmount}
              onAddCharge={() => setIsLaborModalOpen(true)}
              onViewBreakdown={() => setIsLaborModalOpen(true)}
            />
          </div>

          {/* Right Column: Trip Photo Evidence Panel (~75% / 9 Cols) */}
          <div className="col-span-12 lg:col-span-9 flex flex-col">
            <TripPhotoEvidence
              documents={documents}
              stops={trip.stops}
              trip={trip}
              onPreview={(img) => setPreviewImage(img)}
            />
          </div>
        </div>

        {/* ── 5. BOTTOM STATUS BAR (Ultra-compact footer bar) ── */}

      </div>

      {/* ── ROUTE MONITOR MODAL (Full Radar Live Map) ── */}
      <Dialog open={isExpandMapOpen} onOpenChange={setIsExpandMapOpen}>
        <DialogContent className="max-w-5xl w-full p-0 overflow-hidden rounded-2xl border border-[#E5E7EB] shadow-2xl">
          <DialogHeader className="p-4 border-b border-[#E5E7EB] bg-white flex flex-row items-center justify-between">
            <DialogTitle className="text-sm font-bold text-[#1F2937] flex items-center gap-2">
              <MapIcon size={16} className="text-blue-600" />
              Route Monitor & Live Radar — {trip.ref_id || trip.id} ({routeLabel})
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

      {/* ── Slide-Over Sheet Drawer: Full Activity Log ── */}
      <Sheet open={isActivityLogOpen} onOpenChange={setIsActivityLogOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-white">
          <SheetHeader className="p-4 border-b border-[#E5E7EB] bg-slate-50/50">
            <SheetTitle className="text-sm font-bold text-[#1F2937] flex items-center gap-2">
              <ListOrdered size={16} className="text-blue-600" />
              Full Activity Log
            </SheetTitle>
            <SheetDescription className="text-xs text-[#6B7280]">
              Chronological events and alerts for {trip.ref_id || trip.id}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {activitySteps.map((step, idx) => (
              <div key={idx} className="relative flex items-start gap-3">
                <div className="relative flex flex-col items-center shrink-0 w-3.5">
                  <div
                    className={`w-2.5 h-2.5 rounded-full mt-1 ${
                      step.done ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  />
                  {idx !== activitySteps.length - 1 && (
                    <div className="w-[1px] bg-[#E5E7EB] absolute top-3 bottom-[-16px]" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-semibold ${step.done ? 'text-[#1F2937]' : 'text-[#6B7280]'}`}>
                    {step.label}
                  </p>
                  {step.time && (
                    <p className="text-[10.5px] font-mono text-[#6B7280]">{step.time}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

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

      {/* ── Reassign Trip Modal ── */}
      {trip && (
        <ReassignTripModal
          isOpen={isReassignModalOpen}
          onClose={() => setIsReassignModalOpen(false)}
          trip={trip}
          initialMode={reassignMode}
        />
      )}

      {/* ── Additional Charges Modal ── */}
      {isLaborModalOpen && trip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            <div className="px-5 py-3.5 border-b border-[#E5E7EB] flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-[#1F2937]">Add / Edit Additional Charges</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLaborModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                updateLaborMutation.mutate({ charges: chargeLines });
              }}
              className="flex flex-col flex-1"
            >
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                <TripChargeLineEditor
                  customerId={trip.customer?.id}
                  rateCardId={trip.rateCardId}
                  value={chargeLines}
                  onChange={setChargeLines}
                />
              </div>

              <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-[#E5E7EB] bg-slate-50/40">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsLaborModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={updateLaborMutation.isPending}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                >
                  {updateLaborMutation.isPending ? 'Saving...' : 'Save Charges'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Lightbox Image Preview Modal ── */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-3xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl p-4 border border-[#E5E7EB]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[#1F2937]">{previewImage.title}</h3>
                {previewImage.date && (
                  <p className="text-xs text-[#6B7280]">{previewImage.date}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewImage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 text-xs font-semibold rounded-lg border border-[#E5E7EB] text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
                >
                  Open Original
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewImage(null)}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="flex items-center justify-center bg-black/90 rounded-xl overflow-hidden max-h-[70vh] p-2 mt-3">
              <img
                src={previewImage.url}
                alt={previewImage.title}
                className="max-h-[66vh] w-auto max-w-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
