import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import {
  ArrowLeft, RefreshCw, AlertTriangle, Wallet, CalendarRange,
  ReceiptText, TrendingUp, TrendingDown, ChevronDown, Trophy
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { vehicleService } from '@/services/vehicleService';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import DataTable from '@/components/ui/DataTable';
import type { Column } from '@/components/ui/DataTable';
import { cn } from '@/lib/utils';
import { matchesSearch } from '@/lib/search';
import { Skeleton } from '@/components/ui/skeleton';

const PERIODS = [
  { value: 'all', label: 'All Time' },
  { value: '1', label: 'Last 30 Days' },
  { value: '3', label: 'Last 3 Months' },
  { value: '6', label: 'Last 6 Months' },
  { value: '12', label: 'Last 12 Months' },
] as const;

const rangeFor = (period: string): { from?: string; to?: string } => {
  if (period === 'all') return {};
  const from = new Date();
  from.setMonth(from.getMonth() - Number(period));
  return { from: from.toISOString() };
};

const sar = (v: number | null | undefined) => {
  if (v === null || v === undefined) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(v);
};

export default function VehicleSingleFinancialsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<string>('all');
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'trips' | 'expenses'>('trips');
  
  // Search states for tables
  const [tripSearch, setTripSearch] = useState('');
  const [expenseSearch, setExpenseSearch] = useState('');

  const range = useMemo(() => {
    if (period === 'custom' && customRange?.from) {
      return {
        from: customRange.from.toISOString(),
        to: (customRange.to ?? customRange.from).toISOString(),
      };
    }
    return rangeFor(period);
  }, [period, customRange]);

  /* Queries ------------------------------------------------------------- */

  const {
    data: vehicle, isLoading: isVehicleLoading
  } = useQuery({
    queryKey: ['vehicle-details', id],
    queryFn: () => vehicleService.getById(id!),
    enabled: !!id,
  });

  const {
    data: financials, isLoading: isFinancialsLoading, refetch: refetchFinancials
  } = useQuery({
    queryKey: ['vehicle-financials-detail', id, period, range.from, range.to],
    queryFn: () => vehicleService.getFinancials(id!, range),
    enabled: !!id,
  });

  /* Derived details & filtered tables ------------------------------------- */

  const summary = financials?.summary;

  // 1. Trips Ledger
  const tripsData = useMemo(() => {
    const raw = financials?.income_sources || [];
    return raw.filter((t) =>
      matchesSearch(tripSearch, [t.ref_id, t.customer_name, t.status])
    );
  }, [financials, tripSearch]);

  // 2. Combined Expenses Ledger (Maintenance + Operating Expenses)
  const expensesData = useMemo(() => {
    const list: Array<{
      id: string;
      ref_id: string | null;
      type: 'Operating' | 'Maintenance';
      category: string;
      amount: number;
      date: string;
      description: string;
    }> = [];

    // Operating expenses
    if (financials?.operating_expenses) {
      financials.operating_expenses.forEach((e) => {
        list.push({
          id: e.id,
          ref_id: e.ref_id,
          type: 'Operating',
          category: e.category,
          amount: e.amount,
          date: e.date,
          description: e.description || 'Operating operational cost',
        });
      });
    }

    // Maintenance records
    if (financials?.expense_records) {
      financials.expense_records.forEach((m) => {
        list.push({
          id: m.id,
          ref_id: m.ref_id || `MNT-${m.id.substring(0, 5).toUpperCase()}`,
          type: 'Maintenance',
          category: m.maintenance_type || 'Maintenance',
          amount: m.cost || 0,
          date: m.start_date || m.service_date || '',
          description: (m as any).description || (m as any).notes || `Service at ${m.workshop_name || 'Workshop'}`,
        });
      });
    }

    // Sort by date descending
    list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return list.filter((e) =>
      matchesSearch(expenseSearch, [e.ref_id, e.category, e.description])
    );
  }, [financials, expenseSearch]);

  /* Columns definitions -------------------------------------------------- */

  const tripColumns: Column<(typeof tripsData)[number]>[] = [
    {
      header: 'Trip Ref ID',
      accessor: (r) => (
        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
          {r.ref_id || 'N/A'}
        </span>
      ),
    },
    {
      header: 'Customer',
      accessor: (r) => <span className="font-semibold">{r.customer_name}</span>,
    },
    {
      header: 'Date',
      accessor: (r) => (
        <span className="text-slate-500 font-mono text-[11px]">
          {r.date ? format(new Date(r.date), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (r) => {
        const isCompleted = r.status === 'Completed' || r.status === 'Invoiced';
        return (
          <Badge
            variant="outline"
            className={cn(
              'font-semibold text-[10px]',
              isCompleted
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            )}
          >
            {r.status}
          </Badge>
        );
      },
    },
    {
      header: 'Trip Charges (Driver)',
      accessor: (r) => <span className="font-mono text-slate-600">{sar(r.trip_charges)}</span>,
    },
    {
      header: 'Revenue Generated',
      accessor: (r) => <span className="font-mono font-bold text-emerald-600">{sar(r.income)}</span>,
    },
  ];

  const expenseColumns: Column<(typeof expensesData)[number]>[] = [
    {
      header: 'Ref ID',
      accessor: (r) => (
        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
          {r.ref_id || 'N/A'}
        </span>
      ),
    },
    {
      header: 'Type',
      accessor: (r) => (
        <Badge
          variant="outline"
          className={cn(
            'font-bold text-[10px]',
            r.type === 'Maintenance'
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-slate-50 text-slate-700 border-slate-200'
          )}
        >
          {r.type}
        </Badge>
      ),
    },
    {
      header: 'Category',
      accessor: (r) => <span className="font-semibold">{r.category}</span>,
    },
    {
      header: 'Date',
      accessor: (r) => (
        <span className="text-slate-500 font-mono text-[11px]">
          {r.date ? format(new Date(r.date), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    {
      header: 'Description',
      accessor: (r) => <span className="text-slate-500 text-xs truncate max-w-[280px] inline-block">{r.description}</span>,
    },
    {
      header: 'Amount',
      accessor: (r) => <span className="font-mono font-bold text-rose-600">{sar(r.amount)}</span>,
    },
  ];

  const isLoading = isVehicleLoading || isFinancialsLoading;

  return (
    <DashboardLayout active="Vehicle P&L" title="Vehicle P&L Statement">
      <div className="px-4 sm:px-6 pb-6 space-y-5 animate-fade-in max-w-[1500px] mx-auto w-full">
        
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/vehicles/financials')}
              className="h-9 w-9 p-0 text-slate-600 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs cursor-pointer"
              title="Back to Fleet Financials"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  {vehicle ? `${vehicle.plate_number} Financial Statement` : 'Vehicle Statement'}
                </h1>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold text-[11px]">
                  {vehicle?.asset_type || 'Vehicle'} P&amp;L Analysis
                </Badge>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchFinancials()}
              className="h-9 w-9 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/80 cursor-pointer"
              title="Refresh Statement"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
            </div>
            <Skeleton className="h-[400px] w-full rounded-2xl" />
          </div>
        ) : !summary ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <AlertTriangle size={32} className="text-amber-500 opacity-60" />
            <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">Statement unavailable</p>
            <p className="text-xs text-slate-500">The P&L statement for this vehicle could not be generated.</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* KPI Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard
                label="Total Revenue"
                value={sar(summary.total_income)}
                hint={`${summary.completed_trips_count} completed trips`}
                tone="income"
                icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
              />
              <StatCard
                label="Total Trips"
                value={String(summary.completed_trips_count)}
                hint="Earning asset trips"
                tone="neutral"
                icon={<ReceiptText className="w-4 h-4 text-slate-400" />}
              />
              <StatCard
                label="Total Cost"
                value={sar(summary.total_expenses)}
                hint="Fuel, salaries, maintenance & driver costs"
                tone="expense"
                icon={<TrendingDown className="w-4 h-4 text-rose-600" />}
                ratio={summary.total_income > 0 ? summary.total_expenses / summary.total_income : 0}
              />
              <StatCard
                label="Actual Profit"
                value={sar(summary.net_profit)}
                hint="Net margin remaining"
                tone={summary.net_profit >= 0 ? 'profit' : 'expense'}
                icon={<Wallet className="w-4 h-4 text-indigo-600" />}
              />
              <StatCard
                label="Profit Margin"
                value={`${summary.margin_percent}%`}
                hint="Return rate on operations"
                tone={summary.margin_percent >= 0 ? 'income' : 'expense'}
                icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
              />
            </div>

            {/* Quick breakdown callout */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 text-xs">
              <div>
                <div className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Driver Charges</div>
                <div className="font-extrabold text-sm text-slate-800 dark:text-slate-200 mt-0.5">{sar(summary.driver_charges)}</div>
              </div>
              <div>
                <div className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Fuel Purchases</div>
                <div className="font-extrabold text-sm text-slate-800 dark:text-slate-200 mt-0.5">{sar(summary.fuel_expenses)}</div>
              </div>
              <div>
                <div className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Maintenance Costs</div>
                <div className="font-extrabold text-sm text-slate-800 dark:text-slate-200 mt-0.5">{sar(summary.maintenance_expenses)}</div>
              </div>
              <div>
                <div className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">Salary / Allowance</div>
                <div className="font-extrabold text-sm text-slate-800 dark:text-slate-200 mt-0.5">{sar(summary.salary_expenses)}</div>
              </div>
            </div>

            {/* Tab Swapping block */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs">
              <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-3 justify-between items-center flex-wrap gap-3">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    onClick={() => setActiveTab('trips')}
                    className={cn(
                      'px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                      activeTab === 'trips'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-3xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    )}
                  >
                    Trip Revenue ({tripsData.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('expenses')}
                    className={cn(
                      'px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer',
                      activeTab === 'expenses'
                        ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-3xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                    )}
                  >
                    Expense Statement ({expensesData.length})
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {/* Date popover filter in toolbar */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "h-8 text-[11px] w-[185px] justify-between font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 cursor-pointer shadow-3xs hover:bg-slate-50 dark:hover:bg-slate-800",
                          period === 'custom' && 'border-brand/40 bg-brand/5 text-brand hover:bg-brand/10'
                        )}
                      >
                        <span className="flex items-center gap-1.5 truncate">
                          <CalendarRange className="w-3.5 h-3.5 text-slate-400" />
                          <span className="truncate">
                            {period === 'custom' && customRange?.from
                              ? customRange.to
                                ? `${format(customRange.from, 'MMM d')} - ${format(customRange.to, 'MMM d')}`
                                : format(customRange.from, 'MMM d')
                              : PERIODS.find((p) => p.value === period)?.label || 'All Time'}
                          </span>
                        </span>
                        <ChevronDown className="w-3 h-3 text-slate-400" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="p-0 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col md:flex-row max-w-[580px] w-auto">
                      <div className="w-40 border-r border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1.5">
                          Presets
                        </div>
                        {PERIODS.map((p) => {
                          const active = period === p.value;
                          return (
                            <button
                              key={p.value}
                              type="button"
                              onClick={() => {
                                setPeriod(p.value);
                              }}
                              className={cn(
                                'w-full text-left text-xs font-semibold px-2 py-1.5 rounded-lg transition-colors',
                                active
                                  ? 'bg-brand/10 text-brand'
                                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                              )}
                            >
                              {p.label}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          onClick={() => {
                            setPeriod('custom');
                          }}
                          className={cn(
                            'w-full text-left text-xs font-semibold px-2 py-1.5 rounded-lg transition-colors border-t border-slate-100 dark:border-slate-800 mt-1 pt-1.5',
                            period === 'custom'
                              ? 'bg-brand/10 text-brand'
                              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                          )}
                        >
                          Custom...
                        </button>
                      </div>

                      {period === 'custom' && (
                        <div className="p-3 flex flex-col justify-between">
                          <Calendar
                            mode="range"
                            selected={customRange}
                            onSelect={setCustomRange}
                            numberOfMonths={1}
                            className="rounded-xl"
                          />
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {activeTab === 'trips' ? (
                <DataTable
                  title="Trip Revenue Ledger"
                  subtitle="Every earning trip in selected range"
                  columns={tripColumns}
                  data={tripsData}
                  searchValue={tripSearch}
                  onSearchChange={setTripSearch}
                  searchPlaceholder="Search by trip Ref ID, customer..."
                  emptyTitle="No trips found"
                  emptyMessage="No trips were recorded for this vehicle in the selected date range."
                  compact
                />
              ) : (
                <DataTable
                  title="Expense Statement Ledger"
                  subtitle="Every operational expense, maintenance event & fuel purchase"
                  columns={expenseColumns}
                  data={expensesData}
                  searchValue={expenseSearch}
                  onSearchChange={setExpenseSearch}
                  searchPlaceholder="Search by Ref ID, category..."
                  emptyTitle="No expenses found"
                  emptyMessage="No expenses were recorded for this vehicle in the selected date range."
                  compact
                />
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ── KPI Stat Card Helper ────────────────────────────────────────────── */

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: 'income' | 'expense' | 'profit' | 'neutral';
  icon?: React.ReactNode;
  ratio?: number;
}

function StatCard({ label, value, hint, tone = 'neutral', icon, ratio }: StatCardProps) {
  const isLoss = tone === 'expense' || value.startsWith('-');
  const colorMap = {
    income: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/5',
    expense: 'text-rose-600 dark:text-rose-400 bg-rose-500/5',
    profit: isLoss ? 'text-rose-600 dark:text-rose-400 bg-rose-500/5' : 'text-indigo-600 dark:text-indigo-400 bg-indigo-500/5',
    neutral: 'text-slate-700 dark:text-slate-300 bg-slate-500/5',
  };

  return (
    <Card className="relative overflow-hidden border border-slate-200/80 dark:border-slate-800/85 rounded-2xl bg-white dark:bg-slate-950 shadow-2xs hover:shadow-xs transition-all duration-200">
      <CardContent className="p-5 flex flex-col justify-between h-full min-h-[105px]">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">
            {label}
          </span>
          {icon && (
            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center border border-slate-100 dark:border-slate-900', colorMap[tone])}>
              {icon}
            </div>
          )}
        </div>

        <div className="mt-2.5">
          <div className={cn('text-lg font-black tracking-tight font-mono', isLoss ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100')}>
            {value}
          </div>
          {hint && (
            <div className="text-[10px] text-slate-500 mt-1 truncate">
              {hint}
            </div>
          )}
        </div>

        {ratio !== undefined && ratio > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100 dark:bg-slate-900">
            <div
              className={cn('h-full transition-all duration-300', ratio >= 0.8 ? 'bg-rose-500' : 'bg-slate-400')}
              style={{ width: `${Math.min(ratio * 100, 100)}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
