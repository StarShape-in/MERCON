import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Download, RotateCw, CheckCircle2, Search, ExternalLink,
  Trash2, FileText, Building2, CalendarDays, X, Hash
} from 'lucide-react';

import { downloadCSV } from '@/utils/exportUtils';
import DashboardLayout from '@/components/layout/DashboardLayout';
import DataTable from '@/components/ui/DataTable';
import KpiCard from '@/components/ui/KpiCard';
import { tripService, BillingLedgerTrip, BillingLedgerFilters } from '@/services/tripService';
import { customerService } from '@/services/customerService';
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
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Re-use MoreVertical icon
import { MoreVertical } from 'lucide-react';

export default function InvoiceListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // ── Filters ────────────────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize]   = useState(20);
  const [search, setSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<'' | 'NotInvoiced' | 'Invoiced'>('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Mark-as-Invoiced modal ──────────────────────────────────────────────
  const [markModal, setMarkModal] = useState<{ open: boolean; trip: BillingLedgerTrip | null }>({ open: false, trip: null });
  const [zatcaRef, setZatcaRef] = useState('');
  const [invoicingNote, setInvoicingNote] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 350);

  // ── Queries ────────────────────────────────────────────────────────────
  const filters: BillingLedgerFilters = {
    customer_id: customerId || undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
    invoice_status: invoiceStatusFilter || undefined,
    search: debouncedSearch || undefined,
    page: currentPage,
    per_page: pageSize,
  };

  const { data: ledgerRes, isLoading, isError } = useQuery({
    queryKey: ['billing-ledger', filters],
    queryFn: () => tripService.getBillingLedger(filters),
  });

  const { data: customersRes } = useQuery({
    queryKey: ['customers', 'all'],
    queryFn: () => customerService.getAll({}),
  });

  const trips: BillingLedgerTrip[] = (ledgerRes?.data as BillingLedgerTrip[]) || [];
  const totalPages = ledgerRes?.meta?.total_pages || 1;
  const summary = (ledgerRes?.meta as any)?.summary;

  const totalTrips    = summary?.total_trips ?? 0;
  const completedCnt  = summary?.completed ?? 0;
  const invoicedCnt   = summary?.invoiced ?? 0;
  const coveragePct   = summary?.coverage_pct ?? (totalTrips > 0 ? Math.round((invoicedCnt / totalTrips) * 100) : 100);

  const customers = useMemo(() => {
    const raw = Array.isArray(customersRes) ? customersRes : (customersRes as any)?.data || [];
    return raw as Array<{ id: string; name: string }>;
  }, [customersRes]);

  // ── Helpers ────────────────────────────────────────────────────────────
  const getOrigin = (trip: BillingLedgerTrip) => {
    const pickup = trip.stops?.find(s => s.stop_type === 'Pickup');
    return pickup?.location?.name ?? pickup?.location_name ?? '—';
  };
  const getDestination = (trip: BillingLedgerTrip) => {
    const drops = trip.stops?.filter(s => s.stop_type === 'Dropoff') ?? [];
    const last = drops[drops.length - 1];
    return last?.location?.name ?? last?.location_name ?? '—';
  };
  const getBillingTotal = (trip: BillingLedgerTrip) => {
    const base = trip.billing_amount ?? trip.trip_charges ?? 0;
    return base + (trip.waiting_labor_charges ?? 0) + (trip.additional_stop_charges ?? 0);
  };
  const getInvoiceRecord = (trip: BillingLedgerTrip) => trip.invoices?.[0] ?? null;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['billing-ledger'] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleExportCSV = () => {
    const rows = trips.map(t => ({
      trip_ref: t.ref_id,
      customer: t.customer?.name,
      origin: getOrigin(t),
      destination: getDestination(t),
      date: t.planned_start ? new Date(t.planned_start).toLocaleDateString() : new Date(t.createdAt).toLocaleDateString(),
      billing_amount: t.billing_amount ?? 0,
      waiting_labor: t.waiting_labor_charges ?? 0,
      additional_stops: t.additional_stop_charges ?? 0,
      total: getBillingTotal(t),
      invoice_status: t.status === 'Invoiced' ? 'Invoiced' : 'Not Invoiced',
      invoice_ref: getInvoiceRecord(t)?.ref_id ?? '',
      zatca_ref: getInvoiceRecord(t)?.zatca_ref ?? '',
    }));
    downloadCSV(rows, `billing_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
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
      queryClient.invalidateQueries({ queryKey: ['billing-ledger'] });
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message || 'Failed to mark trip as invoiced';
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnmark = async (trip: BillingLedgerTrip) => {
    if (!confirm(`Unmark ${trip.ref_id} as Invoiced and revert to Completed?`)) return;
    try {
      await tripService.unmarkInvoiced(trip.id);
      toast.success(`Trip ${trip.ref_id} reverted to Completed`);
      queryClient.invalidateQueries({ queryKey: ['billing-ledger'] });
    } catch (e: any) {
      toast.error(e?.response?.data?.error?.message || 'Failed to unmark trip');
    }
  };

  // ── Table columns ──────────────────────────────────────────────────────
  const columns = [
    {
      header: 'Trip Ref',
      className: 'whitespace-nowrap',
      accessor: (row: BillingLedgerTrip) => (
        <span className="font-mono text-xs font-bold text-[#E8450F]">{row.ref_id || '—'}</span>
      ),
    },
    {
      header: 'Customer',
      className: 'whitespace-nowrap max-w-[130px]',
      accessor: (row: BillingLedgerTrip) => (
        <span className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate block max-w-[130px]" title={row.customer?.name}>
          {row.customer?.name || '—'}
        </span>
      ),
    },
    {
      header: 'Route',
      className: 'whitespace-nowrap max-w-[180px]',
      accessor: (row: BillingLedgerTrip) => (
        <span className="text-xs text-slate-600 dark:text-slate-400 truncate block max-w-[180px]">
          {getOrigin(row)} → {getDestination(row)}
        </span>
      ),
    },
    {
      header: 'Trip Date',
      className: 'whitespace-nowrap',
      accessor: (row: BillingLedgerTrip) => {
        const d = row.planned_start ? new Date(row.planned_start) : new Date(row.createdAt);
        return <span className="text-xs text-slate-500">{d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</span>;
      },
    },
    {
      header: 'Base Amount',
      className: 'whitespace-nowrap text-right',
      headerClassName: 'text-right',
      accessor: (row: BillingLedgerTrip) => (
        <span className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-100 tabular-nums">
          SAR {(row.billing_amount ?? row.trip_charges ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: 'Total Charges',
      className: 'whitespace-nowrap text-right',
      headerClassName: 'text-right',
      accessor: (row: BillingLedgerTrip) => (
        <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100 tabular-nums">
          SAR {getBillingTotal(row).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      header: 'Invoice Status',
      className: 'whitespace-nowrap',
      accessor: (row: BillingLedgerTrip) => row.status === 'Invoiced'
        ? <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-bold uppercase text-[10px] tracking-wider px-2 py-0.5">✓ Invoiced</Badge>
        : <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 font-bold uppercase text-[10px] tracking-wider px-2 py-0.5">Pending</Badge>,
    },
    {
      header: 'Invoice Ref',
      className: 'whitespace-nowrap max-w-[120px]',
      accessor: (row: BillingLedgerTrip) => {
        const inv = getInvoiceRecord(row);
        return inv ? (
          <span className="font-mono text-[10px] text-slate-500 truncate block max-w-[120px]" title={inv.zatca_ref || inv.ref_id || ''}>
            {inv.zatca_ref || inv.ref_id || '—'}
          </span>
        ) : <span className="text-[10px] text-slate-300">—</span>;
      },
    },
    {
      header: 'Actions',
      className: 'whitespace-nowrap text-right',
      headerClassName: 'text-right',
      accessor: (row: BillingLedgerTrip) => (
        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 rounded-md">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-1.5">
              <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                Billing Actions
              </DropdownMenuLabel>

              {row.status === 'Completed' && (
                <DropdownMenuItem
                  onClick={() => openMarkModal(row)}
                  className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md text-emerald-600 focus:bg-emerald-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-600" /> Mark as Invoiced
                </DropdownMenuItem>
              )}

              {row.status === 'Invoiced' && (
                <DropdownMenuItem
                  onClick={() => handleUnmark(row)}
                  className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md text-amber-600 focus:bg-amber-50"
                >
                  <X className="w-3.5 h-3.5 mr-2 text-amber-600" /> Unmark Invoiced
                </DropdownMenuItem>
              )}

              <DropdownMenuItem
                onClick={() => navigate(`/trips/${row.id}`)}
                className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-2 text-indigo-500" /> View Trip Details
              </DropdownMenuItem>

              {getInvoiceRecord(row) && (
                <>
                  <DropdownMenuSeparator className="my-1 bg-slate-100 dark:bg-slate-800" />
                  <DropdownMenuItem
                    onClick={() => navigate(`/invoices/${getInvoiceRecord(row)!.id}`)}
                    className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md"
                  >
                    <FileText className="w-3.5 h-3.5 mr-2 text-slate-500" /> Invoice Record
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <DashboardLayout active="Invoices" title="Trip Billing Ledger">
      <div className="px-4 sm:px-6 pb-6 h-full flex flex-col animate-fade-in gap-5 max-w-[1400px] mx-auto w-full">

        {/* ── Top Bar ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-4 shrink-0 pb-1 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Trip Billing Ledger</h1>
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

        {/* ── KPI Cards ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 shrink-0">
          <KpiCard
            label="COMPLETED TRIPS"
            value={String(totalTrips)}
            subtitle="Total eligible trips"
            variant="slate"
          />
          <KpiCard
            label="PENDING INVOICING"
            value={String(completedCnt)}
            subtitle="Completed, not yet invoiced"
            variant={completedCnt > 0 ? 'amber' : 'slate'}
          />
          <KpiCard
            label="INVOICED"
            value={String(invoicedCnt)}
            subtitle="Marked as invoiced"
            variant="emerald"
          />
          <KpiCard
            label="COVERAGE"
            value={`${coveragePct}%`}
            subtitle="Invoicing coverage rate"
            variant={coveragePct >= 90 ? 'emerald' : coveragePct >= 60 ? 'amber' : 'rose'}
          />
        </div>

        {/* ── Filter Toolbar ───────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <Input
              placeholder="Search trip, customer, route..."
              value={search}
              onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
              className="pl-8 h-8 text-xs w-56 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            />
          </div>

          {/* Customer filter */}
          <Select value={customerId} onValueChange={v => { setCustomerId(v === 'all' ? '' : v); setCurrentPage(1); }}>
            <SelectTrigger className="h-8 text-xs w-44 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <Building2 className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
              <SelectValue placeholder="All Companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>

          {/* Invoice status filter */}
          <Select value={invoiceStatusFilter} onValueChange={v => { setInvoiceStatusFilter(v as any); setCurrentPage(1); }}>
            <SelectTrigger className="h-8 text-xs w-40 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              <SelectItem value="NotInvoiced">Not Invoiced</SelectItem>
              <SelectItem value="Invoiced">Invoiced</SelectItem>
            </SelectContent>
          </Select>

          {/* Date range */}
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={dateFrom}
              onChange={e => { setDateFrom(e.target.value); setCurrentPage(1); }}
              className="h-8 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md px-2 text-slate-700 dark:text-slate-200"
            />
            <span className="text-xs text-slate-400">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => { setDateTo(e.target.value); setCurrentPage(1); }}
              className="h-8 text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 rounded-md px-2 text-slate-700 dark:text-slate-200"
            />
          </div>

          {/* Clear filters */}
          {(customerId || invoiceStatusFilter || dateFrom || dateTo || search) && (
            <Button variant="ghost" size="sm" className="h-8 text-xs text-slate-500 hover:text-slate-900 gap-1"
              onClick={() => { setCustomerId(''); setInvoiceStatusFilter(''); setDateFrom(''); setDateTo(''); setSearch(''); setCurrentPage(1); }}>
              <X className="w-3 h-3" /> Clear
            </Button>
          )}
        </div>

        {/* ── Ledger Table ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Trip Billing Ledger</span>
            </div>
            <span className="text-xs text-slate-400 font-mono">{ledgerRes?.meta?.total ?? 0} trips</span>
          </div>

          <DataTable
            columns={columns}
            data={trips}
            isLoading={isLoading}
            isError={isError}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            onRowClick={(row) => navigate(`/trips/${row.id}`)}
            emptyState={{
              icon: <FileText className="w-8 h-8 text-slate-300" />,
              title: 'No trips found',
              description: invoiceStatusFilter === 'NotInvoiced'
                ? 'All completed trips have been invoiced. Great work!'
                : 'No completed or invoiced trips match the current filters.',
            }}
          />
        </div>

      </div>

      {/* ── Mark as Invoiced Modal ──────────────────────────────────────── */}
      <Dialog open={markModal.open} onOpenChange={open => { if (!open) setMarkModal({ open: false, trip: null }); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              Mark as Invoiced
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Record that an external invoice has been issued for this trip.
              MERCON does not generate the invoice — only tracks the reference.
            </DialogDescription>
          </DialogHeader>

          {markModal.trip && (
            <div className="space-y-4 pt-1">
              {/* Trip info summary */}
              <div className="bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trip</span>
                  <span className="font-mono text-xs font-bold text-[#E8450F]">{markModal.trip.ref_id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer</span>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{markModal.trip.customer?.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Route</span>
                  <span className="text-xs text-slate-600 dark:text-slate-400">{getOrigin(markModal.trip)} → {getDestination(markModal.trip)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Charges</span>
                  <span className="font-mono text-sm font-black text-slate-900 dark:text-slate-100">
                    SAR {getBillingTotal(markModal.trip).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* ZATCA reference input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  External / ZATCA Invoice Reference
                  <span className="text-slate-400 font-normal">(optional)</span>
                </Label>
                <Input
                  value={zatcaRef}
                  onChange={e => setZatcaRef(e.target.value)}
                  placeholder="e.g. INV-2026-1042 or ZATCA reference"
                  className="h-9 text-xs font-mono border-slate-200 dark:border-slate-700"
                />
                <p className="text-[10px] text-slate-400">
                  The reference number from your external accounting or ZATCA system.
                  Stored for tracking only.
                </p>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
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
            <Button variant="outline" size="sm" className="text-xs" onClick={() => setMarkModal({ open: false, trip: null })}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleMarkInvoiced}
              disabled={isSaving}
              className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              {isSaving ? 'Saving...' : <><CheckCircle2 className="w-3.5 h-3.5" /> Confirm Invoiced</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

