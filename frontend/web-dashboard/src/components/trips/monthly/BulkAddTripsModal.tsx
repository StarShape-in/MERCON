import { useState, useMemo, useRef, useEffect } from 'react';
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

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
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
import { customerService } from '@/services/customerService';
import { driverService, Driver } from '@/services/driverService';
import { vehicleService, Vehicle } from '@/services/vehicleService';
import { rateCardService, RateCard } from '@/services/rateCardService';
import { tripService, BulkImportTripRow, BulkImportResult } from '@/services/tripService';
import { VEHICLE_TYPES, RATE_CATEGORIES, BILLING_TYPES } from '@mercon/shared-types';
import { monthLabel, shiftMonth } from './monthlyBoardUtils';
import { parseSheet, TRIP_COLUMNS } from '@/utils/importUtils';

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

interface BulkAddTripsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMonth?: string;
  onSuccess?: () => void;
}

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

export default function BulkAddTripsModal({
  isOpen,
  onClose,
  defaultMonth,
  onSuccess,
}: BulkAddTripsModalProps) {
  const queryClient = useQueryClient();

  // Active Tab
  const [activeTab, setActiveTab] = useState<TabMode>('contract');

  // Month navigation for contract generator
  const currentMonthKey = defaultMonth || new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);

  // Sync defaultMonth when modal opens
  useEffect(() => {
    if (defaultMonth) {
      setSelectedMonth(defaultMonth);
    }
  }, [defaultMonth, isOpen]);

  // Master Data Queries
  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 150 }),
    enabled: isOpen,
  });

  const { data: driversRes } = useQuery({
    queryKey: ['drivers-select'],
    queryFn: () => driverService.getAll({ per_page: 200, mode: 'lookup' }),
    enabled: isOpen,
  });

  const { data: vehiclesRes } = useQuery({
    queryKey: ['vehicles-select'],
    queryFn: () => vehicleService.getAll({ per_page: 200, mode: 'lookup' }),
    enabled: isOpen,
  });

  const customers = customersRes?.data ?? [];
  const drivers: Driver[] = driversRes?.data ?? [];
  const vehicles: Vehicle[] = vehiclesRes?.data ?? [];

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

  // ── Customer Rate Cards Query (Live Rate Card Auto-Lookup) ────────────────
  const { data: rateCardsRes, isLoading: isRateCardsLoading } = useQuery({
    queryKey: ['rate-cards-customer-lookup', contractCustomer],
    queryFn: () => rateCardService.getAll({ customerId: contractCustomer, per_page: 'all', active_only: true }),
    enabled: isOpen && Boolean(contractCustomer),
  });

  const customerRateCards = rateCardsRes?.data ?? [];

  /**
   * 3 R's of Coding (Readable, Robust, Reusable):
   * Efficiently finds the best matching rate card for a given route lane (origin -> destination),
   * vehicle type, rate category, and billing type.
   */
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

    // 1. Exact match (Lane + Vehicle Type + Category + Billing)
    const exact = customerRateCards.find((rc) => {
      const rcO = norm(rc.route_origin || rc.originLocation?.name);
      const rcD = norm(rc.route_destination || rc.destinationLocation?.name);
      const laneMatch = (rcO.includes(oNorm) || oNorm.includes(rcO)) && (rcD.includes(dNorm) || dNorm.includes(rcD));
      if (!laneMatch) return false;

      const rcV = norm(rc.vehicle_type);
      const rcC = norm(rc.rate_category);
      const rcB = norm(rc.billing_type);

      const vMatch = !vNorm || !rcV || rcV === vNorm || rcV.includes(vNorm) || vNorm.includes(rcV);
      const cMatch = !cNorm || !rcC || rcC === cNorm || rcC.includes(cNorm) || cNorm.includes(rcC);
      const bMatch = !bNorm || !rcB || rcB === bNorm;

      return vMatch && cMatch && bMatch;
    });
    if (exact) return exact;

    // 2. Match Lane + Vehicle Type
    if (vNorm) {
      const laneAndVeh = customerRateCards.find((rc) => {
        const rcO = norm(rc.route_origin || rc.originLocation?.name);
        const rcD = norm(rc.route_destination || rc.destinationLocation?.name);
        const laneMatch = (rcO.includes(oNorm) || oNorm.includes(rcO)) && (rcD.includes(dNorm) || dNorm.includes(rcD));
        if (!laneMatch) return false;

        const rcV = norm(rc.vehicle_type);
        return rcV === vNorm || rcV.includes(vNorm) || vNorm.includes(rcV);
      });
      if (laneAndVeh) return laneAndVeh;
    }

    // 3. Fallback: Match Lane Only
    const laneOnly = customerRateCards.find((rc) => {
      const rcO = norm(rc.route_origin || rc.originLocation?.name);
      const rcD = norm(rc.route_destination || rc.destinationLocation?.name);
      return (rcO.includes(oNorm) || oNorm.includes(rcO)) && (rcD.includes(dNorm) || dNorm.includes(rcD));
    });

    return laneOnly || null;
  };

  const [contractSlots, setContractSlots] = useState<Array<{
    id: string;
    origin: string;
    destination: string;
    pickupTime: string;
    dropoffTime: string;
    billingAmount: string;
    driverTripCharge: string;
    isOvernight?: boolean;
    intermediateLocations: string[];
    intermediateStopFees?: string[];
    // Return Leg fields for Round Trip
    returnOrigin?: string;
    returnDestination?: string;
    returnPickupTime?: string;
    returnDropoffTime?: string;
    returnIsOvernight?: boolean;
    returnIntermediateLocations?: string[];
    returnIntermediateStopFees?: string[];
  }>>([
    {
      id: 'slot-1',
      origin: '',
      destination: '',
      pickupTime: '08:00',
      dropoffTime: '14:00',
      billingAmount: '',
      driverTripCharge: '',
      isOvernight: false,
      intermediateLocations: [],
      intermediateStopFees: [],
      returnOrigin: '',
      returnDestination: '',
      returnPickupTime: '16:00',
      returnDropoffTime: '22:00',
      returnIsOvernight: false,
      returnIntermediateLocations: [],
      returnIntermediateStopFees: [],
    },
  ]);

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
        billingAmount: prev[0]?.billingAmount || '',
        driverTripCharge: prev[0]?.driverTripCharge || '',
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
      prev.map((s) => {
        if (s.id !== id) return s;
        const nextSlot = { ...s, ...updates };

        // Auto-lookup rate from rate card when origin or destination changes
        if (('origin' in updates || 'destination' in updates) && !('billingAmount' in updates) && !('driverTripCharge' in updates)) {
          const match = getMatchingRateCard(
            nextSlot.origin,
            nextSlot.destination,
            contractVehicleType,
            contractRateCategory,
            contractBillingType
          );
          nextSlot.billingAmount = match && match.base_price ? String(match.base_price) : '';
          nextSlot.driverTripCharge = match && match.default_trip_charge ? String(match.default_trip_charge) : '';
        }

        return nextSlot;
      })
    );
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
    const [masterDriver, setMasterDriver] = useState('');
  const [masterVehicle, setMasterVehicle] = useState('');

    const handleMasterDriverChange = (driverId: string) => {
    setMasterDriver(driverId);
    if (!driverId || driverId === 'unassigned') return;

    const selectedDriver = drivers.find((d) => d.id === driverId);
    if (!selectedDriver) return;

    const embeddedVehicle = selectedDriver.assignedVehicle && typeof selectedDriver.assignedVehicle === 'object'
      ? selectedDriver.assignedVehicle as any
      : null;

    const vehicleId =
      selectedDriver.assignedVehicleId ||
      embeddedVehicle?.id ||
      (selectedDriver as any).assigned_vehicle_id;

    if (!vehicleId) return;

    setMasterVehicle(vehicleId);

    const vehicleData = embeddedVehicle || vehicles.find((v) => v.id === vehicleId);
    if (vehicleData) {
      const capacity = vehicleData.capacity_kg ?? (vehicleData as any).capacityKg ?? 24000;
      const type = getVehicleTypeFromCapacity(capacity);
      setContractVehicleType(type);
      setContractSlots((prev) =>
        prev.map((s) => {
          const match = getMatchingRateCard(s.origin, s.destination, type, contractRateCategory, contractBillingType);
          return {
            ...s,
            ...(match && match.base_price ? { billingAmount: String(match.base_price) } : {}),
            ...(match && match.default_trip_charge ? { driverTripCharge: String(match.default_trip_charge) } : {}),
          };
        })
      );
    }
  };

  const handleMasterVehicleChange = (vehicleId: string) => {
    setMasterVehicle(vehicleId);
    if (vehicleId && vehicleId !== 'unassigned') {
      const selectedVehicle = vehicles.find((v) => v.id === vehicleId);
      if (selectedVehicle) {
        const type = getVehicleTypeFromCapacity(selectedVehicle.capacity_kg);
        setContractVehicleType(type);
        setContractSlots((prev) =>
          prev.map((s) => {
            const match = getMatchingRateCard(s.origin, s.destination, type, contractRateCategory, contractBillingType);
            return {
              ...s,
              ...(match && match.base_price ? { billingAmount: String(match.base_price) } : {}),
              ...(match && match.default_trip_charge ? { driverTripCharge: String(match.default_trip_charge) } : {}),
            };
          })
        );
      }
    }
  };
    interface LoopTeam {
    id: string;
    name: string;
    driverId: string;
    vehicleId: string;
  }

  const [loopTeams, setLoopTeams] = useState<LoopTeam[]>([
    { id: 'A', name: 'Team A', driverId: '', vehicleId: '' },
    { id: 'B', name: 'Team B', driverId: '', vehicleId: '' },
  ]);

  const handleAddLoopTeam = () => {
    setLoopTeams((prev) => {
      const letter = String.fromCharCode(65 + prev.length);
      return [
        ...prev,
        { id: letter, name: `Team ${letter}`, driverId: '', vehicleId: '' }
      ];
    });
  };

  const handleRemoveLoopTeam = (id: string) => {
    setLoopTeams((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((t) => t.id !== id);
      return next.map((t, idx) => {
        const letter = String.fromCharCode(65 + idx);
        return {
          ...t,
          id: letter,
          name: `Team ${letter}`
        };
      });
    });
  };

  const handleUpdateLoopTeam = (id: string, updates: Partial<LoopTeam>) => {
    setLoopTeams((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const nextTeam = { ...t, ...updates };

        if ('driverId' in updates && updates.driverId && updates.driverId !== 'unassigned') {
          const selectedDrv = drivers.find((d) => d.id === updates.driverId);
          if (selectedDrv) {
            const embeddedVehicle = selectedDrv.assignedVehicle && typeof selectedDrv.assignedVehicle === 'object'
              ? selectedDrv.assignedVehicle as any
              : null;
            const vehId = selectedDrv.assignedVehicleId || embeddedVehicle?.id || (selectedDrv as any).assigned_vehicle_id || '';
            if (vehId) {
              nextTeam.vehicleId = vehId;
            }
          }
        }

        return nextTeam;
      })
    );
  };



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

    selectedDates.forEach((dateStr) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      const formattedDate = dateObj.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      contractSlots.forEach((slot, slotIdx) => {
        const key = contractSlots.length > 1 ? `${dateStr}::${slot.id}` : dateStr;
        const slotLabel = contractSlots.length > 1 ? `Slot #${slotIdx + 1}` : '';
        list.push({
          key,
          dateStr,
          formattedDate,
          slotLabel,
          pickupTime: slot.pickupTime,
          isOvernight: slot.isOvernight,
        });
      });
    });

    return list;
  }, [selectedDates, contractSlots]);

  // Auto-populate contract rate and driver charge when entering Assignments step (Step 4)
  useEffect(() => {
    if (contractStep === 4 && customerRateCards.length > 0) {
      setContractSlots((prev) => {
        let changed = false;
        const updated = prev.map((s) => {
          if (!s.origin || !s.destination) return s;
          if (s.billingAmount && s.driverTripCharge) return s;

          const match = getMatchingRateCard(
            s.origin,
            s.destination,
            contractVehicleType,
            contractRateCategory,
            contractBillingType
          );

          if (match) {
            const nextBilling = s.billingAmount || (match.base_price ? String(match.base_price) : '');
            const nextDriverCharge = s.driverTripCharge || (match.default_trip_charge ? String(match.default_trip_charge) : '');

            if (nextBilling !== s.billingAmount || nextDriverCharge !== s.driverTripCharge) {
              changed = true;
              return {
                ...s,
                billingAmount: nextBilling,
                driverTripCharge: nextDriverCharge,
              };
            }
          }
          return s;
        });

        return changed ? updated : prev;
      });
    }
  }, [contractStep, customerRateCards, contractVehicleType, contractRateCategory, contractBillingType]);

  // Stepper validation helpers
  const isStep1Valid = Boolean(contractCustomer);
  const isStep2Valid = contractSlots.every((s) => s.origin && s.destination);
  const isStep3Valid = selectedDates.length > 0;
  const isStep4Valid = useMemo(() => {
    if (bypassDriverValidation) return true;
    if (batchTripRows.length === 0) return false;
    return batchTripRows.every((row) => {
      const assignment = dayAssignments[row.key];
      return assignment && assignment.driverId && assignment.driverId !== '';
    });
  }, [batchTripRows, dayAssignments, bypassDriverValidation]);

  const isStepUnlocked = (step: number): boolean => {
    if (step <= 1) return true;
    if (step === 2) return isStep1Valid;
    if (step === 3) return isStep1Valid && isStep2Valid;
    if (step === 4) return isStep1Valid && isStep2Valid && isStep3Valid;
    if (step === 5) return isStep1Valid && isStep2Valid && isStep3Valid && isStep4Valid;
    return false;
  };

  const applyMasterToAll = () => {
    setBypassDriverValidation(false);
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
    setBypassDriverValidation(false);
    const newAssignments: Record<string, { driverId: string; vehicleId: string }> = {};

    batchTripRows.forEach((row, index) => {
      const teamIndex = index % loopTeams.length;
      const team = loopTeams[teamIndex];
      const drv = team.driverId;
      const veh = team.vehicleId;

      newAssignments[row.key] = {
        driverId: drv === 'unassigned' || !drv ? '' : drv,
        vehicleId: veh === 'unassigned' || !veh ? '' : veh,
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
    billingType: '',
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
    setGridRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const nextRow = { ...row, ...updates };

        // Auto-lookup rate from rate cards when route or vehicle type changes
        if (('origin' in updates || 'destination' in updates || 'vehicleType' in updates || 'rateCategory' in updates) && !('amount' in updates)) {
          const match = getMatchingRateCard(
            nextRow.origin,
            nextRow.destination,
            nextRow.vehicleType,
            nextRow.rateCategory,
            nextRow.billingType
          );
          if (match && match.base_price) {
            nextRow.amount = String(match.base_price);
          }
        }

        return nextRow;
      })
    );
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
            else if (h.includes('amount') || h.includes('price')) rowObj.billing_amount = Number(val) || undefined;
            else if (h.includes('trip charge') || h.includes('payout')) rowObj.trip_charges = Number(val) || undefined;
            else if (h.includes('billing')) rowObj.billing_type = val;
            else if (h.includes('type')) rowObj.vehicle_type = val;
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
          billing_type: r.billing_type ? String(r.billing_type) : undefined,
          origin: r.origin ? String(r.origin) : undefined,
          destination: r.destination ? String(r.destination) : undefined,
          billing_amount: r.billing_amount ? Number(r.billing_amount) : undefined,
          trip_charges: r.trip_charges ? Number(r.trip_charges) : undefined,
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

  const bulkMutation = useMutation({
    mutationFn: (rows: BulkImportTripRow[]) => tripService.bulkImport(rows),
    onSuccess: (data) => {
      setSubmissionResult(data);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      if (onSuccess) onSuccess();
    },
  });

  const handleContractSubmit = () => {
    if (!contractCustomer || selectedDates.length === 0) return;

    const rows: BulkImportTripRow[] = [];

    selectedDates.forEach((date) => {
      contractSlots.forEach((slot) => {
        const slotKey = contractSlots.length > 1 ? `${date}::${slot.id}` : date;
        const assignment = dayAssignments[slotKey] || dayAssignments[date] || { driverId: '', vehicleId: '' };

        const outboundStops = slot.intermediateLocations.map((s) => s.trim()).filter(Boolean);
        const returnStops = (slot.returnIntermediateLocations || []).map((s) => s.trim()).filter(Boolean);

        const outboundFeesSum = (slot.intermediateStopFees || []).reduce((sum, f) => sum + (Number(f) || 0), 0);
        const returnFeesSum = (slot.returnIntermediateStopFees || []).reduce((sum, f) => sum + (Number(f) || 0), 0);
        const baseAmount = Number(slot.billingAmount) || 0;
        const totalAmount = baseAmount + outboundFeesSum + returnFeesSum;

        let destString = slot.destination.trim();

        if (isRoundTripCategory(contractRateCategory)) {
          // Closed 4-section loop: Outbound Pickup -> Outbound Stops -> Outbound Dropoff -> Return Pickup -> Return Stops -> Return Dropoff
          const returnStart = slot.returnOrigin?.trim() || slot.destination.trim();
          const returnEnd = slot.returnDestination?.trim() || slot.origin.trim();

          const outboundChain = outboundStops.length > 0 ? `${outboundStops.join(' → ')} → ` : '';
          const returnChain = returnStops.length > 0 ? `${returnStops.join(' → ')} → ` : '';

          destString = `${outboundChain}${slot.destination.trim()} [RETURN: ${returnStart} → ${returnChain}${returnEnd}]`;
        } else if (outboundStops.length > 0) {
          destString = `${outboundStops.join(' → ')} → ${slot.destination.trim()}`;
        }

        rows.push({
          customer_id: contractCustomer,
          planned_start: slot.pickupTime ? `${date}T${slot.pickupTime}:00` : date,
          driver_id: assignment.driverId || undefined,
          vehicle_id: assignment.vehicleId || undefined,
          rate_category: contractRateCategory || undefined,
          vehicle_type: contractVehicleType || undefined,
          billing_type: contractBillingType || undefined,
          origin: slot.origin.trim() || undefined,
          destination: destString || undefined,
          billing_amount: totalAmount > 0 ? totalAmount : undefined,
          trip_charges: slot.driverTripCharge ? Number(slot.driverTripCharge) : undefined,
          status: 'Draft',
        });
      });
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
      billing_type: r.billingType || undefined,
      origin: r.origin.trim() || undefined,
      destination: r.destination.trim() || undefined,
      billing_amount: r.amount ? Number(r.amount) : undefined,
      status: 'Draft',
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
    setHasAttemptedStep4(false);
    setBypassDriverValidation(false);
    setIsUnassignedAlertOpen(false);
  };

  const handleDialogClose = () => {
    resetAll();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDialogClose()}>
      <DialogContent className="w-[96vw] max-w-[1400px] sm:max-w-[1400px] p-0 overflow-hidden bg-white border border-black/10 shadow-2xl rounded-2xl max-h-[94vh] h-[94vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-3 border-b border-black/[0.06] bg-slate-50/50 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-brand/10 grid place-items-center shrink-0">
                <Layers className="h-4.5 w-4.5 text-brand" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-base font-bold text-[#111111]">Bulk Add Trips</DialogTitle>
                  <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-semibold">
                    Monthly Planning
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-[#6E6E80] mt-0.5">
                  Generate committed contract trips across the month with per-day driver assignments, use quick grid entry, or import via CSV.
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        {/* Combined Sleek Navigation & Stepper Bar */}
        {!submissionResult && (
          <div className="border-b border-black/[0.06] bg-slate-50/50 shrink-0 flex items-center justify-between px-5 py-1.5 flex-wrap gap-2">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveTab('contract')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'contract'
                    ? 'bg-white text-[#111111] shadow-xs border border-black/5'
                    : 'text-[#6E6E80] hover:text-[#111111]'
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5 text-brand" />
                Monthly Contract Batch
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('grid')}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'grid'
                    ? 'bg-white text-[#111111] shadow-xs border border-black/5'
                    : 'text-[#6E6E80] hover:text-[#111111]'
                }`}
              >
                <Table2 className="h-3.5 w-3.5 text-blue-600" />
                Quick Grid Entry
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('file')}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'file'
                    ? 'bg-white text-[#111111] shadow-xs border border-black/5'
                    : 'text-[#6E6E80] hover:text-[#111111]'
                }`}
              >
                <UploadCloud className="h-3.5 w-3.5 text-emerald-600" />
                CSV / Excel Import
              </button>
            </div>

            {/* Stepper Pills for Contract Batch */}
            {activeTab === 'contract' && (
              <div className="flex items-center gap-1 overflow-x-auto">
                {[
                  { step: 1, label: '1. Customer', icon: User },
                  { step: 2, label: '2. Route Slots', icon: MapPin },
                  { step: 3, label: '3. Schedule', icon: Calendar },
                  { step: 4, label: '4. Assignments', icon: Truck },
                  { step: 5, label: '5. Review', icon: Sparkles },
                ].map((s) => {
                  const IconComp = s.icon;
                  const isActive = contractStep === s.step;
                  const isPassed = contractStep > s.step;

                                    const unlocked = isStepUnlocked(s.step);
                  return (
                    <button
                      key={s.step}
                      type="button"
                      disabled={!unlocked}
                      onClick={() => setContractStep(s.step as any)}
                      className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-brand text-white shadow-xs ring-1 ring-brand/20'
                          : !unlocked
                          ? 'bg-slate-50 text-slate-350 border border-slate-200/30 cursor-not-allowed opacity-50'
                          : isPassed
                          ? 'bg-orange-50 text-brand border border-orange-200 hover:bg-orange-100 cursor-pointer'
                          : 'bg-white text-slate-400 border border-slate-200/80 hover:bg-slate-50 hover:text-slate-600 cursor-pointer'
                      }`}
                    >
                      <IconComp className={`w-3 h-3 ${isActive ? 'text-white' : isPassed ? 'text-brand' : 'text-slate-400'}`} />
                      <span>{s.label}</span>
                      {isPassed && <CheckCircle2 className="w-3 h-3 text-brand ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

                {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 min-h-0 bg-white">
          {/* Submission Result Screen */}
          {submissionResult ? (
            <div className="flex flex-col items-center justify-center py-6 text-center animate-fade-in">
              <div className="h-14 w-14 rounded-2xl bg-emerald-50 text-emerald-600 grid place-items-center mb-4 border border-emerald-200/60 shadow-sm">
                <CheckCircle2 className="h-7 w-7" />
              </div>
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
                <div className="space-y-4">
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
                                  <span className="w-8 h-8 rounded-lg bg-orange-100/80 text-[#E8450F] font-extrabold text-xs grid place-items-center shrink-0 border border-orange-200/80">
                                    {initials}
                                  </span>
                                  <div>
                                    <h5 className="text-xs font-bold text-[#111111]">{selectedCust.name}</h5>
                                    <p className="text-[10px] text-slate-500 font-medium">Commercial Shipper</p>
                                  </div>
                                </div>
                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px] gap-1 px-2 py-0.5 rounded-lg">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Active Account
                                </Badge>
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
                      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-black/[0.06] pb-2">
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-bold text-[#111111] flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-brand" />
                            Configure Route Locations & Trip Slots
                          </h4>
                          <p className="text-xs text-[#6E6E80]">
                            Select pickup/dropoff stops, intermediate locations, pickup/drop-off times, and trip category.
                          </p>
                        </div>

                        {/* Rate Category Selector */}
                        <div className="flex items-center gap-2 bg-orange-50/70 border border-orange-200/80 px-2.5 py-1 rounded-xl">
                          <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                            Rate Category:
                          </span>
                          <RateCategorySelect
                            value={contractRateCategory}
                            onValueChange={(cat) => {
                              setContractRateCategory(cat);
                              setContractSlots((prev) =>
                                prev.map((s) => {
                                  const match = getMatchingRateCard(s.origin, s.destination, contractVehicleType, cat, contractBillingType);
                                  return {
                                    ...s,
                                    billingAmount: match && match.base_price ? String(match.base_price) : '',
                                    driverTripCharge: match && match.default_trip_charge ? String(match.default_trip_charge) : '',
                                  };
                                })
                              );
                            }}
                            size="sm"
                            allowClear={false}
                            showBadgesInOptions={true}
                            className="h-7.5 w-40 rounded-lg bg-white border-orange-200 text-xs font-bold"
                          />
                        </div>

                        
                      </div>

                      {/* Trip Slots Section */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
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
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-6.5 text-[11px] font-bold text-brand border-orange-200 bg-orange-50/60 hover:bg-orange-100 shadow-2xs gap-1 px-2.5"
                            onClick={handleAddTripSlot}
                          >
                            <Plus className="w-3.5 h-3.5 text-brand" />
                            Add Another Trip Slot
                          </Button>
                        </div>

                        {contractSlots.map((slot, slotIdx) => {
                          const matchedRateCard = getMatchingRateCard(
                            slot.origin,
                            slot.destination,
                            contractVehicleType,
                            contractRateCategory,
                            contractBillingType
                          );

                          return (
                            <div
                              key={slot.id}
                              className="p-3.5 rounded-xl border border-slate-200/90 bg-white shadow-2xs space-y-3"
                            >
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#111111] bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                                  Trip Slot #{slotIdx + 1}
                                </span>
                                {slot.isOvernight && Boolean(contractRateCategory && contractRateCategory.toLowerCase().includes('2 vehicles')) && (
                                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                                    <Moon className="w-3 h-3 fill-indigo-600" /> Overnight (+1 Day)
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-6.5 text-[11px] font-bold text-white bg-brand hover:bg-brand-hover active:scale-[0.98] transition-all shadow-xs rounded-lg gap-1 px-2.5 border-0"
                                  onClick={() => handleAddSlotIntermediate(slot.id)}
                                >
                                  <Plus className="w-3.5 h-3.5 text-white stroke-[2.5]" />
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
                                            onChange={(locName) => {
                                              handleUpdateTripSlot(slot.id, {
                                                origin: locName,
                                                returnDestination: slot.returnDestination || locName,
                                              });
                                            }}
                                            placeholder="Search starting origin (e.g. Riyadh)..."
                                            triggerClassName="h-8.5 border-emerald-200 bg-white shadow-2xs"
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-emerald-600" /> Outbound Pickup Time *
                                          </label>
                                          <input
                                            type="time"
                                            value={slot.pickupTime}
                                            onChange={(e) => handleUpdateTripSlot(slot.id, { pickupTime: e.target.value })}
                                            className="w-full h-8.5 px-2.5 rounded-lg border border-emerald-200 text-xs font-semibold focus:outline-none focus:border-emerald-500 bg-white cursor-pointer"
                                          />
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
                                            onChange={(locName) => {
                                              handleUpdateTripSlot(slot.id, {
                                                destination: locName,
                                                returnOrigin: slot.returnOrigin || locName,
                                              });
                                            }}
                                            placeholder="Search delivery destination (e.g. Dammam)..."
                                            triggerClassName="h-8.5 border-orange-200 bg-white shadow-2xs"
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-orange-900 uppercase tracking-wider flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-brand" /> Outbound Drop-off Time *
                                          </label>
                                          <input
                                            type="time"
                                            value={slot.dropoffTime}
                                            onChange={(e) => handleUpdateTripSlot(slot.id, { dropoffTime: e.target.value })}
                                            className="w-full h-8.5 px-2.5 rounded-lg border border-orange-200 text-xs font-semibold focus:outline-none focus:border-brand bg-white cursor-pointer"
                                          />
                                        </div>

                                        <TransitTimeBadge
                                          origin={slot.origin}
                                          destination={slot.destination}
                                          pickupTime={slot.pickupTime}
                                          dropoffTime={slot.dropoffTime}
                                          onAutoSetDropoffTime={(suggestedTime, isOvernight) => {
                                            handleUpdateTripSlot(slot.id, {
                                              dropoffTime: suggestedTime,
                                              ...(isOvernight ? { isOvernight: true } : {}),
                                            });
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>

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
                                                  onChange={(locName) => handleUpdateSlotIntermediate(slot.id, idx, locName)}
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
                                </div>

                                {/* LEG 2: RETURN JOURNEY (CLOSED LOOP) */}
                                <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-200/80 space-y-2.5">
                                  <div className="flex items-center justify-between border-b border-indigo-100 pb-1.5">
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-indigo-600 text-white border-indigo-600 text-[10px] font-bold flex items-center gap-1">
                                        <RefreshCw className="w-2.5 h-2.5" />
                                        Leg 2: Return Journey (The Loop Back)
                                      </Badge>
                                      <span className="text-xs font-bold text-indigo-950">Destination → Starting Home Origin</span>
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

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {/* SECTION 3: Return Pickup (Reload Point) */}
                                    <div className="rounded-xl border border-blue-200/80 bg-blue-50/30 overflow-hidden space-y-2">
                                      <div className="p-2 bg-blue-50/80 border-b border-blue-100 flex items-center justify-between">
                                        <div className="flex items-center gap-1.5">
                                          <span className="w-2 h-2 rounded-full bg-blue-600 ring-2 ring-blue-200 shrink-0" />
                                          <span className="text-xs font-bold text-blue-950">3. Return Pickup (Reload Point)</span>
                                        </div>
                                        <span className="text-[9px] font-semibold text-blue-700 bg-white border border-blue-200/80 px-1.5 py-0.5 rounded">
                                          Reload Hub
                                        </span>
                                      </div>

                                      <div className="p-2.5 space-y-2">
                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-blue-900 uppercase tracking-wider block">
                                            Return Pickup Location *
                                          </label>
                                          <LocationCombobox
                                            customerId={contractCustomer}
                                            value={slot.returnOrigin || slot.destination}
                                            onChange={(locName) => handleUpdateTripSlot(slot.id, { returnOrigin: locName })}
                                            placeholder="Search return reload origin..."
                                            triggerClassName="h-8.5 border-blue-200 bg-white shadow-2xs"
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-blue-600" /> Return Pickup Time *
                                          </label>
                                          <input
                                            type="time"
                                            value={slot.returnPickupTime || '16:00'}
                                            onChange={(e) => handleUpdateTripSlot(slot.id, { returnPickupTime: e.target.value })}
                                            className="w-full h-8.5 px-2.5 rounded-lg border border-blue-200 text-xs font-semibold focus:outline-none focus:border-blue-500 bg-white cursor-pointer"
                                          />
                                        </div>
                                      </div>
                                    </div>

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
                                            onChange={(locName) => handleUpdateTripSlot(slot.id, { returnDestination: locName })}
                                            placeholder="Search final home destination..."
                                            triggerClassName="h-8.5 border-purple-200 bg-white shadow-2xs"
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          <label className="text-[10px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-purple-600" /> Return Drop-off Time *
                                          </label>
                                          <input
                                            type="time"
                                            value={slot.returnDropoffTime || '22:00'}
                                            onChange={(e) => handleUpdateTripSlot(slot.id, { returnDropoffTime: e.target.value })}
                                            className={`w-full h-8.5 px-2.5 rounded-lg border text-xs font-semibold focus:outline-none focus:border-purple-500 cursor-pointer ${
                                              slot.returnIsOvernight
                                                ? 'border-indigo-300 bg-indigo-50/30 text-indigo-950'
                                                : 'border-purple-200 bg-white'
                                            }`}
                                          />
                                        </div>

                                        <TransitTimeBadge
                                          origin={slot.returnOrigin || slot.destination}
                                          destination={slot.returnDestination || slot.origin}
                                          pickupTime={slot.returnPickupTime || '14:00'}
                                          dropoffTime={slot.returnDropoffTime}
                                          onAutoSetDropoffTime={(suggestedTime, isOvernight) => {
                                            handleUpdateTripSlot(slot.id, {
                                              returnDropoffTime: suggestedTime,
                                              ...(isOvernight ? { returnIsOvernight: true } : {}),
                                            });
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>

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
                                                  onChange={(locName) => handleUpdateSlotReturnIntermediate(slot.id, idx, locName)}
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
                              /* Standard 1-Way Category Layout */
                              <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {/* 🟢 PICKUP STOP CARD (ORIGIN) */}
                                  <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/30 overflow-hidden space-y-2">
                                    <div className="p-2 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between">
                                      <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 shrink-0" />
                                        <span className="text-xs font-bold text-emerald-950">Pickup Stop (Origin)</span>
                                      </div>
                                      <span className="text-[9px] font-semibold text-emerald-700 bg-white border border-emerald-200/80 px-1.5 py-0.5 rounded">
                                        Rate Hub & Maps
                                      </span>
                                    </div>

                                                                        <div className="p-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                      <div className="sm:col-span-2 space-y-1">
                                        <label className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider flex items-center justify-between">
                                          <span>Pickup Location *</span>
                                          <span className="text-[9px] text-slate-400 font-normal">Google Maps & Rate Cards</span>
                                        </label>
                                        <LocationCombobox
                                          customerId={contractCustomer}
                                          value={slot.origin}
                                          onChange={(locName) => handleUpdateTripSlot(slot.id, { origin: locName })}
                                          placeholder="Search or select pickup location..."
                                          triggerClassName="h-8.5 border-emerald-200 bg-white shadow-2xs"
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                                          <Clock className="w-3 h-3 text-emerald-600" /> Pickup Time *
                                        </label>
                                        <input
                                          type="time"
                                          value={slot.pickupTime}
                                          onChange={(e) => handleUpdateTripSlot(slot.id, { pickupTime: e.target.value })}
                                          className="w-full h-8.5 px-2.5 rounded-lg border border-emerald-200 text-xs font-semibold focus:outline-none focus:border-emerald-500 bg-white cursor-pointer"
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* 🟠 DROPOFF STOP CARD (DESTINATION) */}
                                  <div className="rounded-xl border border-orange-200/80 bg-orange-50/30 overflow-hidden space-y-2">
                                    <div className="p-2 bg-orange-50/80 border-b border-orange-100 flex items-center justify-between flex-wrap gap-1.5">
                                      <div className="flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-brand ring-2 ring-orange-200 shrink-0" />
                                        <span className="text-xs font-bold text-orange-950">Dropoff Stop (Destination)</span>
                                      </div>

                                      {Boolean(contractRateCategory && contractRateCategory.toLowerCase().includes('2 vehicles')) && (
                                        <div className="flex items-center gap-1.5">
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
                                        </div>
                                      )}
                                    </div>

                                                                        <div className="p-2.5 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                      <div className="sm:col-span-2 space-y-1">
                                        <label className="text-[10px] font-bold text-orange-900 uppercase tracking-wider flex items-center justify-between">
                                          <span>Dropoff Location *</span>
                                          <span className="text-[9px] text-slate-400 font-normal">Google Maps & Rate Cards</span>
                                        </label>
                                        <LocationCombobox
                                          customerId={contractCustomer}
                                          value={slot.destination}
                                          onChange={(locName) => handleUpdateTripSlot(slot.id, { destination: locName })}
                                          placeholder="Search or select dropoff location..."
                                          triggerClassName="h-8.5 bg-white shadow-2xs border-orange-200"
                                        />
                                      </div>

                                      <div className="space-y-1">
                                        <label className="text-[10px] font-bold text-orange-900 uppercase tracking-wider flex items-center gap-1">
                                          <Clock className="w-3 h-3 text-brand" /> Drop-off Time *
                                        </label>
                                        <input
                                          type="time"
                                          value={slot.dropoffTime}
                                          onChange={(e) => handleUpdateTripSlot(slot.id, { dropoffTime: e.target.value })}
                                          className={`w-full h-8.5 px-2.5 rounded-lg border text-xs font-semibold focus:outline-none focus:border-brand cursor-pointer ${
                                            slot.isOvernight
                                              ? 'border-indigo-300 bg-indigo-50/30 text-indigo-950'
                                              : 'border-orange-200 bg-white'
                                          }`}
                                        />
                                      </div>

                                      <div className="sm:col-span-3 pt-0.5">
                                        <TransitTimeBadge
                                          origin={slot.origin}
                                          destination={slot.destination}
                                          pickupTime={slot.pickupTime}
                                          dropoffTime={slot.dropoffTime}
                                          onAutoSetDropoffTime={(suggestedTime, isOvernight) => {
                                            handleUpdateTripSlot(slot.id, {
                                              dropoffTime: suggestedTime,
                                              ...(isOvernight ? { isOvernight: true } : {}),
                                            });
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Intermediate Stop Cards */}
                                {slot.intermediateLocations.length > 0 && (
                                  <div className="space-y-2 pt-2 border-t border-slate-100">
                                    <span className="text-[10px] font-bold text-[#6E6E80] uppercase tracking-wider block">
                                      Intermediate Stop Locations & Fees
                                    </span>
                                    <div className="space-y-2">
                                      {slot.intermediateLocations.map((loc, idx) => (
                                        <div key={idx} className="p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                                          <div className="flex items-center justify-between border-b border-slate-200/60 pb-1.5">
                                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                              <MapPin className="w-3 h-3 text-blue-600" />
                                              Intermediate Stop #{idx + 1}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveSlotIntermediate(slot.id, idx)}
                                              className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 flex items-center gap-1 text-[10px] font-semibold"
                                              title="Remove stop"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                              Remove Stop
                                            </button>
                                          </div>

                                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <div className="sm:col-span-2 space-y-1">
                                              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                                                Stop Location *
                                              </label>
                                              <LocationCombobox
                                                customerId={contractCustomer}
                                                value={loc}
                                                onChange={(locName) => handleUpdateSlotIntermediate(slot.id, idx, locName)}
                                                placeholder={`Search or select Intermediate Stop #${idx + 1}...`}
                                                triggerClassName="h-8.5 border-slate-200 bg-white shadow-2xs"
                                              />
                                            </div>

                                            <div className="space-y-1">
                                              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                                                <DollarSign className="w-3 h-3 text-emerald-600" /> Additional Stop Fee (SAR)
                                              </label>
                                              <div className="relative">
                                                <span className="absolute left-2.5 top-2 text-xs font-bold text-slate-400">SAR</span>
                                                <input
                                                  type="number"
                                                  value={slot.intermediateStopFees?.[idx] || ''}
                                                  onChange={(e) => handleUpdateSlotIntermediateFee(slot.id, idx, e.target.value)}
                                                  placeholder="e.g. 150"
                                                  className="w-full h-8.5 pl-10 pr-2.5 rounded-lg border border-slate-200 text-xs font-bold text-right focus:outline-none focus:border-brand bg-white shadow-2xs"
                                                />
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}

                            
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  )}

                  {/* STEP 3: SCHEDULE & DAYS */}
                  {contractStep === 3 && (
                    <div className="space-y-3.5 animate-fade-in">
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-bold text-[#111111] flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-brand" />
                          Select Operating Month & Days
                        </h4>
                        <p className="text-xs text-[#6E6E80]">
                          Choose the target month and select the operational days for this monthly contract batch.
                        </p>
                      </div>

                      {/* Month Switcher & Day Selector */}
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-black/[0.06] space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2.5">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
                              className="h-7.5 rounded-lg border-black/10 px-2 text-xs"
                            >
                              ‹
                            </Button>
                            <span className="text-xs font-bold text-[#111111] min-w-[110px] text-center bg-white border border-black/10 px-3 py-1 rounded-lg">
                              {monthLabel(selectedMonth)}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
                              className="h-7.5 rounded-lg border-black/10 px-2 text-xs"
                            >
                              ›
                            </Button>
                          </div>

                          {/* Presets */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-[#9898A4] uppercase mr-1">Quick Select:</span>
                            <button
                              type="button"
                              onClick={() => selectPreset('weekdays')}
                              className="px-2.5 py-1 rounded-lg bg-white border border-black/10 hover:bg-black/[0.03] text-[11px] font-semibold text-[#111111] transition-colors"
                            >
                              Sun–Thu
                            </button>
                            <button
                              type="button"
                              onClick={() => selectPreset('mwf')}
                              className="px-2.5 py-1 rounded-lg bg-white border border-black/10 hover:bg-black/[0.03] text-[11px] font-semibold text-[#111111] transition-colors"
                            >
                              Mon, Wed, Fri
                            </button>
                            <button
                              type="button"
                              onClick={() => selectPreset('daily')}
                              className="px-2.5 py-1 rounded-lg bg-white border border-black/10 hover:bg-black/[0.03] text-[11px] font-semibold text-[#111111] transition-colors"
                            >
                              All Days
                            </button>
                          </div>
                        </div>

                        {/* Calendar Day Grid */}
                        <div className="grid grid-cols-7 gap-1.5 pt-1">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                            <div key={d} className="text-center text-[10px] font-bold text-[#9898A4] py-0.5">
                              {d}
                            </div>
                          ))}

                          {Array.from({ length: monthDates[0]?.dayOfWeek || 0 }).map((_, i) => (
                            <div key={`pad-${i}`} className="h-9 rounded-lg opacity-0 pointer-events-none" />
                          ))}

                          {monthDates.map((item) => {
                            const isSelected = selectedDates.includes(item.dateStr);
                            return (
                              <button
                                key={item.dateStr}
                                type="button"
                                onClick={() => toggleDate(item.dateStr)}
                                className={`h-9.5 rounded-lg flex flex-col items-center justify-center text-xs font-bold transition-all relative ${
                                  isSelected
                                    ? 'bg-brand text-white shadow-xs ring-1 ring-brand/20'
                                    : 'bg-white text-[#111111] border border-black/[0.07] hover:border-brand/40'
                                }`}
                              >
                                <span>{item.dayNumber}</span>
                                <span className={`text-[9px] font-medium -mt-0.5 ${isSelected ? 'text-white/80' : 'text-[#9898A4]'}`}>
                                  {item.dayName}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        <div className="text-xs text-[#6E6E80] pt-0.5 text-center font-medium">
                          Selected: <span className="font-bold text-[#111111]">{selectedDates.length} days</span> × {contractSlots.length} slot(s) = <span className="font-bold text-brand">{selectedDates.length * contractSlots.length} total trips</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: DRIVER & TRUCK ASSIGNMENTS */}
                  {contractStep === 4 && (
                    <div className="space-y-3.5 animate-fade-in">
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-bold text-[#111111] flex items-center gap-2">
                          <Truck className="w-4 h-4 text-brand" />
                          Assign Drivers & Trucks
                        </h4>
                        <p className="text-xs text-[#6E6E80]">
                          Tailor driver and vehicle assignments for each trip slot, or use quick batch rotation shortcuts.
                        </p>
                      </div>

                      {/* 2-Vehicle Shuttle Helper Banner */}
                      {Boolean(contractRateCategory && contractRateCategory.toLowerCase().includes('2 vehicles')) && (
                        <div className="p-3 rounded-xl bg-indigo-50/90 border border-indigo-200 flex items-center justify-between flex-wrap gap-2.5 text-xs text-indigo-950 font-bold shadow-2xs">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-indigo-600 text-white border-indigo-600 text-[10px] font-bold flex items-center gap-1">
                              <RefreshCw className="w-3 h-3" /> 2-Vehicle Shuttle Mode
                            </Badge>
                            <span>Driver A & Truck A (Outbound) ↔ Driver B & Truck B (Return Shuttle Loop)</span>
                          </div>
                          <span className="text-[10px] text-indigo-700 font-semibold bg-white border border-indigo-200 px-2 py-0.5 rounded-md">
                            Long-Distance 12+ Hr Rest Rotation Enabled
                          </span>
                        </div>
                      )}

                      {/* Quick Apply Master Toolbar */}
                      <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100/90 space-y-2.5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
                            <span className="text-xs font-bold text-indigo-950">
                              Batch Assign Drivers & Trucks
                            </span>
                          </div>

                          <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-xl border border-slate-300/70 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => setAssignMode('single')}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                assignMode === 'single'
                                  ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80'
                                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                              }`}
                            >
                              <User className="w-3.5 h-3.5 text-slate-500" />
                              Single Assigned Driver
                            </button>
                            <button
                              type="button"
                              onClick={() => setAssignMode('alternating')}
                              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                                assignMode === 'alternating'
                                  ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-500/20'
                                  : 'text-indigo-900 hover:bg-white/50'
                              }`}
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-current stroke-[2.2]" />
                              Alternating A/B Shuttle Loop
                            </button>
                          </div>
                        </div>

                        {assignMode === 'single' ? (
                          <div className="flex items-center gap-2 flex-wrap pt-0.5">
                            <Select value={masterDriver} onValueChange={handleMasterDriverChange}>
                              <SelectTrigger className="h-8 w-48 rounded-lg bg-white border-indigo-200 text-xs font-medium">
                                <SelectValue placeholder="Select driver" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                                                                {drivers.map((d) => (
                                  <SelectItem key={d.id} value={d.id} className="text-xs">
                                    {getDriverLabel(d, vehicles)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Select value={masterVehicle} onValueChange={handleMasterVehicleChange}>
                              <SelectTrigger className="h-8 w-48 rounded-lg bg-white border-indigo-200 text-xs font-medium">
                                <SelectValue placeholder="Select vehicle" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                                                                {vehicles.map((v) => (
                                  <SelectItem key={v.id} value={v.id} className="text-xs">
                                    {getVehicleLabel(v)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <div className="w-48">
                              <VehicleTypeSelect
                                value={contractVehicleType}
                                onValueChange={(vType) => {
                                  setContractVehicleType(vType);
                                  setContractSlots((prev) =>
                                    prev.map((s) => {
                                      const match = getMatchingRateCard(s.origin, s.destination, vType, contractRateCategory, contractBillingType);
                                      return {
                                        ...s,
                                        billingAmount: match && match.base_price ? String(match.base_price) : '',
                                        driverTripCharge: match && match.default_trip_charge ? String(match.default_trip_charge) : '',
                                      };
                                    })
                                  );
                                }}
                                placeholder="Select Vehicle Type"
                                allowClear={false}
                                size="sm"
                                className="h-8 rounded-lg border-indigo-200 shadow-2xs font-bold text-[#111111]"
                              />
                            </div>

                            <Button
                              size="sm"
                              onClick={applyMasterToAll}
                              className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3"
                            >
                              Apply to All {batchTripRows.length} Trips
                            </Button>
                          </div>
                        ) : (
                                                    <div className="space-y-3 pt-1 border-t border-indigo-100">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              {loopTeams.map((team, idx) => {
                                const term = idx + 1;
                                const stepVal = loopTeams.length;
                                const formula = `Trips: ${term}, ${term + stepVal}, ${term + 2 * stepVal}...`;

                                return (
                                  <div key={team.id} className="p-3 rounded-xl bg-white border border-indigo-200 space-y-2 relative shadow-2xs">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="text-[11px] font-bold text-indigo-900 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-brand inline-block" />
                                        {team.name} ({formula})
                                      </span>
                                      {loopTeams.length > 2 && (
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveLoopTeam(team.id)}
                                          className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors cursor-pointer"
                                          title="Delete Team"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                    <div className="space-y-1.5">
                                      <Select
                                        value={team.driverId || 'unassigned'}
                                        onValueChange={(val) => handleUpdateLoopTeam(team.id, { driverId: val === 'unassigned' ? '' : val })}
                                      >
                                        <SelectTrigger className="h-8 w-full rounded-lg border-indigo-100 text-[11px]">
                                          <SelectValue placeholder="Driver" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                                                                                    {drivers.map((d) => (
                                            <SelectItem key={d.id} value={d.id} className="text-xs">
                                              {getDriverLabel(d, vehicles)}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>

                                      <Select
                                        value={team.vehicleId || 'unassigned'}
                                        onValueChange={(val) => handleUpdateLoopTeam(team.id, { vehicleId: val === 'unassigned' ? '' : val })}
                                      >
                                        <SelectTrigger className="h-8 w-full rounded-lg border-indigo-100 text-[11px]">
                                          <SelectValue placeholder="Truck" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                                                                                    {vehicles.map((v) => (
                                            <SelectItem key={v.id} value={v.id} className="text-xs">
                                              {getVehicleLabel(v)}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                );
                              })}

                              {/* "+ Add Shuttle Team" dashed button */}
                              <button
                                type="button"
                                onClick={handleAddLoopTeam}
                                className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/20 hover:bg-indigo-50/50 transition-all text-xs font-bold text-indigo-600 min-h-[96px] cursor-pointer"
                              >
                                <Plus className="w-5 h-5 text-indigo-600" />
                                <span>Add Shuttle Team</span>
                              </button>
                            </div>

                            <div className="flex items-center justify-end pt-1">
                              <Button
                                size="sm"
                                onClick={applyAlternatingLoop}
                                className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 gap-1.5"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Apply Shuttle Loop Rotation ({batchTripRows.length} Trips)
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-[#6E6E80] uppercase tracking-wider block flex items-center gap-1.5">
                            <DollarSign className="w-3.5 h-3.5 text-brand" />
                            Contract Billing Rates
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium flex items-center gap-1.5">
                            Configure rate per slot
                            <span className="inline-block w-1 h-1 rounded-full bg-slate-350" />
                            {isRateCardsLoading ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin text-slate-400" />
                            ) : (
                              <span>{customerRateCards.length} rate cards loaded</span>
                            )}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {contractSlots.map((s, idx) => {
                            const matchedRateCard = getMatchingRateCard(s.origin, s.destination, contractVehicleType, contractRateCategory, contractBillingType);
                            return (
                              <div key={s.id} className="p-2.5 rounded-xl bg-white border border-slate-200/80 flex items-center justify-between gap-3 shadow-2xs">
                                <div className="space-y-0.5 min-w-0 flex-1">
                                  <span className="text-[10px] font-bold text-slate-900 block truncate max-w-full">
                                    Slot #{idx + 1}: {s.origin || 'Origin'} ➔ {s.destination || 'Destination'}
                                  </span>
                                  {matchedRateCard ? (
                                    <div className="space-y-0.5">
                                      <span className="text-[9px] text-emerald-600 font-semibold block">
                                        Rate Card matched: SAR {matchedRateCard.base_price.toLocaleString()}
                                      </span>
                                      {matchedRateCard.default_trip_charge && (
                                        <span className="text-[9px] text-indigo-600 font-semibold block">
                                          Driver payout matched: SAR {Number(matchedRateCard.default_trip_charge).toLocaleString()}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className="text-[9px] text-amber-600 font-semibold block">
                                      ⚠️ No rate card matched for this route
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-5 shrink-0">
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="text-[10px] font-extrabold text-brand uppercase tracking-wider">Contract Rate</span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold text-brand/70">SAR</span>
                                      <input
                                        type="number"
                                        value={s.billingAmount || ''}
                                        onChange={(e) => handleUpdateTripSlot(s.id, { billingAmount: e.target.value })}
                                        placeholder="e.g. 800"
                                        className="w-28 h-10 px-3 rounded-lg border-2 border-brand-border bg-brand-light/50 text-lg font-bold text-slate-900 focus:outline-none focus:border-brand focus:ring-2 focus:ring-brand-border text-right shadow-2xs transition-all"
                                      />
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">Driver Charge</span>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-bold text-indigo-400">SAR</span>
                                      <input
                                        type="number"
                                        value={s.driverTripCharge || ''}
                                        onChange={(e) => handleUpdateTripSlot(s.id, { driverTripCharge: e.target.value })}
                                        placeholder="e.g. 200"
                                        className="w-28 h-10 px-3 rounded-lg border-2 border-indigo-200 bg-indigo-50/50 text-lg font-bold text-slate-900 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-right shadow-2xs transition-all"
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Date Breakdown Table */}
                      <div className="rounded-xl border border-black/[0.08] overflow-hidden max-h-[480px] overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-[11px] font-bold text-[#6E6E80] uppercase tracking-wider border-b border-black/[0.06] sticky top-0 z-10">
                            <tr>
                              <th className="px-4 py-2">Date & Slot</th>
                              <th className="px-4 py-2">Assigned Driver</th>
                              <th className="px-4 py-2">Assigned Truck</th>
                              <th className="px-4 py-2 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/[0.04]">
                            {batchTripRows.map((rowItem) => {
                              const currentAssignment = dayAssignments[rowItem.key] || { driverId: '', vehicleId: '' };

                              return (
                                <tr key={rowItem.key} className="hover:bg-slate-50/50">
                                                                    <td className="px-4 py-1.5 font-bold text-[#111111] whitespace-nowrap">
                                    {(() => {
                                      const rowKey = rowItem.key;
                                      let slotObj = contractSlots[0];
                                      if (rowKey.includes('::')) {
                                        const slotId = rowKey.split('::')[1];
                                        slotObj = contractSlots.find((s) => s.id === slotId) || contractSlots[0];
                                      }
                                      return (
                                        <div className="flex flex-col">
                                          <div className="flex items-center gap-2">
                                            <Calendar className="h-3.5 w-3.5 text-brand" />
                                            <span>{rowItem.formattedDate}</span>
                                            {rowItem.slotLabel && (
                                              <span className="text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                                {rowItem.slotLabel}
                                              </span>
                                            )}
                                            {rowItem.isOvernight && (
                                              <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                                <Moon className="w-2.5 h-2.5 fill-indigo-600" />
                                                Overnight
                                              </span>
                                            )}
                                          </div>
                                          {slotObj && (
                                            <span className="text-[10px] text-slate-400 font-semibold block pl-5.5 mt-0.5">
                                              {slotObj.origin || 'Origin'} ➔ {slotObj.destination || 'Destination'}
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </td>
                                  <td className="px-4 py-1.5">
                                                                        <Select
                                      value={currentAssignment.driverId || 'unassigned'}
                                      onValueChange={(val) => {
                                        const selectedDrv = drivers.find((d) => d.id === val);
                                        let vehId = '';
                                        if (selectedDrv) {
                                          const embeddedVehicle = selectedDrv.assignedVehicle && typeof selectedDrv.assignedVehicle === 'object'
                                            ? selectedDrv.assignedVehicle as any
                                            : null;
                                          vehId = selectedDrv.assignedVehicleId || embeddedVehicle?.id || (selectedDrv as any).assigned_vehicle_id || '';
                                        }
                                        setBypassDriverValidation(false);
                                        setDayAssignments((prev) => ({
                                          ...prev,
                                          [rowItem.key]: {
                                            ...prev[rowItem.key],
                                            driverId: val === 'unassigned' ? '' : val,
                                            ...(vehId ? { vehicleId: vehId } : {}),
                                          },
                                        }));
                                      }}
                                    >
                                      <SelectTrigger className={`h-7.5 w-52 rounded-lg text-xs font-medium ${
                                        hasAttemptedStep4 && !currentAssignment.driverId
                                          ? 'border-red-500 focus:ring-red-500 bg-red-50/20'
                                          : 'border-black/10'
                                      }`}>
                                        <SelectValue placeholder="Assign driver..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="unassigned">-- Unassigned (Assign Later) --</SelectItem>
                                                                                {drivers.map((d) => (
                                          <SelectItem key={d.id} value={d.id} className="text-xs">
                                            {getDriverLabel(d, vehicles)}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="px-4 py-1.5">
                                    <Select
                                      value={currentAssignment.vehicleId || 'unassigned'}
                                      onValueChange={(val) =>
                                        setDayAssignments((prev) => ({
                                          ...prev,
                                          [rowItem.key]: {
                                            ...prev[rowItem.key],
                                            vehicleId: val === 'unassigned' ? '' : val,
                                          },
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="h-7.5 w-52 rounded-lg border-black/10 text-xs font-medium">
                                        <SelectValue placeholder="Assign truck..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="unassigned">-- Unassigned (Assign Later) --</SelectItem>
                                                                                {vehicles.map((v) => (
                                          <SelectItem key={v.id} value={v.id} className="text-xs">
                                            {getVehicleLabel(v)}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="px-4 py-1.5 text-right">
                                    <button
                                      type="button"
                                      onClick={() => toggleDate(rowItem.dateStr)}
                                      className="p-1 rounded-md text-[#9898A4] hover:text-red-600 hover:bg-red-50 transition-colors"
                                      title="Remove this date"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                                    {/* STEP 5: REVIEW & SUMMARY */}
                  {contractStep === 5 && (() => {
                    const selectedCust = customers.find((c) => c.id === contractCustomer);
                    const billingTotal = (contractSlots.reduce((sum, s) => sum + (Number(s.billingAmount) || 0), 0)) * selectedDates.length;
                    return (
                      <div className="space-y-4 animate-fade-in">
                        <div className="space-y-0.5">
                          <h4 className="text-sm font-bold text-[#111111] flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-brand" />
                            Review & Generate Monthly Batch
                          </h4>
                          <p className="text-xs text-[#6E6E80]">
                            Confirm all contract batch parameters before generating trips on the Monthly Board.
                          </p>
                        </div>

                        {/* Customer Header Bar */}
                        {selectedCust && (
                          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <span className="w-9 h-9 rounded-lg bg-orange-100/80 text-[#E8450F] font-extrabold text-xs grid place-items-center shrink-0 border border-orange-200/80">
                                {selectedCust.name.substring(0, 2).toUpperCase()}
                              </span>
                              <div>
                                <h5 className="text-xs font-bold text-[#111111]">{selectedCust.name}</h5>
                                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                                  Commercial Client • {selectedCust.payment_terms || 'Net 30'} Payment Terms
                                </p>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-200/60 px-2 py-0.5 rounded-md uppercase tracking-wider shrink-0">
                              Operations Module
                            </span>
                          </div>
                        )}

                        {/* Merged KPI Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Card 1: Estimated Billing */}
                          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs relative overflow-hidden flex flex-col justify-between min-h-[96px]">
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimated Billing</span>
                                <Coins className="w-4 h-4 text-emerald-500" />
                              </div>
                              <span className="text-lg font-extrabold text-emerald-600 block mt-1">
                                SAR {billingTotal.toLocaleString()}
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-medium">({selectedDates.length} days × {contractSlots.length} slots)</span>
                          </div>

                          {/* Card 2: Batch Volume */}
                          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs relative overflow-hidden flex flex-col justify-between min-h-[96px]">
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Batch Volume</span>
                                <Truck className="w-4 h-4 text-brand" />
                              </div>
                              <span className="text-lg font-extrabold text-[#111111] block mt-1">
                                {batchTripRows.length} Trips
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-medium">Over {selectedDates.length} operating days</span>
                          </div>

                          {/* Card 3: Configuration */}
                          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs relative overflow-hidden flex flex-col justify-between min-h-[96px]">
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Configuration</span>
                                <Calendar className="w-4 h-4 text-[#E8450F]" />
                              </div>
                              <span className="text-xs font-bold text-[#111111] block mt-1.5 truncate">
                                {contractRateCategory} • {contractVehicleType}
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-medium truncate">
                              {contractSlots.filter((s) => s.isOvernight).length} overnight slot(s) (+1 Day)
                            </span>
                          </div>

                          {/* Card 4: Operations */}
                          <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs relative overflow-hidden flex flex-col justify-between min-h-[96px]">
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assignments</span>
                                <UserCheck className="w-4 h-4 text-indigo-500" />
                              </div>
                              <span className="text-xs font-bold text-[#111111] block mt-1.5 truncate">
                                {assignMode === 'alternating' ? 'A/B Rotation' : 'Single Driver'}
                              </span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-medium">Auto-fill mapping applied</span>
                          </div>
                        </div>

                        {/* Detailed Slots Ledger with Transit Times */}
                        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <h5 className="text-xs font-bold text-[#111111]">Daily Slots & Transit Times</h5>
                            <span className="text-[10px] font-semibold text-slate-500 bg-white border px-2 py-0.5 rounded">
                              {contractSlots.length} Active {contractSlots.length === 1 ? 'Slot' : 'Slots'}
                            </span>
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-[11px] text-left border-collapse">
                              <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  <th className="px-4 py-2">Slot</th>
                                  <th className="px-4 py-2">Route (Origin ➔ Destination)</th>
                                  <th className="px-4 py-2">Pickup Time</th>
                                  <th className="px-4 py-2">Drop-off Time</th>
                                  <th className="px-4 py-2">Transit Time</th>
                                  <th className="px-4 py-2 text-right">Driver Charge</th>
                                  <th className="px-4 py-2 text-right">Contract Rate</th>
                                </tr>
                              </thead>
                              <tbody>
                                {contractSlots.map((s, idx) => {
                                  const transit = calculateTransitTime(s.pickupTime, s.dropoffTime, s.isOvernight);
                                  return (
                                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/50 font-medium">
                                      <td className="px-4 py-2.5 font-bold text-slate-900">Slot #{idx + 1}</td>
                                      <td className="px-4 py-2.5 text-slate-600 font-semibold">
                                        {s.origin || 'Not Selected'} ➔ {s.destination || 'Not Selected'}
                                      </td>
                                      <td className="px-4 py-2.5 text-slate-500">{s.pickupTime || '08:00 AM'}</td>
                                      <td className="px-4 py-2.5 text-slate-500">
                                        {s.dropoffTime || '04:00 PM'}
                                        {s.isOvernight && (
                                          <span className="text-indigo-600 font-bold ml-1.5 text-[10px]">
                                            (+1 Day)
                                          </span>
                                        )}
                                      </td>
                                      <td className="px-4 py-2.5">
                                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-brand bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded">
                                          <Clock className="w-3 h-3 text-brand" />
                                          {transit}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2.5 text-right font-bold text-slate-600">
                                        SAR {Number(s.driverTripCharge) || 0}
                                      </td>
                                      <td className="px-4 py-2.5 text-right font-extrabold text-emerald-600">
                                        SAR {Number(s.billingAmount) || 0}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Generated Trips Preview */}
                        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                          <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                            <h5 className="text-xs font-bold text-[#111111]">Generated Trips Preview</h5>
                            <span className="text-[10px] font-semibold text-slate-500 bg-white border px-2 py-0.5 rounded">
                              {batchTripRows.length} Trips to generate
                            </span>
                          </div>
                          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                            <table className="w-full text-[11px] text-left border-collapse">
                              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                <tr>
                                  <th className="px-4 py-2 bg-slate-50">Date & Slot</th>
                                  <th className="px-4 py-2 bg-slate-50">Route</th>
                                  <th className="px-4 py-2 bg-slate-50">Assigned Driver</th>
                                  <th className="px-4 py-2 bg-slate-50">Assigned Truck</th>
                                  <th className="px-4 py-2 text-right bg-slate-50">Driver Charge</th>
                                  <th className="px-4 py-2 text-right bg-slate-50">Contract Rate</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {batchTripRows.map((rowItem) => {
                                  const currentAssignment = dayAssignments[rowItem.key] || { driverId: '', vehicleId: '' };
                                  const drv = drivers.find((d) => d.id === currentAssignment.driverId);
                                  const veh = vehicles.find((v) => v.id === currentAssignment.vehicleId);

                                  let slotObj = contractSlots[0];
                                  if (rowItem.key.includes('::')) {
                                    const slotId = rowItem.key.split('::')[1];
                                    slotObj = contractSlots.find((s) => s.id === slotId) || contractSlots[0];
                                  }

                                  return (
                                    <tr key={rowItem.key} className="hover:bg-slate-50/50 font-medium">
                                      <td className="px-4 py-2">
                                        <div className="flex items-center gap-1.5">
                                          <span className="font-bold text-slate-900">{rowItem.formattedDate}</span>
                                          {rowItem.slotLabel && (
                                            <span className="text-[9px] font-bold bg-slate-100 text-slate-700 px-1 rounded">
                                              {rowItem.slotLabel}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 py-2 text-slate-600 font-semibold">
                                        {slotObj?.origin || 'Origin'} ➔ {slotObj?.destination || 'Destination'}
                                      </td>
                                      <td className="px-4 py-2 text-slate-500">
                                        {drv ? `${drv.first_name} ${drv.last_name}` : <span className="text-slate-400 italic">Unassigned</span>}
                                      </td>
                                      <td className="px-4 py-2 text-slate-500">
                                        {veh ? veh.plate_number : <span className="text-slate-400 italic">Unassigned</span>}
                                      </td>
                                      <td className="px-4 py-2 text-right font-bold text-slate-600">
                                        SAR {slotObj ? (Number(slotObj.driverTripCharge) || 0) : 0}
                                      </td>
                                      <td className="px-4 py-2 text-right font-extrabold text-emerald-600">
                                        SAR {slotObj ? (Number(slotObj.billingAmount) || 0) : 0}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Selected Calendar Days */}
                        {selectedDates.length > 0 && (
                          <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                            <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                              Operating Days Calendar ({selectedDates.length} Days)
                            </h5>
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                              {selectedDates.map((d) => {
                                const dateObj = new Date(d);
                                const lbl = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                                return (
                                  <span key={d} className="px-2 py-0.5 bg-slate-50 border border-slate-200 text-[10px] font-semibold text-slate-700 rounded-lg">
                                    {lbl}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
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
                              <input
                                type="date"
                                value={row.date}
                                onChange={(e) => updateGridRow(row.id, { date: e.target.value })}
                                className="h-7.5 px-2 rounded-lg border border-black/10 text-xs font-medium bg-white focus:outline-none focus:border-brand"
                              />
                            </td>
                            <td className="px-3 py-1.5">
                              <select
                                value={row.driverId}
                                onChange={(e) => updateGridRow(row.id, { driverId: e.target.value })}
                                className="w-36 h-7.5 px-2 rounded-lg border border-black/10 text-xs font-medium bg-white focus:outline-none focus:border-brand"
                              >
                                <option value="">-- Unassigned --</option>
                                {drivers.map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.first_name} {d.last_name}
                                  </option>
                                ))}
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

        {/* Sticky Guided Footer Action Bar for Contract Batch */}
        {activeTab === 'contract' && !submissionResult && (
          <div className="px-5 py-2.5 border-t border-black/[0.06] bg-slate-50/80 flex items-center justify-between shrink-0">
            <div>
              {contractStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setContractStep((prev) => (prev - 1) as any)}
                  className="h-9 rounded-xl border-black/10 text-xs font-semibold bg-white hover:bg-slate-50"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDialogClose}
                  className="h-9 text-xs font-semibold text-slate-500 hover:text-slate-900"
                >
                  Cancel
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {contractStep < 5 ? (
                <Button
                  type="button"
                                    disabled={
                    (contractStep === 1 && !isStep1Valid) ||
                    (contractStep === 2 && !isStep2Valid) ||
                    (contractStep === 3 && !isStep3Valid)
                  }
                  onClick={() => {
                    if (contractStep === 4) {
                      setHasAttemptedStep4(true);
                      if (!isStep4Valid) {
                        setIsUnassignedAlertOpen(true);
                        return;
                      }
                    }
                    setContractStep((prev) => (prev + 1) as any);
                  }}
                  className="h-9 rounded-xl px-5 text-xs font-bold bg-brand hover:bg-[#d13d0d] text-white shadow-none disabled:opacity-50 gap-1"
                >
                  Next Step: {contractStep === 1 ? 'Route Slots' : contractStep === 2 ? 'Schedule' : contractStep === 3 ? 'Assignments' : 'Review'}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={bulkMutation.isPending || batchTripRows.length === 0}
                  onClick={handleContractSubmit}
                  className="h-9 rounded-xl px-5 text-xs font-bold bg-brand hover:bg-[#d13d0d] text-white shadow-none disabled:opacity-50"
                >
                  {bulkMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Trips...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-1.5" />
                      Generate {batchTripRows.length} Trips
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
        <ConfirmModal
          isOpen={isUnassignedAlertOpen}
          onClose={() => setIsUnassignedAlertOpen(false)}
          onConfirm={() => {
            setIsUnassignedAlertOpen(false);
            setBypassDriverValidation(true);
            setContractStep(5);
          }}
          title="Unassigned Drivers"
          message="Some trips in this batch do not have a driver assigned. Are you sure you want to proceed? You can assign drivers later."
          confirmLabel="Proceed"
          cancelLabel="Cancel"
        />
      </DialogContent>
    </Dialog>
  );
}