import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarRange, ChevronLeft, ChevronRight, RotateCw, FileSpreadsheet,
  Plus, Search, X, Filter, Info,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import MonthlyCompanyCard from '@/components/trips/monthly/MonthlyCompanyCard';
import { currentMonthKey, monthLabel, shiftMonth } from '@/components/trips/monthly/monthlyBoardUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
 * this page groups the whole month company → day so that question is one look.
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
  const activeFilters = [search.trim(), customerId, rateCategory, vehicleType, status].filter(Boolean).length;

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
      <div className="px-4 sm:px-6 pb-6 w-full flex flex-col animate-fade-in gap-5">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap pt-1">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-xl bg-[#E8450F]/10 grid place-items-center shrink-0">
              <CalendarRange className="h-5 w-5 text-[#E8450F]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#111111]">Monthly Trips by Company</h1>
              <p className="text-sm text-[#6E6E80] mt-0.5">
                Every company's committed trips for the month — which driver, which truck, which day.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Month stepper */}
            <div className="flex items-center gap-1 rounded-xl border border-black/[0.06] bg-white p-1 shadow-sm">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg"
                onClick={() => setMonth((m) => shiftMonth(m, -1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <input
                type="month"
                value={month}
                onChange={(e) => e.target.value && setMonth(e.target.value)}
                className="h-8 rounded-lg border-0 bg-transparent px-2 text-xs font-bold text-[#111111] focus:outline-none focus:ring-0"
                aria-label="Month"
              />
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 rounded-lg"
                onClick={() => setMonth((m) => shiftMonth(m, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {month !== currentMonthKey() && (
              <Button
                variant="outline"
                size="sm"
                className="h-10 rounded-xl text-xs font-bold"
                onClick={() => setMonth(currentMonthKey())}
              >
                This month
              </Button>
            )}

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
          </div>

          <FilterSelect
            value={customerId}
            onChange={setCustomerId}
            placeholder="All companies"
            label="Company"
            options={(customersRes?.data ?? []).map((c) => ({ value: c.id, label: c.name }))}
          />
          <FilterSelect
            value={rateCategory}
            onChange={setRateCategory}
            placeholder="All rate categories"
            label="Rate category"
            options={RATE_CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
          <FilterSelect
            value={vehicleType}
            onChange={setVehicleType}
            placeholder="All vehicle types"
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

          {activeFilters > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 rounded-xl text-xs font-bold text-[#6E6E80]"
              onClick={resetFilters}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear {activeFilters}
            </Button>
          )}
        </div>

        {summary?.truncated && (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-xs text-amber-800 flex items-center gap-2">
            <Info className="h-4 w-4 shrink-0" />
            This month has more trips than the board loads at once. Narrow it down with a company filter to
            be sure you are seeing everything.
          </div>
        )}

        {/* ── Companies ──────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="flex flex-col gap-4">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : companies.length === 0 ? (
          <div className="rounded-2xl border border-black/[0.06] bg-white shadow-sm p-12 text-center">
            <div className="h-14 w-14 rounded-2xl bg-black/[0.03] grid place-items-center mx-auto">
              <CalendarRange className="h-6 w-6 text-[#9898A4]" />
            </div>
            <h3 className="mt-4 text-base font-bold text-[#111111]">
              {activeFilters > 0 ? 'Nothing matches these filters' : `No trips planned for ${monthLabel(month)}`}
            </h3>
            <p className="mt-1 text-sm text-[#6E6E80]">
              {activeFilters > 0
                ? 'Clear the filters, or check another month.'
                : 'Trips appear here as soon as they are created with a planned start in this month.'}
            </p>
            <div className="mt-5 flex items-center justify-center gap-2">
              {activeFilters > 0 ? (
                <Button variant="outline" size="sm" className="h-9 rounded-xl text-xs font-bold" onClick={resetFilters}>
                  <Filter className="h-3.5 w-3.5 mr-1.5" />
                  Clear filters
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="h-9 rounded-xl text-xs font-bold bg-[#E8450F] hover:bg-[#d13d0d]"
                  onClick={() => navigate('/trips?new=true')}
                >
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Create a trip
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {companies.map((company) => (
              <MonthlyCompanyCard key={company.customer.id} company={company} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function FilterSelect({
  value, onChange, placeholder, label, options,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value || 'all'} onValueChange={(val: string) => onChange(val === 'all' ? '' : val)}>
      <SelectTrigger className="h-9 w-[180px] shrink-0 rounded-xl border-black/[0.08] bg-white text-xs font-semibold">
        <div className="flex items-center gap-2 overflow-hidden">
          <Filter className="h-3.5 w-3.5 text-[#9898A4] shrink-0" />
          <SelectValue placeholder={placeholder} />
        </div>
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
