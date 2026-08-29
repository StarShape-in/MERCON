import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  CreditCard,
  MapPin,
  Truck,
  DollarSign,
  Search,
  Link2,
  Phone,
  ShieldCheck,
  X,
  Zap,
  Check,
  Eye,
  ArrowRight,
  Edit2,
  GripVertical,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

import { cn, isUuid } from '@/lib/utils';

import DashboardLayout from '@/components/layout/DashboardLayout';
import ServiceVehicleSelector from '@/components/trips/ServiceVehicleSelector';
import CreateDriverModal from '@/components/drivers/CreateDriverModal';
import CreateVehicleModal from '@/components/fleet/CreateVehicleModal';
import CreateCustomerModal from '@/components/customers/CreateCustomerModal';
import CreateThirdPartyModal from '@/components/third-party/CreateThirdPartyModal';
import CustomerPreviewModal from '@/components/customers/CustomerPreviewModal';
import VehiclePreviewModal from '@/components/fleet/VehiclePreviewModal';
import DriverPreviewModal from '@/components/drivers/DriverPreviewModal';
import ThirdPartyPreviewModal from '@/components/third-party/ThirdPartyPreviewModal';
import EditCustomerModal from '@/components/customers/EditCustomerModal';
import EditVehicleModal from '@/components/fleet/EditVehicleModal';
import EditDriverModal from '@/components/drivers/EditDriverModal';
import EditThirdPartyModal from '@/components/third-party/EditThirdPartyModal';
import { RateCategorySelect } from '@/components/quotations/RateCategorySelect';
import { BillingTypeSelect } from '@/components/quotations/BillingTypeSelect';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useFormKeyboardShortcuts } from '@/hooks/useFormKeyboardShortcuts';
import { KbdBadge } from '@/components/ui/KbdBadge';

function MapBoundsAdjuster({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 0) {
      map.fitBounds(points, { padding: [15, 15], maxZoom: 12 });
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

const returnPickupMarkerIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: rgba(59, 130, 246, 0.2);" class="animate-ping"></div>
      <div style="width: 12px; height: 12px; border-radius: 50%; background: #3B82F6; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
    </div>
  `,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const returnDropoffMarkerIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: rgba(139, 92, 246, 0.2);" class="animate-ping"></div>
      <div style="width: 12px; height: 12px; border-radius: 50%; background: #8B5CF6; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
    </div>
  `,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LocationCombobox from '@/components/quotations/LocationCombobox';
import TransitTimeBadge from '@/components/trips/TransitTimeBadge';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { customerService } from '@/services/customerService';
import { driverService, Driver } from '@/services/driverService';
import { vehicleService, Vehicle } from '@/services/vehicleService';
import { thirdPartyService, ThirdPartyProvider } from '@/services/thirdPartyService';
import { tripService, BulkImportTripRow, BulkImportResult, TripStatus } from '@/services/tripService';
import { useDeploymentTimezone, localDateTimeToUtcIso } from '@/lib/datetime';
import { VEHICLE_TYPES, RATE_CATEGORIES } from '@mercon/shared-types';
import { monthLabel, shiftMonth } from '@/components/trips/monthly/monthlyBoardUtils';
import { estimateTravelTimeByName, calculateArrivalDropoffTime } from '@/services/travelTimeService';
import { parseSheet, TRIP_COLUMNS } from '@/utils/importUtils';
import { analyzePastDateRows, applyPastStatusToRows, PastDateAnalysis } from '@/utils/pastDateTripUtils';
import PastDateTripConfirmModal from '@/components/trips/PastDateTripConfirmModal';

const addDays = (dateStr: string, days: number): string => {
  if (!dateStr) return dateStr;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

// Client-confirmed driver payout rates for the 3 recurring local job types —
// real numbers pulled from 6 months of actual trips (Local 10 Hrs: 103
// matching trips, zero exceptions; Local Single Trip and Local Airport
// similarly confirmed), not guesses. Quick-select chips next to the Trip
// Charge field so dispatchers don't retype these from memory every time.
const LOCAL_TRIP_CHARGE_PRESETS = [
  { label: 'Local 10 Hrs', amount: 60 },
  { label: 'Local Single Trip', amount: 35 },
  { label: 'Local Airport', amount: 45 },
];

const REMOVED_MODAL_CATEGORIES = ['10 Hrs Duty', '12 Hrs Duty'];

const MODAL_RATE_CATEGORIES = RATE_CATEGORIES.filter((cat) => !REMOVED_MODAL_CATEGORIES.includes(cat as any)).map((cat) => ((cat as any) === 'Trip/Round Trip' ? 'Round Trip' : cat));

const isRoundTripCategory = (cat: string) => {
  const c = (cat || '').toLowerCase().trim();
  return c === 'round trip' || c === 'trip/round trip';
};

const getVehicleTypeFromCapacity = (capacityKg?: number | null): string => {
  if (capacityKg == null || capacityKg <= 0) return '40 FEET';
  const tons = capacityKg / 1000;
  if (tons <= 4) return '3-4 TON';
  if (tons <= 5) return '5 TON';
  if (tons <= 10) return '10 TON';
  if (tons <= 20) return '20 TON';
  return '40 FEET';
};

export const getActualCapacityLabel = (capacityKg?: number | null): string => {
  if (capacityKg == null || capacityKg <= 0) return '';
  const tons = capacityKg / 1000;
  return Number.isInteger(tons) ? `${tons} TON` : `${tons.toFixed(1)} TON`;
};




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
  const queryClient = useQueryClient();
  const tz = useDeploymentTimezone();

  // Active Tab
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
    queryFn: () => driverService.getAll({ per_page: 1000, mode: 'lookup' }),
    enabled: true,
  });

  const { data: vehiclesRes } = useQuery({
    queryKey: ['vehicles-select'],
    queryFn: () => vehicleService.getAll({ per_page: 1000, mode: 'lookup' }),
    enabled: true,
  });

  const { data: thirdPartyRes } = useQuery({
    queryKey: ['third-party-providers-select'],
    queryFn: () => thirdPartyService.getAll({ per_page: 1000 }),
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

  const [assignmentType, setAssignmentType] = useState<'own' | 'third_party'>('own');
  const [masterDriver, setMasterDriver] = useState('');
  const [masterVehicle, setMasterVehicle] = useState('');
  const [isVehicleTypeEditable, setIsVehicleTypeEditable] = useState(false);
  const [isCustomThirdPartyVehicleType, setIsCustomThirdPartyVehicleType] = useState(false);

  // Third-party vehicle assignment fields
  const [thirdPartyProviderId, setThirdPartyProviderId] = useState('');
  const [thirdPartyDriverName, setThirdPartyDriverName] = useState('');
  const [thirdPartyDriverPhone, setThirdPartyDriverPhone] = useState('');
  const [thirdPartyVehiclePlate, setThirdPartyVehiclePlate] = useState('');
  const [thirdPartyCost, setThirdPartyCost] = useState('');
  const [isCreateProviderOpen, setIsCreateProviderOpen] = useState(false);

  // ─── DIAGNOSTIC SWITCH ──────────────────────────────────────────────────────
  // Toggle __DIAG_DRIVER_OPTIONS_VEHICLE_RACE to deliberately reproduce the
  // intermittent driver-dropdown bug:
  //
  //   false (default / production)
  //     driverOptions reads vehicles via vehiclesRef — the options reference is
  //     stable. The Combobox never gets a spurious re-render when vehicles loads.
  //
  //   true (diagnostic mode)
  //     vehicles is added back to the useMemo dependency array, reverting to the
  //     pre-fix behaviour. The options reference changes every time the vehicles
  //     query resolves, re-creating the filter closure and triggering the transient
  //     CommandEmpty flash — proving the failure mechanism is live.
  //
  // To use: flip the constant, open Create Trip → Step 3 on a fresh tab
  // (so vehicles are not cached), open the driver dropdown before the vehicles
  // request completes, and observe the flash. Then flip back to false and
  // confirm the flash no longer occurs.
  // eslint-disable-next-line @typescript-eslint/no-inferrable-types
  const __DIAG_DRIVER_OPTIONS_VEHICLE_RACE: boolean = false;
  // ────────────────────────────────────────────────────────────────────────────

  // Keep a live ref to vehicles so driverOptions can read capacity labels at
  // call-time without declaring ehicles as a reactive dependency.
  // vehiclesRef.current is always the latest value; it just doesn't subscribe
  // to the vehicles fetch cycle, which is what we want.
  const vehiclesRef = useRef(vehicles);
  vehiclesRef.current = vehicles;

  const driverOptions = useMemo<ComboboxOption[]>(() => {
    return drivers
      .filter((d) => d.isActive !== false)
      .map((d) => {
        // Prefer the embedded vehicle object returned by the driver lookup API.
        // capacity_kg is now included in the assignedVehicle select (see
        // driverController.ts), so this path returns a valid capacityKg for
        // most active drivers without touching the vehicles list at all.
        const embeddedVeh =
          d.assignedVehicle && typeof d.assignedVehicle === 'object'
            ? (d.assignedVehicle as any)
            : null;

        const vehicleId = embeddedVeh?.id ?? d.assignedVehicleId ?? (d as any).assigned_vehicle_id;

        // vehiclesRef.current is the fallback — deliberately NOT in the deps array
        // so this useMemo doesn't recompute (and cause a Combobox re-render) just
        // because the vehicles query resolved.
        const matchedVeh = vehicleId
          ? vehiclesRef.current.find((v) => v.id === vehicleId)
          : null;

        const capacityKg =
          embeddedVeh?.capacity_kg ??
          (embeddedVeh as any)?.capacityKg ??
          matchedVeh?.capacity_kg ??
          (matchedVeh as any)?.capacityKg;

        const capacityLabel = capacityKg != null ? getActualCapacityLabel(capacityKg) : '';
        const isNotAvailable = d.status && d.status !== 'Available' && d.status.toLowerCase() !== 'available';
        const statusTag = isNotAvailable
          ? d.status === 'OnTrip' ? 'On Trip' : d.status === 'OffDuty' ? 'Off Duty' : d.status
          : '';

        const detailsStr = [capacityLabel, statusTag].filter(Boolean).join(' • ');

        const label = detailsStr
          ? `${d.first_name} ${d.last_name} (${detailsStr})`
          : `${d.first_name} ${d.last_name}`;

        return {
          value: d.id,
          label,
          keywords: `${d.first_name} ${d.last_name} ${d.phone_primary || ''} ${d.license_number || ''} ${capacityLabel} ${d.status || ''}`,
        };
      });
  }, __DIAG_DRIVER_OPTIONS_VEHICLE_RACE ? [drivers, vehicles] : [drivers]);

  const vehicleOptions = useMemo<ComboboxOption[]>(() => {
    return vehicles
      .filter((v) => v.isActive !== false && (v.status !== 'Inactive' || v.id === masterVehicle))
      .map((v) => {
        const actualCapLabel = getActualCapacityLabel(v.capacity_kg ?? 0);
        const typeLabel = v.asset_type && actualCapLabel ? `${v.asset_type} • ${actualCapLabel}` : (v.asset_type || actualCapLabel);
        return {
          value: v.id,
          label: `${v.plate_number} (${typeLabel})`,
          keywords: `${v.plate_number || ''} ${v.asset_type || ''} ${v.ref_id || ''} ${actualCapLabel}`,
        };
      });
  }, [vehicles, masterVehicle]);

  // ==========================================
  // TAB 1: MONTHLY CONTRACT BATCH GENERATOR STATE
  // ==========================================
  const [contractStep, setContractStep] = useState<1 | 2 | 3 | 4>(1);
  const [contractCustomer, setContractCustomer] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [contractRateCategory, setContractRateCategory] = useState<string>(MODAL_RATE_CATEGORIES[0] || 'Trip');
  const [contractBillingType, setContractBillingType] = useState<string>('');
  const [contractVehicleType, setContractVehicleType] = useState<string>(VEHICLE_TYPES[0] || 'Flatbed');

  const [contractSlots, setContractSlots] = useState<Array<{
    id: string;
    origin: string;
    destination: string;
    originLocationId?: string | null;
    destinationLocationId?: string | null;
    rateMatched?: boolean;
    rateCardId?: string;
    rateCardName?: string;
    rateCardBasePrice?: number;
    rateCardDefaultTripCharge?: number | null;
    pickupTime: string;
    dropoffTime: string;
    date: string;
    dropoffDate: string;
    billingAmount: string;
    tripCharges: string;
    /** Checked -> a new Quotation gets created from this slot's lane/price on submit,
     *  so future trips on the same lane auto-match instead of needing a preset again. */
    saveAsQuotation?: boolean;
    saveAsRateCard?: boolean;
    rateReason?: string;
    isOvernight?: boolean;
    intermediateLocations: string[];
    intermediateLocationIds?: (string | null)[];
    intermediateStopFees?: string[];
    // Return Leg fields for Round Trip
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
    returnOriginLat?: number | null;
    returnOriginLng?: number | null;
    returnDestinationLat?: number | null;
    returnDestinationLng?: number | null;
  }>>([
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
      tripCharges: '',
      saveAsQuotation: false,
      saveAsRateCard: false,
      isOvernight: false,
      intermediateLocations: [],
      intermediateLocationIds: [],
      intermediateStopFees: [],
      returnOrigin: '',
      returnDestination: '',
      returnPickupTime: '16:00',
      returnDropoffTime: '22:00',
      returnIsOvernight: false,
      returnIntermediateLocations: [],
      returnIntermediateStopFees: [],
      originLat: null,
      originLng: null,
      destinationLat: null,
      destinationLng: null,
      returnOriginLat: null,
      returnOriginLng: null,
      returnDestinationLat: null,
      returnDestinationLng: null,
    },
  ]);

  // Dynamic Quotation rate lookup connected to Customer, Lane, Vehicle (Tonnage), Billing Type, Line Type & Multi-Stops
  const triggerRateLookupForSlots = useCallback(
    (overrideVehicleType?: string, overrideRateCategory?: string, overrideCustomer?: string, overrideBillingType?: string) => {
      const custId = overrideCustomer !== undefined ? overrideCustomer : contractCustomer;
      const vType = overrideVehicleType !== undefined ? overrideVehicleType : contractVehicleType;
      const rCat = overrideRateCategory !== undefined ? overrideRateCategory : contractRateCategory;
      const bType = overrideBillingType !== undefined ? overrideBillingType : contractBillingType;

      if (!custId) return;

      import('@/services/quotationService').then(({ quotationService }) => {
        setContractSlots((prevSlots) => {
          Promise.all(
            prevSlots.map(async (slot) => {
              if (!slot.originLocationId || !slot.destinationLocationId) return slot;

              const intermediateStops = (slot.intermediateLocations || []).map((locVal, idx) => {
                const locId = slot.intermediateLocationIds?.[idx] || (isUuid(locVal) ? locVal : null);
                return {
                  location_id: locId || null,
                  location_name: locVal,
                  stop_type: 'Dropoff',
                  sequence: idx + 2,
                };
              });

              const slotStops = [
                { location_id: slot.originLocationId, stop_type: 'Pickup', sequence: 1 },
                ...intermediateStops,
                { location_id: slot.destinationLocationId, stop_type: 'Dropoff', sequence: intermediateStops.length + 2 },
              ];

              try {
                // 1. Primary lookup: customer + lane + specific vehicle_type + line_type + billing_type + date + stops signature
                const exactRes = await quotationService.lookup({
                  customer_id: custId,
                  origin_location_id: slot.originLocationId,
                  destination_location_id: slot.destinationLocationId,
                  vehicle_type: vType || undefined,
                  line_type: rCat || undefined,
                  billing_type: bType || undefined,
                  planned_start: slot.date || undefined,
                  stops: slotStops,
                });

                const card = exactRes?.quotation || exactRes?.candidate_quotation || exactRes?.candidateQuotation || exactRes?.rate_card;
                if (card) {
                  const cardRate = Number(card.rate ?? card.base_price ?? 0);
                  const driverPayout = card.driver_payout;
                  if (cardRate > 0) {
                    const isMonthlyCard = (card.billing_type || '').toLowerCase().includes('monthly');
                    const perTripAmount = isMonthlyCard ? Math.round((cardRate / 30) * 100) / 100 : cardRate;
                    return {
                      ...slot,
                      billingAmount: String(perTripAmount),
                      tripCharges: driverPayout != null ? String(driverPayout) : '',
                      rateMatched: true,
                      rateCardId: card.id,
                      rateCardName: card.name,
                      rateCardBasePrice: perTripAmount,
                      rateCardDefaultTripCharge: driverPayout != null ? Number(driverPayout) : null,
                      saveAsQuotation: false,
                      saveAsRateCard: false,
                    };
                  }
                }
              } catch (err) {
                console.error('Quotation rate lookup error:', err);
              }

              // 3. No Quotation exists for this specific context yet!
              return {
                ...slot,
                billingAmount: '',
                tripCharges: '',
                rateMatched: false,
                rateCardId: undefined,
                rateCardName: undefined,
                rateCardBasePrice: undefined,
                rateCardDefaultTripCharge: undefined,
                saveAsQuotation: true,
                saveAsRateCard: true,
              };
            })
          ).then((updatedSlots) => {
            setContractSlots(updatedSlots);
          });

          return prevSlots;
        });
      });
    },
    [contractCustomer, contractVehicleType, contractRateCategory, contractBillingType]
  );

  useEffect(() => {
    if (contractCustomer) {
      triggerRateLookupForSlots();
    }
  }, [contractCustomer, contractVehicleType, contractRateCategory, contractBillingType, triggerRateLookupForSlots]);

  // Rate-card auto-lookup: fires when origin/destination location IDs are set on a slot
  const handleSlotLocationChange = (
    slotId: string,
    field: 'origin' | 'destination',
    locIdOrName: string,
    locObj: import('@/services/locationService').Location | null
  ) => {
    const locationId = locObj?.id ?? (isUuid(locIdOrName) ? locIdOrName : null);
    const displayName = locObj?.name || locObj?.address || (isUuid(locIdOrName) ? '' : locIdOrName);
    const isOrigin = field === 'origin';

    handleUpdateTripSlot(slotId, {
      [field]: displayName,
      [isOrigin ? 'originLocationId' : 'destinationLocationId']: locationId,
      [isOrigin ? 'originLat' : 'destinationLat']: locObj?.lat ?? null,
      [isOrigin ? 'originLng' : 'destinationLng']: locObj?.lng ?? null,
      rateMatched: false,
    });

    // Trigger rate lookup for slots after setting location IDs
    setTimeout(() => {
      triggerRateLookupForSlots();
    }, 100);
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
        originLocationId: prev[0]?.originLocationId || null,
        destinationLocationId: prev[0]?.destinationLocationId || null,
        pickupTime: defaultTime,
        dropoffTime: '14:00',
        date: prev[0]?.date || new Date().toISOString().slice(0, 10),
        dropoffDate: prev[0]?.dropoffDate || new Date().toISOString().slice(0, 10),
        billingAmount: prev[0]?.billingAmount || '',
        tripCharges: prev[0]?.tripCharges || '',
        rateMatched: prev[0]?.rateMatched || false,
        rateCardId: prev[0]?.rateCardId,
        rateCardName: prev[0]?.rateCardName,
        rateCardBasePrice: prev[0]?.rateCardBasePrice,
        rateCardDefaultTripCharge: prev[0]?.rateCardDefaultTripCharge,
        isOvernight: false,
        intermediateLocations: [...(prev[0]?.intermediateLocations || [])],
        intermediateStopFees: [...(prev[0]?.intermediateStopFees || [])],
        returnOrigin: prev[0]?.returnOrigin || '',
        returnDestination: prev[0]?.returnDestination || '',
        returnPickupTime: '16:00',
        returnDropoffTime: '22:00',
        returnIsOvernight: false,
        returnIntermediateLocations: [...(prev[0]?.returnIntermediateLocations || [])],
        returnIntermediateStopFees: [...(prev[0]?.returnIntermediateStopFees || [])],
      },
    ]);
  };

  const handleRemoveTripSlot = (id: string) => {
    if (contractSlots.length <= 1) return;
    setContractSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdateTripSlot = (id: string, updates: Partial<(typeof contractSlots)[0]>) => {
    setContractSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );

    // Side effect to auto-fill dropoff date & time
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
        const originLat = updates.originLat !== undefined ? updates.originLat : slot.originLat;
        const originLng = updates.originLng !== undefined ? updates.originLng : slot.originLng;
        const destinationLat = updates.destinationLat !== undefined ? updates.destinationLat : slot.destinationLat;
        const destinationLng = updates.destinationLng !== undefined ? updates.destinationLng : slot.destinationLng;
        const date = updates.date !== undefined ? updates.date : slot.date;
        const pickupTime = updates.pickupTime !== undefined ? updates.pickupTime : slot.pickupTime;

        if (origin.trim() && destination.trim()) {
          estimateTravelTimeByName(origin, destination, originLat, originLng, destinationLat, destinationLng)
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
            .catch((err) => {
              console.warn('Auto-fill dropoff estimate failed', err);
            });
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
              intermediateLocationIds: [...(s.intermediateLocationIds || []), null],
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
              intermediateLocationIds: (s.intermediateLocationIds || []).filter((_, i) => i !== idx),
              intermediateStopFees: (s.intermediateStopFees || []).filter((_, i) => i !== idx),
            }
          : s
      )
    );
  };

  const handleUpdateSlotIntermediate = (slotId: string, idx: number, val: string, locId?: string | null) => {
    setContractSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        const nextLocs = [...s.intermediateLocations];
        const nextIds = [...(s.intermediateLocationIds || [])];
        nextLocs[idx] = val;
        nextIds[idx] = locId !== undefined ? locId : (isUuid(val) ? val : null);
        return { ...s, intermediateLocations: nextLocs, intermediateLocationIds: nextIds };
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

  const handleInsertSlotIntermediateAt = (slotId: string, insertIdx: number) => {
    setContractSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        const nextLocs = [...s.intermediateLocations];
        const nextIds = [...(s.intermediateLocationIds || [])];
        const nextFees = [...(s.intermediateStopFees || [])];
        nextLocs.splice(insertIdx, 0, '');
        nextIds.splice(insertIdx, 0, null);
        nextFees.splice(insertIdx, 0, '');
        return { ...s, intermediateLocations: nextLocs, intermediateLocationIds: nextIds, intermediateStopFees: nextFees };
      })
    );
  };

  const handleMoveSlotIntermediate = (slotId: string, fromIdx: number, toIdx: number) => {
    setContractSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        const nextLocs = [...s.intermediateLocations];
        const nextIds = [...(s.intermediateLocationIds || [])];
        const nextFees = [...(s.intermediateStopFees || [])];
        if (fromIdx < 0 || fromIdx >= nextLocs.length || toIdx < 0 || toIdx >= nextLocs.length) return s;
        const [movedLoc] = nextLocs.splice(fromIdx, 1);
        const [movedId] = nextIds.splice(fromIdx, 1);
        const [movedFee] = nextFees.splice(fromIdx, 1);
        nextLocs.splice(toIdx, 0, movedLoc);
        nextIds.splice(toIdx, 0, movedId);
        nextFees.splice(toIdx, 0, movedFee);
        return { ...s, intermediateLocations: nextLocs, intermediateLocationIds: nextIds, intermediateStopFees: nextFees };
      })
    );
  };

  // Return Leg Intermediate Stop Handlers
  const handleAddSlotReturnIntermediate = (slotId: string) => {
    setContractSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? {
              ...s,
              returnIntermediateLocations: [...(s.returnIntermediateLocations || []), ''],
              returnIntermediateStopFees: [...(s.returnIntermediateStopFees || []), ''],
            }
          : s
      )
    );
  };

  const handleRemoveSlotReturnIntermediate = (slotId: string, idx: number) => {
    setContractSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? {
              ...s,
              returnIntermediateLocations: (s.returnIntermediateLocations || []).filter((_, i) => i !== idx),
              returnIntermediateStopFees: (s.returnIntermediateStopFees || []).filter((_, i) => i !== idx),
            }
          : s
      )
    );
  };

  const handleUpdateSlotReturnIntermediate = (slotId: string, idx: number, val: string) => {
    setContractSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        const nextLocs = [...(s.returnIntermediateLocations || [])];
        nextLocs[idx] = val;
        return { ...s, returnIntermediateLocations: nextLocs };
      })
    );
  };

  const handleUpdateSlotReturnIntermediateFee = (slotId: string, idx: number, val: string) => {
    setContractSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        const nextFees = [...(s.returnIntermediateStopFees || [])];
        nextFees[idx] = val;
        return { ...s, returnIntermediateStopFees: nextFees };
      })
    );
  };
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [dayAssignments, setDayAssignments] = useState<Record<string, { driverId: string; vehicleId: string }>>({});

  // Master quick-apply in Step 2
  const [assignMode, setAssignMode] = useState<'single' | 'alternating'>('single');
  const [isCreateDriverOpen, setIsCreateDriverOpen] = useState(false);
  const [isCreateVehicleOpen, setIsCreateVehicleOpen] = useState(false);
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);

  const [previewVehicle, setPreviewVehicle] = useState<any | null>(null);
  const [previewCustomer, setPreviewCustomer] = useState<any | null>(null);
  const [previewThirdParty, setPreviewThirdParty] = useState<any | null>(null);
  const [previewDriver, setPreviewDriver] = useState<any | null>(null);

  const [editVehicle, setEditVehicle] = useState<any | null>(null);
  const [editCustomer, setEditCustomer] = useState<any | null>(null);
  const [editThirdParty, setEditThirdParty] = useState<any | null>(null);
  const [editDriver, setEditDriver] = useState<any | null>(null);

  const isStepValid = (step: number): boolean => {
    if (step === 1) {
      return Boolean(contractCustomer);
    }
    if (step === 2) {
      return (
        contractSlots.length > 0 &&
        contractSlots.every(
          (slot) =>
            slot.date &&
            slot.origin.trim() &&
            slot.destination.trim() &&
            slot.pickupTime &&
            slot.dropoffTime
        )
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

    // Priority 1: use the embedded assignedVehicle object the API already returns
    const embeddedVehicle = selectedDriver.assignedVehicle && typeof selectedDriver.assignedVehicle === 'object'
      ? selectedDriver.assignedVehicle as any
      : null;

    const vehicleId =
      selectedDriver.assignedVehicleId ||
      embeddedVehicle?.id ||
      (selectedDriver as any).assigned_vehicle_id;

    if (!vehicleId) return;

    setMasterVehicle(vehicleId);

    // Look up vehicle in local vehicles list as well to ensure accurate capacity_kg
    const matchedVehicle = vehicles.find((v) => v.id === vehicleId);
    const capacity =
      embeddedVehicle?.capacity_kg ??
      embeddedVehicle?.capacityKg ??
      matchedVehicle?.capacity_kg ??
      (matchedVehicle as any)?.capacityKg;

    if (capacity != null) {
      const type = getVehicleTypeFromCapacity(capacity);
      setContractVehicleType(type);
      setIsVehicleTypeEditable(false);
      // Re-run rate card lookup connected to this specific tonnage!
      triggerRateLookupForSlots(type);
    }
  };

  const handleVehicleChange = (vehicleId: string) => {
    setMasterVehicle(vehicleId);
    if (vehicleId && vehicleId !== 'unassigned') {
      const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
      if (selectedVehicle) {
        const type = getVehicleTypeFromCapacity(selectedVehicle.capacity_kg);
        setContractVehicleType(type);
        setIsVehicleTypeEditable(false);
        // Re-run rate card lookup connected to this specific tonnage!
        triggerRateLookupForSlots(type);
      }
    }
  };

  const [loopDriverA, setLoopDriverA] = useState('');
  const [loopVehicleA, setLoopVehicleA] = useState('');
  const [loopDriverB, setLoopDriverB] = useState('');
  const [loopVehicleB, setLoopVehicleB] = useState('');

  // Batch trip rows for Step 2 preview
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

      const key = slot.id;
      const slotLabel = `Slot #${slotIdx + 1}`;
      list.push({
        key,
        dateStr,
        formattedDate,
        slotLabel,
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

  // Calendar dates for the selected month
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
        dayOfWeek: dateObj.getDay(), // 0 = Sun, 1 = Mon, ...
        dayName: dateObj.toLocaleDateString('en-US', { weekday: 'short' }),
      });
    }
    return days;
  }, [selectedMonth]);

  const toggleDate = (dateStr: string) => {
    setSelectedDates((prev) =>
      prev.includes(dateStr) ? prev.filter((d) => d !== dateStr) : [...prev, dateStr].sort()
    );
  };

  const selectPreset = (type: 'weekdays' | 'mwf' | 'daily' | 'clear') => {
    if (type === 'clear') {
      setSelectedDates([]);
      return;
    }
    const matched = monthDates.filter((d) => {
      if (type === 'weekdays') {
        // Sun(0) through Thu(4) for standard Gulf region, or Mon(1)-Fri(5)
        return d.dayOfWeek >= 0 && d.dayOfWeek <= 4;
      }
      if (type === 'mwf') {
        return d.dayOfWeek === 1 || d.dayOfWeek === 3 || d.dayOfWeek === 5;
      }
      if (type === 'daily') {
        return true;
      }
      return false;
    }).map((d) => d.dateStr);

    setSelectedDates(matched);
  };

  // Sync day assignments when selectedDates changes
  useEffect(() => {
    setDayAssignments((prev) => {
      const next: Record<string, { driverId: string; vehicleId: string }> = {};
      selectedDates.forEach((date) => {
        next[date] = prev[date] || { driverId: '', vehicleId: '' };
      });
      return next;
    });
  }, [selectedDates]);



  // ==========================================
  // TAB 2: QUICK GRID ENTRY STATE
  // ==========================================
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

  const [gridRows, setGridRows] = useState<GridTripRow[]>([
    generateEmptyRow(),
    generateEmptyRow(),
    generateEmptyRow(),
  ]);

  const updateGridRow = (id: string, updates: Partial<GridTripRow>) => {
    setGridRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...updates } : row)));
  };

  const deleteGridRow = (id: string) => {
    setGridRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  };

  const duplicateGridRow = (row: GridTripRow) => {
    setGridRows((prev) => [...prev, { ...row, id: Math.random().toString(36).substring(2, 9) }]);
  };

  // ==========================================
  // TAB 3: CSV / EXCEL FILE IMPORT STATE
  // ==========================================
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
        // Parse CSV directly
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length <= 1) {
          throw new Error('The CSV file does not contain any data rows.');
        }
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

          if (rowObj.customer_name) {
            rows.push(rowObj);
          }
        }
        setParsedRows(rows);
      } else {
        // Parse Excel workbook with importUtils
        const result = await parseSheet(file, TRIP_COLUMNS, 'trip');
        const rows: BulkImportTripRow[] = result.rows.map((r) => ({
          customer_name: String(r.customer_name || ''),
          planned_start: r.planned_start ? String(r.planned_start) : undefined,
          driver_name: r.driver_name ? String(r.driver_name) : undefined,
          vehicle_plate: r.vehicle_plate ? String(r.vehicle_plate) : undefined,
          rate_category: r.rate_category ? String(r.rate_category) : undefined,
          vehicle_type: r.vehicle_type ? String(r.vehicle_type) : undefined,
          origin: r.origin ? String(r.origin) : undefined,
          destination: r.destination ? String(r.destination) : undefined,
          billing_amount: r.billing_amount ? Number(r.billing_amount) : undefined,
        })).filter((r) => Boolean(r.customer_name));
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

  // ==========================================
  // BULK MUTATION & SUBMISSION
  // ==========================================
  const [submissionResult, setSubmissionResult] = useState<BulkImportResult | null>(null);
  const [pastDateModalOpen, setPastDateModalOpen] = useState(false);
  const [pendingRows, setPendingRows] = useState<BulkImportTripRow[] | null>(null);
  const [pastDateAnalysis, setPastDateAnalysis] = useState<PastDateAnalysis | null>(null);

  const executeBulkSubmit = (rows: BulkImportTripRow[]) => {
    const analysis = analyzePastDateRows(rows);
    if (analysis.hasPastTrips) {
      setPendingRows(rows);
      setPastDateAnalysis(analysis);
      setPastDateModalOpen(true);
    } else {
      bulkMutation.mutate(rows);
    }
  };

  const handlePastDateConfirm = (selectedStatus: TripStatus) => {
    if (!pendingRows) return;
    const finalRows = applyPastStatusToRows(pendingRows, selectedStatus);
    setPastDateModalOpen(false);
    setPendingRows(null);
    bulkMutation.mutate(finalRows);
  };

  const bulkMutation = useMutation({
    mutationFn: (rows: BulkImportTripRow[]) => tripService.bulkImport(rows),
    onSuccess: (data) => {
      setSubmissionResult(data);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['rate-cards'] });
      queryClient.invalidateQueries({ queryKey: ['rate-cards-summary'] });
      queryClient.invalidateQueries({ queryKey: ['rate-cards-customer-lookup'] });
      toast.success('Trips generated successfully.');
    },
  });

  const handleContractSubmit = async () => {
    if (!contractCustomer || contractSlots.length === 0) return;    // Save Quotations for slots where saveAsQuotation (or saveAsRateCard) is checked and billingAmount > 0
    const slotsToSaveAsQuotation = contractSlots.filter(
      (slot) => (slot.saveAsQuotation || slot.saveAsRateCard) && Number(slot.billingAmount) > 0
    );
    if (slotsToSaveAsQuotation.length > 0) {
      const { quotationService } = await import('@/services/quotationService');
      const { locationService } = await import('@/services/locationService');

      await Promise.all(
        slotsToSaveAsQuotation.map(async (slot) => {
          let origId = slot.originLocationId;
          let destId = slot.destinationLocationId;

          // Ensure origin location exists in MERCON locations directory
          if (!origId && slot.origin.trim()) {
            try {
              const createdOrig = await locationService.create({
                customerId: contractCustomer || 'default-customer-id',
                name: slot.origin.trim(),
                lat: slot.originLat ?? null,
                lng: slot.originLng ?? null,
              });
              origId = createdOrig.id;
            } catch (err) {
              console.error(`Failed to ensure origin location '${slot.origin}':`, err);
            }
          }

          // Ensure destination location exists in MERCON locations directory
          if (!destId && slot.destination.trim()) {
            try {
              const createdDest = await locationService.create({
                customerId: contractCustomer || 'default-customer-id',
                name: slot.destination.trim(),
                lat: slot.destinationLat ?? null,
                lng: slot.destinationLng ?? null,
              });
              destId = createdDest.id;
            } catch (err) {
              console.error(`Failed to ensure destination location '${slot.destination}':`, err);
            }
          }

          const intermediateStops = (slot.intermediateLocations || []).map((locVal, idx) => {
            const locId = slot.intermediateLocationIds?.[idx] || (isUuid(locVal) ? locVal : null);
            return {
              sequence: idx + 2,
              location_id: locId || null,
              source_label: locVal || null,
              stop_type: 'Dropoff',
            };
          });

          const quotationStops = [
            { sequence: 1, location_id: origId || null, source_label: slot.origin.trim() || null, stop_type: 'Pickup' },
            ...intermediateStops,
            { sequence: intermediateStops.length + 2, location_id: destId || null, source_label: slot.destination.trim() || null, stop_type: 'Dropoff' },
          ];

          return quotationService
            .create({
              name: `${slot.origin.trim() || 'Origin'} → ${slot.destination.trim() || 'Destination'}`,
              rate: Number(slot.billingAmount),
              base_price: Number(slot.billingAmount),
              driver_payout: Number(slot.tripCharges) || null,
              customerId: contractCustomer,
              origin_location_id: origId || null,
              destination_location_id: destId || null,
              origin_name: origId ? null : slot.origin.trim() || null,
              destination_name: destId ? null : slot.destination.trim() || null,
              origin_lat: slot.originLat ?? null,
              origin_lng: slot.originLng ?? null,
              destination_lat: slot.destinationLat ?? null,
              destination_lng: slot.destinationLng ?? null,
              vehicle_type: contractVehicleType || null,
              line_type: contractRateCategory || null,
              billing_type: contractBillingType || null,
              pricing_basis: 'Flat Rate',
              stops: quotationStops,
              reason: slot.rateReason?.trim() || `Created during trip dispatch for ${slot.origin || 'origin'} → ${slot.destination || 'destination'} (${contractVehicleType || 'Standard'})`,
              source: 'TRIP_CREATION',
            })
            .then((res) => {
              toast.success(`Quotation '${res.name || slot.origin + ' → ' + slot.destination}' saved to Quotations ledger!`);
              return res;
            })
            .catch((err: any) => {
              const errMsg = err.response?.data?.error?.message || err.message || 'Unknown error';
              console.error(`Failed to save quotation for slot ${slot.id}:`, err);
              toast.error(`Couldn't save quotation for ${slot.origin} → ${slot.destination}: ${errMsg}`);
            });
        })
      );

      // Invalidate all quotation & location queries immediately
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotations-select'] });
      queryClient.invalidateQueries({ queryKey: ['quotations-all'] });
      queryClient.invalidateQueries({ queryKey: ['rate-cards'] });
      queryClient.invalidateQueries({ queryKey: ['rate-card-lookup'] });
      queryClient.invalidateQueries({ queryKey: ['locations-list'] });
    }

    const rows: BulkImportTripRow[] = [];

    contractSlots.forEach((slot) => {
      const date = slot.date || new Date().toISOString().slice(0, 10);
      const assignment = dayAssignments[slot.id] || { driverId: '', vehicleId: '' };

      const outboundStops = slot.intermediateLocations.map((s) => s.trim()).filter(Boolean);
      const returnStops = (slot.returnIntermediateLocations || []).map((s) => s.trim()).filter(Boolean);

      const outboundFeesSum = (slot.intermediateStopFees || []).reduce((sum, f) => sum + (Number(f) || 0), 0);
      const returnFeesSum = (slot.returnIntermediateStopFees || []).reduce((sum, f) => sum + (Number(f) || 0), 0);
      const baseAmount = Number(slot.billingAmount) || 0;
      const totalAmount = baseAmount + outboundFeesSum + returnFeesSum;

      let destString = slot.destination.trim();

      if (isRoundTripCategory(contractRateCategory)) {
        const returnStart = slot.returnOrigin?.trim() || slot.destination.trim();
        const returnEnd = slot.returnDestination?.trim() || slot.origin.trim();

        const outboundChain = outboundStops.length > 0 ? `${outboundStops.join(' → ')} → ` : '';
        const returnChain = returnStops.length > 0 ? `${returnStops.join(' → ')} → ` : '';

        destString = `${outboundChain}${slot.destination.trim()} [RETURN: ${returnStart} → ${returnChain}${returnEnd}]`;
      } else if (outboundStops.length > 0) {
        destString = `${outboundStops.join(' → ')} → ${slot.destination.trim()}`;
      }

      const dropoffDateVal = slot.dropoffDate || date;
      const planned_end_val = localDateTimeToUtcIso(dropoffDateVal, slot.dropoffTime, tz);

      if (assignmentType === 'third_party') {
        const costVal = thirdPartyCost ? Number(thirdPartyCost) : (Number(slot.tripCharges) || 0);
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
          billing_type: contractBillingType || undefined,
          vehicle_type: contractVehicleType || undefined,
          origin: slot.origin.trim() || undefined,
          destination: destString || undefined,
          billing_amount: totalAmount > 0 ? totalAmount : undefined,
          rate_card_id: slot.rateCardId || undefined,
          status: 'Draft',
        });
      } else {
        const driverId = masterDriver && masterDriver !== 'unassigned' ? masterDriver : (assignment.driverId || undefined);
        const vehicleId = masterVehicle && masterVehicle !== 'unassigned' ? masterVehicle : (assignment.vehicleId || undefined);
        const slotTripCharges = Number(slot.tripCharges) || 0;
        rows.push({
          customer_id: contractCustomer,
          planned_start: localDateTimeToUtcIso(date, slot.pickupTime, tz),
          planned_end: planned_end_val,
          driver_id: driverId,
          vehicle_id: vehicleId,
          rate_category: contractRateCategory || undefined,
          billing_type: contractBillingType || undefined,
          vehicle_type: contractVehicleType || undefined,
          origin: slot.origin.trim() || undefined,
          destination: destString || undefined,
          billing_amount: totalAmount > 0 ? totalAmount : undefined,
          trip_charges: slotTripCharges > 0 ? slotTripCharges : undefined,
          rate_card_id: slot.rateCardId || undefined,
          status: 'Draft',
        });
      }
    });

    executeBulkSubmit(rows);
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
      status: 'Draft',
    }));

    executeBulkSubmit(rows);
  };

  const handleFileSubmit = () => {
    if (parsedRows.length === 0) return;
    executeBulkSubmit(parsedRows);
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

  const handleDialogClose = () => {
    resetAll();
    navigate('/trips');
  };

  const handleDriverCreated = (newDriver: Driver) => {
    queryClient.invalidateQueries({ queryKey: ['drivers'] });
    queryClient.invalidateQueries({ queryKey: ['drivers-select'] });
    if (assignMode === 'single') {
      setMasterDriver(newDriver.id);
    } else {
      setLoopDriverA(newDriver.id);
    }
    toast.success(`Driver ${newDriver.first_name} ${newDriver.last_name} created successfully.`);
  };

  // Local Storage Draft Persistence
  const [hasSavedDraft, setHasSavedDraft] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('mercon_trip_draft');
      if (saved) {
        setHasSavedDraft(true);
      }
    } catch (e) {
      console.warn('Failed to read draft from localStorage', e);
    }
  }, []);

  const restoreDraft = () => {
    try {
      const saved = localStorage.getItem('mercon_trip_draft');
      if (!saved) return;
      const data = JSON.parse(saved);
      if (data.contractCustomer) setContractCustomer(data.contractCustomer);
      if (data.contractRateCategory) setContractRateCategory(data.contractRateCategory);
      if (data.contractVehicleType) setContractVehicleType(data.contractVehicleType);
      if (data.contractSlots && data.contractSlots.length > 0) setContractSlots(data.contractSlots);
      if (data.masterDriver) setMasterDriver(data.masterDriver);
      if (data.masterVehicle) setMasterVehicle(data.masterVehicle);
      if (data.assignmentType) setAssignmentType(data.assignmentType);
      if (data.thirdPartyProviderId) setThirdPartyProviderId(data.thirdPartyProviderId);
      if (data.thirdPartyDriverName) setThirdPartyDriverName(data.thirdPartyDriverName);
      if (data.thirdPartyDriverPhone) setThirdPartyDriverPhone(data.thirdPartyDriverPhone);
      if (data.thirdPartyVehiclePlate) setThirdPartyVehiclePlate(data.thirdPartyVehiclePlate);
      if (data.thirdPartyCost) setThirdPartyCost(data.thirdPartyCost);
      setHasSavedDraft(false);
      toast.success('Unsaved trip draft restored successfully.');
    } catch (e) {
      toast.error('Failed to restore draft.');
    }
  };

  const discardDraft = () => {
    localStorage.removeItem('mercon_trip_draft');
    setHasSavedDraft(false);
    toast.info('Draft discarded.');
  };

  // Auto-save draft payload every 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      if (contractCustomer || contractSlots.some((s) => s.origin || s.destination)) {
        try {
          const draftPayload = {
            contractCustomer,
            contractRateCategory,
            contractVehicleType,
            contractSlots,
            masterDriver,
            masterVehicle,
            assignmentType,
            thirdPartyProviderId,
            thirdPartyDriverName,
            thirdPartyDriverPhone,
            thirdPartyVehiclePlate,
            thirdPartyCost,
            savedAt: new Date().toISOString(),
          };
          localStorage.setItem('mercon_trip_draft', JSON.stringify(draftPayload));
        } catch (e) {
          // ignore
        }
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [
    contractCustomer,
    contractRateCategory,
    contractVehicleType,
    contractSlots,
    masterDriver,
    masterVehicle,
    assignmentType,
    thirdPartyProviderId,
    thirdPartyDriverName,
    thirdPartyDriverPhone,
    thirdPartyVehiclePlate,
    thirdPartyCost,
  ]);

  // Step 1 Hotkeys for Frequent Shippers (keys 1, 2, 3, 4)
  useEffect(() => {
    if (contractStep !== 1 || activeTab !== 'contract') return;

    const handleStep1Hotkeys = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const isTypingInInput =
        target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (!isTypingInInput && ['1', '2', '3', '4'].includes(e.key)) {
        const idx = parseInt(e.key, 10) - 1;
        if (customers[idx]) {
          e.preventDefault();
          setContractCustomer(customers[idx].id);
          toast.success(`Selected shipper #${e.key}: ${customers[idx].name}`);
        }
      }
    };

    window.addEventListener('keydown', handleStep1Hotkeys);
    return () => window.removeEventListener('keydown', handleStep1Hotkeys);
  }, [contractStep, activeTab, customers]);

  // Financial Gross Margin Calculation Engine
  const marginMetrics = useMemo(() => {
    const totalBilling = contractSlots.reduce(
      (acc, s) => acc + (parseFloat(s.billingAmount) || 0),
      0
    );
    const driverPayout = contractSlots.reduce(
      (acc, s) => acc + (parseFloat(s.tripCharges) || 0),
      0
    );
    const carrierCost = assignmentType === 'third_party' ? parseFloat(thirdPartyCost) || 0 : 0;
    const totalCost = driverPayout + carrierCost;
    const profit = totalBilling - totalCost;
    const marginPct = totalBilling > 0 ? (profit / totalBilling) * 100 : 0;

    return {
      totalBilling,
      totalCost,
      profit,
      marginPct,
      isHigh: marginPct >= 20,
      isMedium: marginPct >= 5 && marginPct < 20,
      isLow: marginPct < 5,
    };
  }, [contractSlots, assignmentType, thirdPartyCost]);

  // Driver Conflict Check
  const driverConflictWarning = useMemo(() => {
    if (assignmentType !== 'own' || !masterDriver || masterDriver === 'unassigned') return null;
    const driverObj = drivers.find((d) => d.id === masterDriver);
    if (!driverObj) return null;

    const isOccupied =
      driverObj.status?.toLowerCase() === 'in transit' ||
      driverObj.status?.toLowerCase() === 'on trip' ||
      driverObj.status?.toLowerCase() === 'busy';

    if (isOccupied) {
      return `⚠️ Notice: ${driverObj.first_name} ${driverObj.last_name} is currently marked as "${driverObj.status}". Verify schedule before dispatching.`;
    }
    return null;
  }, [assignmentType, masterDriver, drivers]);

  // ERP Keyboard Shortcuts Integration
  useFormKeyboardShortcuts({
    onSave: () => {
      if (contractStep < 4) {
        if (isStepValid(contractStep)) {
          setContractStep((prev) => (prev + 1) as any);
        }
      } else {
        if (batchTripRows.length > 0 && isStepValid(3) && !bulkMutation.isPending) {
          handleContractSubmit();
        }
      }
    },
    onCancel: () => {
      if (contractStep > 1) {
        setContractStep((prev) => (prev - 1) as any);
      } else {
        handleDialogClose();
      }
    },
    isSubmitting: bulkMutation.isPending,
  });

  return (
    <DashboardLayout active="Trips" title="Create New Trip" hideBackButton>
      <div className="px-3 sm:px-6 pb-3 sm:pb-4 animate-fade-in max-w-[1300px] mx-auto w-full h-[calc(100dvh-105px)] flex flex-col min-h-0">
        <div className="w-full flex-1 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl flex flex-col min-h-0">

        {/* Combined Sleek Navigation & Stepper Bar */}
        {!submissionResult && (
          <div className="border-b border-black/[0.06] bg-white dark:bg-slate-900 shrink-0 flex items-center justify-between px-5 py-2.5 gap-3">
            {/* Top Left: Cancel / Back Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {contractStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setContractStep((prev) => (prev - 1) as any)}
                  className="h-8 rounded-xl border border-slate-200/80 text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors shadow-2xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Back <KbdBadge keys="Esc" />
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleDialogClose}
                  className="h-8 rounded-xl border border-slate-200/80 text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors shadow-2xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Cancel <KbdBadge keys="Esc" />
                </Button>
              )}
            </div>

            {/* Center: Stepper Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { step: 1, label: '1. Customer', icon: User },
                { step: 2, label: '2. Route Slots', icon: MapPin },
                { step: 3, label: '3. Assignment & Billing', icon: undefined },
                { step: 4, label: '4. Review', icon: undefined },
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
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
                      isActive
                        ? 'bg-brand text-white shadow-xs ring-1 ring-brand/20'
                        : isPassed
                        ? 'bg-orange-50 text-brand border border-orange-200 hover:bg-orange-100'
                        : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-200/80 dark:border-slate-700 hover:bg-slate-50 hover:text-slate-600'
                    }`}
                  >
                    {IconComp && (
                      <IconComp className={`w-3.5 h-3.5 ${isActive ? 'text-white' : isPassed ? 'text-brand' : 'text-slate-400'}`} />
                    )}
                    <span>{s.label}</span>
                    {isPassed && <CheckCircle2 className="w-3 h-3 text-brand ml-0.5" />}
                  </button>
                );
              })}
            </div>

            {/* Top Right: Next / Done Primary Action & Close */}
            <div className="flex items-center gap-2 shrink-0">
              {contractStep < 4 ? (
                <Button
                  type="button"
                  disabled={!isStepValid(contractStep)}
                  onClick={() => setContractStep((prev) => (prev + 1) as any)}
                  className="h-8 rounded-xl px-4 text-xs font-bold bg-brand hover:bg-[#d13d0d] text-white shadow-none disabled:opacity-50 gap-1"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  <KbdBadge keys="Ctrl+S" />
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={
                    bulkMutation.isPending || 
                    batchTripRows.length === 0 ||
                    !isStepValid(3)
                  }
                  onClick={handleContractSubmit}
                  className="h-8 rounded-xl px-4 text-xs font-bold bg-brand hover:bg-[#d13d0d] text-white shadow-none disabled:opacity-50"
                >
                  {bulkMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Done <KbdBadge keys="Ctrl+S" />
                    </>
                  )}
                </Button>
              )}

              <button
                type="button"
                onClick={handleDialogClose}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Local Draft Auto-Save Recovery Alert Banner */}
        {hasSavedDraft && !submissionResult && (
          <div className="bg-amber-50 border-b border-amber-200 px-5 py-2 flex items-center justify-between gap-3 text-xs shrink-0 animate-fade-in">
            <div className="flex items-center gap-2 text-amber-900 font-medium">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Unsaved trip draft detected from your previous session.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                size="sm"
                tabIndex={-1}
                onClick={restoreDraft}
                className="h-7 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-3 border-0 shadow-2xs"
              >
                Restore Draft
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                tabIndex={-1}
                onClick={discardDraft}
                className="h-7 text-xs font-bold text-amber-800 hover:bg-amber-100 rounded-lg px-2"
              >
                Discard
              </Button>
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 min-h-0 custom-scrollbar">
          {/* Submission Result Screen */}
          {submissionResult ? (
            <div className="flex flex-col items-center justify-center py-6 text-center animate-fade-in">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
              <h3 className="text-xl font-bold text-[#111111]">
                {submissionResult.imported} {submissionResult.imported === 1 ? 'Trip' : 'Trips'} Created Successfully!
              </h3>
              <p className="text-xs text-[#6E6E80] mt-1.5 max-w-md">
                All trips have been added to the database and are now populated on the Monthly Board view.
              </p>

              {submissionResult.failed > 0 && (
                <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 text-left max-w-lg w-full">
                  <p className="font-bold flex items-center gap-1.5 mb-1 text-amber-900">
                    <AlertCircle className="h-4 w-4" /> {submissionResult.failed} rows failed validation:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-700">
                    {submissionResult.results
                      .filter((r) => !r.success)
                      .slice(0, 5)
                      .map((f, idx) => (
                        <li key={idx}>Row {f.row}: {f.error}</li>
                      ))}
                  </ul>
                </div>
              )}

              {/* Reference ID chips */}
              <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-black/[0.06] max-w-xl w-full text-left">
                <p className="text-[11px] font-bold text-[#9898A4] uppercase tracking-wider mb-2">
                  Generated Trip References
                </p>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {submissionResult.results
                    .filter((r) => r.success && r.ref_id)
                    .map((r, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center px-2.5 py-1 rounded-md bg-white border border-black/10 text-xs font-bold text-[#111111]"
                      >
                        {r.ref_id}
                      </span>
                    ))}
                </div>
              </div>

              <div className="flex items-center gap-3 mt-8">
                <Button
                  variant="outline"
                  onClick={resetAll}
                  className="rounded-xl border-black/10 text-xs font-semibold h-10 px-5"
                >
                  Create More Trips
                </Button>
                <Button
                  onClick={handleDialogClose}
                  className="rounded-xl bg-brand hover:bg-[#d13d0d] text-white text-xs font-bold h-10 px-6"
                >
                  Close & View Board
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* TAB 1: MONTHLY CONTRACT BATCH GENERATOR */}
              {activeTab === 'contract' && (
                <div>
                  {/* STEP 1: CUSTOMER & CATEGORY */}
                  {contractStep === 1 && (
                    <div className="space-y-3.5 animate-fade-in">
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-bold text-[#111111] flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-brand" />
                          Select Customer Account
                        </h4>
                        <p className="text-xs text-[#6E6E80]">
                          Pick the client responsible for freight billing and contracted lane rates.
                        </p>
                      </div>

                      {/* Frequent Shippers Cards */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-[#9898A4] uppercase tracking-wider flex items-center gap-1.5">
                          <Zap className="w-3.5 h-3.5 text-amber-500" /> Frequent Shippers
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                          {customers.slice(0, 4).map((c, idx) => {
                            const isSelected = contractCustomer === c.id;
                            const initials = c.name.substring(0, 2).toUpperCase();
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => setContractCustomer(c.id)}
                                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[84px] h-auto space-y-2 ${
                  isSelected
                                    ? 'bg-orange-50/70 border-brand ring-1 ring-brand/20 shadow-xs'
                                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className={`w-7 h-7 rounded-lg font-bold text-[11px] grid place-items-center shrink-0 overflow-hidden ${
                                    isSelected ? 'bg-brand text-white' : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {c.logo_url || c.avatar_url ? (
                                      <img src={c.logo_url || c.avatar_url || ''} alt={c.name} className="w-full h-full object-cover" />
                                    ) : (
                                      initials
                                    )}
                                  </span>
                                  <span className="text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-md shrink-0">
                                    Key {idx + 1}
                                  </span>
                                </div>
                                <div className="space-y-0.5">
                                  <p className="text-xs font-bold text-[#111111] leading-tight line-clamp-1" title={c.name}>{c.name}</p>
                                  <p className="text-[10px] text-slate-400 font-medium leading-normal">Commercial Account</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Search All Accounts (Full Width) */}
                      <div className="space-y-1.5 pt-2 border-t border-black/[0.06]">
                        <label className="text-[11px] font-bold text-[#6E6E80] uppercase tracking-wider flex items-center gap-1">
                          <Search className="w-3 h-3 text-slate-400" /> Search All Accounts *
                        </label>
                        <Combobox
                          options={customerOptions}
                          value={contractCustomer}
                          onChange={setContractCustomer}
                          placeholder="-- Select or search customer account --"
                          searchPlaceholder="Search customer account by name e.g. AKS, Al-Marai..."
                          emptyText="No customer matching your search."
                          triggerClassName="h-9.5 rounded-xl border-slate-200 bg-white text-xs font-semibold shadow-2xs w-full"
                        />

                        {/* Selected Customer Details Card */}
                        {(() => {
                          const selectedCust = customers.find((c) => c.id === contractCustomer);
                          if (!selectedCust) return null;
                          const initials = selectedCust.name.substring(0, 2).toUpperCase();
                          return (
                            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5 animate-fade-in mt-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                  <span className="w-8 h-8 rounded-lg bg-orange-100/80 text-[#E8450F] font-extrabold text-xs grid place-items-center shrink-0 border border-orange-200/80 overflow-hidden">
                                    {selectedCust.logo_url || selectedCust.avatar_url ? (
                                      <img src={selectedCust.logo_url || selectedCust.avatar_url || ''} alt={selectedCust.name} className="w-full h-full object-cover" />
                                    ) : (
                                      initials
                                    )}
                                  </span>
                                  <div>
                                    <h5 className="text-xs font-bold text-[#111111]">{selectedCust.name}</h5>
                                    <p className="text-[10px] text-slate-500 font-medium">Commercial Shipper</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => setPreviewCustomer(selectedCust)}
                                    className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-semibold px-2 py-1 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-md flex items-center gap-1 cursor-pointer"
                                  >
                                    <Eye className="w-3 h-3" /> Preview
                                  </button>
                                  <button
                                    type="button"
                                    tabIndex={-1}
                                    onClick={() => setEditCustomer(selectedCust)}
                                    className="text-xs text-slate-700 hover:text-slate-900 dark:text-slate-300 font-semibold px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md flex items-center gap-1 cursor-pointer"
                                  >
                                    <Edit2 className="w-3 h-3" /> Edit
                                  </button>
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px] gap-1 px-2 py-0.5 rounded-lg">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    Active Account
                                  </Badge>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200/60">
                                <div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                                    <Phone className="w-2.5 h-2.5 text-slate-400" /> CONTACT PHONE
                                  </span>
                                  <span className="text-xs font-bold text-[#111111]">
                                    {selectedCust.phone || '966500000007'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                                    <CreditCard className="w-2.5 h-2.5 text-slate-400" /> PAYMENT TERMS
                                  </span>
                                  <span className="text-xs font-bold text-[#111111]">
                                    {selectedCust.payment_terms || 'Net 30'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                                    <ShieldCheck className="w-2.5 h-2.5 text-slate-400" /> ACCOUNT CREDIT
                                  </span>
                                  <span className="text-xs font-bold text-emerald-600">
                                    Good Standing
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* STEP 2: ROUTE & TRIPS SLOTS */}
                  {contractStep === 2 && (
                    <div className="space-y-3.5 animate-fade-in">
                      {/* Top Bar: Operational Category & Vehicle Class (Option 1 Ultra-Compact Bar) */}
                      <ServiceVehicleSelector
                        contractRateCategory={contractRateCategory}
                        contractVehicleType={contractVehicleType}
                        onUpdateRateCategory={(cat) => {
                          setContractRateCategory(cat);
                          triggerRateLookupForSlots(undefined, cat);
                        }}
                        onUpdateVehicleType={(veh) => {
                          setContractVehicleType(veh);
                          triggerRateLookupForSlots(veh);
                        }}
                        matchStatus={
                          contractSlots.some(s => s.originLocationId && s.destinationLocationId)
                            ? contractSlots.some(s => Boolean(s.rateMatched))
                              ? 'matched'
                              : 'unmatched'
                            : 'idle'
                        }
                      />

                      {/* Daily Route Stop Cards (Full-Width Primary Focal Point) */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-black/[0.06] pb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-[#6E6E80] uppercase tracking-wider">
                              Daily Route Stop Cards ({contractSlots.length} Slot{contractSlots.length > 1 ? 's' : ''})
                            </span>
                            {contractSlots.length > 1 && (
                              <Badge className="bg-orange-50 text-brand border-orange-200 text-[10px] font-bold">
                                {contractSlots.length} Slots / Day
                              </Badge>
                            )}
                          </div>
                        </div>

                        {contractSlots.map((slot, slotIdx) => (
                          <div
                            key={slot.id}
                            className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs space-y-3"
                          >
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#111111] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                                  Trip Slot #{slotIdx + 1}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">

                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-7 text-[11px] font-bold text-white bg-brand hover:bg-brand-hover active:scale-[0.98] transition-all shadow-xs rounded-lg gap-1 px-2.5 border-0"
                                  onClick={() => handleAddSlotIntermediate(slot.id)}
                                >
                                  <Plus className="w-3 h-3 text-white stroke-[2.5]" />
                                  Add Stop
                                </Button>
                                {contractSlots.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTripSlot(slot.id)}
                                    className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                                    title="Remove trip slot"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Conditional Rendering for Round Trip (4 Sections) vs Standard 1-Way Trip */}
                            {isRoundTripCategory(contractRateCategory) ? (
                              <div className="space-y-3 pt-0.5">
                                {/* LEG 1: OUTBOUND JOURNEY */}
                                <div className="p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2.5">
                                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                                        Leg 1: Outbound Journey
                                      </Badge>
                                      <span className="text-xs font-bold text-slate-800">Origin → Destination</span>
                                    </div>
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="h-6 text-[10px] font-bold text-white bg-brand hover:bg-brand-hover active:scale-[0.98] transition-all shadow-xs rounded-lg gap-1 px-2.5 border-0"
                                      onClick={() => handleAddSlotIntermediate(slot.id)}
                                    >
                                      <Plus className="w-3 h-3 text-white stroke-[2.5]" />
                                      Add Outbound Stop
                                    </Button>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {/* SECTION 1: Outbound Pickup (Start) */}
                                    <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 overflow-hidden space-y-2">
                                      <div className="p-2 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 shrink-0" />
                                          <span className="text-xs font-bold text-emerald-950">1. Outbound Pickup (Start)</span>
                                        </div>
                                        <span className="text-[9px] font-semibold text-emerald-700 bg-white border border-emerald-200/80 px-1.5 py-0.5 rounded">
                                          Starting Point
                                        </span>
                                      </div>

                                      <div className="p-2.5 space-y-2">
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                                            Outbound Pickup Location *
                                          </label>
                                          <LocationCombobox
                                            customerId={contractCustomer}
                                            value={slot.origin}
                                            onChange={(locName, locObj) => handleSlotLocationChange(slot.id, 'origin', locName, locObj)}
                                            placeholder="Search starting origin (e.g. Riyadh)..."
                                            triggerClassName="h-8.5 border-emerald-200 bg-white shadow-2xs"
                                          />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                                              <Calendar className="w-3 h-3 text-emerald-600" /> Outbound Date *
                                            </label>
                                            <DatePicker
                                              value={slot.date || ''}
                                              onChange={(_, dateStr) => handleUpdateTripSlot(slot.id, { date: dateStr, dropoffDate: dateStr })}
                                              placeholder="Select date..."
                                              buttonClassName="h-8.5 border-emerald-200 bg-white shadow-2xs font-semibold text-xs text-slate-800"
                                              minDate={new Date()}
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                                              <Clock className="w-3 h-3 text-emerald-600" /> Outbound Time *
                                            </label>
                                            <TimePicker
                                              value={slot.pickupTime}
                                              onChange={(timeStr) => handleUpdateTripSlot(slot.id, { pickupTime: timeStr })}
                                              placeholder="Select time..."
                                              buttonClassName="h-8.5 border-emerald-200 bg-white shadow-2xs font-semibold text-xs text-slate-800"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    {/* SECTION 2: Outbound Dropoff (Destination) */}
                                    <div className="rounded-xl border border-orange-200/80 bg-orange-50/30 overflow-hidden space-y-2">
                                      <div className="p-2 bg-orange-50/80 border-b border-orange-100 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <span className="w-2 h-2 rounded-full bg-brand ring-2 ring-orange-200 shrink-0" />
                                          <span className="text-xs font-bold text-orange-950">2. Outbound Dropoff (Destination)</span>
                                        </div>
                                        <span className="text-[9px] font-semibold text-orange-700 bg-white border border-orange-200/80 px-1.5 py-0.5 rounded">
                                          Delivery Point
                                        </span>
                                      </div>

                                      <div className="p-2.5 space-y-2">
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-orange-900 uppercase tracking-wider block">
                                            Outbound Dropoff Location *
                                          </label>
                                          <LocationCombobox
                                            customerId={contractCustomer}
                                            value={slot.destination}
                                            onChange={(locName, locObj) => handleSlotLocationChange(slot.id, 'destination', locName, locObj)}
                                            placeholder="Search delivery destination (e.g. Dammam)..."
                                            triggerClassName="h-8.5 border-orange-200 bg-white shadow-2xs"
                                          />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-orange-900 uppercase tracking-wider flex items-center gap-1">
                                              <Calendar className="w-3 h-3 text-brand" /> Outbound Date *
                                            </label>
                                            <DatePicker
                                              value={slot.dropoffDate || ''}
                                              onChange={(_, dateStr) => handleUpdateTripSlot(slot.id, { dropoffDate: dateStr })}
                                              placeholder="Select date..."
                                              buttonClassName="h-8.5 border-orange-200 bg-white shadow-2xs font-semibold text-xs text-slate-800"
                                              minDate={slot.date ? new Date(slot.date) : new Date()}
                                            />
                                          </div>
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-orange-900 uppercase tracking-wider flex items-center gap-1">
                                              <Clock className="w-3 h-3 text-brand" /> Outbound Time *
                                            </label>
                                            <div className="flex items-center gap-1">
                                              <TimePicker
                                                value={slot.dropoffTime}
                                                onChange={(timeStr) => handleUpdateTripSlot(slot.id, { dropoffTime: timeStr })}
                                                placeholder="Select time..."
                                                buttonClassName="flex-1 h-8.5 border-orange-200 bg-white shadow-2xs font-semibold text-xs text-slate-800"
                                              />
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                  const [hh, mm] = (slot.dropoffTime || '12:00').split(':').map(Number);
                                                  const newHour = (hh + 1) % 24;
                                                  const newTime = `${String(newHour).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
                                                  const newDate = newHour === 0 ? addDays(slot.dropoffDate || slot.date, 1) : (slot.dropoffDate || slot.date);
                                                  handleUpdateTripSlot(slot.id, {
                                                    dropoffTime: newTime,
                                                    dropoffDate: newDate,
                                                    isOvernight: newHour === 0 ? true : slot.isOvernight
                                                  });
                                                }}
                                                className="h-8.5 w-8.5 p-0 rounded-lg border-orange-200 bg-white text-brand hover:bg-orange-50 shrink-0"
                                                title="Add 1 Hour"
                                              >
                                                <Plus className="w-3.5 h-3.5" />
                                              </Button>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <TransitTimeBadge
                                    origin={slot.origin}
                                    destination={slot.destination}
                                    originLat={slot.originLat}
                                    originLng={slot.originLng}
                                    destinationLat={slot.destinationLat}
                                    destinationLng={slot.destinationLng}
                                    pickupTime={slot.pickupTime}
                                    dropoffTime={slot.dropoffTime}
                                    onAutoSetDropoffTime={(suggestedTime, isOvernight) => {
                                      handleUpdateTripSlot(slot.id, {
                                        dropoffTime: suggestedTime,
                                        ...(isOvernight ? { isOvernight: true } : {}),
                                      });
                                    }}
                                  />

                                  {/* Outbound Intermediate Stops & Fees */}
                                  {slot.intermediateLocations.length > 0 && (
                                    <div className="space-y-2 pt-1.5 border-t border-slate-200/60">
                                      <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                                        Outbound Intermediate Stops & Fees ({slot.intermediateLocations.length})
                                      </span>
                                      <div className="space-y-2">
                                        {slot.intermediateLocations.map((loc, idx) => (
                                          <div key={idx} className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1.5">
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                                <MapPin className="w-3 h-3 text-emerald-600" />
                                                Outbound Stop #{idx + 1}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveSlotIntermediate(slot.id, idx)}
                                                className="text-slate-400 hover:text-rose-600 transition-colors text-[10px] font-semibold"
                                              >
                                                Remove Stop
                                              </button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                              <div className="sm:col-span-2">
                                                <LocationCombobox
                                          customerId={contractCustomer}
                                          value={loc}
                                                  onChange={(locId, locObj) => handleUpdateSlotIntermediate(slot.id, idx, locObj?.name || locObj?.address || (isUuid(locId) ? '' : locId))}
                                                  placeholder={`Search Outbound Stop #${idx + 1}...`}
                                                  triggerClassName="h-8 border-slate-200 bg-white"
                                                />
                                              </div>
                                              <div className="relative">
                                                <span className="absolute left-2.5 top-2 text-[11px] font-bold text-slate-400">SAR</span>
                                                <input
                                                  type="number"
                                                  value={slot.intermediateStopFees?.[idx] || ''}
                                                  onChange={(e) => handleUpdateSlotIntermediateFee(slot.id, idx, e.target.value)}
                                                  placeholder="Stop fee e.g. 150"
                                                  className="w-full h-8 pl-10 pr-2.5 rounded-lg border border-slate-200 text-xs font-bold text-right focus:outline-none focus:border-brand"
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                           {/* LEG 2: RETURN JOURNEY (CLOSED LOOP) */}
                                <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-200/80 space-y-2.5">
                                  <div className="flex items-center justify-between border-b border-indigo-100 pb-1.5">
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-indigo-600 text-white border-indigo-600 text-[10px] font-bold flex items-center gap-1">
                                        <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" />
                                        Leg 2: Return Journey Loop
                                      </Badge>
                                      <span className="text-xs font-bold text-indigo-950">Destination &rarr; Return to Origin</span>
                                    </div>
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="h-6 text-[10px] font-bold text-white bg-brand hover:bg-brand-hover active:scale-[0.98] transition-all shadow-xs rounded-lg gap-1 px-2.5 border-0"
                                      onClick={() => handleAddSlotReturnIntermediate(slot.id)}
                                    >
                                      <Plus className="w-3 h-3 text-white stroke-[2.5]" />
                                      Add Return Stop
                                    </Button>
                                  </div>

                                  {/* Curved Dual-Arrow Loop Banner */}
                                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/80 border border-indigo-200/80 shadow-2xs">
                                    <div className="flex items-center gap-2">
                                      <RotateCcw className="w-4 h-4 text-indigo-600 shrink-0" />
                                      <span className="text-xs font-extrabold text-slate-800">
                                        Return Loop automatically starts from Outbound Dropoff ({slot.destination || 'Destination'})
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 px-2 py-1 bg-indigo-50 rounded-lg text-xs font-black text-indigo-900 border border-indigo-200">
                                      <span>{slot.destination || 'Dropoff'}</span>
                                      <div className="flex flex-col items-center px-1">
                                        <svg className="w-6 h-2 text-emerald-500" viewBox="0 0 32 10" fill="none" stroke="currentColor" strokeWidth="2.5">
                                          <path d="M 2 8 C 10 2, 22 2, 30 8" />
                                          <path d="M 25 3 L 30 8 L 24 9" />
                                        </svg>
                                        <svg className="w-6 h-2 text-indigo-500" viewBox="0 0 32 10" fill="none" stroke="currentColor" strokeWidth="2.5">
                                          <path d="M 30 2 C 22 8, 10 8, 2 2" />
                                          <path d="M 7 7 L 2 2 L 8 1" />
                                        </svg>
                                      </div>
                                      <span>{slot.origin || 'Pickup'}</span>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 gap-3">                            </div>

                                    {/* SECTION 4: Return Dropoff (Final Home Destination) */}
                                    <div className="rounded-xl border border-purple-200/80 bg-purple-50/30 overflow-hidden space-y-2">
                                      <div className="p-2 bg-purple-50/80 border-b border-purple-100 flex items-center justify-between flex-wrap gap-1.5">
                                        <div className="flex items-center gap-1.5">
                                          <span className="w-2 h-2 rounded-full bg-purple-600 ring-2 ring-purple-200 shrink-0" />
                                          <span className="text-xs font-bold text-purple-950">4. Return Dropoff (Final Home)</span>
                                        </div>
                                        {Boolean(contractRateCategory && contractRateCategory.toLowerCase().includes('2 vehicles')) && (
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateTripSlot(slot.id, { returnIsOvernight: !slot.returnIsOvernight })}
                                            className={`text-[9px] font-bold flex items-center gap-1 px-1.5 py-0.5 rounded transition-all whitespace-nowrap ${
                                              slot.returnIsOvernight
                                                ? 'bg-indigo-600 text-white shadow-2xs'
                                                : 'bg-white text-indigo-900 border border-indigo-200 hover:bg-indigo-50'
                                            }`}
                                            title="Toggle Return Overnight (+1 Day)"
                                          >
                                            <Moon className={`w-2.5 h-2.5 ${slot.returnIsOvernight ? 'text-white fill-white' : 'text-indigo-600'}`} />
                                            {slot.returnIsOvernight ? '+1 Day (Overnight)' : '+1 Day'}
                                          </button>
                                        )}
                                      </div>

                                      <div className="p-2.5 space-y-2">
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider flex items-center justify-between">
                                            <span>Return Dropoff (Home) *</span>
                                            <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200/90 font-bold text-[9px] gap-1 px-1.5 py-0.5 rounded shadow-2xs">
                                              <RotateCcw className="w-2.5 h-2.5 text-emerald-600" />
                                              Auto-Linked Home Origin
                                            </Badge>
                                          </label>
                                          <LocationCombobox
                                          customerId={contractCustomer}
                                          value={slot.returnDestination || slot.origin}
                                            onChange={(locName, locObj) => handleUpdateTripSlot(slot.id, {
                                              returnDestination: locName,
                                              returnDestinationLat: locObj?.lat ?? null,
                                              returnDestinationLng: locObj?.lng ?? null
                                            })}
                                            placeholder="Search final home destination..."
                                            triggerClassName="h-8.5 border-purple-200 bg-white shadow-2xs"
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-purple-600" /> Return Drop-off Time *
                                          </label>
                                          <div className="flex items-center gap-1.5">
                                            <TimePicker
                                              value={slot.returnDropoffTime || '22:00'}
                                              onChange={(timeStr) => handleUpdateTripSlot(slot.id, { returnDropoffTime: timeStr })}
                                              placeholder="Select time..."
                                              buttonClassName={`flex-1 h-8.5 text-xs font-semibold shadow-2xs ${
                                                slot.returnIsOvernight
                                                  ? 'border-indigo-300 bg-indigo-50/30 text-indigo-950'
                                                  : 'border-purple-200 bg-white text-slate-800'
                                              }`}
                                            />
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                const [hh, mm] = (slot.returnDropoffTime || '22:00').split(':').map(Number);
                                                const newHour = (hh + 1) % 24;
                                                const newTime = `${String(newHour).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
                                                handleUpdateTripSlot(slot.id, {
                                                  returnDropoffTime: newTime,
                                                  returnIsOvernight: newHour === 0 ? true : slot.returnIsOvernight
                                                });
                                              }}
                                              className="h-8.5 w-8.5 p-0 rounded-lg border-purple-200 bg-white text-[#7c3aed] hover:bg-purple-50 shrink-0"
                                              title="Add 1 Hour"
                                            >
                                              <Plus className="w-3.5 h-3.5" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  <TransitTimeBadge
                                    origin={slot.returnOrigin || slot.destination}
                                    destination={slot.returnDestination || slot.origin}
                                    originLat={slot.returnOriginLat || slot.destinationLat}
                                    originLng={slot.returnOriginLng || slot.destinationLng}
                                    destinationLat={slot.returnDestinationLat || slot.originLat}
                                    destinationLng={slot.returnDestinationLng || slot.originLng}
                                    pickupTime={slot.returnPickupTime || '14:00'}
                                    dropoffTime={slot.returnDropoffTime}
                                    onAutoSetDropoffTime={(suggestedTime, isOvernight) => {
                                      handleUpdateTripSlot(slot.id, {
                                        returnDropoffTime: suggestedTime,
                                        ...(isOvernight ? { returnIsOvernight: true } : {}),
                                      });
                                    }}
                                  />

                                  {/* Return Intermediate Stops & Fees */}
                                  {(slot.returnIntermediateLocations || []).length > 0 && (
                                    <div className="space-y-2 pt-1.5 border-t border-indigo-100">
                                      <span className="text-[10px] font-bold text-indigo-950 uppercase tracking-wider block">
                                        Return Intermediate Stops & Fees ({(slot.returnIntermediateLocations || []).length})
                                      </span>
                                      <div className="space-y-2">
                                        {(slot.returnIntermediateLocations || []).map((loc, idx) => (
                                          <div key={idx} className="p-2.5 rounded-lg bg-white border border-indigo-200 space-y-1.5">
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                                                <MapPin className="w-3 h-3 text-purple-600" />
                                                Return Stop #{idx + 1}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveSlotReturnIntermediate(slot.id, idx)}
                                                className="text-slate-400 hover:text-rose-600 transition-colors text-[10px] font-semibold"
                                              >
                                                Remove Stop
                                              </button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                              <div className="sm:col-span-2">
                                                <LocationCombobox
                                          customerId={contractCustomer}
                                          value={loc}
                                                  onChange={(locId, locObj) => handleUpdateSlotReturnIntermediate(slot.id, idx, locObj?.name || locObj?.address || (isUuid(locId) ? '' : locId))}
                                                  placeholder={`Search Return Stop #${idx + 1}...`}
                                                  triggerClassName="h-8 border-indigo-200 bg-white"
                                                />
                                              </div>
                                              <div className="relative">
                                                <span className="absolute left-2.5 top-2 text-[11px] font-bold text-slate-400">SAR</span>
                                                <input
                                                  type="number"
                                                  value={slot.returnIntermediateStopFees?.[idx] || ''}
                                                  onChange={(e) => handleUpdateSlotReturnIntermediateFee(slot.id, idx, e.target.value)}
                                                  placeholder="Stop fee e.g. 150"
                                                  className="w-full h-8 pl-10 pr-2.5 rounded-lg border border-indigo-200 text-xs font-bold text-right focus:outline-none focus:border-indigo-600"
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              /* Option 2: Split Side-by-Side (Origin | Destination) with Middle Intermediate List */
                              <div className="space-y-3 pt-0.5">
                                {/* 1. TOP ROW: Side-by-Side Pickup (Origin) & Dropoff (Destination) Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {/* 🟢 PICKUP STOP CARD (ORIGIN) */}
                                  <div className="rounded-xl border border-emerald-200/90 bg-emerald-50/40 dark:bg-emerald-950/20 p-2.5 space-y-2 shadow-2xs">
                                    <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-900/50 pb-1.5">
                                      <span className="text-xs font-black text-emerald-950 dark:text-emerald-100 uppercase tracking-wider flex items-center gap-1.5">
                                        <MapPin className="w-3.5 h-3.5 text-emerald-600 fill-emerald-100" /> Pickup Stop (Origin)
                                      </span>
                                      <span className="text-[9px] font-bold text-emerald-700 bg-white dark:bg-slate-900 border border-emerald-200 px-2 py-0.5 rounded">
                                        Route Start
                                      </span>
                                    </div>

                                    <div className="space-y-2">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider block">
                                          Pickup Location *
                                        </label>
                                        <LocationCombobox
                                          customerId={contractCustomer}
                                          value={slot.origin}
                                          onChange={(locName, locObj) => handleSlotLocationChange(slot.id, 'origin', locName, locObj)}
                                          placeholder="Search or select pickup location..."
                                          triggerClassName="h-8.5 border-emerald-200 bg-white shadow-2xs"
                                        />
                                      </div>

                                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                                            <Calendar className="w-3 h-3 text-emerald-600" /> Pickup Date *
                                          </label>
                                          <DatePicker
                                            value={slot.date || ''}
                                            onChange={(_, dateStr) => handleUpdateTripSlot(slot.id, { date: dateStr, dropoffDate: dateStr })}
                                            placeholder="Select date..."
                                            buttonClassName="h-8.5 border-emerald-200 bg-white shadow-2xs font-semibold text-xs text-slate-800"
                                            minDate={new Date()}
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-emerald-600" /> Pickup Time *
                                          </label>
                                          <TimePicker
                                            value={slot.pickupTime}
                                            onChange={(timeStr) => handleUpdateTripSlot(slot.id, { pickupTime: timeStr })}
                                            placeholder="Select time..."
                                            buttonClassName="h-8.5 border-emerald-200 bg-white shadow-2xs font-semibold text-xs text-slate-800"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* 🟠 DROPOFF STOP CARD (DESTINATION) */}
                                  <div className="rounded-xl border border-orange-200/90 bg-orange-50/40 dark:bg-orange-950/20 p-2.5 space-y-2 shadow-2xs">
                                    <div className="flex items-center justify-between border-b border-orange-100 dark:border-orange-900/50 pb-1.5">
                                      <span className="text-xs font-black text-orange-950 dark:text-orange-100 uppercase tracking-wider flex items-center gap-1.5">
                                        <MapPin className="w-3.5 h-3.5 text-brand fill-orange-100" /> Dropoff Stop (Destination)
                                      </span>

                                      {Boolean(contractRateCategory && contractRateCategory.toLowerCase().includes('2 vehicles')) && (
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateTripSlot(slot.id, { isOvernight: !slot.isOvernight })}
                                          className={`text-[9px] font-bold flex items-center gap-1 px-1.5 py-0.5 rounded transition-all whitespace-nowrap ${
                                            slot.isOvernight
                                              ? 'bg-indigo-600 text-white shadow-2xs'
                                              : 'bg-white text-indigo-900 border border-indigo-200 hover:bg-indigo-50'
                                          }`}
                                          title="Toggle Overnight / Next-Day Return trip (+1 Day)"
                                        >
                                          <Moon className={`w-2.5 h-2.5 ${slot.isOvernight ? 'text-white fill-white' : 'text-indigo-600'}`} />
                                          +1 Day
                                        </button>
                                      )}
                                    </div>

                                    <div className="space-y-2">
                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-orange-900 dark:text-orange-300 uppercase tracking-wider block">
                                          Dropoff Location *
                                        </label>
                                        <LocationCombobox
                                          customerId={contractCustomer}
                                          value={slot.destination}
                                          onChange={(locName, locObj) => handleSlotLocationChange(slot.id, 'destination', locName, locObj)}
                                          placeholder="Search or select dropoff location..."
                                          triggerClassName="h-8.5 bg-white shadow-2xs border-orange-200"
                                        />
                                      </div>

                                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-orange-900 dark:text-orange-300 uppercase tracking-wider flex items-center gap-1">
                                            <Calendar className="w-3 h-3 text-brand" /> Drop-off Date *
                                          </label>
                                          <DatePicker
                                            value={slot.dropoffDate || ''}
                                            onChange={(_, dateStr) => handleUpdateTripSlot(slot.id, { dropoffDate: dateStr })}
                                            placeholder="Select date..."
                                            buttonClassName="h-8.5 border-orange-200 bg-white shadow-2xs font-semibold text-xs text-slate-800"
                                            minDate={slot.date ? new Date(slot.date) : new Date()}
                                          />
                                        </div>
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-orange-900 dark:text-orange-300 uppercase tracking-wider flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-brand" /> Drop-off Time *
                                          </label>
                                          <div className="flex items-center gap-1">
                                            <TimePicker
                                              value={slot.dropoffTime}
                                              onChange={(timeStr) => handleUpdateTripSlot(slot.id, { dropoffTime: timeStr })}
                                              placeholder="Select time..."
                                              buttonClassName={`flex-1 h-8.5 text-xs font-semibold shadow-2xs ${
                                                slot.isOvernight
                                                  ? 'border-indigo-300 bg-indigo-50/30 text-indigo-950'
                                                  : 'border-orange-200 bg-white text-slate-800'
                                              }`}
                                            />
                                            <Button
                                              type="button"
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                const [hh, mm] = (slot.dropoffTime || '12:00').split(':').map(Number);
                                                const newHour = (hh + 1) % 24;
                                                const newTime = `${String(newHour).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
                                                const newDate = newHour === 0 ? addDays(slot.dropoffDate || slot.date, 1) : (slot.dropoffDate || slot.date);
                                                handleUpdateTripSlot(slot.id, {
                                                  dropoffTime: newTime,
                                                  dropoffDate: newDate,
                                                  isOvernight: newHour === 0 ? true : slot.isOvernight
                                                });
                                              }}
                                              className="h-8.5 w-8.5 p-0 rounded-lg border-orange-200 bg-white text-brand hover:bg-orange-50 shrink-0"
                                              title="Add 1 Hour"
                                            >
                                              <Plus className="w-3.5 h-3.5" />
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* 2. TRANSIT TIME & MARGIN BADGE */}
                                <TransitTimeBadge
                                  origin={slot.origin}
                                  destination={slot.destination}
                                  originLat={slot.originLat}
                                  originLng={slot.originLng}
                                  destinationLat={slot.destinationLat}
                                  destinationLng={slot.destinationLng}
                                  pickupTime={slot.pickupTime}
                                  dropoffTime={slot.dropoffTime}
                                  onAutoSetDropoffTime={(suggestedTime, isOvernight) => {
                                    handleUpdateTripSlot(slot.id, {
                                      dropoffTime: suggestedTime,
                                      ...(isOvernight ? { isOvernight: true } : {}),
                                    });
                                  }}
                                />

                                {/* 3. MIDDLE SECTION: COMPACT INTERMEDIATE STOPS LIST */}
                                {slot.intermediateLocations.length > 0 && (
                                  <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/20 dark:bg-indigo-950/20 p-2.5 space-y-2">
                                    <div className="flex items-center justify-between border-b border-indigo-100 dark:border-indigo-900/50 pb-1.5">
                                      <span className="text-xs font-black text-indigo-950 dark:text-indigo-100 uppercase tracking-wider flex items-center gap-1.5">
                                        <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                                        Intermediate Stops ({slot.intermediateLocations.length})
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleAddSlotIntermediate(slot.id)}
                                        className="text-[10px] font-bold text-indigo-700 bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-md hover:bg-indigo-50 dark:hover:bg-indigo-950 flex items-center gap-1 transition-all cursor-pointer"
                                      >
                                        <Plus className="w-3 h-3 text-indigo-600" />
                                        Add Stop
                                      </button>
                                    </div>

                                    {/* COMPACT SINGLE-LINE ROWS */}
                                    <div className="space-y-1.5">
                                      {slot.intermediateLocations.map((loc, idx) => (
                                        <div
                                          key={idx}
                                          draggable
                                          onDragStart={(e) => e.dataTransfer.setData('text/plain', String(idx))}
                                          onDragOver={(e) => e.preventDefault()}
                                          onDrop={(e) => {
                                            e.preventDefault();
                                            const fromIdx = Number(e.dataTransfer.getData('text/plain'));
                                            if (!isNaN(fromIdx) && fromIdx !== idx) {
                                              handleMoveSlotIntermediate(slot.id, fromIdx, idx);
                                            }
                                          }}
                                          className="flex items-center gap-2 p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-900/60 shadow-2xs group hover:border-indigo-300 transition-all"
                                        >
                                          {/* Drag Handle & Index */}
                                          <div className="flex items-center gap-1 shrink-0">
                                            <span className="cursor-grab active:cursor-grabbing p-0.5 hover:bg-indigo-50 rounded text-slate-400 hover:text-indigo-600" title="Drag to reorder stop">
                                              <GripVertical className="w-3.5 h-3.5" />
                                            </span>
                                            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 text-[10px] font-extrabold flex items-center justify-center">
                                              #{idx + 1}
                                            </span>
                                          </div>

                                          {/* Location Combobox (Flex Fill) */}
                                          <div className="flex-1 min-w-[200px]">
                                            <LocationCombobox
                                              customerId={contractCustomer}
                                              value={loc}
                                              onChange={(locId, locObj) => {
                                                const displayName = locObj?.name || locObj?.address || (isUuid(locId) ? '' : locId);
                                                const resolvedId = locObj?.id || (isUuid(locId) ? locId : null);
                                                handleUpdateSlotIntermediate(slot.id, idx, displayName, resolvedId);
                                                setTimeout(() => triggerRateLookupForSlots(), 50);
                                              }}
                                              placeholder={`Intermediate Stop #${idx + 1}...`}
                                              triggerClassName="h-8 border-slate-200 bg-white shadow-2xs text-xs font-medium"
                                            />
                                          </div>

                                          {/* Stop Fee Input (Compact) */}
                                          <div className="w-32 relative shrink-0">
                                            <span className="absolute left-2 top-1.5 text-[10px] font-bold text-slate-400">SAR</span>
                                            <input
                                              type="number"
                                              value={slot.intermediateStopFees?.[idx] || ''}
                                              onChange={(e) => handleUpdateSlotIntermediateFee(slot.id, idx, e.target.value)}
                                              placeholder="Stop Fee"
                                              className="w-full h-8 pl-8 pr-2 rounded-md border border-slate-200 text-xs font-bold text-right focus:outline-none focus:border-brand bg-white"
                                            />
                                          </div>

                                          {/* Reorder Up / Down Micro-Buttons */}
                                          <div className="flex items-center gap-0.5 shrink-0 opacity-70 group-hover:opacity-100">
                                            <button
                                              type="button"
                                              disabled={idx === 0}
                                              onClick={() => handleMoveSlotIntermediate(slot.id, idx, idx - 1)}
                                              className="p-1 rounded text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 disabled:opacity-20 cursor-pointer"
                                              title="Move stop up"
                                            >
                                              <ChevronUp className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              disabled={idx === slot.intermediateLocations.length - 1}
                                              onClick={() => handleMoveSlotIntermediate(slot.id, idx, idx + 1)}
                                              className="p-1 rounded text-slate-400 hover:text-indigo-700 hover:bg-indigo-50 disabled:opacity-20 cursor-pointer"
                                              title="Move stop down"
                                            >
                                              <ChevronDown className="w-3.5 h-3.5" />
                                            </button>
                                          </div>

                                          {/* Trash Remove Button */}
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveSlotIntermediate(slot.id, idx)}
                                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors shrink-0 cursor-pointer"
                                            title="Remove stop"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* STEP 3: ASSIGNMENT & BILLING */}
                  {contractStep === 3 && (
                    <div className="space-y-3.5 animate-fade-in">
                      {/* Top Bar: Title & Assignment Switcher */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <h4 className="text-sm font-extrabold text-[#111111] dark:text-slate-100 flex items-center gap-2">
                          <Truck className="w-4 h-4 text-brand" />
                          Assignment & Billing
                        </h4>

                        {/* Assignment Source Switcher: Own Fleet vs. Third Party */}
                        <div className="inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200/80 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => setAssignmentType('own')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                              assignmentType === 'own'
                                ? 'bg-white dark:bg-slate-900 text-brand shadow-2xs'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            <Truck className="w-3.5 h-3.5" />
                            Own Fleet
                          </button>
                          <button
                            type="button"
                            onClick={() => setAssignmentType('third_party')}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                              assignmentType === 'third_party'
                                ? 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-300 shadow-2xs'
                                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                            }`}
                          >
                            <Building2 className="w-3.5 h-3.5" />
                            Third-Party Vehicle (3PL)
                          </button>
                        </div>
                      </div>

                      {/* Live Financial Margin Indicator (Compact 1-Liner) */}
                      <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2 text-xs font-extrabold text-slate-800 dark:text-slate-200">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>Customer Billing: <strong className="font-mono text-slate-900 dark:text-slate-100">SAR {marginMetrics.totalBilling.toLocaleString()}</strong></span>
                          <span className="text-slate-300 dark:text-slate-700">|</span>
                          <span>Driver/3PL Payout: <strong className="font-mono text-slate-900 dark:text-slate-100">SAR {marginMetrics.totalCost.toLocaleString()}</strong></span>
                        </div>

                        <Badge
                          className={`px-2.5 py-0.5 rounded-lg font-mono font-extrabold text-xs gap-1 shadow-2xs border ${
                            marginMetrics.isHigh
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                              : marginMetrics.isMedium
                              ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
                              : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                          }`}
                        >
                          <Zap className="w-3 h-3" />
                          Profit: SAR {marginMetrics.profit.toLocaleString()} ({marginMetrics.marginPct.toFixed(1)}%)
                        </Badge>
                      </div>

                      {/* OPTION A: OWN FLEET SELECTORS */}
                      {assignmentType === 'own' && (
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-2.5 shadow-2xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-brand" />
                              Select Driver & Vehicle
                            </span>
                            <Button
                              type="button"
                              onClick={() => setIsCreateDriverOpen(true)}
                              className="h-6 px-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 shadow-2xs transition-all border-none cursor-pointer"
                            >
                              <Plus className="w-3 h-3 text-white" />
                              Add Driver
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Assigned Driver</label>
                              <Combobox
                                options={[
                                  { value: 'unassigned', label: '-- Unassigned --' },
                                  ...driverOptions
                                ]}
                                value={masterDriver}
                                onChange={handleDriverChange}
                                placeholder="Select driver"
                                searchPlaceholder="Search driver..."
                                emptyText="No drivers found."
                                triggerClassName="h-8 rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-semibold w-full"
                              />
                              {driverConflictWarning && (
                                <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[10px] font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 mt-1">
                                  <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>{driverConflictWarning}</span>
                                </div>
                              )}
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Assigned Truck</label>
                              <Combobox
                                options={[
                                  { value: 'unassigned', label: '-- Unassigned --' },
                                  ...vehicleOptions
                                ]}
                                value={masterVehicle}
                                onChange={handleVehicleChange}
                                placeholder="Select vehicle"
                                searchPlaceholder="Search vehicle..."
                                emptyText="No vehicles found."
                                triggerClassName="h-8 rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-semibold w-full"
                              />
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Vehicle Type</label>
                                {!isVehicleTypeEditable && (
                                  <button
                                    type="button"
                                    onClick={() => setIsVehicleTypeEditable(true)}
                                    className="text-[10px] font-bold text-brand hover:underline cursor-pointer"
                                  >
                                    Edit
                                  </button>
                                )}
                              </div>
                              <Select
                                value={contractVehicleType}
                                onValueChange={(val) => {
                                  setContractVehicleType(val);
                                  setIsVehicleTypeEditable(false);
                                  triggerRateLookupForSlots(val);
                                }}
                                disabled={!isVehicleTypeEditable}
                              >
                                <SelectTrigger className="h-8 w-full rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100 disabled:opacity-80" title="Vehicle Type">
                                  <SelectValue placeholder="Vehicle Type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {VEHICLE_TYPES.map((type) => (
                                    <SelectItem key={type} value={type} className="text-xs font-semibold">
                                      {type}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* OPTION B: THIRD-PARTY / 3PL SUBCONTRACTOR SELECTORS */}
                      {assignmentType === 'third_party' && (
                        <div className="p-3 rounded-xl bg-purple-50/20 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-900/40 space-y-2.5">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-xs font-extrabold text-purple-900 dark:text-purple-300 flex items-center gap-1.5">
                              <Building2 className="w-3.5 h-3.5 text-purple-600" />
                              Assign 3PL Carrier & Vehicle
                            </span>
                            <Button
                              type="button"
                              onClick={() => setIsCreateProviderOpen(true)}
                              className="h-6 px-2 bg-purple-600 hover:bg-purple-700 text-white text-[10px] font-bold rounded-lg flex items-center gap-1 shadow-2xs transition-all border-none cursor-pointer"
                            >
                              <Plus className="w-3 h-3 text-white" />
                              Add Provider
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">3PL Provider *</label>
                              <Select value={thirdPartyProviderId} onValueChange={setThirdPartyProviderId}>
                                <SelectTrigger className="h-8 w-full rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-semibold">
                                  <SelectValue placeholder="Select provider" />
                                </SelectTrigger>
                                <SelectContent>
                                  {thirdPartyProviders.map((p) => (
                                    <SelectItem key={p.id} value={p.id} className="text-xs font-semibold">
                                      {p.name} {p.phone ? `(${p.phone})` : ''}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">3PL Plate *</label>
                              <input
                                type="text"
                                value={thirdPartyVehiclePlate}
                                onChange={(e) => setThirdPartyVehiclePlate(e.target.value)}
                                placeholder="e.g. 1234 ABC"
                                className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-800 outline-none focus:border-purple-500 text-slate-900 dark:text-slate-100"
                              />
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Vehicle Type</label>
                                {isCustomThirdPartyVehicleType && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsCustomThirdPartyVehicleType(false);
                                      setContractVehicleType(VEHICLE_TYPES[0] || 'Flatbed');
                                    }}
                                    className="text-[10px] font-bold text-brand hover:underline cursor-pointer"
                                  >
                                    Select
                                  </button>
                                )}
                              </div>
                              {isCustomThirdPartyVehicleType ? (
                                <input
                                  type="text"
                                  value={contractVehicleType}
                                  onChange={(e) => setContractVehicleType(e.target.value)}
                                  placeholder="Custom type..."
                                  className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-800 outline-none focus:border-purple-500 text-slate-900 dark:text-slate-100"
                                />
                              ) : (
                                <Select
                                  value={contractVehicleType}
                                  onValueChange={(val) => {
                                    if (val === 'custom') {
                                      setIsCustomThirdPartyVehicleType(true);
                                      setContractVehicleType('');
                                    } else {
                                      setContractVehicleType(val);
                                      triggerRateLookupForSlots(val);
                                    }
                                  }}
                                >
                                  <SelectTrigger className="h-8 w-full rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100" title="Vehicle Type">
                                    <SelectValue placeholder="Vehicle Type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {VEHICLE_TYPES.map((type) => (
                                      <SelectItem key={type} value={type} className="text-xs font-semibold">
                                        {type}
                                      </SelectItem>
                                    ))}
                                    <SelectItem value="custom" className="text-xs font-semibold text-purple-700">
                                      Custom...
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1.5 border-t border-purple-100 dark:border-purple-900/30">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">3PL Driver Name</label>
                              <input
                                type="text"
                                value={thirdPartyDriverName}
                                onChange={(e) => setThirdPartyDriverName(e.target.value)}
                                placeholder="e.g. Tariq Mahmoud"
                                className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-800 outline-none focus:border-purple-500 text-slate-900 dark:text-slate-100"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">3PL Phone</label>
                              <input
                                type="text"
                                value={thirdPartyDriverPhone}
                                onChange={(e) => setThirdPartyDriverPhone(e.target.value)}
                                placeholder="e.g. +966 50 123 4567"
                                className="w-full h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold bg-white dark:bg-slate-800 outline-none focus:border-purple-500 text-slate-900 dark:text-slate-100"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">3PL Cost (SAR)</label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-2 text-[10px] font-bold text-slate-400">SAR</span>
                                <input
                                  type="number"
                                  value={thirdPartyCost}
                                  onChange={(e) => setThirdPartyCost(e.target.value)}
                                  placeholder="0.00"
                                  className="w-full h-8 pl-9 pr-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold text-right bg-white dark:bg-slate-800 outline-none focus:border-purple-500 text-slate-900 dark:text-slate-100"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Per-slot Billing Amount & Trip Charge */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-200/60 dark:border-slate-800 pb-1.5">
                          <div className="flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">Trip Rates & Payout</span>
                          </div>
                          {contractVehicleType && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 flex items-center gap-1">
                              <Truck className="w-3 h-3" />
                              Tier: {contractVehicleType}
                            </span>
                          )}
                        </div>

                        <div className="space-y-2.5">
                          {contractSlots.map((slot, idx) => {
                            const dateObj = slot.date ? new Date(slot.date) : new Date();
                            const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
                            const stopFeesSum = (slot.intermediateStopFees || []).reduce((sum, f) => sum + (Number(f) || 0), 0);
                            const baseAmount = Number(slot.billingAmount) || 0;
                            const totalBillingAmount = baseAmount + stopFeesSum;
                            const driverPayout = Number(slot.tripCharges) || 0;
                            const marginAmount = totalBillingAmount - driverPayout;
                            const marginPercent = totalBillingAmount > 0 ? Math.round((marginAmount / totalBillingAmount) * 100) : 0;

                            return (
                              <div key={slot.id} className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2.5 shadow-2xs">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">Slot {idx + 1} — {formattedDate}</span>
                                    <span className="text-xs font-semibold text-slate-500">({slot.origin || '—'} → {slot.destination || '—'})</span>
                                  </div>
                                  {slot.rateMatched ? (
                                    <span className="text-[10px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                      <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Quotation Matched {slot.rateCardName ? `(${slot.rateCardName})` : ''}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                                      <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Custom Rate / No Quotation
                                    </span>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                  {/* Customer Billing Charge */}
                                  <div className="space-y-1.5 p-2.5 rounded-lg bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 flex flex-col justify-between">
                                    <div>
                                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                                        <span>Customer Billing (SAR)</span>
                                        {slot.rateCardBasePrice != null && slot.rateMatched && (
                                          <span className="text-emerald-600 dark:text-emerald-400 font-mono">Rate Card: SAR {slot.rateCardBasePrice.toLocaleString()}</span>
                                        )}
                                      </div>
                                      <div className="relative mt-1">
                                        <span className="absolute left-2.5 top-2 text-[10px] font-bold text-slate-400">SAR</span>
                                        <input
                                          type="number"
                                          value={slot.billingAmount}
                                          onChange={(e) => handleUpdateTripSlot(slot.id, { billingAmount: e.target.value, rateMatched: false })}
                                          placeholder="0.00"
                                          className={`w-full h-8.5 pl-9 pr-2.5 rounded-lg border text-xs font-mono font-extrabold text-right focus:outline-none bg-white dark:bg-slate-900 transition-colors ${
                                            slot.rateMatched
                                              ? 'border-emerald-300 focus:border-emerald-500 text-emerald-950 dark:text-emerald-100'
                                              : 'border-slate-200 dark:border-slate-700 focus:border-emerald-400 text-slate-900 dark:text-slate-100'
                                          }`}
                                        />
                                      </div>
                                      {stopFeesSum > 0 && (
                                        <div className="text-[10px] text-right font-semibold text-slate-500 mt-1">
                                          + {stopFeesSum.toLocaleString()} SAR stops = <strong className="text-brand">{totalBillingAmount.toLocaleString()} SAR</strong> Total
                                        </div>
                                      )}
                                    </div>

                                    {/* Option A: Direct Integration inside Customer Billing Box */}
                                    {!slot.rateMatched && (
                                      <label className="mt-2 flex items-center justify-between gap-1.5 px-2.5 py-1 rounded-md bg-amber-50/90 dark:bg-amber-950/50 border border-amber-200/90 dark:border-amber-800 text-[11px] font-bold text-amber-950 dark:text-amber-200 cursor-pointer shadow-2xs hover:bg-amber-100/70 transition-all select-none">
                                        <span className="flex items-center gap-1.5 text-[11px]">
                                          <input
                                            type="checkbox"
                                            checked={!!slot.saveAsQuotation || !!slot.saveAsRateCard}
                                            onChange={(e) => handleUpdateTripSlot(slot.id, { saveAsQuotation: e.target.checked, saveAsRateCard: e.target.checked })}
                                            className="w-3.5 h-3.5 rounded border-amber-400 text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer shrink-0"
                                          />
                                          <span>Save rate as Quotation</span>
                                        </span>
                                        <span className="text-[9px] font-mono text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/60 px-1 py-0.2 rounded border border-amber-200 dark:border-amber-700">
                                          {contractVehicleType || '10 TON'}
                                        </span>
                                      </label>
                                    )}
                                  </div>

                                  {/* Driver Trip Charge */}
                                  <div className="space-y-1 p-2.5 rounded-lg bg-amber-50/40 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
                                      <span>Driver Payout (SAR)</span>
                                      {slot.rateCardDefaultTripCharge != null && slot.rateMatched && (
                                        <span className="text-emerald-600 dark:text-emerald-400">Rate Card: SAR {slot.rateCardDefaultTripCharge.toLocaleString()}</span>
                                      )}
                                    </div>
                                    <div className="relative">
                                      <span className="absolute left-2.5 top-2 text-[10px] font-bold text-slate-400">SAR</span>
                                      <input
                                        type="number"
                                        value={slot.tripCharges}
                                        onChange={(e) => handleUpdateTripSlot(slot.id, { tripCharges: e.target.value })}
                                        placeholder="0.00"
                                        className="w-full h-8.5 pl-9 pr-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-mono font-extrabold text-right focus:outline-none bg-white dark:bg-slate-900 focus:border-amber-400 text-slate-900 dark:text-slate-100"
                                      />
                                    </div>
                                    {/* Presets */}
                                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                                      {LOCAL_TRIP_CHARGE_PRESETS.map((preset) => (
                                        <button
                                          key={preset.label}
                                          type="button"
                                          onClick={() => handleUpdateTripSlot(slot.id, {
                                            tripCharges: String(preset.amount),
                                            ...(!slot.rateMatched ? { saveAsRateCard: true } : {}),
                                          })}
                                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                                            Number(slot.tripCharges) === preset.amount
                                              ? 'bg-amber-500 border-amber-500 text-white'
                                              : 'bg-white dark:bg-slate-900 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-950/40'
                                          }`}
                                        >
                                          {preset.label} {preset.amount}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                {/* Slot Margin Pill Bar */}
                                {totalBillingAmount > 0 && driverPayout > 0 && (
                                  <div className="flex flex-wrap items-center justify-between text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700 text-slate-600 dark:text-slate-300 gap-2">
                                    <span>Billed: <strong className="text-emerald-700 dark:text-emerald-400 font-mono">SAR {totalBillingAmount.toLocaleString()}</strong></span>
                                    <span>Payout: <strong className="text-amber-700 dark:text-amber-400 font-mono">SAR {driverPayout.toLocaleString()}</strong></span>
                                    <span>
                                      Margin:{' '}
                                      <strong className={`font-mono ${marginAmount >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                        SAR {marginAmount.toLocaleString()} ({marginPercent}%)
                                      </strong>
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: REVIEW */}
                  {contractStep === 4 && (
                    <div className="space-y-3.5 animate-fade-in">
                      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                        <h4 className="text-sm font-bold text-[#111111] dark:text-slate-100 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-brand" />
                          Review & Confirm
                        </h4>
                        <span className="text-xs font-bold text-slate-500">
                          {contractSlots.length} Trip{contractSlots.length > 1 ? 's' : ''} Ready to Create
                        </span>
                      </div>

                      {/* Summary Header Cards */}
                      {(() => {
                        const customerObj = customers.find((c) => c.id === contractCustomer);
                        const driverObj = drivers.find((d) => d.id === masterDriver);
                        const vehicleObj = vehicles.find((v) => v.id === masterVehicle);
                        const providerObj = thirdPartyProviders.find((p) => p.id === thirdPartyProviderId);
                        const baseBillingSum = contractSlots.reduce((sum, s) => sum + (Number(s.billingAmount) || 0), 0);
                        const additionalChargesSum = contractSlots.reduce((sum, s) => {
                          return sum + (s.intermediateStopFees || []).reduce((a, f) => a + (Number(f) || 0), 0);
                        }, 0);
                        const totalAmountSum = baseBillingSum + additionalChargesSum;

                        const totalTripCharges = contractSlots.reduce((sum, s) => {
                          if (assignmentType === 'third_party') {
                            return sum + (thirdPartyCost ? Number(thirdPartyCost) : (Number(s.tripCharges) || 0));
                          }
                          return sum + (Number(s.tripCharges) || 0);
                        }, 0);

                        const balanceAmount = totalAmountSum - totalTripCharges;

                        return (
                          <div className="space-y-3">
                            {/* Financial Ledger Breakdown Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
                              {[
                                { label: 'Customer', value: customerObj?.name || '—', icon: User },
                                assignmentType === 'third_party'
                                  ? { label: '3PL Provider', value: providerObj?.name || (thirdPartyDriverName ? `3PL (${thirdPartyDriverName})` : 'Third-Party'), icon: Building2 }
                                  : { label: 'Driver', value: driverObj ? `${driverObj.first_name} ${driverObj.last_name}` : 'Unassigned', icon: User },
                                assignmentType === 'third_party'
                                  ? { label: '3PL Vehicle', value: thirdPartyVehiclePlate ? `${thirdPartyVehiclePlate} (${contractVehicleType})` : '3PL Vehicle', icon: Truck }
                                  : { label: 'Truck', value: vehicleObj ? `${vehicleObj.plate_number} (${vehicleObj.asset_type})` : 'Unassigned', icon: Truck },
                                { label: 'Billing Rate', value: baseBillingSum > 0 ? `SAR ${baseBillingSum.toLocaleString()}` : '—', icon: DollarSign, accent: 'text-emerald-700' },
                                { label: 'Total Billed (inc. Stops)', value: totalAmountSum > 0 ? `SAR ${totalAmountSum.toLocaleString()}` : '—', icon: DollarSign, accent: 'text-emerald-800 font-extrabold' },
                                { label: 'Driver Charge', value: totalTripCharges > 0 ? `SAR ${totalTripCharges.toLocaleString()}` : '—', icon: DollarSign, accent: 'text-indigo-700' },
                                { label: 'Balance', value: totalAmountSum > 0 ? `SAR ${balanceAmount.toLocaleString()}` : '—', icon: DollarSign, accent: balanceAmount >= 0 ? 'text-emerald-600 font-extrabold' : 'text-rose-600 font-extrabold' },
                              ].map((item) => {
                                const Icon = item.icon;
                                return (
                                  <div key={item.label} className="p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <Icon className="w-3 h-3 text-slate-400" />
                                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{item.label}</span>
                                    </div>
                                    <div className={`text-xs font-extrabold truncate ${item.accent || 'text-[#111111] dark:text-slate-100'}`}>{item.value}</div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* NEW QUOTATIONS CREATION CONFIRMATION BAR */}
                            {contractSlots.some((s) => (s.saveAsQuotation || s.saveAsRateCard) && Number(s.billingAmount) > 0) && (
                              <div className="p-3 rounded-xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 shadow-2xs space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <CreditCard className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                    <span className="text-xs font-extrabold text-amber-950 dark:text-amber-100">
                                      New Quotation(s) Will Be Saved ({contractSlots.filter((s) => (s.saveAsQuotation || s.saveAsRateCard) && Number(s.billingAmount) > 0).length})
                                    </span>
                                  </div>
                                  <span className="text-[10px] text-amber-800 dark:text-amber-300 font-semibold">
                                    Saved to Quotations ledger for future automatic matching
                                  </span>
                                </div>

                                <div className="space-y-1.5">
                                  {contractSlots
                                    .filter((s) => (s.saveAsQuotation || s.saveAsRateCard) && Number(s.billingAmount) > 0)
                                    .map((slot) => {
                                      const custObj = customers.find((c) => c.id === contractCustomer);
                                      return (
                                        <div key={slot.id} className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                                          <div className="flex items-center gap-2 font-extrabold text-amber-950 dark:text-amber-100 min-w-0">
                                            <span className="truncate">{slot.origin || 'Origin'} ➔ {slot.destination || 'Destination'}</span>
                                            <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/60 text-[10px] text-amber-800 dark:text-amber-200 border border-amber-200">
                                              {contractVehicleType || 'Standard'} • {contractRateCategory || 'Standard'}
                                            </span>
                                          </div>

                                          <div className="flex items-center gap-4 shrink-0">
                                            <div className="flex items-center gap-3 text-[11px] font-bold">
                                              <span className="text-emerald-700 dark:text-emerald-400">Billing: SAR {Number(slot.billingAmount).toLocaleString()}</span>
                                              {Number(slot.tripCharges) > 0 && (
                                                <span className="text-indigo-700 dark:text-indigo-300">Driver Payout: SAR {Number(slot.tripCharges).toLocaleString()}</span>
                                              )}
                                            </div>

                                            <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-amber-950 dark:text-amber-100 select-none hover:text-amber-700 transition-colors bg-amber-50 dark:bg-amber-950/60 px-2 py-1 rounded-md border border-amber-300 dark:border-amber-800">
                                              <input
                                                type="checkbox"
                                                checked={!!slot.saveAsQuotation || !!slot.saveAsRateCard}
                                                onChange={(e) => handleUpdateTripSlot(slot.id, { saveAsQuotation: e.target.checked, saveAsRateCard: e.target.checked })}
                                                className="w-3.5 h-3.5 rounded border-amber-400 text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer shrink-0"
                                              />
                                              <span>Save as Quotation</span>
                                            </label>
                                          </div>
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>
                            )}

                            {/* Per-slot review */}
                            <div className="space-y-2">
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1.5">Trip Slots</div>
                              {contractSlots.map((slot, idx) => {
                                const dateObj = slot.date ? new Date(slot.date) : new Date();
                                const formattedDate = dateObj.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                                const stopFeesSum = (slot.intermediateStopFees || []).reduce((a, f) => a + (Number(f) || 0), 0);
                                const base = Number(slot.billingAmount) || 0;
                                const total = base + stopFeesSum;
                                const slotTripCharge = assignmentType === 'third_party'
                                  ? (thirdPartyCost ? Number(thirdPartyCost) : (Number(slot.tripCharges) || 0))
                                  : (Number(slot.tripCharges) || 0);

                                const outboundStops = (slot.intermediateLocations || []).map((s) => s.trim()).filter(Boolean);
                                const returnStops = (slot.returnIntermediateLocations || []).map((s) => s.trim()).filter(Boolean);

                                const points: [number, number][] = [];
                                if (slot.originLat && slot.originLng) points.push([slot.originLat, slot.originLng]);
                                if (slot.destinationLat && slot.destinationLng) points.push([slot.destinationLat, slot.destinationLng]);
                                if (contractRateCategory === 'Round Trip') {
                                  const retLat = slot.returnOriginLat ?? slot.destinationLat;
                                  const retLng = slot.returnOriginLng ?? slot.destinationLng;
                                  const retDestLat = slot.returnDestinationLat ?? slot.originLat;
                                  const retDestLng = slot.returnDestinationLng ?? slot.originLng;
                                  if (retLat && retLng) points.push([retLat, retLng]);
                                  if (retDestLat && retDestLng) points.push([retDestLat, retDestLng]);
                                }

                                return (
                                  <div key={slot.id} className="p-4 rounded-2xl border border-slate-200/90 bg-white shadow-sm grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch hover:border-brand/40 transition-colors">
                                    {/* Left details */}
                                    <div className="md:col-span-7 lg:col-span-8 flex flex-col justify-between space-y-3">
                                      {/* Header Row */}
                                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5 gap-2">
                                        <div className="flex items-center gap-2">
                                          <Calendar className="w-3.5 h-3.5 text-brand shrink-0" />
                                          <span className="text-xs font-bold text-[#111111] dark:text-slate-100">Slot {idx + 1} — {formattedDate}</span>
                                          {slot.rateMatched && (
                                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full inline-flex items-center gap-1">
                                              <Check className="w-2.5 h-2.5 text-emerald-600" /> Rate Card {slot.rateCardName ? `(${slot.rateCardName})` : ''}
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-extrabold">
                                          <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-lg" title="Base customer billing rate">
                                            BILLING: SAR {base.toLocaleString()}
                                          </span>
                                          {stopFeesSum > 0 && (
                                            <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-lg" title="Additional stop fees">
                                              + EXTRAS: SAR {stopFeesSum.toLocaleString()}
                                            </span>
                                          )}
                                          <span className="bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-100 border border-emerald-300 dark:border-emerald-700 px-2 py-0.5 rounded-lg font-black" title="Total gross revenue">
                                            TOTAL: SAR {total.toLocaleString()}
                                          </span>
                                          <span className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-2 py-0.5 rounded-lg" title="Driver trip charge payout">
                                            TRIP CHARGES: SAR {slotTripCharge.toLocaleString()}
                                          </span>
                                          <span className={`px-2 py-0.5 rounded-lg border font-black ${total - slotTripCharge >= 0 ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-rose-600 text-white border-rose-700'}`} title="Net margin balance after deducting trip charges and additional charges">
                                            BALANCE: SAR {(total - slotTripCharge).toLocaleString()}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Route */}
                                      <div className="space-y-3">
                                        <div className="flex items-center gap-2.5">
                                          <div className="flex flex-col items-center shrink-0">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
                                            <span className="w-0.5 h-5 border-l border-dashed border-slate-300" />
                                            <span className="w-2.5 h-2.5 rounded-full bg-brand ring-2 ring-orange-200" />
                                          </div>
                                          <div className="min-w-0 text-xs font-bold text-slate-800 space-y-2">
                                            <div className="truncate">{slot.origin || '—'} (Outbound Pickup)</div>
                                            <div className="truncate">{slot.destination || '—'} (Outbound Dropoff)</div>
                                          </div>
                                        </div>

                                        {outboundStops.length > 0 && (
                                          <div className="text-[11px] text-slate-400 font-semibold pl-5">via {outboundStops.join(' → ')}</div>
                                        )}

                                        {contractRateCategory === 'Round Trip' && (
                                          <>
                                            <div className="flex items-center gap-2.5 border-t border-slate-100 pt-2">
                                              <div className="flex flex-col items-center shrink-0">
                                                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-100" />
                                                <span className="w-0.5 h-5 border-l border-dashed border-slate-300" />
                                                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 ring-2 ring-purple-200" />
                                              </div>
                                              <div className="min-w-0 text-xs font-bold text-slate-800 space-y-2">
                                                <div className="truncate">{slot.returnOrigin || slot.destination || '—'} (Return Pickup)</div>
                                                <div className="truncate">{slot.returnDestination || slot.origin || '—'} (Return Dropoff)</div>
                                              </div>
                                            </div>

                                            {returnStops.length > 0 && (
                                              <div className="text-[11px] text-slate-400 font-semibold pl-5">via {returnStops.join(' → ')}</div>
                                            )}
                                          </>
                                        )}
                                      </div>

                                      {/* Timing + crew */}
                                      <div className="grid grid-cols-2 gap-3 text-xs border-t border-slate-100 pt-2.5">
                                        <div className="space-y-0.5">
                                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Outbound Pickup</span>
                                          <span className="font-bold text-[#111111]">{slot.pickupTime || '—'}</span>
                                        </div>
                                        <div className="space-y-0.5">
                                          <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Outbound Dropoff</span>
                                          <span className="font-bold text-[#111111]">
                                            {slot.dropoffTime || '—'}
                                            {slot.isOvernight && <span className="ml-1.5 text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">+1 Day</span>}
                                          </span>
                                        </div>

                                        {contractRateCategory === 'Round Trip' && (
                                          <>
                                            <div className="space-y-0.5">
                                              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Return Pickup</span>
                                              <span className="font-bold text-[#111111]">{slot.returnPickupTime || '—'}</span>
                                            </div>
                                            <div className="space-y-0.5">
                                              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Return Dropoff</span>
                                              <span className="font-bold text-[#111111]">
                                                {slot.returnDropoffTime || '—'}
                                                {slot.returnIsOvernight && <span className="ml-1.5 text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">+1 Day</span>}
                                              </span>
                                            </div>
                                          </>
                                        )}

                                        {assignmentType === 'third_party' ? (
                                          <>
                                            <div className="space-y-0.5">
                                              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">3PL Provider & Driver</span>
                                              <span className="font-bold text-purple-700 truncate block">
                                                {providerObj?.name || '3PL'} {thirdPartyDriverName ? `(${thirdPartyDriverName})` : ''}
                                              </span>
                                            </div>
                                            <div className="space-y-0.5">
                                              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">3PL Vehicle</span>
                                              <span className="font-bold text-purple-700 truncate block">
                                                {thirdPartyVehiclePlate || '3PL Truck'} ({contractVehicleType})
                                              </span>
                                            </div>
                                          </>
                                        ) : (
                                          <>
                                            <div className="space-y-0.5">
                                              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Driver</span>
                                              <span className="font-bold text-[#111111]">
                                                {driverObj ? `${driverObj.first_name} ${driverObj.last_name}` : 'Unassigned'}
                                              </span>
                                            </div>
                                            <div className="space-y-0.5">
                                              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Truck</span>
                                              <span className="font-bold text-[#111111]">
                                                {vehicleObj ? vehicleObj.plate_number : 'Unassigned'}
                                              </span>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                     </div>
                                    {/* Right minimap */}
                                    <div className="md:col-span-5 lg:col-span-4 min-h-[105px] h-[105px] z-0">
                                      {points.length >= 2 ? (
                                        <div className="w-full h-full min-h-[105px] h-[105px] rounded-xl overflow-hidden border border-slate-200 shadow-2xs relative bg-slate-50 z-0">
                                          <MapContainer
                                            center={points[0]}
                                            zoom={10}
                                            scrollWheelZoom={false}
                                            zoomControl={false}
                                            attributionControl={false}
                                            style={{ height: '100%', width: '100%', zIndex: 0 }}
                                          >
                                            <TileLayer
                                              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; Esri'
                                              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            />
                                            <TileLayer
                                              url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                                            />
                                            <MapBoundsAdjuster points={points} />
                                            
                                            {/* Outbound Markers */}
                                            {slot.originLat && slot.originLng && (
                                              <Marker position={[slot.originLat, slot.originLng]} icon={pickupMarkerIcon} />
                                            )}
                                            {slot.destinationLat && slot.destinationLng && (
                                              <Marker position={[slot.destinationLat, slot.destinationLng]} icon={dropoffMarkerIcon} />
                                            )}

                                            {/* Return Leg Markers */}
                                            {contractRateCategory === 'Round Trip' && (
                                              <>
                                                {(slot.returnOriginLat ?? slot.destinationLat) && (slot.returnOriginLng ?? slot.destinationLng) && (
                                                  <Marker
                                                    position={[
                                                      slot.returnOriginLat ?? slot.destinationLat!,
                                                      slot.returnOriginLng ?? slot.destinationLng!
                                                    ]}
                                                    icon={returnPickupMarkerIcon}
                                                  />
                                                )}
                                                {(slot.returnDestinationLat ?? slot.originLat) && (slot.returnDestinationLng ?? slot.originLng) && (
                                                  <Marker
                                                    position={[
                                                      slot.returnDestinationLat ?? slot.originLat!,
                                                      slot.returnDestinationLng ?? slot.originLng!
                                                    ]}
                                                    icon={returnDropoffMarkerIcon}
                                                  />
                                                )}
                                              </>
                                            )}

                                            {/* Route Polyline */}
                                            <Polyline
                                              positions={points}
                                              pathOptions={{ color: '#FF5500', weight: 3, opacity: 0.8 }}
                                            />
                                          </MapContainer>
                                        </div>
                                      ) : (
                                        <div className="w-full h-full min-h-[140px] rounded-xl bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 gap-1 text-[10px] font-bold">
                                          <MapPin className="w-5 h-5 text-slate-300" />
                                          Map Preview Unavailable
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                </div>
              )}

              {/* TAB 2: QUICK GRID ENTRY */}
              {activeTab === 'grid' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-[#111111]">Interactive Grid Entry</h4>
                      <p className="text-xs text-[#6E6E80]">
                        Enter multiple trip records directly. You can set individual dates, drivers, and trucks per row.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setGridRows((prev) => [...prev, generateEmptyRow()])}
                        className="h-8 rounded-lg border-black/10 text-xs font-semibold"
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" /> Add Row
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setGridRows((prev) => [
                            ...prev,
                            generateEmptyRow(),
                            generateEmptyRow(),
                            generateEmptyRow(),
                          ])
                        }
                        className="h-8 rounded-lg border-black/10 text-xs font-semibold"
                      >
                        + Add 3 Rows
                      </Button>
                    </div>
                  </div>

                  {/* Grid Table */}
                  <div className="rounded-xl border border-black/[0.08] overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="w-full text-left text-xs min-w-[760px]">
                      <thead className="bg-slate-50 text-[10px] font-bold text-[#6E6E80] uppercase tracking-wider border-b border-black/[0.06] sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 w-8">#</th>
                          <th className="px-3 py-2">Customer *</th>
                          <th className="px-3 py-2">Date *</th>
                          <th className="px-3 py-2">Driver</th>
                          <th className="px-3 py-2">Vehicle</th>
                          <th className="px-3 py-2">Category</th>
                          <th className="px-3 py-2">Amount</th>
                          <th className="px-3 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.04]">
                        {gridRows.map((row, idx) => (
                          <tr key={row.id} className="hover:bg-slate-50/50">
                            <td className="px-3 py-1.5 text-[#9898A4] font-medium">{idx + 1}</td>
                            <td className="px-3 py-1.5">
                              <select
                                value={row.customerId}
                                onChange={(e) => updateGridRow(row.id, { customerId: e.target.value })}
                                className="w-36 h-7.5 px-2 rounded-lg border border-black/10 text-xs font-medium bg-white focus:outline-none focus:border-brand"
                              >
                                {customers.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-1.5">
                              <DatePicker
                                value={row.date}
                                onChange={(_, dateStr) => updateGridRow(row.id, { date: dateStr })}
                                placeholder="Select date..."
                                buttonClassName="h-7.5 w-32 px-2 text-xs font-medium border-black/10 bg-white"
                                clearable={false}
                                showPresets={false}
                                minDate={new Date()}
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <select
                                value={row.driverId}
                                onChange={(e) => updateGridRow(row.id, { driverId: e.target.value })}
                                className="w-36 h-7.5 px-2 rounded-lg border border-black/10 text-xs font-medium bg-white focus:outline-none focus:border-brand"
                              >
                                <option value="">-- Unassigned --</option>
                                {drivers.map((d) => {
                                  const embeddedVeh = d.assignedVehicle && typeof d.assignedVehicle === 'object' ? (d.assignedVehicle as any) : null;
                                  const vId = d.assignedVehicleId || (d as any).assigned_vehicle_id || embeddedVeh?.id;
                                  const matchedVeh = vId ? vehicles.find((v) => v.id === vId) : null;
                                  const capKg = embeddedVeh?.capacity_kg ?? embeddedVeh?.capacityKg ?? matchedVeh?.capacity_kg ?? (matchedVeh as any)?.capacityKg;
                                  const capLabel = capKg != null ? getVehicleTypeFromCapacity(capKg) : '';
                                  return (
                                    <option key={d.id} value={d.id}>
                                      {d.first_name} {d.last_name}{capLabel ? ` (${capLabel})` : ''}
                                    </option>
                                  );
                                })}
                              </select>
                            </td>
                            <td className="px-3 py-1.5">
                              <select
                                value={row.vehicleId}
                                onChange={(e) => updateGridRow(row.id, { vehicleId: e.target.value })}
                                className="w-36 h-7.5 px-2 rounded-lg border border-black/10 text-xs font-medium bg-white focus:outline-none focus:border-brand"
                              >
                                <option value="">-- Unassigned --</option>
                                {vehicles.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.plate_number}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-1.5">
                              <RateCategorySelect
                                value={row.rateCategory}
                                onValueChange={(val) => updateGridRow(row.id, { rateCategory: val })}
                                size="sm"
                                allowClear={false}
                                showBadgesInOptions={false}
                                className="w-32 h-7.5 bg-white text-xs font-medium"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <input
                                type="number"
                                value={row.amount}
                                onChange={(e) => updateGridRow(row.id, { amount: e.target.value })}
                                placeholder="SAR"
                                className="w-20 h-7.5 px-2 rounded-lg border border-black/10 text-xs font-medium bg-white focus:outline-none focus:border-brand"
                              />
                            </td>
                            <td className="px-3 py-1.5 text-right">
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => duplicateGridRow(row)}
                                  className="p-1 rounded-md text-[#9898A4] hover:text-[#111111] hover:bg-black/[0.05]"
                                  title="Duplicate Row"
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => deleteGridRow(row.id)}
                                  className="p-1 rounded-md text-[#9898A4] hover:text-red-600 hover:bg-red-50"
                                  title="Delete Row"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Grid Footer */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-black/[0.06]">
                    <p className="text-xs text-[#6E6E80]">
                      Total rows: <span className="font-bold text-[#111111]">{gridRows.length}</span>
                    </p>
                    <Button
                      disabled={bulkMutation.isPending || gridRows.length === 0}
                      onClick={handleGridSubmit}
                      className="h-9 rounded-xl px-5 text-xs font-bold bg-brand hover:bg-[#d13d0d] text-white shadow-none disabled:opacity-50"
                    >
                      {bulkMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating Trips...
                        </>
                      ) : (
                        `Create ${gridRows.length} Trips`
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* TAB 3: CSV / EXCEL FILE IMPORT */}
              {activeTab === 'file' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-[#111111]">Upload Spreadsheet</h4>
                      <p className="text-xs text-[#6E6E80]">
                        Upload your trip batch via CSV or Excel workbook with per-row dates, drivers, and vehicles.
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={downloadSampleCsv}
                      className="h-8 rounded-lg border-black/10 text-xs font-semibold"
                    >
                      <Download className="h-3.5 w-3.5 mr-1" /> Download Sample CSV
                    </Button>
                  </div>

                  {/* Dropzone */}
                  {!importedFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-black/10 hover:border-brand/50 rounded-2xl p-5 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-slate-50"
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileUpload(file);
                        }}
                      />
                      <FileSpreadsheet className="h-8 w-8 text-[#9898A4] mx-auto mb-2" />
                      <p className="text-xs font-bold text-[#111111]">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-[10px] text-[#9898A4] mt-0.5">
                        CSV (.csv) or Microsoft Excel (.xlsx) files
                      </p>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl border border-black/[0.08] bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-5 w-5 text-brand" />
                        <div>
                          <p className="text-xs font-bold text-[#111111]">{importedFile.name}</p>
                          <p className="text-[10px] text-[#6E6E80]">
                            {parsedRows.length} valid rows parsed
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setImportedFile(null);
                          setParsedRows([]);
                        }}
                        className="h-7 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    </div>
                  )}

                  {parseError && (
                    <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {parseError}
                    </div>
                  )}

                  {/* Parsed Preview Table */}
                  {parsedRows.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-[#9898A4] uppercase tracking-wider">
                        Parsed File Preview ({parsedRows.length} Rows)
                      </p>
                      <div className="rounded-xl border border-black/[0.08] overflow-hidden max-h-[340px] overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-[10px] font-bold text-[#6E6E80] uppercase tracking-wider border-b border-black/[0.06] sticky top-0">
                            <tr>
                              <th className="px-3 py-2">Company</th>
                              <th className="px-3 py-2">Date</th>
                              <th className="px-3 py-2">Driver</th>
                              <th className="px-3 py-2">Vehicle</th>
                              <th className="px-3 py-2">Category</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/[0.04]">
                            {parsedRows.slice(0, 15).map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="px-3 py-1.5 font-semibold text-[#111111]">{row.customer_name}</td>
                                <td className="px-3 py-1.5 text-[#6E6E80]">{row.planned_start || '—'}</td>
                                <td className="px-3 py-1.5 text-[#6E6E80]">{row.driver_name || 'Unassigned'}</td>
                                <td className="px-3 py-1.5 text-[#6E6E80]">{row.vehicle_plate || 'Unassigned'}</td>
                                <td className="px-3 py-1.5 text-[#6E6E80]">{row.rate_category || 'Standard'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* File Import Footer */}
                  <div className="flex items-center justify-between pt-2.5 border-t border-black/[0.06]">
                    <p className="text-xs text-[#6E6E80]">
                      {parsedRows.length > 0 ? `${parsedRows.length} trips ready for import` : 'Upload a valid file to proceed'}
                    </p>
                    <Button
                      disabled={bulkMutation.isPending || parsedRows.length === 0}
                      onClick={handleFileSubmit}
                      className="h-9 rounded-xl px-5 text-xs font-bold bg-brand hover:bg-[#d13d0d] text-white shadow-none disabled:opacity-50"
                    >
                      {bulkMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Importing Trips...
                        </>
                      ) : (
                        `Import ${parsedRows.length} Trips`
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>


        </div>
      </div>
      <CreateDriverModal
        isOpen={isCreateDriverOpen}
        onClose={() => setIsCreateDriverOpen(false)}
        onSuccess={handleDriverCreated}
      />
      <CreateVehicleModal
        isOpen={isCreateVehicleOpen}
        onClose={() => setIsCreateVehicleOpen(false)}
        onSuccess={(v) => {
          setMasterVehicle(v.id);
          queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        }}
      />
      <CreateCustomerModal
        isOpen={isCreateCustomerOpen}
        onClose={() => setIsCreateCustomerOpen(false)}
        onSuccess={(c) => {
          setContractCustomer(c.name);
          queryClient.invalidateQueries({ queryKey: ['customers'] });
        }}
      />
      <PastDateTripConfirmModal
        open={pastDateModalOpen}
        onClose={() => setPastDateModalOpen(false)}
        onConfirm={handlePastDateConfirm}
        analysis={pastDateAnalysis}
        isSubmitting={bulkMutation.isPending}
      />

      <CreateThirdPartyModal
        isOpen={isCreateProviderOpen}
        onClose={() => setIsCreateProviderOpen(false)}
        onSuccess={(provider) => {
          setThirdPartyProviderId(provider.id);
          queryClient.invalidateQueries({ queryKey: ['third-party-providers-select'] });
        }}
      />

      <VehiclePreviewModal
        vehicle={previewVehicle}
        isOpen={!!previewVehicle}
        onClose={() => setPreviewVehicle(null)}
        onEdit={(v) => setEditVehicle(v)}
      />
      <CustomerPreviewModal
        customer={previewCustomer}
        isOpen={!!previewCustomer}
        onClose={() => setPreviewCustomer(null)}
        onEdit={(c) => setEditCustomer(c)}
      />
      <ThirdPartyPreviewModal
        provider={previewThirdParty}
        isOpen={!!previewThirdParty}
        onClose={() => setPreviewThirdParty(null)}
        onEdit={(p) => setEditThirdParty(p)}
      />
      <DriverPreviewModal
        driver={previewDriver}
        isOpen={!!previewDriver}
        onClose={() => setPreviewDriver(null)}
        onEdit={(d) => setEditDriver(d)}
      />

      {editCustomer && (
        <EditCustomerModal
          isOpen={!!editCustomer}
          customer={editCustomer}
          onClose={() => setEditCustomer(null)}
        />
      )}
      {editThirdParty && (
        <EditThirdPartyModal
          isOpen={!!editThirdParty}
          provider={editThirdParty}
          onClose={() => setEditThirdParty(null)}
        />
      )}
      {editDriver && (
        <EditDriverModal
          isOpen={!!editDriver}
          driver={editDriver}
          onClose={() => setEditDriver(null)}
        />
      )}
      {editVehicle && (
        <EditVehicleModal
          isOpen={!!editVehicle}
          vehicle={editVehicle}
          onClose={() => setEditVehicle(null)}
        />
      )}
    </DashboardLayout>
  );
}
