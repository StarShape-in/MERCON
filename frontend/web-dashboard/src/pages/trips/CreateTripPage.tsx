import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  RotateCcw,
  Plus,
  CheckCircle2,
  Navigation,
  Clock,
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
} from 'lucide-react';
import { parseISO, isValid, differenceInMinutes, addHours, setHours, setMinutes, format } from 'date-fns';

import DashboardLayout from '@/components/layout/DashboardLayout';
import LocationPickerMap from '@/components/trips/LocationPickerMap';
import CreateDriverModal from '@/components/trips/CreateDriverModal';
import CreateVehicleModal from '@/components/trips/CreateVehicleModal';
import { tripService, CreateTripPayload } from '@/services/tripService';
import { customerService } from '@/services/customerService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { rateCardService } from '@/services/rateCardService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Checkbox } from '@/components/ui/checkbox';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import Btn from '@/components/ui/Btn';
import { cn } from '@/lib/utils';

export default function CreateTripPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [plannedStart, setPlannedStart] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [assignDriverLater, setAssignDriverLater] = useState(false);
  const [assignVehicleLater, setAssignVehicleLater] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);

  // Stops
  const [pickupLat, setPickupLat] = useState<number | null>(24.7136); // Default Riyadh
  const [pickupLng, setPickupLng] = useState<number | null>(46.6753);
  const [pickupTime, setPickupTime] = useState('');
  const [pickupName, setPickupName] = useState('');

  const [dropoffLat, setDropoffLat] = useState<number | null>(21.5433); // Default Jeddah
  const [dropoffLng, setDropoffLng] = useState<number | null>(39.1728);
  const [dropoffTime, setDropoffTime] = useState('');
  const [dropoffName, setDropoffName] = useState('');

  // Pricing & Rate Card
  const [billingAmount, setBillingAmount] = useState<string>('');
  const [isPriceCustomized, setIsPriceCustomized] = useState(false);

  // Fetch Customers, Drivers, Vehicles, and Rate Cards
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

  const { data: rateCardsRes } = useQuery({
    queryKey: ['rate-cards-select'],
    queryFn: () => rateCardService.getAll(),
  });

  const customers = customersRes?.data || [];
  const drivers = driversRes?.data || [];
  const vehicles = vehiclesRes?.data || [];
  const rateCards = rateCardsRes?.data || [];

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

  // Match active Rate Card for selected customer and route
  const matchedRateCard = useMemo(() => {
    if (!rateCards.length) return null;

    // 1. Try customer-specific and route-matching rate card
    if (customerId && pickupName && dropoffName) {
      const pLower = pickupName.toLowerCase();
      const dLower = dropoffName.toLowerCase();
      const routeSpecific = rateCards.find(rc =>
        rc.customerId === customerId &&
        rc.is_active &&
        ((rc.route_origin && (pLower.includes(rc.route_origin.toLowerCase()) || rc.route_origin.toLowerCase().includes(pLower))) &&
         (rc.route_destination && (dLower.includes(rc.route_destination.toLowerCase()) || rc.route_destination.toLowerCase().includes(dLower))))
      );
      if (routeSpecific) return routeSpecific;
    }

    // 2. Try customer-specific active rate card
    if (customerId) {
      const custCard = rateCards.find(rc => rc.customerId === customerId && rc.is_active);
      if (custCard) return custCard;
    }

    // 3. Fallback to general standard active rate card
    return rateCards.find(rc => !rc.customerId && rc.is_active) || rateCards[0] || null;
  }, [rateCards, customerId, pickupName, dropoffName]);

  // Auto-populate billing price from matched rate card when customer/rate card changes (if not manually edited)
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
    let target: Date;
    if (setEod) {
      target = setMinutes(setHours(base, 23), 59);
    } else {
      target = addHours(base, hoursOffset);
    }
    const year = target.getFullYear();
    const month = String(target.getMonth() + 1).padStart(2, '0');
    const day = String(target.getDate()).padStart(2, '0');
    const hours = String(target.getHours()).padStart(2, '0');
    const mins = String(target.getMinutes()).padStart(2, '0');
    setDropoffTime(`${year}-${month}-${day}T${hours}:${mins}`);
    setError(null);
  };

  // Quick Price Adjustments
  const adjustPrice = (amount: number) => {
    const current = parseFloat(billingAmount || '0') || 0;
    const updated = Math.max(0, current + amount);
    setBillingAmount(String(updated));
    setIsPriceCustomized(true);
  };

  // Create Trip Mutation
  const createMutation = useMutation({
    mutationFn: (payload: CreateTripPayload) => tripService.create(payload),
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
      navigate('/trips');
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Could not create the trip.');
    }
  });

  const handleReset = () => {
    setStep(1);
    setPlannedStart('');
    setCustomerId('');
    setDriverId('');
    setVehicleId('');
    setAssignDriverLater(false);
    setAssignVehicleLater(false);
    setPickupLat(24.7136);
    setPickupLng(46.6753);
    setPickupTime('');
    setPickupName('');
    setDropoffLat(21.5433);
    setDropoffLng(39.1728);
    setDropoffTime('');
    setDropoffName('');
    setBillingAmount('');
    setIsPriceCustomized(false);
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
    setStep((s) => (s < 3 ? (s + 1) as 1 | 2 | 3 : 3));
  };

  const prevStep = () => {
    setError(null);
    setStep((s) => (s > 1 ? (s - 1) as 1 | 2 | 3 : 1));
  };

  const missingLocation = pickupLat == null || pickupLng == null || dropoffLat == null || dropoffLng == null;
  const missingName = pickupName.trim() === '' || dropoffName.trim() === '';
  const missingSchedule = pickupTime === '' || dropoffTime === '';
  const isScheduleInvalid = pickupTime !== '' && dropoffTime !== '' && dropoffTime <= pickupTime;
  const isFormValid =
    customerId !== '' &&
    (assignDriverLater || driverId !== '') &&
    (assignVehicleLater || vehicleId !== '') &&
    !missingLocation && !missingName && !missingSchedule && !isScheduleInvalid;

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
      planned_start: plannedStart || undefined,
      billing_amount: numericPrice,
      trip_charges: numericPrice,
      stops: [
        {
          stop_type: 'Pickup',
          lat: pickupLat,
          lng: pickupLng,
          planned_arrival: pickupTime || undefined,
          location_name: pickupName.trim() || undefined,
        },
        {
          stop_type: 'Dropoff',
          lat: dropoffLat,
          lng: dropoffLng,
          planned_arrival: dropoffTime || undefined,
          location_name: dropoffName.trim() || undefined,
        },
      ],
    };

    createMutation.mutate(payload);
  }, [customerId, driverId, vehicleId, assignDriverLater, assignVehicleLater, pickupLat, pickupLng, dropoffLat, dropoffLng, plannedStart, pickupTime, dropoffTime, pickupName, dropoffName, billingAmount, createMutation]);

  return (
    <DashboardLayout active="Trips" title="Create New Trip">
      <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 pb-6 space-y-4 animate-fade-in">

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
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">1. Customer &amp; Start</span>
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
              <Navigation className={`w-4 h-4 shrink-0 ${!missingLocation && !missingSchedule && !isScheduleInvalid ? 'text-primary' : 'text-muted-foreground/40'}`} />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">3. Location Selection &amp; Pricing</span>
                <p className={`text-sm font-bold truncate mt-0.5 ${!missingLocation && !missingSchedule && !isScheduleInvalid ? 'text-foreground' : 'text-muted-foreground/60'}`}>
                  {!missingLocation && !missingSchedule && !isScheduleInvalid
                    ? `${pickupName || 'Origin'} → ${dropoffName || 'Destination'}${billingAmount ? ` • SAR ${Number(billingAmount).toLocaleString()}` : ''}`
                    : 'Pending...'}
                </p>
              </div>
              {!missingLocation && !missingSchedule && !isScheduleInvalid && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
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

        {/* Wizard steps */}
        {step === 1 && (
          <Card className="rounded-xl shadow-xs border-border/80">
            <CardHeader className="border-b bg-muted/10">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <User className="size-4 text-primary" /> Step 1: Customer Organization &amp; Planned Start
              </CardTitle>
              <CardDescription className="text-xs">
                Select the client organization and optionally schedule the planned trip start time.
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

              {/* Upgraded Planned Start Date & Time Picker */}
              <div className="space-y-2.5 p-4 rounded-xl border bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label htmlFor="planned_start" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" /> Planned Trip Start (Optional)
                  </Label>
                  <span className="text-[11px] text-muted-foreground">
                    Assists dispatch queue prioritization
                  </span>
                </div>

                <DateTimePicker
                  id="planned_start"
                  value={plannedStart}
                  onChange={(val) => {
                    setPlannedStart(val);
                    setError(null);
                  }}
                  placeholder="Select planned start date & time (Optional)..."
                  label="Planned Start"
                />

                {/* Quick Presets Pills */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
                    Quick dispatch:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const now = new Date();
                      const year = now.getFullYear();
                      const month = String(now.getMonth() + 1).padStart(2, '0');
                      const day = String(now.getDate()).padStart(2, '0');
                      const hours = String(now.getHours()).padStart(2, '0');
                      const mins = String(now.getMinutes()).padStart(2, '0');
                      setPlannedStart(`${year}-${month}-${day}T${hours}:${mins}`);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg font-medium bg-background hover:bg-muted text-foreground border border-border/70 transition-all flex items-center gap-1"
                  >
                    <Sparkles className="size-3 text-primary" /> Dispatch ASAP
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const today = new Date();
                      const target = setMinutes(setHours(today, 14), 0);
                      const year = target.getFullYear();
                      const month = String(target.getMonth() + 1).padStart(2, '0');
                      const day = String(target.getDate()).padStart(2, '0');
                      setPlannedStart(`${year}-${month}-${day}T14:00`);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg font-medium bg-background hover:bg-muted text-foreground border border-border/70 transition-all"
                  >
                    Today 02:00 PM
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const tomorrow = addHours(new Date(), 24);
                      const target = setMinutes(setHours(tomorrow, 8), 0);
                      const year = target.getFullYear();
                      const month = String(target.getMonth() + 1).padStart(2, '0');
                      const day = String(target.getDate()).padStart(2, '0');
                      setPlannedStart(`${year}-${month}-${day}T08:00`);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg font-medium bg-background hover:bg-muted text-foreground border border-border/70 transition-all"
                  >
                    Tomorrow 08:00 AM
                  </button>
                  {plannedStart && (
                    <button
                      type="button"
                      onClick={() => setPlannedStart('')}
                      className="text-[11px] px-2 py-1 rounded-lg font-medium text-destructive hover:bg-destructive/10 transition-all ml-auto"
                    >
                      Clear
                    </button>
                  )}
                </div>
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
                Select pickup and dropoff locations, establish timeline schedule, and set trip pricing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-5">

              {/* Pickup Stop Section */}
              <div className="space-y-3.5 p-4 rounded-xl border bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20 animate-pulse" />
                    Pickup Origin (Stop Sequence 1)
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {pickupLat && pickupLng ? `${pickupLat.toFixed(4)}, ${pickupLng.toFixed(4)}` : 'Location not set'}
                  </span>
                </div>

                <LocationPickerMap
                  label="Pickup Location (Click map or enter address)"
                  lat={pickupLat}
                  lng={pickupLng}
                  onChange={(lat: number, lng: number) => { setPickupLat(lat); setPickupLng(lng); setError(null); }}
                  name={pickupName}
                  onNameChange={setPickupName}
                />

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pickup_time" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" /> Planned Pickup Arrival Time <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                      Loading Dock Schedule
                    </span>
                  </div>

                  <DateTimePicker
                    id="pickup_time"
                    value={pickupTime}
                    onChange={(val) => {
                      setPickupTime(val);
                      setError(null);
                    }}
                    placeholder="Select planned pickup arrival date & time..."
                    label="Pickup Arrival"
                    error={!!error && !pickupTime}
                  />

                  {/* Quick Pickup Presets */}
                  <div className="flex flex-wrap items-center gap-1 pt-1">
                    <span className="text-[10px] font-bold text-muted-foreground mr-1">
                      Quick pickup:
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const year = now.getFullYear();
                        const month = String(now.getMonth() + 1).padStart(2, '0');
                        const day = String(now.getDate()).padStart(2, '0');
                        const hours = String(now.getHours()).padStart(2, '0');
                        const mins = String(now.getMinutes()).padStart(2, '0');
                        setPickupTime(`${year}-${month}-${day}T${hours}:${mins}`);
                        setError(null);
                      }}
                      className="text-[11px] px-2.5 py-0.5 rounded-md font-medium bg-background hover:bg-muted text-foreground border border-border/70 transition-all"
                    >
                      ⚡ ASAP / Now
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const target = addHours(new Date(), 2);
                        const year = target.getFullYear();
                        const month = String(target.getMonth() + 1).padStart(2, '0');
                        const day = String(target.getDate()).padStart(2, '0');
                        const hours = String(target.getHours()).padStart(2, '0');
                        const mins = String(target.getMinutes()).padStart(2, '0');
                        setPickupTime(`${year}-${month}-${day}T${hours}:${mins}`);
                        setError(null);
                      }}
                      className="text-[11px] px-2.5 py-0.5 rounded-md font-medium bg-background hover:bg-muted text-foreground border border-border/70 transition-all"
                    >
                      +2 Hours
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const tomorrow = addHours(new Date(), 24);
                        const target = setMinutes(setHours(tomorrow, 8), 0);
                        const year = target.getFullYear();
                        const month = String(target.getMonth() + 1).padStart(2, '0');
                        const day = String(target.getDate()).padStart(2, '0');
                        setPickupTime(`${year}-${month}-${day}T08:00`);
                        setError(null);
                      }}
                      className="text-[11px] px-2.5 py-0.5 rounded-md font-medium bg-background hover:bg-muted text-foreground border border-border/70 transition-all"
                    >
                      Tomorrow 08:00 AM
                    </button>
                  </div>
                </div>
              </div>

              {/* Dropoff Stop Section */}
              <div className="space-y-3.5 p-4 rounded-xl border bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-destructive ring-4 ring-destructive/20" />
                    Dropoff Destination (Stop Sequence 2)
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {dropoffLat && dropoffLng ? `${dropoffLat.toFixed(4)}, ${dropoffLng.toFixed(4)}` : 'Location not set'}
                  </span>
                </div>

                <LocationPickerMap
                  label="Dropoff Location (Click map or enter address)"
                  lat={dropoffLat}
                  lng={dropoffLng}
                  onChange={(lat: number, lng: number) => { setDropoffLat(lat); setDropoffLng(lng); setError(null); }}
                  name={dropoffName}
                  onNameChange={setDropoffName}
                />

                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="dropoff_time" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-destructive" /> Planned Delivery Deadline <span className="text-destructive">*</span>
                    </Label>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                      Guaranteed SLA Target
                    </span>
                  </div>

                  <DateTimePicker
                    id="dropoff_time"
                    value={dropoffTime}
                    onChange={(val) => {
                      setDropoffTime(val);
                      setError(null);
                    }}
                    placeholder="Select delivery deadline date & time..."
                    label="Delivery Deadline"
                    minDate={pickupTime ? parseISO(pickupTime) : undefined}
                    error={!!error && (!dropoffTime || (!!pickupTime && dropoffTime <= pickupTime))}
                  />

                  {/* Smart Transit Window Offset Presets */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[10px] font-bold text-muted-foreground">
                      <span>Quick Transit Offset (From Pickup):</span>
                      <span>Auto-calculates delivery arrival</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1">
                      <button
                        type="button"
                        onClick={() => applyDropoffOffset(2)}
                        className="text-[11px] px-2.5 py-0.5 rounded-md font-medium bg-background hover:bg-muted text-foreground border border-border/70 transition-all"
                      >
                        +2 Hours
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDropoffOffset(4)}
                        className="text-[11px] px-2.5 py-0.5 rounded-md font-medium bg-background hover:bg-muted text-foreground border border-border/70 transition-all"
                      >
                        +4 Hours
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDropoffOffset(6)}
                        className="text-[11px] px-2.5 py-0.5 rounded-md font-medium bg-background hover:bg-muted text-foreground border border-border/70 transition-all"
                      >
                        +6h Regional
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDropoffOffset(12)}
                        className="text-[11px] px-2.5 py-0.5 rounded-md font-medium bg-background hover:bg-muted text-foreground border border-border/70 transition-all"
                      >
                        +12h Long Haul
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDropoffOffset(24)}
                        className="text-[11px] px-2.5 py-0.5 rounded-md font-medium bg-background hover:bg-muted text-foreground border border-border/70 transition-all"
                      >
                        +24h Next Day
                      </button>
                      <button
                        type="button"
                        onClick={() => applyDropoffOffset(0, true)}
                        className="text-[11px] px-2.5 py-0.5 rounded-md font-medium bg-background hover:bg-muted text-foreground border border-border/70 transition-all"
                      >
                        Same-Day 23:59 EOD
                      </button>
                    </div>
                  </div>
                </div>
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

              {/* Trip Pricing & Rate Card Section */}
              <div className="space-y-4 p-4 rounded-xl border bg-gradient-to-br from-background via-muted/20 to-muted/40 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800">
                      <Receipt className="size-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        Trip Pricing &amp; Tariff
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Contract rate card &amp; trip billing amount (saved to ledger and invoices)
                      </p>
                    </div>
                  </div>

                  {matchedRateCard ? (
                    <Badge variant="outline" className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 border-indigo-200">
                      <Tag className="w-3 h-3 mr-1" />
                      {matchedRateCard.name}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[11px] font-semibold bg-muted text-muted-foreground">
                      Standard Tariff
                    </Badge>
                  )}
                </div>

                {/* Rate Card Context Card */}
                {matchedRateCard && (
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-900 dark:text-indigo-200">
                          {matchedRateCard.name}
                        </span>
                        <span className="text-[10px] text-indigo-600 font-semibold px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/50">
                          {matchedRateCard.route_origin || 'Origin'} → {matchedRateCard.route_destination || 'Destination'}
                        </span>
                      </div>
                      <p className="text-[11px] text-indigo-700 dark:text-indigo-300">
                        Contract Base Rate: <strong className="font-mono font-bold">{matchedRateCard.currency || 'SAR'} {Number(matchedRateCard.base_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setBillingAmount(String(matchedRateCard.base_price));
                        setIsPriceCustomized(false);
                      }}
                      className="h-7 px-2 text-[11px] text-indigo-700 hover:text-indigo-900 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 font-semibold"
                    >
                      Reset to Rate Card
                    </Button>
                  </div>
                )}

                {/* Editable Billing Amount Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="billing_amount" className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-indigo-600" /> Trip Billing Amount (SAR)
                    </Label>
                    <span className="text-[11px] text-muted-foreground font-mono font-semibold">
                      {billingAmount ? `Total: SAR ${Number(billingAmount).toLocaleString()}` : 'Price not set'}
                    </span>
                  </div>

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
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">
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
                onClick={handleSubmit}
                disabled={createMutation.isPending || !isFormValid}
                size="sm"
                className="h-9 px-6 text-xs"
                label={createMutation.isPending ? 'Dispatching...' : 'Dispatch Trip'}
                shortcut={{ key: 'Enter', metaOrControl: true }}
              />
            </CardFooter>
          </Card>
        )}

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
