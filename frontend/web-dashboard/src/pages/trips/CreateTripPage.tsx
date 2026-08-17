import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  User,
  Navigation,
  Truck,
  Receipt,
  ShieldCheck,
  Keyboard,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import TripStepCustomer from '@/components/trips/TripStepCustomer';
import TripStepRouteTiming from '@/components/trips/TripStepRouteTiming';
import TripStepAssignments from '@/components/trips/TripStepAssignments';
import TripStepRatesBilling from '@/components/trips/TripStepRatesBilling';
import TripStepReview from '@/components/trips/TripStepReview';
import TripStepSummarySidebar from '@/components/trips/TripStepSummarySidebar';
import CreateDriverModal from '@/components/trips/CreateDriverModal';
import CreateVehicleModal from '@/components/trips/CreateVehicleModal';
import CreateThirdPartyModal from '@/components/third-party/CreateThirdPartyModal';

import { tripService, CreateTripPayload } from '@/services/tripService';
import { customerService } from '@/services/customerService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { thirdPartyService, ThirdPartyProvider } from '@/services/thirdPartyService';
import { rateCardService } from '@/services/rateCardService';
import { locationService } from '@/services/locationService';
import { isScheduledOnDate } from '@/utils/scheduleUtils';
import { useEstimatedDelivery } from '@/hooks/useEstimatedDelivery';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { authStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

type Step = 1 | 2;

const STEP_META: { step: Step; label: string; icon: typeof User }[] = [
  { step: 1, label: 'Trip Details', icon: User },
  { step: 2, label: 'Review & Confirm', icon: ShieldCheck },
];

export default function CreateTripPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  // Step lives in the URL so back/forward and step links behave predictably.
  const step: Step = (() => {
    const raw = Number(searchParams.get('step'));
    return raw >= 1 && raw <= 2 ? (raw as Step) : 1;
  })();
  const setStep = useCallback((next: Step) => {
    const params = new URLSearchParams(searchParams);
    params.set('step', String(next));
    setSearchParams(params, { replace: false });
  }, [searchParams, setSearchParams]);

  // Sub-Section state for Step 1 Detail Panels
  type SubSection = 'customer' | 'route' | 'assignments' | 'pricing';
  const [activeSubSection, setActiveSubSection] = useState<SubSection>('customer');

  // Seeded from the page that linked here (customer/driver/third-party detail pages).
  const initialCustomerId = searchParams.get('customerId') || '';
  const initialDriverId = searchParams.get('driverId') || '';
  const defaultIsThirdParty = searchParams.get('thirdParty') === '1';
  const defaultThirdPartyProviderId = searchParams.get('providerId') || '';

  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [driverId, setDriverId] = useState(initialDriverId);
  const [vehicleId, setVehicleId] = useState('');
  const [assignDriverLater, setAssignDriverLater] = useState(false);
  const [assignVehicleLater, setAssignVehicleLater] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);

  // Third-Party Rental Carrier State
  const [isThirdParty, setIsThirdParty] = useState(defaultIsThirdParty);
  const [thirdPartyProviderId, setThirdPartyProviderId] = useState(defaultThirdPartyProviderId);
  const [thirdPartyDriverName, setThirdPartyDriverName] = useState('');
  const [thirdPartyDriverPhone, setThirdPartyDriverPhone] = useState('');
  const [thirdPartyVehiclePlate, setThirdPartyVehiclePlate] = useState('');
  const [thirdPartyCost, setThirdPartyCost] = useState<number | ''>('');
  const [isAddThirdPartyOpen, setIsAddThirdPartyOpen] = useState(false);

  // Shortcut triggers
  const [isSearchAccountsOpen, setIsSearchAccountsOpen] = useState(false);
  const [focusPickupSearch, setFocusPickupSearch] = useState(false);
  const [focusDropoffSearch, setFocusDropoffSearch] = useState(false);
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);

  // Stop Details. `pickupTime` is the Truck Arrival Time — the only time the
  // dispatcher types. Dropoff has no time field: Estimated Delivery is
  // calculated from Truck Arrival Time + the Google Maps route below.
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
  const [dropoffName, setDropoffName] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');

  // Pricing
  const [billingAmount, setBillingAmount] = useState<string>('');
  const [isPriceCustomized, setIsPriceCustomized] = useState(false);
  const [saveRateAs, setSaveRateAs] = useState<'customer' | 'none'>('customer');
  const [rateSaveWarning, setRateSaveWarning] = useState<string | null>(null);
  const [vehicleType, setVehicleType] = useState('');
  const [rateCategory, setRateCategory] = useState('');

  // Estimated Delivery — calculated, never typed. Recomputes whenever the
  // route or truck arrival time changes.
  const estimatedDelivery = useEstimatedDelivery(pickupLat, pickupLng, dropoffLat, dropoffLng, pickupTime);
  const dropoffTime = estimatedDelivery.status === 'ready' ? estimatedDelivery.estimatedDeliveryLocal : '';

  // Queries
  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 100 }),
  });
  const { data: driversRes } = useQuery({
    queryKey: ['drivers-select'],
    queryFn: () => driverService.getAll({ per_page: 100, status: 'Available' }),
  });
  const { data: vehiclesRes } = useQuery({
    queryKey: ['vehicles-select'],
    queryFn: () => vehicleService.getAll({ per_page: 100, status: 'Available' }),
  });
  const { data: locationsRes } = useQuery({
    queryKey: ['locations'],
    queryFn: () => locationService.getAll({ active_only: true }),
  });
  const { data: thirdPartyProvidersRes } = useQuery({
    queryKey: ['third-party-providers'],
    queryFn: () => thirdPartyService.getAll({ is_active: true, per_page: 200 }),
  });

  const customers = customersRes?.data || [];
  const drivers = driversRes?.data || [];
  const vehicles = vehiclesRes?.data || [];
  const locations = locationsRes?.data || [];
  const thirdPartyProviders: ThirdPartyProvider[] = thirdPartyProvidersRes?.data?.data || [];

  const rankedCustomers = useMemo(
    () => [...customers].sort((a, b) => (b._count?.trips ?? 0) - (a._count?.trips ?? 0)),
    [customers]
  );

  const thirdPartyProviderOptions = useMemo(
    () => thirdPartyProviders.map((p) => ({ value: p.id, label: p.name })),
    [thirdPartyProviders]
  );

  const selectedCustomer = useMemo(() => customers.find((c) => c.id === customerId) || null, [customers, customerId]);
  const selectedDriver = useMemo(() => drivers.find((d) => d.id === driverId) || null, [drivers, driverId]);
  const selectedVehicle = useMemo(() => vehicles.find((v) => v.id === vehicleId) || null, [vehicles, vehicleId]);
  const selectedThirdPartyProvider = useMemo(
    () => thirdPartyProviders.find((p) => p.id === thirdPartyProviderId) || null,
    [thirdPartyProviders, thirdPartyProviderId]
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

  // Rate card lookup for the lane
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
    enabled: laneReady,
  });

  const availableRateCards = availableRateCardsRes || [];
  const matchedRateCard = availableRateCards.find((rc) => rc.id === selectedRateCardId) ?? null;
  const rateSource = matchedRateCard ? ('customer' as const) : null;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableRateCards, customerId]);

  const adjustPrice = (amount: number) => {
    const current = parseFloat(billingAmount || '0') || 0;
    const updated = Math.max(0, current + amount);
    setBillingAmount(String(updated));
    setIsPriceCustomized(true);
  };

  // Mutation — locations are saved if new, a rate card is optionally saved
  // for the lane, then the trip is created as Draft.
  const createMutation = useMutation({
    mutationFn: async (payload: CreateTripPayload) => {
      let finalPickupLocId = pickupLocationId;
      let finalDropoffLocId = dropoffLocationId;

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

      if (payload.stops && payload.stops.length >= 2) {
        if (finalPickupLocId) payload.stops[0].location_id = finalPickupLocId;
        if (finalDropoffLocId) payload.stops[1].location_id = finalDropoffLocId;
      }

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
    onSuccess: async () => {
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
      navigate('/trips');
    },
    onError: (err: any) => {
      const apiError = err.response?.data?.error;
      // Zod validation failures come back as a generic "Invalid request data"
      // plus a `details` array naming the actual offending field(s) — surface
      // those instead of the useless generic message.
      const firstIssue = apiError?.details?.[0];
      const detail = firstIssue ? `${firstIssue.path ? `${firstIssue.path}: ` : ''}${firstIssue.message}` : undefined;
      setError(detail || apiError?.message || err.message || 'Could not create the trip.');
    },
  });

  const handleReset = () => {
    setSearchParams({}, { replace: true });
    setCustomerId('');
    setDriverId('');
    setVehicleId('');
    setAssignDriverLater(false);
    setAssignVehicleLater(false);
    setIsThirdParty(false);
    setThirdPartyProviderId('');
    setThirdPartyDriverName('');
    setThirdPartyDriverPhone('');
    setThirdPartyVehiclePlate('');
    setThirdPartyCost('');
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
    setDropoffName('');
    setDropoffAddress('');
    setBillingAmount('');
    setIsPriceCustomized(false);
    setSaveRateAs('customer');
    setRateSaveWarning(null);
    setSelectedRateCardId('');
    setVehicleType('');
    setRateCategory('');
    setError(null);
  };

  // Completion state per step — governs the workflow nav (which steps are
  // clickable) and the bottom action bar (Next Step / Create Trip).
  const missingLocation = pickupLat == null || pickupLng == null || dropoffLat == null || dropoffLng == null;
  const missingName = pickupName.trim() === '' || dropoffName.trim() === '';
  const missingArrival = pickupTime === '';

  const step1Complete = customerId !== '';
  const step2Complete = step1Complete && !missingLocation && !missingName && !missingArrival;
  const step3Complete =
    step2Complete &&
    (isThirdParty
      ? !!thirdPartyProviderId && !!thirdPartyVehiclePlate.trim()
      : (assignDriverLater || driverId !== '') && (assignVehicleLater || vehicleId !== ''));
  const step4Complete = step3Complete && !!billingAmount && !isNaN(parseFloat(billingAmount));
  const isFormValid = step4Complete;

  const highestUnlockedStep: Step = step4Complete ? 2 : 1;

  const goToSubSection = useCallback((section: SubSection) => {
    setError(null);
    setStep(1);
    setActiveSubSection(section);
  }, [setStep]);

  const validateSubSection = useCallback((section: SubSection): boolean => {
    setError(null);
    if (section === 'customer') {
      if (!customerId) {
        setError('Please select a customer before proceeding.');
        return false;
      }
    }
    if (section === 'route') {
      if (!customerId) {
        setError('Please select a customer first.');
        return false;
      }
      if (missingLocation) {
        setError('Please select both pickup and dropoff locations.');
        return false;
      }
      if (missingName) {
        setError('Name both locations — reports group trips by these names.');
        return false;
      }
      if (missingArrival) {
        setError('Set the Truck Arrival Time.');
        return false;
      }
    }
    if (section === 'assignments') {
      if (missingLocation || missingName || missingArrival) {
        setError('Please complete the Route & Timing details first.');
        return false;
      }
      if (isThirdParty) {
        if (!thirdPartyProviderId) {
          setError('Please select a third-party rental provider.');
          return false;
        }
        if (!thirdPartyVehiclePlate.trim()) {
          setError('Please enter the third-party rented vehicle plate number.');
          return false;
        }
      } else {
        if (!assignDriverLater && !driverId) {
          setError('Please assign a driver, or check "Assign driver later".');
          return false;
        }
        if (!assignVehicleLater && !vehicleId) {
          setError('Please assign a vehicle, or check "Assign vehicle later".');
          return false;
        }
        if (driverId && selectedDriver && pickupTime && isScheduledOnDate(selectedDriver.trips, pickupTime)) {
          setError(`Driver ${selectedDriver.first_name} ${selectedDriver.last_name} is already assigned to a trip on this date.`);
          return false;
        }
        if (vehicleId && selectedVehicle && pickupTime && isScheduledOnDate(selectedVehicle.trips, pickupTime)) {
          setError(`Vehicle ${selectedVehicle.plate_number} is already assigned to a trip on this date.`);
          return false;
        }
      }
    }
    if (section === 'pricing') {
      if (!isThirdParty && !assignDriverLater && !driverId) {
        setError('Please complete assignments first.');
        return false;
      }
      if (!billingAmount || isNaN(parseFloat(billingAmount))) {
        setError('Enter a trip rate before continuing to review.');
        return false;
      }
    }
    return true;
  }, [
    customerId, missingLocation, missingName, missingArrival, isThirdParty,
    thirdPartyProviderId, thirdPartyVehiclePlate, assignDriverLater, driverId,
    assignVehicleLater, vehicleId, selectedDriver, selectedVehicle, pickupTime, billingAmount
  ]);

  const goToStep = (target: Step) => {
    if (target === 2 && !step4Complete) {
      setError('Please complete all fields first.');
      return;
    }
    setError(null);
    setStep(target);
  };

  const prevStep = useCallback(() => {
    setError(null);
    if (step === 2) {
      setStep(1);
      setActiveSubSection('pricing');
    } else {
      if (activeSubSection === 'pricing') {
        setActiveSubSection('assignments');
      } else if (activeSubSection === 'assignments') {
        setActiveSubSection('route');
      } else if (activeSubSection === 'route') {
        setActiveSubSection('customer');
      } else {
        navigate('/trips');
      }
    }
  }, [step, activeSubSection, setStep, navigate]);

  const handleSubmit = useCallback(() => {
    setError(null);

    if (missingLocation) {
      setError('Please select a pickup location and a dropoff location.');
      return;
    }
    if (missingName) {
      setError('Name both locations (e.g. "Khamis Sorting Center") — reports group trips by these names.');
      return;
    }
    if (!pickupTime) {
      setError('Set the Truck Arrival Time — without it this trip can never be measured for delays.');
      return;
    }

    const numericPrice = billingAmount && !isNaN(parseFloat(billingAmount)) ? parseFloat(billingAmount) : undefined;

    const payload: CreateTripPayload = {
      customer_id: customerId,
      driver_id: isThirdParty || assignDriverLater ? undefined : driverId,
      vehicle_id: isThirdParty || assignVehicleLater ? undefined : vehicleId,
      planned_start: pickupTime || undefined,
      billing_amount: numericPrice,
      trip_charges: numericPrice,
      status: 'Draft',
      is_third_party: isThirdParty,
      third_party_provider_id: isThirdParty ? (thirdPartyProviderId || undefined) : undefined,
      third_party_driver_name: isThirdParty ? (thirdPartyDriverName.trim() || undefined) : undefined,
      third_party_driver_phone: isThirdParty ? (thirdPartyDriverPhone.trim() || undefined) : undefined,
      third_party_vehicle_plate: isThirdParty ? (thirdPartyVehiclePlate.trim() || undefined) : undefined,
      third_party_vehicle_type: isThirdParty ? (vehicleType || undefined) : undefined,
      third_party_cost: isThirdParty && thirdPartyCost !== '' ? Number(thirdPartyCost) : undefined,
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
          // Calculated only — never typed. Omitted entirely if Google Maps
          // could not compute a route, rather than inventing a time.
          planned_arrival: dropoffTime || undefined,
          location_name: dropoffName.trim() || undefined,
          location_address: dropoffAddress.trim() || undefined,
          location_id: dropoffLocationId || undefined,
        },
      ],
    };

    createMutation.mutate(payload);
  }, [
    customerId, driverId, vehicleId, assignDriverLater, assignVehicleLater,
    isThirdParty, thirdPartyProviderId, thirdPartyDriverName, thirdPartyDriverPhone, thirdPartyVehiclePlate, thirdPartyCost, vehicleType,
    pickupLat, pickupLng, dropoffLat, dropoffLng, pickupLocationId, dropoffLocationId,
    pickupTime, dropoffTime, pickupName, dropoffName, pickupAddress, dropoffAddress,
    billingAmount, missingLocation, missingName, createMutation,
  ]);

  const nextStep = useCallback(() => {
    setError(null);
    if (step === 1) {
      if (!validateSubSection(activeSubSection)) return;

      if (activeSubSection === 'customer') {
        setActiveSubSection('route');
      } else if (activeSubSection === 'route') {
        setActiveSubSection('assignments');
      } else if (activeSubSection === 'assignments') {
        setActiveSubSection('pricing');
      } else if (activeSubSection === 'pricing') {
        if (step4Complete) {
          setStep(2);
        } else {
          setError('Please complete all details.');
        }
      }
    } else {
      handleSubmit();
    }
  }, [step, activeSubSection, validateSubSection, step4Complete, setStep, handleSubmit]);

  // Keyboard Shortcuts — same behaviour as the previous modal, adapted to 5
  // steps. Typing into a field always wins over a shortcut.
  useEffect(() => {
    if (isAddDriverOpen || isAddVehicleOpen || isAddThirdPartyOpen) return;

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
      if ((e.key === '?' && !isInputFocused()) || (e.ctrlKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsHelpOpen((prev) => !prev);
        return;
      }

      if (e.key === 'Escape') {
        if (isShortcutsHelpOpen) {
          e.preventDefault();
          setIsShortcutsHelpOpen(false);
        }
        return;
      }

      if (e.altKey && ['1', '2'].includes(e.key)) {
        e.preventDefault();
        const target = parseInt(e.key, 10) as Step;
        goToStep(target);
        return;
      }

      if (
        (e.altKey && (e.key === 'ArrowRight' || e.key.toLowerCase() === 'n')) ||
        ((e.ctrlKey || e.metaKey) && e.key === 'Enter')
      ) {
        e.preventDefault();
        if (step < 2) {
          nextStep();
        } else if (step === 2 && isFormValid && !createMutation.isPending) {
          handleSubmit();
        }
        return;
      }

      if (e.altKey && (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'b')) {
        e.preventDefault();
        prevStep();
        return;
      }

      if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.ctrlKey) {
        const activeEl = document.activeElement;
        const isInCommandItem = activeEl?.getAttribute('cmdk-item') !== null || activeEl?.closest('[cmdk-list]');
        if (isInCommandItem) return;

        if (step === 1) {
          if (activeSubSection === 'customer' && customerId && !isSearchAccountsOpen) {
            e.preventDefault();
            nextStep();
            return;
          }
          if (activeSubSection === 'route' && !missingLocation && !missingName && !missingArrival) {
            e.preventDefault();
            nextStep();
            return;
          }
          if (activeSubSection === 'assignments' && step3Complete) {
            e.preventDefault();
            nextStep();
            return;
          }
          if (activeSubSection === 'pricing' && step4Complete) {
            e.preventDefault();
            nextStep();
            return;
          }
        }
        if (step === 2 && isFormValid && !createMutation.isPending) {
          e.preventDefault();
          handleSubmit();
          return;
        }
      }

      if (step === 1) {
        if (activeSubSection === 'customer') {
          if (e.key === 'Shift' || (e.shiftKey && e.key.toLowerCase() === 's')) {
            if (!isInputFocused()) {
              e.preventDefault();
              setIsSearchAccountsOpen(true);
              return;
            }
          }
          if (!isInputFocused() && ['1', '2', '3', '4'].includes(e.key)) {
            const idx = parseInt(e.key, 10) - 1;
            if (rankedCustomers[idx]) {
              e.preventDefault();
              setCustomerId(rankedCustomers[idx].id);
              setError(null);
            }
            return;
          }
        }

        if (activeSubSection === 'route') {
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

        if (activeSubSection === 'assignments') {
          if (!isInputFocused()) {
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

        if (activeSubSection === 'pricing') {
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isAddDriverOpen, isAddVehicleOpen, isAddThirdPartyOpen, isShortcutsHelpOpen,
    step, activeSubSection, customerId, rankedCustomers, driverOptions, availableRateCards, isSearchAccountsOpen,
    assignDriverLater, assignVehicleLater, missingLocation, missingName, missingArrival,
    step3Complete, step4Complete, isFormValid, createMutation.isPending,
    nextStep, prevStep, handleSubmit, pickupLocationId, goToStep, goToSubSection,
  ]);

  const roleLabel = authStore.getUser()?.role === 'Admin' ? 'Admin Module' : 'Operator Module';

  return (
    <DashboardLayout active="Trips" title="Create New Trip" hideBackButton>
      <>
        <div className="px-4 sm:px-6 py-4 max-w-5xl mx-auto w-full animate-fade-in">
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-xs flex flex-col min-h-[460px] !overflow-visible">
          
          {/* Header section inside card */}
          <div className="shrink-0 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 px-6 py-4 flex flex-col gap-3 rounded-t-2xl">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/trips')}
                  className="h-8 text-xs gap-1.5 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Trips
                </Button>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <h1 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 truncate">Create New Trip</h1>
                <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800 font-semibold text-[11px] px-2 py-0.5 hidden sm:inline-flex">
                  {roleLabel}
                </Badge>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsShortcutsHelpOpen(true)}
                  className="h-8 text-xs gap-1.5 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Keyboard Shortcuts (Press ?)"
                >
                  <Keyboard className="w-3.5 h-3.5 text-brand" />
                  <span className="hidden sm:inline">Shortcuts</span>
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

            {/* Workflow steps indicators */}
            <div className="grid grid-cols-2 gap-3 max-w-md mx-auto w-full">
              {STEP_META.map(({ step: s, label, icon: Icon }) => {
                const complete = s === 1 ? step4Complete : isFormValid;
                const unlocked = s <= highestUnlockedStep;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => goToStep(s)}
                    disabled={!unlocked}
                    className={cn(
                      'flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-center border transition-all text-xs font-bold cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed',
                      step === s
                        ? 'border-brand bg-orange-50/50 dark:bg-orange-950/20 text-brand shadow-xs'
                        : complete
                        ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 bg-white dark:bg-slate-900'
                    )}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>0{s} {label}</span>
                    {complete && <CheckCircle2 className="w-4 h-4 ml-1 text-emerald-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Content body inside card */}
          <div className="flex-1 p-6 bg-slate-50/30 dark:bg-slate-900/10 !overflow-visible">
            {error && (
              <Alert variant="destructive" className="rounded-xl border-destructive/30 mb-4 shrink-0">
                <AlertCircle className="size-4" />
                <AlertTitle>Cannot proceed</AlertTitle>
                <AlertDescription className="text-xs">{error}</AlertDescription>
              </Alert>
            )}

            {/* If step is 1: show split layout with Left progress checklist and Right active details form. If step is 2: show full-width Review */}
            <div className={cn(step === 1 ? 'lg:flex lg:items-stretch lg:gap-6 flex-1 min-h-[460px]' : 'w-full max-w-3xl mx-auto')}>
              {step === 1 && (
                <>
                  {/* Left checklist progress pane */}
                  <div className="w-full lg:w-[260px] shrink-0 flex flex-col gap-3 pr-2 lg:border-r lg:border-slate-100 lg:dark:border-slate-800">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-0.5 mb-1">Wizard Progress</div>

                    {/* Sub-Section 1: Customer */}
                    <button
                      type="button"
                      onClick={() => setActiveSubSection('customer')}
                      className={cn(
                        'w-full text-left rounded-xl border p-3.5 transition-all cursor-pointer flex flex-col gap-1',
                        activeSubSection === 'customer'
                          ? 'border-brand bg-orange-50/50 dark:bg-orange-950/20 ring-2 ring-brand/10'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      )}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-100">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-brand" /> Customer
                        </span>
                        {step1Complete && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {selectedCustomer ? selectedCustomer.name : 'Not selected'}
                      </div>
                    </button>

                    {/* Sub-Section 2: Route & Timing */}
                    <button
                      type="button"
                      onClick={() => {
                        if (validateSubSection('customer')) {
                          setActiveSubSection('route');
                        }
                      }}
                      disabled={!step1Complete}
                      className={cn(
                        'w-full text-left rounded-xl border p-3.5 transition-all flex flex-col gap-1 disabled:opacity-50 disabled:cursor-not-allowed',
                        step1Complete ? 'cursor-pointer' : '',
                        activeSubSection === 'route'
                          ? 'border-brand bg-orange-50/50 dark:bg-orange-950/20 ring-2 ring-brand/10'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      )}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-100">
                        <span className="flex items-center gap-1.5">
                          <Navigation className="w-3.5 h-3.5 text-brand" /> Route & Timing
                        </span>
                        {step2Complete && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {step2Complete ? `${pickupName || pickupLocationName} → ${dropoffName || dropoffLocationName}` : 'Not set'}
                      </div>
                    </button>

                    {/* Sub-Section 3: Assignments */}
                    <button
                      type="button"
                      onClick={() => {
                        if (validateSubSection('customer') && validateSubSection('route')) {
                          setActiveSubSection('assignments');
                        }
                      }}
                      disabled={!step2Complete}
                      className={cn(
                        'w-full text-left rounded-xl border p-3.5 transition-all flex flex-col gap-1 disabled:opacity-50 disabled:cursor-not-allowed',
                        step2Complete ? 'cursor-pointer' : '',
                        activeSubSection === 'assignments'
                          ? 'border-brand bg-orange-50/50 dark:bg-orange-950/20 ring-2 ring-brand/10'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      )}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-100">
                        <span className="flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-brand" /> Assignments
                        </span>
                        {step3Complete && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {step3Complete ? (isThirdParty ? 'Third-Party Assigned' : 'Own Fleet Assigned') : 'Not set'}
                      </div>
                    </button>

                    {/* Sub-Section 4: Pricing */}
                    <button
                      type="button"
                      onClick={() => {
                        if (validateSubSection('customer') && validateSubSection('route') && validateSubSection('assignments')) {
                          setActiveSubSection('pricing');
                        }
                      }}
                      disabled={!step3Complete}
                      className={cn(
                        'w-full text-left rounded-xl border p-3.5 transition-all flex flex-col gap-1 disabled:opacity-50 disabled:cursor-not-allowed',
                        step3Complete ? 'cursor-pointer' : '',
                        activeSubSection === 'pricing'
                          ? 'border-brand bg-orange-50/50 dark:bg-orange-950/20 ring-2 ring-brand/10'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      )}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-100">
                        <span className="flex items-center gap-1.5">
                          <Receipt className="w-3.5 h-3.5 text-brand" /> Pricing
                        </span>
                        {step4Complete && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {step4Complete ? `SAR ${parseFloat(billingAmount).toLocaleString()}` : 'Not set'}
                      </div>
                    </button>
                  </div>

                  {/* Right active details panel workspace */}
                  <div className="flex-1 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 overflow-y-auto min-w-0 !overflow-visible">
                    {activeSubSection === 'customer' && (
                      <TripStepCustomer
                        customerId={customerId}
                        customers={customers}
                        selectedCustomer={selectedCustomer}
                        onSelectCustomer={(id) => {
                          setCustomerId(id);
                          setError(null);
                          // Auto-advance detail panel to next section
                          setTimeout(() => setActiveSubSection('route'), 300);
                        }}
                        openSearch={isSearchAccountsOpen}
                        onOpenSearchChange={setIsSearchAccountsOpen}
                      />
                    )}

                    {activeSubSection === 'route' && (
                      <TripStepRouteTiming
                        pickupLocationId={pickupLocationId}
                        pickupLocationName={pickupLocationName}
                        pickupLat={pickupLat}
                        pickupLng={pickupLng}
                        pickupName={pickupName}
                        pickupAddress={pickupAddress}
                        dropoffLocationId={dropoffLocationId}
                        dropoffLocationName={dropoffLocationName}
                        dropoffLat={dropoffLat}
                        dropoffLng={dropoffLng}
                        dropoffName={dropoffName}
                        dropoffAddress={dropoffAddress}
                        locations={locations}
                        onPickupLocationIdChange={(id) => { setPickupLocationId(id); setError(null); }}
                        onPickupLocationNameChange={setPickupLocationName}
                        onPickupCoordinatesChange={(la, ln) => { setPickupLat(la); setPickupLng(ln); setError(null); }}
                        onPickupNameChange={(n) => { setPickupName(n); setError(null); }}
                        onPickupAddressChange={setPickupAddress}
                        onDropoffLocationIdChange={(id) => { setDropoffLocationId(id); setError(null); }}
                        onDropoffLocationNameChange={setDropoffLocationName}
                        onDropoffCoordinatesChange={(la, ln) => { setDropoffLat(la); setDropoffLng(ln); setError(null); }}
                        onDropoffNameChange={(n) => { setDropoffName(n); setError(null); }}
                        onDropoffAddressChange={setDropoffAddress}
                        focusPickupSearch={focusPickupSearch}
                        focusDropoffSearch={focusDropoffSearch}
                        truckArrivalTime={pickupTime}
                        onTruckArrivalTimeChange={(t) => { setPickupTime(t); setError(null); }}
                        estimatedDelivery={estimatedDelivery}
                      />
                    )}

                    {activeSubSection === 'assignments' && (
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
                        isThirdParty={isThirdParty}
                        thirdPartyProviderId={thirdPartyProviderId}
                        thirdPartyProviderOptions={thirdPartyProviderOptions}
                        thirdPartyDriverName={thirdPartyDriverName}
                        thirdPartyDriverPhone={thirdPartyDriverPhone}
                        thirdPartyVehiclePlate={thirdPartyVehiclePlate}
                        thirdPartyCost={thirdPartyCost}
                        onToggleThirdParty={(val) => { setIsThirdParty(val); setError(null); }}
                        onSelectThirdPartyProvider={(id) => { setThirdPartyProviderId(id); setError(null); }}
                        onChangeThirdPartyDriverName={setThirdPartyDriverName}
                        onChangeThirdPartyDriverPhone={setThirdPartyDriverPhone}
                        onChangeThirdPartyVehiclePlate={(plate) => { setThirdPartyVehiclePlate(plate); setError(null); }}
                        onChangeThirdPartyCost={setThirdPartyCost}
                        onOpenAddThirdPartyProvider={() => setIsAddThirdPartyOpen(true)}
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

                    {activeSubSection === 'pricing' && (
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
                        onBillingAmountChange={(val) => { setBillingAmount(val); setIsPriceCustomized(true); setError(null); }}
                        onAdjustPrice={adjustPrice}
                      />
                    )}
                  </div>
                </>
              )}

              {step === 2 && (
                <TripStepReview
                  selectedCustomer={selectedCustomer}
                  pickupName={pickupName || pickupLocationName}
                  dropoffName={dropoffName || dropoffLocationName}
                  truckArrivalTime={pickupTime}
                  estimatedDelivery={estimatedDelivery}
                  isThirdParty={isThirdParty}
                  selectedDriver={selectedDriver}
                  selectedVehicle={selectedVehicle}
                  assignDriverLater={assignDriverLater}
                  assignVehicleLater={assignVehicleLater}
                  thirdPartyProviderName={selectedThirdPartyProvider?.name || ''}
                  thirdPartyDriverName={thirdPartyDriverName}
                  thirdPartyVehiclePlate={thirdPartyVehiclePlate}
                  billingAmount={billingAmount}
                  matchedRateCard={matchedRateCard}
                  onEditStep={(s) => {
                    const secMap: Record<number, SubSection> = {
                      1: 'customer',
                      2: 'route',
                      3: 'assignments',
                      4: 'pricing'
                    };
                    goToSubSection(secMap[s] || 'customer');
                  }}
                />
              )}
            </div>
          </div>

          {/* Action buttons inside Card footer */}
          <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-955 px-6 py-4 flex items-center justify-between gap-3 rounded-b-2xl">
            <Button
              type="button"
              variant={step > 1 ? 'outline' : 'ghost'}
              size="sm"
              onClick={prevStep}
              className="h-9 gap-1 text-xs font-bold"
              title="Keyboard Shortcut: Alt + LeftArrow or Alt + B"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{step > 1 ? 'Back' : 'Cancel'}</span>
            </Button>

            <div className="flex flex-wrap items-center gap-2">
              {step < 2 ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={nextStep}
                  className="h-9 gap-1.5 text-xs font-extrabold bg-brand hover:bg-brand-hover text-white shadow-sm px-5"
                  title="Keyboard Shortcut: Enter or Alt + RightArrow"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-4 h-4" />
                  <span className="ml-1 text-[10px] font-mono bg-black/20 text-white/90 px-1.5 py-0.2 rounded">↵</span>
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleSubmit()}
                  disabled={createMutation.isPending || !isFormValid}
                  className="h-9 gap-1.5 text-xs font-extrabold bg-brand hover:bg-brand-hover text-white shadow-sm px-5 disabled:opacity-50"
                  title="Keyboard Shortcut: Ctrl + Enter"
                >
                  {createMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Create Trip</span>
                      <span className="ml-1 text-[10px] font-mono bg-black/20 text-white/90 px-1.5 py-0.2 rounded">Ctrl+↵</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Keyboard Shortcuts Help — compact, organized by section */}
      <Dialog open={isShortcutsHelpOpen} onOpenChange={setIsShortcutsHelpOpen}>
        <DialogContent className="max-w-md rounded-2xl p-5 space-y-4">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold flex items-center gap-2">
              <Keyboard className="w-5 h-5 text-brand" />
              Create Trip Keyboard Shortcuts
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div className="space-y-1.5">
              <h4 className="font-bold text-brand uppercase tracking-wider text-[10px]">Navigation</h4>
              <div className="grid grid-cols-2 gap-1 text-slate-600 dark:text-slate-300">
                <div><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold border">Alt+1-5</kbd> Jump to step</div>
                <div><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold border">Alt+←/→</kbd> Prev / Next</div>
                <div><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold border">Enter</kbd> Continue</div>
                <div><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold border">Ctrl+Enter</kbd> Submit / Next</div>
              </div>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-brand uppercase tracking-wider text-[10px]">Customer</h4>
              <div className="grid grid-cols-2 gap-1 text-slate-600 dark:text-slate-300">
                <div><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold border">Shift</kbd> Search accounts</div>
                <div><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold border">1-4</kbd> Frequent shippers</div>
              </div>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-brand uppercase tracking-wider text-[10px]">Route</h4>
              <div className="grid grid-cols-2 gap-1 text-slate-600 dark:text-slate-300">
                <div><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold border">\</kbd> Pickup location</div>
                <div><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold border">Shift+\</kbd> Dropoff location</div>
              </div>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-brand uppercase tracking-wider text-[10px]">Assignments</h4>
              <div className="grid grid-cols-2 gap-1 text-slate-600 dark:text-slate-300">
                <div><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold border">1-4</kbd> Quick-select driver</div>
                <div><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold border">L</kbd> Assign later</div>
              </div>
            </div>
            <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="font-bold text-brand uppercase tracking-wider text-[10px]">Pricing &amp; Review</h4>
              <div className="grid grid-cols-2 gap-1 text-slate-600 dark:text-slate-300">
                <div><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold border">1-3</kbd> Select rate card</div>
                <div><kbd className="font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-bold border">Esc</kbd> Close this dialog</div>
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
      <CreateThirdPartyModal
        isOpen={isAddThirdPartyOpen}
        onClose={() => setIsAddThirdPartyOpen(false)}
        onSuccess={(provider) => { setThirdPartyProviderId(provider.id); setError(null); }}
      />
      </>
    </DashboardLayout>
  );
}
