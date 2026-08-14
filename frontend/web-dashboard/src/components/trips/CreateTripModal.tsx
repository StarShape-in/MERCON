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
  Clock,
  Zap,
  Keyboard,
} from 'lucide-react';
import { parseISO, isValid, differenceInMinutes, addHours, setHours, setMinutes } from 'date-fns';

import CreateDriverModal from '@/components/trips/CreateDriverModal';
import CreateVehicleModal from '@/components/trips/CreateVehicleModal';
import TripStepCustomer from '@/components/trips/TripStepCustomer';
import TripStepRouteStops from '@/components/trips/TripStepRouteStops';
import TripStepSchedule from '@/components/trips/TripStepSchedule';
import TripStepAssignments from '@/components/trips/TripStepAssignments';
import TripStepRatesBilling from '@/components/trips/TripStepRatesBilling';

import { tripService, CreateTripPayload, Trip } from '@/services/tripService';
import { customerService } from '@/services/customerService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { rateCardService } from '@/services/rateCardService';
import { locationService } from '@/services/locationService';
import { isScheduledOnDate } from '@/utils/scheduleUtils';

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

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [customerId, setCustomerId] = useState(initialCustomerId || '');
  const [driverId, setDriverId] = useState(initialDriverId || '');
  const [vehicleId, setVehicleId] = useState('');
  const [assignDriverLater, setAssignDriverLater] = useState(false);
  const [assignVehicleLater, setAssignVehicleLater] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);

  // Shortcut triggers
  const [isSearchAccountsOpen, setIsSearchAccountsOpen] = useState(false);
  const [focusPickupSearch, setFocusPickupSearch] = useState(false);
  const [focusDropoffSearch, setFocusDropoffSearch] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);

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
  const [saveRateAs, setSaveRateAs] = useState<'customer' | 'none'>('customer');
  const [rateSaveWarning, setRateSaveWarning] = useState<string | null>(null);
  // Vehicle Specification & Rate Category
  const [vehicleType, setVehicleType] = useState('');
  const [rateCategory, setRateCategory] = useState('');

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
      setSaveRateAs('customer');
      setRateSaveWarning(null);
      setVehicleType('');
      setRateCategory('');
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
      drivers.map((d) => {
        const isBusy = pickupTime ? isScheduledOnDate(d.trips, pickupTime) : false;
        return {
          value: d.id,
          label: `${d.first_name} ${d.last_name}${isBusy ? ' — [Scheduled on this date]' : ''}`,
          keywords: `${d.first_name} ${d.last_name}`,
          disabled: isBusy,
        };
      }),
    [drivers, pickupTime]
  );

  const vehicleOptions = useMemo(
    () =>
      vehicles.map((v) => {
        const isBusy = pickupTime ? isScheduledOnDate(v.trips, pickupTime) : false;
        return {
          value: v.id,
          label: `${v.plate_number} (${v.asset_type} • ${v.capacity_kg ? v.capacity_kg.toLocaleString() : '24000'} kg)${isBusy ? ' — [Scheduled on this date]' : ''}`,
          keywords: `${v.plate_number} ${v.asset_type}`,
          disabled: isBusy,
        };
      }),
    [vehicles, pickupTime]
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

  // Rate card lookup & available rate cards for lane
  // Same pickup and dropoff is a real lane, not a mistake — within-city local
  // delivery is priced that way (e.g. "INSIDE JEDDAH" → "INSIDE JEDDAH").
  const laneReady = !!pickupLocationId && !!dropoffLocationId;

  const [selectedRateCardId, setSelectedRateCardId] = useState<string>('');

  const { data: availableRateCardsRes = [], isFetching: isLookingUpRate } = useQuery({
    queryKey: ['available-rate-cards-lane', customerId, pickupLocationId, dropoffLocationId],
    queryFn: async () => {
      const res = await rateCardService.getAll({
        customerId: customerId || undefined,
        origin_location_id: pickupLocationId,
        destination_location_id: dropoffLocationId,
        active_only: true,
      });
      return res.data || [];
    },
    enabled: isOpen && laneReady,
  });

  const availableRateCards = availableRateCardsRes || [];
  const matchedRateCard = availableRateCards.find((rc) => rc.id === selectedRateCardId) ?? null;
  const rateSource = matchedRateCard ? 'customer' as const : null;
  const laneHasNoRate = !laneReady || (!isLookingUpRate && availableRateCards.length === 0);

  // Auto-select best matching rate card when availableRateCards loads
  useEffect(() => {
    if (availableRateCards.length > 0) {
      const customerCard = availableRateCards.find((rc) => rc.customerId === customerId);
      const targetCard = customerCard || availableRateCards[0];
      if (targetCard && (!selectedRateCardId || !availableRateCards.some((rc) => rc.id === selectedRateCardId))) {
        setSelectedRateCardId(targetCard.id);
        if (!isPriceCustomized) {
          setBillingAmount(String(targetCard.base_price));
        }
      }
    }
  }, [availableRateCards, customerId, isPriceCustomized, selectedRateCardId]);

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
      let rateCardId = selectedRateCardId || matchedRateCard?.id;

      if (!selectedRateCardId && saveRateAs !== 'none' && customerId && payload.billing_amount && finalPickupLocId && finalDropoffLocId) {
        try {
          const createdRate = await rateCardService.create({
            name: `${pickupName.trim()} → ${dropoffName.trim()}`,
            base_price: payload.billing_amount,
            currency: 'SAR',
            customerId,
            origin_location_id: finalPickupLocId,
            destination_location_id: finalDropoffLocId,
            origin_name: pickupName.trim(),
            destination_name: dropoffName.trim(),
            origin_lat: pickupLat,
            origin_lng: pickupLng,
            destination_lat: dropoffLat,
            destination_lng: dropoffLng,
            vehicle_type: vehicleType || null,
            rate_category: rateCategory || null,
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

      return tripService.create({
        ...payload,
        rate_card_id: rateCardId,
        vehicle_type: vehicleType || matchedRateCard?.vehicle_type || null,
        rate_category: rateCategory || matchedRateCard?.rate_category || null,
      });
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
    setSaveRateAs('customer');
    setRateSaveWarning(null);
    setError(null);
  };

  const nextStep = useCallback(() => {
    setError(null);
    if (step === 1 && !customerId) {
      setError('Please select a customer before proceeding.');
      return;
    }
    if (step === 2) {
      if (pickupLat == null || pickupLng == null || dropoffLat == null || dropoffLng == null) {
        setError('Please select both pickup and dropoff locations.');
        return;
      }
      if (pickupName.trim() === '' || dropoffName.trim() === '') {
        setError('Name both locations — reports group trips by these names.');
        return;
      }
    }
    if (step === 3) {
      if (!pickupTime || !dropoffTime) {
        setError('Set both planned arrival times.');
        return;
      }
      if (dropoffTime <= pickupTime) {
        setError('Planned delivery deadline must be strictly after pickup arrival time.');
        return;
      }
    }
    if (step === 4) {
      if (!assignDriverLater && !driverId) {
        setError('Please assign a driver, or check "Assign driver later".');
        return;
      }
      if (!assignVehicleLater && !vehicleId) {
        setError('Please assign a vehicle, or check "Assign vehicle later".');
        return;
      }
      if (driverId && selectedDriver && pickupTime && isScheduledOnDate(selectedDriver.trips, pickupTime)) {
        setError(`Driver ${selectedDriver.first_name} ${selectedDriver.last_name} is already assigned to a trip on this date.`);
        return;
      }
      if (vehicleId && selectedVehicle && pickupTime && isScheduledOnDate(selectedVehicle.trips, pickupTime)) {
        setError(`Vehicle ${selectedVehicle.plate_number} is already assigned to a trip on this date.`);
        return;
      }
    }

    setStep((prev) => (prev < 5 ? ((prev + 1) as 1 | 2 | 3 | 4 | 5) : 5));
  }, [
    step,
    customerId,
    assignDriverLater,
    driverId,
    selectedDriver,
    assignVehicleLater,
    vehicleId,
    selectedVehicle,
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
    setStep((prev) => (prev > 1 ? ((prev - 1) as 1 | 2 | 3 | 4 | 5) : 1));
  }, []);

  const missingLocation = pickupLat == null || pickupLng == null || dropoffLat == null || dropoffLng == null;
  const missingName = pickupName.trim() === '' || dropoffName.trim() === '';
  const missingLane = false;
  const missingSchedule = pickupTime === '' || dropoffTime === '';
  const isScheduleInvalid = pickupTime !== '' && dropoffTime !== '' && dropoffTime <= pickupTime;

  const isFormValid =
    customerId !== '' &&
    (assignDriverLater || driverId !== '') &&
    (assignVehicleLater || vehicleId !== '') &&
    !missingLocation &&
    !missingName &&
    !missingSchedule &&
    !isScheduleInvalid;

  const handleSubmit = useCallback((dispatchNow: boolean = false) => {
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
    if (!pickupTime || !dropoffTime) {
      setError('Set both planned arrival times — without them this trip can never be measured for delays.');
      return;
    }
    if (pickupTime && dropoffTime && dropoffTime <= pickupTime) {
      setError('Planned delivery deadline must be strictly after pickup arrival time.');
      return;
    }

    const numericPrice = billingAmount && !isNaN(parseFloat(billingAmount)) ? parseFloat(billingAmount) : undefined;
    const canDispatchImmediately = !assignDriverLater && !!driverId && !assignVehicleLater && !!vehicleId;
    const willDispatchNow = dispatchNow && canDispatchImmediately;

    const payload: CreateTripPayload = {
      customer_id: customerId,
      driver_id: assignDriverLater ? undefined : driverId,
      vehicle_id: assignVehicleLater ? undefined : vehicleId,
      planned_start: pickupTime || undefined,
      billing_amount: numericPrice,
      trip_charges: numericPrice,
      status: willDispatchNow ? 'Dispatched' : 'Draft',
      dispatch_now: willDispatchNow,
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

    const isInputFocused = () => {
      const activeEl = document.activeElement;
      if (!activeEl) return false;
      const tagName = activeEl.tagName.toLowerCase();
      return (
        tagName === 'input' ||
        tagName === 'textarea' ||
        tagName === 'select' ||
        activeEl.getAttribute('contenteditable') === 'true'
      );
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Keyboard Shortcuts Cheat Sheet (? or Ctrl+/)
      if ((e.key === '?' && !isInputFocused()) || (e.ctrlKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsHelpOpen((prev) => !prev);
        return;
      }

      // Escape -> Cancel / Close Help / Close Modal
      if (e.key === 'Escape') {
        if (isShortcutsHelpOpen) {
          setIsShortcutsHelpOpen(false);
          return;
        }
        if (!createMutation.isPending) {
          onClose();
        }
        return;
      }

      // Direct step jump with Alt + 1..5
      if (e.altKey && ['1', '2', '3', '4', '5'].includes(e.key)) {
        e.preventDefault();
        const targetStep = parseInt(e.key, 10) as 1 | 2 | 3 | 4 | 5;
        if (targetStep === 1) setStep(1);
        if (targetStep === 2 && customerId) setStep(2);
        if (targetStep === 3 && customerId && !missingLocation && !missingName) setStep(3);
        if (targetStep === 4 && customerId && !missingLocation && !missingName && !missingSchedule && !isScheduleInvalid) setStep(4);
        if (targetStep === 5 && isFormValid) setStep(5);
        return;
      }

      // Next Step (Alt + RightArrow, Alt + N, Ctrl + Enter)
      if (
        (e.altKey && (e.key === 'ArrowRight' || e.key.toLowerCase() === 'n')) ||
        ((e.ctrlKey || e.metaKey) && e.key === 'Enter')
      ) {
        e.preventDefault();
        if (step < 5) {
          nextStep();
        } else if (step === 5 && isFormValid && !createMutation.isPending) {
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

      // Enter Key Behavior (when not in search dropdown list):
      if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.ctrlKey) {
        const activeEl = document.activeElement;
        const isInCommandItem = activeEl?.getAttribute('cmdk-item') !== null || activeEl?.closest('[cmdk-list]');
        if (isInCommandItem) return;

        if (step === 1 && customerId && !isSearchAccountsOpen) {
          e.preventDefault();
          nextStep();
          return;
        }
        if (step === 2 && !missingLocation && !missingName) {
          e.preventDefault();
          nextStep();
          return;
        }
        if (step === 3 && !missingSchedule && !isScheduleInvalid) {
          e.preventDefault();
          nextStep();
          return;
        }
        if (step === 4 && ((selectedDriver || assignDriverLater) && (selectedVehicle || assignVehicleLater))) {
          e.preventDefault();
          nextStep();
          return;
        }
        if (step === 5 && isFormValid && !createMutation.isPending) {
          e.preventDefault();
          handleSubmit();
          return;
        }
      }

      // STEP 1 SHORTCUTS
      if (step === 1) {
        // Shift alone or Shift+S -> Open Search All Accounts
        if (e.key === 'Shift' || (e.shiftKey && e.key.toLowerCase() === 's')) {
          if (!isInputFocused()) {
            e.preventDefault();
            setIsSearchAccountsOpen(true);
            return;
          }
        }
        // 1, 2, 3, 4 -> Select Frequent Shipper 1..4
        if (!isInputFocused() && ['1', '2', '3', '4'].includes(e.key)) {
          const quickSelect = customers.slice(0, 4);
          const idx = parseInt(e.key, 10) - 1;
          if (quickSelect[idx]) {
            e.preventDefault();
            setCustomerId(quickSelect[idx].id);
            setError(null);
          }
          return;
        }
      }

      // STEP 2 SHORTCUTS
      if (step === 2) {
        // \ -> Pickup, Shift + \ -> Dropoff
        if (e.key === '\\') {
          e.preventDefault();
          if (e.shiftKey || pickupLocationId) {
            setFocusDropoffSearch(true);
            setTimeout(() => setFocusDropoffSearch(false), 300);
          } else {
            setFocusPickupSearch(true);
            setTimeout(() => setFocusPickupSearch(false), 300);
          }
          return;
        }
      }

      // STEP 3 SHORTCUTS
      if (step === 3) {
        if (!isInputFocused() && ['1', '2', '3', '4'].includes(e.key)) {
          e.preventDefault();
          if (e.key === '1') applyDropoffOffset(4);
          if (e.key === '2') applyDropoffOffset(8);
          if (e.key === '3') applyDropoffOffset(24);
          if (e.key === '4') applyDropoffOffset(0, true);
          return;
        }
      }

      // STEP 4 SHORTCUTS
      if (step === 4) {
        if (!isInputFocused()) {
          if (e.key.toLowerCase() === 'd') {
            e.preventDefault();
            const driverComboboxBtn = document.querySelector('[aria-haspopup="dialog"], [role="combobox"]') as HTMLButtonElement;
            driverComboboxBtn?.click();
            return;
          }
          if (e.key.toLowerCase() === 'l') {
            e.preventDefault();
            setAssignDriverLater(!assignDriverLater);
            setAssignVehicleLater(!assignVehicleLater);
            return;
          }
          if (['1', '2', '3', '4'].includes(e.key)) {
            const idx = parseInt(e.key, 10) - 1;
            if (driverOptions[idx]) {
              e.preventDefault();
              setDriverId(driverOptions[idx].value);
            }
            return;
          }
        }
      }

      // STEP 5 SHORTCUTS
      if (step === 5) {
        if (!isInputFocused() && ['1', '2', '3'].includes(e.key)) {
          const idx = parseInt(e.key, 10) - 1;
          if (availableRateCards[idx]) {
            e.preventDefault();
            setSelectedRateCardId(availableRateCards[idx].id);
            setBillingAmount(String(availableRateCards[idx].base_price));
            setIsPriceCustomized(false);
          }
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isOpen,
    isAddDriverOpen,
    isAddVehicleOpen,
    isShortcutsHelpOpen,
    step,
    customerId,
    customers,
    driverOptions,
    availableRateCards,
    isSearchAccountsOpen,
    assignDriverLater,
    assignVehicleLater,
    missingLocation,
    missingName,
    missingLane,
    missingSchedule,
    isScheduleInvalid,
    selectedDriver,
    selectedVehicle,
    isFormValid,
    createMutation.isPending,
    nextStep,
    prevStep,
    handleSubmit,
    onClose,
    applyDropoffOffset,
    pickupLocationId,
  ]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !createMutation.isPending && !open && onClose()}>
        <DialogContent className={cn(
          "transition-all duration-300 max-h-[88vh] h-[88vh] flex flex-col p-0 overflow-hidden rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl",
          step === 1 ? "max-w-2xl sm:max-w-3xl w-[90vw]" :
          step === 2 ? "max-w-4xl lg:max-w-5xl w-[92vw]" :
          step === 3 ? "max-w-4xl lg:max-w-5xl w-[92vw]" :
          step === 4 ? "max-w-3xl lg:max-w-4xl w-[92vw]" :
          "max-w-3xl lg:max-w-4xl w-[92vw]"
        )}>
          
          {/* Header */}
          <DialogHeader className="px-6 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                  Create New Trip
                </DialogTitle>
                <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800 font-semibold text-[11px] px-2 py-0.5">
                  Operations Module
                </Badge>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsShortcutsHelpOpen(true)}
                  className="h-8 text-xs gap-1.5 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Keyboard Shortcuts Cheat Sheet (Press ?)"
                >
                  <Keyboard className="w-3.5 h-3.5 text-[#E8450F]" />
                  <span>Shortcuts</span>
                  <span className="font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.2 rounded text-[10px] text-slate-500">?</span>
                </Button>

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
            </div>

            {/* Step Selector Tabs (5 Steps) */}
            <div className="grid grid-cols-5 gap-1.5 sm:gap-2 mt-3 pt-0.5">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={cn(
                  'flex items-center gap-1.5 p-2 rounded-xl text-left border transition-all text-xs font-semibold cursor-pointer',
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
                  'flex items-center gap-1.5 p-2 rounded-xl text-left border transition-all text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                  step === 2
                    ? 'border-[#E8450F] bg-orange-50/50 dark:bg-orange-950/20 text-[#E8450F]'
                    : !missingLocation && !missingName
                    ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500'
                )}
              >
                <Navigation className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">2. Route Stops</span>
                {!missingLocation && !missingName && (
                  <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-emerald-600 shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (customerId && !missingLocation && !missingName) {
                    setStep(3);
                  }
                }}
                disabled={!customerId || missingLocation || missingName}
                className={cn(
                  'flex items-center gap-1.5 p-2 rounded-xl text-left border transition-all text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                  step === 3
                    ? 'border-[#E8450F] bg-orange-50/50 dark:bg-orange-950/20 text-[#E8450F]'
                    : !missingSchedule && !isScheduleInvalid
                    ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500'
                )}
              >
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">3. Schedule &amp; SLA</span>
                {!missingSchedule && !isScheduleInvalid && (
                  <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-emerald-600 shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (customerId && !missingLocation && !missingName && !missingSchedule && !isScheduleInvalid) {
                    setStep(4);
                  }
                }}
                disabled={!customerId || missingLocation || missingName || missingSchedule || isScheduleInvalid}
                className={cn(
                  'flex items-center gap-1.5 p-2 rounded-xl text-left border transition-all text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                  step === 4
                    ? 'border-[#E8450F] bg-orange-50/50 dark:bg-orange-950/20 text-[#E8450F]'
                    : (selectedDriver || assignDriverLater) && (selectedVehicle || assignVehicleLater)
                    ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500'
                )}
              >
                <Truck className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">4. Assignments</span>
                {((selectedDriver || assignDriverLater) && (selectedVehicle || assignVehicleLater)) && (
                  <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-emerald-600 shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (customerId && (selectedDriver || assignDriverLater) && (selectedVehicle || assignVehicleLater) && !missingLocation && !missingName && !missingSchedule && !isScheduleInvalid) {
                    setStep(5);
                  }
                }}
                disabled={!isFormValid}
                className={cn(
                  'flex items-center gap-1.5 p-2 rounded-xl text-left border transition-all text-xs font-semibold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
                  step === 5
                    ? 'border-[#E8450F] bg-orange-50/50 dark:bg-orange-950/20 text-[#E8450F]'
                    : isFormValid && billingAmount
                    ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500'
                )}
              >
                <Receipt className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">5. Billing</span>
                {isFormValid && billingAmount && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-emerald-600 shrink-0" />}
              </button>
            </div>
          </DialogHeader>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 pt-3.5 pb-5 space-y-4">
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
                openSearch={isSearchAccountsOpen}
                onOpenSearchChange={setIsSearchAccountsOpen}
              />
            )}

            {step === 2 && (
              <TripStepRouteStops
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
                focusPickupSearch={focusPickupSearch}
                focusDropoffSearch={focusDropoffSearch}
              />
            )}

            {step === 3 && (
              <TripStepSchedule
                pickupLocationName={pickupLocationName || pickupName}
                dropoffLocationName={dropoffLocationName || dropoffName}
                pickupTime={pickupTime}
                dropoffTime={dropoffTime}
                onPickupTimeChange={(t) => { setPickupTime(t); setError(null); }}
                onDropoffTimeChange={(t) => { setDropoffTime(t); setError(null); }}
                onApplyDropoffOffset={applyDropoffOffset}
                transitInfo={transitInfo}
              />
            )}

            {step === 4 && (
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
                vehicleType={vehicleType}
                rateCategory={rateCategory}
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
                onVehicleTypeChange={setVehicleType}
                onRateCategoryChange={setRateCategory}
                onOpenAddDriver={() => setIsAddDriverOpen(true)}
                onOpenAddVehicle={() => setIsAddVehicleOpen(true)}
              />
            )}

            {step === 5 && (
              <TripStepRatesBilling
                pickupLocationName={pickupLocationName || pickupName}
                dropoffLocationName={dropoffLocationName || dropoffName}
                isLookingUpRate={isLookingUpRate}
                availableRateCards={availableRateCards}
                selectedRateCardId={selectedRateCardId}
                matchedRateCard={matchedRateCard}
                rateSource={rateSource}
                laneHasNoRate={laneHasNoRate}
                saveRateAs={saveRateAs}
                selectedCustomer={selectedCustomer}
                rateSaveWarning={rateSaveWarning}
                billingAmount={billingAmount}
                onSelectRateCard={(card) => {
                  if (card) {
                    setSelectedRateCardId(card.id);
                    setBillingAmount(String(card.base_price));
                    setIsPriceCustomized(false);
                  } else {
                    setSelectedRateCardId('');
                    setIsPriceCustomized(true);
                  }
                }}
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

            <div className="flex flex-wrap items-center gap-2">
              {step < 5 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={nextStep}
                  className="h-9 gap-1.5 text-xs font-extrabold bg-[#E8450F] hover:bg-[#C7380A] text-white shadow-sm px-5"
                  title="Keyboard Shortcut: Enter or Alt + RightArrow"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-4 h-4" />
                  <span className="ml-1 text-[10px] font-mono bg-black/20 text-white/90 px-1.5 py-0.2 rounded">↵</span>
                </Button>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleSubmit(false)}
                    disabled={createMutation.isPending || !isFormValid}
                    className="h-9 gap-1.5 text-xs font-extrabold bg-[#E8450F] hover:bg-[#C7380A] text-white shadow-sm px-5 disabled:opacity-50"
                    title="Keyboard Shortcut: Ctrl + Enter"
                  >
                    {createMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Scheduling...
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4" />
                        <span>Schedule Trip</span>
                        <span className="ml-1 text-[10px] font-mono bg-black/20 text-white/90 px-1.5 py-0.2 rounded">Ctrl+↵</span>
                      </>
                    )}
                  </Button>

                  {!assignDriverLater && driverId && !assignVehicleLater && vehicleId && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => handleSubmit(true)}
                      disabled={createMutation.isPending || !isFormValid}
                      className="h-9 gap-1.5 text-xs font-extrabold border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 shadow-sm px-4 disabled:opacity-50"
                      title="Dispatch Trip Immediately to Driver"
                    >
                      <Zap className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Dispatch Immediately</span>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Keyboard Shortcuts Cheat Sheet Dialog */}
      <Dialog open={isShortcutsHelpOpen} onOpenChange={setIsShortcutsHelpOpen}>
        <DialogContent className="max-w-md rounded-2xl p-5 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-[#E8450F]" />
              New Trip Keyboard Shortcuts
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="space-y-1.5">
              <h4 className="font-bold text-[#E8450F] uppercase tracking-wider text-[10px]">Step 1 — Customer</h4>
              <div className="grid grid-cols-2 gap-1 text-slate-600 dark:text-slate-300">
                <div><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold border">Shift</kbd> Search Accounts</div>
                <div><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold border">1 - 4</kbd> Frequent Shippers</div>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-[#E8450F] uppercase tracking-wider text-[10px]">Step 2 — Route Stops</h4>
              <div className="grid grid-cols-2 gap-1 text-slate-600 dark:text-slate-300">
                <div><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold border">\</kbd> Pickup Location</div>
                <div><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold border">Shift + \</kbd> Dropoff Location</div>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-[#E8450F] uppercase tracking-wider text-[10px]">Step 3 — Schedule</h4>
              <div className="grid grid-cols-2 gap-1 text-slate-600 dark:text-slate-300">
                <div><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold border">1 / 2</kbd> +4h / +8h Offset</div>
                <div><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold border">3 / 4</kbd> +24h / EOD Target</div>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-[#E8450F] uppercase tracking-wider text-[10px]">Step 4 — Assignments</h4>
              <div className="grid grid-cols-2 gap-1 text-slate-600 dark:text-slate-300">
                <div><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold border">D</kbd> Select Driver</div>
                <div><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold border">L</kbd> Defer Assignment</div>
              </div>
            </div>

            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-[#E8450F] uppercase tracking-wider text-[10px]">Step 5 &amp; Navigation</h4>
              <div className="grid grid-cols-2 gap-1 text-slate-600 dark:text-slate-300">
                <div><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold border">Alt + T</kbd> Open Modal</div>
                <div><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold border">Enter</kbd> Next / Schedule</div>
                <div><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold border">Alt + 1..5</kbd> Jump Tab</div>
                <div><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold border">Esc</kbd> Close Dialog</div>
              </div>
            </div>
          </div>
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

