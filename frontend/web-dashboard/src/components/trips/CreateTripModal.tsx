import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  RotateCcw,
  CheckCircle2,
  Navigation,
  User,
  Truck,
  AlertCircle,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Receipt,
} from 'lucide-react';
import { parseISO, isValid, differenceInMinutes, addHours, setHours, setMinutes } from 'date-fns';

import CreateDriverModal from '@/components/trips/CreateDriverModal';
import CreateVehicleModal from '@/components/trips/CreateVehicleModal';
import TripStepCustomer from '@/components/trips/TripStepCustomer';
import TripStepAssignments from '@/components/trips/TripStepAssignments';
import TripStepStopsSLA from '@/components/trips/TripStepStopsSLA';
import TripStepRatesBilling from '@/components/trips/TripStepRatesBilling';

import { tripService, CreateTripPayload, Trip } from '@/services/tripService';
import { customerService } from '@/services/customerService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { rateCardService } from '@/services/rateCardService';
import { locationService } from '@/services/locationService';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCustomerId?: string;
  initialDriverId?: string;
  onTripCreated?: (trip: Trip) => void;
}

export default function CreateTripModal({
  isOpen,
  onClose,
  initialCustomerId,
  initialDriverId,
  onTripCreated,
}: CreateTripModalProps) {
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [customerId, setCustomerId] = useState(initialCustomerId || '');
  const [driverId, setDriverId] = useState(initialDriverId || '');
  const [vehicleId, setVehicleId] = useState('');
  const [assignDriverLater, setAssignDriverLater] = useState(false);
  const [assignVehicleLater, setAssignVehicleLater] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);

  // Stop Details
  const [pickupLocationId, setPickupLocationId] = useState('');
  const [pickupLocationName, setPickupLocationName] = useState('');
  const [pickupLat, setPickupLat] = useState<number | null>(24.7136); // Default Riyadh
  const [pickupLng, setPickupLng] = useState<number | null>(46.6753);
  const [pickupTime, setPickupTime] = useState('');
  const [pickupName, setPickupName] = useState('');
  const [pickupAddress, setPickupAddress] = useState('');

  const [dropoffLocationId, setDropoffLocationId] = useState('');
  const [dropoffLocationName, setDropoffLocationName] = useState('');
  const [dropoffLat, setDropoffLat] = useState<number | null>(21.5433); // Default Jeddah
  const [dropoffLng, setDropoffLng] = useState<number | null>(39.1728);
  const [dropoffTime, setDropoffTime] = useState('');
  const [dropoffName, setDropoffName] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');

  // Pricing
  const [billingAmount, setBillingAmount] = useState<string>('');
  const [isPriceCustomized, setIsPriceCustomized] = useState(false);
  const [saveRateAs, setSaveRateAs] = useState<'standard' | 'customer' | 'none'>('standard');
  const [rateSaveWarning, setRateSaveWarning] = useState<string | null>(null);

  // Reset or initialize state on modal open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setCustomerId(initialCustomerId || '');
      setDriverId(initialDriverId || '');
      setVehicleId('');
      setAssignDriverLater(false);
      setAssignVehicleLater(false);
      setPickupLocationId('');
      setPickupLocationName('');
      setPickupLat(24.7136);
      setPickupLng(46.6753);
      setPickupTime('');
      setPickupName('');
      setPickupAddress('');
      setDropoffLocationId('');
      setDropoffLocationName('');
      setDropoffLat(21.5433);
      setDropoffLng(39.1728);
      setDropoffTime('');
      setDropoffName('');
      setDropoffAddress('');
      setBillingAmount('');
      setIsPriceCustomized(false);
      setSaveRateAs('standard');
      setRateSaveWarning(null);
      setError(null);
    }
  }, [isOpen, initialCustomerId, initialDriverId]);

  // Queries
  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 100 }),
    enabled: isOpen,
  });

  const { data: driversRes } = useQuery({
    queryKey: ['drivers-select'],
    queryFn: () => driverService.getAll({ per_page: 100, status: 'Available' }),
    enabled: isOpen,
  });

  const { data: vehiclesRes } = useQuery({
    queryKey: ['vehicles-select'],
    queryFn: () => vehicleService.getAll({ per_page: 100, status: 'Available' }),
    enabled: isOpen,
  });

  const { data: locationsRes } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationService.getAll({ active_only: true }),
    enabled: isOpen,
  });

  const customers = customersRes?.data || [];
  const drivers = driversRes?.data || [];
  const vehicles = vehiclesRes?.data || [];
  const locations = locationsRes?.data || [];

  const selectedCustomer = useMemo(() => customers.find((c) => c.id === customerId) || null, [customers, customerId]);
  const selectedDriver = useMemo(() => drivers.find((d) => d.id === driverId) || null, [drivers, driverId]);
  const selectedVehicle = useMemo(() => vehicles.find((v) => v.id === vehicleId) || null, [vehicles, vehicleId]);

  const selectedPickupLocation = useMemo(
    () => locations.find((l) => l.id === pickupLocationId) || null,
    [locations, pickupLocationId]
  );
  const selectedDropoffLocation = useMemo(
    () => locations.find((l) => l.id === dropoffLocationId) || null,
    [locations, dropoffLocationId]
  );

  const driverOptions = useMemo(
    () =>
      drivers.map((d) => ({
        value: d.id,
        label: `${d.first_name} ${d.last_name}`,
        keywords: `${d.first_name} ${d.last_name}`,
      })),
    [drivers]
  );

  const vehicleOptions = useMemo(
    () =>
      vehicles.map((v) => ({
        value: v.id,
        label: `${v.plate_number} (${v.asset_type} • ${v.capacity_kg.toLocaleString()} kg)`,
        keywords: `${v.plate_number} ${v.asset_type}`,
      })),
    [vehicles]
  );

  const vehicleAutoAssigned = !!selectedDriver?.assignedVehicleId && selectedDriver.assignedVehicleId === vehicleId;

  // Auto-fill assigned vehicle
  useEffect(() => {
    if (selectedDriver?.assignedVehicleId && vehicles.some((v) => v.id === selectedDriver.assignedVehicleId)) {
      setVehicleId(selectedDriver.assignedVehicleId);
    }
  }, [selectedDriver, vehicles]);

  // Auto-populate customer default coordinates
  useEffect(() => {
    if (selectedCustomer) {
      if (selectedCustomer.default_pickup_lat && selectedCustomer.default_pickup_lng) {
        setPickupLat(selectedCustomer.default_pickup_lat);
        setPickupLng(selectedCustomer.default_pickup_lng);
      }
      if (selectedCustomer.default_dropoff_lat && selectedCustomer.default_dropoff_lng) {
        setDropoffLat(selectedCustomer.default_dropoff_lat);
        setDropoffLng(selectedCustomer.default_dropoff_lng);
      }
    }
  }, [selectedCustomer]);

  const pickupDistanceKm = useMemo(() => {
    if (
      pickupLat == null ||
      pickupLng == null ||
      !selectedPickupLocation ||
      selectedPickupLocation.lat == null ||
      selectedPickupLocation.lng == null
    ) {
      return null;
    }
    return Math.round(
      calculateHaversineDistanceKm(pickupLat, pickupLng, selectedPickupLocation.lat, selectedPickupLocation.lng)
    );
  }, [pickupLat, pickupLng, selectedPickupLocation]);

  const dropoffDistanceKm = useMemo(() => {
    if (
      dropoffLat == null ||
      dropoffLng == null ||
      !selectedDropoffLocation ||
      selectedDropoffLocation.lat == null ||
      selectedDropoffLocation.lng == null
    ) {
      return null;
    }
    return Math.round(
      calculateHaversineDistanceKm(dropoffLat, dropoffLng, selectedDropoffLocation.lat, selectedDropoffLocation.lng)
    );
  }, [dropoffLat, dropoffLng, selectedDropoffLocation]);

  // Rate card lookup
  const laneReady = !!pickupLocationId && !!dropoffLocationId && pickupLocationId !== dropoffLocationId;

  const { data: rateLookup, isFetching: isLookingUpRate } = useQuery({
    queryKey: ['rate-card-lookup', customerId, pickupLocationId, dropoffLocationId],
    queryFn: () =>
      rateCardService.lookup({
        customer_id: customerId,
        origin_location_id: pickupLocationId,
        destination_location_id: dropoffLocationId,
      }),
    enabled: isOpen && !!customerId && laneReady,
  });

  const matchedRateCard = rateLookup?.rate_card ?? null;
  const rateSource = rateLookup?.source ?? null;
  const laneHasNoRate = !!customerId && laneReady && !isLookingUpRate && !matchedRateCard;

  useEffect(() => {
    if (matchedRateCard && !isPriceCustomized) {
      setBillingAmount(String(matchedRateCard.base_price));
    }
  }, [matchedRateCard, isPriceCustomized]);

  // SLA Calculation
  const transitInfo = useMemo(() => {
    if (!pickupTime || !dropoffTime) return null;
    const pDate = parseISO(pickupTime);
    const dDate = parseISO(dropoffTime);
    if (!isValid(pDate) || !isValid(dDate)) return null;

    const totalMinutes = differenceInMinutes(dDate, pDate);
    const isInvalid = totalMinutes <= 0;
    const isTight = totalMinutes > 0 && totalMinutes < 120;
    const isOptimal = totalMinutes >= 120;

    const absMins = Math.abs(totalMinutes);
    const hours = Math.floor(absMins / 60);
    const mins = absMins % 60;

    let durationString = '';
    if (hours > 0 && mins > 0) {
      durationString = `${hours}h ${mins}m`;
    } else if (hours > 0) {
      durationString = `${hours} hrs`;
    } else {
      durationString = `${mins} mins`;
    }

    return { totalMinutes, durationString, isInvalid, isTight, isOptimal };
  }, [pickupTime, dropoffTime]);

  const applyDropoffOffset = (hoursOffset: number, setEod: boolean = false) => {
    const base = pickupTime && isValid(parseISO(pickupTime)) ? parseISO(pickupTime) : new Date();
    const target = setEod ? setMinutes(setHours(base, 23), 59) : addHours(base, hoursOffset);
    setDropoffTime(toLocalInput(target));
    setError(null);
  };

  const adjustPrice = (amount: number) => {
    const current = parseFloat(billingAmount || '0') || 0;
    const updated = Math.max(0, current + amount);
    setBillingAmount(String(updated));
    setIsPriceCustomized(true);
  };

  // Mutation
  const createMutation = useMutation({
    mutationFn: async (payload: CreateTripPayload) => {
      let finalPickupLocId = pickupLocationId;
      let finalDropoffLocId = dropoffLocationId;

      // 1. Ensure Pickup Location is saved to DB if missing locationId
      if (!finalPickupLocId && pickupName.trim()) {
        try {
          const newLoc = await locationService.create({
            name: pickupName.trim(),
            address: pickupAddress.trim() || undefined,
            lat: pickupLat ?? undefined,
            lng: pickupLng ?? undefined,
          });
          finalPickupLocId = newLoc.id;
          setPickupLocationId(newLoc.id);
        } catch (e) {
          console.error('Failed to auto-create pickup location', e);
        }
      }

      // 2. Ensure Dropoff Location is saved to DB if missing locationId
      if (!finalDropoffLocId && dropoffName.trim()) {
        try {
          const newLoc = await locationService.create({
            name: dropoffName.trim(),
            address: dropoffAddress.trim() || undefined,
            lat: dropoffLat ?? undefined,
            lng: dropoffLng ?? undefined,
          });
          finalDropoffLocId = newLoc.id;
          setDropoffLocationId(newLoc.id);
        } catch (e) {
          console.error('Failed to auto-create dropoff location', e);
        }
      }

      // Update payload stops with saved location IDs
      if (payload.stops && payload.stops.length >= 2) {
        if (finalPickupLocId) payload.stops[0].location_id = finalPickupLocId;
        if (finalDropoffLocId) payload.stops[1].location_id = finalDropoffLocId;
      }

      // 3. Save Rate Card if requested
      let rateCardId = matchedRateCard?.id;

      if (!matchedRateCard && saveRateAs !== 'none' && payload.billing_amount && finalPickupLocId && finalDropoffLocId) {
        try {
          const createdRate = await rateCardService.create({
            name: `${pickupName.trim()} → ${dropoffName.trim()}`,
            base_price: payload.billing_amount,
            currency: 'SAR',
            customerId: saveRateAs === 'customer' ? customerId : null,
            origin_location_id: finalPickupLocId,
            destination_location_id: finalDropoffLocId,
            origin_name: pickupName.trim(),
            destination_name: dropoffName.trim(),
            origin_lat: pickupLat,
            origin_lng: pickupLng,
            destination_lat: dropoffLat,
            destination_lng: dropoffLng,
          });
          rateCardId = createdRate.id;
        } catch (e: any) {
          console.error('Failed to save rate card', e);
          setRateSaveWarning(
            e.response?.data?.error?.message ||
              'The trip was created, but the new rate card could not be saved for reuse.'
          );
        }
      }

      return tripService.create({ ...payload, rate_card_id: rateCardId });
    },
    onSuccess: async (createdTrip) => {
      if (customerId && pickupLat && pickupLng && dropoffLat && dropoffLng) {
        try {
          await customerService.update(customerId, {
            default_pickup_lat: pickupLat,
            default_pickup_lng: pickupLng,
            default_dropoff_lat: dropoffLat,
            default_dropoff_lng: dropoffLng,
          });
        } catch (e) {
          console.error('Failed to auto-save customer locations', e);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['locations'] });
      queryClient.invalidateQueries({ queryKey: ['rate-cards'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-performance'] });
      queryClient.invalidateQueries({ queryKey: ['customers-select'] });
      if (onTripCreated) onTripCreated(createdTrip);
      onClose();
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Could not create the trip.');
    },
  });

  const handleReset = () => {
    setStep(1);
    setCustomerId(initialCustomerId || '');
    setDriverId(initialDriverId || '');
    setVehicleId('');
    setAssignDriverLater(false);
    setAssignVehicleLater(false);
    setPickupLocationId('');
    setPickupLocationName('');
    setPickupLat(24.7136);
    setPickupLng(46.6753);
    setPickupTime('');
    setPickupName('');
    setPickupAddress('');
    setDropoffLocationId('');
    setDropoffLocationName('');
    setDropoffLat(21.5433);
    setDropoffLng(39.1728);
    setDropoffTime('');
    setDropoffName('');
    setDropoffAddress('');
    setBillingAmount('');
    setIsPriceCustomized(false);
    setSaveRateAs('standard');
    setRateSaveWarning(null);
    setError(null);
  };

  const nextStep = useCallback(() => {
    setError(null);
    if (step === 1 && !customerId) {
      setError('Please select a customer before proceeding.');
      return;
    }
    if (step === 2 && !assignDriverLater && !driverId) {
      setError('Please assign a driver, or check "Assign driver later".');
      return;
    }
    if (step === 2 && !assignVehicleLater && !vehicleId) {
      setError('Please assign a vehicle, or check "Assign vehicle later".');
      return;
    }
    if (step === 3) {
      if (pickupLat == null || pickupLng == null || dropoffLat == null || dropoffLng == null) {
        setError('Please select both pickup and dropoff locations.');
        return;
      }
      if (pickupName.trim() === '' || dropoffName.trim() === '') {
        setError('Name both locations — reports group trips by these names.');
        return;
      }
      if (!pickupLocationId || !dropoffLocationId) {
        setError('Pick origin and destination for both stops to match rate cards.');
        return;
      }
      if (pickupLocationId === dropoffLocationId) {
        setError('Origin and destination must be different places.');
        return;
      }
      if (!pickupTime || !dropoffTime) {
        setError('Set both planned arrival times.');
        return;
      }
      if (dropoffTime <= pickupTime) {
        setError('Planned delivery deadline must be strictly after pickup arrival time.');
        return;
      }
    }

    setStep((prev) => (prev < 4 ? ((prev + 1) as 1 | 2 | 3 | 4) : 4));
  }, [
    step,
    customerId,
    assignDriverLater,
    driverId,
    assignVehicleLater,
    vehicleId,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    pickupName,
    dropoffName,
    pickupLocationId,
    dropoffLocationId,
    pickupTime,
    dropoffTime,
  ]);

  const prevStep = useCallback(() => {
    setError(null);
    setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4) : 1));
  }, []);

  const missingLocation = pickupLat == null || pickupLng == null || dropoffLat == null || dropoffLng == null;
  const missingName = pickupName.trim() === '' || dropoffName.trim() === '';
  const missingLane = !pickupLocationId || !dropoffLocationId;
  const sameLaneEndpoints = !!pickupLocationId && pickupLocationId === dropoffLocationId;
  const missingSchedule = pickupTime === '' || dropoffTime === '';
  const isScheduleInvalid = pickupTime !== '' && dropoffTime !== '' && dropoffTime <= pickupTime;

  const isFormValid =
    customerId !== '' &&
    (assignDriverLater || driverId !== '') &&
    (assignVehicleLater || vehicleId !== '') &&
    !missingLocation &&
    !missingName &&
    !missingLane &&
    !sameLaneEndpoints &&
    !missingSchedule &&
    !isScheduleInvalid;

  const handleSubmit = useCallback(() => {
    setError(null);

    if (pickupLat == null || pickupLng == null) {
      setError('Please select a pickup location on the map.');
      return;
    }
    if (dropoffLat == null || dropoffLng == null) {
      setError('Please select a dropoff location on the map.');
      return;
    }
    if (pickupName.trim() === '' || dropoffName.trim() === '') {
      setError('Name both locations (e.g. "Khamis Sorting Center") — reports group trips by these names.');
      return;
    }
    if (!pickupLocationId || !dropoffLocationId) {
      setError('Pick the origin and destination for both stops — that is what the rate is priced against.');
      return;
    }
    if (pickupLocationId === dropoffLocationId) {
      setError('Origin and destination must be different places.');
      return;
    }
    if (!pickupTime || !dropoffTime) {
      setError('Set both planned arrival times — without them this trip can never be measured for delays.');
      return;
    }
    if (pickupTime && dropoffTime && dropoffTime <= pickupTime) {
      setError('Planned delivery deadline must be strictly after pickup arrival time.');
      return;
    }

    const numericPrice = billingAmount && !isNaN(parseFloat(billingAmount)) ? parseFloat(billingAmount) : undefined;

    const payload: CreateTripPayload = {
      customer_id: customerId,
      driver_id: assignDriverLater ? undefined : driverId,
      vehicle_id: assignVehicleLater ? undefined : vehicleId,
      planned_start: pickupTime || undefined,
      billing_amount: numericPrice,
      trip_charges: numericPrice,
      stops: [
        {
          stop_type: 'Pickup',
          lat: pickupLat,
          lng: pickupLng,
          planned_arrival: pickupTime || undefined,
          location_name: pickupName.trim() || undefined,
          location_address: pickupAddress.trim() || undefined,
          location_id: pickupLocationId || undefined,
        },
        {
          stop_type: 'Dropoff',
          lat: dropoffLat,
          lng: dropoffLng,
          planned_arrival: dropoffTime || undefined,
          location_name: dropoffName.trim() || undefined,
          location_address: dropoffAddress.trim() || undefined,
          location_id: dropoffLocationId || undefined,
        },
      ],
    };

    createMutation.mutate(payload);
  }, [
    customerId,
    driverId,
    vehicleId,
    assignDriverLater,
    assignVehicleLater,
    pickupLat,
    pickupLng,
    dropoffLat,
    dropoffLng,
    pickupLocationId,
    dropoffLocationId,
    pickupTime,
    dropoffTime,
    pickupName,
    dropoffName,
    pickupAddress,
    dropoffAddress,
    billingAmount,
    createMutation,
  ]);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    if (!isOpen || isAddDriverOpen || isAddVehicleOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape -> Cancel / Close
      if (e.key === 'Escape') {
        if (!createMutation.isPending) {
          onClose();
        }
        return;
      }

      // Next Step / Dispatch Submit
      if (
        (e.altKey && (e.key === 'ArrowRight' || e.key.toLowerCase() === 'n')) ||
        ((e.ctrlKey || e.metaKey) && e.key === 'Enter')
      ) {
        e.preventDefault();
        if (step < 4) {
          nextStep();
        } else if (step === 4 && isFormValid && !createMutation.isPending) {
          handleSubmit();
        }
        return;
      }

      // Back (Alt + LeftArrow, Alt + B)
      if (e.altKey && (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'b')) {
        e.preventDefault();
        if (step > 1) {
          prevStep();
        } else {
          onClose();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    isAddDriverOpen,
    isAddVehicleOpen,
    step,
    isFormValid,
    createMutation.isPending,
    nextStep,
    prevStep,
    handleSubmit,
    onClose,
  ]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !createMutation.isPending && !open && onClose()}>
        <DialogContent className={cn(
          "transition-all duration-300 max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl",
          step === 1 ? "max-w-2xl sm:max-w-3xl w-[90vw]" :
          step === 2 ? "max-w-3xl lg:max-w-4xl w-[92vw]" :
          step === 3 ? "max-w-5xl lg:max-w-6xl w-[95vw]" :
          "max-w-3xl lg:max-w-4xl w-[92vw]"
        )}>
          
          {/* Header */}
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                  Create New Trip
                </DialogTitle>
                <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800 font-semibold text-[11px] px-2 py-0.5">
                  Operations Module
                </Badge>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="h-8 text-xs gap-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Form
              </Button>
            </div>

            {/* Step Selector Tabs (4 Steps) */}
            <div className="grid grid-cols-4 gap-2 mt-4 pt-1">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-xl text-left border transition-all text-xs font-semibold cursor-pointer',
                  step === 1
                    ? 'border-[#E8450F] bg-orange-50/50 dark:bg-orange-950/20 text-[#E8450F]'
                    : selectedCustomer
                    ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500'
                )}
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">1. Customer</span>
                {selectedCustomer && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-emerald-600 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (customerId) setStep(2);
                }}
                disabled={!customerId}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-xl text-left border transition-all text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                  step === 2
                    ? 'border-[#E8450F] bg-orange-50/50 dark:bg-orange-950/20 text-[#E8450F]'
                    : (selectedDriver || assignDriverLater) && (selectedVehicle || assignVehicleLater)
                    ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500'
                )}
              >
                <Truck className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">2. Assignments</span>
                {((selectedDriver || assignDriverLater) && (selectedVehicle || assignVehicleLater)) && (
                  <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-emerald-600 shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (customerId && (selectedDriver || assignDriverLater) && (selectedVehicle || assignVehicleLater)) {
                    setStep(3);
                  }
                }}
                disabled={!customerId || (!assignDriverLater && !driverId) || (!assignVehicleLater && !vehicleId)}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-xl text-left border transition-all text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                  step === 3
                    ? 'border-[#E8450F] bg-orange-50/50 dark:bg-orange-950/20 text-[#E8450F]'
                    : !missingLocation && !missingName && !missingLane && !sameLaneEndpoints && !missingSchedule && !isScheduleInvalid
                    ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500'
                )}
              >
                <Navigation className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">3. Route &amp; SLA</span>
                {!missingLocation && !missingName && !missingLane && !sameLaneEndpoints && !missingSchedule && !isScheduleInvalid && (
                  <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-emerald-600 shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (customerId && (selectedDriver || assignDriverLater) && (selectedVehicle || assignVehicleLater) && !missingLocation && !missingName && !missingLane && !sameLaneEndpoints && !missingSchedule && !isScheduleInvalid) {
                    setStep(4);
                  }
                }}
                disabled={!isFormValid}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-xl text-left border transition-all text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                  step === 4
                    ? 'border-[#E8450F] bg-orange-50/50 dark:bg-orange-950/20 text-[#E8450F]'
                    : isFormValid && billingAmount
                    ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500'
                )}
              >
                <Receipt className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">4. Rates &amp; Billing</span>
                {isFormValid && billingAmount && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-emerald-600 shrink-0" />}
              </button>
            </div>
          </DialogHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {error && (
              <Alert variant="destructive" className="rounded-xl border-destructive/30">
                <AlertCircle className="size-4" />
                <AlertTitle>Cannot proceed</AlertTitle>
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            {step === 1 && (
              <TripStepCustomer
                customerId={customerId}
                customers={customers}
                selectedCustomer={selectedCustomer}
                onSelectCustomer={(id) => { setCustomerId(id); setError(null); }}
              />
            )}

            {step === 2 && (
              <TripStepAssignments
                driverId={driverId}
                vehicleId={vehicleId}
                assignDriverLater={assignDriverLater}
                assignVehicleLater={assignVehicleLater}
                driverOptions={driverOptions}
                vehicleOptions={vehicleOptions}
                selectedDriver={selectedDriver}
                selectedVehicle={selectedVehicle}
                vehicleAutoAssigned={vehicleAutoAssigned}
                onSelectDriver={(id) => { setDriverId(id); setError(null); }}
                onSelectVehicle={(id) => { setVehicleId(id); setError(null); }}
                onToggleAssignDriverLater={(val) => {
                  setAssignDriverLater(val);
                  if (val) setDriverId('');
                  setError(null);
                }}
                onToggleAssignVehicleLater={(val) => {
                  setAssignVehicleLater(val);
                  if (val) setVehicleId('');
                  setError(null);
                }}
                onOpenAddDriver={() => setIsAddDriverOpen(true)}
                onOpenAddVehicle={() => setIsAddVehicleOpen(true)}
              />
            )}

            {step === 3 && (
              <TripStepStopsSLA
                pickupLocationId={pickupLocationId}
                pickupLocationName={pickupLocationName}
                pickupLat={pickupLat}
                pickupLng={pickupLng}
                pickupTime={pickupTime}
                pickupName={pickupName}
                pickupAddress={pickupAddress}
                dropoffLocationId={dropoffLocationId}
                dropoffLocationName={dropoffLocationName}
                dropoffLat={dropoffLat}
                dropoffLng={dropoffLng}
                dropoffTime={dropoffTime}
                dropoffName={dropoffName}
                dropoffAddress={dropoffAddress}
                locations={locations}
                selectedPickupLocation={selectedPickupLocation}
                selectedDropoffLocation={selectedDropoffLocation}
                pickupDistanceKm={pickupDistanceKm}
                dropoffDistanceKm={dropoffDistanceKm}
                transitInfo={transitInfo}
                onPickupLocationIdChange={(id) => { setPickupLocationId(id); setError(null); }}
                onPickupLocationNameChange={setPickupLocationName}
                onPickupCoordinatesChange={(la, ln) => { setPickupLat(la); setPickupLng(ln); setError(null); }}
                onPickupTimeChange={(t) => { setPickupTime(t); setError(null); }}
                onPickupNameChange={(n) => { setPickupName(n); setError(null); }}
                onPickupAddressChange={setPickupAddress}
                onDropoffLocationIdChange={(id) => { setDropoffLocationId(id); setError(null); }}
                onDropoffLocationNameChange={setDropoffLocationName}
                onDropoffCoordinatesChange={(la, ln) => { setDropoffLat(la); setDropoffLng(ln); setError(null); }}
                onDropoffTimeChange={(t) => { setDropoffTime(t); setError(null); }}
                onDropoffNameChange={(n) => { setDropoffName(n); setError(null); }}
                onDropoffAddressChange={setDropoffAddress}
                onApplyDropoffOffset={applyDropoffOffset}
              />
            )}

            {step === 4 && (
              <TripStepRatesBilling
                pickupLocationName={pickupLocationName}
                dropoffLocationName={dropoffLocationName}
                isLookingUpRate={isLookingUpRate}
                matchedRateCard={matchedRateCard}
                rateSource={rateSource}
                laneHasNoRate={laneHasNoRate}
                saveRateAs={saveRateAs}
                selectedCustomer={selectedCustomer}
                rateSaveWarning={rateSaveWarning}
                billingAmount={billingAmount}
                onSaveRateAsChange={setSaveRateAs}
                onBillingAmountChange={(val) => { setBillingAmount(val); setIsPriceCustomized(true); }}
                onAdjustPrice={adjustPrice}
              />
            )}
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 flex items-center justify-between sm:justify-between gap-3">
            <div>
              {step > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={prevStep}
                  className="h-9 gap-1 text-xs font-bold border-slate-200 dark:border-slate-800"
                  title="Keyboard Shortcut: Alt + LeftArrow or Alt + B"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back</span>
                  <span className="ml-1 text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1 py-0.2 rounded">Alt+←</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-9 gap-1 text-xs text-slate-500 hover:text-slate-900"
                  title="Keyboard Shortcut: Escape"
                >
                  <span>Cancel</span>
                  <span className="ml-1 text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1 py-0.2 rounded">Esc</span>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {step < 4 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={nextStep}
                  className="h-9 gap-1.5 text-xs font-extrabold bg-[#E8450F] hover:bg-[#C7380A] text-white shadow-sm px-5"
                  title="Keyboard Shortcut: Alt + RightArrow or Alt + N"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-4 h-4" />
                  <span className="ml-1 text-[10px] font-mono bg-black/20 text-white/90 px-1.5 py-0.2 rounded">Alt+→</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || !isFormValid}
                  className="h-9 gap-1.5 text-xs font-extrabold bg-[#E8450F] hover:bg-[#C7380A] text-white shadow-sm px-6 disabled:opacity-50"
                  title="Keyboard Shortcut: Ctrl + Enter or Alt + N"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Dispatching...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Dispatch New Trip</span>
                      <span className="ml-1 text-[10px] font-mono bg-black/20 text-white/90 px-1.5 py-0.2 rounded">Ctrl+↵</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Modals */}
      <CreateDriverModal
        isOpen={isAddDriverOpen}
        onClose={() => setIsAddDriverOpen(false)}
        onCreated={(newDriver) => { setDriverId(newDriver.id); setError(null); }}
      />
      <CreateVehicleModal
        isOpen={isAddVehicleOpen}
        onClose={() => setIsAddVehicleOpen(false)}
        onCreated={(newVehicle) => { setVehicleId(newVehicle.id); setError(null); }}
      />
    </>
  );
}
