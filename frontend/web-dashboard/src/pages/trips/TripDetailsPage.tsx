import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Edit2, Navigation, CheckCircle2, MapPin, Calendar, Clock, 
  Sparkles, ReceiptText, CreditCard, ShieldAlert, Building2, User, Truck, 
  AlertTriangle, XCircle, RotateCw, ChevronRight, AlertCircle, Check, ShieldCheck
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import ConfirmModal from '@/components/ui/ConfirmModal';
import FormInput from '@/components/ui/FormInput';
import UploadDocumentModal from '@/components/ui/UploadDocumentModal';
import { tripService, TripStatus } from '@/services/tripService';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function TripDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentReason, setPaymentReason] = useState('');

  // Status Change State & Confirmation Modal
  const [isStatusConfirmOpen, setIsStatusConfirmOpen] = useState(false);
  const [targetStatus, setTargetStatus] = useState<TripStatus | null>(null);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Fetch single trip
  const { data: trip, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => tripService.getById(id!),
    enabled: !!id,
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

  // Mutate Trip Status
  const updateStatusMutation = useMutation({
    mutationFn: (status: TripStatus) => tripService.updateStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', id] });
      setIsStatusConfirmOpen(false);
      setTargetStatus(null);
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout active="Trips" title="Trip Details">
        <div className="px-6 pb-6 max-w-[1400px] mx-auto w-full space-y-5 animate-pulse">
          <div className="h-10 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/4"></div>
          <div className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          <div className="h-80 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error || !trip) {
    return (
      <DashboardLayout active="Trips" title="Trip Details">
        <div className="px-6 pb-6 max-w-[1400px] mx-auto w-full flex flex-col items-center justify-center text-center h-[60vh] gap-3">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 flex items-center justify-center">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Trip Dispatch Not Found</h2>
          <p className="text-xs text-slate-500 max-w-md">
            The requested trip dispatch record does not exist or has been removed.
          </p>
          <Button onClick={() => navigate('/trips')} size="sm" className="mt-2 text-xs font-bold bg-[#E8450F] text-white">
            Return to Trip Dispatches
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // 5 Pipeline Stages
  const STAGES: { key: TripStatus; label: string; icon: any }[] = [
    { key: 'Draft', label: 'Draft', icon: Clock },
    { key: 'Dispatched', label: 'Dispatched', icon: RocketIcon },
    { key: 'AtPickup', label: 'At Pickup', icon: MapPin },
    { key: 'InTransit', label: 'En Route', icon: Truck },
    { key: 'AtDelivery', label: 'At Delivery', icon: MapPin },
    { key: 'Completed', label: 'Completed', icon: CheckCircle2 },
  ];

  const currentStageIndex = STAGES.findIndex(s => s.key === trip.status);

  const handleStatusClick = (status: TripStatus) => {
    if (status === trip.status) return;
    setTargetStatus(status);
    setIsStatusConfirmOpen(true);
  };

  return (
    <DashboardLayout active="Trips" title={`Trip: ${trip.ref_id}`}>
      <div className="px-6 pb-6 space-y-6 animate-fade-in max-w-[1400px] mx-auto w-full">

        {/* ── Top Scope Bar & Header Actions ─────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/trips')}
              className="h-9 w-9 p-0 text-slate-600 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
              title="Back to Trips"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex flex-col">
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  {trip.ref_id || 'Trip Details'}
                </h1>
                <StatusBadge status={trip.status} />
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Cargo: <span className="font-semibold text-slate-800 dark:text-slate-200">{trip.cargo_type || 'General Goods'}</span> • Distance: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{trip.planned_distance || 950} km</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-[#E8450F]' : 'text-slate-500'}`} />
              Refresh
            </Button>

            {trip.status === 'InTransit' && (
              <Button
                size="sm"
                onClick={() => navigate(`/trips/${trip.id}/track`)}
                className="h-9 gap-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs px-4"
              >
                <Navigation className="w-3.5 h-3.5" /> Track Live Radar
              </Button>
            )}

            {trip.status === 'Completed' && (
              <Button
                size="sm"
                onClick={() => setIsUploadModalOpen(true)}
                className="h-9 gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs px-4"
              >
                <ReceiptText className="w-3.5 h-3.5" /> Upload POD Document
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/trips/${trip.id}/edit`)}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs text-slate-700 dark:text-slate-300"
            >
              <Edit2 className="w-3.5 h-3.5 text-slate-500" /> Edit Trip
            </Button>
          </div>
        </div>

        {/* ── 5-Stage Visual Progress Pipeline ───────────────────────────── */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs p-5 overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#E8450F]" /> Trip Lifecycle Dispatch Pipeline
              </span>
              <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                Stage {currentStageIndex + 1} of {STAGES.length}
              </span>
            </div>

            {/* Stepper Pipeline */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {STAGES.map((s, idx) => {
                const isPassed = idx < currentStageIndex;
                const isCurrent = idx === currentStageIndex;
                const Icon = s.icon;

                return (
                  <button
                    key={s.key}
                    onClick={() => handleStatusClick(s.key)}
                    className={cn(
                      'p-3 rounded-xl border text-left transition-all flex flex-col justify-between space-y-2 relative overflow-hidden group',
                      isCurrent && 'bg-[#FFF0EB] dark:bg-rose-950/30 border-[#E8450F] text-[#E8450F] shadow-sm',
                      isPassed && 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300',
                      !isPassed && !isCurrent && 'bg-slate-50/50 dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 text-slate-400 hover:border-slate-300'
                    )}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={cn(
                        'w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0',
                        isCurrent && 'bg-[#E8450F] text-white',
                        isPassed && 'bg-emerald-500 text-white',
                        !isPassed && !isCurrent && 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                      )}>
                        {isPassed ? <Check className="w-4 h-4" /> : idx + 1}
                      </span>
                      {isCurrent && <span className="w-2 h-2 rounded-full bg-[#E8450F] animate-ping"></span>}
                    </div>

                    <div>
                      <span className="text-xs font-extrabold block truncate">{s.label}</span>
                      <span className="text-[10px] text-slate-400 font-mono font-medium block">
                        {isCurrent ? 'Active Stage' : isPassed ? 'Completed' : 'Click to Set'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </Card>

        {/* ── Operator Full Status Control Bar ──────────────────────────── */}
        <Card className="border border-slate-200 dark:border-slate-800 bg-slate-900 text-white rounded-2xl shadow-md p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-800 text-[#E8450F] flex items-center justify-center shrink-0 border border-slate-700">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-white">Operator Status Controls</h3>
                <p className="text-xs text-slate-400">
                  Override or transition trip status stage with mandatory confirmation dialogs.
                </p>
              </div>
            </div>

            {/* Quick Status Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusClick('Dispatched')}
                disabled={trip.status === 'Dispatched'}
                className="h-8 text-xs font-bold border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                🚀 Dispatched
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusClick('AtPickup')}
                disabled={trip.status === 'AtPickup'}
                className="h-8 text-xs font-bold border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                📍 At Pickup
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusClick('InTransit')}
                disabled={trip.status === 'InTransit'}
                className="h-8 text-xs font-bold border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                🚚 In Transit
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusClick('AtDelivery')}
                disabled={trip.status === 'AtDelivery'}
                className="h-8 text-xs font-bold border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200"
              >
                🏁 At Delivery
              </Button>

              <Button
                size="sm"
                onClick={() => handleStatusClick('Completed')}
                disabled={trip.status === 'Completed'}
                className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                ✅ Completed
              </Button>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleStatusClick('Cancelled')}
                disabled={trip.status === 'Cancelled'}
                className="h-8 text-xs font-bold text-rose-400 hover:bg-rose-950/40 hover:text-rose-300"
              >
                ❌ Cancel Trip
              </Button>
            </div>
          </div>
        </Card>

        {/* ── Main Content Grid (2 Columns) ───────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column (Route Summary & Stops Timeline) */}
          <div className="lg:col-span-2 space-y-6">

            {/* Route Summary Card */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#E8450F]" /> Highway Route Corridor Overview
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Origin pickup location, destination terminal, and cargo details.
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  {trip.hazmat_flag && (
                    <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-bold">
                      ⚠️ HAZMAT CARGO
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] font-mono font-bold text-slate-500">
                    {trip.planned_distance || 950} km
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-6">
                
                {/* Route Path Indicator */}
                <div className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                  <div className="flex flex-col items-center gap-1.5 pt-1">
                    <div className="w-3.5 h-3.5 rounded-full bg-[#E8450F] ring-4 ring-[#E8450F]/20" />
                    <div className="w-0.5 h-12 bg-slate-300 dark:bg-slate-700" />
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-600 ring-4 ring-emerald-600/20" />
                  </div>

                  <div className="flex-1 space-y-4">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Origin Pickup</span>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        Riyadh Central Distribution Center (Sector 3)
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Destination Delivery</span>
                      <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
                        Jeddah Islamic Port Terminal 1
                      </p>
                    </div>
                  </div>

                  <div className="text-right font-mono text-xs space-y-1 shrink-0">
                    <span className="text-slate-400 text-[10px] block font-sans uppercase font-bold">ETA Duration</span>
                    <span className="font-extrabold text-slate-900 dark:text-slate-100">10h 30m</span>
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* Waypoint Stops Timeline */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-indigo-500" /> Trip Waypoint Check-In Timeline
                </CardTitle>
              </CardHeader>

              <CardContent className="p-6">
                {(!trip.stops || trip.stops.length === 0) ? (
                  <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-2">
                    <MapPin size={32} className="opacity-30 text-slate-400" />
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">No intermediate waypoint stops logged.</p>
                  </div>
                ) : (
                  <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-3 space-y-6">
                    {trip.stops.map((stop, idx) => (
                      <div key={stop.id} className="relative pl-6">
                        <div className={cn(
                          'absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 flex items-center justify-center text-[8px] font-bold text-white',
                          stop.actual_arrival ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                        )}>
                          {stop.actual_arrival ? '✓' : idx + 1}
                        </div>

                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {stop.stop_type} Stop #{stop.stop_sequence}
                            </span>
                            {stop.actual_arrival ? (
                              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-bold">
                                Checked-In
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[9px] font-bold text-slate-400">
                                Pending
                              </Badge>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-400 font-mono">
                            Coordinates: Lat {stop.location_lat}, Lng {stop.location_lng}
                          </p>

                          <div className="flex gap-4 mt-2 text-[10px] text-slate-500 font-mono pt-1">
                            {stop.planned_arrival && (
                              <span>Planned: {new Date(stop.planned_arrival).toLocaleString()}</span>
                            )}
                            {stop.actual_arrival && (
                              <span className="text-emerald-600 font-bold">Actual: {new Date(stop.actual_arrival).toLocaleString()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          {/* Right Column (Customer, Driver & Vehicle Entities) */}
          <div className="space-y-6">

            {/* Entity 1: Customer Account */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-600" /> Customer Account
                </CardTitle>
                {trip.customer && (
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/customers/${trip.customer?.id}`)} className="h-7 text-xs font-bold text-cyan-600">
                    View →
                  </Button>
                )}
              </CardHeader>

              <CardContent className="p-4 text-xs">
                {trip.customer ? (
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">{trip.customer.name}</h4>
                    <p className="text-slate-500 font-mono">Phone: {trip.customer.contact_phone}</p>
                  </div>
                ) : (
                  <span className="text-slate-400">No customer linked.</span>
                )}
              </CardContent>
            </Card>

            {/* Entity 2: Assigned Driver */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#E8450F]" /> Assigned Fleet Driver
                </CardTitle>
                {trip.driver && (
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/drivers/${trip.driver?.id}`)} className="h-7 text-xs font-bold text-[#E8450F]">
                    View →
                  </Button>
                )}
              </CardHeader>

              <CardContent className="p-4 text-xs">
                {trip.driver ? (
                  <div className="space-y-2">
                    <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
                      {trip.driver.first_name} {trip.driver.last_name}
                    </h4>
                    <p className="text-slate-500 font-mono">Phone: {trip.driver.phone_primary}</p>
                    <div className="pt-1">
                      <Badge variant="outline" className="bg-[#FEF2F2] text-[#DC2626] border-[#DC2626]/20 text-[10px] font-bold">
                        <ShieldAlert className="w-3 h-3 mr-1" /> AI Risk: {(trip.driver.ai_risk_score || 1.2).toFixed(1)} / 10
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <span className="text-slate-400">No driver assigned.</span>
                )}
              </CardContent>
            </Card>

            {/* Entity 3: Assigned Vehicle */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-indigo-600" /> Assigned Vehicle Asset
                </CardTitle>
                {trip.vehicle && (
                  <Button size="sm" variant="ghost" onClick={() => navigate(`/vehicles/${trip.vehicle?.id}`)} className="h-7 text-xs font-bold text-indigo-600">
                    View →
                  </Button>
                )}
              </CardHeader>

              <CardContent className="p-4 text-xs">
                {trip.vehicle ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm">{trip.vehicle.plate_number}</h4>
                      <Badge variant="outline" className="text-[9px] font-mono font-bold">KSA</Badge>
                    </div>
                    <p className="text-slate-500">Asset Spec: {trip.vehicle.asset_type || 'Heavy Tractor'}</p>
                  </div>
                ) : (
                  <span className="text-slate-400">No vehicle assigned.</span>
                )}
              </CardContent>
            </Card>

            {/* Cash Payout Approval Card */}
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-amber-500" /> Driver Cash Payout Approval
                </CardTitle>
              </CardHeader>

              <CardContent className="p-4 text-xs space-y-3">
                {trip.payment_status === 'Approved' ? (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-emerald-800 dark:text-emerald-300 font-semibold space-y-1">
                    <div className="flex justify-between font-extrabold">
                      <span>SAR {trip.extra_driver_payment} Approved</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-[10px] text-emerald-600">Reason: {trip.payment_reason}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-slate-500 text-[11px]">Request & approve cash bonuses or delay compensation for this driver.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsPaymentModalOpen(true)}
                      className="w-full text-xs font-bold border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
                    >
                      <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Approve Driver Payout
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

        </div>

      </div>

      {/* ── Status Transition Confirmation Popup Modal ────────────────────── */}
      <Dialog open={isStatusConfirmOpen} onOpenChange={(open) => !open && setIsStatusConfirmOpen(false)}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800">
          <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="w-5 h-5 shrink-0" />
              <DialogTitle className="text-base font-extrabold">Confirm Trip Status Transition</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500 mt-1">
              Please confirm changing status for trip <strong className="text-slate-900 dark:text-slate-100">{trip.ref_id}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="p-6 space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Current Stage</span>
                <span className="font-extrabold text-slate-900 dark:text-slate-100">{trip.status}</span>
              </div>

              <ChevronRight className="w-5 h-5 text-slate-400" />

              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Target Stage</span>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{targetStatus}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Updating status will notify the assigned driver and update dispatch logs.</span>
            </div>
          </div>

          <DialogFooter className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setIsStatusConfirmOpen(false); setTargetStatus(null); }}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={updateStatusMutation.isPending}
              onClick={() => targetStatus && updateStatusMutation.mutate(targetStatus)}
              className="text-xs bg-[#E8450F] hover:bg-[#d03d0c] text-white font-bold px-4"
            >
              {updateStatusMutation.isPending ? 'Updating...' : 'Yes, Confirm Transition'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Upload Document Modal */}
      {trip && (
        <UploadDocumentModal
          isOpen={isUploadModalOpen}
          onClose={() => setIsUploadModalOpen(false)}
          entityType="Trip"
          entityId={trip.id}
          docType="POD"
          onUploadSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['trip', id] });
          }}
        />
      )}
    </DashboardLayout>
  );
}

function RocketIcon(props: any) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.71.79-1.81.79-1.81" />
      <path d="M12 15l-3-3" />
      <path d="M15 12l-3-3" />
      <path d="M14.5 9.5L18 6l3 3-3.5 3.5" />
    </svg>
  );
}
