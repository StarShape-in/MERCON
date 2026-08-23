import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Sparkles,
  Table2,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Zap,
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
  Coins,
  UserCheck,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LocationCombobox from '@/components/rate-cards/LocationCombobox';
import VehicleTypeSelect from '@/components/rate-cards/VehicleTypeSelect';
import { RateCategorySelect } from '@/components/rate-cards/RateCategorySelect';
import TransitTimeBadge from '@/components/trips/TransitTimeBadge';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
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
import { customerService } from '@/services/customerService';
import { driverService, Driver } from '@/services/driverService';
import { vehicleService, Vehicle } from '@/services/vehicleService';
import { rateCardService, RateCard } from '@/services/rateCardService';
import { thirdPartyService, ThirdPartyProvider } from '@/services/thirdPartyService';
import { tripService, BulkImportTripRow, BulkImportResult } from '@/services/tripService';
import { VEHICLE_TYPES, RATE_CATEGORIES, BILLING_TYPES } from '@mercon/shared-types';
import { monthLabel, shiftMonth } from '@/components/trips/monthly/monthlyBoardUtils';
import { parseSheet, TRIP_COLUMNS } from '@/utils/importUtils';
import { useFormKeyboardShortcuts } from '@/hooks/useFormKeyboardShortcuts';
import { KbdBadge } from '@/components/ui/kbd-badge';

const MODAL_RATE_CATEGORIES = RATE_CATEGORIES;

const isRoundTripCategory = (cat: string) => Boolean(cat) && cat.toLowerCase().includes('round');

const getVehicleTypeFromCapacity = (capacityKg?: number | null): string => {
  const tons = (capacityKg || 24000) / 1000;
  if (tons <= 4) return '3-4 TON';
  if (tons <= 5) return '5 TON';
  if (tons <= 10) return '10 TON';
  if (tons <= 20) return '20 TON';
  return '40 FEET';
};

const getActualCapacityLabel = (capacityKg?: number | null): string => {
  if (!capacityKg || capacityKg <= 0) return '';
  const tons = capacityKg / 1000;
  return Number.isInteger(tons) ? `${tons} TON` : `${tons.toFixed(1)} TON`;
};

const getDriverLabel = (d: any, vehiclesList: any[]) => {
  const assignedVeh = d.assignedVehicle && typeof d.assignedVehicle === 'object'
    ? (d.assignedVehicle as any)
    : vehiclesList.find((v) => v.id === (d.assignedVehicleId || d.assigned_vehicle_id));

  const capacityKg = assignedVeh?.capacity_kg ?? (assignedVeh as any)?.capacityKg;
  const capacityLabel = capacityKg ? getActualCapacityLabel(capacityKg) : '';
  const statusLabel = d.status ? ` - ${d.status}` : '';

  return capacityLabel
    ? `${d.first_name} ${d.last_name} (${capacityLabel}${statusLabel})`
    : `${d.first_name} ${d.last_name}${statusLabel ? ` (${d.status})` : ''}`;
};

const getVehicleLabel = (v: any) => {
  const capacityKg = v.capacity_kg ?? (v as any).capacityKg;
  const capacityLabel = capacityKg ? getActualCapacityLabel(capacityKg) : '';
  const typeLabel = v.asset_type || (v as any).assetType || '';

  const suffix = [typeLabel, capacityLabel].filter(Boolean).join(' - ');
  return suffix ? `${v.plate_number} (${suffix})` : v.plate_number;
};

const calculateTransitTime = (pickup: string | undefined, dropoff: string | undefined, isOvernight?: boolean): string => {
  if (!pickup || !dropoff) return 'N/A';
  const [pH, pM] = pickup.split(':').map(Number);
  const [dH, dM] = dropoff.split(':').map(Number);
  let start = pH * 60 + pM;
  let end = dH * 60 + dM;
  if (isOvernight) {
    end += 24 * 60;
  }
  const diff = end - start;
  if (diff < 0) return 'N/A';
  const hrs = Math.floor(diff / 60);
  const mins = diff % 60;
  if (mins === 0) return hrs + ' hrs';
  return hrs + ' hrs ' + mins + ' mins';
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
  billingType: string;
  origin: string;
  destination: string;
  amount: string;
}

export default function CreateMonthlyTripPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const paramMonth = searchParams.get('month');

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabMode>('contract');

  // Month navigation for contract generator
  const currentMonthKey = paramMonth || new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);

  useEffect(() => {
    if (paramMonth) {
      setSelectedMonth(paramMonth);
    }
  }, [paramMonth]);

  // Master Data Queries
  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 150 }),
  });

  const { data: driversRes } = useQuery({
    queryKey: ['drivers-select'],
    queryFn: () => driverService.getAll({ per_page: 200, mode: 'lookup' }),
  });

  const { data: vehiclesRes } = useQuery({
    queryKey: ['vehicles-select'],
    queryFn: () => vehicleService.getAll({ per_page: 200, mode: 'lookup' }),
  });

  const { data: thirdPartyRes } = useQuery({
    queryKey: ['third-party-providers-select'],
    queryFn: () => thirdPartyService.getAll({ per_page: 200 }),
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

  // ==========================================
  // TAB 1: MONTHLY CONTRACT BATCH GENERATOR STATE
  // ==========================================
  const [contractStep, setContractStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [hasAttemptedStep4, setHasAttemptedStep4] = useState(false);
  const [bypassDriverValidation, setBypassDriverValidation] = useState(false);
  const [isUnassignedAlertOpen, setIsUnassignedAlertOpen] = useState(false);

  useEffect(() => {
    setHasAttemptedStep4(false);
    if (contractStep !== 5) {
      setBypassDriverValidation(false);
    }
  }, [contractStep]);

  const [contractCustomer, setContractCustomer] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [contractRateCategory, setContractRateCategory] = useState<string>(MODAL_RATE_CATEGORIES[0] || 'Trip');
  const [contractVehicleType, setContractVehicleType] = useState<string>(VEHICLE_TYPES[0] || 'Flatbed');
  const [contractBillingType, setContractBillingType] = useState<string>('');

  // Rate Cards Lookup
  const { data: rateCardsRes, isLoading: isRateCardsLoading } = useQuery({
    queryKey: ['rate-cards-customer-lookup', contractCustomer],
    queryFn: () => rateCardService.getAll({ customerId: contractCustomer, per_page: 'all', active_only: true }),
    enabled: Boolean(contractCustomer),
  });

  const customerRateCards = rateCardsRes?.data ?? [];

  const getMatchingRateCard = (
    origin?: string,
    destination?: string,
    vehicleType?: string,
    rateCategory?: string,
    billingType?: string
  ): RateCard | null => {
    if (!origin || !destination || customerRateCards.length === 0) return null;

    const norm = (s?: string | null) => String(s || '').toLowerCase().replace(/[\s,_()[\]\/{}\-.]/g, '');
    const oNorm = norm(origin);
    const dNorm = norm(destination);
    const vNorm = norm(vehicleType);
    const cNorm = norm(rateCategory);
    const bNorm = norm(billingType);

    const exact = customerRateCards.find((rc) => {
      const rcO = norm(rc.route_origin || rc.originLocation?.name);
      const rcD = norm(rc.route_destination || rc.destinationLocation?.name);
      const laneMatch = (rcO.includes(oNorm) || oNorm.includes(rcO)) && (rcD.includes(dNorm) || dNorm.includes(rcD));
      if (!laneMatch) return false;
      const vMatch = !vNorm || norm(rc.vehicle_type) === vNorm;
      const cMatch = !cNorm || norm(rc.rate_category) === cNorm;
      const bMatch = !bNorm || norm(rc.billing_type) === bNorm;
      return vMatch && cMatch && bMatch;
    });
    if (exact) return exact;

    return customerRateCards.find((rc) => {
      const rcO = norm(rc.route_origin || rc.originLocation?.name);
      const rcD = norm(rc.route_destination || rc.destinationLocation?.name);
      return (rcO.includes(oNorm) || oNorm.includes(rcO)) && (rcD.includes(dNorm) || dNorm.includes(rcD));
    }) || null;
  };

  // Route Slot Definition
  interface RouteSlot {
    id: string;
    origin: string;
    destination: string;
    rateCategory: string;
    vehicleType: string;
    billingType: string;
    billingAmount: string;
    isCustomAmount: boolean;
    assignedRateCardId?: string;
    pickupTime?: string;
    deliveryTime?: string;
    isOvernight?: boolean;
    selectedDays: number[];
  }

  const [routeSlots, setRouteSlots] = useState<RouteSlot[]>([
    {
      id: 'slot-1',
      origin: '',
      destination: '',
      rateCategory: MODAL_RATE_CATEGORIES[0] || 'Trip',
      vehicleType: VEHICLE_TYPES[0] || 'Flatbed',
      billingType: BILLING_TYPES[0] || 'Per Trip',
      billingAmount: '',
      isCustomAmount: false,
      pickupTime: '08:00',
      deliveryTime: '17:00',
      isOvernight: false,
      selectedDays: [0, 1, 2, 3, 4],
    },
  ]);

  const monthDates = useMemo(() => {
    const [year, m] = selectedMonth.split('-').map(Number);
    if (!year || !m) return [];
    const daysInMonth = new Date(year, m, 0).getDate();
    const dates: { dateStr: string; dayName: string; dayOfWeek: number; dayNum: number }[] = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, m - 1, d);
      const dayOfWeek = dateObj.getDay();
      const monthPadded = String(m).padStart(2, '0');
      const dayPadded = String(d).padStart(2, '0');
      dates.push({
        dateStr: `${year}-${monthPadded}-${dayPadded}`,
        dayName: days[dayOfWeek],
        dayOfWeek,
        dayNum: d,
      });
    }
    return dates;
  }, [selectedMonth]);

  const [assignmentType, setAssignmentType] = useState<'own' | 'third_party'>('own');
  const [masterDriver, setMasterDriver] = useState('');
  const [masterVehicle, setMasterVehicle] = useState('');
  const [isVehicleTypeEditable, setIsVehicleTypeEditable] = useState(false);
  const [isCustomThirdPartyVehicleType, setIsCustomThirdPartyVehicleType] = useState(false);

  const [thirdPartyProviderId, setThirdPartyProviderId] = useState('');
  const [thirdPartyDriverName, setThirdPartyDriverName] = useState('');
  const [thirdPartyDriverPhone, setThirdPartyDriverPhone] = useState('');
  const [thirdPartyVehiclePlate, setThirdPartyVehiclePlate] = useState('');
  const [thirdPartyCost, setThirdPartyCost] = useState('');

  // Modals for creation & preview
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);
  const [isCreateDriverOpen, setIsCreateDriverOpen] = useState(false);
  const [isCreateVehicleOpen, setIsCreateVehicleOpen] = useState(false);
  const [isCreateProviderOpen, setIsCreateProviderOpen] = useState(false);

  const [previewCustomer, setPreviewCustomer] = useState<any | null>(null);
  const [previewDriver, setPreviewDriver] = useState<any | null>(null);
  const [previewVehicle, setPreviewVehicle] = useState<any | null>(null);
  const [previewThirdParty, setPreviewThirdParty] = useState<any | null>(null);

  const [editCustomer, setEditCustomer] = useState<any | null>(null);
  const [editDriver, setEditDriver] = useState<any | null>(null);
  const [editVehicle, setEditVehicle] = useState<any | null>(null);
  const [editThirdParty, setEditThirdParty] = useState<any | null>(null);

  // Per-Day Driver/Vehicle Override map
  const [dayAssignments, setDayAssignments] = useState<Record<string, { driverId?: string; vehicleId?: string }>>({});

  const handleMasterDriverChange = (driverId: string) => {
    setMasterDriver(driverId);
    if (!driverId) return;
    const selectedD = drivers.find((d) => d.id === driverId);
    if (selectedD) {
      const assignedVehId =
        selectedD.assignedVehicleId ||
        (selectedD as any).assigned_vehicle_id ||
        (typeof selectedD.assignedVehicle === 'object' ? (selectedD.assignedVehicle as any)?.id : null);
      if (assignedVehId) {
        setMasterVehicle(assignedVehId);
        const veh = vehicles.find((v) => v.id === assignedVehId);
        if (veh) {
          const capType = getVehicleTypeFromCapacity(veh.capacity_kg ?? (veh as any).capacityKg);
          if (capType) {
            setContractVehicleType(capType);
            setRouteSlots((prev) => prev.map((s) => ({ ...s, vehicleType: capType })));
          }
        }
      }
    }
  };

  const handleMasterVehicleChange = (vehicleId: string) => {
    setMasterVehicle(vehicleId);
    if (!vehicleId) return;
    const veh = vehicles.find((v) => v.id === vehicleId);
    if (veh) {
      const capType = getVehicleTypeFromCapacity(veh.capacity_kg ?? (veh as any).capacityKg);
      if (capType) {
        setContractVehicleType(capType);
        setRouteSlots((prev) => prev.map((s) => ({ ...s, vehicleType: capType })));
      }
    }
  };

  const driverOptions = useMemo<ComboboxOption[]>(() => {
    return drivers
      .filter(
        (d) =>
          (d.status === 'Available' || d.status?.toLowerCase() === 'available' || d.id === masterDriver) &&
          d.isActive !== false
      )
      .map((d) => {
        const embeddedVeh =
          d.assignedVehicle && typeof d.assignedVehicle === 'object'
            ? (d.assignedVehicle as any)
            : null;

        const vehicleId = d.assignedVehicleId || (d as any).assigned_vehicle_id || embeddedVeh?.id;
        const matchedVeh = vehicleId ? vehicles.find((v) => v.id === vehicleId) : null;

        const capacityKg =
          embeddedVeh?.capacity_kg ??
          embeddedVeh?.capacityKg ??
          matchedVeh?.capacity_kg ??
          (matchedVeh as any)?.capacityKg;

        const capacityLabel = capacityKg != null ? getActualCapacityLabel(capacityKg) : '';

        const label = capacityLabel
          ? `${d.first_name} ${d.last_name} (${capacityLabel})`
          : `${d.first_name} ${d.last_name}`;

        return {
          value: d.id,
          label,
          keywords: `${d.first_name} ${d.last_name} ${d.phone_primary || ''} ${d.license_number || ''} ${capacityLabel}`,
        };
      });
  }, [drivers, vehicles, masterDriver]);

  const vehicleOptions = useMemo<ComboboxOption[]>(() => {
    return vehicles
      .filter(
        (v) =>
          (v.status === 'Available' || v.status?.toLowerCase() === 'available' || v.id === masterVehicle) &&
          v.is_active !== false
      )
      .map((v) => {
        const capacityKg = v.capacity_kg ?? (v as any).capacityKg;
        const capacityLabel = capacityKg != null ? getActualCapacityLabel(capacityKg) : '';
        const typeLabel = v.asset_type || (v as any).assetType || '';

        const suffix = [typeLabel, capacityLabel].filter(Boolean).join(' - ');
        const label = suffix ? `${v.plate_number} (${suffix})` : v.plate_number;

        return {
          value: v.id,
          label,
          keywords: `${v.plate_number} ${typeLabel} ${capacityLabel} ${v.make || ''} ${v.model || ''}`,
        };
      });
  }, [vehicles, masterVehicle]);

  const thirdPartyOptions = useMemo<ComboboxOption[]>(() => {
    return thirdPartyProviders.map((p) => ({
      value: p.id,
      label: p.name,
      keywords: `${p.name} ${p.contact_person || ''} ${p.phone || ''}`,
    }));
  }, [thirdPartyProviders]);

  const batchTripRows = useMemo(() => {
    if (!contractCustomer) return [];

    const rows: BulkImportTripRow[] = [];

    monthDates.forEach((dateInfo) => {
      routeSlots.forEach((slot) => {
        if (!slot.origin || !slot.destination) return;

        if (slot.selectedDays.includes(dateInfo.dayOfWeek)) {
          const key = `${dateInfo.dateStr}_${slot.id}`;
          const dayOverride = dayAssignments[key] || {};

          let driver_id: string | undefined = undefined;
          let vehicle_id: string | undefined = undefined;
          let third_party_provider_id: string | undefined = undefined;
          let third_party_driver_name: string | undefined = undefined;
          let third_party_driver_phone: string | undefined = undefined;
          let third_party_vehicle_plate: string | undefined = undefined;
          let third_party_cost: number | undefined = undefined;

          if (assignmentType === 'own') {
            driver_id = dayOverride.driverId !== undefined ? dayOverride.driverId : masterDriver || undefined;
            vehicle_id = dayOverride.vehicleId !== undefined ? dayOverride.vehicleId : masterVehicle || undefined;
          } else {
            third_party_provider_id = thirdPartyProviderId || undefined;
            third_party_driver_name = thirdPartyDriverName || undefined;
            third_party_driver_phone = thirdPartyDriverPhone || undefined;
            third_party_vehicle_plate = thirdPartyVehiclePlate || undefined;
            third_party_cost = thirdPartyCost ? Number(thirdPartyCost) : undefined;
          }

          rows.push({
            customer_id: contractCustomer,
            date: dateInfo.dateStr,
            origin: slot.origin,
            destination: slot.destination,
            rate_category: slot.rateCategory || contractRateCategory,
            vehicle_type: slot.vehicleType || contractVehicleType,
            billing_type: slot.billingType || contractBillingType,
            billing_amount: slot.billingAmount ? Number(slot.billingAmount) : undefined,
            pickup_time: slot.pickupTime || undefined,
            delivery_time: slot.deliveryTime || undefined,
            is_overnight: slot.isOvernight,
            driver_id,
            vehicle_id,
            third_party_provider_id,
            third_party_driver_name,
            third_party_driver_phone,
            third_party_vehicle_plate,
            third_party_cost,
          });
        }
      });
    });

    return rows;
  }, [
    contractCustomer,
    selectedMonth,
    monthDates,
    routeSlots,
    contractRateCategory,
    contractVehicleType,
    contractBillingType,
    assignmentType,
    masterDriver,
    masterVehicle,
    dayAssignments,
    thirdPartyProviderId,
    thirdPartyDriverName,
    thirdPartyDriverPhone,
    thirdPartyVehiclePlate,
    thirdPartyCost,
  ]);

  const totalContractAmount = useMemo(() => {
    return batchTripRows.reduce((sum, r) => sum + (r.billing_amount || 0), 0);
  }, [batchTripRows]);

  // ==========================================
  // TAB 2: QUICK GRID ENTRY STATE
  // ==========================================
  const [gridRows, setGridRows] = useState<GridTripRow[]>([
    {
      id: 'row-1',
      customerId: '',
      date: new Date().toISOString().slice(0, 10),
      driverId: '',
      vehicleId: '',
      rateCategory: MODAL_RATE_CATEGORIES[0] || 'Trip',
      vehicleType: VEHICLE_TYPES[0] || 'Flatbed',
      billingType: BILLING_TYPES[0] || 'Per Trip',
      origin: '',
      destination: '',
      amount: '',
    },
  ]);

  const addGridRow = () => {
    const last = gridRows[gridRows.length - 1];
    setGridRows((prev) => [
      ...prev,
      {
        id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        customerId: last?.customerId || '',
        date: last?.date || new Date().toISOString().slice(0, 10),
        driverId: last?.driverId || '',
        vehicleId: last?.vehicleId || '',
        rateCategory: last?.rateCategory || MODAL_RATE_CATEGORIES[0] || 'Trip',
        vehicleType: last?.vehicleType || VEHICLE_TYPES[0] || 'Flatbed',
        billingType: last?.billingType || BILLING_TYPES[0] || 'Per Trip',
        origin: last?.origin || '',
        destination: last?.destination || '',
        amount: last?.amount || '',
      },
    ]);
  };

  const removeGridRow = (id: string) => {
    if (gridRows.length === 1) {
      toast.error('At least one row must remain in grid.');
      return;
    }
    setGridRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateGridRow = (id: string, field: keyof GridTripRow, value: string) => {
    setGridRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const updated = { ...r, [field]: value };
        if (field === 'driverId' && value) {
          const d = drivers.find((drv) => drv.id === value);
          const vehId = d?.assignedVehicleId || (d as any)?.assigned_vehicle_id;
          if (vehId && !updated.vehicleId) {
            updated.vehicleId = vehId;
          }
        }
        return updated;
      })
    );
  };

  // ==========================================
  // TAB 3: CSV / EXCEL FILE IMPORT STATE
  // ==========================================
  const [parsedRows, setParsedRows] = useState<Array<BulkImportTripRow>>([]);
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setParseError(null);
    setImportedFile(file);

    try {
      const result = await parseSheet(file);

      if (result.errors && result.errors.length > 0) {
        setParseError(`File validation warning: ${result.errors[0]}`);
      }

      if (result.rows && result.rows.length > 0) {
        const rows: BulkImportTripRow[] = result.rows.map((r) => ({
          customer_id: r.customer_id || r.customerId || '',
          customer_name: r.customer_name || r.customerName || undefined,
          date: r.date || new Date().toISOString().slice(0, 10),
          origin: r.origin || '',
          destination: r.destination || '',
          driver_id: r.driver_id || r.driverId || undefined,
          driver_name: r.driver_name || r.driverName || undefined,
          vehicle_id: r.vehicle_id || r.vehicleId || undefined,
          vehicle_plate: r.vehicle_plate || r.vehiclePlate || undefined,
          rate_category: r.rate_category || r.rateCategory || MODAL_RATE_CATEGORIES[0],
          vehicle_type: r.vehicle_type || r.vehicleType || VEHICLE_TYPES[0],
          billing_type: r.billing_type || r.billingType || BILLING_TYPES[0],
          billing_amount: r.billing_amount ? Number(r.billing_amount) : undefined,
        }));
        setParsedRows(rows);
        toast.success(`Successfully parsed ${rows.length} trip rows from file.`);
      } else {
        setParseError('No valid trip rows found in file. Please ensure columns match standard template.');
      }
    } catch (err: any) {
      setParseError(err?.message || 'Failed to parse file.');
    }
  };

  const handleDownloadTemplate = () => {
    const headers = TRIP_COLUMNS.map((c) => c.header).join(',');
    const example = 'Acme Corp,2026-08-01,Depot A,Location B,Available Driver,ABC-1234,Trip,Flatbed,Per Trip,1500';
    const csvContent = `data:text/csv;charset=utf-8,${headers}\n${example}`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'MERCON_Bulk_Trips_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // BULK MUTATION & SUBMISSION
  const [submissionResult, setSubmissionResult] = useState<BulkImportResult | null>(null);

  const bulkMutation = useMutation({
    mutationFn: (rows: BulkImportTripRow[]) => tripService.bulkImport(rows),
    onSuccess: (res) => {
      setSubmissionResult(res);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trips', 'monthly-board'] });
      toast.success(`Successfully imported ${res.imported_count || res.created_count || 0} trips!`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to import trips batch.');
    },
  });

  const handleContractSubmit = () => {
    if (batchTripRows.length === 0) {
      toast.error('No trip rows generated. Please select route slots and days.');
      return;
    }
    const unassignedCount = batchTripRows.filter((r) => !r.driver_id && !r.third_party_provider_id).length;
    if (unassignedCount > 0 && !bypassDriverValidation) {
      setIsUnassignedAlertOpen(true);
      return;
    }
    setBypassDriverValidation(false);
    bulkMutation.mutate(batchTripRows);
  };

  const handleGridSubmit = () => {
    const validRows = gridRows.filter((r) => r.customerId && r.origin && r.destination);
    if (validRows.length === 0) {
      toast.error('Please complete customer, origin, and destination for at least one grid row.');
      return;
    }
    const rows: BulkImportTripRow[] = validRows.map((r) => ({
      customer_id: r.customerId,
      date: r.date,
      origin: r.origin,
      destination: r.destination,
      driver_id: r.driverId || undefined,
      vehicle_id: r.vehicleId || undefined,
      rate_category: r.rateCategory,
      vehicle_type: r.vehicleType,
      billing_type: r.billingType,
      billing_amount: r.amount ? Number(r.amount) : undefined,
    }));
    bulkMutation.mutate(rows);
  };

  const handleFileSubmit = () => {
    if (parsedRows.length === 0) {
      toast.error('No trip rows loaded from file.');
      return;
    }
    bulkMutation.mutate(parsedRows);
  };

  const resetAll = () => {
    setContractStep(1);
    setContractCustomer('');
    setRouteSlots([
      {
        id: 'slot-1',
        origin: '',
        destination: '',
        rateCategory: MODAL_RATE_CATEGORIES[0] || 'Trip',
        vehicleType: VEHICLE_TYPES[0] || 'Flatbed',
        billingType: BILLING_TYPES[0] || 'Per Trip',
        billingAmount: '',
        isCustomAmount: false,
        pickupTime: '08:00',
        deliveryTime: '17:00',
        isOvernight: false,
        selectedDays: [0, 1, 2, 3, 4],
      },
    ]);
    setMasterDriver('');
    setMasterVehicle('');
    setDayAssignments({});
    setSubmissionResult(null);
    setParsedRows([]);
    setImportedFile(null);
    setParseError(null);
    bulkMutation.reset();
    setHasAttemptedStep4(false);
    setBypassDriverValidation(false);
    setIsUnassignedAlertOpen(false);
  };

  const handleExit = () => {
    resetAll();
    navigate('/trips/monthly');
  };

  const isStepValid = (step: number) => {
    if (step === 1) return Boolean(contractCustomer);
    if (step === 2) return routeSlots.some((s) => s.origin && s.destination && s.selectedDays.length > 0);
    if (step === 3) return true;
    return true;
  };

  const canNavigateToStep = (step: number) => {
    if (step === 1) return true;
    if (step === 2) return isStepValid(1);
    if (step === 3) return isStepValid(1) && isStepValid(2);
    if (step === 4) return isStepValid(1) && isStepValid(2) && isStepValid(3);
    return false;
  };

  useFormKeyboardShortcuts({
    onSave: () => {
      if (activeTab === 'contract') {
        if (contractStep < 4) {
          if (isStepValid(contractStep)) setContractStep((prev) => (prev + 1) as any);
        } else {
          handleContractSubmit();
        }
      } else if (activeTab === 'grid') {
        handleGridSubmit();
      } else if (activeTab === 'file') {
        handleFileSubmit();
      }
    },
    onCancel: handleExit,
    onAddRow: activeTab === 'grid' ? addGridRow : undefined,
  });

  return (
    <DashboardLayout active="Monthly Trips" title="Bulk Add Monthly Trips" hideBackButton={false}>
      <div className="px-3 sm:px-6 pb-3 sm:pb-4 animate-fade-in max-w-[1400px] mx-auto w-full h-[calc(100dvh-105px)] flex flex-col min-h-0">
        <div className="w-full flex-1 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl flex flex-col min-h-0">
          {/* Header */}
          <div className="px-5 py-3 border-b border-black/[0.06] bg-slate-50/50 dark:bg-slate-950/40 shrink-0">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-brand/10 grid place-items-center shrink-0">
                  <Layers className="h-4.5 w-4.5 text-brand" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-bold text-[#111111] dark:text-slate-100">Bulk Add Monthly Trips</h1>
                    <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-[10px] font-semibold">
                      Monthly Planning
                    </Badge>
                  </div>
                  <p className="text-xs text-[#6E6E80] dark:text-slate-400 mt-0.5">
                    Generate committed contract trips across the month with per-day driver assignments, use quick grid entry, or import via CSV.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExit}
                  className="h-8 rounded-xl border border-slate-200 text-xs font-bold bg-white hover:bg-slate-50 text-slate-600 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Exit Page <KbdBadge keys="Esc" />
                </Button>
              </div>
            </div>
          </div>

          {/* Mode Switcher & Stepper Bar */}
          {!submissionResult && (
            <div className="border-b border-black/[0.06] bg-slate-50/50 dark:bg-slate-950/40 shrink-0 flex items-center justify-between px-5 py-2 flex-wrap gap-2">
              {/* Mode Switcher Tabs */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('contract')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'contract'
                      ? 'bg-white text-[#111111] shadow-xs border border-black/5 dark:bg-slate-800 dark:text-white dark:border-slate-700'
                      : 'text-[#6E6E80] hover:text-[#111111] dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <CalendarDays className="h-3.5 w-3.5 text-brand" />
                  Monthly Contract Batch
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('grid')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'grid'
                      ? 'bg-white text-[#111111] shadow-xs border border-black/5 dark:bg-slate-800 dark:text-white dark:border-slate-700'
                      : 'text-[#6E6E80] hover:text-[#111111] dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <Table2 className="h-3.5 w-3.5 text-blue-600" />
                  Quick Grid Entry
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('file')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    activeTab === 'file'
                      ? 'bg-white text-[#111111] shadow-xs border border-black/5 dark:bg-slate-800 dark:text-white dark:border-slate-700'
                      : 'text-[#6E6E80] hover:text-[#111111] dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  <UploadCloud className="h-3.5 w-3.5 text-emerald-600" />
                  CSV / Excel Import
                </button>
              </div>

              {/* Stepper Pills for Contract Batch */}
              {activeTab === 'contract' && (
                <div className="flex items-center gap-1.5">
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
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                          isActive
                            ? 'bg-brand text-white shadow-xs'
                            : isPassed
                            ? 'bg-orange-50 text-brand border border-orange-200 dark:bg-orange-950/40 dark:border-orange-800'
                            : 'bg-white text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-50'
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
              )}
            </div>
          )}

          {/* Main Workspace Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* SUCCESS / COMPLETION SCREEN */}
            {submissionResult && (
              <div className="max-w-xl mx-auto py-8 text-center space-y-5 animate-fade-in">
                <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-full grid place-items-center mx-auto text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-9 w-9" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Trips Successfully Added!
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Created {submissionResult.imported_count || submissionResult.created_count || 0} trip records for monthly execution.
                  </p>
                </div>

                {submissionResult.errors && submissionResult.errors.length > 0 && (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-left text-xs space-y-1">
                    <p className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      Some warnings occurred:
                    </p>
                    <ul className="list-disc list-inside text-amber-800 dark:text-amber-300 space-y-0.5">
                      {submissionResult.errors.map((e, idx) => (
                        <li key={idx}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex items-center justify-center gap-3 pt-3">
                  <Button
                    type="button"
                    onClick={handleExit}
                    className="h-10 px-5 rounded-xl bg-brand hover:bg-[#d13d0d] text-white font-bold text-xs"
                  >
                    View Monthly Schedule
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetAll}
                    className="h-10 px-5 rounded-xl font-bold text-xs border-slate-200 dark:border-slate-700"
                  >
                    Create More Trips
                  </Button>
                </div>
              </div>
            )}

            {/* MODE 1: MONTHLY CONTRACT BATCH GENERATOR */}
            {!submissionResult && activeTab === 'contract' && (
              <div className="space-y-6">
                {/* STEP 1: CUSTOMER SELECTION */}
                {contractStep === 1 && (
                  <div className="max-w-2xl mx-auto space-y-5 animate-fade-in py-4">
                    <div className="p-5 bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-brand" />
                          Select Customer / Company <span className="text-rose-500">*</span>
                        </label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setIsCreateCustomerOpen(true)}
                          className="h-7 text-xs text-brand font-bold hover:bg-orange-50 dark:hover:bg-orange-950/40"
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          + New Customer
                        </Button>
                      </div>

                      <Combobox
                        options={customerOptions}
                        value={contractCustomer}
                        onChange={(val) => setContractCustomer(val)}
                        placeholder="Search and select customer..."
                        searchPlaceholder="Type customer name, phone..."
                      />

                      {/* Month Picker */}
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                            Target Month
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="month"
                              value={selectedMonth}
                              onChange={(e) => setSelectedMonth(e.target.value)}
                              className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold w-full"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                            Active Rate Cards
                          </label>
                          <div className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/50 text-xs font-semibold flex items-center justify-between text-slate-600 dark:text-slate-300">
                            <span>{isRateCardsLoading ? 'Loading rate cards...' : `${customerRateCards.length} Cards Found`}</span>
                            {customerRateCards.length > 0 && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button
                        type="button"
                        disabled={!isStepValid(1)}
                        onClick={() => setContractStep(2)}
                        className="h-10 px-6 rounded-xl bg-brand hover:bg-[#d13d0d] text-white font-bold text-xs gap-1.5 shadow-md disabled:opacity-50"
                      >
                        Next: Define Route Slots
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 2: ROUTE SLOTS DEFINITION */}
                {contractStep === 2 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-brand" />
                          Define Recurring Route Slots ({routeSlots.length})
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Add the pickup/delivery lanes and pick which days of the week they operate.
                        </p>
                      </div>
                      <Button
                        type="button"
                        onClick={() =>
                          setRouteSlots((prev) => [
                            ...prev,
                            {
                              id: `slot-${Date.now()}`,
                              origin: '',
                              destination: '',
                              rateCategory: MODAL_RATE_CATEGORIES[0] || 'Trip',
                              vehicleType: VEHICLE_TYPES[0] || 'Flatbed',
                              billingType: BILLING_TYPES[0] || 'Per Trip',
                              billingAmount: '',
                              isCustomAmount: false,
                              pickupTime: '08:00',
                              deliveryTime: '17:00',
                              isOvernight: false,
                              selectedDays: [0, 1, 2, 3, 4],
                            },
                          ])
                        }
                        className="h-8 px-3 rounded-xl bg-orange-50 text-brand border border-orange-200 hover:bg-orange-100 text-xs font-bold dark:bg-orange-950/40 dark:border-orange-800"
                      >
                        <Plus className="w-3.5 h-3.5 mr-1" />
                        + Add Route Slot
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {routeSlots.map((slot, idx) => {
                        const matchedRc = getMatchingRateCard(
                          slot.origin,
                          slot.destination,
                          slot.vehicleType,
                          slot.rateCategory,
                          slot.billingType
                        );

                        return (
                          <div
                            key={slot.id}
                            className="p-4 bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-3 relative group"
                          >
                            <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800 pb-2">
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                <span className="h-5 w-5 rounded-full bg-brand text-white text-[10px] grid place-items-center">
                                  {idx + 1}
                                </span>
                                Slot #{idx + 1}
                              </span>

                              {routeSlots.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => setRouteSlots((prev) => prev.filter((s) => s.id !== slot.id))}
                                  className="text-slate-400 hover:text-rose-600 p-1"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                  Origin Location *
                                </label>
                                <LocationCombobox
                                  value={slot.origin}
                                  onChange={(val) => {
                                    setRouteSlots((prev) =>
                                      prev.map((s) => {
                                        if (s.id !== slot.id) return s;
                                        const rc = getMatchingRateCard(val, s.destination, s.vehicleType, s.rateCategory, s.billingType);
                                        return {
                                          ...s,
                                          origin: val,
                                          billingAmount: rc?.rate != null ? String(rc.rate) : s.billingAmount,
                                          assignedRateCardId: rc?.id,
                                        };
                                      })
                                    );
                                  }}
                                  placeholder="Select Origin..."
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                  Destination Location *
                                </label>
                                <LocationCombobox
                                  value={slot.destination}
                                  onChange={(val) => {
                                    setRouteSlots((prev) =>
                                      prev.map((s) => {
                                        if (s.id !== slot.id) return s;
                                        const rc = getMatchingRateCard(s.origin, val, s.vehicleType, s.rateCategory, s.billingType);
                                        return {
                                          ...s,
                                          destination: val,
                                          billingAmount: rc?.rate != null ? String(rc.rate) : s.billingAmount,
                                          assignedRateCardId: rc?.id,
                                        };
                                      })
                                    );
                                  }}
                                  placeholder="Select Destination..."
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                  Vehicle Type
                                </label>
                                <VehicleTypeSelect
                                  value={slot.vehicleType}
                                  onChange={(val) =>
                                    setRouteSlots((prev) =>
                                      prev.map((s) => (s.id === slot.id ? { ...s, vehicleType: val } : s))
                                    )
                                  }
                                />
                              </div>

                              <div>
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                                  Billing Amount (SAR)
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    value={slot.billingAmount}
                                    onChange={(e) =>
                                      setRouteSlots((prev) =>
                                        prev.map((s) =>
                                          s.id === slot.id
                                            ? { ...s, billingAmount: e.target.value, isCustomAmount: true }
                                            : s
                                        )
                                      )
                                    }
                                    placeholder="Rate"
                                    className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold w-full"
                                  />
                                  {matchedRc && (
                                    <span className="absolute right-2 top-2 text-[10px] font-semibold text-emerald-600">
                                      Rate Card
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Days Selector */}
                            <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800">
                              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                                Days Operating
                              </label>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {[
                                  { day: 0, label: 'Sun' },
                                  { day: 1, label: 'Mon' },
                                  { day: 2, label: 'Tue' },
                                  { day: 3, label: 'Wed' },
                                  { day: 4, label: 'Thu' },
                                  { day: 5, label: 'Fri' },
                                  { day: 6, label: 'Sat' },
                                ].map((d) => {
                                  const isSelected = slot.selectedDays.includes(d.day);
                                  return (
                                    <button
                                      key={d.day}
                                      type="button"
                                      onClick={() => {
                                        setRouteSlots((prev) =>
                                          prev.map((s) => {
                                            if (s.id !== slot.id) return s;
                                            const newDays = isSelected
                                              ? s.selectedDays.filter((x) => x !== d.day)
                                              : [...s.selectedDays, d.day];
                                            return { ...s, selectedDays: newDays };
                                          })
                                        );
                                      }}
                                      className={`h-7 px-3 rounded-lg text-xs font-bold transition-all ${
                                        isSelected
                                          ? 'bg-brand text-white shadow-xs'
                                          : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                                      }`}
                                    >
                                      {d.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setContractStep(1)}
                        className="h-10 px-5 rounded-xl font-bold text-xs"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Back to Customer
                      </Button>

                      <Button
                        type="button"
                        disabled={!isStepValid(2)}
                        onClick={() => setContractStep(3)}
                        className="h-10 px-6 rounded-xl bg-brand hover:bg-[#d13d0d] text-white font-bold text-xs gap-1.5 shadow-md disabled:opacity-50"
                      >
                        Next: Driver & Fleet Assignment
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 3: ASSIGNMENT & BILLING */}
                {contractStep === 3 && (
                  <div className="max-w-3xl mx-auto space-y-5 animate-fade-in py-2">
                    <div className="p-5 bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Assignment Model
                        </label>
                        <div className="flex items-center gap-1 bg-white dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
                          <button
                            type="button"
                            onClick={() => setAssignmentType('own')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              assignmentType === 'own'
                                ? 'bg-brand text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                            }`}
                          >
                            Internal Fleet & Drivers
                          </button>
                          <button
                            type="button"
                            onClick={() => setAssignmentType('third_party')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              assignmentType === 'third_party'
                                ? 'bg-brand text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                            }`}
                          >
                            3rd Party Logistics Partner
                          </button>
                        </div>
                      </div>

                      {assignmentType === 'own' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                Default Driver
                              </label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsCreateDriverOpen(true)}
                                className="h-6 text-[11px] text-brand font-bold p-0"
                              >
                                + New Driver
                              </Button>
                            </div>
                            <Combobox
                              options={driverOptions}
                              value={masterDriver}
                              onChange={handleMasterDriverChange}
                              placeholder="Select default driver..."
                            />
                          </div>

                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                Default Vehicle
                              </label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsCreateVehicleOpen(true)}
                                className="h-6 text-[11px] text-brand font-bold p-0"
                              >
                                + New Vehicle
                              </Button>
                            </div>
                            <Combobox
                              options={vehicleOptions}
                              value={masterVehicle}
                              onChange={handleMasterVehicleChange}
                              placeholder="Select default vehicle..."
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          <div>
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                              3rd Party Subcontractor
                            </label>
                            <Combobox
                              options={thirdPartyOptions}
                              value={thirdPartyProviderId}
                              onChange={(val) => setThirdPartyProviderId(val)}
                              placeholder="Select 3rd Party Provider..."
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                              External Driver Name
                            </label>
                            <input
                              type="text"
                              value={thirdPartyDriverName}
                              onChange={(e) => setThirdPartyDriverName(e.target.value)}
                              placeholder="Driver full name"
                              className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold w-full"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                              External Vehicle Plate
                            </label>
                            <input
                              type="text"
                              value={thirdPartyVehiclePlate}
                              onChange={(e) => setThirdPartyVehiclePlate(e.target.value)}
                              placeholder="e.g. KSA 9876"
                              className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold w-full"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                              Subcontractor Cost per Trip (SAR)
                            </label>
                            <input
                              type="number"
                              value={thirdPartyCost}
                              onChange={(e) => setThirdPartyCost(e.target.value)}
                              placeholder="Cost amount"
                              className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold w-full"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setContractStep(2)}
                        className="h-10 px-5 rounded-xl font-bold text-xs"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Back to Route Slots
                      </Button>

                      <Button
                        type="button"
                        onClick={() => setContractStep(4)}
                        className="h-10 px-6 rounded-xl bg-brand hover:bg-[#d13d0d] text-white font-bold text-xs gap-1.5 shadow-md"
                      >
                        Review Batch ({batchTripRows.length} Trips)
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 4: REVIEW & SUBMIT */}
                {contractStep === 4 && (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800">
                      <div className="space-y-0.5">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
                          Ready to Generate {batchTripRows.length} Monthly Trips
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Total Billed Amount: <span className="font-bold text-slate-900 dark:text-slate-100">SAR {totalContractAmount.toLocaleString()}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setContractStep(3)}
                          className="h-9 px-4 rounded-xl font-bold text-xs"
                        >
                          <ChevronLeft className="w-4 h-4 mr-1" />
                          Adjust Assignments
                        </Button>

                        <Button
                          type="button"
                          disabled={bulkMutation.isPending || batchTripRows.length === 0}
                          onClick={handleContractSubmit}
                          className="h-9 px-6 rounded-xl bg-brand hover:bg-[#d13d0d] text-white font-bold text-xs shadow-md gap-1.5"
                        >
                          {bulkMutation.isPending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                              Generating Trips...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" />
                              Confirm & Generate {batchTripRows.length} Trips <KbdBadge keys="Ctrl+S" />
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Preview Table */}
                    <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                      <div className="max-h-[50vh] overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold sticky top-0 z-10">
                            <tr>
                              <th className="py-2.5 px-3">#</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Origin Lane</th>
                              <th className="py-2.5 px-3">Destination</th>
                              <th className="py-2.5 px-3">Category</th>
                              <th className="py-2.5 px-3">Driver</th>
                              <th className="py-2.5 px-3">Vehicle</th>
                              <th className="py-2.5 px-3 text-right">Amount (SAR)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {batchTripRows.map((r, i) => {
                              const drv = drivers.find((d) => d.id === r.driver_id);
                              const veh = vehicles.find((v) => v.id === r.vehicle_id);

                              return (
                                <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                                  <td className="py-2 px-3 text-slate-400 text-[11px]">{i + 1}</td>
                                  <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">{r.date}</td>
                                  <td className="py-2 px-3 font-medium">{r.origin}</td>
                                  <td className="py-2 px-3 font-medium">{r.destination}</td>
                                  <td className="py-2 px-3 text-slate-500">{r.rate_category}</td>
                                  <td className="py-2 px-3">
                                    {drv ? `${drv.first_name} ${drv.last_name}` : r.third_party_driver_name || <span className="text-amber-600 font-medium">Unassigned</span>}
                                  </td>
                                  <td className="py-2 px-3">
                                    {veh ? veh.plate_number : r.third_party_vehicle_plate || <span className="text-slate-400">-</span>}
                                  </td>
                                  <td className="py-2 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                                    {r.billing_amount ? `SAR ${r.billing_amount}` : '-'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MODE 2: QUICK GRID ENTRY */}
            {!submissionResult && activeTab === 'grid' && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Table2 className="w-4 h-4 text-blue-600" />
                      Quick Grid Matrix Entry ({gridRows.length} Rows)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Enter multiple trips directly in a spreadsheet-like ledger. Use <KbdBadge keys="Alt+N" /> to add row.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      onClick={addGridRow}
                      className="h-8 px-3 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 text-xs font-bold dark:bg-blue-950/40 dark:border-blue-800"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      + Add Row <KbdBadge keys="Alt+N" />
                    </Button>

                    <Button
                      type="button"
                      disabled={bulkMutation.isPending || gridRows.length === 0}
                      onClick={handleGridSubmit}
                      className="h-8 px-5 rounded-xl bg-brand hover:bg-[#d13d0d] text-white font-bold text-xs shadow-md"
                    >
                      {bulkMutation.isPending ? 'Saving...' : 'Submit Grid Trips'}
                    </Button>
                  </div>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs">
                  <div className="overflow-x-auto max-h-[60vh]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold sticky top-0 z-10">
                        <tr>
                          <th className="py-2.5 px-2 w-8">#</th>
                          <th className="py-2.5 px-2 min-w-[160px]">Customer *</th>
                          <th className="py-2.5 px-2 min-w-[120px]">Date *</th>
                          <th className="py-2.5 px-2 min-w-[140px]">Origin *</th>
                          <th className="py-2.5 px-2 min-w-[140px]">Destination *</th>
                          <th className="py-2.5 px-2 min-w-[150px]">Driver</th>
                          <th className="py-2.5 px-2 min-w-[130px]">Vehicle</th>
                          <th className="py-2.5 px-2 min-w-[100px]">Amount</th>
                          <th className="py-2.5 px-2 w-10 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {gridRows.map((r, idx) => (
                          <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <td className="py-2 px-2 text-slate-400 text-[10px]">{idx + 1}</td>
                            <td className="py-2 px-2">
                              <Select
                                value={r.customerId}
                                onValueChange={(val) => updateGridRow(r.id, 'customerId', val)}
                              >
                                <SelectTrigger className="h-8 text-xs font-semibold">
                                  <SelectValue placeholder="Select Customer" />
                                </SelectTrigger>
                                <SelectContent>
                                  {customers.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      {c.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="date"
                                value={r.date}
                                onChange={(e) => updateGridRow(r.id, 'date', e.target.value)}
                                className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs w-full font-medium"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <LocationCombobox
                                value={r.origin}
                                onChange={(val) => updateGridRow(r.id, 'origin', val)}
                                placeholder="Origin"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <LocationCombobox
                                value={r.destination}
                                onChange={(val) => updateGridRow(r.id, 'destination', val)}
                                placeholder="Destination"
                              />
                            </td>
                            <td className="py-2 px-2">
                              <Select
                                value={r.driverId}
                                onValueChange={(val) => updateGridRow(r.id, 'driverId', val)}
                              >
                                <SelectTrigger className="h-8 text-xs font-medium">
                                  <SelectValue placeholder="Assign Driver" />
                                </SelectTrigger>
                                <SelectContent>
                                  {drivers.map((d) => (
                                    <SelectItem key={d.id} value={d.id}>
                                      {d.first_name} {d.last_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="py-2 px-2">
                              <Select
                                value={r.vehicleId}
                                onValueChange={(val) => updateGridRow(r.id, 'vehicleId', val)}
                              >
                                <SelectTrigger className="h-8 text-xs font-medium">
                                  <SelectValue placeholder="Assign Vehicle" />
                                </SelectTrigger>
                                <SelectContent>
                                  {vehicles.map((v) => (
                                    <SelectItem key={v.id} value={v.id}>
                                      {v.plate_number}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                value={r.amount}
                                onChange={(e) => updateGridRow(r.id, 'amount', e.target.value)}
                                placeholder="Amount"
                                className="h-8 px-2 rounded-lg border border-slate-200 dark:border-slate-700 text-xs w-full font-bold"
                              />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => removeGridRow(r.id)}
                                className="text-slate-400 hover:text-rose-600 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* MODE 3: CSV / EXCEL FILE IMPORT */}
            {!submissionResult && activeTab === 'file' && (
              <div className="max-w-2xl mx-auto space-y-5 animate-fade-in py-4">
                <div className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-950/40 text-center space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 grid place-items-center mx-auto">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Upload CSV or Excel Spreadsheet
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Drag and drop your file here, or click to browse.
                    </p>
                  </div>

                  <input
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                    className="hidden"
                    id="file-upload-input"
                  />

                  <div className="flex items-center justify-center gap-3 pt-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('file-upload-input')?.click()}
                      className="h-9 px-4 rounded-xl text-xs font-bold"
                    >
                      Browse Files
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleDownloadTemplate}
                      className="h-9 px-4 rounded-xl text-xs font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    >
                      <Download className="w-4 h-4 mr-1.5" />
                      Download Standard CSV Template
                    </Button>
                  </div>
                </div>

                {parseError && (
                  <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{parseError}</span>
                  </div>
                )}

                {parsedRows.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Parsed {parsedRows.length} Trips from File
                      </span>
                      <Button
                        type="button"
                        disabled={bulkMutation.isPending}
                        onClick={handleFileSubmit}
                        className="h-9 px-5 rounded-xl bg-brand hover:bg-[#d13d0d] text-white font-bold text-xs shadow-md"
                      >
                        {bulkMutation.isPending ? 'Importing...' : `Import ${parsedRows.length} Trips`}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub-modals for inline creation & edit */}
      <CreateCustomerModal
        isOpen={isCreateCustomerOpen}
        onClose={() => setIsCreateCustomerOpen(false)}
        onSuccess={() => {
          setIsCreateCustomerOpen(false);
          queryClient.invalidateQueries({ queryKey: ['customers-select'] });
        }}
      />

      <CreateDriverModal
        isOpen={isCreateDriverOpen}
        onClose={() => setIsCreateDriverOpen(false)}
        onSuccess={() => {
          setIsCreateDriverOpen(false);
          queryClient.invalidateQueries({ queryKey: ['drivers-select'] });
        }}
      />

      <CreateVehicleModal
        isOpen={isCreateVehicleOpen}
        onClose={() => setIsCreateVehicleOpen(false)}
        onSuccess={() => {
          setIsCreateVehicleOpen(false);
          queryClient.invalidateQueries({ queryKey: ['vehicles-select'] });
        }}
      />

      <ConfirmModal
        isOpen={isUnassignedAlertOpen}
        onClose={() => setIsUnassignedAlertOpen(false)}
        onConfirm={() => {
          setIsUnassignedAlertOpen(false);
          setBypassDriverValidation(true);
          handleContractSubmit();
        }}
        title="Unassigned Drivers"
        message="Some trips in this batch do not have a driver assigned. Are you sure you want to proceed? You can assign drivers later."
        confirmLabel="Proceed"
        cancelLabel="Cancel"
      />
    </DashboardLayout>
  );
}
