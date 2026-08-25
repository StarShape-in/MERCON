import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  X,
  User,
  MapPin,
  Calendar,
  Truck,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ConfirmModal from '@/components/ui/ConfirmModal';
import { KbdBadge } from '@/components/ui/KbdBadge';

import { customerService } from '@/services/customerService';
import { driverService, Driver } from '@/services/driverService';
import { vehicleService, Vehicle } from '@/services/vehicleService';
import { rateCardService, RateCard } from '@/services/rateCardService';
import { tripService, BulkImportTripRow, BulkImportResult, TripStatus } from '@/services/tripService';
import { quotationService } from '@/services/quotationService';
import { VEHICLE_TYPES, RATE_CATEGORIES } from '@mercon/shared-types';
import { useFormKeyboardShortcuts } from '@/hooks/useFormKeyboardShortcuts';
import { analyzePastDateRows, applyPastStatusToRows, PastDateAnalysis } from '@/utils/pastDateTripUtils';
import PastDateTripConfirmModal from '@/components/trips/PastDateTripConfirmModal';


import { ContractSlot, LoopTeam, MonthDateItem, BatchTripRow } from '@/components/trips/monthly-page/types';
import Step1Customer from '@/components/trips/monthly-page/Step1Customer';
import Step2RouteSlots from '@/components/trips/monthly-page/Step2RouteSlots';
import Step3Schedule from '@/components/trips/monthly-page/Step3Schedule';
import Step4Assignments from '@/components/trips/monthly-page/Step4Assignments';
import Step5Review from '@/components/trips/monthly-page/Step5Review';

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

export default function CreateMonthlyTripPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const defaultMonth = searchParams.get('month') || undefined;
  const currentMonthKey = defaultMonth || new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);

  useEffect(() => {
    if (defaultMonth) {
      setSelectedMonth(defaultMonth);
    }
  }, [defaultMonth]);

  // Master Data Queries
  const { data: customersRes, refetch: refetchCustomers } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 150 }),
  });

  const { data: driversRes, refetch: refetchDrivers } = useQuery({
    queryKey: ['drivers-select'],
    queryFn: () => driverService.getAll({ per_page: 200, mode: 'lookup' }),
  });

  const { data: vehiclesRes, refetch: refetchVehicles } = useQuery({
    queryKey: ['vehicles-select'],
    queryFn: () => vehicleService.getAll({ per_page: 200, mode: 'lookup' }),
  });

  const customers = customersRes?.data ?? [];
  const drivers: Driver[] = driversRes?.data ?? [];
  const vehicles: Vehicle[] = vehiclesRes?.data ?? [];

  // Stepper State (5 Steps: 1. Customer Account, 2. Route Slots, 3. Operating Month & Days, 4. Assignment Model & Schedule, 5. Review & Confirm)
  const [contractStep, setContractStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [bypassDriverValidation, setBypassDriverValidation] = useState(false);
  const [isUnassignedAlertOpen, setIsUnassignedAlertOpen] = useState(false);

  const [contractCustomer, setContractCustomer] = useState('');
  const [contractRateCategory, setContractRateCategory] = useState<string>(MODAL_RATE_CATEGORIES[0] || 'Trip');
  const [contractVehicleType, setContractVehicleType] = useState<string>(VEHICLE_TYPES[0] || 'Flatbed');
  const [contractBillingType, setContractBillingType] = useState<string>('');

  // Live Rate Cards Query
  const { data: rateCardsRes } = useQuery({
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
    const bNormTarget = norm(billingType);

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
      const bMatch = !bNormTarget || !rcB || rcB === bNormTarget;

      return vMatch && cMatch && bMatch;
    });
    if (exact) return exact;

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

    const laneOnly = customerRateCards.find((rc) => {
      const rcO = norm(rc.route_origin || rc.originLocation?.name);
      const rcD = norm(rc.route_destination || rc.destinationLocation?.name);
      return (rcO.includes(oNorm) || oNorm.includes(rcO)) && (rcD.includes(dNorm) || dNorm.includes(rcD));
    });

    return laneOnly || null;
  };

  // Route Slots State
  const [contractSlots, setContractSlots] = useState<ContractSlot[]>([
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

  const handleUpdateTripSlot = (id: string, updates: Partial<ContractSlot>) => {
    setContractSlots((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const nextSlot = { ...s, ...updates };

        if (('origin' in updates || 'destination' in updates) && !('billingAmount' in updates) && !('driverTripCharge' in updates)) {
          const match = getMatchingRateCard(
            nextSlot.origin,
            nextSlot.destination,
            contractVehicleType,
            contractRateCategory,
            contractBillingType
          );
          nextSlot.billingAmount = match && match.base_price ? String(match.base_price) : '';
          nextSlot.driverTripCharge = match && match.driver_payout ? String(match.driver_payout) : '';
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

  // Schedule Dates State
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [dayAssignments, setDayAssignments] = useState<Record<string, { driverId: string; vehicleId: string; tripCharge?: string; driverTripCharge?: string }>>({});

  // Assignments Mode State
  const [assignMode, setAssignMode] = useState<'single' | 'alternating'>('single');
  const [masterDriver, setMasterDriver] = useState('');
  const [masterVehicle, setMasterVehicle] = useState('');
  const [masterTripCharge, setMasterTripCharge] = useState('');
  const [masterDriverCharge, setMasterDriverCharge] = useState('');

  const [loopTeams, setLoopTeams] = useState<LoopTeam[]>([
    { id: 'A', name: 'Team A', driverId: '', vehicleId: '' },
    { id: 'B', name: 'Team B', driverId: '', vehicleId: '' },
  ]);

  const handleMasterDriverChange = (driverId: string) => {
    setMasterDriver(driverId);
    if (!driverId || driverId === 'unassigned') return;

    const selectedDriver = drivers.find((d) => d.id === driverId);
    if (!selectedDriver) return;

    const embeddedVehicle = selectedDriver.assignedVehicle && typeof selectedDriver.assignedVehicle === 'object'
      ? (selectedDriver.assignedVehicle as any)
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
            ...(match && match.driver_payout ? { driverTripCharge: String(match.driver_payout) } : {}),
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
              ...(match && match.driver_payout ? { driverTripCharge: String(match.driver_payout) } : {}),
            };
          })
        );
      }
    }
  };

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
              ? (selectedDrv.assignedVehicle as any)
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

  // Month Dates Calculation
  const monthDates = useMemo<MonthDateItem[]>(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const totalDays = new Date(year, month, 0).getDate();
    const days: MonthDateItem[] = [];

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

  useEffect(() => {
    setDayAssignments((prev) => {
      const next: Record<string, { driverId: string; vehicleId: string; tripCharge?: string; driverTripCharge?: string }> = {};
      selectedDates.forEach((date) => {
        next[date] = prev[date] || { driverId: '', vehicleId: '' };
      });
      return next;
    });
  }, [selectedDates]);

  // Generated Batch Trip Rows
  const batchTripRows = useMemo<BatchTripRow[]>(() => {
    const list: BatchTripRow[] = [];

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

  // Stepper Validation & Unlocked Helpers
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
          tripCharge: masterTripCharge || '',
          driverTripCharge: masterDriverCharge || '',
        };
      });
      return next;
    });
  };

  const applyAlternatingLoop = () => {
    setBypassDriverValidation(false);
    const newAssignments: Record<string, { driverId: string; vehicleId: string; tripCharge?: string; driverTripCharge?: string }> = {};

    batchTripRows.forEach((row, index) => {
      const teamIndex = index % loopTeams.length;
      const team = loopTeams[teamIndex];
      const drv = team.driverId;
      const veh = team.vehicleId;

      newAssignments[row.key] = {
        driverId: drv === 'unassigned' || !drv ? '' : drv,
        vehicleId: veh === 'unassigned' || !veh ? '' : veh,
        tripCharge: team.tripCharge || '',
        driverTripCharge: team.driverTripCharge || '',
      };
    });

    setDayAssignments((prev) => ({ ...prev, ...newAssignments }));
  };

  // Bulk Import Mutation
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
      queryClient.invalidateQueries({ queryKey: ['trips', 'monthly-board'] });
      toast.success(`Successfully generated ${data.imported || 0} trips!`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to generate monthly trips.');
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

        // Per-row overrides take priority, then fall back to slot-level values
        const effectiveTripCharge = assignment.tripCharge !== undefined && assignment.tripCharge !== ''
          ? assignment.tripCharge
          : slot.billingAmount;
        const effectiveDriverCharge = assignment.driverTripCharge !== undefined && assignment.driverTripCharge !== ''
          ? assignment.driverTripCharge
          : slot.driverTripCharge;

        const baseAmount = Number(effectiveTripCharge) || 0;
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

        rows.push({
          customer_id: contractCustomer,
          planned_start: slot.pickupTime ? `${date}T${slot.pickupTime}:00` : date,
          driver_id: assignment.driverId || undefined,
          vehicle_id: assignment.vehicleId || undefined,
          rate_category: contractRateCategory || undefined,
          vehicle_type: contractVehicleType || undefined,
          billing_type: contractBillingType || 'MONTHLY',
          origin: slot.origin.trim() || undefined,
          destination: destString || undefined,
          billing_amount: totalAmount > 0 ? totalAmount : undefined,
          status: 'Draft',
        });
      });
    });

    // Save Quotations for slots where saveAsQuotation is checked
    const slotsToSaveAsQuotation = contractSlots.filter(
      (slot) => slot.saveAsQuotation && Number(slot.billingAmount) > 0
    );

    if (slotsToSaveAsQuotation.length > 0 && contractCustomer) {
      slotsToSaveAsQuotation.forEach(async (slot) => {
        try {
          await quotationService.create({
            customerId: contractCustomer,
            origin_name: slot.origin.trim(),
            destination_name: slot.destination.trim(),
            rate: Number(slot.billingAmount),
            driver_payout: slot.driverTripCharge ? Number(slot.driverTripCharge) : null,
            line_type: contractRateCategory || 'SINGLE_TRIP',
            source_vehicle_label: contractVehicleType || '10 TON',
            billing_type: contractBillingType || 'MONTHLY',
            source: 'Monthly Trip Creator',
          });
          toast.success(`Quotation '${slot.origin} → ${slot.destination}' saved to Quotation ledger!`);
        } catch (err) {
          console.error('Failed to save quotation:', err);
        }
      });
    }

    executeBulkSubmit(rows);
  };


  const resetAll = () => {
    setContractStep(1);
    setSelectedDates([]);
    setDayAssignments({});
    setSubmissionResult(null);
    bulkMutation.reset();
    setBypassDriverValidation(false);
    setIsUnassignedAlertOpen(false);
  };

  const handleExit = () => {
    resetAll();
    navigate('/trips/monthly');
  };

  useFormKeyboardShortcuts({
    onSave: () => {
      if (contractStep < 5) {
        if (isStepUnlocked(contractStep + 1)) setContractStep((prev) => (prev + 1) as any);
      } else {
        handleContractSubmit();
      }
    },
    onCancel: handleExit,
  });

  const failedRows = submissionResult?.results?.filter((r) => !r.success && r.error) || [];
  const selectedCustomerObj = customers.find((c) => c.id === contractCustomer);

  return (
    <DashboardLayout active="Monthly Trips" title="Bulk Add Monthly Trips" hideBackButton={true}>
      <div className="px-2 sm:px-4 pb-2 animate-fade-in w-full h-[calc(100dvh-105px)] flex flex-col min-h-0">
        <div className="w-full flex-1 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl flex flex-col min-h-0">
          {/* Top Unified Header Bar */}
          <div className="px-4 py-2 border-b border-black/[0.06] bg-slate-50/70 dark:bg-slate-950/40 shrink-0">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              {/* TOP LEFT: Cancel / Back button */}
              <div className="flex items-center gap-2">
                {contractStep > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setContractStep((prev) => (prev - 1) as any)}
                    className="h-8 rounded-xl border border-slate-200/80 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                    Back <KbdBadge keys="Esc" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleExit}
                    className="h-8 rounded-xl border border-slate-200/80 text-xs font-bold bg-white hover:bg-slate-50 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                    Cancel <KbdBadge keys="Esc" />
                  </Button>
                )}
              </div>

              {/* CENTER: 5 Stepper Pills */}
              {!submissionResult && (
                <div className="flex items-center gap-0.5 overflow-x-auto justify-center flex-1 mx-2">
                  {[
                    { step: 1, label: '1. Customer Account', icon: User },
                    { step: 2, label: '2. Route Slots', icon: MapPin },
                    { step: 3, label: '3. Operating Month & Days', icon: Calendar },
                    { step: 4, label: '4. Assignment Model & Schedule', icon: Truck },
                    { step: 5, label: '5. Review & Confirm', icon: Sparkles },
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
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all whitespace-nowrap disabled:opacity-40 disabled:cursor-not-allowed ${
                          isActive
                            ? 'bg-brand text-white shadow-xs ring-1 ring-brand/20'
                            : !unlocked
                            ? 'bg-slate-50 text-slate-400 border border-slate-200/40 cursor-not-allowed'
                            : isPassed
                            ? 'bg-orange-50 text-brand border border-orange-200 dark:bg-orange-950/40 dark:border-orange-800 cursor-pointer'
                            : 'bg-white text-slate-500 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 hover:bg-slate-50 cursor-pointer'
                        }`}
                      >
                        <IconComp className={`w-3 h-3 shrink-0 ${isActive ? 'text-white' : isPassed ? 'text-brand' : 'text-slate-400'}`} />
                        <span>{s.label}</span>
                        {isPassed && <CheckCircle2 className="w-2.5 h-2.5 text-brand ml-0.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* TOP RIGHT: Primary Action & Close Button */}
              <div className="flex items-center gap-2">
                {!submissionResult && (
                  contractStep < 5 ? (
                    <Button
                      type="button"
                      disabled={!isStepUnlocked(contractStep + 1)}
                      onClick={() => setContractStep((prev) => (prev + 1) as any)}
                      className="h-8 px-4 rounded-xl bg-brand hover:bg-[#d13d0d] text-white font-bold text-xs shadow-xs gap-1.5 disabled:opacity-50"
                    >
                      Next Step
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      disabled={bulkMutation.isPending || batchTripRows.length === 0}
                      onClick={handleContractSubmit}
                      className="h-8 px-4 rounded-xl bg-brand hover:bg-[#d13d0d] text-white font-bold text-xs shadow-xs gap-1.5"
                    >
                      {bulkMutation.isPending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5" />
                      )}
                      Confirm & Generate ({batchTripRows.length}) <KbdBadge keys="Ctrl+S" />
                    </Button>
                  )
                )}

                <button
                  type="button"
                  onClick={handleExit}
                  className="w-8 h-8 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800 grid place-items-center transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Main Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
            {submissionResult ? (
              <div className="max-w-xl mx-auto py-8 text-center space-y-5 animate-fade-in">
                <div className="h-16 w-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-full grid place-items-center mx-auto text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-9 w-9" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                    Trips Successfully Added!
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Created {submissionResult.imported || 0} trip records for monthly execution.
                  </p>
                </div>

                {failedRows.length > 0 && (
                  <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-left text-xs space-y-1">
                    <p className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      Some warnings occurred:
                    </p>
                    <ul className="list-disc list-inside text-amber-800 dark:text-amber-300 space-y-0.5">
                      {failedRows.map((e, idx) => (
                        <li key={idx}>Row {e.row}: {e.error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {submissionResult.results && (
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 text-left max-w-xl mx-auto">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Generated Trip References
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                      {submissionResult.results
                        .filter((r) => r.success && r.ref_id)
                        .map((r, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-slate-100"
                          >
                            {r.ref_id}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-center gap-3 pt-3">
                  <Button
                    type="button"
                    onClick={handleExit}
                    className="h-10 px-5 rounded-xl bg-brand hover:bg-[#d13d0d] text-white font-bold text-xs"
                  >
                    View Monthly Board
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
            ) : (
              <>
                {contractStep === 1 && (
                  <Step1Customer
                    customers={customers}
                    contractCustomer={contractCustomer}
                    onSelectCustomer={setContractCustomer}
                    onNext={() => setContractStep(2)}
                    onCustomerCreated={refetchCustomers}
                  />
                )}

                {contractStep === 2 && (
                  <Step2RouteSlots
                    contractCustomer={contractCustomer}
                    contractRateCategory={contractRateCategory}
                    contractVehicleType={contractVehicleType}
                    contractBillingType={contractBillingType}
                    contractSlots={contractSlots}
                    onUpdateRateCategory={(cat) => setContractRateCategory(cat)}
                    onUpdateVehicleType={(v) => setContractVehicleType(v)}
                    onAddSlot={handleAddTripSlot}
                    onRemoveSlot={handleRemoveTripSlot}
                    onUpdateSlot={handleUpdateTripSlot}
                    onAddSlotIntermediate={handleAddSlotIntermediate}
                    onRemoveSlotIntermediate={handleRemoveSlotIntermediate}
                    onUpdateSlotIntermediate={handleUpdateSlotIntermediate}
                    onUpdateSlotIntermediateFee={handleUpdateSlotIntermediateFee}
                    onAddSlotReturnIntermediate={handleAddSlotReturnIntermediate}
                    onRemoveSlotReturnIntermediate={handleRemoveSlotReturnIntermediate}
                    onUpdateSlotReturnIntermediate={handleUpdateSlotReturnIntermediate}
                    onUpdateSlotReturnIntermediateFee={handleUpdateSlotReturnIntermediateFee}
                    getMatchingRateCard={getMatchingRateCard}
                    isStep2Valid={isStep2Valid}
                    onNext={() => setContractStep(3)}
                    onBack={() => setContractStep(1)}
                  />
                )}

                {contractStep === 3 && (
                  <Step3Schedule
                    selectedMonth={selectedMonth}
                    onChangeSelectedMonth={setSelectedMonth}
                    monthDates={monthDates}
                    selectedDates={selectedDates}
                    onToggleDate={toggleDate}
                    onSelectPreset={selectPreset}
                    contractSlotsCount={contractSlots.length}
                    isStep3Valid={isStep3Valid}
                    onNext={() => setContractStep(4)}
                    onBack={() => setContractStep(2)}
                  />
                )}

                {contractStep === 4 && (
                  <Step4Assignments
                    drivers={drivers}
                    vehicles={vehicles}
                    contractVehicleType={contractVehicleType}
                    assignMode={assignMode}
                    onSetAssignMode={setAssignMode}
                    masterDriver={masterDriver}
                    onMasterDriverChange={handleMasterDriverChange}
                    masterVehicle={masterVehicle}
                    onMasterVehicleChange={handleMasterVehicleChange}
                    masterTripCharge={masterTripCharge}
                    onMasterTripChargeChange={setMasterTripCharge}
                    masterDriverCharge={masterDriverCharge}
                    onMasterDriverChargeChange={setMasterDriverCharge}
                    loopTeams={loopTeams}
                    onAddLoopTeam={handleAddLoopTeam}
                    onRemoveLoopTeam={handleRemoveLoopTeam}
                    onUpdateLoopTeam={handleUpdateLoopTeam}
                    onApplyMasterToAll={applyMasterToAll}
                    onApplyAlternatingLoop={applyAlternatingLoop}
                    batchTripRows={batchTripRows}
                    contractSlots={contractSlots}
                    dayAssignments={dayAssignments}
                    onUpdateDayAssignment={(key, updates) => setDayAssignments((prev) => ({ ...prev, [key]: { ...prev[key], ...updates } }))}
                    onToggleDate={toggleDate}
                    onNext={() => setContractStep(5)}
                    onBack={() => setContractStep(3)}
                    onDriverCreated={refetchDrivers}
                    onVehicleCreated={refetchVehicles}
                    getDriverLabel={getDriverLabel}
                    getVehicleLabel={getVehicleLabel}
                  />
                )}

                {contractStep === 5 && (
                  <Step5Review
                    selectedCustomer={selectedCustomerObj}
                    contractRateCategory={contractRateCategory}
                    contractVehicleType={contractVehicleType}
                    contractBillingType={contractBillingType}
                    assignMode={assignMode}
                    contractSlots={contractSlots}
                    selectedDatesCount={selectedDates.length}
                    batchTripRows={batchTripRows}
                    dayAssignments={dayAssignments}
                    drivers={drivers}
                    vehicles={vehicles}
                    masterDriver={masterDriver}
                    masterVehicle={masterVehicle}
                    masterTripCharge={masterTripCharge}
                    masterDriverCharge={masterDriverCharge}
                    loopTeams={loopTeams}
                    isSubmitting={bulkMutation.isPending}
                    onConfirm={handleContractSubmit}
                    onBack={() => setContractStep(4)}
                    onUpdateSlot={handleUpdateTripSlot}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

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
      <PastDateTripConfirmModal
        open={pastDateModalOpen}
        onClose={() => setPastDateModalOpen(false)}
        onConfirm={handlePastDateConfirm}
        analysis={pastDateAnalysis}
        isSubmitting={bulkMutation.isPending}
      />
    </DashboardLayout>

  );
}
