import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarRange, Layers, FileSpreadsheet, Plus, X, ArrowRight,
  Sparkles, CheckCircle2, ChevronLeft, ChevronRight, Clock, MapPin,
  Truck, User, DollarSign, Calculator, AlertCircle, Trash2, Tag, Plane, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { customerService } from '@/services/customerService';
import { driverService } from '@/services/driverService';
import { vehicleService } from '@/services/vehicleService';
import { tripService } from '@/services/tripService';
import { VEHICLE_TYPES } from '@mercon/shared-types';

export const BULK_RATE_CATEGORIES = [
  'Trip',
  'Trip / Round Trip',
  'Monthly Round',
  'Extra Trip / Round Trip',
  'Daily Local',
  'Airport',
  'Regular Trip',
  'Monthly (Round Trip – 2 Vehicles)',
] as const;

export type BulkRateCategory = (typeof BULK_RATE_CATEGORIES)[number];

export interface AdditionalCharge {
  id: string;
  name: string;
  amount: number;
}

export interface DateAssignment {
  dateStr: string; // YYYY-MM-DD
  driverId: string;
  vehicleId: string;
}

interface BulkAddTripsModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMonth?: string; // YYYY-MM
}

const PRESET_CHARGES = [
  'Loading',
  'Unloading',
  'Waiting',
  'Driver Allowance',
  'Custom',
];

export default function BulkAddTripsModal({
  isOpen,
  onClose,
  defaultMonth,
}: BulkAddTripsModalProps) {
  const queryClient = useQueryClient();

  // Active Modal Tab
  const [activeTab, setActiveTab] = useState<'batch' | 'grid' | 'import'>('batch');

  // Step 1 vs Step 2 (Review)
  const [step, setStep] = useState<1 | 2>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Top Shared Fields
  const [customerId, setCustomerId] = useState('');
  const [rateCategory, setRateCategory] = useState<BulkRateCategory>('Trip');
  const [vehicleType, setVehicleType] = useState<string>(VEHICLE_TYPES[0]);

  // Dynamic Workflow Fields
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [returnOrigin, setReturnOrigin] = useState('');
  const [returnDestination, setReturnDestination] = useState('');
  
  // Daily Local fields
  const [operatingArea, setOperatingArea] = useState('Greater Area');
  const [startTime, setStartTime] = useState('08:00');
  const [shiftDurationHours, setShiftDurationHours] = useState(8);

  // Airport fields
  const [airportName, setAirportName] = useState('RUH - King Khalid International Airport');
  const [flightRef, setFlightRef] = useState('');

  // 2-Vehicles category fields
  const [secondaryVehicleType, setSecondaryVehicleType] = useState<string>(VEHICLE_TYPES[0]);

  // Date Scheduler State
  const [monthKey, setMonthKey] = useState<string>(() => {
    if (defaultMonth) return defaultMonth;
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  });

  const [selectedDates, setSelectedDates] = useState<Set<string>>(new Set());

  // Financial State
  const [basePrice, setBasePrice] = useState<number>(3500);
  const [additionalCharges, setAdditionalCharges] = useState<AdditionalCharge[]>([]);

  // Step 2 Per-Date Driver/Vehicle Assignments
  const [dateAssignments, setDateAssignments] = useState<Record<string, { driverId: string; vehicleId: string }>>({});

  // Reset/sync step when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      if (defaultMonth) setMonthKey(defaultMonth);
    }
  }, [isOpen, defaultMonth]);

  // Handle Rate Category changes -> Safely reset category-specific fields
  const handleRateCategoryChange = (newCat: BulkRateCategory) => {
    setRateCategory(newCat);
    if (newCat === 'Daily Local') {
      if (!origin) setOrigin('Riyadh Central Hub');
    } else if (newCat === 'Airport') {
      if (!origin) setOrigin('Riyadh City Center');
    }
  };

  // Queries for select dropdowns
  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 100 }),
    enabled: isOpen,
  });

  const { data: driversRes } = useQuery({
    queryKey: ['drivers-select'],
    queryFn: () => driverService.getAll({ per_page: 100 }),
    enabled: isOpen && step === 2,
  });

  const { data: vehiclesRes } = useQuery({
    queryKey: ['vehicles-select'],
    queryFn: () => vehicleService.getAll({ per_page: 100 }),
    enabled: isOpen && step === 2,
  });

  const customerList = customersRes?.data ?? [];
  const driverList = driversRes?.data ?? [];
  const vehicleList = vehiclesRes?.data ?? [];

  // Generate days array for the selected monthKey (YYYY-MM)
  const calendarDays = useMemo(() => {
    const [yStr, mStr] = monthKey.split('-');
    const year = parseInt(yStr, 10);
    const monthIndex = parseInt(mStr, 10) - 1; // 0-indexed

    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, monthIndex, 1).getDay(); // 0 = Sun

    const days: { dateStr: string; dayNum: number; dayOfWeek: number }[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${monthKey}-${dStr}`;
      const dayOfWeek = new Date(year, monthIndex, d).getDay();
      days.push({ dateStr, dayNum: d, dayOfWeek });
    }
    return { days, firstDayOfWeek, year, monthIndex, daysInMonth };
  }, [monthKey]);

  // Set default selected dates to Sun-Thu on month change if empty
  useEffect(() => {
    if (selectedDates.size === 0 && calendarDays.days.length > 0) {
      const defaults = new Set<string>();
      calendarDays.days.forEach(({ dateStr, dayOfWeek }) => {
        if (dayOfWeek >= 0 && dayOfWeek <= 4) { // Sun(0) to Thu(4)
          defaults.add(dateStr);
        }
      });
      setSelectedDates(defaults);
    }
  }, [calendarDays]);

  // Quick Preset Selection Handlers
  const handleSelectPreset = (preset: 'sun-thu' | 'mon-wed-fri' | 'all' | 'clear') => {
    const next = new Set<string>();
    if (preset === 'sun-thu') {
      calendarDays.days.forEach(({ dateStr, dayOfWeek }) => {
        if (dayOfWeek >= 0 && dayOfWeek <= 4) next.add(dateStr);
      });
    } else if (preset === 'mon-wed-fri') {
      calendarDays.days.forEach(({ dateStr, dayOfWeek }) => {
        if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) next.add(dateStr);
      });
    } else if (preset === 'all') {
      calendarDays.days.forEach(({ dateStr }) => next.add(dateStr));
    }
    setSelectedDates(next);
  };

  const toggleDate = (dateStr: string) => {
    const next = new Set(selectedDates);
    if (next.has(dateStr)) {
      next.delete(dateStr);
    } else {
      next.add(dateStr);
    }
    setSelectedDates(next);
  };

  // Additional Charges Handlers
  const handleAddCharge = () => {
    setAdditionalCharges((prev) => [
      ...prev,
      { id: String(Date.now()), name: 'Loading', amount: 100 },
    ]);
  };

  const handleRemoveCharge = (id: string) => {
    setAdditionalCharges((prev) => prev.filter((c) => c.id !== id));
  };

  const handleUpdateCharge = (id: string, key: 'name' | 'amount', val: any) => {
    setAdditionalCharges((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [key]: val } : c))
    );
  };

  // Financial Calculations
  const additionalTotal = useMemo(
    () => additionalCharges.reduce((sum, c) => sum + (Number(c.amount) || 0), 0),
    [additionalCharges]
  );
  const totalPerTrip = (Number(basePrice) || 0) + additionalTotal;

  // Total Trips Generated Multiplier (2 vehicles category requires 2 trips per date)
  const isTwoVehicles = rateCategory === 'Monthly (Round Trip – 2 Vehicles)';
  const tripsCountPerDate = isTwoVehicles ? 2 : 1;
  const totalGeneratedTrips = selectedDates.size * tripsCountPerDate;
  const totalContractValue = totalGeneratedTrips * totalPerTrip;

  // Month navigation
  const shiftMonth = (delta: number) => {
    const [yStr, mStr] = monthKey.split('-');
    let year = parseInt(yStr, 10);
    let month = parseInt(mStr, 10) + delta;
    if (month > 12) {
      month = 1;
      year += 1;
    } else if (month < 1) {
      month = 12;
      year -= 1;
    }
    const nextKey = `${year}-${String(month).padStart(2, '0')}`;
    setMonthKey(nextKey);
    setSelectedDates(new Set()); // reset selected dates for new month
  };

  // Month Label
  const monthName = useMemo(() => {
    const [yStr, mStr] = monthKey.split('-');
    const date = new Date(parseInt(yStr, 10), parseInt(mStr, 10) - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  }, [monthKey]);

  // Proceed to Step 2 (Review)
  const handleProceedToReview = () => {
    if (!customerId) {
      toast.error('Please select a Customer / Company');
      return;
    }
    if (selectedDates.size === 0) {
      toast.error('Please select at least 1 date for the monthly schedule');
      return;
    }

    // Initialize per-date assignments state
    const sortedDates = Array.from(selectedDates).sort();
    const initialAssign: Record<string, { driverId: string; vehicleId: string }> = {};
    sortedDates.forEach((dStr) => {
      initialAssign[dStr] = { driverId: '', vehicleId: '' };
    });
    setDateAssignments(initialAssign);

    setStep(2);
  };

  // Submit / Generate Trips
  const handleGenerateTrips = async () => {
    if (!customerId) return;
    setIsSubmitting(true);

    try {
      const sortedDates = Array.from(selectedDates).sort();
      const payloads = [];

      for (const dStr of sortedDates) {
        const assign = dateAssignments[dStr] || { driverId: '', vehicleId: '' };
        const plannedStartIso = new Date(`${dStr}T08:00:00`).toISOString();

        // Build Stops based on Rate Category
        const stops = [];
        if (rateCategory === 'Trip / Round Trip' || rateCategory === 'Monthly Round' || rateCategory === 'Extra Trip / Round Trip') {
          stops.push(
            { stop_type: 'Pickup', lat: 24.7136, lng: 46.6753, location_name: origin || 'Pickup Origin' },
            { stop_type: 'Dropoff', lat: 21.5433, lng: 39.1728, location_name: destination || 'Destination' },
            { stop_type: 'Dropoff', lat: 24.7136, lng: 46.6753, location_name: returnDestination || origin || 'Return Origin' }
          );
        } else if (rateCategory === 'Airport') {
          stops.push(
            { stop_type: 'Pickup', lat: 24.7136, lng: 46.6753, location_name: origin || 'Pickup Location' },
            { stop_type: 'Dropoff', lat: 24.9576, lng: 46.6988, location_name: airportName }
          );
        } else if (rateCategory === 'Daily Local') {
          stops.push(
            { stop_type: 'Pickup', lat: 24.7136, lng: 46.6753, location_name: origin || 'Start Location' },
            { stop_type: 'Dropoff', lat: 24.7136, lng: 46.6753, location_name: operatingArea }
          );
        } else {
          // One-way / Regular Trip
          stops.push(
            { stop_type: 'Pickup', lat: 24.7136, lng: 46.6753, location_name: origin || 'Pickup Origin' },
            { stop_type: 'Dropoff', lat: 21.5433, lng: 39.1728, location_name: destination || 'Destination' }
          );
        }

        // Primary vehicle payload
        payloads.push({
          customer_id: customerId,
          driver_id: assign.driverId || undefined,
          vehicle_id: assign.vehicleId || undefined,
          planned_start: plannedStartIso,
          billing_amount: totalPerTrip,
          trip_charges: Number(basePrice) || 0,
          vehicle_type: vehicleType,
          rate_category: rateCategory,
          status: 'Draft' as const,
          stops,
        });

        // If 2-vehicles requirement category, generate second vehicle payload
        if (isTwoVehicles) {
          payloads.push({
            customer_id: customerId,
            driver_id: undefined,
            vehicle_id: undefined,
            planned_start: plannedStartIso,
            billing_amount: totalPerTrip,
            trip_charges: Number(basePrice) || 0,
            vehicle_type: secondaryVehicleType || vehicleType,
            rate_category: rateCategory,
            status: 'Draft' as const,
            stops,
          });
        }
      }

      // Create trips sequentially
      let createdCount = 0;
      for (const payload of payloads) {
        await tripService.create(payload as any);
        createdCount++;
      }

      toast.success(`Successfully generated ${createdCount} trips for ${monthName}!`);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to generate monthly trips batch');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl sm:max-w-4xl p-0 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl">
        
        {/* Modal Header */}
        <DialogHeader className="p-5 sm:px-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#E8450F]/10 text-[#E8450F] grid place-items-center shrink-0">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
                    Bulk Add Trips
                  </DialogTitle>
                  <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 text-[10px] font-bold px-2 py-0.5">
                    Monthly Planning
                  </Badge>
                </div>
                <DialogDescription className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Generate committed contract trips across the month with per-day driver assignments, use quick grid entry, or import via CSV.
                </DialogDescription>
              </div>
            </div>

            {/* Step Counter Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold bg-white dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <span className={step === 1 ? "text-[#E8450F]" : "text-slate-400"}>1. Configure</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
              <span className={step === 2 ? "text-[#E8450F]" : "text-slate-400"}>2. Review & Generate</span>
            </div>
          </div>

          {/* Workflow Tabs */}
          <div className="flex items-center gap-1 mt-4 p-1 bg-slate-200/60 dark:bg-slate-800 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('batch')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'batch'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <CalendarRange className="w-3.5 h-3.5 text-[#E8450F]" />
              Monthly Contract Batch
            </button>

            <button
              onClick={() => setActiveTab('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Quick Grid Entry
            </button>

            <button
              onClick={() => setActiveTab('import')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'import'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
              CSV / Excel Import
            </button>
          </div>
        </DialogHeader>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:px-6 max-h-[72vh] overflow-y-auto space-y-6">
          {activeTab !== 'batch' ? (
            /* Quick Grid / Import Placeholder Tab View */
            <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600">
                {activeTab === 'grid' ? <Sparkles className="w-6 h-6" /> : <FileSpreadsheet className="w-6 h-6" />}
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {activeTab === 'grid' ? 'Quick Grid Entry Mode' : 'CSV / Excel Batch Upload'}
              </h4>
              <p className="text-xs text-slate-500 max-w-sm">
                {activeTab === 'grid'
                  ? 'Fast spreadsheet-style entry for quick multi-row trip creation.'
                  : 'Upload your bulk trip schedule spreadsheet directly to import lanes.'}
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab('batch')}
                className="mt-2 text-xs font-bold"
              >
                Switch to Monthly Contract Batch
              </Button>
            </div>
          ) : step === 1 ? (
            /* STEP 1: CONFIGURATION WORKFLOW */
            <>
              {/* Top Shared Form Section */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
                
                {/* Customer Selector */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Customer / Company <span className="text-[#E8450F]">*</span>
                  </Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger className="h-9 text-xs font-semibold bg-white dark:bg-slate-900 rounded-lg">
                      <SelectValue placeholder="Select Customer..." />
                    </SelectTrigger>
                    <SelectContent align="start" className="max-h-56">
                      {customerList.map((c) => (
                        <SelectItem key={c.id} value={c.id} className="text-xs font-medium">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Rate Category Dropdown (Trip Template Picker) */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Rate Category <span className="text-[#E8450F]">*</span>
                  </Label>
                  <Select
                    value={rateCategory}
                    onValueChange={(v) => handleRateCategoryChange(v as BulkRateCategory)}
                  >
                    <SelectTrigger className="h-9 text-xs font-bold bg-white dark:bg-slate-900 rounded-lg border-indigo-200 text-indigo-900 dark:text-indigo-200">
                      <SelectValue placeholder="Select Category..." />
                    </SelectTrigger>
                    <SelectContent align="start" className="max-h-64">
                      {BULK_RATE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-xs font-medium">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Vehicle Type Selector */}
                <div className="space-y-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    Vehicle Type <span className="text-[#E8450F]">*</span>
                  </Label>
                  <Select value={vehicleType} onValueChange={setVehicleType}>
                    <SelectTrigger className="h-9 text-xs font-semibold bg-white dark:bg-slate-900 rounded-lg">
                      <SelectValue placeholder="Select Vehicle Type..." />
                    </SelectTrigger>
                    <SelectContent align="start" className="max-h-56">
                      {VEHICLE_TYPES.map((vt) => (
                        <SelectItem key={vt} value={vt} className="text-xs font-medium">
                          {vt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Dynamic Workflow Template Section */}
              <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-[#E8450F]" />
                    <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      Workflow Template: {rateCategory}
                    </span>
                  </div>
                  
                  {/* Category Visual Route Preview */}
                  {(rateCategory === 'Trip / Round Trip' || rateCategory === 'Monthly Round' || rateCategory === 'Monthly (Round Trip – 2 Vehicles)') && (
                    <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 text-[10px] font-mono font-bold">
                      Round Trip Movement: {origin || 'Origin'} → {destination || 'Destination'} → {returnDestination || origin || 'Origin'}
                    </Badge>
                  )}
                </div>

                {/* Render Template Specific Fields */}
                {rateCategory === 'Trip' && (
                  /* Standard One-Way Workflow */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pickup / Origin Location</Label>
                      <Input
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        placeholder="e.g. Riyadh Sorting Center"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Destination Location</Label>
                      <Input
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="e.g. Jeddah Warehouse Port"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                )}

                {rateCategory === 'Trip / Round Trip' && (
                  /* Round Trip Workflow */
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Outbound Pickup (Origin)</Label>
                        <Input
                          value={origin}
                          onChange={(e) => setOrigin(e.target.value)}
                          placeholder="e.g. Riyadh Sorting Center"
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Outbound Destination</Label>
                        <Input
                          value={destination}
                          onChange={(e) => setDestination(e.target.value)}
                          placeholder="e.g. Jeddah Port"
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Return Pickup</Label>
                        <Input
                          value={returnOrigin}
                          onChange={(e) => setReturnOrigin(e.target.value)}
                          placeholder="e.g. Jeddah Port (Same as Outbound Dest)"
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Return Destination</Label>
                        <Input
                          value={returnDestination}
                          onChange={(e) => setReturnDestination(e.target.value)}
                          placeholder="e.g. Riyadh Sorting Center"
                          className="h-9 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {rateCategory === 'Monthly Round' && (
                  /* Monthly Recurring Round Trip Workflow */
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Starting Location</Label>
                      <Input
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        placeholder="e.g. Dammam Logistics Yard"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Destination</Label>
                      <Input
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="e.g. Riyadh Central"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Return Location</Label>
                      <Input
                        value={returnDestination}
                        onChange={(e) => setReturnDestination(e.target.value)}
                        placeholder="e.g. Dammam Logistics Yard"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                )}

                {rateCategory === 'Extra Trip / Round Trip' && (
                  /* Extra Trip Workflow */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Extra Pickup Location</Label>
                      <Input
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        placeholder="e.g. Riyadh Facility"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Extra Destination Location</Label>
                      <Input
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="e.g. Medina Warehouse"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                )}

                {rateCategory === 'Daily Local' && (
                  /* Daily Local Vehicle Operating Workflow */
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Start Location / Depot</Label>
                      <Input
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        placeholder="e.g. Riyadh Central Yard"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Local Operating Zone</Label>
                      <Input
                        value={operatingArea}
                        onChange={(e) => setOperatingArea(e.target.value)}
                        placeholder="e.g. Greater Riyadh Area"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Daily Shift Duration</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="h-9 text-xs"
                        />
                        <span className="text-xs text-slate-400 font-bold">for</span>
                        <Input
                          type="number"
                          value={shiftDurationHours}
                          onChange={(e) => setShiftDurationHours(Number(e.target.value))}
                          placeholder="8"
                          className="h-9 text-xs w-16 text-center font-bold"
                        />
                        <span className="text-xs text-slate-500 font-medium">hrs</span>
                      </div>
                    </div>
                  </div>
                )}

                {rateCategory === 'Airport' && (
                  /* Airport Transfer Movement Workflow */
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pickup Location</Label>
                      <Input
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        placeholder="e.g. City Cargo Hub"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Airport & Terminal</Label>
                      <Input
                        value={airportName}
                        onChange={(e) => setAirportName(e.target.value)}
                        placeholder="e.g. RUH - King Khalid Intl Airport"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Flight / Cargo Manifest Ref</Label>
                      <Input
                        value={flightRef}
                        onChange={(e) => setFlightRef(e.target.value)}
                        placeholder="e.g. SV-304 / AWB-908"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                )}

                {rateCategory === 'Regular Trip' && (
                  /* Regular Lightweight Trip Workflow */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Pickup Location</Label>
                      <Input
                        value={origin}
                        onChange={(e) => setOrigin(e.target.value)}
                        placeholder="e.g. Dammam Port"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Destination Location</Label>
                      <Input
                        value={destination}
                        onChange={(e) => setDestination(e.target.value)}
                        placeholder="e.g. Jubail Plant"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                )}

                {rateCategory === 'Monthly (Round Trip – 2 Vehicles)' && (
                  /* 2 Vehicles Monthly Contract Workflow */
                  <div className="space-y-3">
                    <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs text-amber-900 dark:text-amber-300 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>This monthly contract requirement will automatically generate <strong>2 vehicles</strong> per scheduled date.</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Vehicle 1 Tonnage</Label>
                        <Select value={vehicleType} onValueChange={setVehicleType}>
                          <SelectTrigger className="h-9 text-xs font-semibold bg-white dark:bg-slate-900 rounded-lg">
                            <SelectValue placeholder="Vehicle 1 Type" />
                          </SelectTrigger>
                          <SelectContent align="start">
                            {VEHICLE_TYPES.map((vt) => (
                              <SelectItem key={vt} value={vt} className="text-xs">
                                {vt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Vehicle 2 Tonnage</Label>
                        <Select value={secondaryVehicleType} onValueChange={setSecondaryVehicleType}>
                          <SelectTrigger className="h-9 text-xs font-semibold bg-white dark:bg-slate-900 rounded-lg">
                            <SelectValue placeholder="Vehicle 2 Type" />
                          </SelectTrigger>
                          <SelectContent align="start">
                            {VEHICLE_TYPES.map((vt) => (
                              <SelectItem key={vt} value={vt} className="text-xs">
                                {vt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Starting Location</Label>
                        <Input value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="e.g. Riyadh Hub" className="h-9 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Destination Location</Label>
                        <Input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Jeddah Port" className="h-9 text-xs" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Return Location</Label>
                        <Input value={returnDestination} onChange={(e) => setReturnDestination(e.target.value)} placeholder="e.g. Riyadh Hub" className="h-9 text-xs" />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Monthly Schedule Calendar Picker Section */}
              <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  {/* Month Stepper */}
                  <div className="flex items-center gap-2">
                    <CalendarRange className="w-4 h-4 text-[#E8450F]" />
                    <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      Select Month & Days:
                    </span>
                    <div className="flex items-center gap-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 ml-2">
                      <button onClick={() => shiftMonth(-1)} className="p-0.5 text-slate-500 hover:text-slate-900" title="Previous Month">
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 px-1 font-mono">
                        {monthName}
                      </span>
                      <button onClick={() => shiftMonth(1)} className="p-0.5 text-slate-500 hover:text-slate-900" title="Next Month">
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Preset Quick Buttons */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleSelectPreset('sun-thu')}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                    >
                      Sun–Thu
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset('mon-wed-fri')}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                    >
                      Mon, Wed, Fri
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset('all')}
                      className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100"
                    >
                      All Days
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectPreset('clear')}
                      className="px-2 py-1 rounded-lg text-[11px] font-bold text-slate-400 hover:text-slate-600"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Calendar Days Grid */}
                <div className="grid grid-cols-7 gap-1.5 text-center">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((dayLabel) => (
                    <span key={dayLabel} className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 py-1">
                      {dayLabel}
                    </span>
                  ))}

                  {/* Leading Empty Cells */}
                  {Array.from({ length: calendarDays.firstDayOfWeek }).map((_, idx) => (
                    <div key={`empty-${idx}`} className="h-9 rounded-lg bg-slate-50/50 dark:bg-slate-900/30 opacity-30" />
                  ))}

                  {/* Month Days Grid Cells */}
                  {calendarDays.days.map(({ dateStr, dayNum }) => {
                    const isSelected = selectedDates.has(dateStr);
                    return (
                      <button
                        key={dateStr}
                        type="button"
                        onClick={() => toggleDate(dateStr)}
                        className={`h-9 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center cursor-pointer border ${
                          isSelected
                            ? 'bg-[#E8450F] text-white border-[#E8450F] shadow-2xs scale-[1.02]'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <span>{dayNum}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Dynamic Trips Generation Counter Badge */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-[#E8450F]" />
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Scheduled Dates: <strong className="text-slate-900 dark:text-slate-100">{selectedDates.size} dates</strong> selected in {monthName}
                    </span>
                  </div>
                  <Badge className="bg-[#E8450F] text-white text-xs font-extrabold px-3 py-1 shadow-2xs">
                    {totalGeneratedTrips} {totalGeneratedTrips === 1 ? 'trip' : 'trips'} will be generated
                  </Badge>
                </div>
              </div>

              {/* Rate & Additional Charges Section */}
              <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      Rate & Additional Charges
                    </span>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddCharge}
                    className="h-7 text-[11px] font-bold gap-1 border-slate-200"
                  >
                    <Plus className="w-3 h-3 text-emerald-600" />
                    Add Charge
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Base Billing Rate Input */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Base Rate Per Trip (SAR) <span className="text-[#E8450F]">*</span>
                    </Label>
                    <Input
                      type="number"
                      value={basePrice}
                      onChange={(e) => setBasePrice(Number(e.target.value))}
                      placeholder="3500"
                      className="h-9 text-xs font-mono font-bold"
                    />
                  </div>

                  {/* Additional Charges List */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Additional Charges ({additionalCharges.length})
                    </Label>
                    {additionalCharges.length === 0 ? (
                      <p className="text-xs text-slate-400 italic pt-1">
                        No additional charges added. Click "+ Add Charge" for loading, waiting, driver allowance, etc.
                      </p>
                    ) : (
                      <div className="space-y-1.5">
                        {additionalCharges.map((charge) => (
                          <div key={charge.id} className="flex items-center gap-2">
                            <Select
                              value={PRESET_CHARGES.includes(charge.name) ? charge.name : 'Custom'}
                              onValueChange={(val) => handleUpdateCharge(charge.id, 'name', val === 'Custom' ? 'Custom Charge' : val)}
                            >
                              <SelectTrigger className="h-8 text-xs font-medium w-36">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent align="start">
                                {PRESET_CHARGES.map((p) => (
                                  <SelectItem key={p} value={p} className="text-xs">
                                    {p}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {!PRESET_CHARGES.includes(charge.name) && (
                              <Input
                                value={charge.name}
                                onChange={(e) => handleUpdateCharge(charge.id, 'name', e.target.value)}
                                placeholder="Charge label"
                                className="h-8 text-xs flex-1"
                              />
                            )}

                            <Input
                              type="number"
                              value={charge.amount}
                              onChange={(e) => handleUpdateCharge(charge.id, 'amount', Number(e.target.value))}
                              placeholder="SAR"
                              className="h-8 text-xs w-24 font-mono font-bold"
                            />

                            <button
                              type="button"
                              onClick={() => handleRemoveCharge(charge.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                              title="Remove Charge"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Total Summary Calculation Bar */}
                <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex items-center gap-4">
                    <span>Base Rate: <strong className="text-slate-900 dark:text-slate-100">SAR {basePrice.toLocaleString()}</strong></span>
                    <span>+</span>
                    <span>Additional: <strong className="text-slate-900 dark:text-slate-100">SAR {additionalTotal.toLocaleString()}</strong></span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-bold">Total Rate / Trip:</span>
                    <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-300">
                      SAR {totalPerTrip.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 1 Footer Action Bar */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <Button variant="ghost" size="sm" onClick={onClose} className="text-xs font-bold text-slate-500">
                  Cancel
                </Button>

                <Button
                  size="sm"
                  onClick={handleProceedToReview}
                  className="h-10 px-5 text-xs font-bold bg-[#E8450F] hover:bg-[#d13d0d] rounded-xl shadow-xs gap-1.5"
                >
                  <span>Review Monthly Plan</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            /* STEP 2: PREVIEW / REVIEW BEFORE GENERATING */
            <div className="space-y-5">
              {/* Contract Summary Review Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white space-y-4 shadow-lg">
                <div className="flex items-center justify-between border-b border-slate-700 pb-3">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-[#E8450F] text-white text-xs font-extrabold px-2.5 py-0.5">
                      Review Monthly Plan
                    </Badge>
                    <span className="text-xs text-slate-300 font-medium">
                      Confirm configuration before trip generation
                    </span>
                  </div>

                  <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-xs font-mono font-bold">
                    {totalGeneratedTrips} Trips To Create
                  </Badge>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Customer</span>
                    <strong className="text-slate-100 text-sm font-bold">
                      {customerList.find((c) => c.id === customerId)?.name || 'Selected Customer'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Trip Category</span>
                    <span className="text-indigo-300 font-semibold">{rateCategory}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Vehicle Type</span>
                    <span className="text-slate-200 font-mono font-bold">
                      {vehicleType} {isTwoVehicles ? `+ ${secondaryVehicleType} (2 Trucks)` : ''}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Route</span>
                    <span className="text-emerald-400 font-bold truncate block">
                      {origin || 'Origin'} → {destination || 'Destination'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/80 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-4 text-slate-300 font-mono">
                    <span>Base: SAR {basePrice.toLocaleString()}</span>
                    <span>+</span>
                    <span>Add-ons: SAR {additionalTotal.toLocaleString()}</span>
                    <span>=</span>
                    <span className="text-emerald-400 font-extrabold text-sm">SAR {totalPerTrip.toLocaleString()} / trip</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-bold">Total Contract Value:</span>
                    <span className="text-base font-extrabold text-emerald-400 font-mono">
                      SAR {totalContractValue.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Per-Date Driver & Vehicle Pre-Assignment List */}
              <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                      Driver & Vehicle Assignments (Optional — Or Assign Later)
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Leave unassigned to assign drivers on dispatch day
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {Array.from(selectedDates).sort().map((dStr) => {
                    const dateObj = new Date(`${dStr}T00:00:00`);
                    const dateFormatted = dateObj.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
                    const assign = dateAssignments[dStr] || { driverId: '', vehicleId: '' };

                    return (
                      <div key={dStr} className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700">
                        <div className="flex items-center gap-2 min-w-[140px]">
                          <CalendarRange className="w-3.5 h-3.5 text-[#E8450F]" />
                          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 font-mono">
                            {dateFormatted}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-1 flex-wrap justify-end">
                          {/* Driver Select */}
                          <Select
                            value={assign.driverId || 'unassigned'}
                            onValueChange={(val) => setDateAssignments((prev) => ({
                              ...prev,
                              [dStr]: { ...prev[dStr], driverId: val === 'unassigned' ? '' : val }
                            }))}
                          >
                            <SelectTrigger className="h-8 text-xs font-medium w-44 bg-white dark:bg-slate-900">
                              <SelectValue placeholder="-- Unassigned (Assign Later) --" />
                            </SelectTrigger>
                            <SelectContent align="start" className="max-h-48">
                              <SelectItem value="unassigned" className="text-xs italic text-slate-400">
                                -- Unassigned (Assign Later) --
                              </SelectItem>
                              {driverList.map((dr) => (
                                <SelectItem key={dr.id} value={dr.id} className="text-xs">
                                  {dr.first_name} {dr.last_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Vehicle Select */}
                          <Select
                            value={assign.vehicleId || 'unassigned'}
                            onValueChange={(val) => setDateAssignments((prev) => ({
                              ...prev,
                              [dStr]: { ...prev[dStr], vehicleId: val === 'unassigned' ? '' : val }
                            }))}
                          >
                            <SelectTrigger className="h-8 text-xs font-medium w-40 bg-white dark:bg-slate-900">
                              <SelectValue placeholder="-- Unassigned --" />
                            </SelectTrigger>
                            <SelectContent align="start" className="max-h-48">
                              <SelectItem value="unassigned" className="text-xs italic text-slate-400">
                                -- Unassigned --
                              </SelectItem>
                              {vehicleList.map((vh) => (
                                <SelectItem key={vh.id} value={vh.id} className="text-xs">
                                  {vh.plate_number} ({vh.asset_type || 'Truck'})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step 2 Footer Action Bar */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep(1)}
                  disabled={isSubmitting}
                  className="text-xs font-bold text-slate-700"
                >
                  <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                  Back to Configuration
                </Button>

                <Button
                  size="sm"
                  onClick={handleGenerateTrips}
                  disabled={isSubmitting}
                  className="h-10 px-6 text-xs font-bold bg-[#E8450F] hover:bg-[#d13d0d] rounded-xl shadow-xs gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating {totalGeneratedTrips} Trips...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      Generate {totalGeneratedTrips} Trips
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
