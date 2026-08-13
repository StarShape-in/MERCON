import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarRange, ChevronLeft, ChevronRight, RotateCw, FileSpreadsheet,
<<<<<<< HEAD
  Plus, Search, X, Info, SlidersHorizontal, Layers,
=======
  Plus, Search, X, Filter, Info, Layers,
>>>>>>> 471c348 (feat(monthly-trips): redesign Bulk Add Trips workflow with dynamic rate categories, additional charges, and preview review step)
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import MonthlyCompanyCard from '@/components/trips/monthly/MonthlyCompanyCard';
import BulkAddTripsModal from '@/components/trips/monthly/BulkAddTripsModal';
<<<<<<< HEAD
import { currentMonthKey, monthLabel, monthOptions, shiftMonth } from '@/components/trips/monthly/monthlyBoardUtils';
=======
import { currentMonthKey, monthLabel, shiftMonth } from '@/components/trips/monthly/monthlyBoardUtils';
>>>>>>> 471c348 (feat(monthly-trips): redesign Bulk Add Trips workflow with dynamic rate categories, additional charges, and preview review step)
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { tripService } from '@/services/tripService';
import { customerService } from '@/services/customerService';
import { VEHICLE_TYPES, RATE_CATEGORIES } from '@mercon/shared-types';
import { exportExcelTable } from '@/utils/exportUtils';

const LABEL = 'text-[10px] font-bold uppercase tracking-wider text-[#9898A4]';

/** Statuses worth filtering a plan by — the full lifecycle, in running order. */
const STATUS_OPTIONS = [
  'Draft', 'Dispatched', 'AtPickup', 'InTransit', 'AtDelivery', 'Completed', 'Invoiced', 'Cancelled',
];

const EXPORT_HEADERS = [
  'Company', 'Date', 'Trip Ref', 'Status', 'Driver', 'Vehicle',
  'Rate Category', 'Vehicle Type', 'Origin', 'Destination', 'Amount', 'Currency',
];

/**
 * The month, seen the way monthly contracts are actually sold: a company
 * commits to N trips this month, and each one needs a driver and a truck on a
 * given day. The trip ledger is flat, paginated and status-sorted, so it can
 * answer "what is running now" but not "who is covering ARKAN on the 14th" —
 * this page groups the whole month by company so that question is one look.
 */
export default function MonthlyTripsPage() {
  const navigate = useNavigate();

  const [month, setMonth] = useState(currentMonthKey());
  const [search, setSearch] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [rateCategory, setRateCategory] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [status, setStatus] = useState('');
<<<<<<< HEAD
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
=======
  const [isBulkAddOpen, setIsBulkAddOpen] = useState(false);
>>>>>>> 471c348 (feat(monthly-trips): redesign Bulk Add Trips workflow with dynamic rate categories, additional charges, and preview review step)

  const filters = {
    month,
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(customerId ? { customer_id: customerId } : {}),
    ...(rateCategory ? { rate_category: rateCategory } : {}),
    ...(vehicleType ? { vehicle_type: vehicleType } : {}),
    ...(status ? { status } : {}),
  };

  const { data: board, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['trips', 'monthly-board', filters],
    queryFn: () => tripService.getMonthlyBoard(filters),
  });

  const { data: customersRes } = useQuery({
    queryKey: ['customers-select'],
    queryFn: () => customerService.getAll({ per_page: 100 }),
  });

  const companies = board?.companies ?? [];
  const summary = board?.summary;
  const customers = customersRes?.data ?? [];

  // Every applied filter as a removable chip — one place, so the chip row and
  // the "clear all" count can never disagree about what is actually applied.
  const appliedFilters = [
    search.trim() && { key: 'search', label: `"${search.trim()}"`, clear: () => setSearch('') },
    customerId && {
      key: 'customer',
      label: customers.find((c) => c.id === customerId)?.name ?? 'Company',
      clear: () => setCustomerId(''),
    },
    rateCategory && { key: 'category', label: rateCategory, clear: () => setRateCategory('') },
    vehicleType && { key: 'type', label: vehicleType, clear: () => setVehicleType('') },
    status && { key: 'status', label: status, clear: () => setStatus('') },
  ].filter(Boolean) as { key: string; label: string; clear: () => void }[];

  const resetFilters = () => {
    setSearch('');
    setCustomerId('');
    setRateCategory('');
    setVehicleType('');
    setStatus('');
  };

  const exportRows = useMemo(
    () =>
      companies.flatMap((company) =>
        company.days.flatMap((day) =>
          day.trips.map((trip) => [
            company.customer.name,
            day.date,
            trip.ref_id ?? '',
            trip.status,
            trip.driver?.name ?? 'Not assigned',
            trip.vehicle?.plate_number ?? 'Not assigned',
            trip.rate_category ?? '',
            trip.vehicle_type ?? '',
            trip.origin ?? '',
            trip.destination ?? '',
            trip.billing_amount ?? '',
            trip.currency,
          ]),
        ),
      ),
    [companies],
  );

  const handleExport = () => {
    if (exportRows.length === 0) return;
    exportExcelTable(
      `Monthly Trips — ${monthLabel(month)}`,
      EXPORT_HEADERS,
      exportRows,
      `MERCON_Monthly_Trips_${month}.xlsx`,
      { sheetName: `Monthly ${month}` },
    );
  };

  return (
    <DashboardLayout active="Trips" title="Monthly Trips">
      <div className="px-4 sm:px-6 pb-8 w-full flex flex-col animate-fade-in gap-4">

        {/* ── Command bar: identity, month, actions, filters — one surface ── */}
        <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">

          {/* Row 1 — who/what, and the actions that change the whole page */}
          <div className="flex items-start justify-between gap-4 flex-wrap p-5 border-b border-slate-100">
            <div className="flex items-start gap-3 min-w-0">
              <span className="h-10 w-10 rounded-lg bg-[#E8450F]/10 border border-[#E8450F]/20 grid place-items-center shrink-0">
                <CalendarRange className="h-[18px] w-[18px] text-[#E8450F]" />
              </span>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-slate-900 leading-tight">Monthly Trips</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Committed trips per company — who is driving, in which truck, on which day.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <MonthStepper month={month} onChange={setMonth} />

              {/* Icon-only utilities, grouped so they read as one control */}
              <div className="flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden divide-x divide-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  title="Refresh"
                  aria-label="Refresh"
                  className="h-9 w-9 grid place-items-center text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
                >
                  <RotateCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exportRows.length === 0}
                  title="Export to Excel"
                  aria-label="Export to Excel"
                  className="h-9 w-9 grid place-items-center text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                </button>
              </div>

              <Button
                variant="outline"
                className="h-9 rounded-lg px-3.5 text-xs font-bold border-[#E8450F]/30 bg-[#E8450F]/5 text-[#E8450F] hover:bg-[#E8450F]/10 shadow-none"
                onClick={() => setIsBulkModalOpen(true)}
              >
                <Layers className="h-3.5 w-3.5 mr-1.5" />
                Bulk Add Trips
              </Button>

<<<<<<< HEAD
              <Button
                className="h-9 rounded-lg px-4 text-xs font-bold bg-[#E8450F] hover:bg-[#d13d0d] shadow-none text-white"
                onClick={() => navigate('/trips?new=true')}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New Trip
              </Button>
            </div>
=======
            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-xl text-xs font-bold"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RotateCw className={`h-3.5 w-3.5 mr-1.5 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-xl text-xs font-bold"
              onClick={handleExport}
              disabled={exportRows.length === 0}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
              Export
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-10 rounded-xl text-xs font-bold border-orange-200 bg-orange-50/50 text-[#E8450F] hover:bg-orange-100/60 shadow-2xs"
              onClick={() => setIsBulkAddOpen(true)}
            >
              <Layers className="h-3.5 w-3.5 mr-1.5 text-[#E8450F]" />
              Bulk Add Trips
            </Button>

            <Button
              size="sm"
              className="h-10 rounded-xl text-xs font-bold bg-[#E8450F] hover:bg-[#d13d0d]"
              onClick={() => navigate('/trips?new=true')}
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              New Trip
            </Button>
          </div>
        </div>

        {/* ── Filters ────────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-black/[0.06] bg-white shadow-sm p-4 flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#9898A4]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search trip ref, driver, plate, place…"
              className="h-9 pl-9 rounded-xl text-xs"
            />
>>>>>>> 471c348 (feat(monthly-trips): redesign Bulk Add Trips workflow with dynamic rate categories, additional charges, and preview review step)
          </div>

          {/* Row 2 — search and filters, joined into one segmented control */}
          <div className="p-5 bg-slate-50/40">
            <div className="flex flex-col sm:flex-row items-stretch rounded-lg border border-slate-200 bg-white overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-slate-200 shadow-2xs">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search trip ref, driver, plate or place…"
                  aria-label="Search trips"
                  className="w-full h-10 pl-9 pr-9 bg-transparent text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 grid place-items-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>

              <MonthSelect month={month} onChange={setMonth} />
              <FilterSelect
                value={customerId}
                onChange={setCustomerId}
                placeholder="All companies"
                label="Company"
                options={customers.map((c) => ({ value: c.id, label: c.name }))}
              />
              <FilterSelect
                value={rateCategory}
                onChange={setRateCategory}
                placeholder="All categories"
                label="Rate category"
                options={RATE_CATEGORIES.map((c) => ({ value: c, label: c }))}
              />
              <FilterSelect
                value={vehicleType}
                onChange={setVehicleType}
                placeholder="All types"
                label="Vehicle type"
                options={VEHICLE_TYPES.map((v) => ({ value: v, label: v }))}
              />
              <FilterSelect
                value={status}
                onChange={setStatus}
                placeholder="All statuses"
                label="Status"
                options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
              />
            </div>

            {/* Row 3 — what is applied, and what the result adds up to */}
            <div className="flex items-center justify-between gap-3 flex-wrap mt-3">
              <p className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-slate-900">{monthLabel(month)}</span>
                {!isLoading && summary && (
                  <>
                    <Dot />
                    <span>{summary.companies} {summary.companies === 1 ? 'company' : 'companies'}</span>
                    <Dot />
                    <span>{summary.total_trips} {summary.total_trips === 1 ? 'trip' : 'trips'}</span>
                    {summary.unassigned_trips > 0 && (
                      <>
                        <Dot />
                        <span className="font-semibold text-amber-700">
                          {summary.unassigned_trips} need assignment
                        </span>
                      </>
                    )}
                  </>
                )}
              </p>

              {appliedFilters.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <SlidersHorizontal className="h-3 w-3 text-slate-400" />
                  {appliedFilters.map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={filter.clear}
                      className="group inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 pl-2 pr-1.5 py-0.5 text-[11px] font-semibold text-slate-800 transition-colors max-w-[180px] shadow-2xs"
                      title={`Remove filter: ${filter.label}`}
                    >
                      <span className="truncate">{filter.label}</span>
                      <X className="h-3 w-3 text-slate-400 group-hover:text-slate-800 shrink-0" />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="text-[11px] font-bold text-[#E8450F] hover:underline px-1"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>

        {summary?.truncated && (
          <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-900 flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 mt-px text-amber-700" />
            <span>
              This month has more trips than the board loads at once. Filter by company to be sure you are
              seeing everything.
            </span>
          </div>
        )}

        {/* ── Companies ──────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 w-full rounded-xl border border-slate-200" />
            ))}
          </div>
        ) : companies.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm px-6 py-16 text-center">
            <div className="h-12 w-12 rounded-lg bg-slate-100 border border-slate-200 grid place-items-center mx-auto">
              <CalendarRange className="h-5 w-5 text-slate-400" />
            </div>
            <h3 className="mt-4 text-sm font-bold text-slate-900">
              {appliedFilters.length > 0
                ? 'Nothing matches these filters'
                : `No trips planned for ${monthLabel(month)}`}
            </h3>
            <p className="mt-1.5 text-xs text-slate-500 max-w-sm mx-auto">
              {appliedFilters.length > 0
                ? 'Try clearing a filter, or step to another month.'
                : 'Trips appear here as soon as they are created with a planned start in this month.'}
            </p>
            <div className="mt-5">
              {appliedFilters.length > 0 ? (
                <Button
                  variant="outline"
                  className="h-9 rounded-lg text-xs font-bold border-slate-200 shadow-none"
                  onClick={resetFilters}
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Clear filters
                </Button>
              ) : (
                <Button
                  className="h-9 rounded-lg text-xs font-bold bg-[#E8450F] hover:bg-[#d13d0d] shadow-none"
                  onClick={() => navigate('/trips?new=true')}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Create a trip
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
            {companies.map((company) => (
              <MonthlyCompanyCard key={company.customer.id} company={company} />
            ))}
          </div>
        )}
      </div>

      <BulkAddTripsModal
<<<<<<< HEAD
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
        defaultMonth={month}
        onSuccess={() => refetch()}
=======
        isOpen={isBulkAddOpen}
        onClose={() => setIsBulkAddOpen(false)}
        defaultMonth={month}
>>>>>>> 471c348 (feat(monthly-trips): redesign Bulk Add Trips workflow with dynamic rate categories, additional charges, and preview review step)
      />
    </DashboardLayout>
  );
}

const Dot = () => <span className="text-slate-300">·</span>;

/**
 * Month navigation as one segmented control. The label is real text so it
 * matches the rest of the page's typography; a transparent native month input
 * sits over it so clicking still opens the platform's own month picker.
 */
function MonthStepper({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  const isCurrent = month === currentMonthKey();

  return (
    <div className="flex items-center rounded-lg border border-slate-200 bg-white overflow-hidden divide-x divide-slate-200 shadow-2xs">
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label="Previous month"
        className="h-9 w-8 grid place-items-center text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>

      <div className="relative h-9 flex items-center">
        <span className="px-3 text-xs font-bold text-slate-900 whitespace-nowrap min-w-[100px] text-center">
          {monthLabel(month)}
        </span>
        <input
          type="month"
          value={month}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          aria-label="Pick month"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>

      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, 1))}
        aria-label="Next month"
        className="h-9 w-8 grid place-items-center text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-colors"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>

      {!isCurrent && (
        <button
          type="button"
          onClick={() => onChange(currentMonthKey())}
          className="h-9 px-2.5 text-[11px] font-bold text-[#E8450F] hover:bg-[#E8450F]/[0.06] transition-colors whitespace-nowrap"
        >
          Today
        </button>
      )}
    </div>
  );
}

/**
 * Jump straight to any month, same style as the other joined filters — the
 * stepper next to it stays for quick prev/next, this is for "I know exactly
 * which month I want." Unlike the other filters there is no "All" option:
 * the board always needs one month.
 */
function MonthSelect({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  return (
    <Select value={month} onValueChange={onChange}>
      <SelectTrigger className="h-10 w-full sm:w-[160px] shrink-0 rounded-none border-0 shadow-none bg-transparent px-3 text-xs font-bold text-slate-900 focus:ring-0">
        <SelectValue placeholder={monthLabel(month)} />
      </SelectTrigger>
      <SelectContent align="start" className="w-[200px] max-h-[320px] p-1.5 rounded-lg border border-slate-200 shadow-md">
        <SelectGroup>
          <SelectLabel className={`${LABEL} px-2 py-1`}>Month</SelectLabel>
          {monthOptions(month).map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

/** A filter inside the joined toolbar — borderless, since the bar owns the frame. */
function FilterSelect({
  value, onChange, placeholder, label, options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  options: { value: string; label: string }[];
}) {
  const active = !!value;
  return (
    <Select value={value || 'all'} onValueChange={(val: string) => onChange(val === 'all' ? '' : val)}>
      <SelectTrigger
        className={`h-10 w-full sm:w-[145px] shrink-0 rounded-none border-0 shadow-none bg-transparent px-3 text-xs font-semibold focus:ring-0 ${
          active ? 'text-slate-900 font-bold' : 'text-slate-500'
        }`}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent align="start" className="w-[240px] max-h-[320px] p-1.5 rounded-lg border border-slate-200 shadow-md">
        <SelectGroup>
          <SelectLabel className={`${LABEL} px-2 py-1`}>{label}</SelectLabel>
          <SelectItem value="all" className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md">
            {placeholder}
          </SelectItem>
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
