import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Download, RotateCw, Search, CheckCircle2, X, CalendarDays,
  ChevronDown, ChevronRight, Building2, FileText, Hash, StickyNote,
  ExternalLink, Clock, Truck, User, Package, Printer, Eye, FileSpreadsheet
} from 'lucide-react';

import { downloadCSV } from '@/utils/exportUtils';
import DashboardLayout from '@/components/layout/DashboardLayout';
import KpiCard from '@/components/ui/KpiCard';
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

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
  const v = trip.vehicle;
  return `${v.plate_number}${v.make ? ` (${v.make})` : ''}`;
}
function getDriverDesc(trip: BillingLedgerTrip) {
  if (!trip.driver) return 'Unassigned';
  return trip.driver.name;
}
function getCargoDesc(trip: BillingLedgerTrip) {
  if (trip.cargo_type) return trip.cargo_type;
  if (trip.cargo_weight) return `${trip.cargo_weight} kg`;
  return 'General Cargo';
}

// ── Coverage badge ────────────────────────────────────────────────────────────
function CoverageBadge({ pct }: { pct: number }) {
  const cls = pct >= 100
    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : pct >= 60
    ? 'bg-amber-50 text-amber-700 border-amber-300'
    : 'bg-rose-50 text-rose-700 border-rose-200';
  return (
    <Badge variant="outline" className={`font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 ${cls}`}>
      {pct}% Invoiced
    </Badge>
  );
}

// ── Quick Trip Summary Modal (Short Descriptive View) ──────────────────────────
function QuickTripSummaryModal({
  trip,
  open,
  onClose,
  onMark,
  onUnmark,
  navigate,
}: {
  trip: BillingLedgerTrip | null;
  open: boolean;
  onClose: () => void;
  onMark: (trip: BillingLedgerTrip) => void;
  onUnmark: (trip: BillingLedgerTrip) => void;
  navigate: (path: string) => void;
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
              <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center border border-orange-200/60 dark:border-orange-900/40">
                <FileText className="w-4.5 h-4.5 text-[#E8450F]" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>Trip Summary & Invoicing</span>
                  <span className="font-mono text-sm text-[#E8450F]">{trip.ref_id}</span>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Descriptive details for trip billing inspection
                </DialogDescription>
              </div>
            </div>
            {trip.status === 'Invoiced' ? (
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-xs uppercase tracking-wider px-2.5 py-1">
                ✓ Invoiced
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
                {startDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                {endDate ? ` → ${endDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}` : ''}
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
              className="h-8 text-xs font-bold bg-[#E8450F] hover:bg-[#d03d0c] text-white gap-1.5"
            >
              View Full Details <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Company Invoice Statement Modal (Batch Filter Solution) ─────────────────────
function CompanyInvoiceStatementModal({
  row,
  open,
  onClose,
}: {
  row: CustomerBillingRow | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!row) return null;

  const handleExportCompanyCSV = () => {
    const csvRows = row.trips.map(trip => ({
      company: row.customer.name,
      trip_ref: trip.ref_id,
      origin: getTripOrigin(trip),
      destination: getTripDest(trip),
      date: trip.planned_start ? new Date(trip.planned_start).toLocaleDateString() : '',
      cargo: getCargoDesc(trip),
      vehicle: getVehicleDesc(trip),
      driver: getDriverDesc(trip),
      invoicing_status: trip.status === 'Invoiced' ? 'Invoiced' : 'Pending',
      ext_zatca_ref: getInvoiceRec(trip)?.zatca_ref || getInvoiceRec(trip)?.ref_id || '—',
    }));
    downloadCSV(csvRows, `${row.customer.name.replace(/\s+/g, '_')}_Invoice_Statement_${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl rounded-2xl p-0 overflow-hidden border-slate-200 dark:border-slate-800 max-h-[90vh] flex flex-col">
        <DialogHeader className="p-5 pb-4 bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-900/40">
                <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Company Invoice Statement
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 font-bold mt-0.5">
                  {row.customer.name} {row.customer.contact_phone ? `· ${row.customer.contact_phone}` : ''}
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCompanyCSV}
                className="h-8 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" /> Export CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="h-8 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" /> Print
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Summary metric bar */}
        <div className="bg-indigo-50/60 dark:bg-indigo-950/30 px-5 py-3 border-b border-indigo-100 dark:border-indigo-900/40 grid grid-cols-4 gap-3 text-center shrink-0">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Total Trips</p>
            <p className="font-extrabold text-base text-slate-900 dark:text-slate-100">{row.trips.length}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Invoiced</p>
            <p className="font-extrabold text-base text-emerald-600">{row.invoiced_count}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">Pending</p>
            <p className="font-extrabold text-base text-amber-600">{row.pending_count}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">Coverage Ratio</p>
            <p className="font-extrabold text-base text-indigo-600 dark:text-indigo-400">
              {Math.round((row.invoiced_count / (row.trips.length || 1)) * 100)}%
            </p>
          </div>
        </div>

        {/* Statement Trip Ledger Table */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-3.5 py-2.5 text-left font-bold text-[10px] uppercase tracking-wider text-slate-500">Trip Ref</th>
                  <th className="px-3.5 py-2.5 text-left font-bold text-[10px] uppercase tracking-wider text-slate-500">Date</th>
                  <th className="px-3.5 py-2.5 text-left font-bold text-[10px] uppercase tracking-wider text-slate-500">Route</th>
                  <th className="px-3.5 py-2.5 text-left font-bold text-[10px] uppercase tracking-wider text-slate-500">Vehicle / Driver</th>
                  <th className="px-3.5 py-2.5 text-left font-bold text-[10px] uppercase tracking-wider text-slate-500">Cargo</th>
                  <th className="px-3.5 py-2.5 text-center font-bold text-[10px] uppercase tracking-wider text-slate-500">Status</th>
                  <th className="px-3.5 py-2.5 text-left font-bold text-[10px] uppercase tracking-wider text-slate-500">ZATCA Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {row.trips.map(trip => {
                  const inv = getInvoiceRec(trip);
                  const d = trip.planned_start ? new Date(trip.planned_start) : new Date(trip.createdAt);
                  return (
                    <tr key={trip.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-3.5 py-2.5 font-mono font-bold text-[#E8450F]">{trip.ref_id}</td>
                      <td className="px-3.5 py-2.5 text-slate-500 whitespace-nowrap">
                        {d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-700 dark:text-slate-300 font-semibold max-w-[180px] truncate">
                        {getTripOrigin(trip)} → {getTripDest(trip)}
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-400">
                        {getVehicleDesc(trip)} · {getDriverDesc(trip)}
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-400 font-medium">{getCargoDesc(trip)}</td>
                      <td className="px-3.5 py-2.5 text-center">
                        {trip.status === 'Invoiced' ? (
                          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px] uppercase tracking-wider px-1.5">✓ Invoiced</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-bold text-[10px] uppercase tracking-wider px-1.5">Pending</Badge>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-[10px] text-slate-500">
                        {inv?.zatca_ref || inv?.ref_id || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <Button size="sm" variant="outline" className="text-xs" onClick={onClose}>Close Statement</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Expandable trip sub-table with Date Range Preset Filter ────────────────────
function TripSubTable({
  trips,
  onMark,
  onUnmark,
  onSelectTrip,
}: {
  trips: BillingLedgerTrip[];
  onMark: (trip: BillingLedgerTrip) => void;
  onUnmark: (trip: BillingLedgerTrip) => void;
  onSelectTrip: (trip: BillingLedgerTrip) => void;
}) {
  const [datePreset, setDatePreset] = useState<string>('ALL');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');

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
    if (datePreset === 'ALL' && !customFrom && !customTo) return trips;

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

    return trips.filter(t => {
      const d = t.planned_start ? new Date(t.planned_start) : new Date(t.createdAt);
      if (isNaN(d.getTime())) return false;
      if (fromDate && d < fromDate) return false;
      if (toDate && d > toDate) return false;
      return true;
    });
  }, [trips, datePreset, customFrom, customTo]);

  return (
    <div className="border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 p-3 space-y-2.5">
      {/* Sub-table control bar: Date Range Preset + custom inputs + summary */}
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

        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="text-slate-500 font-semibold">Showing {filteredTrips.length} of {trips.length} trips</span>
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
                      <span className="font-mono font-bold text-[#E8450F] flex items-center gap-1">
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
                      {d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {getCargoDesc(trip)} · {getVehicleDesc(trip)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {trip.status === 'Invoiced'
                        ? <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold text-[10px] uppercase tracking-wider px-1.5">✓ Invoiced</Badge>
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
}: {
  row: CustomerBillingRow;
  expanded: boolean;
  onToggle: () => void;
  onMark: (trip: BillingLedgerTrip) => void;
  onUnmark: (trip: BillingLedgerTrip) => void;
  onSelectTrip: (trip: BillingLedgerTrip) => void;
  onOpenStatement: (row: CustomerBillingRow) => void;
}) {
  const coverageRatio = Math.round((row.invoiced_count / (row.total_trips || 1)) * 100);

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
        <td className="px-4 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className={cn(
              'flex items-center justify-center w-5 h-5 rounded-md border transition-colors shrink-0',
              expanded
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500'
            )}>
              {expanded
                ? <ChevronDown className="w-3 h-3" />
                : <ChevronRight className="w-3 h-3" />
              }
            </span>
            <div className="min-w-0">
              <p className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">{row.customer.name}</p>
              {row.customer.contact_phone && (
                <p className="text-[10px] text-slate-400 font-mono">{row.customer.contact_phone}</p>
              )}
            </div>
          </div>
        </td>
        {/* Trip counts */}
        <td className="px-4 py-3.5 text-center">
          <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{row.total_trips}</span>
        </td>
        <td className="px-4 py-3.5 text-center">
          {row.pending_count > 0
            ? <span className="font-bold text-sm text-amber-600">{row.pending_count}</span>
            : <span className="text-sm text-slate-300 font-semibold">—</span>
          }
        </td>
        <td className="px-4 py-3.5 text-center">
          <span className="font-bold text-sm text-emerald-600">{row.invoiced_count}</span>
        </td>
        {/* Coverage ratio */}
        <td className="px-4 py-3.5 text-center">
          <CoverageBadge pct={coverageRatio} />
        </td>
        {/* Actions */}
        <td className="px-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenStatement(row)}
            className="h-7 px-2.5 text-[11px] font-bold border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" /> Invoice Statement
          </Button>
        </td>
      </tr>

      {/* Expandable trip sub-table */}
      {expanded && (
        <tr>
          <td colSpan={6} className="p-0">
            <TripSubTable
              trips={row.trips}
              onMark={onMark}
              onUnmark={onUnmark}
              onSelectTrip={onSelectTrip}
            />
          </td>
        </tr>
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function InvoiceListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [datePreset, setDatePreset] = useState<string>('ALL');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'' | 'NotInvoiced' | 'Invoiced'>('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Selected Trip Modal state
  const [selectedTrip, setSelectedTrip] = useState<BillingLedgerTrip | null>(null);

  // Selected Company Statement Modal state
  const [statementRow, setStatementRow] = useState<CustomerBillingRow | null>(null);

  // Mark-as-Invoiced modal state
  const [markModal, setMarkModal] = useState<{ open: boolean; trip: BillingLedgerTrip | null }>({ open: false, trip: null });
  const [zatcaRef, setZatcaRef] = useState('');
  const [invoicingNote, setInvoicingNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
          date: trip.planned_start ? new Date(trip.planned_start).toLocaleDateString() : '',
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

  const hasFilters = !!(invoiceStatusFilter || search);

  return (
    <DashboardLayout active="Invoices" title="Company Billing Ledger">
      <div className="px-4 sm:px-6 pb-6 w-full flex flex-col gap-5 max-w-[1400px] mx-auto animate-fade-in">

        {/* ── Top Bar ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 pb-1 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Company Billing Ledger</h1>
            <Badge className="bg-indigo-50 text-indigo-600 border-indigo-200 font-semibold text-xs">Invoicing Module</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-8 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <Download className="w-3.5 h-3.5 text-emerald-600" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="h-8 w-8 p-0 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* ── 2. Instrument-Panel KPI Cards ───────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 shrink-0">
          <KpiCard
            title="TOTAL COMPANIES"
            value={
              <span>
                {rows.length}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Accounts</span>
              </span>
            }
            variant="slate"
            description={`${totalTrips} total ledger trips`}
            icon={Building2}
            isActive={!invoiceStatusFilter}
            onClick={() => setInvoiceStatusFilter('')}
            progressSegments={[
              { label: `Invoiced (${invoicedCnt})`, value: invoicedCnt, color: 'bg-emerald-500' },
              { label: `Pending (${completedCnt})`, value: completedCnt, color: 'bg-amber-500' },
            ]}
          />

          <KpiCard
            title="TOTAL TRIPS"
            value={
              <span>
                {totalTrips}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Trips</span>
              </span>
            }
            variant="blue"
            description={`${invoicedCnt} invoiced · ${completedCnt} pending`}
            icon={Truck}
            isActive={!invoiceStatusFilter}
            onClick={() => setInvoiceStatusFilter('')}
          />

          <KpiCard
            title="PENDING INVOICING"
            value={
              <span>
                {completedCnt}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Pending</span>
              </span>
            }
            variant={completedCnt > 0 ? 'amber' : 'slate'}
            description="Completed trips awaiting invoice"
            icon={Clock}
            isActive={invoiceStatusFilter === 'NotInvoiced'}
            onClick={() => setInvoiceStatusFilter(invoiceStatusFilter === 'NotInvoiced' ? '' : 'NotInvoiced')}
          />

          <KpiCard
            title="INVOICED TRIPS"
            value={
              <span>
                {invoicedCnt}
                <span className="text-[16px] font-semibold ml-1.5 opacity-85">Invoiced</span>
              </span>
            }
            variant="emerald"
            description={`${invoicedCnt > 0 ? Math.round((invoicedCnt / (totalTrips || 1)) * 100) : 0}% completion ratio`}
            icon={CheckCircle2}
            isActive={invoiceStatusFilter === 'Invoiced'}
            onClick={() => setInvoiceStatusFilter(invoiceStatusFilter === 'Invoiced' ? '' : 'Invoiced')}
          />
        </div>

        {/* ── Filter Toolbar ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              placeholder="Search company or trip..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs w-56 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>

          <Select value={invoiceStatusFilter} onValueChange={v => setInvoiceStatusFilter(v as any)}>
            <SelectTrigger className="h-8 text-xs w-40 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="NotInvoiced">Pending Only</SelectItem>
              <SelectItem value="Invoiced">Invoiced Only</SelectItem>
            </SelectContent>
          </Select>

          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-500 hover:text-slate-900 gap-1"
              onClick={() => { setSearch(''); setInvoiceStatusFilter(''); }}>
              <X className="w-3 h-3" /> Clear
            </Button>
          )}
        </div>

        {/* ── Company Ledger Table ──────────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Company Billing Ledger</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">{rows.length} companies · {totalTrips} trips</span>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto shadow-sm">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="inline-flex items-center gap-2 text-slate-400 text-sm">
                  <RotateCw className="w-4 h-4 animate-spin" /> Loading billing data...
                </div>
              </div>
            ) : isError ? (
              <div className="p-8 text-center text-rose-500 text-sm font-semibold">Failed to load billing data. Please refresh.</div>
            ) : rows.length === 0 ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                  <FileText className="w-6 h-6 text-slate-300" />
                </div>
                <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">No billing data found</p>
                <p className="text-xs text-slate-400 mt-1">
                  {invoiceStatusFilter === 'NotInvoiced'
                    ? 'All trips have been invoiced!'
                    : 'No completed or invoiced trips match the current filters.'}
                </p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold text-[10px] uppercase tracking-wider text-slate-500 min-w-[200px]">Company</th>
                    <th className="px-4 py-3 text-center font-bold text-[10px] uppercase tracking-wider text-slate-500">Total Trips</th>
                    <th className="px-4 py-3 text-center font-bold text-[10px] uppercase tracking-wider text-amber-500">Pending</th>
                    <th className="px-4 py-3 text-center font-bold text-[10px] uppercase tracking-wider text-emerald-600">Invoiced</th>
                    <th className="px-4 py-3 text-center font-bold text-[10px] uppercase tracking-wider text-slate-500">Coverage Status</th>
                    <th className="px-4 py-3 text-right font-bold text-[10px] uppercase tracking-wider text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <CompanyRow
                      key={row.customer.id}
                      row={row}
                      expanded={expandedIds.has(row.customer.id)}
                      onToggle={() => toggleExpand(row.customer.id)}
                      onMark={openMarkModal}
                      onUnmark={handleUnmark}
                      onSelectTrip={t => setSelectedTrip(t)}
                      onOpenStatement={r => setStatementRow(r)}
                    />
                  ))}
                </tbody>
              </table>
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
      />

      {/* ── Company Invoice Statement Modal ─────────────────────────────── */}
      <CompanyInvoiceStatementModal
        row={statementRow}
        open={!!statementRow}
        onClose={() => setStatementRow(null)}
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
                  <span className="font-mono text-xs font-bold text-[#E8450F]">{markModal.trip.ref_id}</span>
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
    </DashboardLayout>
  );
}
