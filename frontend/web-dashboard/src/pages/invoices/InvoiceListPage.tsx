import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Download, RotateCw, Search, CheckCircle2, X, CalendarDays,
  ChevronDown, ChevronRight, Building2, FileText, Hash, StickyNote,
  ExternalLink, Clock, Truck, User, Package, Printer, Eye, FileSpreadsheet,
  ArrowDownUp, ArrowDown, ArrowUp, Check, Filter
} from 'lucide-react';

import { downloadCSV } from '@/utils/exportUtils';
import ExportModal, { ExportColumn, ExportFilter } from '@/components/ui/ExportModal';
import {
  exportCustomerInvoiceExcel,
  exportAllLedgerExcel,
  InvoiceExcelFormat,
} from '@/utils/exportInvoiceExcel';
import DashboardLayout from '@/components/layout/DashboardLayout';
import KpiCard from '@/components/ui/KpiCard';
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

const PERIOD_PRESET_LABELS: Record<string, string> = {
  ALL: 'All Time',
  TODAY: 'Today',
  THIS_WEEK: 'This Week',
  THIS_MONTH: 'This Month',
  LAST_MONTH: 'Last Month',
  CUSTOM: 'Custom Range',
};

function getPeriodLabel(datePreset: string, customFrom: string, customTo: string) {
  if (datePreset === 'CUSTOM' || customFrom || customTo) {
    return `${customFrom || 'Start'} → ${customTo || 'End'}`;
  }
  return PERIOD_PRESET_LABELS[datePreset] || datePreset.replace('_', ' ');
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


// ── Quick Trip Summary Modal (Short Descriptive View) ──────────────────────────
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
      <DialogContent className="max-w-xl rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800">
        <DialogHeader className="p-5 pb-4 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <FileText className="w-5 h-5 text-brand shrink-0" />
              <div>
                <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Trip Summary & Invoicing</span>
                  <span className="font-mono text-sm text-brand">{trip.ref_id}</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Descriptive details for trip billing inspection
                </DialogDescription>
              </div>
            </div>
            {trip.status === 'Invoiced' ? (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-xs uppercase tracking-wider px-2.5 py-1 inline-flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>Invoiced</span>
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-bold text-xs uppercase tracking-wider px-2.5 py-1">
                Pending Invoice
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="p-5 space-y-4 text-xs">
          {/* Company Account */}
          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/40 p-3 flex items-center justify-between">
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
            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <CalendarDays className="w-3 h-3 text-slate-400" /> Planned / Actual Date
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {formatInDeploymentTz(startDate, tz, 'MMM d, yyyy')}
                {endDate ? ` → ${formatInDeploymentTz(endDate, tz, 'MMM d')}` : ''}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Package className="w-3 h-3 text-slate-400" /> Cargo Specifications
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {getCargoDesc(trip)}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Truck className="w-3 h-3 text-slate-400" /> Assigned Vehicle
              </span>
              <p className="font-semibold text-slate-800 dark:text-slate-200">
                {getVehicleDesc(trip)}
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 p-3 space-y-1">
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
                className="h-8 text-xs font-semibold text-amber-600 border-amber-300 hover:bg-amber-50 gap-1.5"
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

    // 1. Status filter
    if (statusFilter === 'Invoiced') {
      list = list.filter(t => t.status === 'Invoiced');
    } else if (statusFilter === 'NotInvoiced') {
      list = list.filter(t => t.status !== 'Invoiced');
    }

    // 2. Date preset / custom range filter
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

    // 3. Search query filter
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

    // 4. Sort
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
  const invoicedFiltered = filteredTrips.filter(t => t.status === 'Invoiced').length;
  const pendingFiltered = filteredTrips.filter(t => t.status !== 'Invoiced').length;
  const hasActiveFilters = datePreset !== 'ALL' || customFrom !== '' || customTo !== '' || statusFilter !== 'ALL' || statementSearch !== '';

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
      <DialogContent className="w-[96vw] max-w-[1360px] sm:max-w-[1360px] rounded-2xl p-0 sm:p-0 gap-0 overflow-hidden border-slate-200 dark:border-slate-800 max-h-[92vh] flex flex-col shadow-2xl">
        {/* Header bar */}
        <DialogHeader className="p-5 sm:px-6 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
            <div className="flex items-center gap-3">
              <Building2 className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <DialogTitle className="text-lg font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>{row.customer.name}</span>
                  <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold uppercase tracking-wider">
                    Company Statement
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-2">
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
                    className="h-8 gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Download Excel ({totalFiltered})
                    <ChevronDown className="w-3 h-3 opacity-80" />
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
                className="h-8 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" /> Print
              </Button>
            </div>
          </div>
        </DialogHeader>

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
                  <SelectItem value="CUSTOM">Custom Date Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(datePreset === 'CUSTOM' || customFrom || customTo) && (
              <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 p-0.5 px-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <input
                  type="date"
                  value={customFrom}
                  onChange={e => { setCustomFrom(e.target.value); setDatePreset('CUSTOM'); }}
                  className="h-7 text-xs bg-transparent border-0 text-slate-700 dark:text-slate-200 focus:outline-none"
                />
                <span className="text-xs text-slate-400 font-bold">—</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={e => { setCustomTo(e.target.value); setDatePreset('CUSTOM'); }}
                  className="h-7 text-xs bg-transparent border-0 text-slate-700 dark:text-slate-200 focus:outline-none"
                />
              </div>
            )}

            <Select value={statusFilter} onValueChange={v => setStatusFilter(v as any)}>
              <SelectTrigger className="h-8 text-xs w-36 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-medium shadow-2xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="Invoiced">Invoiced Only</SelectItem>
                <SelectItem value="NotInvoiced">Pending Only</SelectItem>
              </SelectContent>
            </Select>

            <SortDropdown
              value={sortOrder}
              onChange={setSortOrder}
              options={TRIP_BILLING_SORT_OPTIONS}
              triggerClassName="h-8"
              showSelectedLabel={false}
            />

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDatePreset('ALL');
                  setCustomFrom('');
                  setCustomTo('');
                  setStatusFilter('ALL');
                  setStatementSearch('');
                }}
                className="h-8 text-xs text-slate-500 hover:text-slate-900 gap-1 px-2"
              >
                <X className="w-3.5 h-3.5" /> Reset
              </Button>
            )}
          </div>
        </div>

        {/* Summary metric bar */}
        <div className="px-6 py-3 bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-indigo-100/80 dark:border-indigo-900/40 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center shrink-0">
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-indigo-100/60 dark:border-indigo-900/30">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Filtered Statement Trips</p>
            <p className="font-extrabold text-base text-slate-900 dark:text-slate-100">
              {totalFiltered} <span className="text-xs font-normal text-slate-500">of {row.trips.length} total</span>
            </p>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-indigo-100/60 dark:border-indigo-900/30">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Invoiced</p>
            <p className="font-extrabold text-base text-emerald-600">{invoicedFiltered}</p>
          </div>
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-indigo-100/60 dark:border-indigo-900/30">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Pending Invoicing</p>
            <p className="font-extrabold text-base text-amber-600">{pendingFiltered}</p>
          </div>
        </div>

        {/* Statement Trip Ledger Table */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto shadow-2xs">
            <table className="w-full text-xs">
              <thead className="bg-slate-50/90 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 text-left font-bold text-[10px] uppercase tracking-wider text-slate-500 whitespace-nowrap min-w-[150px]">Trip Ref</th>
                  <th className="px-4 py-3 text-left font-bold text-[10px] uppercase tracking-wider text-slate-500 whitespace-nowrap min-w-[110px]">Date</th>
                  <th className="px-4 py-3 text-left font-bold text-[10px] uppercase tracking-wider text-slate-500 whitespace-nowrap min-w-[280px]">Route Path</th>
                  <th className="px-4 py-3 text-left font-bold text-[10px] uppercase tracking-wider text-slate-500 whitespace-nowrap min-w-[220px]">Vehicle & Driver</th>
                  <th className="px-4 py-3 text-left font-bold text-[10px] uppercase tracking-wider text-slate-500 whitespace-nowrap min-w-[130px]">Cargo</th>
                  <th className="px-4 py-3 text-center font-bold text-[10px] uppercase tracking-wider text-slate-500 whitespace-nowrap min-w-[110px]">Status</th>
                  <th className="px-4 py-3 text-left font-bold text-[10px] uppercase tracking-wider text-slate-500 whitespace-nowrap min-w-[150px]">ZATCA / External Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTrips.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                      <FileText className="w-5 h-5 text-slate-400 shrink-0" />
                      <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No trips match the selected filters</p>
                      <p className="text-xs text-slate-400 mt-0.5">Try selecting a different date period or clearing the search keyword.</p>
                    </td>
                  </tr>
                ) : (
                  filteredTrips.map(trip => {
                    const inv = getInvoiceRec(trip);
                    const d = trip.planned_start ? new Date(trip.planned_start) : new Date(trip.createdAt);
                    return (
                      <tr
                        key={trip.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer transition-colors"
                        onClick={() => onSelectTrip?.(trip)}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-mono font-bold text-brand flex items-center gap-1.5">
                            {trip.ref_id}
                            <Eye className="w-3.5 h-3.5 text-slate-400 opacity-60 hover:opacity-100" />
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-400 whitespace-nowrap font-medium">
                          {formatInDeploymentTz(d, tz, 'MMM d, yyyy')}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5 text-xs font-semibold">
                            <span className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold max-w-[130px] truncate">
                              {getTripOrigin(trip)}
                            </span>
                            <span className="text-slate-400 font-bold">→</span>
                            <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold max-w-[130px] truncate">
                              {getTripDest(trip)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="space-y-0.5 text-xs">
                            <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              <Truck className="w-3 h-3 text-slate-400 shrink-0" />
                              {getVehicleDesc(trip)}
                            </p>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                              <User className="w-3 h-3 text-slate-400 shrink-0" />
                              {getDriverDesc(trip)}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-medium">
                            <Package className="w-3 h-3 text-slate-400" />
                            {getCargoDesc(trip)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {trip.status === 'Invoiced' ? (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 inline-flex items-center gap-1">
                              <Check className="w-2.5 h-2.5" />
                              <span>Invoiced</span>
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-bold text-[10px] uppercase tracking-wider px-2 py-0.5">
                              Pending
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                          {inv?.zatca_ref || inv?.ref_id ? (
                            <span className="text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 font-semibold">
                              {inv?.zatca_ref || inv?.ref_id}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
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

        {/* Modal Footer */}
        <DialogFooter className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500 font-mono">
            Showing {totalFiltered} of {row.trips.length} statement records for {row.customer.name}
          </span>
          <Button size="sm" variant="outline" className="text-xs font-semibold px-4" onClick={onClose}>
            Close Statement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Bulk Invoice Preview Modal (Mark Invoiced for a filtered period) ────────────
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
      <DialogContent className="w-[92vw] max-w-[900px] rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800 max-h-[88vh] flex flex-col">
        <DialogHeader className="p-5 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-emerald-600 shrink-0" />
            <div>
              <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                Invoice Preview — Mark {trips.length} Trip{trips.length === 1 ? '' : 's'} as Invoiced
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                {companyName} · {periodLabel}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-3 py-2 text-left font-bold text-[10px] uppercase tracking-wider text-slate-500">Trip Ref</th>
                  <th className="px-3 py-2 text-left font-bold text-[10px] uppercase tracking-wider text-slate-500">Route</th>
                  <th className="px-3 py-2 text-left font-bold text-[10px] uppercase tracking-wider text-slate-500">Date</th>
                  <th className="px-3 py-2 text-left font-bold text-[10px] uppercase tracking-wider text-slate-500">Cargo / Vehicle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {trips.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400 text-xs">
                      No pending trips to invoice in this period.
                    </td>
                  </tr>
                ) : trips.map(trip => {
                  const d = trip.planned_start ? new Date(trip.planned_start) : new Date(trip.createdAt);
                  return (
                    <tr key={trip.id}>
                      <td className="px-3 py-2 font-mono font-bold text-brand whitespace-nowrap">{trip.ref_id}</td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300 whitespace-nowrap">{getTripOrigin(trip)} → {getTripDest(trip)}</td>
                      <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{formatInDeploymentTz(d, tz, 'MMM d, yyyy')}</td>
                      <td className="px-3 py-2 text-slate-600 dark:text-slate-400 whitespace-nowrap">{getCargoDesc(trip)} · {getVehicleDesc(trip)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-3">
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
          <span className="text-xs text-slate-500 font-mono">{trips.length} trip{trips.length === 1 ? '' : 's'} will be marked Invoiced</span>
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

// ── Expandable trip sub-table with Date Range Preset Filter ────────────────────
function TripSubTable({
  row,
  onMark,
  onUnmark,
  onSelectTrip,
  onOpenStatement,
  onBulkMark,
  tz,
}: {
  row: CustomerBillingRow;
  onMark: (trip: BillingLedgerTrip) => void;
  onUnmark: (trip: BillingLedgerTrip) => void;
  onSelectTrip: (trip: BillingLedgerTrip) => void;
  onOpenStatement: (row: CustomerBillingRow, preset?: string, from?: string, to?: string) => void;
  onBulkMark: (row: CustomerBillingRow, trips: BillingLedgerTrip[], periodLabel: string) => void;
  tz: string;
}) {
  const trips = row.trips;
  const [datePreset, setDatePreset] = useState<string>('ALL');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<TripBillingSortOption>('latest');
  
  // Handle Preset Selection inside company table
  const handlePresetChange = (preset: string) => {
    setDatePreset(preset);
    if (preset !== 'CUSTOM') {
      setCustomFrom('');
      setCustomTo('');
    }
  };

  // Filter trips by Date Preset / Custom Range
  const filteredTrips = useMemo(() => {
    const sortList = (list: BillingLedgerTrip[]) => {
      return [...list].sort((a, b) => {
        if (sortOrder === 'ref_id_asc') return (a.ref_id || '').localeCompare(b.ref_id || '');
        if (sortOrder === 'status') return (a.status || '').localeCompare(b.status || '');
        const dateA = a.planned_start ? new Date(a.planned_start).getTime() : new Date(a.createdAt).getTime();
        const dateB = b.planned_start ? new Date(b.planned_start).getTime() : new Date(b.createdAt).getTime();
        return sortOrder === 'oldest' ? dateA - dateB : dateB - dateA;
      });
    };

    if (datePreset === 'ALL' && !customFrom && !customTo) {
      return sortList(trips);
    }

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

    return sortList(trips.filter(t => {
      const d = t.planned_start ? new Date(t.planned_start) : new Date(t.createdAt);
      if (isNaN(d.getTime())) return false;
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    }));
  }, [trips, datePreset, customFrom, customTo, sortOrder]);

  const pendingInPeriod = useMemo(() => filteredTrips.filter(t => t.status === 'Completed'), [filteredTrips]);
  const periodLabel = getPeriodLabel(datePreset, customFrom, customTo);

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-3 space-y-2.5">
      {/* Sub-table control bar: Date Range Preset + custom inputs + statement action */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 px-1 py-1">
        <div className="flex flex-wrap items-center gap-2">
          <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Period Filter:</span>
          <Select value={datePreset} onValueChange={handlePresetChange}>
            <SelectTrigger className="h-7 text-xs w-36 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 font-medium">
              <SelectValue placeholder="Select Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Time ({trips.length})</SelectItem>
              <SelectItem value="TODAY">Today</SelectItem>
              <SelectItem value="THIS_WEEK">This Week</SelectItem>
              <SelectItem value="THIS_MONTH">This Month</SelectItem>
              <SelectItem value="LAST_MONTH">Last Month</SelectItem>
              <SelectItem value="CUSTOM">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {(datePreset === 'CUSTOM' || customFrom || customTo) && (
            <div className="flex items-center gap-1.5 animate-fade-in">
              <input
                type="date"
                value={customFrom}
                onChange={e => { setCustomFrom(e.target.value); setDatePreset('CUSTOM'); }}
                className="h-7 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md px-2 text-slate-700 dark:text-slate-200"
              />
              <span className="text-xs text-slate-400">—</span>
              <input
                type="date"
                value={customTo}
                onChange={e => { setCustomTo(e.target.value); setDatePreset('CUSTOM'); }}
                className="h-7 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-md px-2 text-slate-700 dark:text-slate-200"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500 font-semibold text-xs font-mono">Showing {filteredTrips.length} of {trips.length} trips</span>
          <SortDropdown
            value={sortOrder}
            onChange={setSortOrder}
            options={TRIP_BILLING_SORT_OPTIONS}
            triggerClassName="h-7"
          />
          <Button
            size="sm"
            onClick={async () => {
              await exportCustomerInvoiceExcel(row, filteredTrips, 'ALL', periodLabel, tz);
              toast.success(`Excel statement downloaded (${filteredTrips.length} trips)`);
            }}
            className="h-7 px-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" /> Download Excel ({filteredTrips.length})
          </Button>
          <Button
            size="sm"
            onClick={() => onBulkMark(row, pendingInPeriod, periodLabel)}
            disabled={pendingInPeriod.length === 0}
            className="h-7 px-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="w-3.5 h-3.5" /> Mark Invoiced {periodLabel !== 'All Time' ? `${periodLabel} ` : ''}({pendingInPeriod.length})
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenStatement(row, datePreset, customFrom, customTo)}
            className="h-7 px-2.5 text-xs font-bold border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" /> Statement ({filteredTrips.length})
          </Button>
        </div>
      </div>

      {/* Trips list */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto shadow-2xs">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <th className="px-4 py-2 text-left font-bold text-[10px] uppercase tracking-wider text-slate-500">Trip Ref</th>
              <th className="px-4 py-2 text-left font-bold text-[10px] uppercase tracking-wider text-slate-500">Route</th>
              <th className="px-4 py-2 text-left font-bold text-[10px] uppercase tracking-wider text-slate-500">Date</th>
              <th className="px-4 py-2 text-left font-bold text-[10px] uppercase tracking-wider text-slate-500">Cargo / Vehicle</th>
              <th className="px-4 py-2 text-center font-bold text-[10px] uppercase tracking-wider text-slate-500">Status</th>
              <th className="px-4 py-2 text-left font-bold text-[10px] uppercase tracking-wider text-slate-500">ZATCA / Ext Ref</th>
              <th className="px-4 py-2 text-right font-bold text-[10px] uppercase tracking-wider text-slate-500">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredTrips.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400 text-xs">
                  No trips found for the selected period.
                </td>
              </tr>
            ) : (
              filteredTrips.map((trip: BillingLedgerTrip) => {
                const inv = getInvoiceRec(trip);
                const d = trip.planned_start ? new Date(trip.planned_start) : new Date(trip.createdAt);
                return (
                  <tr
                    key={trip.id}
                    className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                    onClick={() => onSelectTrip(trip)}
                  >
                    <td className="px-4 py-2.5">
                      <span className="font-mono font-bold text-brand flex items-center gap-1">
                        {trip.ref_id}
                        <Eye className="w-3 h-3 text-slate-400 opacity-60" />
                      </span>
                    </td>
                    <td className="px-4 py-2.5 max-w-[200px]">
                      <span className="text-slate-700 dark:text-slate-300 font-semibold truncate block">
                        {getTripOrigin(trip)} → {getTripDest(trip)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                      {formatInDeploymentTz(d, tz, 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {getCargoDesc(trip)} · {getVehicleDesc(trip)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {trip.status === 'Invoiced'
                        ? <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px] uppercase tracking-wider px-1.5 inline-flex items-center gap-1"><Check className="w-2.5 h-2.5" /><span>Invoiced</span></Badge>
                        : <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-bold text-[10px] uppercase tracking-wider px-1.5">Pending</Badge>
                      }
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-slate-400 max-w-[120px] truncate">
                      {inv?.zatca_ref || inv?.ref_id || '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                      {trip.status === 'Completed' ? (
                        <Button
                          size="sm"
                          onClick={() => onMark(trip)}
                          className="h-7 px-2.5 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                        >
                          <CheckCircle2 className="w-3 h-3" /> Mark Invoiced
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onUnmark(trip)}
                          className="h-7 px-2.5 text-[10px] font-semibold text-amber-600 border-amber-300 hover:bg-amber-50 gap-1"
                        >
                          <X className="w-3 h-3" /> Unmark
                        </Button>
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
  );
}

// ── Company row ───────────────────────────────────────────────────────────────
function CompanyRow({
  row,
  expanded,
  onToggle,
  onMark,
  onUnmark,
  onSelectTrip,
  onOpenStatement,
  onBulkMark,
  tz,
}: {
  row: CustomerBillingRow;
  expanded: boolean;
  onToggle: () => void;
  onMark: (trip: BillingLedgerTrip) => void;
  onUnmark: (trip: BillingLedgerTrip) => void;
  onSelectTrip: (trip: BillingLedgerTrip) => void;
  onOpenStatement: (row: CustomerBillingRow, preset?: string, from?: string, to?: string) => void;
  onBulkMark: (row: CustomerBillingRow, trips: BillingLedgerTrip[], periodLabel: string) => void;
  tz: string;
}) {
  return (
    <>
      {/* Company summary row */}
      <tr
        className={cn(
          'border-b border-slate-200 dark:border-slate-800 cursor-pointer transition-colors',
          expanded
            ? 'bg-indigo-50/60 dark:bg-indigo-950/20'
            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
        )}
        onClick={onToggle}
      >
        {/* Expand toggle + company name */}
        <td className="px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className={cn(
              'flex items-center justify-center w-5 h-5 rounded-md border transition-colors shrink-0',
              expanded
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500'
            )}>
              {expanded
                ? <ChevronDown className="w-3.5 h-3.5" />
                : <ChevronRight className="w-3.5 h-3.5" />
              }
            </span>
            <div className="min-w-0">
              <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{row.customer.name}</p>
              {row.customer.contact_phone && (
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{row.customer.contact_phone}</p>
              )}
            </div>
          </div>
        </td>
        {/* Trip counts moved to the right */}
        <td className="px-5 py-3.5 text-right whitespace-nowrap">
          <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{row.total_trips}</span>
          <span className="text-[11px] text-slate-400 font-medium ml-1">trips</span>
        </td>
        <td className="px-5 py-3.5 text-right whitespace-nowrap">
          {row.completed > 0
            ? <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-400">{row.completed}</span>
            : <span className="text-sm text-slate-300 dark:text-slate-600 font-semibold">—</span>
          }
        </td>
        <td className="px-5 py-3.5 text-right whitespace-nowrap">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-400">{row.invoiced}</span>
        </td>
      </tr>

      {/* Expandable trip sub-table */}
      {expanded && (
        <tr>
          <td colSpan={4} className="p-0">
            <TripSubTable
              row={row}
              onMark={onMark}
              onUnmark={onUnmark}
              onSelectTrip={onSelectTrip}
              onOpenStatement={onOpenStatement}
              onBulkMark={onBulkMark}
              tz={tz}
            />
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
type CompanyBillingSortOption = 'trips_desc' | 'name_asc' | 'name_desc' | 'pending_desc' | 'invoiced_desc';

const COMPANY_BILLING_SORT_OPTIONS: SortOption<CompanyBillingSortOption>[] = [
  { value: 'trips_desc', label: 'Total Trips (High → Low)', icon: <Truck className="w-3.5 h-3.5 text-blue-600" /> },
  { value: 'pending_desc', label: 'Pending Trips (High → Low)', icon: <Clock className="w-3.5 h-3.5 text-amber-600" /> },
  { value: 'invoiced_desc', label: 'Invoiced Trips (High → Low)', icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> },
  { value: 'name_asc', label: 'Company Name (A → Z)', icon: <Building2 className="w-3.5 h-3.5 text-purple-600" /> },
  { value: 'name_desc', label: 'Company Name (Z → A)', icon: <Building2 className="w-3.5 h-3.5 text-purple-600" /> },
];

export default function InvoiceListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tz = useDeploymentTimezone();

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [datePreset, setDatePreset] = useState<string>('ALL');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'' | 'NotInvoiced' | 'Invoiced'>('');
  const [companySort, setCompanySort] = useState<CompanyBillingSortOption>('trips_desc');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');

  const debouncedSearch = useDebouncedValue(search, 350);

  const filters: CustomerBillingFilters = {
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    invoice_status: invoiceStatusFilter || undefined,
    search: debouncedSearch || undefined,
  };

  const { data: res, isLoading, isError } = useQuery({
    queryKey: ['customer-billing-ledger', filters],
    queryFn: () => tripService.getCustomerBillingLedger(filters),
  });

  const rows: CustomerBillingRow[] = (res?.data as CustomerBillingRow[]) || [];
  const summary = (res?.meta as any)?.summary;

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (companySort === 'name_asc') return (a.customer?.name || '').localeCompare(b.customer?.name || '');
      if (companySort === 'name_desc') return (b.customer?.name || '').localeCompare(a.customer?.name || '');
      if (companySort === 'pending_desc') return (b.completed || 0) - (a.completed || 0);
      if (companySort === 'invoiced_desc') return (b.invoiced || 0) - (a.invoiced || 0);
      return (b.total_trips || 0) - (a.total_trips || 0);
    });
  }, [rows, companySort]);

  useEffect(() => {
    if (sortedRows.length > 0) {
      if (!selectedCustomerId || !sortedRows.some((r) => r.customer.id === selectedCustomerId)) {
        setSelectedCustomerId(sortedRows[0].customer.id);
      }
    } else {
      setSelectedCustomerId(null);
    }
  }, [sortedRows, selectedCustomerId]);

  const selectedRow = useMemo(() => {
    return sortedRows.find((r) => r.customer.id === selectedCustomerId) || sortedRows[0] || null;
  }, [sortedRows, selectedCustomerId]);

  const navCustomerRows = useMemo(() => {
    if (!customerSearchTerm.trim()) return sortedRows;
    const term = customerSearchTerm.toLowerCase();
    return sortedRows.filter((r) => r.customer.name.toLowerCase().includes(term));
  }, [sortedRows, customerSearchTerm]);

  const totalTrips    = summary?.total_trips ?? 0;
  const completedCnt  = summary?.completed ?? 0;
  const invoicedCnt   = summary?.invoiced ?? 0;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['customer-billing-ledger'] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleExportCSV = () => {
    const csvRows: any[] = [];
    rows.forEach(row => {
      row.trips.forEach(trip => {
        csvRows.push({
          company: row.customer.name,
          trip_ref: trip.ref_id,
          origin: getTripOrigin(trip),
          destination: getTripDest(trip),
          date: trip.planned_start ? formatInDeploymentTz(trip.planned_start, tz, 'MM/dd/yyyy') : '',
          cargo: getCargoDesc(trip),
          vehicle: getVehicleDesc(trip),
          driver: getDriverDesc(trip),
          invoice_status: trip.status === 'Invoiced' ? 'Invoiced' : 'Pending',
          ext_ref: getInvoiceRec(trip)?.zatca_ref || getInvoiceRec(trip)?.ref_id || '',
        });
      });
    });
    downloadCSV(csvRows, `company_billing_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  const openBulkMarkModal = (row: CustomerBillingRow, trips: BillingLedgerTrip[], periodLabel: string) => {
    setBulkMarkModal({ open: true, row, trips, periodLabel });
  };

  const handleConfirmBulkMark = async (zatcaRefInput: string, note: string) => {
    const trips = bulkMarkModal.trips;
    if (trips.length === 0) return;
    setIsBulkSaving(true);
    try {
      const results = await Promise.allSettled(
        trips.map(trip => tripService.markInvoiced(trip.id, {
          zatca_ref: zatcaRefInput.trim() || undefined,
          invoicing_note: note.trim() || undefined,
        }))
      );
      const succeeded = results.filter(r => r.status === 'fulfilled').length;
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

  const handleExportAllExcel = async () => {
    try {
      await exportAllLedgerExcel(rows, tz);
      toast.success('Master Company Billing Ledger Excel exported');
    } catch (e: any) {
      toast.error('Failed to export Excel: ' + (e?.message || 'Error'));
    }
  };

  const hasFilters = !!(invoiceStatusFilter || search);

  return (
    <DashboardLayout active="Invoices" title="Company Billing Ledger">
      <div className="px-4 sm:px-6 pb-10 w-full flex flex-col animate-fade-in gap-4">
        
        {/* 1. Page Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-4 border-b border-slate-200/80 dark:border-slate-800/80">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-[#3E3C3D] dark:text-slate-100 tracking-tight uppercase">
              COMPANY BILLING LEDGER
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-normal">
              Customer invoices, trip statements, and billing status.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Export Documents Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsExportOpen(true)}
              className="h-9 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 text-[#3E3C3D] dark:text-slate-200 rounded-lg px-3.5 cursor-pointer transition-all"
            >
              <Download className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span>Export Documents</span>
            </Button>

            {/* Refresh Button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRefresh}
              className="h-9 w-9 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-lg cursor-pointer"
              title="Refresh ledger data"
            >
              <RotateCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* 2. TWO-PANEL WORKSPACE (SAME AS QUOTATIONS) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          
          {/* LEFT PANEL: CUSTOMER NAVIGATOR */}
          <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col max-h-[calc(100vh-170px)] min-h-[540px]">
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 space-y-2 shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-wider text-[#3E3C3D] dark:text-slate-300">
                  CUSTOMERS ({navCustomerRows.length})
                </h2>
              </div>
              {/* Left Panel Customer Search Input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <Input
                  placeholder="Search customers..."
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  className="h-8 text-xs bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 pl-8 rounded-lg focus-visible:ring-1 focus-visible:ring-[#FA634E]"
                />
              </div>
            </div>

            {/* Scrollable Customer List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60 p-1.5 space-y-0.5">
              {isLoading ? (
                <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                  <RotateCw className="w-4 h-4 animate-spin text-slate-400" />
                  <span>Loading customer billing...</span>
                </div>
              ) : navCustomerRows.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No customers found
                </div>
              ) : (
                navCustomerRows.map((row) => {
                  const isSelected = selectedCustomerId === row.customer.id;

                  return (
                    <button
                      key={row.customer.id}
                      type="button"
                      onClick={() => setSelectedCustomerId(row.customer.id)}
                      className={cn(
                        "w-full text-left p-2.5 rounded-lg transition-all flex items-center justify-between gap-2.5 cursor-pointer group border-l-4",
                        isSelected
                          ? "bg-[#FA634E]/5 border-l-[#FA634E] border-y-transparent border-r-transparent text-[#3E3C3D] font-bold"
                          : "border-l-transparent text-[#3E3C3D] dark:text-slate-300 hover:bg-[#EEF1F6]"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <CompanyLogo
                          name={row.customer.name}
                          logoUrl={(row.customer as any).logo_url || (row.customer as any).avatar_url}
                          className="w-7 h-7"
                        />
                        <div className="min-w-0">
                          <div className="text-xs truncate font-bold text-[#3E3C3D] dark:text-slate-100">
                            {row.customer.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-normal truncate mt-0.5">
                            {row.total_trips} trips · {row.invoiced} Invoiced · {row.completed} Pending
                          </div>
                        </div>
                      </div>
                      <ChevronRight className={cn("w-3.5 h-3.5 shrink-0 transition-transform", isSelected ? "text-[#FA634E]" : "text-slate-300 group-hover:text-[#FA634E]")} />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* RIGHT PANEL: SELECTED CUSTOMER BILLING WORKSPACE */}
          <div className="lg:col-span-9 space-y-3">
            {selectedRow ? (
              <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col min-h-[540px]">
                
                {/* Selected Customer Workspace Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/30 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <CompanyLogo
                        name={selectedRow.customer.name}
                        logoUrl={(selectedRow.customer as any).logo_url || (selectedRow.customer as any).avatar_url}
                        className="w-10 h-10 shrink-0"
                      />
                      <div>
                        <h2 className="text-base font-black text-[#3E3C3D] dark:text-slate-100 tracking-tight">
                          {selectedRow.customer.name}
                        </h2>
                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                          Billing Workspace & Invoice Ledger
                        </p>
                      </div>
                    </div>

                    {/* Executive Metric Stat Counters */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Trips</span>
                        <span className="font-mono font-black text-xs text-[#3E3C3D] dark:text-slate-100">{selectedRow.total_trips}</span>
                      </div>

                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/90 dark:text-emerald-400">Invoiced</span>
                        <span className="font-mono font-black text-xs text-emerald-800 dark:text-emerald-300">{selectedRow.invoiced}</span>
                      </div>

                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700/90 dark:text-amber-400">Pending</span>
                        <span className="font-mono font-black text-xs text-amber-800 dark:text-amber-300">{selectedRow.completed}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Embedded Customer Billing Trip Ledger Table */}
                <TripSubTable
                  row={selectedRow}
                  onMark={openMarkModal}
                  onUnmark={handleUnmark}
                  onSelectTrip={t => setSelectedTrip(t)}
                  onOpenStatement={(r, preset, from, to) => setStatementConfig({ row: r, preset, from, to })}
                  onBulkMark={openBulkMarkModal}
                  tz={tz}
                />
              </div>
            ) : (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-lg border border-slate-200/80 dark:border-slate-800 text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No customer selected</p>
                <p className="text-xs text-slate-400 mt-1">Select a customer from the left list to view their billing ledger.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Quick Trip Summary Modal ────────────────────────────────────── */}
      <QuickTripSummaryModal
        trip={selectedTrip}
        open={!!selectedTrip}
        onClose={() => setSelectedTrip(null)}
        onMark={openMarkModal}
        onUnmark={handleUnmark}
        navigate={navigate}
        tz={tz}
      />

      {/* ── Company Invoice Statement Modal ─────────────────────────────── */}
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

      {/* ── Bulk Mark as Invoiced (Period Preview) Modal ────────────────── */}
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

      {/* ── Mark as Invoiced Modal ──────────────────────────────────────── */}
      <Dialog open={markModal.open} onOpenChange={open => { if (!open) setMarkModal({ open: false, trip: null }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100">Mark as Invoiced</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record that an external invoice has been issued for this trip. MERCON tracks the reference only.
            </DialogDescription>
          </DialogHeader>

          {markModal.trip && (
            <div className="space-y-4 pt-1">
              <div className="bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trip</span>
                  <span className="font-mono text-xs font-bold text-brand">{markModal.trip.ref_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Company</span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{(markModal.trip as any).customer?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Route</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400">{getTripOrigin(markModal.trip)} → {getTripDest(markModal.trip)}</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  External / ZATCA Invoice Reference <span className="text-slate-400 font-normal">(optional)</span>
                </Label>
                <Input
                  value={zatcaRef}
                  onChange={e => setZatcaRef(e.target.value)}
                  placeholder="e.g. INV-2026-1042 or ZATCA reference"
                  className="h-9 text-xs font-mono border-slate-200 dark:border-slate-700"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <StickyNote className="w-3.5 h-3.5 text-slate-400" />
                  Notes <span className="text-slate-400 font-normal">(optional)</span>
                </Label>
                <Textarea
                  value={invoicingNote}
                  onChange={e => setInvoicingNote(e.target.value)}
                  placeholder="Any additional notes about this invoice..."
                  className="text-xs min-h-[72px] resize-none border-slate-200 dark:border-slate-700"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setMarkModal({ open: false, trip: null })}>Cancel</Button>
            <Button size="sm" onClick={handleMarkInvoiced} disabled={isSaving}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
              {isSaving ? 'Saving...' : <><CheckCircle2 className="w-3.5 h-3.5" /> Confirm Invoiced</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Universal Export Modal ────────────────────────────────────── */}
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
        totalCount={totalTrips}
        columns={INVOICE_EXPORT_COLUMNS}
        filters={INVOICE_EXPORT_FILTERS}
        formats={['xlsx', 'csv', 'pdf']}
        rowDateAccessor={(t) => t.planned_start || t.createdAt}
      />

    </DashboardLayout>
  );
}
