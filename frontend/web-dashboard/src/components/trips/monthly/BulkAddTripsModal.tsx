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
} from 'lucide-react';

import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { customerService } from '@/services/customerService';
import { driverService, Driver } from '@/services/driverService';
import { vehicleService, Vehicle } from '@/services/vehicleService';
import { tripService, BulkImportTripRow, BulkImportResult } from '@/services/tripService';
import { VEHICLE_TYPES, RATE_CATEGORIES } from '@mercon/shared-types';
import { monthLabel, shiftMonth } from './monthlyBoardUtils';
import { parseSheet, TRIP_COLUMNS } from '@/utils/importUtils';

const MODAL_RATE_CATEGORIES = RATE_CATEGORIES.filter((cat) => cat !== 'Surcharge');

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
  const [contractStep, setContractStep] = useState<1 | 2>(1);
  const [contractCustomer, setContractCustomer] = useState('');
  const [contractRateCategory, setContractRateCategory] = useState<string>(MODAL_RATE_CATEGORIES[0] || 'Trip');
  const [contractVehicleType, setContractVehicleType] = useState<string>(VEHICLE_TYPES[0] || 'Flatbed');
  const [contractOrigin, setContractOrigin] = useState('');
  const [contractDestination, setContractDestination] = useState('');
  const [intermediateLocations, setIntermediateLocations] = useState<string[]>([]);
  const [contractBillingAmount, setContractBillingAmount] = useState('');

  const handleAddIntermediateLocation = () => {
    setIntermediateLocations((prev) => [...prev, '']);
  };

  const handleRemoveIntermediateLocation = (index: number) => {
    setIntermediateLocations((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateIntermediateLocation = (index: number, val: string) => {
    setIntermediateLocations((prev) => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [dayAssignments, setDayAssignments] = useState<Record<string, { driverId: string; vehicleId: string }>>({});

  // Master quick-apply in Step 2
  const [masterDriver, setMasterDriver] = useState('');
  const [masterVehicle, setMasterVehicle] = useState('');

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

  const applyMasterToAll = () => {
    setDayAssignments((prev) => {
      const next = { ...prev };
      selectedDates.forEach((date) => {
        next[date] = {
          driverId: masterDriver !== undefined ? masterDriver : next[date]?.driverId || '',
          vehicleId: masterVehicle !== undefined ? masterVehicle : next[date]?.vehicleId || '',
        };
      });
      return next;
    });
  };

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

    const filledStops = intermediateLocations.map((s) => s.trim()).filter(Boolean);
    const destString = filledStops.length > 0
      ? `${filledStops.join(' → ')} → ${contractDestination.trim()}`
      : contractDestination.trim();

    const rows: BulkImportTripRow[] = selectedDates.map((date) => {
      const assignment = dayAssignments[date] || { driverId: '', vehicleId: '' };
      return {
        customer_id: contractCustomer,
        planned_start: date,
        driver_id: assignment.driverId || undefined,
        vehicle_id: assignment.vehicleId || undefined,
        rate_category: contractRateCategory || undefined,
        vehicle_type: contractVehicleType || undefined,
        origin: contractOrigin.trim() || undefined,
        destination: destString || undefined,
        billing_amount: contractBillingAmount ? Number(contractBillingAmount) : undefined,
        status: assignment.driverId && assignment.vehicleId ? 'Dispatched' : 'Draft',
      };
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
      <DialogContent className="max-w-4xl p-0 overflow-hidden bg-white border border-black/10 shadow-2xl rounded-2xl sm:max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-black/[0.06] bg-slate-50/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#E8450F]/10 grid place-items-center shrink-0">
                <Layers className="h-5 w-5 text-[#E8450F]" />
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

          {/* Navigation Tabs */}
          {!submissionResult && (
            <div className="flex items-center gap-1.5 mt-5 p-1 bg-black/[0.04] rounded-xl w-fit">
              <button
                type="button"
                onClick={() => setActiveTab('contract')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'contract'
                    ? 'bg-white text-[#111111] shadow-sm'
                    : 'text-[#6E6E80] hover:text-[#111111]'
                }`}
              >
                <CalendarDays className="h-3.5 w-3.5 text-[#E8450F]" />
                Monthly Contract Batch
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('grid')}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'grid'
                    ? 'bg-white text-[#111111] shadow-sm'
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
                    ? 'bg-white text-[#111111] shadow-sm'
                    : 'text-[#6E6E80] hover:text-[#111111]'
                }`}
              >
                <UploadCloud className="h-3.5 w-3.5 text-emerald-600" />
                CSV / Excel Import
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[380px]">
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
                  className="rounded-xl bg-[#E8450F] hover:bg-[#d13d0d] text-white text-xs font-bold h-10 px-6"
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
                  {contractStep === 1 ? (
                    <div className="space-y-6">
                      {/* Step 1 Header & Customer select */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-[#6E6E80] uppercase tracking-wider">
                            Customer / Company *
                          </label>
                          <Select value={contractCustomer} onValueChange={setContractCustomer}>
                            <SelectTrigger className="h-10 rounded-xl border-black/10 text-xs font-semibold">
                              <SelectValue placeholder="Select customer" />
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

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-[#6E6E80] uppercase tracking-wider">
                            Rate Category
                          </label>
                          <Select value={contractRateCategory} onValueChange={setContractRateCategory}>
                            <SelectTrigger className="h-10 rounded-xl border-black/10 text-xs font-semibold">
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

                        <div className="space-y-1.5">
                          <label className="text-[11px] font-bold text-[#6E6E80] uppercase tracking-wider">
                            Vehicle Type
                          </label>
                          <Select value={contractVehicleType} onValueChange={setContractVehicleType}>
                            <SelectTrigger className="h-10 rounded-xl border-black/10 text-xs font-semibold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {VEHICLE_TYPES.map((type) => (
                                <SelectItem key={type} value={type} className="text-xs">
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Optional Route & Billing defaults */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-black/[0.06] pb-1.5">
                          <span className="text-[11px] font-bold text-[#6E6E80] uppercase tracking-wider">
                            Route Locations & Financials
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-[11px] font-bold text-[#E8450F] border-orange-200 bg-orange-50/50 hover:bg-orange-100/60 shadow-2xs gap-1"
                            onClick={handleAddIntermediateLocation}
                          >
                            <Plus className="w-3 h-3 text-[#E8450F]" />
                            Add Location
                          </Button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-[#6E6E80] uppercase tracking-wider">
                              Origin / Pickup (Optional)
                            </label>
                            <input
                              type="text"
                              value={contractOrigin}
                              onChange={(e) => setContractOrigin(e.target.value)}
                              placeholder="e.g. Riyadh Sorting Yard"
                              className="w-full h-10 px-3 rounded-xl border border-black/10 text-xs font-medium focus:outline-none focus:border-[#E8450F]"
                            />
                          </div>

                          {intermediateLocations.map((loc, idx) => (
                            <div key={idx} className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <label className="text-[11px] font-bold text-[#6E6E80] uppercase tracking-wider">
                                  Stop {idx + 1} Location (Optional)
                                </label>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveIntermediateLocation(idx)}
                                  className="text-slate-400 hover:text-rose-600 transition-colors p-0.5"
                                  title="Remove stop location"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                              <input
                                type="text"
                                value={loc}
                                onChange={(e) => handleUpdateIntermediateLocation(idx, e.target.value)}
                                placeholder={`e.g. Intermediate Stop ${idx + 1}`}
                                className="w-full h-10 px-3 rounded-xl border border-black/10 text-xs font-medium focus:outline-none focus:border-[#E8450F]"
                              />
                            </div>
                          ))}

                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="text-[11px] font-bold text-[#6E6E80] uppercase tracking-wider">
                                Destination (Optional)
                              </label>
                              <button
                                type="button"
                                onClick={() => {
                                  if (contractOrigin.trim()) {
                                    setContractDestination(contractOrigin.trim());
                                  }
                                }}
                                className={`text-[10px] font-bold flex items-center gap-1 px-1.5 py-0.5 rounded-md transition-all ${
                                  contractOrigin.trim() && contractDestination.trim() === contractOrigin.trim()
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs'
                                    : 'text-[#E8450F] hover:bg-orange-50'
                                }`}
                                title="Click to set final destination same as origin for Round Trip"
                              >
                                <RotateCcw className="w-3 h-3 text-[#E8450F]" />
                                {contractOrigin.trim() && contractDestination.trim() === contractOrigin.trim()
                                  ? '🔁 Same as Origin (Round Trip)'
                                  : 'Same as Origin'}
                              </button>
                            </div>
                            <input
                              type="text"
                              value={contractDestination}
                              onChange={(e) => setContractDestination(e.target.value)}
                              placeholder="e.g. Jeddah Port Gate 4"
                              className={`w-full h-10 px-3 rounded-xl border text-xs font-medium focus:outline-none focus:border-[#E8450F] ${
                                contractOrigin.trim() && contractDestination.trim() === contractOrigin.trim()
                                  ? 'border-emerald-300 bg-emerald-50/20 text-emerald-900 font-semibold'
                                  : 'border-black/10'
                              }`}
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-[#6E6E80] uppercase tracking-wider">
                              Billing Amount (SAR)
                            </label>
                            <input
                              type="number"
                              value={contractBillingAmount}
                              onChange={(e) => setContractBillingAmount(e.target.value)}
                              placeholder="e.g. 3500"
                              className="w-full h-10 px-3 rounded-xl border border-black/10 text-xs font-medium focus:outline-none focus:border-[#E8450F]"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Month Switcher & Day Selector */}
                      <div className="p-5 rounded-2xl border border-black/[0.08] bg-slate-50/70 space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-[#111111]">
                              Select Month & Days:
                            </span>
                            <div className="inline-flex items-center bg-white border border-black/10 rounded-xl overflow-hidden shadow-2xs">
                              <button
                                type="button"
                                onClick={() => setSelectedMonth(shiftMonth(selectedMonth, -1))}
                                className="h-8 w-8 grid place-items-center text-[#6E6E80] hover:bg-black/[0.04]"
                              >
                                <ChevronLeft className="h-3.5 w-3.5" />
                              </button>
                              <span className="text-xs font-bold text-[#111111] px-3">
                                {monthLabel(selectedMonth)}
                              </span>
                              <button
                                type="button"
                                onClick={() => setSelectedMonth(shiftMonth(selectedMonth, 1))}
                                className="h-8 w-8 grid place-items-center text-[#6E6E80] hover:bg-black/[0.04]"
                              >
                                <ChevronRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Quick selection pills */}
                          <div className="flex items-center gap-1.5 flex-wrap">
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
                            {selectedDates.length > 0 && (
                              <button
                                type="button"
                                onClick={() => selectPreset('clear')}
                                className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 text-[11px] font-semibold transition-colors"
                              >
                                Clear
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Calendar Day Grid */}
                        <div className="grid grid-cols-7 gap-1.5 pt-2">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                            <div key={d} className="text-center text-[10px] font-bold text-[#9898A4] py-1">
                              {d}
                            </div>
                          ))}

                          {/* Empty offset days for start of month */}
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
                                    ? 'bg-[#E8450F] text-white shadow-sm ring-2 ring-[#E8450F]/20'
                                    : 'bg-white text-[#111111] border border-black/[0.07] hover:border-[#E8450F]/40'
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
                      </div>

                      {/* Step 1 Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-black/[0.06]">
                        <div className="text-xs text-[#6E6E80]">
                          <span className="font-bold text-[#111111]">{selectedDates.length} days</span> selected for this batch
                        </div>
                        <Button
                          disabled={!contractCustomer || selectedDates.length === 0}
                          onClick={() => setContractStep(2)}
                          className="h-10 rounded-xl px-5 text-xs font-bold bg-[#E8450F] hover:bg-[#d13d0d] text-white shadow-none disabled:opacity-50"
                        >
                          Next: Assign Drivers & Vehicles ({selectedDates.length})
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* Step 2: Per-Day Driver & Vehicle Assignment Matrix */
                    <div className="space-y-5 animate-fade-in">
                      <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-black/[0.06]">
                        <div>
                          <h4 className="text-sm font-bold text-[#111111]">
                            Assign Drivers & Trucks per Day
                          </h4>
                          <p className="text-xs text-[#6E6E80] mt-0.5">
                            Tailor individual driver and vehicle assignments for each day, or leave days unassigned.
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setContractStep(1)}
                          className="rounded-xl border-black/10 text-xs font-semibold h-8"
                        >
                          <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back to Dates
                        </Button>
                      </div>

                      {/* Quick Apply Master Toolbar */}
                      <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-100 flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-indigo-600 shrink-0" />
                          <span className="text-xs font-bold text-indigo-900">
                            Batch Assign Shortcut:
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Select value={masterDriver} onValueChange={setMasterDriver}>
                            <SelectTrigger className="h-8 w-44 rounded-lg bg-white border-indigo-200 text-xs font-medium">
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
                            <SelectTrigger className="h-8 w-44 rounded-lg bg-white border-indigo-200 text-xs font-medium">
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

                          <Button
                            size="sm"
                            onClick={applyMasterToAll}
                            className="h-8 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3"
                          >
                            Apply to All {selectedDates.length} Days
                          </Button>
                        </div>
                      </div>

                      {/* Date Breakdown Table */}
                      <div className="rounded-xl border border-black/[0.08] overflow-hidden max-h-[320px] overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-[11px] font-bold text-[#6E6E80] uppercase tracking-wider border-b border-black/[0.06] sticky top-0 z-10">
                            <tr>
                              <th className="px-4 py-2.5">Date</th>
                              <th className="px-4 py-2.5">Assigned Driver</th>
                              <th className="px-4 py-2.5">Assigned Truck</th>
                              <th className="px-4 py-2.5 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-black/[0.04]">
                            {selectedDates.map((dateStr) => {
                              const [y, m, d] = dateStr.split('-').map(Number);
                              const dateObj = new Date(y, m - 1, d);
                              const formattedDate = dateObj.toLocaleDateString('en-GB', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              });
                              const currentAssignment = dayAssignments[dateStr] || { driverId: '', vehicleId: '' };

                              return (
                                <tr key={dateStr} className="hover:bg-slate-50/50">
                                  <td className="px-4 py-2 font-bold text-[#111111] whitespace-nowrap">
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-3.5 w-3.5 text-[#E8450F]" />
                                      {formattedDate}
                                    </div>
                                  </td>
                                  <td className="px-4 py-2">
                                    <Select
                                      value={currentAssignment.driverId || 'unassigned'}
                                      onValueChange={(val) =>
                                        setDayAssignments((prev) => ({
                                          ...prev,
                                          [dateStr]: {
                                            ...prev[dateStr],
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
                                          [dateStr]: {
                                            ...prev[dateStr],
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
                                      onClick={() => toggleDate(dateStr)}
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

                      {/* Step 2 Execution Footer */}
                      <div className="flex items-center justify-between pt-3 border-t border-black/[0.06]">
                        <p className="text-xs text-[#6E6E80]">
                          Customer: <span className="font-bold text-[#111111]">{customers.find((c) => c.id === contractCustomer)?.name}</span> • Ready to create <span className="font-bold text-[#E8450F]">{selectedDates.length} trips</span>
                        </p>
                        <Button
                          disabled={bulkMutation.isPending || selectedDates.length === 0}
                          onClick={handleContractSubmit}
                          className="h-10 rounded-xl px-6 text-xs font-bold bg-[#E8450F] hover:bg-[#d13d0d] text-white shadow-none disabled:opacity-50"
                        >
                          {bulkMutation.isPending ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Generating Trips...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4 mr-1.5" />
                              Generate {selectedDates.length} Trips
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
                                className="w-36 h-8 px-2 rounded-lg border border-black/10 text-xs font-medium bg-white focus:outline-none focus:border-[#E8450F]"
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
                                className="h-8 px-2 rounded-lg border border-black/10 text-xs font-medium bg-white focus:outline-none focus:border-[#E8450F]"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <select
                                value={row.driverId}
                                onChange={(e) => updateGridRow(row.id, { driverId: e.target.value })}
                                className="w-36 h-8 px-2 rounded-lg border border-black/10 text-xs font-medium bg-white focus:outline-none focus:border-[#E8450F]"
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
                                className="w-36 h-8 px-2 rounded-lg border border-black/10 text-xs font-medium bg-white focus:outline-none focus:border-[#E8450F]"
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
                                className="w-28 h-8 px-2 rounded-lg border border-black/10 text-xs font-medium bg-white focus:outline-none focus:border-[#E8450F]"
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
                                className="w-20 h-8 px-2 rounded-lg border border-black/10 text-xs font-medium bg-white focus:outline-none focus:border-[#E8450F]"
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
                      className="h-10 rounded-xl px-6 text-xs font-bold bg-[#E8450F] hover:bg-[#d13d0d] text-white shadow-none disabled:opacity-50"
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
                      className="border-2 border-dashed border-black/10 hover:border-[#E8450F]/50 rounded-2xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-slate-50"
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
                        <FileSpreadsheet className="h-6 w-6 text-[#E8450F]" />
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
                      className="h-10 rounded-xl px-6 text-xs font-bold bg-[#E8450F] hover:bg-[#d13d0d] text-white shadow-none disabled:opacity-50"
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
      </DialogContent>
    </Dialog>
  );
}
