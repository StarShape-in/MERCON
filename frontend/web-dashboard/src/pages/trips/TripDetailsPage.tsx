import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Navigation, CheckCircle2, XCircle, RefreshCcw,
  MapPin, Calendar, Clock, ReceiptText, FileStack, PackageCheck,
  CreditCard, DollarSign, Building2, User as UserIcon, Truck, FileText,
  UploadCloud, ExternalLink, Timer,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import Btn from '@/components/ui/Btn';
import ConfirmModal from '@/components/ui/ConfirmModal';
import FormInput from '@/components/ui/FormInput';
import UploadDocumentModal from '@/components/ui/UploadDocumentModal';
import PostTripSettlementModal from '@/components/trips/PostTripSettlementModal';
import { Combobox } from '@/components/ui/combobox';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

/** Matches DELAY_THRESHOLD_MINUTES on the server. Below this, lateness is
 *  ordinary variance and showing it would bury the delays that matter. */
const DELAY_THRESHOLD_MINUTES = 30;

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

const STATUS_RAIL: TripStatus[] = ['Draft', 'Dispatched', 'AtPickup', 'InTransit', 'AtDelivery', 'Completed'];

export default function TripDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const users = useUserLookup();

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReason, setPaymentReason] = useState('');
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [nextStatus, setNextStatus] = useState<TripStatus>('Draft');
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadDocType, setUploadDocType] = useState<DocType | undefined>(undefined);
  const [isSettlementModalOpen, setIsSettlementModalOpen] = useState(false);
  // Which stop's reason form is open, and what's typed into it.
  const [delayFormStopId, setDelayFormStopId] = useState<string | null>(null);
  const [delayReason, setDelayReason] = useState<DelayReason>('Traffic');
  const [delayNote, setDelayNote] = useState('');
  const [pendingDriverId, setPendingDriverId] = useState('');
  const [pendingVehicleId, setPendingVehicleId] = useState('');
  const [isReplaceDriverOpen, setIsReplaceDriverOpen] = useState(false);
  const [replaceDriverId, setReplaceDriverId] = useState('');

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

  // Mutate Approve Driver Payment
  const approvePaymentMutation = useMutation({
    mutationFn: (data: { amount: number; reason: string }) =>
      tripService.approvePayment(id!, data.amount, data.reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentReason('');
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

  if (isLoading || !trip) {
    return (
      <DashboardLayout active="Trips" title="Trip Details">
        <div className="px-4 sm:px-6 pb-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-48 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-40 w-full rounded-2xl" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
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
  // vehicle are assigned — otherwise assign them first via the cards below.
  const rawNextStatus = getNextStatus(trip.status);
  const nextStatusOption =
    rawNextStatus === 'Dispatched' && (!trip.driver || !trip.vehicle) ? null : rawNextStatus;

  const canCancel = !['Completed', 'Invoiced', 'Cancelled'].includes(trip.status);
  const isClosed = ['Completed', 'Invoiced', 'Cancelled'].includes(trip.status);
  const pickup = trip.stops?.find((s) => s.stop_type === 'Pickup');
  const dropoff = trip.stops?.find((s) => s.stop_type === 'Dropoff');
  const invoice = trip.invoices?.[0];
  const railIndex = STATUS_RAIL.indexOf(trip.status);

  return (
    <DashboardLayout
      active="Trips"
      title="Trip Details"
      breadcrumb="Trips"
      pageTitle={trip.ref_id || 'Trip Details'}
      actions={
        <div className="flex gap-2 flex-wrap justify-end">
          <Btn
            label="Back"
            variant="secondary"
            size="sm"
            icon={<ArrowLeft size={13} />}
            onClick={() => navigate('/trips')}
          />
          {!isClosed && (
            <Btn
              label="Edit Manifest"
              variant="secondary"
              size="sm"
              icon={<Edit2 size={13} />}
              onClick={() => navigate(`/trips/${trip.id}/edit`)}
            />
          )}
          {trip.status === 'InTransit' && (
            <Btn
              label="Track Live"
              variant="secondary"
              size="sm"
              icon={<Navigation size={13} />}
              onClick={() => navigate(`/trips/${trip.id}/track`)}
            />
          )}
          {trip.status === 'Completed' && (
            <Btn
              label="Upload POD"
              variant="secondary"
              size="sm"
              icon={<ReceiptText size={13} />}
              onClick={() => { setUploadDocType('POD'); setIsUploadModalOpen(true); }}
            />
          )}
          {canCancel && (
            <Btn
              label="Cancel Trip"
              variant="danger"
              size="sm"
              icon={<XCircle size={13} />}
              onClick={() => setIsCancelModalOpen(true)}
            />
          )}
          {nextStatusOption && (
            <Btn
              label={`Mark ${nextStatusOption}`}
              size="sm"
              icon={<CheckCircle2 size={13} />}
              onClick={() => {
                setNextStatus(nextStatusOption);
                setIsStatusModalOpen(true);
              }}
            />
          )}
        </div>
      }
    >
      <div className="px-4 sm:px-6 pb-6 grid grid-cols-1 lg:grid-cols-3 gap-5 animate-fade-in">

        {/* Left Column (Main Trip Content) */}
        <div className="lg:col-span-2 space-y-4">

          {/* Trip Summary Card */}
          <div className="bg-[#1C1C2E] rounded-lg p-5 border border-white/5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between mb-5 relative z-10">
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Route Overview</p>
                <p className="text-xl font-bold text-white mt-0.5">{trip.ref_id || 'Draft'}</p>
              </div>
              <StatusBadge status={trip.status} />
            </div>

            {/* Path visualization */}
            <div className="flex items-start gap-4 mt-6 relative z-10">
              <div className="flex flex-col items-center gap-1.5 pt-1">
                <div className="w-3 h-3 rounded-full bg-[#E8450F]" />
                <div className="w-px h-14 bg-white/20" />
                <div className="w-3 h-3 rounded-full bg-[#16A34A]" />
              </div>
              <div className="flex-1 space-y-5">
                <div>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Pickup</p>
                  <p className="text-sm font-bold text-white">
                    {pickup
                      ? pickup.location_name || `${pickup.location_lat.toFixed(4)}, ${pickup.location_lng.toFixed(4)}`
                      : 'No pickup stop on manifest'}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Destination</p>
                  <p className="text-sm font-bold text-white">
                    {dropoff
                      ? dropoff.location_name || `${dropoff.location_lat.toFixed(4)}, ${dropoff.location_lng.toFixed(4)}`
                      : 'No dropoff stop on manifest'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center max-w-[180px]">
                <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-xs font-bold text-white">{trip.planned_distance != null ? `${trip.planned_distance} km` : '—'}</p>
                  <p className="text-[8px] text-white/40 font-semibold uppercase">Distance</p>
                </div>
                <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-xs font-bold text-white">{trip.carrier_name || '—'}</p>
                  <p className="text-[8px] text-white/40 font-semibold uppercase">Carrier</p>
                </div>
                <div className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 col-span-2">
                  <p className="text-xs font-bold text-white">{trip.cargo_type}</p>
                  <p className="text-[8px] text-white/40 font-semibold uppercase">Cargo</p>
                </div>
              </div>
            </div>

            <Separator className="my-4 bg-white/10" />

            {/* Real trip timestamps — no fabricated ETA */}
            <div className="grid grid-cols-3 gap-3 relative z-10 text-center">
              <div>
                <p className="text-[8px] text-white/40 font-bold uppercase tracking-wider">Planned Start</p>
                <p className="text-[11px] font-bold text-white mt-1">
                  {trip.planned_start ? new Date(trip.planned_start).toLocaleString() : '—'}
                </p>
              </div>
              <div>
                <p className="text-[8px] text-white/40 font-bold uppercase tracking-wider">Actual Start</p>
                <p className="text-[11px] font-bold text-white mt-1">
                  {trip.actual_start ? new Date(trip.actual_start).toLocaleString() : '—'}
                </p>
              </div>
              <div>
                <p className="text-[8px] text-white/40 font-bold uppercase tracking-wider">Actual End</p>
                <p className="text-[11px] font-bold text-white mt-1">
                  {trip.actual_end ? new Date(trip.actual_end).toLocaleString() : '—'}
                </p>
              </div>
            </div>
          </div>

          {/* Status Timeline */}
          {trip.status !== 'Cancelled' ? (
            <Card className="rounded-2xl border-black/[0.06] shadow-sm bg-white">
              <CardContent className="px-5 py-4">
                <div className="flex items-center">
                  {STATUS_RAIL.map((step, i) => {
                    const reached = railIndex >= i || (trip.status === 'Invoiced');
                    const isCurrent = trip.status === step;
                    return (
                      <div key={step} className="flex items-center flex-1 last:flex-none">
                        <div className="flex flex-col items-center gap-1.5">
                          <div
                            className={`w-5 h-5 rounded-full flex items-center justify-center border-2 shrink-0 ${
                              reached
                                ? isCurrent
                                  ? 'bg-[#E8450F] border-[#E8450F]'
                                  : 'bg-[#16A34A] border-[#16A34A]'
                                : 'bg-white border-gray-200'
                            }`}
                          >
                            {reached && !isCurrent && <CheckCircle2 size={12} className="text-white" />}
                          </div>
                          <span className={`text-[9px] font-bold uppercase tracking-wide ${reached ? 'text-[#111]' : 'text-[#9898A4]'}`}>
                            {step}
                          </span>
                        </div>
                        {i < STATUS_RAIL.length - 1 && (
                          <div className={`h-0.5 flex-1 mx-1 ${railIndex > i ? 'bg-[#16A34A]' : 'bg-gray-100'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
              <XCircle size={18} className="text-red-600 shrink-0" />
              <p className="text-xs font-bold text-red-700">This trip was cancelled. Its driver and vehicle were released back to Available.</p>
            </div>
          )}

          {/* Live Map Tracking Preview Card */}
          <TripLiveMapCard
            tripId={trip.id}
            refId={trip.ref_id || trip.id}
            status={trip.status}
            vehiclePlate={trip.vehicle?.plate_number}
            hasTracker={!!trip.vehicle?.icces_device_id}
            lastLat={trip.vehicle?.last_lat}
            lastLng={trip.vehicle?.last_lng}
            pickupLat={pickup?.location_lat}
            pickupLng={pickup?.location_lng}
            pickupName={pickup?.location_name}
            dropoffLat={dropoff?.location_lat}
            dropoffLng={dropoff?.location_lng}
            dropoffName={dropoff?.location_name}
          />

          {/* Stops List */}
          <Card className="rounded-2xl border-black/[0.06] shadow-sm bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-[#111]">Trip Stops Log</CardTitle>
            </CardHeader>
            <CardContent>
              {(trip.stops || []).length === 0 ? (
                <div className="text-center py-8">
                  <MapPin size={24} className="text-[#9898A4] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-[#6E6E80]">No stops on this manifest yet.</p>
                  <Btn
                    label="Add stops in Edit Manifest"
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => navigate(`/trips/${trip.id}/edit`)}
                  />
                </div>
              ) : (
                <div className="relative border-l border-gray-100 ml-3 space-y-6">
                  {(trip.stops || []).map((stop) => {
                    const dwell = dwellMinutes(stop);
                    return (
                    <div key={stop.id} className="relative pl-6">
                      <div className={`absolute -left-[7px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center ${
                        stop.actual_arrival ? 'bg-[#16A34A]' : 'bg-gray-300'
                      }`} />
                      <div>
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <p className="text-xs font-bold text-[#111]">{stop.stop_type} Stop ({stop.stop_sequence})</p>
                          {stop.actual_arrival && (
                            <span className="text-[9px] font-bold text-[#16A34A] bg-[#F0FDF4] px-1.5 py-0.5 rounded">
                              Checked-in
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#6E6E80] mt-0.5">
                          {stop.location_name || `Lat: ${stop.location_lat}, Lng: ${stop.location_lng}`}
                        </p>
                        <div className="flex gap-4 mt-2 text-[10px] text-[#9898A4] font-medium flex-wrap">
                          {stop.planned_arrival && (
                            <span className="flex items-center gap-1"><Calendar size={10} /> Planned: {new Date(stop.planned_arrival).toLocaleString()}</span>
                          )}
                          {stop.actual_arrival && (
                            <span className="flex items-center gap-1 text-[#16A34A]"><Clock size={10} /> Actual: {new Date(stop.actual_arrival).toLocaleString()}</span>
                          )}
                          {stop.actual_departure && (
                            <span className="flex items-center gap-1"><Clock size={10} /> Left: {new Date(stop.actual_departure).toLocaleString()}</span>
                          )}
                          {dwell !== null && (
                            <span className="flex items-center gap-1 font-bold text-[#111]"><Timer size={10} /> Dwell: {formatDelay(dwell)}</span>
                          )}
                        </div>

                        {(() => {
                          const late = arrivalDelayMinutes(stop);
                          if (late === null) return null;
                          const isFormOpen = delayFormStopId === stop.id;

                          return (
                            <div className="mt-2.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                              <div className="flex items-center justify-between gap-3 flex-wrap">
                                <span className="text-[11px] font-bold text-amber-800">
                                  Arrived {formatDelay(late)} late
                                </span>
                                {!isFormOpen && (
                                  <button
                                    type="button"
                                    onClick={() => openDelayForm(stop)}
                                    className="text-[10px] font-bold text-amber-900 underline underline-offset-2 hover:text-amber-700"
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
          <Card className="rounded-2xl border-black/[0.06] shadow-sm bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-[#111] flex items-center gap-2">
                <FileStack size={14} className="text-[#E8450F]" /> Documents
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
                  <FileText size={22} className="text-[#9898A4] mx-auto mb-2" />
                  <p className="text-xs font-semibold text-[#6E6E80]">No documents uploaded for this trip yet.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-black/[0.05] bg-gray-50/60">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-[#E8450F] flex items-center justify-center shrink-0">
                          <FileText size={14} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#111] truncate">{docTypeLabel(doc.doc_type)}</p>
                          <p className="text-[10px] text-[#9898A4]">{new Date(doc.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={doc.status} />
                        <a
                          href={doc.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#9898A4] hover:text-[#E8450F] p-1"
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

        {/* Right Column (Entities & Payment Actions) */}
        <div className="space-y-4">

          {/* Customer Card */}
          <Card className="rounded-2xl border-black/[0.06] shadow-sm bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-[#9898A4] uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={13} /> Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trip.customer ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#111]">{trip.customer.name}</p>
                    <p className="text-xs text-[#6E6E80] mt-0.5">{trip.customer.contact_phone}</p>
                  </div>
                  <Btn
                    label="View"
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/customers/${trip.customer?.id}`)}
                  />
                </div>
              ) : (
                <p className="text-xs font-semibold text-[#9898A4]">No customer on record.</p>
              )}
            </CardContent>
          </Card>

          {/* Driver Card */}
          <Card className="rounded-2xl border-black/[0.06] shadow-sm bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-[#9898A4] uppercase tracking-wider flex items-center gap-1.5">
                <UserIcon size={13} /> Assigned Driver
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trip.driver ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-[#111]">{trip.driver.first_name} {trip.driver.last_name}</p>
                      <p className="text-xs text-[#6E6E80] mt-0.5">{trip.driver.phone_primary}</p>
                    </div>
                    <Btn
                      label="View"
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/drivers/${trip.driver?.id}`)}
                    />
                  </div>

                  {!isClosed && (
                    isReplaceDriverOpen ? (
                      <div className="space-y-2 pt-2 border-t border-black/[0.04]">
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
                          <p className="text-[10px] text-red-600 font-semibold">Could not replace driver — they may no longer be available.</p>
                        )}
                      </div>
                    ) : (
                      <Btn
                        label="Replace Driver"
                        variant="outline"
                        size="sm"
                        icon={<RefreshCcw size={12} />}
                        className="w-full"
                        onClick={() => setIsReplaceDriverOpen(true)}
                      />
                    )
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#9898A4]">No driver assigned yet.</p>
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
          <Card className="rounded-2xl border-black/[0.06] shadow-sm bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-[#9898A4] uppercase tracking-wider flex items-center gap-1.5">
                <Truck size={13} /> Assigned Vehicle
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trip.vehicle ? (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#111]">{trip.vehicle.plate_number}</p>
                    <p className="text-xs text-[#6E6E80] mt-0.5">
                      {trip.vehicle.asset_type} Asset{trip.vehicle.capacity_kg != null ? ` • ${trip.vehicle.capacity_kg.toLocaleString()} kg` : ''}
                    </p>
                    <Badge variant="outline" className={`mt-1.5 text-[9px] font-bold ${trip.vehicle.icces_device_id ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                      {trip.vehicle.icces_device_id ? 'GPS tracker connected' : 'No GPS tracker'}
                    </Badge>
                  </div>
                  <Btn
                    label="View"
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/vehicles/${trip.vehicle?.id}`)}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-[#9898A4]">No vehicle assigned yet.</p>
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

          {/* Financials — post-trip settlement, only relevant once the trip has run */}
          {(trip.status === 'Completed' || trip.status === 'Invoiced') && (
            <Card className="rounded-2xl border-black/[0.06] shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-[#9898A4] uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign size={13} /> Financials
                </CardTitle>
                <CardAction>
                  <Btn
                    label={trip.is_post_trip_settled ? 'Edit' : 'Settle'}
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsSettlementModalOpen(true)}
                  />
                </CardAction>
              </CardHeader>
              <CardContent className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[#6E6E80]">Base billing</span>
                  <span className="font-bold text-[#111]">{trip.billing_amount != null ? `SAR ${trip.billing_amount.toLocaleString()}` : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E80]">Waiting / labor</span>
                  <span className="font-bold text-[#111]">SAR {(trip.waiting_labor_charges ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E80]">Additional stops</span>
                  <span className="font-bold text-[#111]">SAR {(trip.additional_stop_charges ?? 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6E6E80]">Trip charges</span>
                  <span className="font-bold text-[#111]">SAR {(trip.trip_charges ?? 0).toLocaleString()}</span>
                </div>
                <Separator className="my-1.5" />
                <div className="flex justify-between items-center">
                  <span className="text-[#6E6E80]">Settlement</span>
                  <Badge variant="outline" className={`text-[9px] font-bold ${trip.is_post_trip_settled ? 'border-green-200 bg-green-50 text-green-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                    {trip.is_post_trip_settled ? 'Settled' : 'Pending settlement'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Invoice */}
          {(trip.status === 'Completed' || trip.status === 'Invoiced') && (
            <Card className="rounded-2xl border-black/[0.06] shadow-sm bg-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-[#9898A4] uppercase tracking-wider flex items-center gap-1.5">
                  <ReceiptText size={13} /> Invoice
                </CardTitle>
              </CardHeader>
              <CardContent>
                {invoice ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-[#111]">{invoice.ref_id}</p>
                      <p className="text-xs text-[#6E6E80] mt-0.5">SAR {invoice.total_amount.toLocaleString()}</p>
                      <StatusBadge status={invoice.status} />
                    </div>
                    <Btn
                      label="View"
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/invoices/${invoice.id}`)}
                    />
                  </div>
                ) : (
                  <p className="text-xs font-semibold text-[#9898A4]">No invoice generated yet.</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Cash Payment Flow */}
          <Card className="rounded-2xl border-black/[0.06] shadow-sm bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-[#9898A4] uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard size={13} /> Extra Driver Payment
              </CardTitle>
            </CardHeader>
            <CardContent>
              {trip.payment_status === 'Approved' || trip.payment_status === 'Paid' ? (
                <div className="bg-[#F0FDF4] text-[#16A34A] border border-[#16A34A]/10 p-3 rounded-lg">
                  <div className="flex items-center justify-between font-bold text-xs">
                    <span>SAR {trip.extra_driver_payment} {trip.payment_status}</span>
                    <CheckCircle2 size={14} />
                  </div>
                  <p className="text-[10px] text-[#16A34A]/80 mt-1">Reason: {trip.payment_reason}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    {trip.payment_date && (
                      <p className="text-[10px] text-[#16A34A]/70">{new Date(trip.payment_date).toLocaleDateString()}</p>
                    )}
                    {trip.payment_approved_by && (
                      <span className="text-[10px] text-[#16A34A]/80">by <UserChip userId={trip.payment_approved_by} users={users} size="sm" /></span>
                    )}
                  </div>
                </div>
              ) : trip.payment_status === 'Rejected' ? (
                <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg">
                  <div className="flex items-center justify-between font-bold text-xs">
                    <span>SAR {trip.extra_driver_payment} Rejected</span>
                    <XCircle size={14} />
                  </div>
                  <p className="text-[10px] text-red-600/80 mt-1">Reason: {trip.payment_reason}</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-[#6E6E80] mb-4">Request and approve cash payouts or bonuses for this trip's driver.</p>
                  <Btn
                    label="Approve Cash Payout"
                    variant="secondary"
                    icon={<CreditCard size={13} />}
                    onClick={() => setIsPaymentModalOpen(true)}
                    className="w-full"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit Trail — who created / last touched this trip */}
          <Card className="rounded-2xl border-black/[0.06] shadow-sm bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold text-[#9898A4] uppercase tracking-wider flex items-center gap-1.5">
                <PackageCheck size={13} /> Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#9898A4] font-bold uppercase">Created by</span>
                <UserChip userId={trip.created_by} users={users} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#9898A4] font-bold uppercase">Created</span>
                <Tooltip>
                  <TooltipTrigger>
                    <span className="text-[11px] font-bold text-[#111] cursor-default">
                      {new Date(trip.createdAt).toLocaleDateString()}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{new Date(trip.createdAt).toLocaleString()}</TooltipContent>
                </Tooltip>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#9898A4] font-bold uppercase">Last updated by</span>
                <UserChip userId={trip.updated_by} users={users} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#9898A4] font-bold uppercase">Updated</span>
                <Tooltip>
                  <TooltipTrigger>
                    <span className="text-[11px] font-bold text-[#111] cursor-default">
                      {new Date(trip.updatedAt).toLocaleDateString()}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{new Date(trip.updatedAt).toLocaleString()}</TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>
        </div>

      </div>

      {/* Cash Payout Modal */}
      <ConfirmModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Approve Driver Cash Payment"
        message="Enter the amount and business reason below to confirm this cashier payout."
        confirmLabel="Approve Payout"
        isDestructive={false}
        isLoading={approvePaymentMutation.isPending}
        onConfirm={() => {
          if (!paymentAmount || !paymentReason) return;
          approvePaymentMutation.mutate({
            amount: parseFloat(paymentAmount),
            reason: paymentReason,
          });
        }}
      >
        <div className="space-y-4 my-4">
          <FormInput
            label="Amount (SAR)"
            type="number"
            required
            placeholder="e.g. 150"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
          />
          <FormInput
            label="Reason"
            type="text"
            required
            placeholder="e.g. Off-loading delay bonus"
            value={paymentReason}
            onChange={(e) => setPaymentReason(e.target.value)}
          />
        </div>
      </ConfirmModal>

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

      {/* Post-Trip Financial Settlement Modal */}
      <PostTripSettlementModal
        isOpen={isSettlementModalOpen}
        onClose={() => setIsSettlementModalOpen(false)}
        trip={trip}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['trip', id] });
          queryClient.invalidateQueries({ queryKey: ['trips'] });
        }}
      />
    </DashboardLayout>
  );
}
