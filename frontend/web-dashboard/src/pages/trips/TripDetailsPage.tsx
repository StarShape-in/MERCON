import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronRight, ChevronDown, Copy, Check, Navigation, SquarePen, AlertTriangle,
  UploadCloud, ExternalLink, RefreshCcw, User as UserIcon, Truck, XCircle, CheckCircle2, X
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
import TripLiveMapCard from '@/components/maps/TripLiveMapCard';
import {
  tripService, TripStatus, type TripChargeInput, type Trip,
} from '@/services/tripService';
import TripChargeLineEditor from '@/components/trips/TripChargeLineEditor';
import { ReassignTripModal, ReassignMode } from '@/components/trips/ReassignTripModal';
import { documentService, type DocType } from '@/services/documentService';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

// Subcomponents matching reference design
import RouteBannerVisualizer from '@/components/trips/RouteBannerVisualizer';
import TripDetailsCardsGrid from '@/components/trips/TripDetailsCardsGrid';
import TripFinancialsCard from '@/components/trips/TripFinancialsCard';
import TripLiveDocumentsGrid from '@/components/trips/TripLiveDocumentsGrid';

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

  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<TripStatus>('Draft');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadDocType, setUploadDocType] = useState<DocType | undefined>(undefined);
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
  const [reassignMode, setReassignMode] = useState<ReassignMode>('driver');
  const [isExpandMapOpen, setIsExpandMapOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Additional Charges state & modal
  const [isLaborModalOpen, setIsLaborModalOpen] = useState(false);

  // Fetch trip details
  const { data: trip, isLoading, isError, refetch } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => tripService.getById(id!),
    enabled: !!id,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 404) return false;
      return failureCount < 1;
    },
  });

  useEffect(() => {
    if (trip && trip.id && id !== trip.id) {
      navigate(`/trips/${trip.id}`, { replace: true });
    }
  }, [trip?.id, id, navigate]);

  const tripEntityId = trip?.id || id;

  // Trip documents
  const { data: docsRes } = useQuery({
    queryKey: ['documents', 'Trip', tripEntityId],
    queryFn: () => documentService.getAll({ entity_type: 'Trip', entity_id: tripEntityId, per_page: 50 }),
    enabled: !!tripEntityId,
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

  const updateStatusMutation = useMutation({
    mutationFn: (status: TripStatus) => tripService.updateStatus(tripEntityId!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripEntityId] });
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
      // ignore
    }
  };

  const handleShareWhatsApp = () => {
    if (!trip) return;
    const ref = trip.ref_id || trip.id;
    const text = `*MERCON Trip Update* - ${ref}\nStatus: ${trip.status}\nCustomer: ${trip.customer?.name || 'Customer'}`;
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  if (isLoading) {
    return (
      <DashboardLayout active="Trips" title="Trip Details">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 pb-6 space-y-4">
          <Skeleton className="h-6 w-48 rounded-lg" />
          <Skeleton className="h-44 w-full rounded-2xl" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-64 w-full rounded-2xl" />
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
          <Button onClick={() => refetch()} size="sm" className="mt-2 text-xs font-bold bg-[#FA634E] text-white">
            Retry
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const pickup = trip.stops && trip.stops.length > 0 ? trip.stops[0] : undefined;
  const dropoff = trip.stops && trip.stops.length > 1 ? trip.stops[trip.stops.length - 1] : trip.stops?.find((s) => s.stop_type === 'Dropoff');
  const chargesTotal = (trip.charges || []).reduce((sum, c) => sum + Number(c.amount || 0), 0);
  const baseRate = Number(trip.billing_amount ?? trip.applied_rate ?? trip.rateCard?.base_price ?? trip.trip_charges ?? 2200);
  const totalAmount = baseRate + chargesTotal;

  const dateStr = trip.planned_start
    ? formatInDeploymentTz(trip.planned_start, tz, 'MMM dd, yyyy  hh:mm a')
    : 'Sep 02, 2026  04:40 PM';

  return (
    <DashboardLayout active="Trips" title="Trip Details">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 -mt-2 pb-8 space-y-4 animate-fade-in text-[#3E3C3D]">
        
        {/* ── TOP HEADER / NAVIGATION BAR ── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#6E6E80] dark:text-slate-400">
              <Link to="/trips" className="hover:text-[#3E3C3D] dark:hover:text-slate-200 transition-colors">
                Trips
              </Link>
              <ChevronRight size={13} className="text-[#9898A4]" />
              <span className="text-[#3E3C3D] dark:text-slate-100 font-bold">
                {trip.ref_id || 'TRP-0235'}
              </span>
            </div>

            {/* Title & Status Badge */}
            <div className="flex items-center gap-3 pt-0.5">
              <h1 className="text-2xl font-black font-mono text-[#3E3C3D] dark:text-slate-100 tracking-tight flex items-center gap-2">
                {trip.ref_id || 'TRP-0235'}
                <button type="button" onClick={handleCopyId} className="text-slate-400 hover:text-[#FA634E] transition-colors">
                  {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
                </button>
              </h1>
              
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300">
                IN TRANSIT
              </span>
            </div>

            {/* Subtitle Metadata line */}
            <p className="text-xs text-[#6E6E80] dark:text-slate-400 font-medium flex items-center gap-2 pt-0.5">
              <span>{pickup?.location_name || 'Riyadh'} → {dropoff?.location_name || 'Al Abha'}</span>
              <span>|</span>
              <span>{dateStr}</span>
              <span>|</span>
              <span>Domestic</span>
              <span>|</span>
              <span>General Cargo</span>
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <Button
              onClick={handleShareWhatsApp}
              size="sm"
              className="h-9 px-3.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold gap-1.5 shadow-sm cursor-pointer"
            >
              <WhatsAppIcon className="w-4 h-4 text-white" />
              Share via WhatsApp
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpandMapOpen(true)}
              className="h-9 px-3.5 rounded-xl text-xs font-bold border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 gap-1.5 cursor-pointer shadow-2xs"
            >
              <Navigation size={14} className="text-blue-600" />
              Route Monitor
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/trips/${trip.id}/edit`)}
              className="h-9 px-3.5 rounded-xl text-xs font-bold border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 gap-1.5 cursor-pointer shadow-2xs"
            >
              <SquarePen size={14} className="text-slate-600" />
              Edit
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-3.5 rounded-xl text-xs font-bold border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 gap-1.5 cursor-pointer shadow-2xs"
                >
                  More Actions <ChevronDown size={14} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => { setReassignMode('driver'); setIsReassignModalOpen(true); }}>
                  <UserIcon size={14} className="mr-2 text-slate-500" /> Reassign Driver
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setReassignMode('truck'); setIsReassignModalOpen(true); }}>
                  <Truck size={14} className="mr-2 text-slate-500" /> Reassign Truck
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setUploadDocType('POD'); setIsUploadModalOpen(true); }}>
                  <UploadCloud size={14} className="mr-2 text-slate-500" /> Upload Document
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setIsCancelModalOpen(true)} className="text-red-600">
                  <XCircle size={14} className="mr-2" /> Cancel Trip
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* ── 1. ROUTE BANNER VISUALIZER ── */}
        <RouteBannerVisualizer
          stops={trip.stops}
          status={trip.status}
          tripRefId={trip.ref_id || trip.id}
        />

        {/* ── 2. 4-CARD OPERATIONAL ROW (VEHICLE, DRIVER, CUSTOMER, DELAYS) ── */}
        <TripDetailsCardsGrid
          vehicle={trip.vehicle}
          driver={trip.driver}
          customer={trip.customer}
          onViewAllDelays={() => navigate(`/trips/${trip.id}/track`)}
        />

        {/* ── 3. BOTTOM SPLIT GRID (FINANCIALS & LIVE DOCUMENTS) ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-4 items-start">
          {/* Left Column: Financials */}
          <TripFinancialsCard
            baseRate={baseRate}
            additionalCharges={chargesTotal}
            totalAmount={totalAmount}
            paidAmount={0}
            balanceDue={totalAmount}
            onAddCharge={() => setIsLaborModalOpen(true)}
            onViewBreakdown={() => setIsLaborModalOpen(true)}
          />

          {/* Right Column: Live Documents Grid */}
          <TripLiveDocumentsGrid
            onPreviewDoc={() => setIsUploadModalOpen(true)}
          />
        </div>

      </div>

      {/* ── Modals ── */}
      <ConfirmModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Update Trip Status"
        message={`Are you sure you want to advance trip status to ${nextStatus}?`}
        confirmLabel="Confirm Status"
        isLoading={updateStatusMutation.isPending}
        onConfirm={() => updateStatusMutation.mutate(nextStatus)}
      />

      <ConfirmModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Trip"
        message="Are you sure you want to cancel this trip?"
        confirmLabel="Yes, Cancel"
        isDestructive
        isLoading={updateStatusMutation.isPending}
        onConfirm={() => updateStatusMutation.mutate('Cancelled')}
      />

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

      {isLaborModalOpen && trip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-black/10 dark:border-slate-800 shadow-2xl max-w-xl w-full overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-black/[0.06] dark:border-slate-800 flex items-center justify-between bg-black/[0.02] shrink-0">
              <h3 className="text-base font-bold text-[#3E3C3D] dark:text-slate-100">Add / Edit Additional Charges</h3>
              <button
                type="button"
                onClick={() => setIsLaborModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 cursor-pointer"
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
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={updateLaborMutation.isPending}
                  className="bg-[#FA634E] text-white"
                >
                  {updateLaborMutation.isPending ? 'Saving...' : 'Save Charges'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {trip && (
        <ReassignTripModal
          isOpen={isReassignModalOpen}
          onClose={() => setIsReassignModalOpen(false)}
          trip={trip}
          initialMode={reassignMode}
        />
      )}

      {/* Expand Map Modal */}
      <Dialog open={isExpandMapOpen} onOpenChange={setIsExpandMapOpen}>
        <DialogContent className="max-w-5xl w-full p-0 overflow-hidden rounded-2xl border-none">
          <DialogHeader className="p-4 border-b border-black/[0.06] bg-white flex flex-row items-center justify-between">
            <DialogTitle className="text-sm font-bold text-[#3E3C3D]">
              Full Route Radar — {trip.ref_id || trip.id}
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
              showHeader={false}
              showTelemetryBar={true}
              className="rounded-none border-none"
              mapHeightClassName="h-[650px]"
            />
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
