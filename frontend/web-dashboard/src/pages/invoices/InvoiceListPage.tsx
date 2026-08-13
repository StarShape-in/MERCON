import { useState } from 'react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Download, RotateCw, Search, CheckCircle2, X, CalendarDays,
  ChevronDown, ChevronRight, Building2, FileText, Hash, StickyNote,
  ExternalLink
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
function fmt(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function getTripOrigin(trip: BillingLedgerTrip) {
  const p = trip.stops?.find((s: any) => s.stop_type === 'Pickup');
  return p?.location?.name ?? p?.location_name ?? '—';
}
function getTripDest(trip: BillingLedgerTrip) {
  const d = trip.stops?.filter((s: any) => s.stop_type === 'Dropoff') ?? [];
  const last = d[d.length - 1];
  return last?.location?.name ?? last?.location_name ?? '—';
}
function getTripTotal(trip: BillingLedgerTrip) {
  return (trip.billing_amount ?? (trip as any).trip_charges ?? 0)
    + ((trip as any).waiting_labor_charges ?? 0)
    + ((trip as any).additional_stop_charges ?? 0);
}
function getInvoiceRec(trip: BillingLedgerTrip) {
  return trip.invoices?.[0] ?? null;
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
      {pct}%
    </Badge>
  );
}

// ── Expandable trip sub-table ──────────────────────────────────────────────────
function TripSubTable({
  trips,
  onMark,
  onUnmark,
  navigate,
}: {
  trips: BillingLedgerTrip[];
  onMark: (trip: BillingLedgerTrip) => void;
  onUnmark: (trip: BillingLedgerTrip) => void;
  navigate: (path: string) => void;
}) {
  return (
    <div className="border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-slate-200 dark:border-slate-800">
            <th className="px-4 py-2 text-left font-bold text-[10px] uppercase tracking-wider text-slate-400">Trip Ref</th>
            <th className="px-4 py-2 text-left font-bold text-[10px] uppercase tracking-wider text-slate-400">Route</th>
            <th className="px-4 py-2 text-left font-bold text-[10px] uppercase tracking-wider text-slate-400">Date</th>
            <th className="px-4 py-2 text-right font-bold text-[10px] uppercase tracking-wider text-slate-400">Total</th>
            <th className="px-4 py-2 text-center font-bold text-[10px] uppercase tracking-wider text-slate-400">Status</th>
            <th className="px-4 py-2 text-left font-bold text-[10px] uppercase tracking-wider text-slate-400">Ext. Ref</th>
            <th className="px-4 py-2 text-right font-bold text-[10px] uppercase tracking-wider text-slate-400">Action</th>
          </tr>
        </thead>
        <tbody>
          {trips.map(trip => {
            const inv = getInvoiceRec(trip);
            const d = trip.planned_start ? new Date(trip.planned_start) : new Date(trip.createdAt);
            return (
              <tr
                key={trip.id}
                className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-100/60 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
                onClick={() => navigate(`/trips/${trip.id}`)}
              >
                <td className="px-4 py-2.5">
                  <span className="font-mono font-bold text-[#E8450F]">{trip.ref_id}</span>
                </td>
                <td className="px-4 py-2.5 max-w-[200px]">
                  <span className="text-slate-600 dark:text-slate-400 truncate block">
                    {getTripOrigin(trip)} → {getTripDest(trip)}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                  {d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                  SAR {fmt(getTripTotal(trip))}
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
          })}
        </tbody>
      </table>
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
  navigate,
}: {
  row: CustomerBillingRow;
  expanded: boolean;
  onToggle: () => void;
  onMark: (trip: BillingLedgerTrip) => void;
  onUnmark: (trip: BillingLedgerTrip) => void;
  navigate: (path: string) => void;
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
          {row.completed > 0
            ? <span className="font-bold text-sm text-amber-600">{row.completed}</span>
            : <span className="text-sm text-slate-300 font-semibold">—</span>
          }
        </td>
        <td className="px-4 py-3.5 text-center">
          <span className="font-bold text-sm text-emerald-600">{row.invoiced}</span>
        </td>
        {/* Coverage */}
        <td className="px-4 py-3.5 text-center">
          <CoverageBadge pct={row.coverage_pct} />
        </td>
        {/* Amounts */}
        <td className="px-4 py-3.5 text-right">
          <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400">SAR {fmt(row.pending_amount)}</span>
        </td>
        <td className="px-4 py-3.5 text-right">
          <span className="font-mono text-xs font-semibold text-emerald-600">SAR {fmt(row.invoiced_amount)}</span>
        </td>
        <td className="px-4 py-3.5 text-right">
          <span className="font-mono text-sm font-black text-slate-900 dark:text-slate-100">SAR {fmt(row.total_billing)}</span>
        </td>
      </tr>

      {/* Expandable trip sub-table */}
      {expanded && (
        <tr>
          <td colSpan={8} className="p-0">
            <TripSubTable
              trips={row.trips}
              onMark={onMark}
              onUnmark={onUnmark}
              navigate={navigate}
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
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'' | 'NotInvoiced' | 'Invoiced'>('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);

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
  const coveragePct   = summary?.coverage_pct ?? 0;
  const totalBilling  = summary?.total_billing ?? 0;
  const pendingAmt    = summary?.pending_amount ?? 0;
  const invoicedAmt   = summary?.invoiced_amount ?? 0;

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
          total_charges: getTripTotal(trip),
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

  const hasFilters = !!(invoiceStatusFilter || dateFrom || dateTo || search);

  return (
    <DashboardLayout active="Invoices" title="Company Billing Ledger">
      <div className="px-4 sm:px-6 pb-6 h-full flex flex-col gap-5 max-w-[1400px] mx-auto w-full animate-fade-in">

        {/* ── Top Bar ──────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 shrink-0 pb-1 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Company Billing Ledger</h1>
            <Badge className="bg-indigo-50 text-indigo-600 border-indigo-200 font-semibold text-xs">Invoicing Module</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleExportCSV} className="h-8 gap-1.5 text-xs font-semibold border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <Download className="w-3.5 h-3.5" /> Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing} className="h-8 w-8 p-0 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* ── KPI Cards ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <KpiCard label="TOTAL COMPANIES" value={String(rows.length)} subtitle="With billing activity" variant="slate" />
          <KpiCard label="PENDING INVOICING" value={String(completedCnt)} subtitle={`SAR ${fmt(pendingAmt)}`} variant={completedCnt > 0 ? 'amber' : 'slate'} />
          <KpiCard label="INVOICED TRIPS" value={String(invoicedCnt)} subtitle={`SAR ${fmt(invoicedAmt)}`} variant="emerald" />
          <KpiCard label="COVERAGE" value={`${coveragePct}%`} subtitle={`SAR ${fmt(totalBilling)} total`} variant={coveragePct >= 90 ? 'emerald' : coveragePct >= 60 ? 'amber' : 'rose'} />
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

          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="h-8 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md px-2 text-slate-700 dark:text-slate-200" />
            <span className="text-xs text-slate-400">—</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="h-8 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md px-2 text-slate-700 dark:text-slate-200" />
          </div>

          {hasFilters && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-500 hover:text-slate-900 gap-1"
              onClick={() => { setSearch(''); setInvoiceStatusFilter(''); setDateFrom(''); setDateTo(''); }}>
              <X className="w-3 h-3" /> Clear
            </Button>
          )}
        </div>

        {/* ── Company Ledger Table ──────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0 overflow-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Company Billing Ledger</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">{rows.length} companies · {totalTrips} trips</span>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
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
                    <th className="px-4 py-3 text-center font-bold text-[10px] uppercase tracking-wider text-slate-500">Coverage</th>
                    <th className="px-4 py-3 text-right font-bold text-[10px] uppercase tracking-wider text-amber-500">Pending (SAR)</th>
                    <th className="px-4 py-3 text-right font-bold text-[10px] uppercase tracking-wider text-emerald-600">Invoiced (SAR)</th>
                    <th className="px-4 py-3 text-right font-bold text-[10px] uppercase tracking-wider text-slate-500">Total (SAR)</th>
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
                      navigate={navigate}
                    />
                  ))}
                </tbody>
                {/* Totals footer */}
                <tfoot className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60">
                  <tr>
                    <td className="px-4 py-3 font-black text-xs text-slate-700 dark:text-slate-300">TOTALS</td>
                    <td className="px-4 py-3 text-center font-black text-xs text-slate-800 dark:text-slate-200">{totalTrips}</td>
                    <td className="px-4 py-3 text-center font-black text-xs text-amber-600">{completedCnt}</td>
                    <td className="px-4 py-3 text-center font-black text-xs text-emerald-600">{invoicedCnt}</td>
                    <td className="px-4 py-3 text-center"><CoverageBadge pct={coveragePct} /></td>
                    <td className="px-4 py-3 text-right font-mono font-black text-xs text-amber-600">SAR {fmt(pendingAmt)}</td>
                    <td className="px-4 py-3 text-right font-mono font-black text-xs text-emerald-600">SAR {fmt(invoicedAmt)}</td>
                    <td className="px-4 py-3 text-right font-mono font-black text-sm text-slate-900 dark:text-slate-100">SAR {fmt(totalBilling)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>

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
              <div className="bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-1.5">
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
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Charges</span>
                  <span className="font-mono text-sm font-black text-slate-900 dark:text-slate-100">SAR {fmt(getTripTotal(markModal.trip))}</span>
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
