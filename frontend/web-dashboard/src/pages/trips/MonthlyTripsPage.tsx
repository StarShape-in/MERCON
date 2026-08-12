import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarRange, ChevronLeft, ChevronRight, RotateCw, FileSpreadsheet,
  Plus, Search, X, Info, SlidersHorizontal,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import MonthlyCompanyCard from '@/components/trips/monthly/MonthlyCompanyCard';
import { currentMonthKey, monthLabel, shiftMonth } from '@/components/trips/monthly/monthlyBoardUtils';
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

        {/* ── Command bar: identity, month, actions, filters — one surface ──
            Deliberately a single card. Header, search and filters as three
            separate floating boxes read as three unrelated things stacked by
            accident; they are one control surface for one list. */}
        <section className="rounded-2xl border border-black/[0.06] bg-white shadow-sm">

          {/* Row 1 — who/what, and the actions that change the whole page */}
          <div className="flex items-start justify-between gap-4 flex-wrap p-5">
            <div className="flex items-start gap-3 min-w-0">
              <span className="h-10 w-10 rounded-xl bg-[#E8450F]/10 grid place-items-center shrink-0">
                <CalendarRange className="h-[18px] w-[18px] text-[#E8450F]" />
              </span>
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-[#111111] leading-tight">Monthly Trips</h1>
                <p className="text-xs text-[#6E6E80] mt-1">
                  Committed trips per company — who is driving, in which truck, on which day.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <MonthStepper month={month} onChange={setMonth} />

              {/* Icon-only utilities, grouped so they read as one control
                  rather than competing with the primary action. */}
              <div className="flex items-center rounded-xl border border-black/[0.08] bg-white overflow-hidden divide-x divide-black/[0.06]">
                <button
                  type="button"
                  onClick={() => refetch()}
                  disabled={isFetching}
                  title="Refresh"
                  aria-label="Refresh"
                  className="h-10 w-10 grid place-items-center text-[#6E6E80] hover:bg-black/[0.03] hover:text-[#111111] transition-colors disabled:opacity-50"
                >
                  <RotateCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                </button>
                <button
                  type="button"
                  onClick={handleExport}
                  disabled={exportRows.length === 0}
                  title="Export to Excel"
                  aria-label="Export to Excel"
                  className="h-10 w-10 grid place-items-center text-[#6E6E80] hover:bg-black/[0.03] hover:text-[#111111] transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                </button>
              </div>

              <Button
                className="h-10 rounded-xl px-4 text-xs font-bold bg-[#E8450F] hover:bg-[#d13d0d] shadow-none"
                onClick={() => navigate('/trips?new=true')}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                New Trip
              </Button>
            </div>
          </div>

          {/* Row 2 — search and filters, joined into one segmented control */}
          <div className="px-5 pb-5">
            <div className="flex flex-col sm:flex-row items-stretch rounded-xl border border-black/[0.08] bg-white overflow-hidden divide-y sm:divide-y-0 sm:divide-x divide-black/[0.06]">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#9898A4] pointer-events-none" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search trip ref, driver, plate or place…"
                  aria-label="Search trips"
                  className="w-full h-11 pl-10 pr-9 bg-transparent text-xs font-medium text-[#111111] placeholder:text-[#9898A4] focus:outline-none"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 h-6 w-6 grid place-items-center rounded-md text-[#9898A4] hover:bg-black/[0.05] hover:text-[#111111] transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

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
              <p className="text-xs text-[#6E6E80] flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-[#111111]">{monthLabel(month)}</span>
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
                  <SlidersHorizontal className="h-3 w-3 text-[#9898A4]" />
                  {appliedFilters.map((filter) => (
                    <button
                      key={filter.key}
                      type="button"
                      onClick={filter.clear}
                      className="group inline-flex items-center gap-1 rounded-lg bg-black/[0.04] hover:bg-black/[0.07] pl-2 pr-1.5 py-1 text-[11px] font-semibold text-[#111111] transition-colors max-w-[180px]"
                      title={`Remove filter: ${filter.label}`}
                    >
                      <span className="truncate">{filter.label}</span>
                      <X className="h-3 w-3 text-[#9898A4] group-hover:text-[#111111] shrink-0" />
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
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-xs text-amber-800 flex items-start gap-2">
            <Info className="h-4 w-4 shrink-0 mt-px" />
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
              <Skeleton key={i} className="h-64 w-full rounded-2xl" />
            ))}
          </div>
        ) : companies.length === 0 ? (
          <div className="rounded-2xl border border-black/[0.06] bg-white shadow-sm px-6 py-16 text-center">
            <div className="h-12 w-12 rounded-2xl bg-black/[0.03] grid place-items-center mx-auto">
              <CalendarRange className="h-5 w-5 text-[#9898A4]" />
            </div>
            <h3 className="mt-4 text-sm font-bold text-[#111111]">
              {appliedFilters.length > 0
                ? 'Nothing matches these filters'
                : `No trips planned for ${monthLabel(month)}`}
            </h3>
            <p className="mt-1.5 text-xs text-[#6E6E80] max-w-sm mx-auto">
              {appliedFilters.length > 0
                ? 'Try clearing a filter, or step to another month.'
                : 'Trips appear here as soon as they are created with a planned start in this month.'}
            </p>
            <div className="mt-5">
              {appliedFilters.length > 0 ? (
                <Button
                  variant="outline"
                  className="h-9 rounded-xl text-xs font-bold shadow-none"
                  onClick={resetFilters}
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Clear filters
                </Button>
              ) : (
                <Button
                  className="h-9 rounded-xl text-xs font-bold bg-[#E8450F] hover:bg-[#d13d0d] shadow-none"
                  onClick={() => navigate('/trips?new=true')}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Create a trip
                </Button>
              )}
            </div>
          </div>
        ) : (
          // Cards sit side by side, wrapping into a new row as the screen
          // allows — a single full-width column forced a long vertical scroll
          // once there were more than a couple of companies.
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
            {companies.map((company) => (
              <MonthlyCompanyCard key={company.customer.id} company={company} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

const Dot = () => <span className="text-[#D4D4DC]">·</span>;

/**
 * Month navigation as one segmented control. The label is real text so it
 * matches the rest of the page's typography; a transparent native month input
 * sits over it so clicking still opens the platform's own month picker.
 */
function MonthStepper({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  const isCurrent = month === currentMonthKey();

  return (
    <div className="flex items-center rounded-xl border border-black/[0.08] bg-white overflow-hidden divide-x divide-black/[0.06]">
      <button
        type="button"
        onClick={() => onChange(shiftMonth(month, -1))}
        aria-label="Previous month"
        className="h-10 w-9 grid place-items-center text-[#6E6E80] hover:bg-black/[0.03] hover:text-[#111111] transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      <div className="relative h-10 flex items-center">
        <span className="px-3 text-xs font-bold text-[#111111] whitespace-nowrap min-w-[110px] text-center">
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
        className="h-10 w-9 grid place-items-center text-[#6E6E80] hover:bg-black/[0.03] hover:text-[#111111] transition-colors"
      >
        <ChevronRight className="h-4 w-4" />
      </button>

      {!isCurrent && (
        <button
          type="button"
          onClick={() => onChange(currentMonthKey())}
          className="h-10 px-3 text-[11px] font-bold text-[#E8450F] hover:bg-[#E8450F]/[0.06] transition-colors whitespace-nowrap"
        >
          Today
        </button>
      )}
    </div>
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
        className={`h-11 w-full sm:w-[150px] shrink-0 rounded-none border-0 shadow-none bg-transparent px-3.5 text-xs font-semibold focus:ring-0 ${
          active ? 'text-[#111111]' : 'text-[#6E6E80]'
        }`}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent align="start" className="w-[240px] max-h-[320px] p-1.5 rounded-xl">
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
