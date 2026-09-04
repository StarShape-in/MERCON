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
  Edit3,
  GripVertical,
  ChevronUp,
  ChevronDown,
  FileText,
  ClipboardList,
  Info,
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

const MOCK_CUSTOMERS = [
  { id: 'cust-aramco', name: 'Saudi Aramco', phone: '+966 13 872 0123', payment_terms: 'NET 30' },
  { id: 'cust-almarai', name: 'Almarai Logistics Co.', phone: '+966 11 470 0000', payment_terms: 'NET 60' },
  { id: 'cust-naqel', name: 'Naqel Express', phone: '+966 9200 20505', payment_terms: 'NET 30' },
  { id: 'cust-sec', name: 'Saudi Electricity Co (SEC)', phone: '+966 11 807 7777', payment_terms: 'NET 90' },
  { id: 'cust-flow', name: 'Flow Progressive Logistics', phone: '+966 9200 03569', payment_terms: 'NET 45' },
  { id: 'cust-panda', name: 'Panda Retail Company', phone: '+966 12 691 0000', payment_terms: 'NET 60' },
  { id: 'cust-bindawood', name: 'BinDawood Holding', phone: '+966 12 653 3333', payment_terms: 'NET 30' },
  { id: 'cust-agility', name: 'Agility Logistics KSA', phone: '+966 13 812 3456', payment_terms: 'NET 30' },
  { id: 'cust-sabic', name: 'Sabic Petrochemicals', phone: '+966 11 225 8000', payment_terms: 'NET 60' },
  { id: 'cust-dhl', name: 'DHL Supply Chain Saudi', phone: '+966 9200 03451', payment_terms: 'NET 30' },
  { id: 'cust-aramex', name: 'Aramex Freight KSA', phone: '+966 9200 27447', payment_terms: 'NET 30' },
  { id: 'cust-hala', name: 'HALA Supply Chain Services', phone: '+966 13 887 7788', payment_terms: 'NET 45' },
  { id: 'cust-aks', name: 'AKS Logistics', phone: '+966 50 111 2222', payment_terms: 'NET 30' },
  { id: 'cust-gfs', name: 'GFS Logistics', phone: '+966 50 333 4444', payment_terms: 'NET 30' },
  { id: 'cust-horizon', name: 'Horizon Informatics', phone: '+966 50 555 6666', payment_terms: 'NET 30' },
  { id: 'cust-imile', name: 'iMile Delivery KSA', phone: '+966 50 777 8888', payment_terms: 'NET 30' },
];

const MOCK_DRIVERS: any[] = [
  { id: 'drv-1', first_name: 'Tariq', last_name: 'Mahmoud', phone_primary: '+966 50 123 4567', status: 'Available', isActive: true, license_number: 'SA-90123' },
  { id: 'drv-2', first_name: 'Mohammed', last_name: 'Al-Harbi', phone_primary: '+966 55 987 6543', status: 'Available', isActive: true, license_number: 'SA-88219' },
  { id: 'drv-3', first_name: 'Fahad', last_name: 'Al-Otaibi', phone_primary: '+966 54 321 0987', status: 'Available', isActive: true, license_number: 'SA-77341' },
  { id: 'drv-4', first_name: 'Youssef', last_name: 'Al-Zahrani', phone_primary: '+966 56 112 2334', status: 'Available', isActive: true, license_number: 'SA-55412' },
  { id: 'drv-5', first_name: 'Khalid', last_name: 'Al-Ghamdi', phone_primary: '+966 50 445 5667', status: 'Available', isActive: true, license_number: 'SA-44109' },
];

const MOCK_VEHICLES: any[] = [
  { id: 'veh-1', plate_number: '7841 KSA', asset_type: 'Reefer Truck', capacity_kg: 5000 },
  { id: 'veh-2', plate_number: '3920 LMN', asset_type: 'Flatbed Trailer', capacity_kg: 20000 },
  { id: 'veh-3', plate_number: '1049 DEF', asset_type: 'Curtainsider', capacity_kg: 10000 },
  { id: 'veh-4', plate_number: '6218 GHI', asset_type: 'Dry Box Truck', capacity_kg: 4000 },
  { id: 'veh-5', plate_number: '9512 JKL', asset_type: 'Heavy Container 40FT', capacity_kg: 40000 },
];

const MOCK_RATE_CARDS = [
  {
    id: 'rc-1',
    title: 'Standard Single Trip',
    vehicleClass: '5 TON',
    lineType: 'Single Trip',
    operation: 'Extra (Spot)',
    billingRate: 1200,
    driverPayout: 400,
    badge: 'Popular',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300',
  },
  {
    id: 'rc-2',
    title: 'Express Reefer Lane',
    vehicleClass: '10 TON',
    lineType: 'Single Trip',
    operation: 'Extra (Spot)',
    billingRate: 1850,
    driverPayout: 650,
    badge: 'Reefer',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300',
  },
  {
    id: 'rc-3',
    title: 'Dedicated Round Trip',
    vehicleClass: '20 TON',
    lineType: 'Round Trip',
    operation: 'Extra (Spot)',
    billingRate: 2900,
    driverPayout: 950,
    badge: 'Round Trip',
    badgeClass: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300',
  },
  {
    id: 'rc-4',
    title: 'Monthly Dedicated Fleet',
    vehicleClass: '40 FEET',
    lineType: 'Single Trip',
    operation: 'Monthly',
    billingRate: 16500,
    driverPayout: 5500,
    badge: 'Monthly',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300',
  },
];




const MOCK_CUSTOMER_RECENT_TRIPS: Record<string, Array<{
  id: string;
  ref_id: string;
  route: string;
  vehicle_type: string;
  billing_amount: number;
  date: string;
  status: string;
  driver_name: string;
}>> = {
  'cust-aramco': [
    { id: 't-101', ref_id: 'TRIP-9042', route: 'RUH Hub → JED Port', vehicle_type: '20 TON Flatbed', billing_amount: 2900, date: '28 Aug 2026', status: 'Completed', driver_name: 'Tariq Mahmoud' },
    { id: 't-102', ref_id: 'TRIP-8910', route: 'DMM Hub → RUH Hub', vehicle_type: '10 TON Reefer', billing_amount: 1850, date: '24 Aug 2026', status: 'Completed', driver_name: 'Mohammed Al-Harbi' },
    { id: 't-103', ref_id: 'TRIP-8755', route: 'JUBAIL → RUH Hub', vehicle_type: '40 FEET Heavy', billing_amount: 3400, date: '19 Aug 2026', status: 'Completed', driver_name: 'Fahad Al-Otaibi' },
  ],
  'cust-almarai': [
    { id: 't-201', ref_id: 'TRIP-9112', route: 'ALKHARJ → RUH Hub', vehicle_type: '5 TON Reefer', billing_amount: 1200, date: '30 Aug 2026', status: 'Completed', driver_name: 'Youssef Al-Zahrani' },
    { id: 't-202', ref_id: 'TRIP-9008', route: 'ALKHARJ → DMM Hub', vehicle_type: '10 TON Reefer', billing_amount: 2100, date: '26 Aug 2026', status: 'Completed', driver_name: 'Khalid Al-Ghamdi' },
  ],
  'cust-naqel': [
    { id: 't-301', ref_id: 'TRIP-9204', route: 'RUH Airport → JED Hub', vehicle_type: '3-4 TON Box', billing_amount: 1450, date: '31 Aug 2026', status: 'Completed', driver_name: 'Tariq Mahmoud' },
  ],
  'cust-sec': [
    { id: 't-401', ref_id: 'TRIP-8890', route: 'RUH Dry Port → QASSIM', vehicle_type: '40 FEET Flatbed', billing_amount: 4200, date: '22 Aug 2026', status: 'Completed', driver_name: 'Fahad Al-Otaibi' },
  ],
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

  const customers = useMemo(() => {
    const db = customersRes?.data ?? [];
    const names = new Set(db.map((c) => c.name.toLowerCase()));
    return [...db, ...MOCK_CUSTOMERS.filter((m) => !names.has(m.name.toLowerCase()))];
  }, [customersRes?.data]);

  const drivers: Driver[] = useMemo(() => {
    const db = driversRes?.data ?? [];
    const ids = new Set(db.map((d) => d.id));
    return [...db, ...(MOCK_DRIVERS as Driver[]).filter((m) => !ids.has(m.id))];
  }, [driversRes?.data]);

  const vehicles: Vehicle[] = useMemo(() => {
    const db = vehiclesRes?.data ?? [];
    const ids = new Set(db.map((v) => v.id));
    return [...db, ...(MOCK_VEHICLES as Vehicle[]).filter((m) => !ids.has(m.id))];
  }, [vehiclesRes?.data]);
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

  // Rate cards & Monthly calendar state
  const [selectedRateCard, setSelectedRateCard] = useState<string>('rc-1');
  const [monthlySelectedDays, setMonthlySelectedDays] = useState<number[]>([1, 3, 5, 8, 10, 12, 15, 17, 19, 22, 24, 26, 29]);

  const handleSelectRateCard = (card: typeof MOCK_RATE_CARDS[0]) => {
    setSelectedRateCard(card.id);
    setContractVehicleType(card.vehicleClass);
    setContractRateCategory(card.lineType);
    setContractBillingType(card.operation);
    if (contractSlots && contractSlots[0]?.id) {
      handleUpdateTripSlot(contractSlots[0].id, {
        billingAmount: String(card.billingRate),
        tripCharges: String(card.driverPayout),
        rateMatched: true,
        rateCardName: card.title,
      });
    }
  };

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

  // Quadrant Collapse States
  const [isQ1Collapsed, setIsQ1Collapsed] = useState<boolean>(false);
  const [isQ2Collapsed, setIsQ2Collapsed] = useState<boolean>(false);
  const [isQ3Collapsed, setIsQ3Collapsed] = useState<boolean>(false);
  const [isQ4Collapsed, setIsQ4Collapsed] = useState<boolean>(false);

  const handleSelectCustomer = (customerId: string) => {
    setContractCustomer(customerId);
    setIsQ1Collapsed(true);
  };

  // Fetch recent trips for selected customer
  const { data: customerRecentTripsRes } = useQuery({
    queryKey: ['customer-recent-trips', contractCustomer],
    queryFn: () => tripService.getAll({ customer_id: contractCustomer, per_page: 5 }),
    enabled: !!contractCustomer,
  });

  const recentTripsForCustomer = useMemo(() => {
    if (!contractCustomer) return [];
    const dbTrips = customerRecentTripsRes?.data ?? [];
    if (dbTrips.length > 0) {
      return dbTrips.map((t) => ({
        id: t.id,
        ref_id: t.ref_id || `TRIP-${t.id.slice(0, 4)}`,
        route: `${(t as any).origin || (t as any).origin_location_name || 'Riyadh Hub'} → ${(t as any).destination || (t as any).destination_location_name || 'Jeddah Hub'}`,
        vehicle_type: (t as any).vehicle_type || t.quotation_vehicle_class || '5 TON',
        billing_amount: Number(t.billing_amount || 1200),
        date: t.planned_start ? String(t.planned_start).slice(0, 10) : 'Recent',
        status: t.status || 'Completed',
        driver_name: (t as any).driver ? `${(t as any).driver.first_name} ${(t as any).driver.last_name}` : 'Assigned Driver',
      }));
    }
    return MOCK_CUSTOMER_RECENT_TRIPS[contractCustomer] || [
      { id: 't-default-1', ref_id: 'TRIP-9301', route: 'RUH Hub → JED Hub', vehicle_type: '5 TON Box', billing_amount: 1200, date: '01 Sep 2026', status: 'Completed', driver_name: 'Tariq Mahmoud' },
      { id: 't-default-2', ref_id: 'TRIP-9182', route: 'RUH Hub → DMM Port', vehicle_type: '10 TON Reefer', billing_amount: 1850, date: '29 Aug 2026', status: 'Completed', driver_name: 'Mohammed Al-Harbi' },
    ];
  }, [contractCustomer, customerRecentTripsRes?.data]);
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
    returnDate?: string;
    returnDropoffDate?: string;
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
                    const isMonthlyCard = (card.billing_type || '').toLowerCase().includes('monthly') || (card.rate_category || card.line_type || '').toLowerCase().includes('monthly');
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
    field: 'origin' | 'destination' | 'returnOrigin' | 'returnDestination',
    locIdOrName: string,
    locObj: import('@/services/locationService').Location | null
  ) => {
    const locationId = locObj?.id ?? (isUuid(locIdOrName) ? locIdOrName : null);
    const displayName = locObj?.name || locObj?.address || (isUuid(locIdOrName) ? '' : locIdOrName);

    const updates: Record<string, any> = {
      [field]: displayName,
      rateMatched: false,
    };

    if (field === 'origin') {
      updates.originLocationId = locationId;
      updates.originLat = locObj?.lat ?? null;
      updates.originLng = locObj?.lng ?? null;
    } else if (field === 'destination') {
      updates.destinationLocationId = locationId;
      updates.destinationLat = locObj?.lat ?? null;
      updates.destinationLng = locObj?.lng ?? null;
    } else if (field === 'returnOrigin') {
      updates.returnOriginLat = locObj?.lat ?? null;
      updates.returnOriginLng = locObj?.lng ?? null;
    } else if (field === 'returnDestination') {
      updates.returnDestinationLat = locObj?.lat ?? null;
      updates.returnDestinationLng = locObj?.lng ?? null;
    }

    handleUpdateTripSlot(slotId, updates);

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
      <div className="w-full h-full flex flex-col min-h-0 animate-fade-in bg-slate-50/40 dark:bg-slate-950">
        <div className="w-full flex-1 flex flex-col min-h-0">

        {/* Combined Sleek Navigation & Stepper Bar */}
        {!submissionResult && (
          <div className="border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex items-center justify-between px-6 py-3 gap-3 shadow-2xs">
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

            {/* Useful Live Operational & Financial Margin Header Bar */}
            <div className="flex items-center gap-3 overflow-x-auto text-xs font-bold text-[#3E3C3D] dark:text-slate-200">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/40 border border-orange-200/80 dark:border-orange-800 shrink-0">
                <Building2 className="w-3.5 h-3.5 text-[#FA634E]" />
                <span>Account: <strong className="text-slate-900 dark:text-slate-100">{customers.find((c) => c.id === contractCustomer)?.name || 'Saudi Aramco'}</strong></span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>Route: <strong className="text-slate-900 dark:text-slate-100">{contractSlots[0]?.origin || 'Riyadh Hub'} ➔ {contractSlots[0]?.destination || 'Jeddah Hub'}</strong></span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800 shrink-0">
                <Truck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Assignment: <strong className="text-slate-900 dark:text-slate-100">{masterVehicle ? vehicles.find(v => v.id === masterVehicle)?.plate_number : '7841 KSA'} ({masterDriver ? drivers.find(d => d.id === masterDriver)?.first_name : 'Tariq M.'})</strong></span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 shrink-0 font-mono">
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                <span>Billing: <strong>SAR {Number(contractSlots[0]?.billingAmount || 1200).toLocaleString()}</strong></span>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span>Margin: <strong>SAR {(Number(contractSlots[0]?.billingAmount || 1200) - Number(contractSlots[0]?.tripCharges || 400)).toLocaleString()}</strong></span>
              </div>
            </div>

            {/* Top Right: Next / Done Primary Action & Close */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                disabled={bulkMutation.isPending || (contractStep === 4 && (!isStepValid(1) || !isStepValid(2) || !isStepValid(3)))}
                onClick={() => {
                  if (contractStep < 4) {
                    setContractStep((prev) => (prev + 1) as any);
                  } else {
                    handleContractSubmit();
                  }
                }}
                className="h-8 rounded-xl px-4 text-xs font-bold bg-[#FA634E] hover:bg-[#e0523d] text-white shadow-none disabled:opacity-50 gap-1 border-0"
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
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-2 flex items-center justify-between gap-3 text-xs shrink-0 animate-fade-in">
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

        {/* Page Content Body — Fits inside viewport */}
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
              {/* TAB 1: REDESIGNED CREATE TRIP 2x2 QUADRANT DASHBOARD */}
              {activeTab === 'contract' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                    {/* LEFT COLUMN: CUSTOMER SELECTION & TRIP ROUTE */}
                    <div className="space-y-4 flex flex-col">
                      {/* QUADRANT 1 (TOP-LEFT): CUSTOMER SELECTION */}
                      {isQ1Collapsed && contractCustomer ? (
                        <div
                          onClick={() => setIsQ1Collapsed(false)}
                          className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800 shadow-xs flex items-center justify-between transition-all animate-fade-in cursor-pointer hover:border-[#FA634E] group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#FA634E] text-white font-black text-xs grid place-items-center shrink-0 shadow-2xs group-hover:scale-105 transition-transform">
                              {customers.find(c => c.id === contractCustomer)?.name.substring(0, 2).toUpperCase() || 'CU'}
                            </div>
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                                  <Building2 className="w-3 h-3 text-[#FA634E]" /> CUSTOMER SELECTION
                                </span>
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[9px] font-bold px-1.5 py-0.2">
                                  Active Account
                                </Badge>
                              </div>
                              <h4 className="text-sm font-black text-[#3E3C3D] dark:text-slate-100 leading-tight">
                                {customers.find(c => c.id === contractCustomer)?.name || 'Selected Customer'}
                              </h4>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsQ1Collapsed(false);
                              }}
                              className="h-7 text-xs font-bold border-slate-200/90 bg-slate-50 hover:bg-slate-100 text-[#FA634E] rounded-xl px-2.5 flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                              <Edit3 className="w-3 h-3" /> Edit
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className={cn(
                          "p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between transition-all",
                          contractStep === 1 && "ring-2 ring-[#FA634E]"
                        )}>
                          <div className="space-y-3.5">
                            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                              <div className="flex items-center gap-2 text-xs font-black text-[#3E3C3D] dark:text-slate-100 uppercase tracking-wider">
                                <Building2 className="w-4 h-4 text-[#FA634E]" />
                                <span>CUSTOMER SELECTION</span>
                              </div>
                              {contractCustomer && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setIsQ1Collapsed(true)}
                                  className="h-6 text-[10px] font-bold text-slate-500 hover:text-[#FA634E] px-2 rounded-lg"
                                >
                                  <ChevronUp className="w-3.5 h-3.5 mr-1" /> Collapse
                                </Button>
                              )}
                            </div>

                            {/* FREQUENT SHIPPERS */}
                            <div className="space-y-2">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5 text-amber-500" /> FREQUENT SHIPPERS
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                {customers.slice(0, 4).map((c, idx) => {
                                  const isSelected = contractCustomer === c.id;
                                  const initials = c.name.substring(0, 2).toUpperCase();
                                  return (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => handleSelectCustomer(c.id)}
                                      className={cn(
                                        "p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[82px] space-y-2 relative cursor-pointer",
                                        isSelected
                                          ? "bg-orange-50/50 border-[#FA634E] ring-1 ring-[#FA634E]/30"
                                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                                      )}
                                    >
                                      <div className="flex items-center justify-between w-full">
                                        <span className={cn(
                                          "w-6 h-6 rounded-md font-bold text-[10px] grid place-items-center shrink-0",
                                          isSelected ? "bg-[#FA634E] text-white" : "bg-slate-100 text-slate-700"
                                        )}>
                                          {initials}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-1 py-0.5 rounded">
                                          Key {idx + 1}
                                        </span>
                                        {isSelected && (
                                          <div className="w-4 h-4 rounded-full bg-[#FA634E] text-white grid place-items-center shrink-0">
                                            <Check className="w-2.5 h-2.5 stroke-[3]" />
                                          </div>
                                        )}
                                      </div>
                                      <p className="text-xs font-bold text-[#3E3C3D] dark:text-slate-200 leading-tight line-clamp-2" title={c.name}>
                                        {c.name}
                                      </p>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* SEARCH ALL ACCOUNTS */}
                          <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                              <Search className="w-3 h-3 text-slate-400" /> SEARCH ALL ACCOUNTS *
                            </label>
                            <Combobox
                              options={customerOptions}
                              value={contractCustomer}
                              onChange={handleSelectCustomer}
                              placeholder="-- Select or search customer account --"
                              searchPlaceholder="Search customer account by name..."
                              emptyText="No customer matching search."
                              triggerClassName="h-9.5 rounded-xl border-slate-200 bg-white text-xs font-semibold w-full"
                            />

                            {/* RECENT COMPLETED TRIPS FOR SELECTED CUSTOMER — COMPACT SQUARES */}
                            {contractCustomer && (
                              <div className="pt-2 space-y-1.5 animate-fade-in">
                                <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-[#FA634E]" />
                                    RECENT TRIPS ({customers.find(c => c.id === contractCustomer)?.name || 'Account'})
                                  </span>
                                  <span className="text-[9px] font-bold text-slate-400">
                                    {recentTripsForCustomer.length} Records
                                  </span>
                                </div>

                                {/* Compact Square Grid */}
                                <div className="grid grid-cols-3 gap-1.5">
                                  {recentTripsForCustomer.slice(0, 3).map((trip) => (
                                    <button
                                      key={trip.id}
                                      type="button"
                                      onClick={() => {
                                        const [orig, dest] = trip.route.split('→').map(s => s.trim());
                                        if (orig && dest && contractSlots[0]?.id) {
                                          handleUpdateTripSlot(contractSlots[0].id, {
                                            origin: orig,
                                            destination: dest,
                                            billingAmount: String(trip.billing_amount),
                                          });
                                          toast.success(`Applied trip route "${orig} → ${dest}" (SAR ${trip.billing_amount})`);
                                        }
                                      }}
                                      className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/60 hover:border-[#FA634E] hover:bg-orange-50/40 text-left transition-all flex flex-col justify-between h-[62px] cursor-pointer relative group"
                                    >
                                      <div className="flex items-center justify-between w-full">
                                        <span className="font-mono font-bold text-[#FA634E] text-[10px]">{trip.ref_id}</span>
                                        <span className="text-[9px] font-bold text-emerald-700 dark:text-emerald-400 font-mono">SAR {trip.billing_amount}</span>
                                      </div>
                                      <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 truncate leading-tight" title={trip.route}>
                                        {trip.route}
                                      </p>
                                      <div className="flex items-center justify-between text-[8px] font-medium text-slate-400 w-full">
                                        <span className="truncate">{trip.vehicle_type}</span>
                                        <span className="group-hover:text-[#FA634E] font-bold">Re-use ➔</span>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* QUADRANT 3 (BOTTOM-LEFT): TRIP ROUTE */}
                      <div className={cn(
                        "p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5 transition-all",
                        contractStep === 2 && "ring-2 ring-[#FA634E]"
                      )}>
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
                          <div className="flex items-center gap-2 text-xs font-black text-[#3E3C3D] dark:text-slate-100 uppercase tracking-wider">
                            <MapPin className="w-4 h-4 text-[#FA634E]" />
                            <span>TRIP ROUTE</span>
                          </div>

                          {/* MOVED LINE TYPE SELECTOR INTO TRIP ROUTE HEADER */}
                          <div className="flex items-center gap-2">
                            <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Line Type</label>
                            <Select value={contractRateCategory || 'Single Trip'} onValueChange={setContractRateCategory}>
                              <SelectTrigger className="h-7 text-xs font-bold rounded-lg border-slate-200 bg-white w-[130px]">
                                <SelectValue placeholder="Line Type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Single Trip">Single Trip</SelectItem>
                                <SelectItem value="Round Trip">Round Trip</SelectItem>
                                <SelectItem value="10 Hours Duty">10 Hours Duty</SelectItem>
                                <SelectItem value="12 Hours Duty">12 Hours Duty</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* PICKUP STOP */}
                        <div className="rounded-xl border border-emerald-200 bg-emerald-50/20 p-2.5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600" /> PICKUP
                            </span>
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                              Route Start
                            </Badge>
                          </div>

                          {/* 50/50 SPLIT: Left (Location) | Right (Date & Time) */}
                          <div className="grid grid-cols-2 gap-2.5 items-end">
                            {/* LEFT 50%: PICKUP LOCATION */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                                PICKUP LOCATION *
                              </label>
                              <LocationCombobox
                                customerId={contractCustomer}
                                value={contractSlots[0]?.origin || ''}
                                onChange={(locName, locObj) => handleSlotLocationChange(contractSlots[0]?.id || 'slot-1', 'origin', locName, locObj)}
                                placeholder="Search origin location (e.g. RUH - Riyadh Hub)..."
                                triggerClassName="h-8.5 border-emerald-200 bg-white"
                              />
                            </div>

                            {/* RIGHT 50%: PICKUP DATE & TIME */}
                            <div className="grid grid-cols-2 gap-1.5">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-emerald-600" /> DATE *
                                </label>
                                <DatePicker
                                  value={contractSlots[0]?.date || ''}
                                  onChange={(_, dateStr) => handleUpdateTripSlot(contractSlots[0]?.id || 'slot-1', { date: dateStr, dropoffDate: dateStr })}
                                  placeholder="Select date..."
                                  buttonClassName="h-8.5 border-emerald-200 bg-white font-semibold text-xs text-slate-800"
                                  minDate={new Date()}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-emerald-600" /> TIME *
                                </label>
                                <TimePicker
                                  value={contractSlots[0]?.pickupTime || '08:00'}
                                  onChange={(timeStr) => handleUpdateTripSlot(contractSlots[0]?.id || 'slot-1', { pickupTime: timeStr })}
                                  placeholder="Select time..."
                                  buttonClassName="h-8.5 border-emerald-200 bg-white font-semibold text-xs text-slate-800"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* INTERMEDIATE WAYSTOPS (IF ANY) */}
                        {contractSlots[0]?.intermediateLocations?.map((locVal, idx) => (
                          <div key={idx} className="rounded-xl border border-sky-200 bg-sky-50/30 p-2.5 space-y-2 animate-fade-in">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-sky-600" /> STOP #{idx + 1} (WAYSTOP)
                              </span>
                              <div className="flex items-center gap-1">
                                <Badge className="bg-sky-100 text-sky-800 border-sky-200 text-[10px] font-bold">
                                  Intermediate Stop
                                </Badge>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleRemoveSlotIntermediate(contractSlots[0]?.id || 'slot-1', idx)}
                                  className="h-6 w-6 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md"
                                  title="Remove Stop"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2.5 items-end">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-sky-900 uppercase tracking-wider block">
                                  STOP LOCATION *
                                </label>
                                <LocationCombobox
                                  customerId={contractCustomer}
                                  value={locVal}
                                  onChange={(locName, locObj) => handleUpdateSlotIntermediate(contractSlots[0]?.id || 'slot-1', idx, locName, locObj?.id || null)}
                                  placeholder="Search waystop location..."
                                  triggerClassName="h-8.5 border-sky-200 bg-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-sky-900 uppercase tracking-wider block">
                                  STOP FEE (SAR, OPTIONAL)
                                </label>
                                <input
                                  type="number"
                                  value={contractSlots[0]?.intermediateStopFees?.[idx] || ''}
                                  onChange={(e) => handleUpdateSlotIntermediateFee(contractSlots[0]?.id || 'slot-1', idx, e.target.value)}
                                  placeholder="e.g. 150"
                                  className="w-full h-8.5 px-2.5 rounded-xl border border-sky-200 bg-white text-xs font-bold"
                                />
                              </div>
                            </div>
                          </div>
                        ))}

                        {/* DROPOFF STOP */}
                        <div className="rounded-xl border border-orange-200 bg-orange-50/20 p-2.5 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-orange-950 flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-[#FA634E]" /> DROPOFF
                            </span>
                          </div>

                          {/* 50/50 SPLIT: Left (Location) | Right (Date & Time) */}
                          <div className="grid grid-cols-2 gap-2.5 items-end">
                            {/* LEFT 50%: DROPOFF LOCATION */}
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-orange-900 uppercase tracking-wider block">
                                DROPOFF LOCATION *
                              </label>
                              <LocationCombobox
                                customerId={contractCustomer}
                                value={contractSlots[0]?.destination || ''}
                                onChange={(locName, locObj) => handleSlotLocationChange(contractSlots[0]?.id || 'slot-1', 'destination', locName, locObj)}
                                placeholder="Search dropoff location (e.g. JED - Jeddah Hub)..."
                                triggerClassName="h-8.5 border-orange-200 bg-white"
                              />
                            </div>

                            {/* RIGHT 50%: DROPOFF DATE & TIME */}
                            <div className="grid grid-cols-2 gap-1.5">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-orange-900 uppercase tracking-wider flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-[#FA634E]" /> DATE *
                                </label>
                                <DatePicker
                                  value={contractSlots[0]?.dropoffDate || contractSlots[0]?.date || ''}
                                  onChange={(_, dateStr) => handleUpdateTripSlot(contractSlots[0]?.id || 'slot-1', { dropoffDate: dateStr })}
                                  placeholder="Select date..."
                                  buttonClassName="h-8.5 border-orange-200 bg-white font-semibold text-xs text-slate-800"
                                  minDate={contractSlots[0]?.date ? new Date(contractSlots[0].date) : new Date()}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-orange-900 uppercase tracking-wider flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-[#FA634E]" /> TIME *
                                </label>
                                <div className="flex items-center gap-1">
                                  <TimePicker
                                    value={contractSlots[0]?.dropoffTime || '20:53'}
                                    onChange={(timeStr) => handleUpdateTripSlot(contractSlots[0]?.id || 'slot-1', { dropoffTime: timeStr })}
                                    placeholder="Select time..."
                                    buttonClassName="flex-1 h-8.5 border-orange-200 bg-white font-semibold text-xs text-slate-800"
                                  />
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={() => handleAddSlotIntermediate(contractSlots[0]?.id || 'slot-1')}
                                    className="h-8.5 w-8.5 p-0 rounded-lg bg-[#FA634E] hover:bg-[#e0523d] text-white shrink-0 border-0"
                                    title="Add Waystop Location"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* ROUND TRIP RETURN LEG SECTION */}
                        {contractRateCategory === 'Round Trip' && (
                          <div className="space-y-2 pt-2 border-t border-purple-200 dark:border-purple-900 animate-fade-in">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-purple-950 dark:text-purple-300 flex items-center gap-1.5 uppercase tracking-wider">
                                <MapPin className="w-3.5 h-3.5 text-purple-600" /> RETURN LEG (ROUND TRIP)
                              </span>
                              <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px] font-bold">
                                Return Trip
                              </Badge>
                            </div>

                            {/* RETURN PICKUP */}
                            <div className="rounded-xl border border-purple-200 bg-purple-50/20 p-2.5 space-y-2">
                              <div className="grid grid-cols-2 gap-2.5 items-end">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
                                    RETURN PICKUP LOCATION
                                  </label>
                                  <LocationCombobox
                                    customerId={contractCustomer}
                                    value={contractSlots[0]?.returnOrigin || contractSlots[0]?.destination || ''}
                                    onChange={(locName, locObj) => handleSlotLocationChange(contractSlots[0]?.id || 'slot-1', 'returnOrigin', locName, locObj)}
                                    placeholder="Return origin location..."
                                    triggerClassName="h-8.5 border-purple-200 bg-white"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-1.5">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-purple-600" /> DATE
                                    </label>
                                    <DatePicker
                                      value={contractSlots[0]?.returnDate || contractSlots[0]?.dropoffDate || ''}
                                      onChange={(_, dateStr) => handleUpdateTripSlot(contractSlots[0]?.id || 'slot-1', { returnDate: dateStr })}
                                      placeholder="Select date..."
                                      buttonClassName="h-8.5 border-purple-200 bg-white font-semibold text-xs text-slate-800"
                                      minDate={contractSlots[0]?.dropoffDate ? new Date(contractSlots[0].dropoffDate) : new Date()}
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-purple-600" /> TIME
                                    </label>
                                    <TimePicker
                                      value={contractSlots[0]?.returnPickupTime || '09:00'}
                                      onChange={(timeStr) => handleUpdateTripSlot(contractSlots[0]?.id || 'slot-1', { returnPickupTime: timeStr })}
                                      placeholder="Select time..."
                                      buttonClassName="h-8.5 border-purple-200 bg-white font-semibold text-xs text-slate-800"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* RETURN INTERMEDIATE STOPS */}
                            {contractSlots[0]?.returnIntermediateLocations?.map((locVal, idx) => (
                              <div key={idx} className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-2.5 space-y-2 animate-fade-in">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-indigo-600" /> RETURN STOP #{idx + 1}
                                  </span>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleRemoveSlotReturnIntermediate(contractSlots[0]?.id || 'slot-1', idx)}
                                    className="h-6 w-6 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                                <div className="grid grid-cols-2 gap-2.5 items-end">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block">STOP LOCATION</label>
                                    <LocationCombobox
                                      customerId={contractCustomer}
                                      value={locVal}
                                      onChange={(locName) => handleUpdateSlotReturnIntermediate(contractSlots[0]?.id || 'slot-1', idx, locName)}
                                      placeholder="Return intermediate location..."
                                      triggerClassName="h-8.5 border-indigo-200 bg-white"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-indigo-900 uppercase tracking-wider block">FEE (SAR)</label>
                                    <input
                                      type="number"
                                      value={contractSlots[0]?.returnIntermediateStopFees?.[idx] || ''}
                                      onChange={(e) => handleUpdateSlotReturnIntermediateFee(contractSlots[0]?.id || 'slot-1', idx, e.target.value)}
                                      placeholder="e.g. 150"
                                      className="w-full h-8.5 px-2.5 rounded-xl border border-indigo-200 bg-white text-xs font-bold"
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}

                            {/* RETURN DROPOFF */}
                            <div className="rounded-xl border border-purple-200 bg-purple-50/20 p-2.5 space-y-2">
                              <div className="grid grid-cols-2 gap-2.5 items-end">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider block">
                                    RETURN DROPOFF LOCATION
                                  </label>
                                  <LocationCombobox
                                    customerId={contractCustomer}
                                    value={contractSlots[0]?.returnDestination || contractSlots[0]?.origin || ''}
                                    onChange={(locName, locObj) => handleSlotLocationChange(contractSlots[0]?.id || 'slot-1', 'returnDestination', locName, locObj)}
                                    placeholder="Return destination location..."
                                    triggerClassName="h-8.5 border-purple-200 bg-white"
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-1.5">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1">
                                      <Calendar className="w-3 h-3 text-purple-600" /> DATE
                                    </label>
                                    <DatePicker
                                      value={contractSlots[0]?.returnDropoffDate || contractSlots[0]?.returnDate || ''}
                                      onChange={(_, dateStr) => handleUpdateTripSlot(contractSlots[0]?.id || 'slot-1', { returnDropoffDate: dateStr })}
                                      placeholder="Select date..."
                                      buttonClassName="h-8.5 border-purple-200 bg-white font-semibold text-xs text-slate-800"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-purple-600" /> TIME
                                    </label>
                                    <div className="flex items-center gap-1">
                                      <TimePicker
                                        value={contractSlots[0]?.returnDropoffTime || '21:00'}
                                        onChange={(timeStr) => handleUpdateTripSlot(contractSlots[0]?.id || 'slot-1', { returnDropoffTime: timeStr })}
                                        placeholder="Select time..."
                                        buttonClassName="flex-1 h-8.5 border-purple-200 bg-white font-semibold text-xs text-slate-800"
                                      />
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => handleAddSlotReturnIntermediate(contractSlots[0]?.id || 'slot-1')}
                                        className="h-8.5 w-8.5 p-0 rounded-lg bg-purple-600 hover:bg-purple-700 text-white shrink-0 border-0"
                                        title="Add Return Waystop"
                                      >
                                        <Plus className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Transit Time Summary */}
                        <div className="text-xs text-slate-500 space-y-1 pt-1 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-medium">
                            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>Transit: <strong>12h 53m (1030 km)</strong> via Saudi Highway Network</span>
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium pl-5">
                            Route: <strong>{contractSlots[0]?.origin || 'Riyadh Hub'} {'->'} {contractSlots[0]?.destination || 'Jeddah Hub'}</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: QUOTATION & SERVICE TYPE */}
                    <div className="space-y-4 flex flex-col">
                      {/* QUADRANT 2 (TOP-RIGHT): QUOTATION */}
                      <div className={cn(
                        "p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5 transition-all flex flex-col justify-between"
                      )}>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                            <div className="flex items-center gap-2 text-xs font-black text-[#3E3C3D] dark:text-slate-100 uppercase tracking-wider">
                              <FileText className="w-4 h-4 text-[#FA634E]" />
                              <span>QUOTATION</span>
                            </div>
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                              Auto Tariff Matched
                            </Badge>
                          </div>

                          {/* RECENT RATE CARDS — COMPACT SQUARES */}
                          <div className="grid grid-cols-4 gap-2">
                            {MOCK_RATE_CARDS.map((card) => {
                              const isSelected = selectedRateCard === card.id;
                              return (
                                <button
                                  key={card.id}
                                  type="button"
                                  onClick={() => handleSelectRateCard(card)}
                                  className={cn(
                                    "p-2 rounded-xl border text-center transition-all relative flex flex-col items-center justify-between h-20 cursor-pointer",
                                    isSelected
                                      ? "bg-orange-50/70 border-[#FA634E] ring-1 ring-[#FA634E]/30"
                                      : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300"
                                  )}
                                >
                                  <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 truncate w-full leading-tight">
                                    {card.title}
                                  </span>
                                  <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 font-mono">
                                    SAR {card.billingRate}
                                  </span>
                                  <span className="text-[9px] font-bold text-slate-400">
                                    {card.vehicleClass}
                                  </span>
                                  {isSelected && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FA634E] text-white grid place-items-center shadow-2xs">
                                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                                    </div>
                                  )}
                                </button>
                              );
                            })}
                          </div>

                          {/* SEPARATE BOX FOR DRIVER & TRUCK ASSIGNMENT WITH FLEET SWITCH */}
                          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 space-y-2.5">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-700">
                              <span className="text-[11px] font-black text-[#3E3C3D] dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5 text-[#FA634E]" />
                                DRIVER & TRUCK ASSIGNMENT
                              </span>
                              {/* Fleet Mode Switch Toggle */}
                              <div className="flex items-center bg-slate-200/80 dark:bg-slate-700 p-0.5 rounded-lg text-[10px] font-bold">
                                <button
                                  type="button"
                                  onClick={() => setAssignmentType('own')}
                                  className={cn(
                                    "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                                    assignmentType === 'own'
                                      ? "bg-[#FA634E] text-white shadow-2xs"
                                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                                  )}
                                >
                                  Own Fleet
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setAssignmentType('third_party')}
                                  className={cn(
                                    "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                                    assignmentType === 'third_party'
                                      ? "bg-[#FA634E] text-white shadow-2xs"
                                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                                  )}
                                >
                                  3rd Party Fleet
                                </button>
                              </div>
                            </div>

                            {/* IF OWN FLEET */}
                            {assignmentType === 'own' ? (
                              <div className="grid grid-cols-2 gap-2.5 animate-fade-in">
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                      <User className="w-3 h-3 text-[#FA634E]" /> DRIVER
                                    </label>
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => setIsCreateDriverOpen(true)}
                                      className="h-4 text-[9px] font-bold bg-[#FA634E] hover:bg-[#e0523d] text-white rounded px-1.5 border-0"
                                    >
                                      + Add
                                    </Button>
                                  </div>
                                  <Combobox
                                    options={driverOptions}
                                    value={masterDriver}
                                    onChange={handleDriverChange}
                                    placeholder="Select driver..."
                                    searchPlaceholder="Search driver..."
                                    emptyText="No driver."
                                    triggerClassName="h-8.5 rounded-xl border-slate-200 bg-white text-xs font-semibold w-full"
                                  />
                                </div>

                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                    <Truck className="w-3 h-3 text-[#FA634E]" /> VEHICLE
                                  </label>
                                  <Combobox
                                    options={vehicleOptions}
                                    value={masterVehicle}
                                    onChange={handleVehicleChange}
                                    placeholder="Select vehicle..."
                                    searchPlaceholder="Search vehicle..."
                                    emptyText="No vehicle."
                                    triggerClassName="h-8.5 rounded-xl border-slate-200 bg-white text-xs font-semibold w-full"
                                  />
                                </div>
                              </div>
                            ) : (
                              /* IF 3RD PARTY FLEET */
                              <div className="space-y-2 animate-fade-in">
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">3rd Party Provider</label>
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => setIsCreateProviderOpen(true)}
                                        className="h-4 text-[9px] font-bold text-[#FA634E] hover:underline p-0 bg-transparent"
                                      >
                                        + Add
                                      </Button>
                                    </div>
                                    <Select value={thirdPartyProviderId} onValueChange={setThirdPartyProviderId}>
                                      <SelectTrigger className="h-8 text-xs font-bold rounded-lg border-slate-200 bg-white">
                                        <SelectValue placeholder="Select Provider..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {thirdPartyProviders.map((p) => (
                                          <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Supplier Cost (SAR)</label>
                                    <input
                                      type="number"
                                      value={thirdPartyCost}
                                      onChange={(e) => setThirdPartyCost(e.target.value)}
                                      placeholder="e.g. 850"
                                      className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-bold"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-3 gap-2">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Driver Name</label>
                                    <input
                                      type="text"
                                      value={thirdPartyDriverName}
                                      onChange={(e) => setThirdPartyDriverName(e.target.value)}
                                      placeholder="Driver name..."
                                      className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phone</label>
                                    <input
                                      type="text"
                                      value={thirdPartyDriverPhone}
                                      onChange={(e) => setThirdPartyDriverPhone(e.target.value)}
                                      placeholder="+966..."
                                      className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-medium"
                                    />
                                  </div>

                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Plate No.</label>
                                    <input
                                      type="text"
                                      value={thirdPartyVehiclePlate}
                                      onChange={(e) => setThirdPartyVehiclePlate(e.target.value)}
                                      placeholder="Plate..."
                                      className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-bold"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* QUADRANT 4 (BOTTOM-RIGHT): SERVICE TYPE & MONTHLY SCHEDULER */}
                      <div className={cn(
                        "p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3.5 transition-all flex flex-col justify-between"
                      )}>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                            <div className="flex items-center gap-2 text-xs font-black text-[#3E3C3D] dark:text-slate-100 uppercase tracking-wider">
                              <ClipboardList className="w-4 h-4 text-[#FA634E]" />
                              <span>SERVICE TYPE & MONTHLY SCHEDULER</span>
                            </div>
                          </div>

                          {/* Operation Mode and Vehicle Class Switches */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Operation Mode</label>
                              <Select value={contractBillingType || 'Extra (Spot)'} onValueChange={(val) => {
                                setContractBillingType(val);
                                if (val === 'Monthly') setSelectedRateCard('rc-4');
                              }}>
                                <SelectTrigger className="h-8 text-xs font-bold rounded-xl border-slate-200 bg-white">
                                  <SelectValue placeholder="Operation" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Extra (Spot)">Extra (Spot)</SelectItem>
                                  <SelectItem value="Monthly">Monthly Trips</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Vehicle Class</label>
                              <Select value={contractVehicleType || '5 TON'} onValueChange={(val) => {
                                setContractVehicleType(val);
                                triggerRateLookupForSlots(val);
                              }}>
                                <SelectTrigger className="h-8 text-xs font-bold rounded-xl border-slate-200 bg-white">
                                  <SelectValue placeholder="Vehicle Class" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="3-4 TON">3-4 TON</SelectItem>
                                  <SelectItem value="5 TON">5 TON</SelectItem>
                                  <SelectItem value="10 TON">10 TON</SelectItem>
                                  <SelectItem value="20 TON">20 TON</SelectItem>
                                  <SelectItem value="40 FEET">40 FEET</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                        {/* IF MONTHLY IS SELECTED: COMPACT MONTHLY CALENDAR PICKER */}
                        {contractBillingType === 'Monthly' ? (
                          <div className="p-3 rounded-xl bg-orange-50/50 dark:bg-slate-800/80 border border-orange-200 dark:border-slate-700 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-[#FA634E]" />
                                Monthly Schedule — September 2026
                              </span>
                              <Badge className="bg-[#FA634E] text-white text-[10px] font-bold">
                                {monthlySelectedDays.length} Days Selected
                              </Badge>
                            </div>

                            {/* Calendar Day Grid (1 - 30) */}
                            <div className="grid grid-cols-7 gap-1 text-center">
                              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                                <span key={idx} className="text-[9px] font-extrabold text-slate-400 uppercase py-0.5">{day}</span>
                              ))}
                              {Array.from({ length: 30 }, (_, i) => i + 1).map((dayNum) => {
                                const isSelected = monthlySelectedDays.includes(dayNum);
                                return (
                                  <button
                                    key={dayNum}
                                    type="button"
                                    onClick={() => {
                                      setMonthlySelectedDays((prev) =>
                                        prev.includes(dayNum) ? prev.filter((d) => d !== dayNum) : [...prev, dayNum]
                                      );
                                    }}
                                    className={cn(
                                      "h-6 rounded-md text-[10px] font-extrabold transition-all grid place-items-center cursor-pointer",
                                      isSelected
                                        ? "bg-[#FA634E] text-white shadow-2xs"
                                        : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300"
                                    )}
                                  >
                                    {dayNum}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Presets & Action */}
                            <div className="flex items-center justify-between gap-2 pt-1 border-t border-orange-200/60">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setMonthlySelectedDays([1, 2, 3, 4, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 28, 29, 30])}
                                  className="text-[9px] font-bold text-slate-600 hover:text-[#FA634E] underline cursor-pointer"
                                >
                                  Weekdays
                                </button>
                                <span className="text-slate-300">|</span>
                                <button
                                  type="button"
                                  onClick={() => setMonthlySelectedDays(Array.from({ length: 30 }, (_, i) => i + 1))}
                                  className="text-[9px] font-bold text-slate-600 hover:text-[#FA634E] underline cursor-pointer"
                                >
                                  Select All
                                </button>
                              </div>

                              <Button
                                type="button"
                                disabled={monthlySelectedDays.length === 0}
                                onClick={() => {
                                  toast.success(`Generated ${monthlySelectedDays.length} Monthly Trips schedule!`);
                                }}
                                className="h-7 text-xs font-bold bg-[#FA634E] hover:bg-[#e0523d] text-white rounded-lg px-3 border-0 shadow-2xs"
                              >
                                Proceed ({monthlySelectedDays.length} Trips)
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2 text-center">
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed text-left">
                              ⚡ <strong>Single Spot Operation Active:</strong> Rate is bound to single departure slot ({contractSlots[0]?.origin || 'RIYADH HUB'} {'->'} {contractSlots[0]?.destination || 'JEDDAH HUB'}). Select <strong>Monthly Trips</strong> to enable calendar multi-date batch scheduling.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
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
