import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  RotateCcw,
  Plus,
  CheckCircle2,
  Navigation,
  ChevronRight,
  ChevronLeft,
  User,
  Truck,
  AlertCircle,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Receipt,
  Tag,
  DollarSign,
  Clock,
  Zap,
} from 'lucide-react';
import { parseISO, isValid, differenceInMinutes, addHours, setHours, setMinutes, format } from 'date-fns';

import DashboardLayout from '@/components/layout/DashboardLayout';
import TripStopCard from '@/components/trips/TripStopCard';
import CreateDriverModal from '@/components/trips/CreateDriverModal';
import CreateVehicleModal from '@/components/trips/CreateVehicleModal';
import { tripService, CreateTripPayload } from '@/services/tripService';
import { customerService } from '@/services/customerService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { rateCardService } from '@/services/rateCardService';
import { locationService } from '@/services/locationService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Checkbox } from '@/components/ui/checkbox';
import Btn from '@/components/ui/Btn';
import { cn } from '@/lib/utils';

function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
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

/**
 * `YYYY-MM-DDTHH:mm` in the dispatcher's own timezone, which is the format both
 * schedule fields hold. Built by hand rather than with `toISOString()`, which
 * would shift the time to UTC.
 */
function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function CreateTripPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Step lives in the URL (?step=) so browser/hardware back moves through the
  // wizard one step at a time, and only exits the page once you're on step 1.
  const [searchParams, setSearchParams] = useSearchParams();
  const step: 1 | 2 | 3 = (() => {
    const raw = Number(searchParams.get('step'));
    return raw === 2 || raw === 3 ? raw : 1;
  })();

  const [customerId, setCustomerId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [assignDriverLater, setAssignDriverLater] = useState(false);
  const [assignVehicleLater, setAssignVehicleLater] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);

  // Stops. Each has two parts: the LANE ENDPOINT (a Location — "Riyadh"), which
  // is what the rate card is priced against, and the exact spot within it
  // (name + coordinates — "Khamis Sorting Center"), which is what the driver
  // navigates to. Conflating the two is why pricing never matched before.
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

  // Pricing & Rate Card
  const [billingAmount, setBillingAmount] = useState<string>('');
  const [isPriceCustomized, setIsPriceCustomized] = useState(false);
  // What to do with a price typed for a lane nobody has priced yet.
  const [saveRateAs, setSaveRateAs] = useState<'standard' | 'customer' | 'none'>('standard');

  // Fetch Customers, Drivers, Vehicles, and Locations
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

  const customers = customersRes?.data || [];
  const drivers = driversRes?.data || [];
  const vehicles = vehiclesRes?.data || [];
  const locations = locationsRes?.data || [];

  const selectedPickupLocation = useMemo(
    () => locations.find((l) => l.id === pickupLocationId) || null,
    [locations, pickupLocationId]
  );

  const selectedDropoffLocation = useMemo(
    () => locations.find((l) => l.id === dropoffLocationId) || null,
    [locations, dropoffLocationId]
  );

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
      calculateHaversineDistanceKm(
        pickupLat,
        pickupLng,
        selectedPickupLocation.lat,
        selectedPickupLocation.lng
      )
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
      calculateHaversineDistanceKm(
        dropoffLat,
        dropoffLng,
        selectedDropoffLocation.lat,
        selectedDropoffLocation.lng
      )
    );
  }, [dropoffLat, dropoffLng, selectedDropoffLocation]);

  const driverOptions = drivers.map((d) => ({
    value: d.id,
    label: `${d.first_name} ${d.last_name}`,
    keywords: `${d.first_name} ${d.last_name}`,
  }));

  const vehicleOptions = vehicles.map((v) => ({
    value: v.id,
    label: `${v.plate_number} (${v.asset_type} • ${v.capacity_kg.toLocaleString()} kg)`,
    keywords: `${v.plate_number} ${v.asset_type}`,
  }));

  const selectedCustomer = customers.find(c => c.id === customerId);
  const selectedDriver = drivers.find(d => d.id === driverId);
  const selectedVehicle = vehicles.find(v => v.id === vehicleId);
  const vehicleAutoAssigned = !!selectedDriver?.assignedVehicleId && selectedDriver.assignedVehicleId === vehicleId;

  // Auto-fill the driver's assigned vehicle when a driver is picked
  useEffect(() => {
    if (selectedDriver?.assignedVehicleId && vehicles.some(v => v.id === selectedDriver.assignedVehicleId)) {
      setVehicleId(selectedDriver.assignedVehicleId);
    }
  }, [selectedDriver, vehicles]);

  // Auto-populate locations when customer changes
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

  // What this lane costs this customer. Asked of the server, which applies the
  // one rule (customer's rate for the lane → standard rate for the lane →
  // nothing) that invoicing uses too.
  //
  // This replaces a client-side guess that matched rate cards by substring
  // against the stop's free-text name — "Khamis Sorting Center" never contains
  // "Riyadh", so it fell through to "any card for this customer" and finally to
  // whichever card happened to be first in the list. The price shown was
  // frequently not the price for this route.
  const laneReady = !!pickupLocationId && !!dropoffLocationId && pickupLocationId !== dropoffLocationId;

  const { data: rateLookup, isFetching: isLookingUpRate } = useQuery({
    queryKey: ['rate-card-lookup', customerId, pickupLocationId, dropoffLocationId],
    queryFn: () =>
      rateCardService.lookup({
        customer_id: customerId,
        origin_location_id: pickupLocationId,
        destination_location_id: dropoffLocationId,
      }),
    enabled: !!customerId && laneReady,
  });

  const matchedRateCard = rateLookup?.rate_card ?? null;
  const rateSource = rateLookup?.source ?? null;
  const laneHasNoRate = !!customerId && laneReady && !isLookingUpRate && !matchedRateCard;

  // Auto-fill the price from the matched rate, unless the dispatcher has typed
  // their own for this trip.
  useEffect(() => {
    if (matchedRateCard && !isPriceCustomized) {
      setBillingAmount(String(matchedRateCard.base_price));
    }
  }, [matchedRateCard, isPriceCustomized]);

  // Transit Duration & SLA Buffer Calculation
  const transitInfo = useMemo(() => {
    if (!pickupTime || !dropoffTime) return null;
    const pDate = parseISO(pickupTime);
    const dDate = parseISO(dropoffTime);
    if (!isValid(pDate) || !isValid(dDate)) return null;

    const totalMinutes = differenceInMinutes(dDate, pDate);
    const isInvalid = totalMinutes <= 0;
    const isTight = totalMinutes > 0 && totalMinutes < 120; // less than 2 hours
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

    return {
      totalMinutes,
      durationString,
      isInvalid,
      isTight,
      isOptimal,
      pDate,
      dDate,
    };
  }, [pickupTime, dropoffTime]);

  // Quick Dropoff Time Offset Presets (Calculated from Pickup Time)
  const applyDropoffOffset = (hoursOffset: number, setEod: boolean = false) => {
    const base = pickupTime && isValid(parseISO(pickupTime)) ? parseISO(pickupTime) : new Date();
    const target = setEod ? setMinutes(setHours(base, 23), 59) : addHours(base, hoursOffset);
    setDropoffTime(toLocalInput(target));
    setError(null);
  };

  // Quick Price Adjustments
  const adjustPrice = (amount: number) => {
    const current = parseFloat(billingAmount || '0') || 0;
    const updated = Math.max(0, current + amount);
    setBillingAmount(String(updated));
    setIsPriceCustomized(true);
  };

  // Create Trip Mutation.
  //
  // When the lane has no rate yet and the dispatcher chose to save the price
  // they typed, the rate card is created FIRST so the trip records which card
  // it was priced from. If saving the rate fails the trip is still dispatched —
  // a pricing bookkeeping problem must not block getting a truck on the road —
  // and the failure is surfaced afterwards.
  const [rateSaveWarning, setRateSaveWarning] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: async (payload: CreateTripPayload) => {
      let rateCardId = matchedRateCard?.id;

      if (!matchedRateCard && laneHasNoRate && saveRateAs !== 'none' && payload.billing_amount) {
        try {
          const created = await rateCardService.create({
            base_price: payload.billing_amount,
            currency: 'SAR',
            customerId: saveRateAs === 'customer' ? customerId : null,
            origin_location_id: pickupLocationId,
            destination_location_id: dropoffLocationId,
          });
          rateCardId = created.id;
        } catch (e: any) {
          setRateSaveWarning(
            e.response?.data?.error?.message ||
              'The trip was created, but the new rate could not be saved for reuse.'
          );
        }
      }

      return tripService.create({ ...payload, rate_card_id: rateCardId });
    },
    onSuccess: async () => {
      // Auto-save locations to customer
      if (customerId && pickupLat && pickupLng && dropoffLat && dropoffLng) {
        try {
          await customerService.update(customerId, {
            default_pickup_lat: pickupLat,
            default_pickup_lng: pickupLng,
            default_dropoff_lat: dropoffLat,
            default_dropoff_lng: dropoffLng
          });
        } catch (e) {
          console.error("Failed to auto-save locations", e);
        }
      }

      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['fleet-performance'] });
      queryClient.invalidateQueries({ queryKey: ['customers-select'] });
      queryClient.invalidateQueries({ queryKey: ['rate-cards'] });
      navigate('/trips');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Could not create the trip.');
    }
  });

  const handleReset = () => {
    setSearchParams({}, { replace: true });
    setCustomerId('');
    setDriverId('');
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

  const nextStep = () => {
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
    const next = (step < 3 ? step + 1 : 3) as 1 | 2 | 3;
    const params = new URLSearchParams(searchParams);
    params.set('step', String(next));
    setSearchParams(params);
  };

  // Mirrors the browser's own back button: pops one history entry instead of
  // jumping straight out of the wizard. On step 1 there's nothing wizard-side
  // to pop, so this lands wherever the user came from (e.g. the trips list).
  const prevStep = () => {
    setError(null);
    navigate(-1);
  };

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
    !missingLocation && !missingName && !missingLane && !sameLaneEndpoints &&
    !missingSchedule && !isScheduleInvalid;

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
  }, [customerId, driverId, vehicleId, assignDriverLater, assignVehicleLater, pickupLat, pickupLng, dropoffLat, dropoffLng, pickupLocationId, dropoffLocationId, pickupTime, dropoffTime, pickupName, dropoffName, pickupAddress, dropoffAddress, billingAmount, createMutation]);

  return (
    <DashboardLayout active="Trips" title="Create New Trip">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 pb-6 space-y-4 animate-fade-in">

        {/* Header & actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground">Trips</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
            <span className="text-sm font-bold text-foreground">Create New Trip</span>
            <Badge variant="outline" className="ml-1.5 font-semibold bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
              Dispatch
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Btn
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate('/trips')}
              className="h-9 text-xs"
              label="Back to Trips"
              icon={<ArrowLeft className="w-3.5 h-3.5" />}
              shortcut={{ key: 'b', alt: true }}
            />
            <Button type="button" variant="ghost" size="sm" onClick={handleReset} className="h-9 text-xs gap-1.5">
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </Button>
          </div>
        </div>

        {/* Step manifest */}
        <Card className="rounded-xl overflow-hidden shadow-xs border-border/80">
          <div className="flex flex-col md:flex-row items-center divide-y md:divide-y-0 md:divide-x">
            {/* Customer */}
            <div className={`flex-1 p-3.5 flex items-center gap-3 w-full transition-colors ${step === 1 ? 'bg-muted/50' : ''}`}>
              <User className={`w-4 h-4 shrink-0 ${selectedCustomer ? 'text-primary' : 'text-muted-foreground/40'}`} />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">1. Customer</span>
                <p className={`text-sm font-bold truncate mt-0.5 ${selectedCustomer ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                  {selectedCustomer ? selectedCustomer.name : 'Pending...'}
                </p>
              </div>
              {selectedCustomer && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            </div>

            {/* Assignments */}
            <div className={`flex-1 p-3.5 flex items-center gap-3 w-full transition-colors ${step === 2 ? 'bg-muted/50' : ''}`}>
              <Truck className={`w-4 h-4 shrink-0 ${((selectedDriver || assignDriverLater) && (selectedVehicle || assignVehicleLater)) ? 'text-primary' : 'text-muted-foreground/40'}`} />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">2. Assignments</span>
                <p className={`text-sm font-bold truncate mt-0.5 ${((selectedDriver || assignDriverLater) && (selectedVehicle || assignVehicleLater)) ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                  {(selectedDriver || selectedVehicle || assignDriverLater || assignVehicleLater)
                    ? `${selectedDriver ? selectedDriver.first_name : assignDriverLater ? 'Driver later' : 'Pending...'} • ${selectedVehicle ? selectedVehicle.plate_number : assignVehicleLater ? 'Vehicle later' : 'Pending...'}`
                    : 'Pending...'}
                </p>
              </div>
              {((selectedDriver || assignDriverLater) && (selectedVehicle || assignVehicleLater)) && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            </div>

            {/* Location Selection & Pricing */}
            <div className={`flex-1 p-3.5 flex items-center gap-3 w-full transition-colors ${step === 3 ? 'bg-muted/50' : ''}`}>
              <Navigation className={`w-4 h-4 shrink-0 ${!missingLocation && !missingLane && !missingSchedule && !isScheduleInvalid ? 'text-primary' : 'text-muted-foreground/40'}`} />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">3. Location Selection &amp; Pricing</span>
                <p className={`text-sm font-bold truncate mt-0.5 ${!missingLocation && !missingLane && !missingSchedule && !isScheduleInvalid ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                  {!missingLocation && !missingLane && !missingSchedule && !isScheduleInvalid
                    ? `${pickupLocationName} → ${dropoffLocationName}${billingAmount ? ` • SAR ${Number(billingAmount).toLocaleString()}` : ''}`
                    : 'Pending...'}
                </p>
              </div>
              {!missingLocation && !missingLane && !missingSchedule && !isScheduleInvalid && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            </div>
          </div>
        </Card>

        {error && (
          <Alert variant="destructive" className="rounded-xl border-destructive/30">
            <AlertCircle className="size-4" />
            <AlertTitle>Cannot proceed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Wizard steps (left) + live trip summary & pricing (right, sticky) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
        <div className="lg:col-span-2 space-y-4 min-w-0">
        {step === 1 && (
          <Card className="rounded-xl shadow-xs border-border/80">
            <CardHeader className="border-b bg-muted/10">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <User className="size-4 text-primary" /> Step 1: Customer Organization
              </CardTitle>
              <CardDescription className="text-xs">
                Who is this trip for? The schedule is set in step 3, alongside the route.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-5">
              {/* Customer Selector */}
              <div className="space-y-1.5">
                <Label htmlFor="customer_id" className="text-xs font-semibold">
                  Select Customer Organization <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={customerId}
                  onValueChange={(val) => {
                    setCustomerId(val);
                    setError(null);
                  }}
                >
                  <SelectTrigger id="customer_id" className="w-full h-10 rounded-xl">
                    <SelectValue placeholder="Choose customer organization..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.contact_phone || 'No Phone'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </CardContent>
            <CardFooter className="justify-end rounded-b-xl border-t bg-muted/10">
              <Btn
                label="Next Step"
                icon={<ChevronRight className="w-3.5 h-3.5" />}
                onClick={nextStep}
                size="sm"
                className="h-9 px-5 text-xs"
                shortcut={{ key: 'Enter', metaOrControl: true }}
              />
            </CardFooter>
          </Card>
        )}

        {step === 2 && (
          <Card className="rounded-xl shadow-xs border-border/80">
            <CardHeader className="border-b bg-muted/10">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Truck className="size-4 text-primary" /> Step 2: Driver &amp; Vehicle Assignment
              </CardTitle>
              <CardDescription className="text-xs">
                Pair an available driver with a registered fleet vehicle for this trip.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Driver */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="driver_id" className="text-xs font-semibold">
                      Assigned Driver {!assignDriverLater && <span className="text-destructive">*</span>}
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={assignDriverLater}
                      onClick={() => setIsAddDriverOpen(true)}
                      className="h-6 px-2 text-[11px] text-primary hover:bg-primary/10 font-medium gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add driver
                    </Button>
                  </div>
                  <Combobox
                    id="driver_id"
                    value={driverId}
                    onChange={(val) => {
                      setDriverId(val);
                      setError(null);
                    }}
                    options={driverOptions}
                    placeholder="Choose available driver..."
                    searchPlaceholder="Search drivers..."
                    emptyText="No available drivers found."
                    disabled={assignDriverLater}
                  />
                  <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                    <Checkbox
                      checked={assignDriverLater}
                      onCheckedChange={(checked) => {
                        setAssignDriverLater(checked === true);
                        if (checked) setDriverId('');
                        setError(null);
                      }}
                    />
                    <span className="text-xs text-muted-foreground">Assign driver later</span>
                  </label>
                </div>

                {/* Vehicle */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="vehicle_id" className="text-xs font-semibold">
                      Assigned Vehicle {!assignVehicleLater && <span className="text-destructive">*</span>}
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={assignVehicleLater}
                      onClick={() => setIsAddVehicleOpen(true)}
                      className="h-6 px-2 text-[11px] text-primary hover:bg-primary/10 font-medium gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add vehicle
                    </Button>
                  </div>
                  <Combobox
                    id="vehicle_id"
                    value={vehicleId}
                    onChange={(val) => {
                      setVehicleId(val);
                      setError(null);
                    }}
                    options={vehicleOptions}
                    placeholder="Choose available vehicle..."
                    searchPlaceholder="Search vehicles..."
                    emptyText="No available vehicles found."
                    disabled={assignVehicleLater}
                  />
                  {vehicleAutoAssigned && (
                    <p className="text-[11px] text-primary flex items-center gap-1">
                      <Sparkles className="size-3" /> Auto-set from {selectedDriver?.first_name}'s assigned vehicle — change anytime.
                    </p>
                  )}
                  <label className="flex items-center gap-2 pt-1 cursor-pointer select-none">
                    <Checkbox
                      checked={assignVehicleLater}
                      onCheckedChange={(checked) => {
                        setAssignVehicleLater(checked === true);
                        if (checked) setVehicleId('');
                        setError(null);
                      }}
                    />
                    <span className="text-xs text-muted-foreground">Assign vehicle later</span>
                  </label>
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-between rounded-b-xl border-t bg-muted/10">
              <Btn
                variant="outline"
                onClick={prevStep}
                size="sm"
                className="h-9 px-5 text-xs"
                label="Back"
                icon={<ChevronLeft className="w-3.5 h-3.5" />}
                shortcut={{ key: 'Escape' }}
              />
              <Btn
                onClick={nextStep}
                size="sm"
                className="h-9 px-5 text-xs"
                label="Next Step"
                icon={<ChevronRight className="w-3.5 h-3.5" />}
                shortcut={{ key: 'Enter', metaOrControl: true }}
              />
            </CardFooter>
          </Card>
        )}

        {step === 3 && (
          <Card className="rounded-xl shadow-xs border-border/80">
            <CardHeader className="border-b bg-muted/10">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Navigation className="size-4 text-primary" /> Step 3: Location Selection &amp; Pricing
              </CardTitle>
              <CardDescription className="text-xs">
                Fill in each stop — its pricing hub, the exact address, and when the truck is due.
                The price for the lane appears on the right as soon as both hubs are set.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">

              {/* The two stops, side by side. Each one carries its own hub,
                  exact point and time, so the dispatcher fills a stop in one
                  place instead of scrolling between three stacked sections. */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                <TripStopCard
                  tone="pickup"
                  title="Pickup"
                  hubLabel="Pricing hub (origin)"
                  hubPlaceholder="Where does this trip start? (e.g. Riyadh)"
                  locationId={pickupLocationId}
                  onLocationChange={(locId, loc) => {
                    setPickupLocationId(locId);
                    setPickupLocationName(loc?.name || '');
                    // A place carries a default pin, so picking "Riyadh" moves
                    // the map there instead of leaving it on the last trip's
                    // coordinates. The dispatcher can still drag it to the
                    // exact yard afterwards.
                    //
                    // But only while no exact point has been chosen yet. A
                    // searched address is the actual yard; this endpoint's pin
                    // is a city centroid, and overwriting one with the other
                    // silently downgraded the stop to city-level coordinates
                    // while the name and address still read correctly. The
                    // address is the tell: it is non-empty only once a search
                    // has filled it, whereas lat/lng always hold the Riyadh /
                    // Jeddah defaults and so cannot distinguish the two.
                    if (loc?.lat != null && loc?.lng != null && !pickupAddress.trim()) {
                      setPickupLat(loc.lat);
                      setPickupLng(loc.lng);
                    }
                    if (loc && !pickupName.trim()) setPickupName(loc.name);
                    if (loc?.address && !pickupAddress.trim()) setPickupAddress(loc.address);
                    setError(null);
                  }}
                  excludeLocationId={dropoffLocationId}
                  lat={pickupLat}
                  lng={pickupLng}
                  onCoordsChange={(lat, lng) => { setPickupLat(lat); setPickupLng(lng); setError(null); }}
                  name={pickupName}
                  onNameChange={setPickupName}
                  address={pickupAddress}
                  onAddressChange={setPickupAddress}
                  time={pickupTime}
                  onTimeChange={(val) => { setPickupTime(val); setError(null); }}
                  timeLabel="Planned arrival"
                  timePlaceholder="When is the truck due at the dock?"
                  timeError={!!error && !pickupTime}
                  presets={[
                    {
                      label: '⚡ Now',
                      onClick: () => { setPickupTime(toLocalInput(new Date())); setError(null); },
                    },
                    {
                      label: '+2h',
                      onClick: () => { setPickupTime(toLocalInput(addHours(new Date(), 2))); setError(null); },
                    },
                    {
                      label: 'Tomorrow 08:00',
                      onClick: () => {
                        const target = setMinutes(setHours(addHours(new Date(), 24), 8), 0);
                        setPickupTime(toLocalInput(target));
                        setError(null);
                      },
                    },
                  ]}
                  warning={
                    pickupDistanceKm !== null && pickupDistanceKm > 50 ? (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg border border-amber-300/80 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200 text-[11px] font-medium animate-fade-in">
                        <AlertTriangle className="size-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          Pin is about <strong>{pickupDistanceKm.toLocaleString()} km</strong> from the{' '}
                          <strong>{selectedPickupLocation?.name}</strong> hub.
                        </span>
                      </div>
                    ) : null
                  }
                />

                <TripStopCard
                  tone="dropoff"
                  title="Dropoff"
                  hubLabel="Pricing hub (destination)"
                  hubPlaceholder="Where does it end? (e.g. Jeddah)"
                  locationId={dropoffLocationId}
                  onLocationChange={(locId, loc) => {
                    setDropoffLocationId(locId);
                    setDropoffLocationName(loc?.name || '');
                    // Guarded for the same reason as the pickup endpoint above:
                    // never replace a searched, exact pin with a city centroid.
                    if (loc?.lat != null && loc?.lng != null && !dropoffAddress.trim()) {
                      setDropoffLat(loc.lat);
                      setDropoffLng(loc.lng);
                    }
                    if (loc && !dropoffName.trim()) setDropoffName(loc.name);
                    if (loc?.address && !dropoffAddress.trim()) setDropoffAddress(loc.address);
                    setError(null);
                  }}
                  excludeLocationId={pickupLocationId}
                  lat={dropoffLat}
                  lng={dropoffLng}
                  onCoordsChange={(lat, lng) => { setDropoffLat(lat); setDropoffLng(lng); setError(null); }}
                  name={dropoffName}
                  onNameChange={setDropoffName}
                  address={dropoffAddress}
                  onAddressChange={setDropoffAddress}
                  time={dropoffTime}
                  onTimeChange={(val) => { setDropoffTime(val); setError(null); }}
                  timeLabel="Delivery deadline"
                  timePlaceholder="When must it be delivered?"
                  minDate={pickupTime ? parseISO(pickupTime) : undefined}
                  timeError={!!error && (!dropoffTime || (!!pickupTime && dropoffTime <= pickupTime))}
                  presets={[
                    { label: '+4h', onClick: () => applyDropoffOffset(4) },
                    { label: '+12h', onClick: () => applyDropoffOffset(12) },
                    { label: '+24h', onClick: () => applyDropoffOffset(24) },
                    { label: 'End of day', onClick: () => applyDropoffOffset(0, true) },
                  ]}
                  warning={
                    dropoffDistanceKm !== null && dropoffDistanceKm > 50 ? (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg border border-amber-300/80 bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:border-amber-800 dark:text-amber-200 text-[11px] font-medium animate-fade-in">
                        <AlertTriangle className="size-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          Pin is about <strong>{dropoffDistanceKm.toLocaleString()} km</strong> from the{' '}
                          <strong>{selectedDropoffLocation?.name}</strong> hub.
                        </span>
                      </div>
                    ) : null
                  }
                />
              </div>

              {/* Live Interactive Route SLA & Transit Timeline Widget */}
              {transitInfo && (
                <div
                  className={cn(
                    'p-4 rounded-xl border transition-all animate-fade-in space-y-3',
                    transitInfo.isInvalid
                      ? 'bg-destructive/10 border-destructive/40 text-destructive'
                      : transitInfo.isTight
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {transitInfo.isInvalid ? (
                        <AlertCircle className="size-4 text-destructive" />
                      ) : transitInfo.isTight ? (
                        <AlertTriangle className="size-4 text-amber-600" />
                      ) : (
                        <ShieldCheck className="size-4 text-emerald-600" />
                      )}
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {transitInfo.isInvalid
                          ? 'Invalid Schedule Timeline'
                          : transitInfo.isTight
                          ? 'Tight Turnaround Window'
                          : 'Optimal Dispatch SLA Window'}
                      </span>
                    </div>

                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs font-bold font-mono',
                        transitInfo.isInvalid
                          ? 'bg-destructive/20 border-destructive text-destructive'
                          : transitInfo.isTight
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-700 dark:text-amber-300'
                          : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
                      )}
                    >
                      ⏱️ {transitInfo.durationString} transit time
                    </Badge>
                  </div>

                  {/* Route Timeline Bar */}
                  <div className="flex items-center justify-between bg-background/80 p-3 rounded-lg border border-border/60 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full bg-emerald-500" />
                      <div className="flex flex-col">
                        <span className="font-semibold text-foreground">
                          {pickupName || 'Pickup Origin'}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {format(transitInfo.pDate, 'MMM d • hh:mm a')}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-muted-foreground px-2">
                      <div className="h-0.5 w-8 bg-border hidden sm:block" />
                      <Truck className="size-3.5 text-primary shrink-0" />
                      <ArrowRight className="size-3 shrink-0" />
                      <div className="h-0.5 w-8 bg-border hidden sm:block" />
                    </div>

                    <div className="flex items-center gap-2 text-right">
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-foreground">
                          {dropoffName || 'Dropoff Destination'}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          {format(transitInfo.dDate, 'MMM d • hh:mm a')}
                        </span>
                      </div>
                      <div className="size-2 rounded-full bg-destructive" />
                    </div>
                  </div>

                  {transitInfo.isInvalid && (
                    <p className="text-xs font-semibold text-destructive">
                      Warning: Delivery deadline cannot be earlier than or equal to pickup arrival time. Please adjust the dropoff schedule.
                    </p>
                  )}
                </div>
              )}

            </CardContent>
            <CardFooter className="flex flex-wrap items-center justify-between gap-2.5 rounded-b-xl border-t bg-muted/10 p-3 sm:p-4">
              <Btn
                variant="outline"
                onClick={prevStep}
                size="sm"
                className="h-9 px-4 text-xs"
                label="Back"
                icon={<ChevronLeft className="w-3.5 h-3.5" />}
                shortcut={{ key: 'Escape' }}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={() => handleSubmit(false)}
                  disabled={createMutation.isPending || !isFormValid}
                  size="sm"
                  className="h-9 px-4 text-xs font-bold bg-[#E8450F] hover:bg-[#C7380A] text-white shadow-xs gap-1.5"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{createMutation.isPending ? 'Scheduling...' : 'Schedule Trip'}</span>
                </Button>

                {!assignDriverLater && driverId && !assignVehicleLater && vehicleId && (
                  <Button
                    type="button"
                    onClick={() => handleSubmit(true)}
                    disabled={createMutation.isPending || !isFormValid}
                    size="sm"
                    variant="outline"
                    className="h-9 px-4 text-xs font-bold border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 shadow-xs gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Dispatch Now</span>
                  </Button>
                )}
              </div>
            </CardFooter>
          </Card>
        )}

        </div>

        {/* Live trip summary & pricing — visible from step 1, sticky so it never scrolls out of reach */}
        <div className="space-y-4 lg:sticky lg:top-4">
          <Card className="rounded-xl shadow-xs border-border/80">
            <CardHeader className="border-b bg-muted/10 py-3.5">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" /> Trip Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-4 text-xs">
              <div className="flex items-start justify-between gap-2">
                <span className="text-muted-foreground font-medium shrink-0">Customer</span>
                <span className={cn('text-right font-semibold truncate', !selectedCustomer && 'text-muted-foreground/60 font-normal')}>
                  {selectedCustomer ? selectedCustomer.name : 'Not selected'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-muted-foreground font-medium shrink-0">Planned start</span>
                <span className={cn('text-right font-semibold truncate', !pickupTime && 'text-muted-foreground/60 font-normal')}>
                  {pickupTime && isValid(parseISO(pickupTime)) ? format(parseISO(pickupTime), 'MMM d, hh:mm a') : 'Unscheduled'}
                </span>
              </div>

              <div className="h-px bg-border/70" />

              <div className="flex items-start justify-between gap-2">
                <span className="text-muted-foreground font-medium shrink-0">Driver</span>
                <span className={cn('text-right font-semibold truncate', !selectedDriver && !assignDriverLater && 'text-muted-foreground/60 font-normal')}>
                  {selectedDriver ? `${selectedDriver.first_name} ${selectedDriver.last_name}` : assignDriverLater ? 'Assign later' : 'Not assigned'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-muted-foreground font-medium shrink-0">Vehicle</span>
                <span className={cn('text-right font-semibold truncate', !selectedVehicle && !assignVehicleLater && 'text-muted-foreground/60 font-normal')}>
                  {selectedVehicle ? selectedVehicle.plate_number : assignVehicleLater ? 'Assign later' : 'Not assigned'}
                </span>
              </div>

              <div className="h-px bg-border/70" />

              <div className="flex items-start justify-between gap-2">
                <span className="text-muted-foreground font-medium shrink-0">Lane</span>
                <span className={cn('text-right font-semibold truncate', !laneReady && 'text-muted-foreground/60 font-normal')}>
                  {laneReady ? `${pickupLocationName} → ${dropoffLocationName}` : 'Not set'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-muted-foreground font-medium shrink-0">Pickup point</span>
                <span className={cn('text-right font-semibold truncate', !pickupName && 'text-muted-foreground/60 font-normal')}>
                  {pickupName || 'Not set'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-muted-foreground font-medium shrink-0">Dropoff point</span>
                <span className={cn('text-right font-semibold truncate', !dropoffName && 'text-muted-foreground/60 font-normal')}>
                  {dropoffName || 'Not set'}
                </span>
              </div>

              {transitInfo && (
                <Badge
                  variant="outline"
                  className={cn(
                    'w-full justify-center py-1 text-[11px] font-bold font-mono',
                    transitInfo.isInvalid
                      ? 'bg-destructive/10 border-destructive/40 text-destructive'
                      : transitInfo.isTight
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300'
                      : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  )}
                >
                  ⏱️ {transitInfo.durationString} transit
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Trip Pricing & Rate Card */}
          <Card className="rounded-xl shadow-xs border-border/80 bg-gradient-to-br from-background via-muted/20 to-muted/40">
            <CardHeader className="border-b bg-muted/10 py-3.5">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Receipt className="size-4 text-indigo-600" /> Pricing &amp; Rate Card
                </CardTitle>
                {isLookingUpRate ? (
                  <Badge variant="outline" className="text-[11px] font-semibold bg-muted text-muted-foreground shrink-0">
                    Checking...
                  </Badge>
                ) : matchedRateCard ? (
                  <Badge variant="outline" className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 border-indigo-200 shrink-0">
                    <Tag className="w-3 h-3 mr-1" />
                    {rateSource === 'customer' ? 'Customer rate' : 'Standard rate'}
                  </Badge>
                ) : laneHasNoRate ? (
                  <Badge variant="outline" className="text-[11px] font-semibold bg-amber-50 text-amber-700 border-amber-200 shrink-0">
                    New lane
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[11px] font-semibold bg-muted text-muted-foreground shrink-0">
                    Pick a lane
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs">
                What this trip bills. Taken from the rate for this lane, and editable per trip.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">

              {/* Nothing to price against yet */}
              {!laneReady && (
                <p className="text-[11px] text-muted-foreground rounded-lg border border-dashed border-border p-3">
                  Choose an origin and destination in step 3 to see the price for this lane.
                </p>
              )}

              {/* Matched rate */}
              {matchedRateCard && (
                <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-indigo-900 dark:text-indigo-200">
                        {matchedRateCard.name}
                      </span>
                      <span className="text-[10px] text-indigo-600 font-semibold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50">
                        {matchedRateCard.route_origin} → {matchedRateCard.route_destination}
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                      {rateSource === 'customer'
                        ? `${selectedCustomer?.name || 'This customer'}'s own rate: `
                        : 'Standard rate for this lane: '}
                      <strong className="font-mono font-bold">
                        {matchedRateCard.currency || 'SAR'} {Number(matchedRateCard.base_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </strong>
                    </p>
                  </div>

                  {isPriceCustomized && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setBillingAmount(String(matchedRateCard.base_price));
                        setIsPriceCustomized(false);
                      }}
                      className="h-7 px-2 text-[11px] text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 font-semibold shrink-0"
                    >
                      Reset to rate
                    </Button>
                  )}
                </div>
              )}

              {/* New lane — offer to save the typed price for reuse */}
              {laneHasNoRate && (
                <div className="rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 p-3 space-y-2.5 text-xs">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-bold text-amber-900 dark:text-amber-200">
                        No rate for {pickupLocationName || 'origin'} → {dropoffLocationName || 'destination'} yet
                      </p>
                      <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                        Enter the price below and save it, so the next trip on this lane fills in
                        automatically.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1 pl-5.5">
                    {([
                      { key: 'standard', label: 'Save as the standard rate', hint: 'Every customer uses it' },
                      { key: 'customer', label: `Save for ${selectedCustomer?.name || 'this customer'} only`, hint: 'Overrides the standard rate' },
                      { key: 'none', label: "Don't save", hint: 'One-off price for this trip' },
                    ] as const).map((option) => (
                      <label
                        key={option.key}
                        className="flex items-start gap-2 cursor-pointer rounded-md px-1.5 py-1 hover:bg-amber-100/60 dark:hover:bg-amber-900/20 transition-colors"
                      >
                        <input
                          type="radio"
                          name="save_rate_as"
                          checked={saveRateAs === option.key}
                          onChange={() => setSaveRateAs(option.key)}
                          className="mt-0.5 accent-[#E8450F]"
                        />
                        <span>
                          <span className="block font-semibold text-amber-900 dark:text-amber-200">{option.label}</span>
                          <span className="block text-[10px] text-amber-800/70 dark:text-amber-300/70">{option.hint}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {rateSaveWarning && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
                  {rateSaveWarning}
                </div>
              )}

              {/* Editable Billing Amount Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="billing_amount" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-indigo-600" /> Trip Billing Amount (SAR)
                  </Label>
                </div>
                <span className="text-[11px] text-muted-foreground font-mono font-semibold block">
                  {billingAmount ? `Total: SAR ${Number(billingAmount).toLocaleString()}` : 'Price not set'}
                </span>

                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">
                    SAR
                  </div>
                  <Input
                    id="billing_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={billingAmount}
                    onChange={(e) => {
                      setBillingAmount(e.target.value);
                      setIsPriceCustomized(true);
                    }}
                    placeholder={matchedRateCard ? String(matchedRateCard.base_price) : "e.g. 3500.00"}
                    className="h-10 pl-12 pr-3 rounded-xl font-mono text-sm font-semibold border-border/80 focus:border-indigo-500"
                  />
                </div>

                {/* Quick price adjustment chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1 w-full">
                    Quick adjustments:
                  </span>
                  <button
                    type="button"
                    onClick={() => adjustPrice(100)}
                    className="text-[11px] px-2.5 py-0.5 rounded-md font-medium bg-background hover:bg-muted text-foreground border border-border/70 transition-all"
                  >
                    +100 SAR
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustPrice(250)}
                    className="text-[11px] px-2.5 py-0.5 rounded-md font-medium bg-background hover:bg-muted text-foreground border border-border/70 transition-all"
                  >
                    +250 SAR
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustPrice(500)}
                    className="text-[11px] px-2.5 py-0.5 rounded-md font-medium bg-background hover:bg-muted text-foreground border border-border/70 transition-all"
                  >
                    +500 SAR
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBillingAmount('2500');
                      setIsPriceCustomized(true);
                    }}
                    className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-background hover:bg-muted text-foreground border border-border/70 transition-all"
                  >
                    2.5k
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBillingAmount('3500');
                      setIsPriceCustomized(true);
                    }}
                    className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-background hover:bg-muted text-foreground border border-border/70 transition-all"
                  >
                    3.5k
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBillingAmount('4500');
                      setIsPriceCustomized(true);
                    }}
                    className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-background hover:bg-muted text-foreground border border-border/70 transition-all"
                  >
                    4.5k
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        </div>

      </div>

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
    </DashboardLayout>
  );
}
