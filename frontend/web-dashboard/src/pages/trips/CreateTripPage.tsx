import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CalendarDays,
  Sparkles,
  Table2,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Copy,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Calendar,
  Layers,
  FileSpreadsheet,
  Download,
  RotateCcw,
  Clock,
  Moon,
  RefreshCw,
  User,
  Building2,
  MapPin,
  Truck,
  DollarSign,
  Search,
  Link2,
  Phone,
  CreditCard,
  ShieldCheck,
  X,
  ChevronDown,
  Navigation,
  ArrowRight,
  BadgeCheck,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import CreateDriverModal from '@/components/trips/CreateDriverModal';
import CreateThirdPartyModal from '@/components/third-party/CreateThirdPartyModal';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LocationCombobox from '@/components/rate-cards/LocationCombobox';
import TransitTimeBadge from '@/components/trips/TransitTimeBadge';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { customerService } from '@/services/customerService';
import { driverService, Driver } from '@/services/driverService';
import { vehicleService, Vehicle } from '@/services/vehicleService';
import { thirdPartyService, ThirdPartyProvider } from '@/services/thirdPartyService';
import { rateCardService } from '@/services/rateCardService';
import { tripService, CreateTripPayload, BulkImportTripRow, BulkImportResult } from '@/services/tripService';
import { useDeploymentTimezone, localDateTimeToUtcIso } from '@/lib/datetime';
import { VEHICLE_TYPES, RATE_CATEGORIES } from '@mercon/shared-types';
import { monthLabel, shiftMonth } from '@/components/trips/monthly/monthlyBoardUtils';
import { estimateTravelTimeByName, calculateArrivalDropoffTime } from '@/services/travelTimeService';
import { parseSheet, TRIP_COLUMNS } from '@/utils/importUtils';

function MapBoundsAdjuster({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 0) {
      map.fitBounds(points, { padding: [25, 25], maxZoom: 12 });
    }
  }, [points, map]);
  return null;
}

const pickupMarkerIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: rgba(16, 185, 129, 0.2);" class="animate-ping"></div>
      <div style="width: 12px; height: 12px; border-radius: 50%; background: #10B981; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
    </div>
  `,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const dropoffMarkerIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: rgba(249, 115, 22, 0.2);" class="animate-ping"></div>
      <div style="width: 12px; height: 12px; border-radius: 50%; background: #F97316; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
    </div>
  `,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const addDays = (dateStr: string, days: number): string => {
  if (!dateStr) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const REMOVED_MODAL_CATEGORIES = ['10 Hrs Duty', '12 Hrs Duty'];

const MODAL_RATE_CATEGORIES = RATE_CATEGORIES.filter((cat) => !REMOVED_MODAL_CATEGORIES.includes(cat as any)).map(
  (cat) => ((cat as any) === 'Trip/Round Trip' ? 'Round Trip' : cat)
);

const isRoundTripCategory = (cat: string) => {
  const c = (cat || '').toLowerCase().trim();
  return c === 'round trip' || c === 'trip/round trip';
};

const getVehicleTypeFromCapacity = (capacityKg?: number | null): string => {
  const tons = (capacityKg || 24000) / 1000;
  if (tons <= 4) return '3-4 TON';
  if (tons <= 5) return '5 TON';
  if (tons <= 10) return '10 TON';
  if (tons <= 20) return '20 TON';
  return '40 FEET';
};

type CreationMode = 'single' | 'monthly';
type TabMode = 'contract' | 'grid' | 'file';

interface GridTripRow {
  id: string;
  customerId: string;
  date: string;
  driverId: string;
  vehicleId: string;
  rateCategory: string;
  vehicleType: string;
  origin: string;
  destination: string;
  amount: string;
}

export default function CreateTripPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const tz = useDeploymentTimezone();

  // Top-Level Creation Mode State: Daily Single Trip vs Monthly Bulk Contract
  const initialMode = (searchParams.get('mode') === 'monthly' || searchParams.get('mode') === 'bulk') ? 'monthly' : 'single';
  const [creationMode, setCreationMode] = useState<CreationMode>(initialMode);

  // Active Tab for Monthly/Bulk Mode
  const [activeTab, setActiveTab] = useState<TabMode>('contract');

  // Month navigation for contract generator
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);

  // Master Data Queries
  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 150 }),
    enabled: true,
  });

  const { data: driversRes } = useQuery({
    queryKey: ['drivers-select'],
    queryFn: () => driverService.getAll({ per_page: 200 }),
    enabled: true,
  });

  const { data: vehiclesRes } = useQuery({
    queryKey: ['vehicles-select'],
    queryFn: () => vehicleService.getAll({ per_page: 200 }),
    enabled: true,
  });

  const { data: thirdPartyRes } = useQuery({
    queryKey: ['third-party-providers-select'],
    queryFn: () => thirdPartyService.getAll({ per_page: 200 }),
    enabled: true,
  });

  const customers = customersRes?.data ?? [];
  const drivers: Driver[] = driversRes?.data ?? [];
  const vehicles: Vehicle[] = vehiclesRes?.data ?? [];
  const thirdPartyProviders: ThirdPartyProvider[] = thirdPartyRes?.data?.data ?? [];

  const customerOptions = useMemo<ComboboxOption[]>(() => {
    return customers.map((c) => ({
      value: c.id,
      label: c.name,
      keywords: `${c.name} ${c.phone || ''} ${c.payment_terms || ''}`,
    }));
  }, [customers]);

  // Read URL pre-fills
  const prefilledCustId = searchParams.get('customerId') || '';
  const prefilledDriverId = searchParams.get('driverId') || '';
  const prefilledIs3PL = searchParams.get('thirdParty') === '1';
  const prefilledProviderId = searchParams.get('providerId') || '';

  // -------------------------------------------------------------
  // SINGLE TRIP CREATION STATE & LOGIC
  // -------------------------------------------------------------
  const [singleCustomer, setSingleCustomer] = useState(prefilledCustId);
  const [singleRateCategory, setSingleRateCategory] = useState<string>(MODAL_RATE_CATEGORIES[0] || 'Trip');
  const [singleVehicleType, setSingleVehicleType] = useState<string>(VEHICLE_TYPES[0] || 'Flatbed');
  const [singleOrigin, setSingleOrigin] = useState('');
  const [singleOriginLocationId, setSingleOriginLocationId] = useState<string | null>(null);
  const [singleOriginLat, setSingleOriginLat] = useState<number | null>(null);
  const [singleOriginLng, setSingleOriginLng] = useState<number | null>(null);
  const [singleDestination, setSingleDestination] = useState('');
  const [singleDestinationLocationId, setSingleDestinationLocationId] = useState<string | null>(null);
  const [singleDestinationLat, setSingleDestinationLat] = useState<number | null>(null);
  const [singleDestinationLng, setSingleDestinationLng] = useState<number | null>(null);
  const [singleDate, setSingleDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [singlePickupTime, setSinglePickupTime] = useState<string>('08:00');
  const [singleDropoffDate, setSingleDropoffDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [singleDropoffTime, setSingleDropoffTime] = useState<string>('14:00');
  const [singleIsOvernight, setSingleIsOvernight] = useState<boolean>(false);
  const [singleIntermediateLocations, setSingleIntermediateLocations] = useState<string[]>([]);
  const [singleIntermediateStopFees, setSingleIntermediateStopFees] = useState<string[]>([]);
  const [singleAssignmentType, setSingleAssignmentType] = useState<'own' | 'third_party'>(
    prefilledIs3PL ? 'third_party' : 'own'
  );
  const [singleDriver, setSingleDriver] = useState<string>(prefilledDriverId);
  const [singleVehicle, setSingleVehicle] = useState<string>('');
  const [single3PLProviderId, setSingle3PLProviderId] = useState<string>(prefilledProviderId);
  const [single3PLDriverName, setSingle3PLDriverName] = useState<string>('');
  const [single3PLDriverPhone, setSingle3PLDriverPhone] = useState<string>('');
  const [single3PLVehiclePlate, setSingle3PLVehiclePlate] = useState<string>('');
  const [single3PLCost, setSingle3PLCost] = useState<string>('');
  const [singleBillingAmount, setSingleBillingAmount] = useState<string>('');
  const [singleRateMatched, setSingleRateMatched] = useState<boolean>(false);
  const [singleNotes, setSingleNotes] = useState<string>('');
  const [singleTravelTimeEstimate, setSingleTravelTimeEstimate] = useState<{ durationMinutes: number; distanceKm: number } | null>(null);

  // Sync Customer Pre-fill
  useEffect(() => {
    if (prefilledCustId && customers.length > 0) {
      setSingleCustomer(prefilledCustId);
      setContractCustomer(prefilledCustId);
    }
  }, [prefilledCustId, customers]);

  // Sync Driver Pre-fill & Auto-vehicle assignment for Single Trip
  useEffect(() => {
    if (prefilledDriverId && drivers.length > 0) {
      setSingleDriver(prefilledDriverId);
      const drv = drivers.find((d) => d.id === prefilledDriverId);
      if (drv) {
        const vehId = drv.assignedVehicleId || (drv.assignedVehicle as any)?.id;
        if (vehId) setSingleVehicle(vehId);
      }
    }
  }, [prefilledDriverId, drivers]);

  // Handle Single Driver Change
  const handleSingleDriverChange = (driverId: string) => {
    setSingleDriver(driverId);
    if (!driverId || driverId === 'unassigned') return;
    const selectedDriver = drivers.find((d) => d.id === driverId);
    if (!selectedDriver) return;
    const embeddedVehicle =
      selectedDriver.assignedVehicle && typeof selectedDriver.assignedVehicle === 'object'
        ? (selectedDriver.assignedVehicle as any)
        : null;
    const vehicleId = selectedDriver.assignedVehicleId || embeddedVehicle?.id || (selectedDriver as any).assigned_vehicle_id;
    if (vehicleId) {
      setSingleVehicle(vehicleId);
      const vehicleData = embeddedVehicle || vehicles.find((v) => v.id === vehicleId);
      if (vehicleData) {
        const capacity = vehicleData.capacity_kg ?? vehicleData.capacityKg ?? 24000;
        setSingleVehicleType(getVehicleTypeFromCapacity(capacity));
      }
    }
  };

  // Single Trip Origin/Destination Rate Card Auto Lookup & Travel Estimate
  const handleSingleLocationChange = (
    field: 'origin' | 'destination',
    locName: string,
    locObj: import('@/services/locationService').Location | null
  ) => {
    const isOrigin = field === 'origin';
    if (isOrigin) {
      setSingleOrigin(locName);
      setSingleOriginLocationId(locObj?.id ?? null);
      setSingleOriginLat(locObj?.lat ?? null);
      setSingleOriginLng(locObj?.lng ?? null);
    } else {
      setSingleDestination(locName);
      setSingleDestinationLocationId(locObj?.id ?? null);
      setSingleDestinationLat(locObj?.lat ?? null);
      setSingleDestinationLng(locObj?.lng ?? null);
    }

    setSingleRateMatched(false);
    const originVal = isOrigin ? locName : singleOrigin;
    const destVal = isOrigin ? singleDestination : locName;
    const originId = isOrigin ? (locObj?.id ?? null) : singleOriginLocationId;
    const destId = isOrigin ? singleDestinationLocationId : (locObj?.id ?? null);

    // Auto travel-time estimation
    if (originVal.trim() && destVal.trim()) {
      estimateTravelTimeByName(originVal, destVal)
        .then((est) => {
          if (est) {
            setSingleTravelTimeEstimate({ durationMinutes: est.durationMinutes, distanceKm: est.distanceKm });
            const arrival = calculateArrivalDropoffTime(singlePickupTime, est.durationMinutes);
            setSingleDropoffTime(arrival.dropoffTime);
            setSingleIsOvernight(arrival.isOvernight);
            if (arrival.isOvernight) setSingleDropoffDate(addDays(singleDate, 1));
          }
        })
        .catch(() => {});
    }

    // Rate Card Lookup
    if (singleCustomer && originId && destId) {
      rateCardService
        .lookup({
          customer_id: singleCustomer,
          origin_location_id: originId,
          destination_location_id: destId,
        })
        .then((res) => {
          if (res?.rate_card?.base_price != null) {
            setSingleBillingAmount(String(res.rate_card.base_price));
            setSingleRateMatched(true);
            if (res.rate_card.vehicle_type) setSingleVehicleType(res.rate_card.vehicle_type);
            if (res.rate_card.rate_category) setSingleRateCategory(res.rate_card.rate_category);
          }
        })
        .catch(() => {});
    }
  };

  // Map route points calculation
  const singleMapPoints = useMemo<[number, number][]>(() => {
    const points: [number, number][] = [];
    if (singleOriginLat && singleOriginLng) points.push([singleOriginLat, singleOriginLng]);
    if (singleDestinationLat && singleDestinationLng) points.push([singleDestinationLat, singleDestinationLng]);
    return points;
  }, [singleOriginLat, singleOriginLng, singleDestinationLat, singleDestinationLng]);

  // Single Trip Submission Mutation
  const singleTripMutation = useMutation({
    mutationFn: (payload: CreateTripPayload) => tripService.create(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success(`Trip ${data.ref_id || ''} created successfully.`);
      navigate('/trips');
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Failed to create trip.');
    },
  });

  const handleSingleTripSubmit = (status: 'Dispatched' | 'Draft' = 'Dispatched') => {
    if (!singleCustomer) {
      toast.error('Please select a Customer Account.');
      return;
    }
    if (!singleOrigin.trim() || !singleDestination.trim()) {
      toast.error('Please enter both Origin and Destination.');
      return;
    }

    const stopsList: Array<{ stop_type: string; lat: number; lng: number; location_name?: string; location_address?: string }> = [];

    // Pickup stop
    stopsList.push({
      stop_type: 'Pickup',
      lat: singleOriginLat || 24.7136,
      lng: singleOriginLng || 46.6753,
      location_name: singleOrigin,
      location_address: singleOrigin,
    });

    // Intermediate stops
    singleIntermediateLocations.forEach((loc) => {
      if (loc.trim()) {
        stopsList.push({
          stop_type: 'Rest',
          lat: 24.7136,
          lng: 46.6753,
          location_name: loc.trim(),
          location_address: loc.trim(),
        });
      }
    });

    // Dropoff stop
    stopsList.push({
      stop_type: 'Dropoff',
      lat: singleDestinationLat || 24.7136,
      lng: singleDestinationLng || 46.6753,
      location_name: singleDestination,
      location_address: singleDestination,
    });

    const outboundFeesSum = singleIntermediateStopFees.reduce((sum, f) => sum + (Number(f) || 0), 0);
    const baseAmount = Number(singleBillingAmount) || 0;
    const totalAmount = baseAmount + outboundFeesSum;

    const plannedStartIso = localDateTimeToUtcIso(singleDate, singlePickupTime, tz);
    const plannedEndIso = localDateTimeToUtcIso(singleDropoffDate, singleDropoffTime, tz);

    if (singleAssignmentType === 'third_party') {
      const costVal = single3PLCost ? Number(single3PLCost) : undefined;
      singleTripMutation.mutate({
        customer_id: singleCustomer,
        planned_start: plannedStartIso,
        planned_end: plannedEndIso,
        is_third_party: true,
        third_party_provider_id: single3PLProviderId || undefined,
        third_party_driver_name: single3PLDriverName.trim() || undefined,
        third_party_driver_phone: single3PLDriverPhone.trim() || undefined,
        third_party_vehicle_plate: single3PLVehiclePlate.trim() || undefined,
        third_party_vehicle_type: singleVehicleType || undefined,
        third_party_cost: costVal,
        trip_charges: outboundFeesSum > 0 ? outboundFeesSum : undefined,
        rate_category: singleRateCategory,
        vehicle_type: singleVehicleType,
        billing_amount: totalAmount > 0 ? totalAmount : undefined,
        status: (single3PLProviderId || single3PLVehiclePlate) ? status : 'Draft',
        stops: stopsList as any,
      });
    } else {
      singleTripMutation.mutate({
        customer_id: singleCustomer,
        driver_id: singleDriver && singleDriver !== 'unassigned' ? singleDriver : undefined,
        vehicle_id: singleVehicle && singleVehicle !== 'unassigned' ? singleVehicle : undefined,
        planned_start: plannedStartIso,
        planned_end: plannedEndIso,
        rate_category: singleRateCategory,
        vehicle_type: singleVehicleType,
        billing_amount: totalAmount > 0 ? totalAmount : undefined,
        trip_charges: outboundFeesSum > 0 ? outboundFeesSum : undefined,
        status: singleDriver && singleVehicle ? status : 'Draft',
        stops: stopsList as any,
      });
    }
  };

  // -------------------------------------------------------------
  // MONTHLY CONTRACT BATCH GENERATOR STATE & LOGIC
  // -------------------------------------------------------------
  const [assignmentType, setAssignmentType] = useState<'own' | 'third_party'>('own');
  const [masterDriver, setMasterDriver] = useState('');
  const [masterVehicle, setMasterVehicle] = useState('');
  const [isVehicleTypeEditable, setIsVehicleTypeEditable] = useState(false);

  const [thirdPartyProviderId, setThirdPartyProviderId] = useState('');
  const [thirdPartyDriverName, setThirdPartyDriverName] = useState('');
  const [thirdPartyDriverPhone, setThirdPartyDriverPhone] = useState('');
  const [thirdPartyVehiclePlate, setThirdPartyVehiclePlate] = useState('');
  const [thirdPartyCost, setThirdPartyCost] = useState('');
  const [isCreateProviderOpen, setIsCreateProviderOpen] = useState(false);

  const driverOptions = useMemo<ComboboxOption[]>(() => {
    return drivers
      .filter(
        (d) =>
          (d.status === 'Available' || d.status?.toLowerCase() === 'available' || d.id === masterDriver || d.id === singleDriver) &&
          d.isActive !== false
      )
      .map((d) => {
        const assignedVeh =
          d.assignedVehicle && typeof d.assignedVehicle === 'object'
            ? (d.assignedVehicle as any)
            : vehicles.find((v) => v.id === (d.assignedVehicleId || (d as any).assigned_vehicle_id));

        const capacityKg = assignedVeh?.capacity_kg ?? (assignedVeh as any)?.capacityKg;
        const capacityLabel = capacityKg ? getVehicleTypeFromCapacity(capacityKg) : '';

        const label = capacityLabel
          ? `${d.first_name} ${d.last_name} (${capacityLabel})`
          : `${d.first_name} ${d.last_name}`;

        return {
          value: d.id,
          label,
          keywords: `${d.first_name} ${d.last_name} ${d.phone_primary || ''} ${d.license_number || ''} ${capacityLabel}`,
        };
      });
  }, [drivers, vehicles, masterDriver, singleDriver]);

  const [contractStep, setContractStep] = useState<1 | 2 | 3 | 4>(1);
  const [contractCustomer, setContractCustomer] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [contractRateCategory, setContractRateCategory] = useState<string>(MODAL_RATE_CATEGORIES[0] || 'Trip');
  const [contractVehicleType, setContractVehicleType] = useState<string>(VEHICLE_TYPES[0] || 'Flatbed');

  const [contractSlots, setContractSlots] = useState<
    Array<{
      id: string;
      origin: string;
      destination: string;
      originLocationId?: string | null;
      destinationLocationId?: string | null;
      rateMatched?: boolean;
      pickupTime: string;
      dropoffTime: string;
      date: string;
      dropoffDate: string;
      billingAmount: string;
      isOvernight?: boolean;
      intermediateLocations: string[];
      intermediateStopFees?: string[];
      returnOrigin?: string;
      returnDestination?: string;
      returnPickupTime?: string;
      returnDropoffTime?: string;
      returnIsOvernight?: boolean;
      returnIntermediateLocations?: string[];
      returnIntermediateStopFees?: string[];
      originLat?: number | null;
      originLng?: number | null;
      destinationLat?: number | null;
      destinationLng?: number | null;
    }>
  >([
    {
      id: 'slot-1',
      origin: '',
      destination: '',
      originLocationId: null,
      destinationLocationId: null,
      rateMatched: false,
      pickupTime: '08:00',
      dropoffTime: '14:00',
      date: new Date().toISOString().slice(0, 10),
      dropoffDate: new Date().toISOString().slice(0, 10),
      billingAmount: '',
      isOvernight: false,
      intermediateLocations: [],
      intermediateStopFees: [],
      originLat: null,
      originLng: null,
      destinationLat: null,
      destinationLng: null,
    },
  ]);

  const handleSlotLocationChange = (
    slotId: string,
    field: 'origin' | 'destination',
    locName: string,
    locObj: import('@/services/locationService').Location | null
  ) => {
    const locationId = locObj?.id ?? null;
    const isOrigin = field === 'origin';
    handleUpdateTripSlot(slotId, { [field]: locName });

    setContractSlots((prev) =>
      prev.map((s) =>
        s.id !== slotId
          ? s
          : {
              ...s,
              [field]: locName,
              [isOrigin ? 'originLocationId' : 'destinationLocationId']: locationId,
              [isOrigin ? 'originLat' : 'destinationLat']: locObj?.lat ?? null,
              [isOrigin ? 'originLng' : 'destinationLng']: locObj?.lng ?? null,
              rateMatched: false,
            }
      )
    );

    setContractSlots((prev) => {
      const slot = prev.find((s) => s.id === slotId);
      if (!slot || !contractCustomer) return prev;
      const originId = isOrigin ? locationId : slot.originLocationId;
      const destId = isOrigin ? slot.destinationLocationId : locationId;
      if (!originId || !destId) return prev;

      rateCardService
        .lookup({
          customer_id: contractCustomer,
          origin_location_id: originId,
          destination_location_id: destId,
        })
        .then((result) => {
          const card = result?.rate_card;
          if (card?.base_price != null) {
            const price = String(card.base_price);
            if (card.vehicle_type) setContractVehicleType(card.vehicle_type);
            if (card.rate_category) setContractRateCategory(card.rate_category);
            setIsVehicleTypeEditable(false);
            setContractSlots((prev2) =>
              prev2.map((s) => (s.id === slotId ? { ...s, billingAmount: price, rateMatched: true } : s))
            );
          }
        })
        .catch(() => {});

      return prev;
    });
  };

  const handleAddTripSlot = () => {
    const nextNum = contractSlots.length + 1;
    const defaultTime = nextNum === 2 ? '14:00' : nextNum === 3 ? '20:00' : '08:00';
    setContractSlots((prev) => [
      ...prev,
      {
        id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        origin: prev[0]?.origin || '',
        destination: prev[0]?.destination || '',
        pickupTime: defaultTime,
        dropoffTime: '14:00',
        date: prev[0]?.date || new Date().toISOString().slice(0, 10),
        dropoffDate: prev[0]?.dropoffDate || new Date().toISOString().slice(0, 10),
        billingAmount: prev[0]?.billingAmount || '',
        isOvernight: false,
        intermediateLocations: [...(prev[0]?.intermediateLocations || [])],
        intermediateStopFees: [...(prev[0]?.intermediateStopFees || [])],
      },
    ]);
  };

  // Clone/Duplicate Slot Feature (UX Enhancement)
  const handleCloneTripSlot = (slotId: string) => {
    const targetSlot = contractSlots.find((s) => s.id === slotId);
    if (!targetSlot) return;
    const clonedSlot = {
      ...targetSlot,
      id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      intermediateLocations: [...targetSlot.intermediateLocations],
      intermediateStopFees: [...(targetSlot.intermediateStopFees || [])],
    };
    setContractSlots((prev) => [...prev, clonedSlot]);
    toast.success('Trip slot cloned successfully.');
  };

  const handleRemoveTripSlot = (id: string) => {
    if (contractSlots.length <= 1) return;
    setContractSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdateTripSlot = (id: string, updates: Partial<(typeof contractSlots)[0]>) => {
    setContractSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));

    if (
      updates.origin !== undefined ||
      updates.destination !== undefined ||
      updates.date !== undefined ||
      updates.pickupTime !== undefined
    ) {
      const slot = contractSlots.find((s) => s.id === id);
      if (slot) {
        const origin = updates.origin !== undefined ? updates.origin : slot.origin;
        const destination = updates.destination !== undefined ? updates.destination : slot.destination;
        const date = updates.date !== undefined ? updates.date : slot.date;
        const pickupTime = updates.pickupTime !== undefined ? updates.pickupTime : slot.pickupTime;

        if (origin.trim() && destination.trim()) {
          estimateTravelTimeByName(origin, destination)
            .then((estimate) => {
              if (estimate) {
                const arrival = calculateArrivalDropoffTime(pickupTime, estimate.durationMinutes);
                const dropoffDate = arrival.isOvernight ? addDays(date, 1) : date;
                setContractSlots((prev) =>
                  prev.map((s) =>
                    s.id === id
                      ? {
                          ...s,
                          dropoffTime: arrival.dropoffTime,
                          dropoffDate,
                          isOvernight: arrival.isOvernight,
                        }
                      : s
                  )
                );
              }
            })
            .catch(() => {});
        }
      }
    }
  };

  const handleAddSlotIntermediate = (slotId: string) => {
    setContractSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? {
              ...s,
              intermediateLocations: [...s.intermediateLocations, ''],
              intermediateStopFees: [...(s.intermediateStopFees || []), ''],
            }
          : s
      )
    );
  };

  const handleRemoveSlotIntermediate = (slotId: string, idx: number) => {
    setContractSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? {
              ...s,
              intermediateLocations: s.intermediateLocations.filter((_, i) => i !== idx),
              intermediateStopFees: (s.intermediateStopFees || []).filter((_, i) => i !== idx),
            }
          : s
      )
    );
  };

  const handleUpdateSlotIntermediate = (slotId: string, idx: number, val: string) => {
    setContractSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        const nextLocs = [...s.intermediateLocations];
        nextLocs[idx] = val;
        return { ...s, intermediateLocations: nextLocs };
      })
    );
  };

  const handleUpdateSlotIntermediateFee = (slotId: string, idx: number, val: string) => {
    setContractSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        const nextFees = [...(s.intermediateStopFees || [])];
        nextFees[idx] = val;
        return { ...s, intermediateStopFees: nextFees };
      })
    );
  };

  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [dayAssignments, setDayAssignments] = useState<Record<string, { driverId: string; vehicleId: string }>>({});
  const [assignMode, setAssignMode] = useState<'single' | 'alternating'>('single');
  const [isCreateDriverOpen, setIsCreateDriverOpen] = useState(false);

  const isStepValid = (step: number): boolean => {
    if (step === 1) return Boolean(contractCustomer);
    if (step === 2) {
      return (
        contractSlots.length > 0 &&
        contractSlots.every((slot) => slot.date && slot.origin.trim() && slot.destination.trim() && slot.pickupTime && slot.dropoffTime)
      );
    }
    if (step === 3) {
      if (assignmentType === 'own') {
        return Boolean(masterVehicle && masterVehicle !== 'unassigned');
      } else {
        return Boolean(thirdPartyProviderId || thirdPartyVehiclePlate.trim());
      }
    }
    return true;
  };

  const canNavigateToStep = (targetStep: number): boolean => {
    if (targetStep <= contractStep) return true;
    for (let s = 1; s < targetStep; s++) {
      if (!isStepValid(s)) return false;
    }
    return true;
  };

  const handleDriverChange = (driverId: string) => {
    setMasterDriver(driverId);
    if (!driverId || driverId === 'unassigned') return;
    const selectedDriver = drivers.find((d) => d.id === driverId);
    if (!selectedDriver) return;
    const embeddedVehicle =
      selectedDriver.assignedVehicle && typeof selectedDriver.assignedVehicle === 'object'
        ? (selectedDriver.assignedVehicle as any)
        : null;
    const vehicleId = selectedDriver.assignedVehicleId || embeddedVehicle?.id || (selectedDriver as any).assigned_vehicle_id;
    if (!vehicleId) return;
    setMasterVehicle(vehicleId);

    const vehicleData = embeddedVehicle || vehicles.find((v) => v.id === vehicleId);
    if (vehicleData) {
      const capacity = vehicleData.capacity_kg ?? vehicleData.capacityKg ?? 24000;
      setContractVehicleType(getVehicleTypeFromCapacity(capacity));
      setIsVehicleTypeEditable(false);
    }
  };

  const handleVehicleChange = (vehicleId: string) => {
    setMasterVehicle(vehicleId);
    if (vehicleId && vehicleId !== 'unassigned') {
      const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
      if (selectedVehicle) {
        setContractVehicleType(getVehicleTypeFromCapacity(selectedVehicle.capacity_kg));
        setIsVehicleTypeEditable(false);
      }
    }
  };

  const [loopDriverA, setLoopDriverA] = useState('');
  const [loopVehicleA, setLoopVehicleA] = useState('');
  const [loopDriverB, setLoopDriverB] = useState('');
  const [loopVehicleB, setLoopVehicleB] = useState('');

  const batchTripRows = useMemo(() => {
    const list: Array<{
      key: string;
      dateStr: string;
      formattedDate: string;
      slotLabel: string;
      pickupTime: string;
      isOvernight?: boolean;
    }> = [];

    contractSlots.forEach((slot, slotIdx) => {
      const dateStr = slot.date || new Date().toISOString().slice(0, 10);
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const formattedDate = dateObj.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      list.push({
        key: slot.id,
        dateStr,
        formattedDate,
        slotLabel: `Slot #${slotIdx + 1}`,
        pickupTime: slot.pickupTime,
        isOvernight: slot.isOvernight,
      });
    });

    return list;
  }, [contractSlots]);

  const applyMasterToAll = () => {
    setDayAssignments((prev) => {
      const next = { ...prev };
      batchTripRows.forEach((row) => {
        next[row.key] = {
          driverId: masterDriver !== 'unassigned' && masterDriver ? masterDriver : '',
          vehicleId: masterVehicle !== 'unassigned' && masterVehicle ? masterVehicle : '',
        };
      });
      return next;
    });
  };

  const applyAlternatingLoop = () => {
    const newAssignments: Record<string, { driverId: string; vehicleId: string }> = {};
    batchTripRows.forEach((row, index) => {
      const isEven = index % 2 === 0;
      const drv = isEven ? loopDriverA : loopDriverB;
      const veh = isEven ? loopVehicleA : loopVehicleB;
      newAssignments[row.key] = {
        driverId: drv === 'unassigned' ? '' : drv,
        vehicleId: veh === 'unassigned' ? '' : veh,
      };
    });
    setDayAssignments((prev) => ({ ...prev, ...newAssignments }));
  };

  const monthDates = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const totalDays = new Date(year, month, 0).getDate();
    const days: Array<{ dateStr: string; dayNumber: number; dayOfWeek: number; dayName: string }> = [];

    for (let d = 1; d <= totalDays; d++) {
      const dateObj = new Date(year, month - 1, d);
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dateStr,
        dayNumber: d,
        dayOfWeek: dateObj.getDay(),
        dayName: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
      });
    }
    return days;
  }, [selectedMonth]);

  const selectPreset = (type: 'weekdays' | 'mwf' | 'daily' | 'clear') => {
    if (type === 'clear') {
      setSelectedDates([]);
      return;
    }
    const matched = monthDates
      .filter((d) => {
        if (type === 'weekdays') return d.dayOfWeek >= 0 && d.dayOfWeek <= 4;
        if (type === 'mwf') return d.dayOfWeek === 1 || d.dayOfWeek === 3 || d.dayOfWeek === 5;
        if (type === 'daily') return true;
        return false;
      })
      .map((d) => d.dateStr);

    setSelectedDates(matched);
  };

  useEffect(() => {
    setDayAssignments((prev) => {
      const next: Record<string, { driverId: string; vehicleId: string }> = {};
      selectedDates.forEach((date) => {
        next[date] = prev[date] || { driverId: '', vehicleId: '' };
      });
      return next;
    });
  }, [selectedDates]);

  // -------------------------------------------------------------
  // QUICK GRID & FILE IMPORT STATE
  // -------------------------------------------------------------
  const generateEmptyRow = (): GridTripRow => ({
    id: Math.random().toString(36).substring(2, 9),
    customerId: customers[0]?.id || '',
    date: new Date().toISOString().slice(0, 10),
    driverId: '',
    vehicleId: '',
    rateCategory: MODAL_RATE_CATEGORIES[0] || 'Trip',
    vehicleType: VEHICLE_TYPES[0] || 'Flatbed',
    origin: '',
    destination: '',
    amount: '',
  });

  const [gridRows, setGridRows] = useState<GridTripRow[]>([generateEmptyRow(), generateEmptyRow(), generateEmptyRow()]);

  const updateGridRow = (id: string, updates: Partial<GridTripRow>) => {
    setGridRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...updates } : row)));
  };

  const deleteGridRow = (id: string) => {
    setGridRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const duplicateGridRow = (row: GridTripRow) => {
    setGridRows((prev) => [...prev, { ...row, id: Math.random().toString(36).substring(2, 9) }]);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Array<BulkImportTripRow>>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const handleFileUpload = async (file: File) => {
    setImportedFile(file);
    setParseError(null);
    setIsParsing(true);
    try {
      if (file.name.endsWith('.csv')) {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length <= 1) throw new Error('The CSV file does not contain any data rows.');
        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/"/g, ''));
        const rows: BulkImportTripRow[] = [];

        for (let i = 1; i < lines.length; i++) {
          const cells = lines[i].split(',').map((c) => c.trim().replace(/"/g, ''));
          if (cells.length === 0 || !cells[0]) continue;
          const rowObj: any = {};
          headers.forEach((h, idx) => {
            const val = cells[idx] || '';
            if (h.includes('customer') || h.includes('company')) rowObj.customer_name = val;
            else if (h.includes('date') || h.includes('start')) rowObj.planned_start = val;
            else if (h.includes('driver')) rowObj.driver_name = val;
            else if (h.includes('vehicle') || h.includes('plate')) rowObj.vehicle_plate = val;
            else if (h.includes('origin') || h.includes('from')) rowObj.origin = val;
            else if (h.includes('dest') || h.includes('to')) rowObj.destination = val;
            else if (h.includes('category')) rowObj.rate_category = val;
            else if (h.includes('type')) rowObj.vehicle_type = val;
            else if (h.includes('amount') || h.includes('price')) rowObj.billing_amount = Number(val) || undefined;
          });

          if (rowObj.customer_name) rows.push(rowObj);
        }
        setParsedRows(rows);
      } else {
        const result = await parseSheet(file, TRIP_COLUMNS, 'trip');
        const rows: BulkImportTripRow[] = result.rows
          .map((r) => ({
            customer_name: String(r.customer_name || ''),
            planned_start: r.planned_start ? String(r.planned_start) : undefined,
            driver_name: r.driver_name ? String(r.driver_name) : undefined,
            vehicle_plate: r.vehicle_plate ? String(r.vehicle_plate) : undefined,
            rate_category: r.rate_category ? String(r.rate_category) : undefined,
            vehicle_type: r.vehicle_type ? String(r.vehicle_type) : undefined,
            origin: r.origin ? String(r.origin) : undefined,
            destination: r.destination ? String(r.destination) : undefined,
            billing_amount: r.billing_amount ? Number(r.billing_amount) : undefined,
          }))
          .filter((r) => Boolean(r.customer_name));
        setParsedRows(rows);
      }
    } catch (e: any) {
      setParseError(e.message || 'Failed to read spreadsheet file');
    } finally {
      setIsParsing(false);
    }
  };

  const downloadSampleCsv = () => {
    const csvContent =
      'Company Name,Trip Date,Driver Name,Vehicle Plate,Rate Category,Vehicle Type,Origin,Destination,Amount\n' +
      'ARKAN Logistics,2026-08-14,Ahmed Al-Ghamdi,KSA-1029,Standard,Flatbed,Riyadh Yard 1,Jeddah Port,3500\n' +
      'Saudi Aramco,2026-08-15,Mohammed Ali,KSA-8842,Express,Reefer,Dammam Hub,Riyadh Distribution,4200\n' +
      'SABIC Logistics,2026-08-16,,,Standard,Flatbed,Jubail Industrial,Yanbu Depot,2800\n';

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'MERCON_Bulk_Trips_Template.csv';
    link.click();
  };

  // Bulk Mutation
  const [submissionResult, setSubmissionResult] = useState<BulkImportResult | null>(null);

  const bulkMutation = useMutation({
    mutationFn: (rows: BulkImportTripRow[]) => tripService.bulkImport(rows),
    onSuccess: (data) => {
      setSubmissionResult(data);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success('Trips generated successfully.');
    },
  });

  const handleContractSubmit = () => {
    if (!contractCustomer || contractSlots.length === 0) return;
    const rows: BulkImportTripRow[] = [];

    contractSlots.forEach((slot) => {
      const date = slot.date || new Date().toISOString().slice(0, 10);
      const assignment = dayAssignments[slot.id] || { driverId: '', vehicleId: '' };
      const outboundStops = slot.intermediateLocations.map((s) => s.trim()).filter(Boolean);
      const outboundFeesSum = (slot.intermediateStopFees || []).reduce((sum, f) => sum + (Number(f) || 0), 0);
      const baseAmount = Number(slot.billingAmount) || 0;
      const totalAmount = baseAmount + outboundFeesSum;

      let destString = slot.destination.trim();
      if (outboundStops.length > 0) {
        destString = `${outboundStops.join(' → ')} → ${slot.destination.trim()}`;
      }

      const dropoffDateVal = slot.dropoffDate || date;
      const planned_end_val = localDateTimeToUtcIso(dropoffDateVal, slot.dropoffTime, tz);

      if (assignmentType === 'third_party') {
        const costVal = thirdPartyCost ? Number(thirdPartyCost) : 0;
        rows.push({
          customer_id: contractCustomer,
          planned_start: localDateTimeToUtcIso(date, slot.pickupTime, tz),
          planned_end: planned_end_val,
          is_third_party: true,
          third_party_provider_id: thirdPartyProviderId || undefined,
          third_party_driver_name: thirdPartyDriverName.trim() || undefined,
          third_party_driver_phone: thirdPartyDriverPhone.trim() || undefined,
          third_party_vehicle_plate: thirdPartyVehiclePlate.trim() || undefined,
          third_party_vehicle_type: contractVehicleType || undefined,
          third_party_cost: costVal,
          trip_charges: costVal,
          rate_category: contractRateCategory || undefined,
          vehicle_type: contractVehicleType || undefined,
          origin: slot.origin.trim() || undefined,
          destination: destString || undefined,
          billing_amount: totalAmount > 0 ? totalAmount : undefined,
          status: thirdPartyProviderId || thirdPartyVehiclePlate ? 'Dispatched' : 'Draft',
        });
      } else {
        const driverId = masterDriver && masterDriver !== 'unassigned' ? masterDriver : assignment.driverId || undefined;
        const vehicleId = masterVehicle && masterVehicle !== 'unassigned' ? masterVehicle : assignment.vehicleId || undefined;
        rows.push({
          customer_id: contractCustomer,
          planned_start: localDateTimeToUtcIso(date, slot.pickupTime, tz),
          planned_end: planned_end_val,
          driver_id: driverId,
          vehicle_id: vehicleId,
          rate_category: contractRateCategory || undefined,
          vehicle_type: contractVehicleType || undefined,
          origin: slot.origin.trim() || undefined,
          destination: destString || undefined,
          billing_amount: totalAmount > 0 ? totalAmount : undefined,
          status: driverId && vehicleId ? 'Dispatched' : 'Draft',
        });
      }
    });

    bulkMutation.mutate(rows);
  };

  const handleGridSubmit = () => {
    const validRows = gridRows.filter((r) => r.customerId && r.date);
    if (validRows.length === 0) return;
    const rows: BulkImportTripRow[] = validRows.map((r) => ({
      customer_id: r.customerId,
      planned_start: r.date,
      driver_id: r.driverId || undefined,
      vehicle_id: r.vehicleId || undefined,
      rate_category: r.rateCategory || undefined,
      vehicle_type: r.vehicleType || undefined,
      origin: r.origin.trim() || undefined,
      destination: r.destination.trim() || undefined,
      billing_amount: r.amount ? Number(r.amount) : undefined,
      status: r.driverId && r.vehicleId ? 'Dispatched' : 'Draft',
    }));
    bulkMutation.mutate(rows);
  };

  const handleFileSubmit = () => {
    if (parsedRows.length === 0) return;
    bulkMutation.mutate(parsedRows);
  };

  const resetAll = () => {
    setContractStep(1);
    setSelectedDates([]);
    setDayAssignments({});
    setSubmissionResult(null);
    setParsedRows([]);
    setImportedFile(null);
    setParseError(null);
    bulkMutation.reset();
  };

  const handleClose = () => {
    resetAll();
    navigate('/trips');
  };

  const handleDriverCreated = (newDriver: Driver) => {
    queryClient.invalidateQueries({ queryKey: ['drivers'] });
    queryClient.invalidateQueries({ queryKey: ['drivers-select'] });
    if (creationMode === 'single') {
      setSingleDriver(newDriver.id);
    } else {
      if (assignMode === 'single') {
        setMasterDriver(newDriver.id);
      } else {
        setLoopDriverA(newDriver.id);
      }
    }
    toast.success(`Driver ${newDriver.first_name} ${newDriver.last_name} created successfully.`);
  };

  return (
    <DashboardLayout active="Trips" title="Create New Trip" hideBackButton>
      <div className="px-3 sm:px-6 pb-4 animate-fade-in max-w-[1350px] mx-auto w-full flex flex-col min-h-0">
        
        {/* Main Card Container */}
        <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl flex flex-col overflow-hidden min-h-[calc(100vh-130px)]">

          {/* Top Bar Header & Creation Mode Selector */}
          <div className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-5 py-3 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-brand" />
                  Trip Dispatch Studio
                </span>
                <Badge className="bg-brand/10 text-brand border-brand/20 font-bold text-[10px]">
                  Operations Module
                </Badge>
              </div>

              {/* Top-Level Mode Selector Pill */}
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setCreationMode('single')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    creationMode === 'single'
                      ? 'bg-brand text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Daily / Single Local Trip
                </button>
                <button
                  type="button"
                  onClick={() => setCreationMode('monthly')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                    creationMode === 'monthly'
                      ? 'bg-brand text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  Monthly Contract / Bulk Add
                </button>
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Close and Return to Trips"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* MODE 1: DAILY / SINGLE LOCAL TRIP */}
          {creationMode === 'single' && (
            <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-y-auto custom-scrollbar">
              
              {/* Left Column: Form Controls */}
              <div className="flex-1 p-5 lg:p-6 space-y-6 border-b lg:border-b-0 lg:border-r border-slate-200/80 dark:border-slate-800">
                
                {/* 1. Customer Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-brand" />
                      1. Customer Account & Category
                    </h4>
                    {singleCustomer && (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px] gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Account Selected
                      </Badge>
                    )}
                  </div>

                  {/* Frequent Shippers */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {customers.slice(0, 4).map((c, idx) => {
                      const isSel = singleCustomer === c.id;
                      const initials = c.name.substring(0, 2).toUpperCase();
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSingleCustomer(c.id);
                            handleSingleLocationChange('origin', singleOrigin, null);
                          }}
                          className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                            isSel
                              ? 'bg-orange-50/80 border-brand ring-1 ring-brand/20 shadow-2xs'
                              : 'bg-slate-50/60 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-lg font-bold text-xs grid place-items-center shrink-0 ${
                              isSel ? 'bg-brand text-white' : 'bg-slate-200 text-slate-700'
                            }`}
                          >
                            {initials}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 truncate">{c.name}</p>
                            <p className="text-[10px] text-slate-400">Shipper</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-1 space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">Select Customer *</label>
                      <Combobox
                        options={customerOptions}
                        value={singleCustomer}
                        onChange={(val) => {
                          setSingleCustomer(val);
                          handleSingleLocationChange('origin', singleOrigin, null);
                        }}
                        placeholder="Search customer account..."
                        triggerClassName="h-9.5 rounded-xl border-slate-200 bg-white text-xs font-semibold shadow-2xs w-full"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">Rate Category *</label>
                      <Select value={singleRateCategory} onValueChange={setSingleRateCategory}>
                        <SelectTrigger className="h-9.5 rounded-xl border-slate-200 bg-white text-xs font-semibold shadow-2xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MODAL_RATE_CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat} className="text-xs font-medium">
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">Vehicle Type *</label>
                      <Select value={singleVehicleType} onValueChange={setSingleVehicleType}>
                        <SelectTrigger className="h-9.5 rounded-xl border-slate-200 bg-white text-xs font-semibold shadow-2xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {VEHICLE_TYPES.map((vt) => (
                            <SelectItem key={vt} value={vt} className="text-xs font-medium">
                              {vt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* 2. Route & Location */}
                <div className="space-y-3 pt-4 border-t border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-brand" />
                      2. Route Origin, Destination & Intermediate Stops
                    </h4>
                    {singleTravelTimeEstimate && (
                      <Badge className="bg-orange-50 text-brand border-orange-200 font-bold text-[10px] gap-1">
                        ⚡ Est. {Math.floor(singleTravelTimeEstimate.durationMinutes / 60)}h {singleTravelTimeEstimate.durationMinutes % 60}m • {singleTravelTimeEstimate.distanceKm} km
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" /> Origin Pick-up Yard *
                      </label>
                      <LocationCombobox
                        customerId={singleCustomer}
                        value={singleOrigin}
                        onChange={(locName, locObj) => handleSingleLocationChange('origin', locName, locObj)}
                        placeholder="Search origin location (e.g. Riyadh Yard 1)..."
                        triggerClassName="h-9.5 border-emerald-200 bg-white shadow-2xs rounded-xl"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-orange-700 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-orange-500" /> Destination Drop-off Yard *
                      </label>
                      <LocationCombobox
                        customerId={singleCustomer}
                        value={singleDestination}
                        onChange={(locName, locObj) => handleSingleLocationChange('destination', locName, locObj)}
                        placeholder="Search destination location (e.g. Dammam Hub)..."
                        triggerClassName="h-9.5 border-orange-200 bg-white shadow-2xs rounded-xl"
                      />
                    </div>
                  </div>

                  {/* Intermediate Stops */}
                  {singleIntermediateLocations.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Intermediate Stops ({singleIntermediateLocations.length})
                      </span>
                      {singleIntermediateLocations.map((loc, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <LocationCombobox
                            customerId={singleCustomer}
                            value={loc}
                            onChange={(name) => {
                              const next = [...singleIntermediateLocations];
                              next[idx] = name;
                              setSingleIntermediateLocations(next);
                            }}
                            placeholder={`Intermediate Stop #${idx + 1}...`}
                            triggerClassName="h-8.5 text-xs rounded-xl flex-1"
                          />
                          <input
                            type="number"
                            placeholder="Stop fee (SAR)"
                            value={singleIntermediateStopFees[idx] || ''}
                            onChange={(e) => {
                              const nextFees = [...singleIntermediateStopFees];
                              nextFees[idx] = e.target.value;
                              setSingleIntermediateStopFees(nextFees);
                            }}
                            className="w-28 h-8.5 px-2.5 rounded-xl border border-slate-200 text-xs font-semibold"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setSingleIntermediateLocations((prev) => prev.filter((_, i) => i !== idx));
                              setSingleIntermediateStopFees((prev) => prev.filter((_, i) => i !== idx));
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] font-bold text-brand border-brand/30 bg-orange-50/50 hover:bg-orange-100 rounded-lg gap-1"
                    onClick={() => {
                      setSingleIntermediateLocations((prev) => [...prev, '']);
                      setSingleIntermediateStopFees((prev) => [...prev, '']);
                    }}
                  >
                    <Plus className="w-3 h-3" /> Add Intermediate Stop
                  </Button>
                </div>

                {/* 3. Schedule & Timing */}
                <div className="space-y-3 pt-4 border-t border-slate-200/80">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-brand" />
                    3. Dispatch Date & Timing
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="space-y-1 sm:col-span-1">
                      <label className="text-[11px] font-bold text-slate-600">Pickup Date *</label>
                      <input
                        type="date"
                        value={singleDate}
                        onChange={(e) => {
                          setSingleDate(e.target.value);
                          if (!singleIsOvernight) setSingleDropoffDate(e.target.value);
                        }}
                        className="w-full h-9 px-2.5 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer bg-white"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-1">
                      <label className="text-[11px] font-bold text-slate-600">Pickup Time *</label>
                      <input
                        type="time"
                        value={singlePickupTime}
                        onChange={(e) => {
                          setSinglePickupTime(e.target.value);
                          if (singleTravelTimeEstimate) {
                            const arrival = calculateArrivalDropoffTime(e.target.value, singleTravelTimeEstimate.durationMinutes);
                            setSingleDropoffTime(arrival.dropoffTime);
                            setSingleIsOvernight(arrival.isOvernight);
                          }
                        }}
                        className="w-full h-9 px-2.5 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer bg-white"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-1">
                      <label className="text-[11px] font-bold text-slate-600">Dropoff Date *</label>
                      <input
                        type="date"
                        value={singleDropoffDate}
                        onChange={(e) => setSingleDropoffDate(e.target.value)}
                        className="w-full h-9 px-2.5 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer bg-white"
                      />
                    </div>

                    <div className="space-y-1 sm:col-span-1">
                      <label className="text-[11px] font-bold text-slate-600">Dropoff Time *</label>
                      <input
                        type="time"
                        value={singleDropoffTime}
                        onChange={(e) => setSingleDropoffTime(e.target.value)}
                        className="w-full h-9 px-2.5 rounded-xl border border-slate-200 text-xs font-semibold cursor-pointer bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* 4. Fleet & Driver Assignment */}
                <div className="space-y-3 pt-4 border-t border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-brand" />
                      4. Driver & Vehicle Resource Allocation
                    </h4>

                    {/* Mode Toggle */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setSingleAssignmentType('own')}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                          singleAssignmentType === 'own' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                        }`}
                      >
                        Own Fleet
                      </button>
                      <button
                        type="button"
                        onClick={() => setSingleAssignmentType('third_party')}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all ${
                          singleAssignmentType === 'third_party' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                        }`}
                      >
                        3PL Third-Party
                      </button>
                    </div>
                  </div>

                  {singleAssignmentType === 'own' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-bold text-slate-600">Assigned Driver</label>
                          <button
                            type="button"
                            onClick={() => setIsCreateDriverOpen(true)}
                            className="text-[10px] font-bold text-brand hover:underline"
                          >
                            + New Driver
                          </button>
                        </div>
                        <Combobox
                          options={driverOptions}
                          value={singleDriver}
                          onChange={handleSingleDriverChange}
                          placeholder="Select available driver..."
                          triggerClassName="h-9.5 rounded-xl border-slate-200 bg-white text-xs font-semibold shadow-2xs w-full"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-600">Assigned Vehicle Asset</label>
                        <Select value={singleVehicle} onValueChange={setSingleVehicle}>
                          <SelectTrigger className="h-9.5 rounded-xl border-slate-200 bg-white text-xs font-semibold shadow-2xs">
                            <SelectValue placeholder="Select vehicle plate..." />
                          </SelectTrigger>
                          <SelectContent>
                            {vehicles.map((v) => (
                              <SelectItem key={v.id} value={v.id} className="text-xs font-medium">
                                {v.plate_number} ({v.asset_type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-orange-50/40 border border-orange-200/80">
                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">3PL Provider *</label>
                        <Select value={single3PLProviderId} onValueChange={setSingle3PLProviderId}>
                          <SelectTrigger className="h-9 rounded-lg border-orange-200 bg-white text-xs font-bold">
                            <SelectValue placeholder="Select 3PL provider..." />
                          </SelectTrigger>
                          <SelectContent>
                            {thirdPartyProviders.map((p) => (
                              <SelectItem key={p.id} value={p.id} className="text-xs font-medium">
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">3PL Driver Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Tariq Al-Mansoor"
                          value={single3PLDriverName}
                          onChange={(e) => setSingle3PLDriverName(e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg border border-orange-200 text-xs font-medium bg-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-slate-700">3PL Vehicle Plate</label>
                        <input
                          type="text"
                          placeholder="e.g. KSA-9931"
                          value={single3PLVehiclePlate}
                          onChange={(e) => setSingle3PLVehiclePlate(e.target.value)}
                          className="w-full h-9 px-2.5 rounded-lg border border-orange-200 text-xs font-medium bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 5. Pricing & Billing */}
                <div className="space-y-3 pt-4 border-t border-slate-200/80">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-brand" />
                      5. Pricing, Rate Cards & Charges
                    </h4>
                    {singleRateMatched && (
                      <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px]">
                        ⚡ Auto-Matched Contract Price
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">Base Freight Billing Amount (SAR)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={singleBillingAmount}
                        onChange={(e) => setSingleBillingAmount(e.target.value)}
                        className="w-full h-9.5 px-3 rounded-xl border border-slate-200 text-xs font-extrabold text-slate-900 bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">Additional Stop Charges (SAR)</label>
                      <input
                        type="number"
                        disabled
                        value={singleIntermediateStopFees.reduce((sum, f) => sum + (Number(f) || 0), 0)}
                        className="w-full h-9.5 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 bg-slate-50"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column: Live Map Preview & Summary Card */}
              <div className="w-full lg:w-[420px] p-5 lg:p-6 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between space-y-4 shrink-0">
                <div className="space-y-4">
                  
                  {/* Micro Map Preview Header */}
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-brand" />
                      Live Route Map Preview
                    </span>
                    <Badge className="bg-slate-200 text-slate-700 text-[9px] font-bold">GPS Verified</Badge>
                  </div>

                  {/* Leaflet Micro Map Container */}
                  <div className="h-52 w-full rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm relative z-0">
                    <MapContainer
                      center={[24.7136, 46.6753]}
                      zoom={8}
                      scrollWheelZoom={false}
                      className="h-full w-full"
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {singleMapPoints.length > 0 && <MapBoundsAdjuster points={singleMapPoints} />}
                      {singleOriginLat && singleOriginLng && (
                        <Marker position={[singleOriginLat, singleOriginLng]} icon={pickupMarkerIcon} />
                      )}
                      {singleDestinationLat && singleDestinationLng && (
                        <Marker position={[singleDestinationLat, singleDestinationLng]} icon={dropoffMarkerIcon} />
                      )}
                      {singleMapPoints.length >= 2 && (
                        <Polyline positions={singleMapPoints} color="#E8450F" weight={4} opacity={0.8} dashArray="6,6" />
                      )}
                    </MapContainer>
                  </div>

                  {/* Trip Summary Overview Box */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
                      <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Trip Overview</span>
                      <span className="text-[10px] font-bold text-brand bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-md">
                        {singleRateCategory}
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Shipper Account:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {customers.find((c) => c.id === singleCustomer)?.name || '—'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Origin → Destination:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[200px]">
                          {singleOrigin || '—'} → {singleDestination || '—'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Scheduled Date:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {singleDate} @ {singlePickupTime}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Assigned Asset:</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">
                          {singleAssignmentType === 'own'
                            ? vehicles.find((v) => v.id === singleVehicle)?.plate_number || 'Unassigned'
                            : single3PLVehiclePlate || '3PL Logistics'}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-sm">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Total Price:</span>
                        <span className="font-black text-brand text-base">
                          SAR {Number(singleBillingAmount || 0) + singleIntermediateStopFees.reduce((sum, f) => sum + (Number(f) || 0), 0)}
                        </span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Bottom Action Footer for Single Trip */}
                <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSingleTripSubmit('Draft')}
                    disabled={singleTripMutation.isPending}
                    className="flex-1 h-11 rounded-xl text-xs font-bold border-slate-200"
                  >
                    Save as Draft
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleSingleTripSubmit('Dispatched')}
                    disabled={singleTripMutation.isPending}
                    className="flex-1 h-11 rounded-xl text-xs font-extrabold bg-brand hover:bg-[#d13d0d] text-white shadow-md gap-1.5"
                  >
                    {singleTripMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create & Dispatch Trip
                  </Button>
                </div>

              </div>

            </div>
          )}

          {/* MODE 2: MONTHLY CONTRACT / BULK ADD TRIPS */}
          {creationMode === 'monthly' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
              
              {/* Stepper Bar Header */}
              {!submissionResult && (
                <div className="border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex items-center justify-between px-5 py-2.5 flex-wrap gap-2">
                  
                  {/* Mode Tabs */}
                  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setActiveTab('contract')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeTab === 'contract' ? 'bg-white dark:bg-slate-700 text-brand shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Monthly Contract Wizard
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('grid')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeTab === 'grid' ? 'bg-white dark:bg-slate-700 text-brand shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      <Table2 className="w-3.5 h-3.5" />
                      Quick Grid Entry
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('file')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        activeTab === 'file' ? 'bg-white dark:bg-slate-700 text-brand shadow-2xs' : 'text-slate-500'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      CSV / Excel Upload
                    </button>
                  </div>

                  {/* Stepper Navigation Pills for Contract Wizard */}
                  {activeTab === 'contract' && (
                    <div className="flex items-center gap-1.5 overflow-x-auto">
                      {[
                        { step: 1, label: '1. Customer', icon: User },
                        { step: 2, label: '2. Route Slots', icon: MapPin },
                        { step: 3, label: '3. Assignment', icon: Truck },
                        { step: 4, label: '4. Review & Create', icon: CheckCircle2 },
                      ].map((s) => {
                        const IconComp = s.icon;
                        const isActive = contractStep === s.step;
                        const isPassed = contractStep > s.step;
                        return (
                          <button
                            key={s.step}
                            type="button"
                            disabled={!canNavigateToStep(s.step)}
                            onClick={() => setContractStep(s.step as any)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all disabled:opacity-40 ${
                              isActive
                                ? 'bg-brand text-white shadow-xs'
                                : isPassed
                                ? 'bg-orange-50 text-brand border border-orange-200'
                                : 'bg-slate-100 text-slate-400'
                            }`}
                          >
                            <IconComp className="w-3.5 h-3.5" />
                            <span>{s.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                </div>
              )}

              {/* Wizard Content Body */}
              <div className="flex-1 p-5 lg:p-6 min-h-0 overflow-y-auto custom-scrollbar">
                
                {/* Submission Result Screen */}
                {submissionResult ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in max-w-xl mx-auto">
                    <div className="h-16 w-16 rounded-2xl bg-emerald-50 text-emerald-600 grid place-items-center mb-4 border border-emerald-200 shadow-xs">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900">
                      {submissionResult.imported} {submissionResult.imported === 1 ? 'Trip' : 'Trips'} Generated Successfully!
                    </h3>
                    <p className="text-xs text-slate-500 mt-1.5">
                      All trips have been processed and added to the MERCON operations ledger.
                    </p>

                    <div className="mt-6 flex items-center gap-3">
                      <Button variant="outline" onClick={resetAll} className="rounded-xl text-xs font-semibold h-10 px-5">
                        Create More Trips
                      </Button>
                      <Button onClick={handleClose} className="rounded-xl bg-brand hover:bg-[#d13d0d] text-white text-xs font-bold h-10 px-6">
                        Close & View Board
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* TAB 1: CONTRACT BATCH WIZARD */}
                    {activeTab === 'contract' && (
                      <div className="space-y-6">
                        
                        {/* Step 1: Customer Account */}
                        {contractStep === 1 && (
                          <div className="space-y-4 animate-fade-in max-w-3xl mx-auto">
                            <div className="space-y-1">
                              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-brand" />
                                Select Contract Customer Account
                              </h4>
                              <p className="text-xs text-slate-500">
                                Pick the client account responsible for this batch contract dispatch.
                              </p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {customers.slice(0, 4).map((c) => {
                                const isSel = contractCustomer === c.id;
                                const initials = c.name.substring(0, 2).toUpperCase();
                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => setContractCustomer(c.id)}
                                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between h-20 ${
                                      isSel ? 'bg-orange-50 border-brand ring-1 ring-brand/20 shadow-2xs' : 'bg-white border-slate-200'
                                    }`}
                                  >
                                    <span className={`w-6 h-6 rounded-md font-bold text-[10px] grid place-items-center ${isSel ? 'bg-brand text-white' : 'bg-slate-100 text-slate-700'}`}>
                                      {initials}
                                    </span>
                                    <p className="text-xs font-bold text-slate-900 truncate">{c.name}</p>
                                  </button>
                                );
                              })}
                            </div>

                            <div className="space-y-1 pt-2">
                              <label className="text-xs font-bold text-slate-700">Search All Customer Accounts *</label>
                              <Combobox
                                options={customerOptions}
                                value={contractCustomer}
                                onChange={setContractCustomer}
                                placeholder="Search customer account by name..."
                                triggerClassName="h-10 rounded-xl border-slate-200 bg-white text-xs font-semibold shadow-2xs w-full"
                              />
                            </div>

                            <div className="pt-4 flex justify-end">
                              <Button
                                disabled={!contractCustomer}
                                onClick={() => setContractStep(2)}
                                className="h-10 px-6 rounded-xl bg-brand hover:bg-[#d13d0d] text-white text-xs font-bold gap-1.5"
                              >
                                Next Step: Route Slots <ChevronRight className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Step 2: Route Slots & Schedule */}
                        {contractStep === 2 && (
                          <div className="space-y-4 animate-fade-in">
                            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200 pb-3">
                              <div>
                                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                                  Define Batch Route Slots ({contractSlots.length})
                                </h4>
                                <p className="text-xs text-slate-500">Configure origin, destination, and travel timing per slot.</p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                onClick={handleAddTripSlot}
                                className="h-8 text-xs font-bold text-white bg-brand hover:bg-[#d13d0d] rounded-lg gap-1 px-3"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add New Route Slot
                              </Button>
                            </div>

                            <div className="space-y-4">
                              {contractSlots.map((slot, slotIdx) => (
                                <div key={slot.id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                    <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md">
                                      Route Slot #{slotIdx + 1}
                                    </span>
                                    
                                    <div className="flex items-center gap-2">
                                      {/* Clone Slot Action */}
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCloneTripSlot(slot.id)}
                                        className="h-7 text-[11px] font-bold rounded-md gap-1 text-slate-700"
                                        title="Duplicate this slot"
                                      >
                                        <Copy className="w-3 h-3 text-slate-500" /> Clone Slot
                                      </Button>

                                      {contractSlots.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveTripSlot(slot.id)}
                                          className="text-slate-400 hover:text-rose-600 p-1"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    <div className="space-y-1">
                                      <label className="text-[11px] font-bold text-emerald-700">Origin Pick-up *</label>
                                      <LocationCombobox
                                        customerId={contractCustomer}
                                        value={slot.origin}
                                        onChange={(locName, locObj) => handleSlotLocationChange(slot.id, 'origin', locName, locObj)}
                                        placeholder="Pick origin..."
                                        triggerClassName="h-8.5 text-xs rounded-lg"
                                      />
                                    </div>

                                    <div className="space-y-1">
                                      <label className="text-[11px] font-bold text-orange-700">Destination Drop-off *</label>
                                      <LocationCombobox
                                        customerId={contractCustomer}
                                        value={slot.destination}
                                        onChange={(locName, locObj) => handleSlotLocationChange(slot.id, 'destination', locName, locObj)}
                                        placeholder="Pick destination..."
                                        triggerClassName="h-8.5 text-xs rounded-lg"
                                      />
                                    </div>

                                    <div className="space-y-1">
                                      <label className="text-[11px] font-bold text-slate-600">Dispatch Date *</label>
                                      <input
                                        type="date"
                                        value={slot.date || ''}
                                        onChange={(e) => handleUpdateTripSlot(slot.id, { date: e.target.value, dropoffDate: e.target.value })}
                                        className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 text-xs font-semibold bg-white"
                                      />
                                    </div>

                                    <div className="space-y-1">
                                      <label className="text-[11px] font-bold text-slate-600">Billing Price (SAR)</label>
                                      <input
                                        type="number"
                                        placeholder="0.00"
                                        value={slot.billingAmount}
                                        onChange={(e) => handleUpdateTripSlot(slot.id, { billingAmount: e.target.value })}
                                        className="w-full h-8.5 px-2.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 bg-white"
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            <div className="pt-4 flex justify-between">
                              <Button variant="outline" onClick={() => setContractStep(1)} className="h-10 px-5 rounded-xl text-xs font-semibold">
                                Back
                              </Button>
                              <Button
                                onClick={() => setContractStep(3)}
                                className="h-10 px-6 rounded-xl bg-brand hover:bg-[#d13d0d] text-white text-xs font-bold gap-1.5"
                              >
                                Next Step: Fleet Assignment <ChevronRight className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Step 3: Fleet & Driver Assignment */}
                        {contractStep === 3 && (
                          <div className="space-y-4 animate-fade-in max-w-3xl mx-auto">
                            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                              <Truck className="w-3.5 h-3.5 text-brand" />
                              Master Fleet & Driver Allocation
                            </h4>

                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-4">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-slate-700">Master Driver</label>
                                  <Combobox
                                    options={driverOptions}
                                    value={masterDriver}
                                    onChange={handleDriverChange}
                                    placeholder="Select master driver..."
                                    triggerClassName="h-9.5 rounded-xl border-slate-200 bg-white text-xs font-semibold w-full"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[11px] font-bold text-slate-700">Master Vehicle</label>
                                  <Select value={masterVehicle} onValueChange={handleVehicleChange}>
                                    <SelectTrigger className="h-9.5 rounded-xl border-slate-200 bg-white text-xs font-semibold">
                                      <SelectValue placeholder="Select master vehicle..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {vehicles.map((v) => (
                                        <SelectItem key={v.id} value={v.id} className="text-xs font-medium">
                                          {v.plate_number} ({v.asset_type})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>

                            <div className="pt-4 flex justify-between">
                              <Button variant="outline" onClick={() => setContractStep(2)} className="h-10 px-5 rounded-xl text-xs font-semibold">
                                Back
                              </Button>
                              <Button
                                onClick={() => setContractStep(4)}
                                className="h-10 px-6 rounded-xl bg-brand hover:bg-[#d13d0d] text-white text-xs font-bold gap-1.5"
                              >
                                Next Step: Review & Create <ChevronRight className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Step 4: Final Review & Bulk Generation */}
                        {contractStep === 4 && (
                          <div className="space-y-4 animate-fade-in max-w-3xl mx-auto">
                            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
                              <h4 className="text-sm font-bold text-slate-900">Review Batch Dispatch Summary</h4>

                              <div className="space-y-2 text-xs">
                                <div className="flex justify-between py-1 border-b">
                                  <span className="text-slate-500">Shipper Account:</span>
                                  <span className="font-bold">{customers.find((c) => c.id === contractCustomer)?.name}</span>
                                </div>
                                <div className="flex justify-between py-1 border-b">
                                  <span className="text-slate-500">Total Trips to Generate:</span>
                                  <span className="font-bold text-brand">{contractSlots.length} Trips</span>
                                </div>
                                <div className="flex justify-between py-1 border-b">
                                  <span className="text-slate-500">Total Billing Sum:</span>
                                  <span className="font-black text-slate-900 text-sm">
                                    SAR {contractSlots.reduce((sum, s) => sum + (Number(s.billingAmount) || 0), 0)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="pt-4 flex justify-between">
                              <Button variant="outline" onClick={() => setContractStep(3)} className="h-10 px-5 rounded-xl text-xs font-semibold">
                                Back
                              </Button>
                              <Button
                                onClick={handleContractSubmit}
                                disabled={bulkMutation.isPending}
                                className="h-10 px-8 rounded-xl bg-brand hover:bg-[#d13d0d] text-white text-xs font-extrabold shadow-md gap-1.5"
                              >
                                {bulkMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                Generate All Batch Trips Now
                              </Button>
                            </div>
                          </div>
                        )}

                      </div>
                    )}

                    {/* TAB 2: QUICK GRID ENTRY */}
                    {activeTab === 'grid' && (
                      <div className="space-y-4 animate-fade-in">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Quick Ledger Grid Entry</h4>
                          <Button size="sm" onClick={() => setGridRows((prev) => [...prev, generateEmptyRow()])} className="h-8 text-xs font-bold bg-brand text-white rounded-lg gap-1">
                            <Plus className="w-3.5 h-3.5" /> Add Row
                          </Button>
                        </div>

                        <div className="border rounded-xl overflow-hidden shadow-2xs">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-slate-600 font-bold border-b">
                              <tr>
                                <th className="p-2.5">Date</th>
                                <th className="p-2.5">Origin</th>
                                <th className="p-2.5">Destination</th>
                                <th className="p-2.5">Price (SAR)</th>
                                <th className="p-2.5 w-12 text-center">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y">
                              {gridRows.map((row) => (
                                <tr key={row.id}>
                                  <td className="p-2">
                                    <input type="date" value={row.date} onChange={(e) => updateGridRow(row.id, { date: e.target.value })} className="w-full h-8 px-2 border rounded-md text-xs font-medium" />
                                  </td>
                                  <td className="p-2">
                                    <input type="text" placeholder="Origin" value={row.origin} onChange={(e) => updateGridRow(row.id, { origin: e.target.value })} className="w-full h-8 px-2 border rounded-md text-xs font-medium" />
                                  </td>
                                  <td className="p-2">
                                    <input type="text" placeholder="Destination" value={row.destination} onChange={(e) => updateGridRow(row.id, { destination: e.target.value })} className="w-full h-8 px-2 border rounded-md text-xs font-medium" />
                                  </td>
                                  <td className="p-2">
                                    <input type="number" placeholder="0.00" value={row.amount} onChange={(e) => updateGridRow(row.id, { amount: e.target.value })} className="w-full h-8 px-2 border rounded-md text-xs font-bold text-slate-900" />
                                  </td>
                                  <td className="p-2 text-center">
                                    <button type="button" onClick={() => deleteGridRow(row.id)} className="p-1 text-slate-400 hover:text-rose-600">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="pt-3 flex justify-end">
                          <Button onClick={handleGridSubmit} disabled={bulkMutation.isPending} className="h-10 px-6 rounded-xl bg-brand hover:bg-[#d13d0d] text-white text-xs font-bold">
                            Generate Grid Trips
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* TAB 3: FILE IMPORT */}
                    {activeTab === 'file' && (
                      <div className="space-y-4 animate-fade-in max-w-xl mx-auto py-4">
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-slate-300 hover:border-brand rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50"
                        >
                          <UploadCloud className="w-10 h-10 text-brand mx-auto mb-2" />
                          <p className="text-xs font-bold text-slate-800">Click to upload spreadsheet file (.csv or .xlsx)</p>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv, .xlsx"
                            className="hidden"
                            onChange={(e) => {
                              if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
                            }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-xs">
                          <button type="button" onClick={downloadSampleCsv} className="font-bold text-brand hover:underline flex items-center gap-1">
                            <Download className="w-3.5 h-3.5" /> Download CSV Template
                          </button>
                          {parsedRows.length > 0 && <span className="font-bold text-emerald-600">{parsedRows.length} valid rows parsed</span>}
                        </div>

                        {parsedRows.length > 0 && (
                          <Button onClick={handleFileSubmit} disabled={bulkMutation.isPending} className="w-full h-10 rounded-xl bg-brand hover:bg-[#d13d0d] text-white text-xs font-bold">
                            Import & Create {parsedRows.length} Trips
                          </Button>
                        )}
                      </div>
                    )}
                  </>
                )}

              </div>

            </div>
          )}

        </div>

      </div>

      {/* Driver Creation Modal */}
      <CreateDriverModal
        isOpen={isCreateDriverOpen}
        onClose={() => setIsCreateDriverOpen(false)}
        onCreated={handleDriverCreated}
      />
    </DashboardLayout>
  );
}
