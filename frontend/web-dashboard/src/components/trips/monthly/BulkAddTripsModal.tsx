import { useState, useMemo, useRef, useEffect } from 'react';
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
  MapPin,
  Truck,
  DollarSign,
  Search,
  X,
} from 'lucide-react';

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import LocationCombobox from '@/components/rate-cards/LocationCombobox';
import { customerService } from '@/services/customerService';
import { driverService, Driver } from '@/services/driverService';
import { vehicleService, Vehicle } from '@/services/vehicleService';
import { tripService, BulkImportTripRow, BulkImportResult } from '@/services/tripService';
import { VEHICLE_TYPES, RATE_CATEGORIES } from '@mercon/shared-types';
import { monthLabel, shiftMonth } from './monthlyBoardUtils';
import { parseSheet, TRIP_COLUMNS } from '@/utils/importUtils';

const REMOVED_MODAL_CATEGORIES = ['Surcharge', 'Monthly Round', 'Extra Trip/Round Trip', 'Regular Trip'];
const MODAL_RATE_CATEGORIES = RATE_CATEGORIES.filter((cat) => !REMOVED_MODAL_CATEGORIES.includes(cat)).map((cat) => (cat === 'Trip/Round Trip' ? 'Round Trip' : cat));

const isRoundTripCategory = (cat: string) => Boolean(cat) && cat.toLowerCase().includes('round');

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
    queryFn: () => driverService.getAll({ per_page: 200 }),
    enabled: isOpen,
  });

  const { data: vehiclesRes } = useQuery({
    queryKey: ['vehicles-select'],
    queryFn: () => vehicleService.getAll({ per_page: 200 }),
    enabled: isOpen,
  });

  const customers = customersRes?.data ?? [];
  const drivers: Driver[] = driversRes?.data ?? [];
  const vehicles: Vehicle[] = vehiclesRes?.data ?? [];

  // ==========================================
  // TAB 1: MONTHLY CONTRACT BATCH GENERATOR STATE
  // ==========================================
  const [contractStep, setContractStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [contractCustomer, setContractCustomer] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [contractRateCategory, setContractRateCategory] = useState<string>(MODAL_RATE_CATEGORIES[0] || 'Trip');
  const [contractVehicleType, setContractVehicleType] = useState<string>(VEHICLE_TYPES[0] || 'Flatbed');

  const [contractSlots, setContractSlots] = useState<Array<{
    id: string;
    origin: string;
    destination: string;
    pickupTime: string;
    dropoffTime: string;
    billingAmount: string;
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

          destString = `${outboundChain}${slot.destination.trim()} 🔁 [RETURN: ${returnStart} → ${returnChain}${returnEnd}]`;
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
          origin: slot.origin.trim() || undefined,
          destination: destString || undefined,
          billing_amount: totalAmount > 0 ? totalAmount : undefined,
          status: assignment.driverId && assignment.vehicleId ? 'Dispatched' : 'Draft',
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

  const handleDialogClose = () => {
    resetAll();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDialogClose()}>
      <DialogContent className="w-[94vw] max-w-5xl sm:max-w-5xl p-0 overflow-hidden bg-white border border-black/10 shadow-2xl rounded-2xl max-h-[88vh] h-[88vh] flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-black/[0.06] bg-slate-50/50 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-brand/10 grid place-items-center shrink-0">
                <Layers className="h-5 w-5 text-brand" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-bold text-[#111111]">Bulk Add Trips</DialogTitle>
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

        {/* Navigation Tabs & 5-Step Progress Pills */}
        {!submissionResult && (
          <div className="border-b border-black/[0.06] bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-1.5 px-6 pt-3 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab('contract')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'contract'
                    ? 'bg-white text-[#111111] shadow-sm border border-black/5'
                    : 'text-[#6E6E80] hover:text-[#111111]'
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5 text-brand" />
                Monthly Contract Batch
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('grid')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'grid'
                    ? 'bg-white text-[#111111] shadow-sm border border-black/5'
                    : 'text-[#6E6E80] hover:text-[#111111]'
                }`}
              >
                <Table2 className="h-3.5 w-3.5 text-blue-600" />
                Quick Grid Entry
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('file')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'file'
                    ? 'bg-white text-[#111111] shadow-sm border border-black/5'
                    : 'text-[#6E6E80] hover:text-[#111111]'
                }`}
              >
                <UploadCloud className="h-3.5 w-3.5 text-emerald-600" />
                CSV / Excel Import
              </button>
            </div>

            {/* Stepper Pills for Contract Batch */}
            {activeTab === 'contract' && (
              <div className="flex items-center gap-1.5 overflow-x-auto py-2 px-6 border-t border-black/[0.04] bg-white">
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

                  return (
                    <button
                      key={s.step}
                      type="button"
                      onClick={() => setContractStep(s.step as any)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                        isActive
                          ? 'bg-brand text-white shadow-sm ring-2 ring-brand/20'
                          : isPassed
                          ? 'bg-orange-50 text-brand border border-orange-200 hover:bg-orange-100'
                          : 'bg-slate-50 text-slate-400 border border-slate-200/80 hover:bg-slate-100 hover:text-slate-600'
                      }`}
                    >
                      <IconComp className={`w-3.5 h-3.5 ${isActive ? 'text-white' : isPassed ? 'text-brand' : 'text-slate-400'}`} />
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
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
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
                <div>
                  {/* STEP 1: CUSTOMER & CATEGORY */}
                  {contractStep === 1 && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-[#111111] flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-brand" />
                          Select Customer Account
                        </h4>
                        <p className="text-xs text-[#6E6E80]">
                          Pick the client responsible for freight billing and contracted lane rates.
                        </p>
                      </div>

                      {/* Frequent Shippers Cards */}
                      <div className="space-y-2">
                        <span className="text-[11px] font-bold text-[#9898A4] uppercase tracking-wider block">
                          ⚡ Frequent Shippers
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                          {customers.slice(0, 4).map((c, idx) => {
                            const isSelected = contractCustomer === c.id;
                            const initials = c.name.substring(0, 2).toUpperCase();
                            return (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => setContractCustomer(c.id)}
                                className={`p-3.5 rounded-2xl border text-left transition-all flex flex-col justify-between h-24 ${
                                  isSelected
                                    ? 'bg-orange-50/70 border-brand ring-2 ring-brand/20 shadow-sm'
                                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`w-8 h-8 rounded-xl font-bold text-xs grid place-items-center ${
                                    isSelected ? 'bg-brand text-white' : 'bg-slate-100 text-slate-700'
                                  }`}>
                                    {initials}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-md">
                                    Key {idx + 1}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-[#111111] truncate">{c.name}</p>
                                  <p className="text-[10px] text-slate-400 font-medium">Commercial Account</p>
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
                        <Select value={contractCustomer} onValueChange={setContractCustomer}>
                          <SelectTrigger className="h-10 rounded-xl border-black/10 text-xs font-semibold bg-white">
                            <SelectValue placeholder="-- Select customer --" />
                          </SelectTrigger>
                          <SelectContent>
                            {customers.map((c) => (
                              <SelectItem key={c.id} value={c.id} className="text-xs">
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* STEP 2: ROUTE & TRIPS SLOTS */}
                  {contractStep === 2 && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-black/[0.06] pb-3">
                        <div className="space-y-1">
                          <h4 className="text-sm font-bold text-[#111111] flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-brand" />
                            Configure Route Locations & Trip Slots
                          </h4>
                          <p className="text-xs text-[#6E6E80]">
                            Select pickup/dropoff stops, intermediate locations, pickup/drop-off times, and trip category.
                          </p>
                        </div>

                        {/* Trip Category Selector */}
                        <div className="flex items-center gap-2 bg-orange-50/70 border border-orange-200/80 px-3 py-1.5 rounded-xl">
                          <span className="text-xs font-bold text-slate-700 whitespace-nowrap">
                            Trip Category:
                          </span>
                          <Select value={contractRateCategory} onValueChange={setContractRateCategory}>
                            <SelectTrigger className="h-8 w-44 rounded-lg bg-white border-orange-200 text-xs font-bold text-[#111111]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MODAL_RATE_CATEGORIES.map((cat) => (
                                <SelectItem key={cat} value={cat} className="text-xs">
                                  {cat}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Trip Slots Section */}
                      <div className="space-y-5">
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
                            className="h-7 text-[11px] font-bold text-brand border-orange-200 bg-orange-50/60 hover:bg-orange-100 shadow-2xs gap-1"
                            onClick={handleAddTripSlot}
                          >
                            <Plus className="w-3.5 h-3.5 text-brand" />
                            Add Another Trip Slot
                          </Button>
                        </div>

                        {contractSlots.map((slot, slotIdx) => (
                          <div
                            key={slot.id}
                            className="p-5 rounded-2xl border border-slate-200/90 bg-white shadow-2xs space-y-4"
                          >
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[#111111] bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded-lg">
                                  Trip Slot #{slotIdx + 1}
                                </span>
                                {slot.isOvernight && (
                                  <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                    <Moon className="w-3 h-3 fill-indigo-600" /> Overnight (+1 Day)
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[11px] font-bold text-brand border-orange-200 bg-white hover:bg-orange-50 gap-1 px-2.5"
                                  onClick={() => handleAddSlotIntermediate(slot.id)}
                                >
                                  <Plus className="w-3.5 h-3.5 text-brand" />
                                  Add Stop
                                </Button>
                                {contractSlots.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveTripSlot(slot.id)}
                                    className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                                    title="Remove trip slot"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>

                            {/* Conditional Rendering for Round Trip (4 Sections) vs Standard 1-Way Trip */}
                            {isRoundTripCategory(contractRateCategory) ? (
                              <div className="space-y-5 pt-1">
                                {/* LEG 1: OUTBOUND JOURNEY */}
                                <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3">
                                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-bold">
                                        Leg 1: Outbound Journey
                                      </Badge>
                                      <span className="text-xs font-bold text-slate-800">Origin → Destination</span>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-6 text-[10px] font-bold text-brand border-orange-200 bg-white hover:bg-orange-50 gap-1 px-2"
                                      onClick={() => handleAddSlotIntermediate(slot.id)}
                                    >
                                      <Plus className="w-3 h-3 text-brand" />
                                      Add Outbound Stop
                                    </Button>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* SECTION 1: 🟢 Outbound Pickup (Start) */}
                                    <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/30 overflow-hidden space-y-3">
                                      <div className="p-2.5 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200 shrink-0" />
                                          <span className="text-xs font-bold text-emerald-950">1. Outbound Pickup (Start)</span>
                                        </div>
                                        <span className="text-[10px] font-semibold text-emerald-700 bg-white border border-emerald-200/80 px-2 py-0.5 rounded-md">
                                          Starting Point
                                        </span>
                                      </div>

                                      <div className="p-3 space-y-3">
                                        <div className="space-y-1">
                                          <label className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">
                                            Outbound Pickup Location *
                                          </label>
                                          <LocationCombobox
                                            value={slot.origin}
                                            onChange={(locName) => {
                                              handleUpdateTripSlot(slot.id, {
                                                origin: locName,
                                                returnDestination: slot.returnDestination || locName,
                                              });
                                            }}
                                            placeholder="Search starting origin (e.g. Riyadh)..."
                                            triggerClassName="h-10 border-emerald-200 bg-white shadow-2xs"
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          <label className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5 text-emerald-600" /> Outbound Pickup Time *
                                          </label>
                                          <input
                                            type="time"
                                            value={slot.pickupTime}
                                            onChange={(e) => handleUpdateTripSlot(slot.id, { pickupTime: e.target.value })}
                                            className="w-full h-10 px-3 rounded-xl border border-emerald-200 text-xs font-semibold focus:outline-none focus:border-emerald-500 bg-white cursor-pointer"
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    {/* SECTION 2: 🟠 Outbound Dropoff (Destination) */}
                                    <div className="rounded-2xl border border-orange-200/80 bg-orange-50/30 overflow-hidden space-y-3">
                                      <div className="p-2.5 bg-orange-50/80 border-b border-orange-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="w-2.5 h-2.5 rounded-full bg-brand ring-2 ring-orange-200 shrink-0" />
                                          <span className="text-xs font-bold text-orange-950">2. Outbound Dropoff (Destination)</span>
                                        </div>
                                        <span className="text-[10px] font-semibold text-orange-700 bg-white border border-orange-200/80 px-2 py-0.5 rounded-md">
                                          Delivery Point
                                        </span>
                                      </div>

                                      <div className="p-3 space-y-3">
                                        <div className="space-y-1">
                                          <label className="text-[11px] font-bold text-orange-900 uppercase tracking-wider block">
                                            Outbound Dropoff Location *
                                          </label>
                                          <LocationCombobox
                                            value={slot.destination}
                                            onChange={(locName) => {
                                              handleUpdateTripSlot(slot.id, {
                                                destination: locName,
                                                returnOrigin: slot.returnOrigin || locName,
                                              });
                                            }}
                                            placeholder="Search delivery destination (e.g. Dammam)..."
                                            triggerClassName="h-10 border-orange-200 bg-white shadow-2xs"
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          <label className="text-[11px] font-bold text-orange-900 uppercase tracking-wider flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5 text-brand" /> Outbound Drop-off Time *
                                          </label>
                                          <input
                                            type="time"
                                            value={slot.dropoffTime}
                                            onChange={(e) => handleUpdateTripSlot(slot.id, { dropoffTime: e.target.value })}
                                            className="w-full h-10 px-3 rounded-xl border border-orange-200 text-xs font-semibold focus:outline-none focus:border-brand bg-white cursor-pointer"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Outbound Intermediate Stops & Fees */}
                                  {slot.intermediateLocations.length > 0 && (
                                    <div className="space-y-3 pt-2 border-t border-slate-200/60">
                                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                                        Outbound Intermediate Stops & Fees ({slot.intermediateLocations.length})
                                      </span>
                                      <div className="space-y-2.5">
                                        {slot.intermediateLocations.map((loc, idx) => (
                                          <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200 space-y-2">
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                                                Outbound Stop #{idx + 1}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveSlotIntermediate(slot.id, idx)}
                                                className="text-slate-400 hover:text-rose-600 transition-colors text-[11px] font-semibold"
                                              >
                                                Remove Stop
                                              </button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                              <div className="sm:col-span-2">
                                                <LocationCombobox
                                                  value={loc}
                                                  onChange={(locName) => handleUpdateSlotIntermediate(slot.id, idx, locName)}
                                                  placeholder={`Search Outbound Stop #${idx + 1}...`}
                                                  triggerClassName="h-9 border-slate-200 bg-white"
                                                />
                                              </div>
                                              <div className="relative">
                                                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">SAR</span>
                                                <input
                                                  type="number"
                                                  value={slot.intermediateStopFees?.[idx] || ''}
                                                  onChange={(e) => handleUpdateSlotIntermediateFee(slot.id, idx, e.target.value)}
                                                  placeholder="Stop fee e.g. 150"
                                                  className="w-full h-9 pl-11 pr-3 rounded-xl border border-slate-200 text-xs font-bold text-right focus:outline-none focus:border-brand"
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
                                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-200/80 space-y-3">
                                  <div className="flex items-center justify-between border-b border-indigo-100 pb-2">
                                    <div className="flex items-center gap-2">
                                      <Badge className="bg-indigo-600 text-white border-indigo-600 text-[10px] font-bold flex items-center gap-1">
                                        <RefreshCw className="w-2.5 h-2.5" />
                                        Leg 2: Return Journey (The Loop Back)
                                      </Badge>
                                      <span className="text-xs font-bold text-indigo-950">Destination → Starting Home Origin</span>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-6 text-[10px] font-bold text-indigo-700 border-indigo-200 bg-white hover:bg-indigo-50 gap-1 px-2"
                                      onClick={() => handleAddSlotReturnIntermediate(slot.id)}
                                    >
                                      <Plus className="w-3 h-3 text-indigo-600" />
                                      Add Return Stop
                                    </Button>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* SECTION 3: 🔵 Return Pickup (Reload Point) */}
                                    <div className="rounded-2xl border border-blue-200/80 bg-blue-50/30 overflow-hidden space-y-3">
                                      <div className="p-2.5 bg-blue-50/80 border-b border-blue-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-2 ring-blue-200 shrink-0" />
                                          <span className="text-xs font-bold text-blue-950">3. Return Pickup (Reload Point)</span>
                                        </div>
                                        <span className="text-[10px] font-semibold text-blue-700 bg-white border border-blue-200/80 px-2 py-0.5 rounded-md">
                                          Reload Hub
                                        </span>
                                      </div>

                                      <div className="p-3 space-y-3">
                                        <div className="space-y-1">
                                          <label className="text-[11px] font-bold text-blue-900 uppercase tracking-wider block">
                                            Return Pickup Location *
                                          </label>
                                          <LocationCombobox
                                            value={slot.returnOrigin || slot.destination}
                                            onChange={(locName) => handleUpdateTripSlot(slot.id, { returnOrigin: locName })}
                                            placeholder="Search return reload origin..."
                                            triggerClassName="h-10 border-blue-200 bg-white shadow-2xs"
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          <label className="text-[11px] font-bold text-blue-900 uppercase tracking-wider flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5 text-blue-600" /> Return Pickup Time *
                                          </label>
                                          <input
                                            type="time"
                                            value={slot.returnPickupTime || '16:00'}
                                            onChange={(e) => handleUpdateTripSlot(slot.id, { returnPickupTime: e.target.value })}
                                            className="w-full h-10 px-3 rounded-xl border border-blue-200 text-xs font-semibold focus:outline-none focus:border-blue-500 bg-white cursor-pointer"
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    {/* SECTION 4: 🟣 Return Dropoff (Final Home Destination) */}
                                    <div className="rounded-2xl border border-purple-200/80 bg-purple-50/30 overflow-hidden space-y-3">
                                      <div className="p-2.5 bg-purple-50/80 border-b border-purple-100 flex items-center justify-between flex-wrap gap-2">
                                        <div className="flex items-center gap-2">
                                          <span className="w-2.5 h-2.5 rounded-full bg-purple-600 ring-2 ring-purple-200 shrink-0" />
                                          <span className="text-xs font-bold text-purple-950">4. Return Dropoff (Final Home)</span>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => handleUpdateTripSlot(slot.id, { returnIsOvernight: !slot.returnIsOvernight })}
                                          className={`text-[10px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-md transition-all whitespace-nowrap ${
                                            slot.returnIsOvernight
                                              ? 'bg-indigo-600 text-white shadow-2xs'
                                              : 'bg-white text-indigo-900 border border-indigo-200 hover:bg-indigo-50'
                                          }`}
                                          title="Toggle Return Overnight (+1 Day)"
                                        >
                                          <Moon className={`w-3 h-3 ${slot.returnIsOvernight ? 'text-white fill-white' : 'text-indigo-600'}`} />
                                          {slot.returnIsOvernight ? '🌙 +1 Day' : '+1 Day'}
                                        </button>
                                      </div>

                                      <div className="p-3 space-y-3">
                                        <div className="space-y-1">
                                          <label className="text-[11px] font-bold text-purple-900 uppercase tracking-wider flex items-center justify-between">
                                            <span>Return Dropoff (Home) *</span>
                                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                              🔁 Auto-Linked Home
                                            </span>
                                          </label>
                                          <LocationCombobox
                                            value={slot.returnDestination || slot.origin}
                                            onChange={(locName) => handleUpdateTripSlot(slot.id, { returnDestination: locName })}
                                            placeholder="Search final home destination..."
                                            triggerClassName="h-10 border-purple-200 bg-white shadow-2xs"
                                          />
                                        </div>

                                        <div className="space-y-1">
                                          <label className="text-[11px] font-bold text-purple-900 uppercase tracking-wider flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5 text-purple-600" /> Return Drop-off Time *
                                          </label>
                                          <input
                                            type="time"
                                            value={slot.returnDropoffTime || '22:00'}
                                            onChange={(e) => handleUpdateTripSlot(slot.id, { returnDropoffTime: e.target.value })}
                                            className={`w-full h-10 px-3 rounded-xl border text-xs font-semibold focus:outline-none focus:border-purple-500 cursor-pointer ${
                                              slot.returnIsOvernight
                                                ? 'border-indigo-300 bg-indigo-50/30 text-indigo-950'
                                                : 'border-purple-200 bg-white'
                                            }`}
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Return Intermediate Stops & Fees */}
                                  {(slot.returnIntermediateLocations || []).length > 0 && (
                                    <div className="space-y-3 pt-2 border-t border-indigo-100">
                                      <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider block">
                                        Return Intermediate Stops & Fees ({(slot.returnIntermediateLocations || []).length})
                                      </span>
                                      <div className="space-y-2.5">
                                        {(slot.returnIntermediateLocations || []).map((loc, idx) => (
                                          <div key={idx} className="p-3 rounded-xl bg-white border border-indigo-200 space-y-2">
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                                                <MapPin className="w-3.5 h-3.5 text-purple-600" />
                                                Return Stop #{idx + 1}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveSlotReturnIntermediate(slot.id, idx)}
                                                className="text-slate-400 hover:text-rose-600 transition-colors text-[11px] font-semibold"
                                              >
                                                Remove Stop
                                              </button>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                              <div className="sm:col-span-2">
                                                <LocationCombobox
                                                  value={loc}
                                                  onChange={(locName) => handleUpdateSlotReturnIntermediate(slot.id, idx, locName)}
                                                  placeholder={`Search Return Stop #${idx + 1}...`}
                                                  triggerClassName="h-9 border-indigo-200 bg-white"
                                                />
                                              </div>
                                              <div className="relative">
                                                <span className="absolute left-3 top-2 text-xs font-bold text-slate-400">SAR</span>
                                                <input
                                                  type="number"
                                                  value={slot.returnIntermediateStopFees?.[idx] || ''}
                                                  onChange={(e) => handleUpdateSlotReturnIntermediateFee(slot.id, idx, e.target.value)}
                                                  placeholder="Stop fee e.g. 150"
                                                  className="w-full h-9 pl-11 pr-3 rounded-xl border border-indigo-200 text-xs font-bold text-right focus:outline-none focus:border-indigo-600"
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
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {/* 🟢 PICKUP STOP CARD (ORIGIN) */}
                                  <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/30 overflow-hidden space-y-3">
                                    <div className="p-3 bg-emerald-50/80 border-b border-emerald-100 flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200 shrink-0" />
                                        <span className="text-xs font-bold text-emerald-950">Pickup Stop (Origin)</span>
                                      </div>
                                      <span className="text-[10px] font-semibold text-emerald-700 bg-white border border-emerald-200/80 px-2 py-0.5 rounded-md">
                                        Rate Hub & Maps
                                      </span>
                                    </div>

                                    <div className="p-3.5 space-y-3">
                                      <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center justify-between">
                                          <span>Pickup Location *</span>
                                          <span className="text-[10px] text-slate-400 font-normal">Google Maps & Rate Cards</span>
                                        </label>
                                        <LocationCombobox
                                          value={slot.origin}
                                          onChange={(locName) => handleUpdateTripSlot(slot.id, { origin: locName })}
                                          placeholder="Search or select pickup location..."
                                          triggerClassName="h-10 border-emerald-200 bg-white shadow-2xs"
                                        />
                                      </div>

                                      <div className="space-y-1.5 pt-1">
                                        <label className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1">
                                          <Clock className="w-3.5 h-3.5 text-emerald-600" /> Pickup Time *
                                        </label>
                                        <input
                                          type="time"
                                          value={slot.pickupTime}
                                          onChange={(e) => handleUpdateTripSlot(slot.id, { pickupTime: e.target.value })}
                                          className="w-full h-10 px-3 rounded-xl border border-emerald-200 text-xs font-semibold focus:outline-none focus:border-emerald-500 bg-white cursor-pointer"
                                        />
                                      </div>
                                    </div>
                                  </div>

                                  {/* 🟠 DROPOFF STOP CARD (DESTINATION) */}
                                  <div className="rounded-2xl border border-orange-200/80 bg-orange-50/30 overflow-hidden space-y-3">
                                    <div className="p-3 bg-orange-50/80 border-b border-orange-100 flex items-center justify-between flex-wrap gap-2">
                                      <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-brand ring-2 ring-orange-200 shrink-0" />
                                        <span className="text-xs font-bold text-orange-950">Dropoff Stop (Destination)</span>
                                      </div>

                                      {Boolean(contractRateCategory && contractRateCategory.toLowerCase().includes('2 vehicles')) && (
                                        <div className="flex items-center gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateTripSlot(slot.id, { isOvernight: !slot.isOvernight })}
                                            className={`text-[10px] font-bold flex items-center gap-1 px-2 py-0.5 rounded-md transition-all whitespace-nowrap ${
                                              slot.isOvernight
                                                ? 'bg-indigo-600 text-white shadow-2xs'
                                                : 'bg-white text-indigo-900 border border-indigo-200 hover:bg-indigo-50'
                                            }`}
                                            title="Toggle Overnight / Next-Day Return trip (+1 Day)"
                                          >
                                            <Moon className={`w-3 h-3 ${slot.isOvernight ? 'text-white fill-white' : 'text-indigo-600'}`} />
                                            {slot.isOvernight ? '🌙 +1 Day' : '+1 Day'}
                                          </button>
                                        </div>
                                      )}
                                    </div>

                                    <div className="p-3.5 space-y-3">
                                      <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold text-orange-900 uppercase tracking-wider flex items-center justify-between">
                                          <span>Dropoff Location *</span>
                                          <span className="text-[10px] text-slate-400 font-normal">Google Maps & Rate Cards</span>
                                        </label>
                                        <LocationCombobox
                                          value={slot.destination}
                                          onChange={(locName) => handleUpdateTripSlot(slot.id, { destination: locName })}
                                          placeholder="Search or select dropoff location..."
                                          triggerClassName="h-10 bg-white shadow-2xs border-orange-200"
                                        />
                                      </div>

                                      <div className="space-y-1.5 pt-1">
                                        <label className="text-[11px] font-bold text-orange-900 uppercase tracking-wider flex items-center gap-1">
                                          <Clock className="w-3.5 h-3.5 text-brand" /> Drop-off Time *
                                        </label>
                                        <input
                                          type="time"
                                          value={slot.dropoffTime}
                                          onChange={(e) => handleUpdateTripSlot(slot.id, { dropoffTime: e.target.value })}
                                          className={`w-full h-10 px-3 rounded-xl border text-xs font-semibold focus:outline-none focus:border-brand cursor-pointer ${
                                            slot.isOvernight
                                              ? 'border-indigo-300 bg-indigo-50/30 text-indigo-950'
                                              : 'border-orange-200 bg-white'
                                          }`}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Intermediate Stop Cards */}
                                {slot.intermediateLocations.length > 0 && (
                                  <div className="space-y-3 pt-3 border-t border-slate-100">
                                    <span className="text-[11px] font-bold text-[#6E6E80] uppercase tracking-wider block">
                                      Intermediate Stop Locations & Fees
                                    </span>
                                    <div className="space-y-3">
                                      {slot.intermediateLocations.map((loc, idx) => (
                                        <div key={idx} className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3">
                                          <div className="flex items-center justify-between border-b border-slate-200/60 pb-2">
                                            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                              <MapPin className="w-3.5 h-3.5 text-blue-600" />
                                              Intermediate Stop #{idx + 1}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveSlotIntermediate(slot.id, idx)}
                                              className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 flex items-center gap-1 text-[11px] font-semibold"
                                              title="Remove stop"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                              Remove Stop
                                            </button>
                                          </div>

                                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            <div className="sm:col-span-2 space-y-1">
                                              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                                                Stop Location *
                                              </label>
                                              <LocationCombobox
                                                value={loc}
                                                onChange={(locName) => handleUpdateSlotIntermediate(slot.id, idx, locName)}
                                                placeholder={`Search or select Intermediate Stop #${idx + 1}...`}
                                                triggerClassName="h-10 border-slate-200 bg-white shadow-2xs"
                                              />
                                            </div>

                                            <div className="space-y-1">
                                              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                                                <DollarSign className="w-3 h-3 text-emerald-600" /> Additional Stop Fee (SAR)
                                              </label>
                                              <div className="relative">
                                                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">SAR</span>
                                                <input
                                                  type="number"
                                                  value={slot.intermediateStopFees?.[idx] || ''}
                                                  onChange={(e) => handleUpdateSlotIntermediateFee(slot.id, idx, e.target.value)}
                                                  placeholder="e.g. 150"
                                                  className="w-full h-10 pl-11 pr-3 rounded-xl border border-slate-200 text-xs font-bold text-right focus:outline-none focus:border-brand bg-white shadow-2xs"
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

                            {/* Billing Amount */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
                              <div className="space-y-1">
                                <span className="text-[11px] font-bold text-[#6E6E80] uppercase tracking-wider block">
                                  Contract Billing Rate
                                </span>
                                <p className="text-[11px] text-slate-400">Rate per single trip run in SAR</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-700">SAR</span>
                                <input
                                  type="number"
                                  value={slot.billingAmount}
                                  onChange={(e) => handleUpdateTripSlot(slot.id, { billingAmount: e.target.value })}
                                  placeholder="e.g. 3500"
                                  className="w-36 h-9 px-3 rounded-xl border border-black/10 text-xs font-bold focus:outline-none focus:border-brand bg-white text-right"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* STEP 3: SCHEDULE & DAYS */}
                  {contractStep === 3 && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-[#111111] flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-brand" />
                          Select Operating Month & Days
                        </h4>
                        <p className="text-xs text-[#6E6E80]">
                          Choose the target month and select the operational days for this monthly contract batch.
                        </p>
                      </div>

                      {/* Month Switcher & Day Selector */}
                      <div className="p-4 rounded-2xl bg-slate-50 border border-black/[0.06] space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
                              className="h-8 rounded-lg border-black/10 px-2 text-xs"
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
                              className="h-8 rounded-lg border-black/10 px-2 text-xs"
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
                        <div className="grid grid-cols-7 gap-1.5 pt-2">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                            <div key={d} className="text-center text-[10px] font-bold text-[#9898A4] py-1">
                              {d}
                            </div>
                          ))}

                          {Array.from({ length: monthDates[0]?.dayOfWeek || 0 }).map((_, i) => (
                            <div key={`pad-${i}`} className="h-10 rounded-xl opacity-0 pointer-events-none" />
                          ))}

                          {monthDates.map((item) => {
                            const isSelected = selectedDates.includes(item.dateStr);
                            return (
                              <button
                                key={item.dateStr}
                                type="button"
                                onClick={() => toggleDate(item.dateStr)}
                                className={`h-11 rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all relative ${
                                  isSelected
                                    ? 'bg-brand text-white shadow-sm ring-2 ring-brand/20'
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

                        <div className="text-xs text-[#6E6E80] pt-1 text-center font-medium">
                          Selected: <span className="font-bold text-[#111111]">{selectedDates.length} days</span> × {contractSlots.length} slot(s) = <span className="font-bold text-brand">{selectedDates.length * contractSlots.length} total trips</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* STEP 4: DRIVER & TRUCK ASSIGNMENTS */}
                  {contractStep === 4 && (
                    <div className="space-y-5 animate-fade-in">
                      <div className="space-y-1">
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
                        <div className="p-3.5 rounded-2xl bg-indigo-50/90 border border-indigo-200 flex items-center justify-between flex-wrap gap-3 text-xs text-indigo-950 font-bold shadow-2xs">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-indigo-600 text-white border-indigo-600 text-[10px] font-bold flex items-center gap-1">
                              <RefreshCw className="w-3 h-3" /> 2-Vehicle Shuttle Mode
                            </Badge>
                            <span>Driver A & Truck A (Outbound) ↔ Driver B & Truck B (Return Shuttle Loop)</span>
                          </div>
                          <span className="text-[11px] text-indigo-700 font-semibold bg-white border border-indigo-200 px-2.5 py-1 rounded-lg">
                            Long-Distance 12+ Hr Rest Rotation Enabled
                          </span>
                        </div>
                      )}

                      {/* Quick Apply Master Toolbar */}
                      <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100/90 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
                            <span className="text-xs font-bold text-indigo-950">
                              Batch Assign Drivers & Trucks
                            </span>
                          </div>

                          <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-indigo-200/80 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => setAssignMode('single')}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                                assignMode === 'single'
                                  ? 'bg-indigo-600 text-white shadow-2xs'
                                  : 'text-indigo-900 hover:bg-indigo-50'
                              }`}
                            >
                              Same Driver Every Day
                            </button>
                            <button
                              type="button"
                              onClick={() => setAssignMode('alternating')}
                              className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1 ${
                                assignMode === 'alternating'
                                  ? 'bg-indigo-600 text-white shadow-2xs'
                                  : 'text-indigo-900 hover:bg-indigo-50'
                              }`}
                            >
                              <RefreshCw className="w-3 h-3" />
                              🔄 Alternating A/B Loop Rotation
                            </button>
                          </div>
                        </div>

                        {assignMode === 'single' ? (
                          <div className="flex items-center gap-2 flex-wrap pt-1">
                            <Select value={masterDriver} onValueChange={setMasterDriver}>
                              <SelectTrigger className="h-8 w-48 rounded-lg bg-white border-indigo-200 text-xs font-medium">
                                <SelectValue placeholder="Select driver" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                                {drivers.map((d) => (
                                  <SelectItem key={d.id} value={d.id} className="text-xs">
                                    {d.first_name} {d.last_name} ({d.status})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Select value={masterVehicle} onValueChange={setMasterVehicle}>
                              <SelectTrigger className="h-8 w-48 rounded-lg bg-white border-indigo-200 text-xs font-medium">
                                <SelectValue placeholder="Select vehicle" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                                {vehicles.map((v) => (
                                  <SelectItem key={v.id} value={v.id} className="text-xs">
                                    {v.plate_number} ({v.asset_type})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <Select value={contractVehicleType} onValueChange={setContractVehicleType}>
                              <SelectTrigger className="h-8 w-44 rounded-lg bg-white border-indigo-200 text-xs font-bold text-[#111111]" title="Vehicle Type">
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

                            <Button
                              size="sm"
                              onClick={applyMasterToAll}
                              className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3"
                            >
                              Apply to All {batchTripRows.length} Trips
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2 pt-1 border-t border-indigo-100">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Driver/Truck A */}
                              <div className="p-2.5 rounded-xl bg-white border border-indigo-200 space-y-2">
                                <span className="text-[11px] font-bold text-indigo-900 block">
                                  🔵 Team A (Odd Trips: 1, 3, 5...)
                                </span>
                                <div className="grid grid-cols-2 gap-2">
                                  <Select value={loopDriverA} onValueChange={setLoopDriverA}>
                                    <SelectTrigger className="h-8 w-full rounded-lg border-indigo-200 text-[11px]">
                                      <SelectValue placeholder="Driver A" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                                      {drivers.map((d) => (
                                        <SelectItem key={d.id} value={d.id} className="text-xs">
                                          {d.first_name} {d.last_name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  <Select value={loopVehicleA} onValueChange={setLoopVehicleA}>
                                    <SelectTrigger className="h-8 w-full rounded-lg border-indigo-200 text-[11px]">
                                      <SelectValue placeholder="Truck A" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                                      {vehicles.map((v) => (
                                        <SelectItem key={v.id} value={v.id} className="text-xs">
                                          {v.plate_number}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {/* Driver/Truck B */}
                              <div className="p-2.5 rounded-xl bg-white border border-indigo-200 space-y-2">
                                <span className="text-[11px] font-bold text-indigo-900 block">
                                  🟠 Team B (Even Trips: 2, 4, 6...)
                                </span>
                                <div className="grid grid-cols-2 gap-2">
                                  <Select value={loopDriverB} onValueChange={setLoopDriverB}>
                                    <SelectTrigger className="h-8 w-full rounded-lg border-indigo-200 text-[11px]">
                                      <SelectValue placeholder="Driver B" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                                      {drivers.map((d) => (
                                        <SelectItem key={d.id} value={d.id} className="text-xs">
                                          {d.first_name} {d.last_name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  <Select value={loopVehicleB} onValueChange={setLoopVehicleB}>
                                    <SelectTrigger className="h-8 w-full rounded-lg border-indigo-200 text-[11px]">
                                      <SelectValue placeholder="Truck B" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="unassigned">-- Unassigned --</SelectItem>
                                      {vehicles.map((v) => (
                                        <SelectItem key={v.id} value={v.id} className="text-xs">
                                          {v.plate_number}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-end pt-1">
                              <Button
                                size="sm"
                                onClick={applyAlternatingLoop}
                                className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-4 gap-1.5"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                Apply Alternating A/B Rotation ({batchTripRows.length} Trips)
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Date Breakdown Table */}
                      <div className="rounded-xl border border-black/[0.08] overflow-hidden max-h-[320px] overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-[11px] font-bold text-[#6E6E80] uppercase tracking-wider border-b border-black/[0.06] sticky top-0 z-10">
                            <tr>
                              <th className="px-4 py-2.5">Date & Slot</th>
                              <th className="px-4 py-2.5">Assigned Driver</th>
                              <th className="px-4 py-2.5">Assigned Truck</th>
                              <th className="px-4 py-2.5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/[0.04]">
                            {batchTripRows.map((rowItem) => {
                              const currentAssignment = dayAssignments[rowItem.key] || { driverId: '', vehicleId: '' };

                              return (
                                <tr key={rowItem.key} className="hover:bg-slate-50/50">
                                  <td className="px-4 py-2 font-bold text-[#111111] whitespace-nowrap">
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
                                  </td>
                                  <td className="px-4 py-2">
                                    <Select
                                      value={currentAssignment.driverId || 'unassigned'}
                                      onValueChange={(val) =>
                                        setDayAssignments((prev) => ({
                                          ...prev,
                                          [rowItem.key]: {
                                            ...prev[rowItem.key],
                                            driverId: val === 'unassigned' ? '' : val,
                                          },
                                        }))
                                      }
                                    >
                                      <SelectTrigger className="h-8 w-52 rounded-lg border-black/10 text-xs font-medium">
                                        <SelectValue placeholder="Assign driver..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="unassigned">-- Unassigned (Assign Later) --</SelectItem>
                                        {drivers.map((d) => (
                                          <SelectItem key={d.id} value={d.id} className="text-xs">
                                            {d.first_name} {d.last_name}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="px-4 py-2">
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
                                      <SelectTrigger className="h-8 w-52 rounded-lg border-black/10 text-xs font-medium">
                                        <SelectValue placeholder="Assign truck..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="unassigned">-- Unassigned (Assign Later) --</SelectItem>
                                        {vehicles.map((v) => (
                                          <SelectItem key={v.id} value={v.id} className="text-xs">
                                            {v.plate_number} ({v.asset_type})
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </td>
                                  <td className="px-4 py-2 text-right">
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
                  {contractStep === 5 && (
                    <div className="space-y-6 animate-fade-in">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-[#111111] flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-brand" />
                          Review & Generate Monthly Batch
                        </h4>
                        <p className="text-xs text-[#6E6E80]">
                          Confirm all contract batch parameters before generating trips on the Monthly Board.
                        </p>
                      </div>

                      {/* Batch Summary KPI Card */}
                      <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-slate-200/60">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Customer</span>
                            <span className="text-sm font-bold text-[#111111]">
                              {customers.find((c) => c.id === contractCustomer)?.name || 'Not Selected'}
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Trips</span>
                            <span className="text-sm font-bold text-brand">
                              {batchTripRows.length} Trips
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Operating Days</span>
                            <span className="text-sm font-bold text-[#111111]">{selectedDates.length} Days</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Daily Trip Slots</span>
                            <span className="text-sm font-bold text-[#111111]">{contractSlots.length} Slot(s) / Day</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Trip Category</span>
                            <span className="text-xs font-semibold text-slate-700">{contractRateCategory}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Vehicle Type</span>
                            <span className="text-xs font-semibold text-slate-700">{contractVehicleType}</span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Overnight Trips</span>
                            <span className="text-xs font-semibold text-indigo-600 flex items-center gap-1">
                              <Moon className="w-3 h-3 fill-indigo-600" />
                              {contractSlots.filter((s) => s.isOvernight).length} Slot(s) Marked +1 Day
                            </span>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Assignment Mode</span>
                            <span className="text-xs font-semibold text-slate-700">
                              {assignMode === 'alternating' ? '🔄 Alternating A/B Rotation' : 'Single Master Apply'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex items-center justify-end pt-3 border-t border-black/[0.06]">
                        <Button
                          disabled={bulkMutation.isPending || batchTripRows.length === 0}
                          onClick={handleContractSubmit}
                          className="h-10 rounded-xl px-6 text-xs font-bold bg-brand hover:bg-[#d13d0d] text-white shadow-none disabled:opacity-50"
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
                      </div>
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
                  <div className="rounded-xl border border-black/[0.08] overflow-x-auto max-h-[380px] overflow-y-auto">
                    <table className="w-full text-left text-xs min-w-[760px]">
                      <thead className="bg-slate-50 text-[10px] font-bold text-[#6E6E80] uppercase tracking-wider border-b border-black/[0.06] sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2.5 w-8">#</th>
                          <th className="px-3 py-2.5">Customer *</th>
                          <th className="px-3 py-2.5">Date *</th>
                          <th className="px-3 py-2.5">Driver</th>
                          <th className="px-3 py-2.5">Vehicle</th>
                          <th className="px-3 py-2.5">Category</th>
                          <th className="px-3 py-2.5">Amount</th>
                          <th className="px-3 py-2.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-black/[0.04]">
                        {gridRows.map((row, idx) => (
                          <tr key={row.id} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2 text-[#9898A4] font-medium">{idx + 1}</td>
                            <td className="px-3 py-2">
                              <select
                                value={row.customerId}
                                onChange={(e) => updateGridRow(row.id, { customerId: e.target.value })}
                                className="w-36 h-8 px-2 rounded-lg border border-black/10 text-xs font-medium bg-white focus:outline-none focus:border-brand"
                              >
                                {customers.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="date"
                                value={row.date}
                                onChange={(e) => updateGridRow(row.id, { date: e.target.value })}
                                className="h-8 px-2 rounded-lg border border-black/10 text-xs font-medium bg-white focus:outline-none focus:border-brand"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={row.driverId}
                                onChange={(e) => updateGridRow(row.id, { driverId: e.target.value })}
                                className="w-36 h-8 px-2 rounded-lg border border-black/10 text-xs font-medium bg-white focus:outline-none focus:border-brand"
                              >
                                <option value="">-- Unassigned --</option>
                                {drivers.map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.first_name} {d.last_name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={row.vehicleId}
                                onChange={(e) => updateGridRow(row.id, { vehicleId: e.target.value })}
                                className="w-36 h-8 px-2 rounded-lg border border-black/10 text-xs font-medium bg-white focus:outline-none focus:border-brand"
                              >
                                <option value="">-- Unassigned --</option>
                                {vehicles.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.plate_number}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={row.rateCategory}
                                onChange={(e) => updateGridRow(row.id, { rateCategory: e.target.value })}
                                className="w-28 h-8 px-2 rounded-lg border border-black/10 text-xs font-medium bg-white focus:outline-none focus:border-brand"
                              >
                                {MODAL_RATE_CATEGORIES.map((cat) => (
                                  <option key={cat} value={cat}>
                                    {cat}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                value={row.amount}
                                onChange={(e) => updateGridRow(row.id, { amount: e.target.value })}
                                placeholder="SAR"
                                className="w-20 h-8 px-2 rounded-lg border border-black/10 text-xs font-medium bg-white focus:outline-none focus:border-brand"
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
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
                  <div className="flex items-center justify-between pt-3 border-t border-black/[0.06]">
                    <p className="text-xs text-[#6E6E80]">
                      Total rows: <span className="font-bold text-[#111111]">{gridRows.length}</span>
                    </p>
                    <Button
                      disabled={bulkMutation.isPending || gridRows.length === 0}
                      onClick={handleGridSubmit}
                      className="h-10 rounded-xl px-6 text-xs font-bold bg-brand hover:bg-[#d13d0d] text-white shadow-none disabled:opacity-50"
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
                <div className="space-y-5">
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
                      className="border-2 border-dashed border-black/10 hover:border-brand/50 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-slate-50"
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
                      <FileSpreadsheet className="h-10 w-10 text-[#9898A4] mx-auto mb-3" />
                      <p className="text-xs font-bold text-[#111111]">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-[11px] text-[#9898A4] mt-1">
                        CSV (.csv) or Microsoft Excel (.xlsx) files
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-black/[0.08] bg-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileSpreadsheet className="h-6 w-6 text-brand" />
                        <div>
                          <p className="text-xs font-bold text-[#111111]">{importedFile.name}</p>
                          <p className="text-[11px] text-[#6E6E80]">
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
                        className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        Remove
                      </Button>
                    </div>
                  )}

                  {parseError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {parseError}
                    </div>
                  )}

                  {/* Parsed Preview Table */}
                  {parsedRows.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-[#9898A4] uppercase tracking-wider">
                        Parsed File Preview ({parsedRows.length} Rows)
                      </p>
                      <div className="rounded-xl border border-black/[0.08] overflow-hidden max-h-[220px] overflow-y-auto">
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
                  <div className="flex items-center justify-between pt-3 border-t border-black/[0.06]">
                    <p className="text-xs text-[#6E6E80]">
                      {parsedRows.length > 0 ? `${parsedRows.length} trips ready for import` : 'Upload a valid file to proceed'}
                    </p>
                    <Button
                      disabled={bulkMutation.isPending || parsedRows.length === 0}
                      onClick={handleFileSubmit}
                      className="h-10 rounded-xl px-6 text-xs font-bold bg-brand hover:bg-[#d13d0d] text-white shadow-none disabled:opacity-50"
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
          <div className="p-4 border-t border-black/[0.06] bg-slate-50/80 flex items-center justify-between shrink-0">
            <div>
              {contractStep > 1 ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setContractStep((prev) => (prev - 1) as any)}
                  className="h-10 rounded-xl border-black/10 text-xs font-semibold bg-white hover:bg-slate-50"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleDialogClose}
                  className="h-10 text-xs font-semibold text-slate-500 hover:text-slate-900"
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
                    (contractStep === 1 && !contractCustomer) ||
                    (contractStep === 3 && selectedDates.length === 0)
                  }
                  onClick={() => setContractStep((prev) => (prev + 1) as any)}
                  className="h-10 rounded-xl px-6 text-xs font-bold bg-brand hover:bg-[#d13d0d] text-white shadow-none disabled:opacity-50 gap-1"
                >
                  Next Step: {contractStep === 1 ? 'Route Slots' : contractStep === 2 ? 'Schedule' : contractStep === 3 ? 'Assignments' : 'Review'}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={bulkMutation.isPending || batchTripRows.length === 0}
                  onClick={handleContractSubmit}
                  className="h-10 rounded-xl px-6 text-xs font-bold bg-brand hover:bg-[#d13d0d] text-white shadow-none disabled:opacity-50"
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
      </DialogContent>
    </Dialog>
  );
}
