import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Download, Search, CheckCircle2, X, CalendarDays,
  ChevronRight, Building2, FileText, Hash, StickyNote,
  ExternalLink, Clock, Truck, User, Package, Printer, Eye, FileSpreadsheet,
  ArrowDown, ArrowUp, Check, Filter, ReceiptText, DollarSign, RefreshCw, Copy
} from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { format, startOfMonth, startOfWeek } from 'date-fns';

import { downloadCSV } from '@/utils/exportUtils';
import ExportModal, { ExportColumn, ExportFilter } from '@/components/ui/ExportModal';
import {
  exportCustomerInvoiceExcel,
  exportAllLedgerExcel,
  InvoiceExcelFormat,
} from '@/utils/exportInvoiceExcel';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { SortDropdown, SortOption } from '@/components/ui/SortDropdown';
import {
  tripService,
  CustomerBillingRow,
  CustomerBillingFilters,
  BillingLedgerTrip,
} from '@/services/tripService';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';

// ── Helpers ──────────────────────────────────────────────────────────────────
function getTripOrigin(trip: BillingLedgerTrip) {
  const p = trip.stops?.find((s: any) => s.stop_type === 'Pickup');
  return p?.location?.name ?? p?.location_name ?? '—';
}
function getTripDest(trip: BillingLedgerTrip) {
  const d = trip.stops?.filter((s: any) => s.stop_type === 'Dropoff') ?? [];
  const last = d[d.length - 1];
  return last?.location?.name ?? last?.location_name ?? '—';
}
function getInvoiceRec(trip: BillingLedgerTrip) {
  return trip.invoices?.[0] ?? null;
}
function getVehicleDesc(trip: BillingLedgerTrip) {
  if (!trip.vehicle) return 'Unassigned';
  const v = trip.vehicle as any;
  return `${v.plate_number}${v.make ? ` (${v.make})` : ''}`;
}
function getDriverDesc(trip: BillingLedgerTrip) {
  if (!trip.driver) return 'Unassigned';
  const d = trip.driver;
  const fullName = `${d.first_name || ''} ${d.last_name || ''}`.trim();
  return fullName || d.phone_primary || 'Assigned Driver';
}
function getCargoDesc(trip: BillingLedgerTrip) {
  const t = trip as any;
  if (t.cargo_type) return t.cargo_type;
  if (t.cargo_weight) return `${t.cargo_weight} kg`;
  return 'General Cargo';
}

function CompanyLogo({ name, logoUrl, className }: { name: string; logoUrl?: string | null; className?: string }) {
  const [hasError, setHasError] = useState(false);

  if (logoUrl && !hasError) {
    return (
      <img
        src={logoUrl}
        alt={name}
        onError={() => setHasError(true)}
        className={cn("rounded-lg object-contain p-0.5 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0 shadow-2xs", className)}
      />
    );
  }

  const initials = name ? name.substring(0, 2).toUpperCase() : 'CU';

  return (
    <div className={cn("rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0 border border-slate-200/60 dark:border-slate-700", className)}>
      <span>{initials}</span>
    </div>
  );
}

const INVOICE_EXPORT_COLUMNS: ExportColumn<BillingLedgerTrip>[] = [
  { id: 'ref_id', label: 'Trip ID', accessor: (t) => t.ref_id || `TRP-${t.id.slice(0, 5).toUpperCase()}` },
  { id: 'customer', label: 'Customer Name', accessor: (t) => t.customer?.name || '—' },
  { id: 'route', label: 'Route', accessor: (t) => `${getTripOrigin(t)} → ${getTripDest(t)}` },
  { id: 'status', label: 'Trip Status', accessor: (t) => t.status },
  { id: 'invoice_status', label: 'Invoice Status', accessor: (t) => (t.invoices && t.invoices.length > 0 ? 'Invoiced' : 'Pending') },
  { id: 'invoice_no', label: 'Invoice Number', accessor: (t) => t.invoices?.[0]?.ref_id || '—' },
  { id: 'vehicle', label: 'Vehicle Plate', accessor: (t) => t.vehicle?.plate_number || '—' },
  { id: 'driver', label: 'Driver Name', accessor: (t) => (t.driver ? `${t.driver.first_name} ${t.driver.last_name}` : '—') },
  { id: 'billing_amount', label: 'Billing Amount (SAR)', accessor: (t) => (t.billing_amount ? `SAR ${t.billing_amount.toLocaleString()}` : '—') },
  { id: 'trip_date', label: 'Planned Start', accessor: (t) => (t.planned_start ? new Date(t.planned_start).toLocaleDateString() : '—') },
];

const INVOICE_EXPORT_FILTERS: ExportFilter<BillingLedgerTrip>[] = [
  {
    id: 'invoice_status',
    label: 'Invoice Status',
    options: [
      { label: 'All Statuses', value: 'All' },
      { label: 'Invoiced Only', value: 'Invoiced' },
      { label: 'Pending Invoice', value: 'NotInvoiced' },
    ],
    filterFn: (t, val) => (val === 'Invoiced' ? !!(t.invoices && t.invoices.length > 0) : !(t.invoices && t.invoices.length > 0)),
  },
];

// ── Quick Trip Summary Modal ──────────────────────────
function QuickTripSummaryModal({
  trip,
  open,
  onClose,
  onMark,
  onUnmark,
  navigate,
  tz,
}: {
  trip: BillingLedgerTrip | null;
  open: boolean;
  onClose: () => void;
  onMark: (trip: BillingLedgerTrip) => void;
  onUnmark: (trip: BillingLedgerTrip) => void;
  navigate: (path: string) => void;
  tz: string;
}) {
  if (!trip) return null;
  const inv = getInvoiceRec(trip);
  const startDate = trip.planned_start ? new Date(trip.planned_start) : new Date(trip.createdAt);
  const endDate = trip.actual_end ? new Date(trip.actual_end) : null;

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-xl rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800 shadow-2xl [&>button]:text-white [&>button]:top-5 [&>button]:right-5">
        <div className="p-5 pb-4 bg-[#3E3C3D] text-white">
          <div className="flex items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-[#FA634E] shrink-0" />
              <div>
                <DialogTitle className="text-base font-extrabold text-white flex items-center gap-2">
                  <span>Trip Summary & Invoicing</span>
                  <span className="font-mono text-sm text-[#FA634E]">{trip.ref_id}</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300 mt-0.5">
                  Descriptive details for trip billing inspection
                </DialogDescription>
              </div>
            </div>
            {trip.status === 'Invoiced' ? (
              <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold text-xs uppercase tracking-wider px-2.5 py-1 inline-flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Invoiced</span>
              </Badge>
            ) : (
              <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold text-xs uppercase tracking-wider px-2.5 py-1">
                Pending Invoice
              </Badge>
            )}
          </div>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {/* Customer Account */}
          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/45 p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Customer Account</p>
                <p className="font-bold text-sm text-slate-900 dark:text-slate-100">{(trip as any).customer?.name || '—'}</p>
              </div>
            </div>
            {inv?.zatca_ref && (
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">External Ref</p>
                <p className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300">{inv.zatca_ref}</p>
              </div>
            )}
          </div>

          {/* Key Overview Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800 p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <CalendarDays className="w-3 h-3 text-slate-400" /> Planned / Actual Date
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {formatInDeploymentTz(startDate, tz, 'MMM d, yyyy')}
                {endDate ? ` → ${formatInDeploymentTz(endDate, tz, 'MMM d')}` : ''}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800 p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Package className="w-3 h-3 text-slate-400" /> Cargo Specifications
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {getCargoDesc(trip)}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800 p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Truck className="w-3 h-3 text-slate-400" /> Assigned Vehicle
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {getVehicleDesc(trip)}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/60 dark:border-slate-800 p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <User className="w-3 h-3 text-slate-400" /> Assigned Driver
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {getDriverDesc(trip)}
              </p>
            </div>
          </div>

          {/* Route path */}
          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 p-3.5 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Route & Locations</span>
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-slate-100">
              <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-bold">{getTripOrigin(trip)}</span>
              <span className="text-slate-400">→</span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">{getTripDest(trip)}</span>
            </div>
            {trip.stops && trip.stops.length > 2 && (
              <p className="text-[11px] text-slate-500 font-medium">Includes {trip.stops.length - 2} intermediate stops</p>
            )}
          </div>

          {/* Rate Section */}
          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Billed Contract Rate</span>
            <span className="font-mono text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
              SAR {(trip.billing_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          {/* Notes if any */}
          {inv?.invoicing_note && (
            <div className="bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-900/40 p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">Invoicing Note</span>
              <p className="text-slate-700 dark:text-slate-300">{inv.invoicing_note}</p>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <div>
            {trip.status === 'Completed' ? (
              <Button
                size="sm"
                onClick={() => { onClose(); onMark(trip); }}
                className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Mark Invoiced
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => { onClose(); onUnmark(trip); }}
                className="h-8 text-xs font-semibold text-amber-650 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/20 gap-1.5"
              >
                <X className="w-3.5 h-3.5" /> Unmark Invoiced
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Close</Button>
            <Button
              size="sm"
              onClick={() => { onClose(); navigate(`/trips/${trip.id}`); }}
              className="h-8 text-xs font-bold bg-brand hover:bg-brand-hover text-white gap-1.5"
            >
              View Full Details <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type TripBillingSortOption = 'latest' | 'oldest' | 'ref_id_asc' | 'status';

const TRIP_BILLING_SORT_OPTIONS: SortOption<TripBillingSortOption>[] = [
  { value: 'latest', label: 'Newest First', icon: <ArrowDown className="w-3.5 h-3.5 text-blue-600" /> },
  { value: 'oldest', label: 'Oldest First', icon: <ArrowUp className="w-3.5 h-3.5 text-amber-600" /> },
  { value: 'ref_id_asc', label: 'Trip ID (A → Z)', icon: <Hash className="w-3.5 h-3.5 text-slate-500" /> },
  { value: 'status', label: 'Billing Status', icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> },
];

// ── Company Invoice Statement Modal ───────────────────────────────
function CompanyInvoiceStatementModal({
  open,
  onClose,
  row,
  initialPreset = 'ALL',
  initialCustomFrom = '',
  initialCustomTo = '',
  onSelectTrip,
  tz,
}: {
  open: boolean;
  onClose: () => void;
  row: CustomerBillingRow | null;
  initialPreset?: string;
  initialCustomFrom?: string;
  initialCustomTo?: string;
  onSelectTrip?: (trip: BillingLedgerTrip) => void;
  tz: string;
}) {
  if (!row) return null;

  const [datePreset, setDatePreset] = useState<string>(initialPreset || 'ALL');
  const [customFrom, setCustomFrom] = useState<string>(initialCustomFrom);
  const [customTo, setCustomTo] = useState<string>(initialCustomTo);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Invoiced' | 'NotInvoiced'>('ALL');
  const [statementSearch, setStatementSearch] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<TripBillingSortOption>('latest');

  useEffect(() => {
    if (open) {
      setDatePreset(initialPreset || 'ALL');
      setCustomFrom(initialCustomFrom || '');
      setCustomTo(initialCustomTo || '');
      setStatusFilter('ALL');
      setStatementSearch('');
      setSortOrder('latest');
    }
  }, [open, row?.customer?.id, initialPreset, initialCustomFrom, initialCustomTo]);

  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    if (preset !== 'CUSTOM') {
      setCustomFrom('');
      setCustomTo('');
    }
  };

  const filteredTrips = useMemo(() => {
    if (!row?.trips) return [];
    let list = row.trips;

    if (statusFilter === 'Invoiced') {
      list = list.filter(t => t.status === 'Invoiced');
    } else if (statusFilter === 'NotInvoiced') {
      list = list.filter(t => t.status !== 'Invoiced');
    }

    if (datePreset !== 'ALL' || customFrom || customTo) {
      const now = new Date();
      let fromDate: Date | null = null;
      let toDate: Date | null = null;

      if (datePreset === 'TODAY') {
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      } else if (datePreset === 'THIS_WEEK') {
        const dayOfWeek = now.getDay();
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek, 0, 0, 0);
        toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      } else if (datePreset === 'THIS_MONTH') {
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
        toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      } else if (datePreset === 'LAST_MONTH') {
        fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0);
        toDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
      } else if (datePreset === 'CUSTOM' || customFrom || customTo) {
        if (customFrom) {
          fromDate = new Date(customFrom);
          fromDate.setHours(0, 0, 0, 0);
        }
        if (customTo) {
          toDate = new Date(customTo);
          toDate.setHours(23, 59, 59, 999);
        }
      }

      list = list.filter(t => {
        const d = t.planned_start ? new Date(t.planned_start) : new Date(t.createdAt);
        if (isNaN(d.getTime())) return false;
        if (fromDate && d < fromDate) return false;
        if (toDate && d > toDate) return false;
        return true;
      });
    }

    if (statementSearch.trim()) {
      const q = statementSearch.toLowerCase().trim();
      list = list.filter(t => {
        const refId = (t.ref_id || '').toLowerCase();
        const origin = getTripOrigin(t).toLowerCase();
        const dest = getTripDest(t).toLowerCase();
        const driver = getDriverDesc(t).toLowerCase();
        const vehicle = getVehicleDesc(t).toLowerCase();
        const cargo = getCargoDesc(t).toLowerCase();
        const zatca = (getInvoiceRec(t)?.zatca_ref || getInvoiceRec(t)?.ref_id || '').toLowerCase();
        return (
          refId.includes(q) ||
          origin.includes(q) ||
          dest.includes(q) ||
          driver.includes(q) ||
          vehicle.includes(q) ||
          cargo.includes(q) ||
          zatca.includes(q)
        );
      });
    }

    list = [...list].sort((a, b) => {
      if (sortOrder === 'ref_id_asc') return (a.ref_id || '').localeCompare(b.ref_id || '');
      if (sortOrder === 'status') return (a.status || '').localeCompare(b.status || '');
      const dateA = a.planned_start ? new Date(a.planned_start).getTime() : new Date(a.createdAt).getTime();
      const dateB = b.planned_start ? new Date(b.planned_start).getTime() : new Date(b.createdAt).getTime();
      return sortOrder === 'oldest' ? dateA - dateB : dateB - dateA;
    });

    return list;
  }, [row?.trips, datePreset, customFrom, customTo, statusFilter, statementSearch, sortOrder]);

  const totalFiltered = filteredTrips.length;

  const handleExportCompanyCSV = () => {
    const csvRows = filteredTrips.map(trip => ({
      company: row.customer.name,
      trip_ref: trip.ref_id,
      origin: getTripOrigin(trip),
      destination: getTripDest(trip),
      date: trip.planned_start ? formatInDeploymentTz(trip.planned_start, tz, 'MM/dd/yyyy') : '',
      cargo: getCargoDesc(trip),
      vehicle: getVehicleDesc(trip),
      driver: getDriverDesc(trip),
      invoicing_status: trip.status === 'Invoiced' ? 'Invoiced' : 'Pending',
      ext_zatca_ref: getInvoiceRec(trip)?.zatca_ref || getInvoiceRec(trip)?.ref_id || '—',
      rate_sar: trip.billing_amount || 0
    }));
    downloadCSV(csvRows, `${row.customer.name.replace(/\s+/g, '_')}_Invoice_Statement_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handleExportExcel = async (format: InvoiceExcelFormat = 'ALL') => {
    try {
      const periodLabel = datePreset === 'CUSTOM'
        ? `${customFrom || 'Start'} to ${customTo || 'End'}`
        : datePreset.replace('_', ' ');
      await exportCustomerInvoiceExcel(row, filteredTrips, format, periodLabel, tz);
      toast.success(`Excel statement downloaded (${filteredTrips.length} trips)`);
    } catch (e: any) {
      toast.error('Failed to generate Excel file: ' + (e?.message || 'Error'));
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="w-[96vw] max-w-[1360px] rounded-2xl p-0 gap-0 overflow-hidden border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col shadow-2xl [&>button]:text-white [&>button]:top-5 [&>button]:right-5">
        {/* Header bar */}
        <div className="p-5 sm:px-6 bg-[#3E3C3D] text-white shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-[#FA634E] shrink-0" />
              <div>
                <DialogTitle className="text-lg font-extrabold text-white flex items-center gap-2">
                  <span>{row.customer.name}</span>
                  <Badge className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold uppercase tracking-wider">
                    Company Statement
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300 font-medium mt-0.5 flex items-center gap-2">
                  <span>{row.customer.contact_phone ? `Tel: ${row.customer.contact_phone}` : 'Corporate Account'}</span>
                  <span>•</span>
                  <span>{row.trips.length} Total Trips on Ledger</span>
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    className="h-8 gap-1.5 text-xs font-bold bg-[#FA634E] hover:bg-[#FA634E]/90 text-white shadow-2xs cursor-pointer border-none"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Download Excel ({totalFiltered})
                    <ChevronRight className="w-3 h-3 opacity-80 rotate-90" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Choose Excel Format</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => handleExportExcel('ALL')} className="flex items-center gap-2.5 font-medium cursor-pointer">
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="font-bold text-xs text-slate-800 dark:text-slate-200">Complete Workbook (.xlsx)</p>
                      <p className="text-[10px] text-slate-400">All 3 sheets in one package</p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleExportExcel('TRIP_BILLING')} className="flex items-center gap-2.5 cursor-pointer">
                    <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">Trip Confirmation Billing</p>
                      <p className="text-[10px] text-slate-400">UUID, Route, Plate & Charges</p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportExcel('TAX_INVOICE')} className="flex items-center gap-2.5 cursor-pointer">
                    <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">Official Tax Invoice</p>
                      <p className="text-[10px] text-slate-400">VAT statement with Bank & Words</p>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExportExcel('VEHICLE_MONTHLY')} className="flex items-center gap-2.5 cursor-pointer">
                    <Building2 className="w-4 h-4 text-rose-600 shrink-0" />
                    <div>
                      <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">Monthly Vehicle Rental</p>
                      <p className="text-[10px] text-slate-400">Vehicle tonnage & days breakdown</p>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-8 gap-1.5 text-xs font-semibold border-white/20 bg-white/10 hover:bg-white/20 text-white shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5" /> Print
              </Button>
            </div>
          </div>
        </div>

        {/* Statement Toolbar: Date Preset Filter + Status Filter + Search */}
        <div className="px-6 py-3 bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search ref, route, vehicle, driver, ZATCA..."
              value={statementSearch}
              onChange={e => setStatementSearch(e.target.value)}
              className="pl-8 pr-3 h-8 text-xs w-72 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-indigo-500" />
              <Select value={datePreset} onValueChange={handlePresetChange}>
                <SelectTrigger className="h-8 text-xs w-44 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-medium shadow-2xs">
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Time ({row.trips.length})</SelectItem>
                  <SelectItem value="TODAY">Today</SelectItem>
                  <SelectItem value="THIS_WEEK">This Week</SelectItem>
                  <SelectItem value="THIS_MONTH">This Month</SelectItem>
                  <SelectItem value="LAST_MONTH">Last Month</SelectItem>
                  <SelectItem value="CUSTOM">Custom Range</SelectItem>
                </SelectContent>
              </Select>

              {datePreset === 'CUSTOM' && (
                <div className="flex items-center gap-1 ml-1 animate-fade-in">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={e => setCustomFrom(e.target.value)}
                    className="h-8 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2"
                  />
                  <span className="text-slate-400">—</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={e => setCustomTo(e.target.value)}
                    className="h-8 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg px-2"
                  />
                </div>
              )}
            </div>

            <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
              <SelectTrigger className="h-8 text-xs w-36 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-medium shadow-2xs">
                <SelectValue placeholder="Status Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Trip Status</SelectItem>
                <SelectItem value="Invoiced">Invoiced Only</SelectItem>
                <SelectItem value="NotInvoiced">Pending Invoice</SelectItem>
              </SelectContent>
            </Select>

            <SortDropdown
              value={sortOrder}
              onChange={setSortOrder}
              options={TRIP_BILLING_SORT_OPTIONS}
              triggerClassName="h-8"
            />
          </div>
        </div>

        {/* List of trips */}
        <div className="flex-1 overflow-y-auto p-6 min-h-[300px]">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm bg-white dark:bg-slate-900">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-850 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-2.5 text-left">Trip ID</th>
                  <th className="px-4 py-2.5 text-left">Planned Date</th>
                  <th className="px-4 py-2.5 text-left">Route Stops</th>
                  <th className="px-4 py-2.5 text-left">Vehicle Plate</th>
                  <th className="px-4 py-2.5 text-left">Driver Name</th>
                  <th className="px-4 py-2.5 text-left">Invoice No / Ref</th>
                  <th className="px-4 py-2.5 text-right">Contract Rate</th>
                  <th className="px-4 py-2.5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 dark:divide-slate-800/80 font-medium text-slate-700 dark:text-slate-355">
                {filteredTrips.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                      No matching ledger records found.
                    </td>
                  </tr>
                ) : (
                  filteredTrips.map(trip => {
                    const inv = getInvoiceRec(trip);
                    const d = trip.planned_start ? new Date(trip.planned_start) : new Date(trip.createdAt);
                    return (
                      <tr
                        key={trip.id}
                        onClick={() => onSelectTrip?.(trip)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-2.5 font-mono font-bold text-brand">{trip.ref_id}</td>
                        <td className="px-4 py-2.5 text-slate-500">{formatInDeploymentTz(d, tz, 'MMM d, yyyy')}</td>
                        <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-slate-100">{getTripOrigin(trip)} → {getTripDest(trip)}</td>
                        <td className="px-4 py-2.5 font-mono">{trip.vehicle?.plate_number || '—'}</td>
                        <td className="px-4 py-2.5">{getDriverDesc(trip)}</td>
                        <td className="px-4 py-2.5 font-mono text-[10px] text-slate-400">{inv?.zatca_ref || inv?.ref_id || '—'}</td>
                        <td className="px-4 py-2.5 text-right font-bold font-mono text-emerald-600">SAR {(trip.billing_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-2.5 text-center">
                          {trip.status === 'Invoiced' ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-250 font-bold text-[9px] shadow-none rounded-md px-1.5 py-0.2">Invoiced</Badge>
                          ) : (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-250 font-bold text-[9px] shadow-none rounded-md px-1.5 py-0.2">Pending</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 px-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 font-mono">
            Showing {totalFiltered} of {row.trips.length} ledger records
          </div>
          <Button variant="outline" size="sm" className="h-8.5 rounded-xl px-4 text-xs font-bold" onClick={onClose}>Close Statement</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Bulk Mark as Invoiced Modal ──────────────────
function BulkMarkInvoicedModal({
  open,
  onClose,
  companyName,
  trips,
  periodLabel,
  tz,
  onConfirm,
  isSaving,
}: {
  open: boolean;
  onClose: () => void;
  companyName: string;
  trips: BillingLedgerTrip[];
  periodLabel: string;
  tz: string;
  onConfirm: (zatcaRef: string, note: string) => void;
  isSaving: boolean;
}) {
  const [zatcaRef, setZatcaRef] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    if (open) {
      setZatcaRef('');
      setNote('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={v => { if (!v && !isSaving) onClose(); }}>
      <DialogContent className="w-[92vw] max-w-[900px] rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800 max-h-[88vh] flex flex-col shadow-2xl [&>button]:text-white [&>button]:top-5 [&>button]:right-5">
        <div className="p-5 bg-[#3E3C3D] text-white shrink-0">
          <div className="flex items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-[#FA634E] shrink-0" />
              <div>
                <DialogTitle className="text-base font-extrabold text-white">
                  Invoice Preview — Mark {trips.length} Trip{trips.length === 1 ? '' : 's'} as Invoiced
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300 mt-0.5">
                  {companyName} · {periodLabel}
                </DialogDescription>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-3 py-2 text-left">Trip Ref</th>
                  <th className="px-3 py-2 text-left">Route</th>
                  <th className="px-3 py-2 text-left">Date</th>
                  <th className="px-3 py-2 text-left">Cargo / Vehicle</th>
                  <th className="px-3 py-2 text-right">Contract Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-medium">
                {trips.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400 text-xs">
                      No pending trips to invoice in this period.
                    </td>
                  </tr>
                ) : trips.map(trip => {
                  const d = trip.planned_start ? new Date(trip.planned_start) : new Date(trip.createdAt);
                  return (
                    <tr key={trip.id} className="text-slate-700 dark:text-slate-350">
                      <td className="px-3 py-2 font-mono font-bold text-brand whitespace-nowrap">{trip.ref_id}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-bold text-slate-900 dark:text-slate-100">{getTripOrigin(trip)} → {getTripDest(trip)}</td>
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{formatInDeploymentTz(d, tz, 'MMM d, yyyy')}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">{getCargoDesc(trip)} · {getVehicleDesc(trip)}</td>
                      <td className="px-3 py-2 text-right font-mono font-extrabold text-emerald-600">SAR {(trip.billing_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">External / ZATCA Invoice Reference <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input value={zatcaRef} onChange={e => setZatcaRef(e.target.value)} placeholder="Applied to all trips in this batch" className="h-9 text-xs font-mono border-slate-200 dark:border-slate-700" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">Notes <span className="text-slate-400 font-normal">(optional)</span></Label>
              <Input value={note} onChange={e => setNote(e.target.value)} placeholder="Applied to all trips in this batch" className="h-9 text-xs border-slate-200 dark:border-slate-700" />
            </div>
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <span className="text-xs text-slate-500 font-mono font-semibold">{trips.length} trip{trips.length === 1 ? '' : 's'} will be marked Invoiced</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose} disabled={isSaving}>Cancel</Button>
            <Button
              size="sm"
              onClick={() => onConfirm(zatcaRef, note)}
              disabled={isSaving || trips.length === 0}
              className="h-8 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {isSaving ? 'Marking...' : <><CheckCircle2 className="w-3.5 h-3.5" /> Confirm & Mark Invoiced ({trips.length})</>}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page Component ──────────────────
export default function InvoiceListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tz = useDeploymentTimezone();

  // Selected customer registry tracking
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  // Right Panel Local Trip Filters
  const [tripSearch, setTripSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [tripSort, setTripSort] = useState<TripBillingSortOption>('latest');

  const [isExportOpen, setIsExportOpen] = useState(false);

  // Selected Trip Modal state
  const [selectedTrip, setSelectedTrip] = useState<BillingLedgerTrip | null>(null);

  // Selected Company Statement Modal state
  const [statementConfig, setStatementConfig] = useState<{
    row: CustomerBillingRow | null;
    preset?: string;
    from?: string;
    to?: string;
  }>({ row: null });

  // Mark-as-Invoiced modal state
  const [markModal, setMarkModal] = useState<{ open: boolean; trip: BillingLedgerTrip | null }>({ open: false, trip: null });
  const [zatcaRef, setZatcaRef] = useState('');
  const [invoicingNote, setInvoicingNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Bulk Mark-as-Invoiced (period) modal state
  const [bulkMarkModal, setBulkMarkModal] = useState<{
    open: boolean;
    row: CustomerBillingRow | null;
    trips: BillingLedgerTrip[];
    periodLabel: string;
  }>({ open: false, row: null, trips: [], periodLabel: 'All Time' });
  const [isBulkSaving, setIsBulkSaving] = useState(false);

  // Fetch billing ledger list
  const { data: res, isLoading } = useQuery({
    queryKey: ['customer-billing-ledger'],
    queryFn: () => tripService.getCustomerBillingLedger({}),
  });

  const rows: CustomerBillingRow[] = (res?.data as CustomerBillingRow[]) || [];

  // 1. Flatten all trips across all customers for the unified ledger view
  const allLedgerTrips = useMemo(() => {
    const list: (BillingLedgerTrip & { customerName: string; customerId: string; customerObj: any })[] = [];
    rows.forEach((r) => {
      (r.trips || []).forEach((t) => {
        list.push({
          ...t,
          customerName: r.customer?.name || 'Unknown',
          customerId: r.customer?.id || '',
          customerObj: r.customer,
        });
      });
    });
    return list;
  }, [rows]);

  // Status Filter State: 'ALL' | 'Invoiced' | 'NotInvoiced'
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Invoiced' | 'NotInvoiced'>('ALL');

  // Customer Combobox Options for top filter bar
  const customerOptions = useMemo(() => {
    const opts = [{ value: 'ALL', label: 'All Customer Companies' }];
    rows.forEach((r) => {
      opts.push({
        value: r.customer.id,
        label: `${r.customer.name} (${r.total_trips || 0} Trips)`,
      });
    });
    return opts;
  }, [rows]);

  // Filter Master Trips List
  const filteredTrips = useMemo(() => {
    let list = allLedgerTrips;

    // 1. Customer Filter
    if (selectedCustomerId && selectedCustomerId !== 'ALL') {
      list = list.filter((t) => t.customerId === selectedCustomerId);
    }

    // 2. Invoice Status Filter
    if (statusFilter === 'Invoiced') {
      list = list.filter((t) => t.status === 'Invoiced');
    } else if (statusFilter === 'NotInvoiced') {
      list = list.filter((t) => t.status !== 'Invoiced');
    }

    // 3. Search Query Filter
    if (tripSearch.trim()) {
      const q = tripSearch.toLowerCase().trim();
      list = list.filter((t) => {
        const refId = (t.ref_id || '').toLowerCase();
        const customer = (t.customerName || '').toLowerCase();
        const origin = getTripOrigin(t).toLowerCase();
        const dest = getTripDest(t).toLowerCase();
        const driver = getDriverDesc(t).toLowerCase();
        const vehicle = getVehicleDesc(t).toLowerCase();
        const cargo = getCargoDesc(t).toLowerCase();
        const zatca = (getInvoiceRec(t)?.zatca_ref || getInvoiceRec(t)?.ref_id || '').toLowerCase();
        return (
          refId.includes(q) ||
          customer.includes(q) ||
          origin.includes(q) ||
          dest.includes(q) ||
          driver.includes(q) ||
          vehicle.includes(q) ||
          cargo.includes(q) ||
          zatca.includes(q)
        );
      });
    }

    // 4. Date Range Filter
    if (dateRange?.from || dateRange?.to) {
      list = list.filter((t) => {
        const d = t.planned_start ? new Date(t.planned_start) : new Date(t.createdAt);
        if (isNaN(d.getTime())) return false;
        if (dateRange.from) {
          const fromDate = new Date(dateRange.from);
          fromDate.setHours(0, 0, 0, 0);
          if (d < fromDate) return false;
        }
        if (dateRange.to) {
          const toDate = new Date(dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          if (d > toDate) return false;
        }
        return true;
      });
    }

    // 5. Sort
    list = [...list].sort((a, b) => {
      if (tripSort === 'ref_id_asc') return (a.ref_id || '').localeCompare(b.ref_id || '');
      if (tripSort === 'status') return (a.status || '').localeCompare(b.status || '');
      const dateA = a.planned_start ? new Date(a.planned_start).getTime() : new Date(a.createdAt).getTime();
      const dateB = b.planned_start ? new Date(b.planned_start).getTime() : new Date(b.createdAt).getTime();
      return tripSort === 'oldest' ? dateA - dateB : dateB - dateA;
    });

    return list;
  }, [allLedgerTrips, selectedCustomerId, statusFilter, tripSearch, dateRange, tripSort]);

  // Executive Financial Metrics
  const kpiStats = useMemo(() => {
    let total = 0;
    let invoiced = 0;
    let pending = 0;
    let pendingCount = 0;

    filteredTrips.forEach((t) => {
      const amount = t.billing_amount || 0;
      total += amount;
      if (t.status === 'Invoiced') {
        invoiced += amount;
      } else {
        pending += amount;
        if (t.status === 'Completed') {
          pendingCount += 1;
        }
      }
    });

    return { total, invoiced, pending, pendingCount };
  }, [filteredTrips]);

  const pendingInPeriod = useMemo(() => filteredTrips.filter((t) => t.status === 'Completed'), [filteredTrips]);

  const periodLabel = useMemo(() => {
    if (dateRange?.from && dateRange?.to) {
      return `${format(dateRange.from, 'dd/MM/yyyy')} - ${format(dateRange.to, 'dd/MM/yyyy')}`;
    }
    if (dateRange?.from) {
      return `From ${format(dateRange.from, 'dd/MM/yyyy')}`;
    }
    return 'All Time';
  }, [dateRange]);

  const openMarkModal = (trip: BillingLedgerTrip) => {
    setMarkModal({ open: true, trip });
    setZatcaRef('');
    setInvoicingNote('');
  };

  const handleMarkInvoiced = async () => {
    if (!markModal.trip) return;
    setIsSaving(true);
    try {
      await tripService.markInvoiced(markModal.trip.id, {
        zatca_ref: zatcaRef.trim() || undefined,
        invoicing_note: invoicingNote.trim() || undefined,
      });
      toast.success(`Trip ${markModal.trip.ref_id} marked as Invoiced`);
      setMarkModal({ open: false, trip: null });
      queryClient.invalidateQueries({ queryKey: ['customer-billing-ledger'] });
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Failed to mark trip as invoiced');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnmark = async (trip: BillingLedgerTrip) => {
    if (!confirm(`Unmark ${trip.ref_id} as Invoiced and revert to Completed?`)) return;
    try {
      await tripService.unmarkInvoiced(trip.id);
      toast.success(`Trip ${trip.ref_id} reverted to Completed`);
      queryClient.invalidateQueries({ queryKey: ['customer-billing-ledger'] });
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Failed to unmark trip');
    }
  };

  const openBulkMarkModal = (trips: BillingLedgerTrip[], label: string) => {
    const firstRow = rows.find(r => r.customer.id === selectedCustomerId) || rows[0] || null;
    setBulkMarkModal({ open: true, row: firstRow, trips, periodLabel: label });
  };

  const handleConfirmBulkMark = async (zatcaRefInput: string, note: string) => {
    const trips = bulkMarkModal.trips;
    if (trips.length === 0) return;
    setIsBulkSaving(true);
    try {
      const results = await Promise.allSettled(
        trips.map((trip) =>
          tripService.markInvoiced(trip.id, {
            zatca_ref: zatcaRefInput.trim() || undefined,
            invoicing_note: note.trim() || undefined,
          })
        )
      );
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.length - succeeded;
      if (failed === 0) {
        toast.success(`${succeeded} trip${succeeded === 1 ? '' : 's'} marked as Invoiced`);
      } else {
        toast.error(`${succeeded} marked, ${failed} failed. Please retry the failed trips.`);
      }
      setBulkMarkModal({ open: false, row: null, trips: [], periodLabel: 'All Time' });
      queryClient.invalidateQueries({ queryKey: ['customer-billing-ledger'] });
    } finally {
      setIsBulkSaving(false);
    }
  };

  const totalTripsCount = allLedgerTrips.length;

  return (
    <DashboardLayout active="Invoices" title="Commercial Invoices & Billing Ledger">
      <div className="px-4 sm:px-6 pb-12 w-full flex flex-col animate-fade-in gap-5 bg-[#EEF1F6] dark:bg-slate-950 min-h-screen">
        
        {/* 1. Page Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-4 border-b border-slate-200/80 dark:border-slate-800/80 mt-4">
          <div className="flex items-center gap-3">
            <ReceiptText className="w-7 h-7 text-[#FA634E] shrink-0" />
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#3E3C3D] dark:text-slate-100 tracking-tight uppercase">
                COMMERCIAL INVOICES & BILLING LEDGER
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
                Manage customer invoicing, trip billing ledgers, ZATCA e-invoicing compliance, and payment settlements.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsExportOpen(true)}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 text-[#3E3C3D] dark:text-slate-200 rounded-xl px-3.5 cursor-pointer transition-all shadow-2xs"
            >
              <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span>Export Ledger</span>
            </Button>

            <Button
              size="sm"
              onClick={() => navigate('/invoices/new')}
              className="h-9 gap-1.5 text-xs font-bold bg-[#FA634E] hover:bg-[#FA634E]/90 text-white rounded-xl px-4 cursor-pointer shadow-xs border-none"
            >
              <ReceiptText className="w-3.5 h-3.5" />
              <span>+ Create New Invoice</span>
            </Button>
          </div>
        </div>

        {/* 2. Top Executive Metric Cards (4 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Booked Value */}
          <div className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl border border-black/[0.05] dark:border-slate-800 shadow-xs space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Total Booked Value</span>
            <div className="text-lg font-black text-slate-900 dark:text-white font-mono">
              SAR {kpiStats.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-500 block font-semibold">{filteredTrips.length} active trips in scope</span>
          </div>

          {/* Invoiced Revenue */}
          <div className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl border border-black/[0.05] dark:border-slate-800 shadow-xs space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">Invoiced Revenue</span>
            <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">
              SAR {kpiStats.invoiced.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-emerald-600/85 block font-semibold">{filteredTrips.filter(t => t.status === 'Invoiced').length} trips fully billed</span>
          </div>

          {/* Pending Invoice Value */}
          <div className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl border border-black/[0.05] dark:border-slate-800 shadow-xs space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 block">Pending Invoice Value</span>
            <div className="text-lg font-black text-amber-600 dark:text-amber-400 font-mono">
              SAR {kpiStats.pending.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-amber-600/85 block font-semibold">{kpiStats.pendingCount} completed trips pending</span>
          </div>

          {/* Active Accounts */}
          <div className="bg-white dark:bg-slate-900 p-4.5 rounded-2xl border border-black/[0.05] dark:border-slate-800 shadow-xs space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-500 block">Active Billing Accounts</span>
            <div className="text-lg font-black text-indigo-600 dark:text-indigo-400 font-mono">
              {rows.length} Customer Accounts
            </div>
            <span className="text-[10px] text-slate-500 block font-semibold">{totalTripsCount} total ledger trip records</span>
          </div>
        </div>

        {/* 3. Unified Dynamic Filter Toolbar & Actions */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-black/[0.05] dark:border-slate-800 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Query Input */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search ref, customer, route, driver..."
                value={tripSearch}
                onChange={e => setTripSearch(e.target.value)}
                className="pl-8.5 pr-3 h-9 text-xs w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#FA634E]"
              />
            </div>

            {/* Customer Dropdown Filter */}
            <div className="w-[200px]">
              <Select value={selectedCustomerId || 'ALL'} onValueChange={(val) => setSelectedCustomerId(val)}>
                <SelectTrigger className="h-9 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-xl">
                  <SelectValue placeholder="All Customers" />
                </SelectTrigger>
                <SelectContent>
                  {customerOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <span className="truncate">{opt.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Invoice Status Dropdown Filter */}
            <div className="w-[150px]">
              <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val as any)}>
                <SelectTrigger className="h-9 text-xs font-semibold bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-xl">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="Invoiced">Invoiced Only</SelectItem>
                  <SelectItem value="NotInvoiced">Pending Invoice</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Picker */}
            <div className="w-[200px]">
              <DateRangePicker
                value={dateRange}
                onChange={setDateRange}
                placeholder="Filter Date Horizon..."
                buttonClassName="h-9 w-full bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-xs font-semibold rounded-xl"
              />
            </div>

            {/* Sort Dropdown */}
            <SortDropdown
              value={tripSort}
              onChange={setTripSort}
              options={TRIP_BILLING_SORT_OPTIONS}
              triggerClassName="h-9 rounded-xl border-slate-200 bg-slate-50 dark:bg-slate-800/80 text-xs"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              onClick={() => openBulkMarkModal(pendingInPeriod, periodLabel)}
              disabled={pendingInPeriod.length === 0}
              className="h-9 px-4 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-2xs border-none rounded-xl disabled:opacity-40 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Mark Filtered Invoiced ({pendingInPeriod.length})
            </Button>
          </div>
        </div>

        {/* 4. Full-Width Commercial Billing Ledger Table */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-black/[0.05] dark:border-slate-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-800/50 text-slate-500 font-black uppercase tracking-wider text-[10px]">
                  <th className="px-4 py-3.5">Trip / Invoice Ref</th>
                  <th className="px-4 py-3.5">Customer Company</th>
                  <th className="px-4 py-3.5">Horizon / Date</th>
                  <th className="px-4 py-3.5">Route (Origin → Destination)</th>
                  <th className="px-4 py-3.5">Asset & Driver</th>
                  <th className="px-4 py-3.5 text-right">Contract Rate</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-700 dark:text-slate-300 text-xs">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <RefreshCw className="w-6 h-6 animate-spin text-[#FA634E]" />
                        <span className="font-bold text-xs">Loading billing ledger records...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredTrips.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-16 text-center text-slate-400">
                      <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No matching billing ledger records found</p>
                      <p className="text-xs text-slate-400 mt-1">Try adjusting search query, company dropdown, or date range filter.</p>
                    </td>
                  </tr>
                ) : (
                  filteredTrips.map((trip) => {
                    const inv = getInvoiceRec(trip);
                    const d = trip.planned_start ? new Date(trip.planned_start) : new Date(trip.createdAt);
                    const parentRow = rows.find(r => r.customer.id === trip.customerId);

                    return (
                      <tr
                        key={trip.id}
                        onClick={() => setSelectedTrip(trip)}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-mono font-bold text-[#FA634E] flex items-center gap-1">
                              {trip.ref_id}
                              <Eye className="w-3 h-3 text-slate-400 opacity-60" />
                            </span>
                            {inv?.zatca_ref && (
                              <span className="font-mono text-[9px] text-slate-400 flex items-center gap-1">
                                ZATCA: <strong className="text-slate-600 dark:text-slate-300">{inv.zatca_ref}</strong>
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <CompanyLogo
                              name={trip.customerName}
                              logoUrl={(trip.customerObj as any)?.logo_url || (trip.customerObj as any)?.avatar_url}
                              className="w-7 h-7"
                            />
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                              {trip.customerName}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                          {formatInDeploymentTz(d, tz, 'dd/MM/yyyy')}
                        </td>

                        <td className="px-4 py-3 max-w-[260px]">
                          <span className="font-bold text-slate-900 dark:text-slate-100 truncate block text-xs">
                            {getTripOrigin(trip)} → {getTripDest(trip)}
                          </span>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap text-[11px]">
                          <div className="font-bold text-slate-800 dark:text-slate-200 font-mono">{trip.vehicle?.plate_number || '—'}</div>
                          <div className="text-[10px] text-slate-400">{getDriverDesc(trip)}</div>
                        </td>

                        <td className="px-4 py-3 text-right font-mono font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                          SAR {(trip.billing_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>

                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {trip.status === 'Invoiced' ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold text-[10px] shadow-none rounded-md px-2 py-0.5">
                              Invoiced
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 font-bold text-[10px] shadow-none rounded-md px-2 py-0.5">
                              Pending
                            </Badge>
                          )}
                        </td>

                        <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            {parentRow && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setStatementConfig({ row: parentRow, preset: 'ALL' })}
                                title="View Customer Statement"
                                className="h-7 px-2 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 gap-1"
                              >
                                <FileSpreadsheet className="w-3 h-3" /> Statement
                              </Button>
                            )}

                            {trip.status === 'Completed' ? (
                              <Button
                                size="sm"
                                onClick={() => openMarkModal(trip)}
                                className="h-7 px-2.5 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-2xs border-none rounded-lg cursor-pointer"
                              >
                                <CheckCircle2 className="w-3 h-3" /> Mark Invoiced
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleUnmark(trip)}
                                className="h-7 px-2 text-[10px] font-semibold text-amber-600 border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/20 gap-1 rounded-lg"
                              >
                                <X className="w-3 h-3" /> Unmark
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3.5 px-5 bg-slate-50/70 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-mono text-slate-500">
            <span>Showing {filteredTrips.length} of {allLedgerTrips.length} total billing records</span>
            <span>Total Value: <strong>SAR {kpiStats.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></span>
          </div>
        </div>
      </div>

      {/* ── Quick Trip Summary Modal ── */}
      <QuickTripSummaryModal
        trip={selectedTrip}
        open={!!selectedTrip}
        onClose={() => setSelectedTrip(null)}
        onMark={openMarkModal}
        onUnmark={handleUnmark}
        navigate={navigate}
        tz={tz}
      />

      {/* ── Company Invoice Statement Modal ── */}
      <CompanyInvoiceStatementModal
        row={statementConfig.row}
        initialPreset={statementConfig.preset}
        initialCustomFrom={statementConfig.from}
        initialCustomTo={statementConfig.to}
        open={!!statementConfig.row}
        onClose={() => setStatementConfig({ row: null })}
        onSelectTrip={t => setSelectedTrip(t)}
        tz={tz}
      />

      {/* ── Bulk Mark as Invoiced (Period Preview) Modal ── */}
      <BulkMarkInvoicedModal
        open={bulkMarkModal.open}
        onClose={() => setBulkMarkModal({ open: false, row: null, trips: [], periodLabel: 'All Time' })}
        companyName={bulkMarkModal.row?.customer.name || ''}
        trips={bulkMarkModal.trips}
        periodLabel={bulkMarkModal.periodLabel}
        tz={tz}
        onConfirm={handleConfirmBulkMark}
        isSaving={isBulkSaving}
      />

      {/* ── Mark as Invoiced Modal ── */}
      <Dialog open={markModal.open} onOpenChange={open => { if (!open) setMarkModal({ open: false, trip: null }); }}>
        <DialogContent className="max-w-md rounded-2xl border-slate-200 dark:border-slate-800 p-0 overflow-hidden [&>button]:text-white [&>button]:top-5 [&>button]:right-5">
          <div className="p-5 pb-4 bg-[#3E3C3D] text-white">
            <DialogTitle className="text-base font-extrabold text-white">Mark as Invoiced</DialogTitle>
            <DialogDescription className="text-xs text-slate-300 mt-0.5">
              Record that an external invoice has been issued for this trip. MERCON tracks the reference only.
            </DialogDescription>
          </div>

          {markModal.trip && (
            <div className="space-y-4 p-5 text-xs">
              <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trip</span>
                  <span className="font-mono text-xs font-bold text-brand">{markModal.trip.ref_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Company</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white">{(markModal.trip as any).customer?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Route</span>
                  <span className="text-xs text-slate-650 dark:text-slate-300 font-bold">{getTripOrigin(markModal.trip)} → {getTripDest(markModal.trip)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-750 dark:text-slate-300 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  External / ZATCA Invoice Reference <span className="text-slate-400 font-normal">(optional)</span>
                </Label>
                <Input
                  value={zatcaRef}
                  onChange={e => setZatcaRef(e.target.value)}
                  placeholder="e.g. INV-2026-1042 or ZATCA reference"
                  className="h-9 text-xs font-mono border-slate-250 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-750 dark:text-slate-300 flex items-center gap-1.5">
                  <StickyNote className="w-3.5 h-3.5 text-slate-400" />
                  Notes <span className="text-slate-400 font-normal">(optional)</span>
                </Label>
                <Textarea
                  value={invoicingNote}
                  onChange={e => setInvoicingNote(e.target.value)}
                  placeholder="Any additional notes about this invoice..."
                  className="text-xs min-h-[72px] resize-none border-slate-250 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>
          )}

          <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 shrink-0">
            <Button variant="outline" size="sm" className="text-xs h-8.5 rounded-xl" onClick={() => setMarkModal({ open: false, trip: null })}>Cancel</Button>
            <Button size="sm" onClick={handleMarkInvoiced} disabled={isSaving}
              className="text-xs font-bold bg-[#FA634E] hover:bg-[#FA634E]/90 text-white gap-1.5 h-8.5 rounded-xl border-none">
              {isSaving ? 'Saving...' : <><CheckCircle2 className="w-3.5 h-3.5" /> Confirm Invoiced</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Universal Export Modal ── */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        title="Export Invoices & Billing Ledger"
        description="Choose your export preferences, filters, and columns."
        fileNamePrefix="company_billing_ledger"
        sheetName="Billing Ledger"
        subtitle="MERCON Logistics Company Invoicing Ledger"
        filteredData={rows.flatMap(r => r.trips)}
        allData={rows.flatMap(r => r.trips)}
        totalCount={totalTripsCount}
        columns={INVOICE_EXPORT_COLUMNS}
        filters={INVOICE_EXPORT_FILTERS}
        formats={['xlsx', 'csv', 'pdf']}
        rowDateAccessor={(t) => t.planned_start || t.createdAt}
      />
    </DashboardLayout>
  );
}
