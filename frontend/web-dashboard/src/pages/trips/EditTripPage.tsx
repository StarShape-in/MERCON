import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  Truck, 
  UserCheck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Building2, 
  DollarSign, 
  MapPin, 
  RotateCcw, 
  Eye, 
  Save, 
  ShieldCheck 
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StopAddressEditor from '@/components/trips/StopAddressEditor';
import TransitTimeBadge from '@/components/trips/TransitTimeBadge';
import { tripService, TripStatus } from '@/services/tripService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import StatusBadge from '@/components/ui/StatusBadge';

const STOPS_FROZEN_IN: TripStatus[] = ['Completed', 'Invoiced', 'Cancelled'];

const STATUS_DESCRIPTIONS: Record<TripStatus, { title: string; description: string; color: string }> = {
  Draft: {
    title: 'Scheduled / Draft (Planned Shipment)',
    description: 'The trip is scheduled and planned. Driver and vehicle details can be attached or updated before dispatch.',
    color: 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
  },
  Dispatched: {
    title: 'Dispatched (Assigned to Driver)',
    description: 'Driver and truck are assigned and notified. Driver is preparing to head to pickup.',
    color: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  },
  AtPickup: {
    title: 'At Pickup (Loading Dock)',
    description: 'Driver and truck have arrived at the pickup origin point and loading is in progress.',
    color: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  },
  InTransit: {
    title: 'In Transit (On the Road)',
    description: 'Cargo is loaded and the truck is actively driving along the designated shipping route.',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
  },
  AtDelivery: {
    title: 'At Delivery (Unloading Dock)',
    description: 'Truck reached the customer destination and cargo is being inspected and unloaded.',
    color: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
  },
  Completed: {
    title: 'Completed (Delivered Successfully)',
    description: 'Shipment delivered, proof of delivery (POD) captured, and trip is ready for settlement.',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  },
  Invoiced: {
    title: 'Invoiced (Billed to Client)',
    description: 'Customer invoice generated and attached to commercial accounting records.',
    color: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
  },
  Cancelled: {
    title: 'Cancelled (Trip Revoked)',
    description: 'Shipment was cancelled prior to completion due to client request or operational issue.',
    color: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
  },
};

export default function EditTripPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<TripStatus>('Draft');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [billingAmountInput, setBillingAmountInput] = useState<string>('');
  const [tripChargesInput, setTripChargesInput] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // Fetch trip data
  const { data: trip, isLoading, refetch } = useQuery({
    queryKey: ['trip', id],
    queryFn: () => tripService.getById(id!),
    enabled: !!id,
  });

  // Fetch drivers list for reassignment
  const { data: driversRes } = useQuery({
    queryKey: ['drivers-all'],
    queryFn: () => driverService.getAll({ per_page: 100 }),
  });

  // Fetch vehicles list for reassignment
  const { data: vehiclesRes } = useQuery({
    queryKey: ['vehicles-all'],
    queryFn: () => vehicleService.getAll({ per_page: 100 }),
  });

  useEffect(() => {
    if (trip) {
      setStatus(trip.status);
      setSelectedDriverId(trip.driver?.id || '');
      setSelectedVehicleId(trip.vehicle?.id || '');
      setBillingAmountInput(trip.billing_amount !== undefined && trip.billing_amount !== null ? String(trip.billing_amount) : '');
      setTripChargesInput(trip.trip_charges !== undefined && trip.trip_charges !== null ? String(trip.trip_charges) : '');
    }
  }, [trip]);

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: (newStatus: TripStatus) => tripService.updateStatus(id!, newStatus),
  });

  const dispatchMutation = useMutation({
    mutationFn: (payload: { driver_id?: string; vehicle_id?: string }) => tripService.dispatch(id!, payload),
  });

  const updateFinancialsMutation = useMutation({
    mutationFn: (payload: { billing_amount?: number; trip_charges?: number }) => tripService.updateFinancials(id!, payload),
  });

  const handleReset = () => {
    if (trip) {
      setStatus(trip.status);
      setSelectedDriverId(trip.driver?.id || '');
      setSelectedVehicleId(trip.vehicle?.id || '');
      setBillingAmountInput(trip.billing_amount !== undefined && trip.billing_amount !== null ? String(trip.billing_amount) : '');
      setTripChargesInput(trip.trip_charges !== undefined && trip.trip_charges !== null ? String(trip.trip_charges) : '');
      setError(null);
      toast.info('Form reset to original trip manifest state');
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    try {
      // 1. Update status if changed
      if (trip && status !== trip.status) {
        await updateStatusMutation.mutateAsync(status);
      }

      // 2. Dispatch/reassign driver or vehicle if changed
      const driverChanged = trip?.driver?.id !== selectedDriverId;
      const vehicleChanged = trip?.vehicle?.id !== selectedVehicleId;

      if (driverChanged || vehicleChanged) {
        await dispatchMutation.mutateAsync({
          driver_id: selectedDriverId || undefined,
          vehicle_id: selectedVehicleId || undefined,
        });
      }

      // 3. Financials update if changed
      const parsedBilling = parseFloat(billingAmountInput);
      const parsedCharges = parseFloat(tripChargesInput);
      const newBilling = isNaN(parsedBilling) ? undefined : parsedBilling;
      const newCharges = isNaN(parsedCharges) ? undefined : parsedCharges;

      if (newBilling !== trip?.billing_amount || newCharges !== trip?.trip_charges) {
        await updateFinancialsMutation.mutateAsync({
          billing_amount: newBilling,
          trip_charges: newCharges,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['trip', id] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success('Trip manifest updated successfully');
      navigate(`/trips/${id}`);
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to update trip manifest';
      setError(msg);
      toast.error(msg);
    }
  };

  if (isLoading || !trip) {
    return (
      <DashboardLayout active="Trips" title="Edit Trip Manifest">
        <div className="p-12 flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-muted-foreground font-medium">Loading trip manifest details...</p>
        </div>
      </DashboardLayout>
    );
  }

  const isSubmitting = updateStatusMutation.isPending || dispatchMutation.isPending || updateFinancialsMutation.isPending;
  const currentStatusInfo = STATUS_DESCRIPTIONS[status] || STATUS_DESCRIPTIONS['Draft'];
  const assignedDriverObj = driversRes?.data?.find((d) => d.id === selectedDriverId);
  const assignedVehicleObj = vehiclesRes?.data?.find((v) => v.id === selectedVehicleId);

  const pickupStop = (trip.stops ?? []).find((s) => s.stop_type === 'Pickup');
  const dropoffStop = (trip.stops ?? []).find((s) => s.stop_type === 'Dropoff');

  return (
    <DashboardLayout active="Trips" title={`Edit ${trip.ref_id || 'Trip Manifest'}`}>
      <div className="px-3 sm:px-5 pb-4 space-y-3 animate-fade-in max-w-[1350px] mx-auto">
        
        {/* Slim Top Action Strip */}
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 font-bold border-none text-[11px] px-2 py-0.5">
              <Truck className="w-3 h-3 mr-1 inline text-indigo-600" /> Edit Manifest
            </Badge>
            <span className="text-xs text-slate-400 font-mono font-medium hidden sm:inline">
              Ref: {trip.ref_id || 'TRIP-LOG'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate(`/trips/${id}`)}
              className="h-7 text-xs text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-800 px-2"
            >
              <Eye className="w-3.5 h-3.5 mr-1" /> View Details
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleReset}
              className="h-7 text-xs text-slate-500 hover:text-slate-800 dark:text-slate-400 px-2"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/trips')}
              className="h-7 text-xs font-medium border-slate-200 dark:border-slate-800 px-2.5"
            >
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="h-7 text-xs bg-brand hover:bg-brand-hover text-white font-bold px-3 shadow-xs"
            >
              {isSubmitting ? 'Saving...' : 'Save Manifest Changes'}
            </Button>
          </div>
        </div>

        {/* 2-Column High-Density Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          {/* Main Form Column (8 cols) */}
          <div className="lg:col-span-8 space-y-3">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl shadow-2xs">
              <CardContent className="p-3.5 sm:p-4 space-y-3.5">

                {/* Section 1: Customer & Progress Stage */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-brand" /> Customer & Operational Stage
                    </h2>
                    <span className="text-[10px] text-slate-400 font-mono">Manifest ID: {trip.ref_id}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Customer / Client Company
                      </Label>
                      <Input
                        disabled
                        value={trip.customer?.name ? `${trip.customer.name} (+966 ${trip.customer.contact_phone || ''})` : 'Standard Customer'}
                        className="h-8 text-xs font-medium bg-slate-50 dark:bg-slate-800/50"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="status" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Shipment Stage / Status <span className="text-rose-500">*</span>
                      </Label>
                      <Select
                        value={status}
                        onValueChange={(val: TripStatus) => setStatus(val)}
                      >
                        <SelectTrigger id="status" className="h-8 text-xs">
                          <SelectValue placeholder="Select status..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Draft" className="text-xs">Draft — Preparing shipment</SelectItem>
                          <SelectItem value="Dispatched" className="text-xs">Dispatched — Assigned & notified</SelectItem>
                          <SelectItem value="AtPickup" className="text-xs">At Pickup — Loading cargo at origin</SelectItem>
                          <SelectItem value="InTransit" className="text-xs">In Transit — Highway delivery in progress</SelectItem>
                          <SelectItem value="AtDelivery" className="text-xs">At Delivery — Unloading at customer dock</SelectItem>
                          <SelectItem value="Completed" className="text-xs">Completed — Delivered & signed off</SelectItem>
                          <SelectItem value="Invoiced" className="text-xs">Invoiced — Billing processed</SelectItem>
                          <SelectItem value="Cancelled" className="text-xs">Cancelled — Shipment revoked</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Status Banner */}
                  <div className={`p-2.5 rounded-lg border ${currentStatusInfo.color} flex items-start gap-2.5 text-xs transition-colors`}>
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">{currentStatusInfo.title}</p>
                      <p className="text-[11px] opacity-90 leading-tight mt-0.5">{currentStatusInfo.description}</p>
                    </div>
                  </div>
                </div>

                {/* Section 2: Driver & Vehicle Resource Assignment */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-blue-500" /> Dispatch & Fleet Assignment
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label htmlFor="selectedDriverId" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Assigned Driver
                      </Label>
                      <Select
                        value={selectedDriverId}
                        onValueChange={(val) => setSelectedDriverId(val)}
                      >
                        <SelectTrigger id="selectedDriverId" className="h-8 text-xs">
                          <SelectValue placeholder="-- No driver assigned --" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="" className="text-xs italic text-slate-400">
                            -- No driver assigned (Assign Later) --
                          </SelectItem>
                          {driversRes?.data?.map((d) => (
                            <SelectItem key={d.id} value={d.id} className="text-xs font-medium">
                              {d.first_name} {d.last_name} ({d.phone_primary}) • [{d.status}]
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="selectedVehicleId" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Assigned Vehicle / Truck
                      </Label>
                      <Select
                        value={selectedVehicleId}
                        onValueChange={(val) => setSelectedVehicleId(val)}
                      >
                        <SelectTrigger id="selectedVehicleId" className="h-8 text-xs font-mono">
                          <SelectValue placeholder="-- No truck assigned --" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="" className="text-xs italic text-slate-400">
                            -- No truck assigned (Assign Later) --
                          </SelectItem>
                          {vehiclesRes?.data?.map((v) => (
                            <SelectItem key={v.id} value={v.id} className="text-xs font-mono font-medium">
                              Plate: {v.plate_number} ({v.asset_type}) • [{v.status}]
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Section 3: Route Stops & Delivery Locations */}
                <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-emerald-500" /> Route Stops & Delivery Locations
                    </h2>
                    {STOPS_FROZEN_IN.includes(trip.status) && (
                      <span className="text-[10px] text-amber-600 font-semibold italic">
                        Stops frozen (Trip {trip.status})
                      </span>
                    )}
                  </div>

                  {(() => {
                    const stops = (trip.stops ?? []).slice().sort((a, b) => a.stop_sequence - b.stop_sequence);
                    if (stops.length === 0) {
                      return (
                        <div className="p-3 border border-slate-100 dark:border-slate-800 rounded-xl text-xs text-slate-400 italic text-center bg-slate-50/50">
                          No stops attached to this trip manifest.
                        </div>
                      );
                    }

                    const pickupStop = stops.find((s) => s.stop_type === 'Pickup') || stops[0];
                    const dropoffStop = stops.find((s) => s.stop_type === 'Dropoff') || (stops.length > 1 ? stops[stops.length - 1] : null);
                    const intermediateStops = stops.filter((s) => s !== pickupStop && s !== dropoffStop);

                    return (
                      <div className="space-y-3">
                        {/* 🟢 Pickup Stop Card */}
                        {pickupStop && (
                          <StopAddressEditor
                            key={pickupStop.id}
                            tripId={id!}
                            stop={pickupStop}
                            title="Pickup Stop (Origin)"
                            editable={!STOPS_FROZEN_IN.includes(trip.status)}
                            customerId={trip.customer?.id}
                          />
                        )}

                        {/* ⏱ Transit Time & Route Distance Badge */}
                        {pickupStop && dropoffStop && (
                          <TransitTimeBadge
                            origin={pickupStop.location_name || pickupStop.location_address || ''}
                            destination={dropoffStop.location_name || dropoffStop.location_address || ''}
                          />
                        )}

                        {/* 🟠 Dropoff Stop Card */}
                        {dropoffStop && dropoffStop !== pickupStop && (
                          <StopAddressEditor
                            key={dropoffStop.id}
                            tripId={id!}
                            stop={dropoffStop}
                            title="Dropoff Stop (Destination)"
                            editable={!STOPS_FROZEN_IN.includes(trip.status)}
                            customerId={trip.customer?.id}
                          />
                        )}

                        {/* 🔵 Intermediate Stop Cards */}
                        {intermediateStops.length > 0 && (
                          <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                              Intermediate Stop Locations ({intermediateStops.length})
                            </span>
                            <div className="space-y-2.5">
                              {intermediateStops.map((stop, idx) => (
                                <StopAddressEditor
                                  key={stop.id}
                                  tripId={id!}
                                  stop={stop}
                                  title={`Intermediate Stop #${idx + 1}`}
                                  editable={!STOPS_FROZEN_IN.includes(trip.status)}
                                  customerId={trip.customer?.id}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Section 4: Commercial Financials & Invoicing */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Commercial Financials
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="space-y-1">
                      <Label htmlFor="billing_amount" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Client Billing Amount (SAR)
                      </Label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1.5 font-mono text-xs font-bold text-slate-400">SAR</span>
                        <Input
                          id="billing_amount"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={billingAmountInput}
                          onChange={(e) => setBillingAmountInput(e.target.value)}
                          className="h-8 pl-12 text-xs font-mono font-semibold"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="trip_charges" className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                        Extra Trip Charges / Surcharges (SAR)
                      </Label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1.5 font-mono text-xs font-bold text-slate-400">SAR</span>
                        <Input
                          id="trip_charges"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={tripChargesInput}
                          onChange={(e) => setTripChargesInput(e.target.value)}
                          className="h-8 pl-12 text-xs font-mono font-semibold"
                        />
                      </div>
                    </div>
                  </div>
                </div>

              </CardContent>
            </Card>

            {error && (
              <div className="p-2.5 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 rounded-lg text-xs font-semibold border border-rose-200 dark:border-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Right Sidebar Column (4 cols) */}
          <div className="lg:col-span-4 space-y-3 sticky top-2">
            <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-3.5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Manifest Summary</span>
                <StatusBadge status={status} />
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 flex items-center justify-center font-bold text-xs shrink-0 border border-indigo-200 dark:border-indigo-900/50">
                    <Truck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold font-mono text-slate-900 dark:text-slate-100 truncate">
                      {trip.ref_id || 'TRIP-MANIFEST'}
                    </p>
                    <span className="text-[10px] text-slate-500 block truncate">
                      Client: {trip.customer?.name || 'Standard Client'}
                    </span>
                  </div>
                </div>

                {/* Route Summary */}
                <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Route Details</span>
                  <div className="text-xs space-y-0.5">
                    <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                      Origin: {pickupStop?.location_name || pickupStop?.location_address || 'Pickup Yard'}
                    </p>
                    <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-orange-500 inline-block"></span>
                      Dest: {dropoffStop?.location_name || dropoffStop?.location_address || 'Delivery Dock'}
                    </p>
                  </div>
                </div>

                {/* Dispatch Roster */}
                <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Assigned Driver & Truck</span>
                  <p className="text-[11px] font-medium text-slate-800 dark:text-slate-200 truncate">
                    {assignedDriverObj ? `${assignedDriverObj.first_name} ${assignedDriverObj.last_name}` : 'Driver: Unassigned'}
                  </p>
                  <p className="text-[10px] font-mono text-slate-500 truncate">
                    {assignedVehicleObj ? `Plate: ${assignedVehicleObj.plate_number} (${assignedVehicleObj.asset_type})` : 'Vehicle: Unassigned'}
                  </p>
                </div>

                {/* Billing Financials Summary */}
                <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] text-slate-400 uppercase font-bold block">Financial Total</span>
                  <p className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400">
                    SAR {((parseFloat(billingAmountInput) || 0) + (parseFloat(tripChargesInput) || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              <Button 
                size="sm" 
                onClick={handleSubmit} 
                disabled={isSubmitting}
                className="w-full h-8 text-xs bg-brand hover:bg-brand-hover text-white font-bold shadow-xs mt-1"
              >
                {isSubmitting ? 'Saving...' : 'Save Manifest Changes'}
              </Button>
            </Card>
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
