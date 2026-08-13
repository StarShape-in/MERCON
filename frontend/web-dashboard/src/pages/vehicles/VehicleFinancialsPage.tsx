import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import {
  ArrowLeft, DollarSign, TrendingUp, TrendingDown, Truck, Trophy,
  FileSpreadsheet, FileText, RefreshCw, AlertTriangle, ArrowUpDown, Wallet,
  Layers, PieChart as PieChartIcon, ArrowRight, Gauge, Ban,
  CalendarRange, Route, ReceiptText, AlertOctagon,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, ReferenceLine,
  Area, AreaChart, Line, ComposedChart, Pie, PieChart,
} from 'recharts';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { vehicleService } from '@/services/vehicleService';
import type { FleetVehicleFinancials, MonthlyPoint } from '@/services/vehicleService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import DataTable from '@/components/ui/DataTable';
import type { Column } from '@/components/ui/DataTable';
import { exportExcelTable, exportPDFTable } from '@/utils/exportUtils';
import { cn } from '@/lib/utils';
import { matchesSearch } from '@/lib/search';

/* ── Formatting & palette ─────────────────────────────────────────────── */

const INCOME = '#059669';   // emerald-600
const EXPENSE = '#e11d48';  // rose-600
const PROFIT = '#4f46e5';   // indigo-600
const RENEWAL = '#f59e0b';  // amber-500

const sar = (n: number) => `SAR ${Math.round(n).toLocaleString()}`;

/** Compact axis/tick labels — full figures never fit on a chart axis. */
const compact = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
};

/** `2026-03` → `Mar 26`. */
const monthLabel = (key: string) => {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return `${d.toLocaleString('en', { month: 'short' })} ${String(y).slice(2)}`;
};

const PERIODS = [
  { value: '3', label: '3M' },
  { value: '6', label: '6M' },
  { value: '12', label: '12M' },
  { value: 'all', label: 'All' },
] as const;

/** Turns a period preset into the `from` bound the API expects. */
const rangeFor = (period: string) => {
  if (period === 'all') return {};
  const from = new Date();
  from.setMonth(from.getMonth() - Number(period));
  return { from: from.toISOString() };
};

const chartConfig = {
  income: { label: 'Income', color: INCOME },
  expenses: { label: 'Expenses', color: EXPENSE },
  profit: { label: 'Net Profit', color: PROFIT },
  net_profit: { label: 'Net Profit', color: PROFIT },
  maintenance: { label: 'Maintenance', color: EXPENSE },
  renewal: { label: 'Renewals', color: RENEWAL },
} satisfies ChartConfig;

/* ── Small building blocks ────────────────────────────────────────────── */

type Tone = 'income' | 'expense' | 'profit' | 'neutral';

const TONES: Record<Tone, { card: string; label: string; value: string; bar: string }> = {
  income: {
    card: 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20',
    label: 'text-emerald-700 dark:text-emerald-400',
    value: 'text-emerald-700 dark:text-emerald-300',
    bar: 'bg-emerald-500',
  },
  expense: {
    card: 'border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20',
    label: 'text-rose-700 dark:text-rose-400',
    value: 'text-rose-700 dark:text-rose-300',
    bar: 'bg-rose-500',
  },
  profit: {
    card: 'border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20',
    label: 'text-indigo-700 dark:text-indigo-400',
    value: 'text-indigo-700 dark:text-indigo-300',
    bar: 'bg-indigo-500',
  },
  neutral: {
    card: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900',
    label: 'text-slate-400',
    value: 'text-slate-900 dark:text-slate-100',
    bar: 'bg-slate-400',
  },
};

function StatCard({
  label, value, hint, tone = 'neutral', icon, ratio,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: Tone;
  icon: React.ReactNode;
  /** 0–1; renders a proportion bar under the value when provided. */
  ratio?: number;
}) {
  const t = TONES[tone];
  return (
    <Card className={cn('rounded-2xl p-4 flex flex-col justify-between gap-1 border', t.card)}>
      <div className="flex items-center justify-between">
        <span className={cn('text-[10px] font-extrabold uppercase tracking-wider', t.label)}>{label}</span>
        {icon}
      </div>
      <div className={cn('text-2xl font-mono font-extrabold mt-1 tabular-nums', t.value)}>{value}</div>
      {ratio !== undefined && (
        <div className="h-1 w-full rounded-full bg-slate-200/70 dark:bg-slate-800 overflow-hidden mt-1">
          <div
            className={cn('h-full rounded-full transition-all', t.bar)}
            style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%` }}
          />
        </div>
      )}
      <div className="text-[11px] text-slate-500 font-medium">{hint}</div>
    </Card>
  );
}

/** Money, coloured by sign. */
function Money({ value, className }: { value: number; className?: string }) {
  return (
    <span
      className={cn(
        'font-mono font-extrabold tabular-nums',
        value > 0 ? 'text-emerald-600 dark:text-emerald-400'
          : value < 0 ? 'text-rose-600 dark:text-rose-400'
            : 'text-slate-400',
        className
      )}
    >
      {value < 0 ? '-' : value > 0 ? '+' : ''}{sar(Math.abs(value))}
    </span>
  );
}

/** One row of the top/bottom performer leaderboards. */
function RankRow({
  rank, row, max, onSelect,
}: {
  rank: number;
  row: FleetVehicleFinancials;
  max: number;
  onSelect: (id: string) => void;
}) {
  const positive = row.net_profit >= 0;
  const width = max > 0 ? (Math.abs(row.net_profit) / max) * 100 : 0;
  return (
    <button
      type="button"
      onClick={() => onSelect(row.vehicle_id)}
      className="w-full text-left px-4 py-2.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'w-5 h-5 shrink-0 rounded-md text-[10px] font-extrabold flex items-center justify-center',
            rank === 1
              ? positive ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
          )}
        >
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
              {row.plate_number}
            </span>
            <Money value={row.net_profit} className="text-xs shrink-0" />
          </div>
          <div className="h-1 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mt-1.5">
            <div
              className={cn('h-full rounded-full', positive ? 'bg-emerald-500' : 'bg-rose-500')}
              style={{ width: `${width}%` }}
            />
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-medium">
            {row.trips_count} trips · {row.margin_percent}% margin · {row.asset_type}
          </div>
        </div>
        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 shrink-0 transition-colors" />
      </div>
    </button>
  );
}

/** Clickable column header for the fleet comparison table. */
function SortHeader({
  label, field, sort, onSort, align = 'right',
}: {
  label: string;
  field: SortField;
  sort: { field: SortField; dir: 'asc' | 'desc' };
  onSort: (f: SortField) => void;
  align?: 'left' | 'right';
}) {
  const active = sort.field === field;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={cn(
        'inline-flex items-center gap-1 hover:text-indigo-600 transition-colors',
        align === 'right' && 'flex-row-reverse',
        active && 'text-indigo-600'
      )}
    >
      {label}
      <ArrowUpDown className={cn('w-3 h-3', active ? 'opacity-100' : 'opacity-30')} />
    </button>
  );
}

type SortField = 'plate_number' | 'total_income' | 'total_expenses' | 'net_profit' | 'margin_percent' | 'trips_count';

/* ── Page ─────────────────────────────────────────────────────────────── */

export default function VehicleFinancialsPage() {
  const { id: urlId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [tab, setTab] = useState<'fleet' | 'vehicle'>(urlId ? 'vehicle' : 'fleet');
  const [period, setPeriod] = useState<string>('all');
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [selectedId, setSelectedId] = useState<string>(urlId || '');
  const [sort, setSort] = useState<{ field: SortField; dir: 'asc' | 'desc' }>({
    field: 'net_profit',
    dir: 'desc',
  });
  const [tableSearch, setTableSearch] = useState('');

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

  const { data: vehiclesRes, isLoading: isVehiclesLoading } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehicleService.getAll({ per_page: 100 }),
  });
  const vehiclesList = useMemo(() => vehiclesRes?.data ?? [], [vehiclesRes]);

  const {
    data: fleet, isLoading: isFleetLoading, refetch: refetchFleet,
  } = useQuery({
    queryKey: ['fleet-financials', period, range.from, range.to],
    queryFn: () => vehicleService.getFleetFinancials(range),
  });

  const { data: vehicle } = useQuery({
    queryKey: ['vehicle', selectedId],
    queryFn: () => vehicleService.getById(selectedId),
    enabled: !!selectedId,
  });

  const {
    data: financials, isLoading: isFinancialsLoading, refetch: refetchFinancials,
  } = useQuery({
    queryKey: ['vehicle-financials', selectedId, period, range.from, range.to],
    queryFn: () => vehicleService.getFinancials(selectedId, range),
    enabled: !!selectedId,
  });

  useEffect(() => {
    if (urlId) {
      setSelectedId(urlId);
      setTab('vehicle');
    } else if (vehiclesList.length > 0 && !selectedId) {
      setSelectedId(vehiclesList[0].id);
    }
  }, [urlId, vehiclesList]);

  /** Selecting a vehicle anywhere on the page jumps to its detail tab. */
  const openVehicle = (newId: string) => {
    setSelectedId(newId);
    setTab('vehicle');
    navigate(`/vehicles/${newId}/financials`, { replace: true });
  };

  const switchTab = (next: string) => {
    const value = next as 'fleet' | 'vehicle';
    setTab(value);
    navigate(
      value === 'fleet' ? '/vehicles/financials' : `/vehicles/${selectedId}/financials`,
      { replace: true }
    );
  };

  /* Derived fleet data --------------------------------------------------- */

  const fleetRows = useMemo(() => fleet?.vehicles ?? [], [fleet]);

  /** Vehicles with any activity, sorted by profit — the ranking chart source. */
  const activeRows = useMemo(
    () => fleetRows.filter((r) => r.total_income !== 0 || r.total_expenses !== 0),
    [fleetRows]
  );

  const rankedByProfit = useMemo(
    () => [...activeRows].sort((a, b) => b.net_profit - a.net_profit),
    [activeRows]
  );

  const topPerformers = rankedByProfit.filter((r) => r.net_profit > 0).slice(0, 5);
  const lossMakers = [...rankedByProfit].reverse().filter((r) => r.net_profit < 0).slice(0, 5);
  const maxAbsProfit = Math.max(1, ...activeRows.map((r) => Math.abs(r.net_profit)));

  /** Diverging bar chart data — capped so a 60-truck fleet stays readable. */
  const profitChartData = useMemo(
    () => rankedByProfit.slice(0, 15).map((r) => ({
      plate: r.plate_number,
      net_profit: r.net_profit,
      vehicle_id: r.vehicle_id,
    })),
    [rankedByProfit]
  );

  const expenseSplit = useMemo(() => {
    const s = fleet?.fleet_summary;
    if (!s) return [];
    return [
      { name: 'Maintenance', value: s.maintenance_expenses, fill: EXPENSE },
      { name: 'Renewals', value: s.renewal_expenses, fill: RENEWAL },
    ].filter((d) => d.value > 0);
  }, [fleet]);

  /** Fleet-wide average cost incurred per earning trip — a load-independent efficiency read. */
  const fleetCostPerTrip = useMemo(() => {
    const s = fleet?.fleet_summary;
    if (!s || s.total_trips === 0) return 0;
    return Math.round(s.total_expenses / s.total_trips);
  }, [fleet]);

  /** Net profit, income and expenses rolled up by asset type — is one class of truck carrying the fleet? */
  const assetTypeBreakdown = useMemo(() => {
    const byType = new Map<string, { income: number; expenses: number; trips: number; vehicles: number }>();
    for (const r of fleetRows) {
      const key = r.asset_type || 'Unclassified';
      const b = byType.get(key) ?? { income: 0, expenses: 0, trips: 0, vehicles: 0 };
      b.income += r.total_income;
      b.expenses += r.total_expenses;
      b.trips += r.trips_count;
      b.vehicles += 1;
      byType.set(key, b);
    }
    return Array.from(byType.entries())
      .map(([type, b]) => ({
        type,
        net_profit: b.income - b.expenses,
        margin_percent: b.income > 0 ? Math.round(((b.income - b.expenses) / b.income) * 1000) / 10 : 0,
        vehicles: b.vehicles,
        trips: b.trips,
      }))
      .sort((a, b) => b.net_profit - a.net_profit);
  }, [fleetRows]);

  const sortedRows = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    const filtered = fleetRows.filter((r) =>
      matchesSearch(tableSearch, [r.plate_number, r.ref_id, r.asset_type]));
    return [...filtered].sort((a, b) => {
      const av = a[sort.field];
      const bv = b[sort.field];
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir;
      return ((av as number) - (bv as number)) * dir;
    });
  }, [fleetRows, sort, tableSearch]);

  const toggleSort = (field: SortField) =>
    setSort((s) => (s.field === field
      ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      : { field, dir: field === 'plate_number' ? 'asc' : 'desc' }));

  /* Derived vehicle data ------------------------------------------------- */

  /** Revenue → costs → net, as a simple stepped breakdown. */
  const breakdownData = useMemo(() => {
    if (!financials) return [];
    const s = financials.summary;
    return [
      { name: 'Revenue', value: s.total_income, fill: INCOME },
      { name: 'Maintenance', value: s.maintenance_expenses, fill: EXPENSE },
      { name: 'Renewals', value: s.renewal_expenses, fill: RENEWAL },
      { name: 'Net', value: s.net_profit, fill: s.net_profit >= 0 ? PROFIT : EXPENSE },
    ];
  }, [financials]);

  const vehicleCostPerTrip = useMemo(() => {
    if (!financials) return 0;
    const { total_expenses, completed_trips_count } = financials.summary;
    return completed_trips_count > 0 ? Math.round(total_expenses / completed_trips_count) : 0;
  }, [financials]);

  /** Trailing months (most recent first) run at a loss — an early-warning streak, not just the period total. */
  const consecutiveLossMonths = useMemo(() => {
    const months = financials?.monthly ?? [];
    let streak = 0;
    for (let i = months.length - 1; i >= 0; i -= 1) {
      if (months[i].profit < 0) streak += 1;
      else break;
    }
    return streak;
  }, [financials]);

  const withLabels = (points: MonthlyPoint[] = []) =>
    points.map((p) => ({ ...p, label: monthLabel(p.month) }));

  /* Export --------------------------------------------------------------- */

  const exportFleet = () => {
    if (!fleet) return;
    exportExcelTable(
      'MERCON Fleet — Vehicle Profitability Comparison',
      ['Plate', 'Type', 'Status', 'Income (SAR)', 'Expenses (SAR)', 'Net Profit (SAR)', 'Margin %', 'Trips'],
      [
        ...sortedRows.map((r) => [
          r.plate_number, r.asset_type, r.status,
          r.total_income, r.total_expenses, r.net_profit, `${r.margin_percent}%`, r.trips_count,
        ]),
        ['', '', 'FLEET TOTAL',
          fleet.fleet_summary.total_income,
          fleet.fleet_summary.total_expenses,
          fleet.fleet_summary.net_profit,
          `${fleet.fleet_summary.margin_percent}%`,
          fleet.fleet_summary.total_trips],
      ],
      'Fleet_Profitability.xlsx'
    );
  };

  const exportVehicle = () => {
    if (!financials || !vehicle) return;
    exportExcelTable(
      `MERCON Fleet - Vehicle P&L Statement (${vehicle.plate_number})`,
      ['Reference / Type', 'Party / Workshop', 'Details / Date', 'Amount (SAR)'],
      [
        ['--- INCOME SOURCES ---', '', '', ''],
        ...financials.income_sources.map((t) => [
          t.ref_id || 'TRIP', t.customer_name, 'Completed Trip', `+SAR ${t.income.toLocaleString()}`,
        ]),
        ['--- MAINTENANCE EXPENSES ---', '', '', ''],
        ...financials.expense_records.map((m) => [
          m.maintenance_type, m.workshop_name,
          m.start_date ? new Date(m.start_date).toLocaleDateString() : 'N/A',
          `-SAR ${(m.cost || 0).toLocaleString()}`,
        ]),
        ['', '', 'NET VEHICLE PROFIT:', `SAR ${financials.summary.net_profit.toLocaleString()}`],
      ],
      `Vehicle_P&L_${vehicle.plate_number}.xlsx`
    );
  };

  const exportFleetPDF = () => {
    if (!fleet) return;
    exportPDFTable(
      'Fleet Vehicle Profitability Comparison',
      ['Plate', 'Type', 'Trips', 'Income (SAR)', 'Expenses (SAR)', 'Net Profit (SAR)', 'Margin %'],
      [
        ...sortedRows.map((r) => [
          r.plate_number, r.asset_type, r.trips_count,
          r.total_income.toLocaleString(), r.total_expenses.toLocaleString(),
          r.net_profit.toLocaleString(), `${r.margin_percent}%`,
        ]),
        ['TOTAL', '', fleet.fleet_summary.total_trips,
          fleet.fleet_summary.total_income.toLocaleString(),
          fleet.fleet_summary.total_expenses.toLocaleString(),
          fleet.fleet_summary.net_profit.toLocaleString(),
          `${fleet.fleet_summary.margin_percent}%`],
      ],
      'Fleet_Profitability.pdf'
    );
  };

  const exportVehiclePDF = () => {
    if (!financials || !vehicle) return;
    exportPDFTable(
      `Vehicle P&L Statement — ${vehicle.plate_number}`,
      ['Reference / Type', 'Party / Workshop', 'Date', 'Amount (SAR)'],
      [
        ...financials.income_sources.map((t) => [
          t.ref_id || 'TRIP', t.customer_name, new Date(t.date).toLocaleDateString(),
          `+${t.income.toLocaleString()}`,
        ]),
        ...financials.expense_records.map((m) => [
          m.maintenance_type, m.workshop_name,
          m.start_date ? new Date(m.start_date).toLocaleDateString() : 'N/A',
          `-${(m.cost || 0).toLocaleString()}`,
        ]),
        ['TOTAL', '', '', financials.summary.net_profit.toLocaleString()],
      ],
      `Vehicle_P&L_${vehicle.plate_number}.pdf`
    );
  };

  /* Fleet comparison table columns --------------------------------------- */

  const columns: Column<FleetVehicleFinancials>[] = [
    {
      header: <SortHeader label="Vehicle" field="plate_number" sort={sort} onSort={toggleSort} align="left" />,
      accessor: (r) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center shrink-0">
            <Truck className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate">{r.plate_number}</div>
            <div className="text-[10px] text-slate-400 font-mono">{r.ref_id || '—'}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Type',
      accessor: (r) => (
        <Badge variant="outline" className="text-[10px] font-bold">{r.asset_type}</Badge>
      ),
    },
    {
      header: <SortHeader label="Trips" field="trips_count" sort={sort} onSort={toggleSort} />,
      className: 'text-right',
      headerClassName: 'text-right',
      accessor: (r) => <span className="font-mono text-xs tabular-nums">{r.trips_count}</span>,
    },
    {
      header: <SortHeader label="Income" field="total_income" sort={sort} onSort={toggleSort} />,
      className: 'text-right',
      headerClassName: 'text-right',
      accessor: (r) => (
        <span className="font-mono text-xs tabular-nums text-emerald-600 dark:text-emerald-400 font-bold">
          {sar(r.total_income)}
        </span>
      ),
    },
    {
      header: <SortHeader label="Expenses" field="total_expenses" sort={sort} onSort={toggleSort} />,
      className: 'text-right',
      headerClassName: 'text-right',
      accessor: (r) => (
        <span className="font-mono text-xs tabular-nums text-rose-600 dark:text-rose-400 font-bold">
          {sar(r.total_expenses)}
        </span>
      ),
    },
    {
      header: <SortHeader label="Net Profit" field="net_profit" sort={sort} onSort={toggleSort} />,
      className: 'text-right',
      headerClassName: 'text-right',
      accessor: (r) => <Money value={r.net_profit} className="text-xs" />,
    },
    {
      header: <SortHeader label="Margin" field="margin_percent" sort={sort} onSort={toggleSort} />,
      className: 'text-right',
      headerClassName: 'text-right',
      accessor: (r) => (
        <div className="flex items-center justify-end gap-1.5">
          <div className="w-12 h-1 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className={cn('h-full rounded-full', r.margin_percent >= 0 ? 'bg-emerald-500' : 'bg-rose-500')}
              style={{ width: `${Math.min(100, Math.abs(r.margin_percent))}%` }}
            />
          </div>
          <span className={cn(
            'font-mono text-xs tabular-nums font-bold w-12 text-right',
            r.margin_percent > 0 ? 'text-emerald-600' : r.margin_percent < 0 ? 'text-rose-600' : 'text-slate-400'
          )}>
            {r.margin_percent}%
          </span>
        </div>
      ),
    },
  ];

  /* Render --------------------------------------------------------------- */

  const summary = fleet?.fleet_summary;
  const vehicleOptions = vehiclesList.map((v) => ({
    value: v.id,
    label: `${v.plate_number} — ${v.asset_type || 'Truck'}`,
    keywords: `${v.ref_id ?? ''} ${v.plate_number} ${v.asset_type ?? ''}`,
  }));

  return (
    <DashboardLayout active="Vehicle P&L" title="Vehicle Profit & Loss (P&L) Report">
      <div className="px-4 sm:px-6 pb-6 space-y-5 animate-fade-in max-w-[1500px] mx-auto w-full">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/vehicles')}
              className="h-9 w-9 p-0 text-slate-600 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
              title="Back to Vehicles"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                  Vehicle Profit &amp; Loss
                </h1>
                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold text-[11px]">
                  Financials
                </Badge>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Compare every truck's earnings against its running costs, then drill into one asset.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <ToggleGroup
              value={[period]}
              onValueChange={(v) => v[0] && setPeriod(v[0])}
              aria-label="Reporting period"
            >
              {PERIODS.map((p) => (
                <ToggleGroupItem key={p.value} value={p.value}>{p.label}</ToggleGroupItem>
              ))}
            </ToggleGroup>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-9 gap-1.5 text-xs font-bold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs',
                    period === 'custom' && 'border-[#E8450F]/40 bg-[#E8450F]/5 text-[#E8450F]'
                  )}
                >
                  <CalendarRange className="w-3.5 h-3.5" />
                  {period === 'custom' && customRange?.from
                    ? customRange.to
                      ? `${format(customRange.from, 'MMM d')} – ${format(customRange.to, 'MMM d')}`
                      : format(customRange.from, 'MMM d')
                    : 'Custom Range'}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-3 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800">
                <Calendar
                  mode="range"
                  selected={customRange}
                  onSelect={setCustomRange}
                  numberOfMonths={1}
                  className="rounded-xl"
                />
                <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    disabled={!customRange?.from}
                    onClick={() => setPeriod('custom')}
                    className="h-8 text-xs px-3.5 rounded-lg bg-[#E8450F] hover:bg-[#d03d0c] text-white font-semibold"
                  >
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            <Button
              variant="outline"
              size="sm"
              onClick={() => (tab === 'fleet' ? refetchFleet() : refetchFinancials())}
              className="h-9 w-9 p-0 text-slate-600 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={tab === 'fleet' ? exportFleet : exportVehicle}
              disabled={tab === 'fleet' ? !fleet : !financials}
              className="h-9 gap-1.5 text-xs font-semibold border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 shadow-2xs"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              Excel
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={tab === 'fleet' ? exportFleetPDF : exportVehiclePDF}
              disabled={tab === 'fleet' ? !fleet : !financials}
              className="h-9 gap-1.5 text-xs font-semibold border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 shadow-2xs"
            >
              <FileText className="w-3.5 h-3.5 text-rose-600" />
              PDF
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={switchTab} className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
            <TabsList className="h-9">
              <TabsTrigger value="fleet" className="text-xs font-bold gap-1.5">
                <Layers className="w-3.5 h-3.5" /> Fleet Comparison
              </TabsTrigger>
              <TabsTrigger value="vehicle" className="text-xs font-bold gap-1.5">
                <Truck className="w-3.5 h-3.5" /> Vehicle Detail
              </TabsTrigger>
            </TabsList>

            {tab === 'vehicle' && (
              <div className="w-full sm:w-[280px]">
                <Combobox
                  options={vehicleOptions}
                  value={selectedId}
                  onChange={openVehicle}
                  placeholder="Select a vehicle"
                  searchPlaceholder="Search plate or ref…"
                  emptyText="No vehicles match."
                  disabled={isVehiclesLoading}
                  triggerClassName="font-bold"
                />
              </div>
            )}
          </div>

          {/* ══ FLEET COMPARISON ═════════════════════════════════════════ */}
          <TabsContent value="fleet" className="space-y-5 mt-0">
            {isFleetLoading ? (
              <FleetSkeleton />
            ) : !summary ? (
              <EmptyState
                title="Fleet report unavailable"
                message="The fleet profitability report could not be loaded. Try refreshing."
              />
            ) : (
              <>
                {/* KPIs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <StatCard
                    label="Fleet Revenue"
                    value={sar(summary.total_income)}
                    hint={`${summary.total_trips} earning trips across ${summary.vehicles_count} vehicles`}
                    tone="income"
                    icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
                  />
                  <StatCard
                    label="Fleet Expenses"
                    value={sar(summary.total_expenses)}
                    hint={`${summary.total_maintenance} workshop & renewal records`}
                    tone="expense"
                    icon={<TrendingDown className="w-4 h-4 text-rose-600" />}
                    ratio={summary.total_income > 0 ? summary.total_expenses / summary.total_income : 0}
                  />
                  <StatCard
                    label="Fleet Net Profit"
                    value={sar(summary.net_profit)}
                    hint={`${summary.margin_percent}% overall margin`}
                    tone={summary.net_profit >= 0 ? 'profit' : 'expense'}
                    icon={<Wallet className="w-4 h-4 text-indigo-600" />}
                  />
                  <StatCard
                    label="Avg Cost / Trip"
                    value={sar(fleetCostPerTrip)}
                    hint="Fleet-wide expense per earning trip"
                    tone="neutral"
                    icon={<ReceiptText className="w-4 h-4 text-slate-400" />}
                  />
                  <StatCard
                    label="Profitable Vehicles"
                    value={`${summary.profitable_count} / ${summary.vehicles_count}`}
                    hint={`${summary.loss_making_count} at a loss · ${summary.idle_count} idle`}
                    tone="neutral"
                    icon={<Gauge className="w-4 h-4 text-slate-400" />}
                    ratio={summary.vehicles_count > 0 ? summary.profitable_count / summary.vehicles_count : 0}
                  />
                </div>

                {/* Profit ranking + expense split */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  <Card className="lg:col-span-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <ArrowUpDown className="w-4 h-4 text-indigo-600" /> Net Profit by Vehicle
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Green bars earn, red bars cost. Showing the {profitChartData.length} most significant
                        of {activeRows.length} active vehicles — click a bar to drill in.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {profitChartData.length === 0 ? (
                        <NoData message="No vehicle has recorded income or expenses in this period." />
                      ) : (
                        <ChartContainer
                          config={chartConfig}
                          className="w-full aspect-auto"
                          style={{ height: Math.max(260, profitChartData.length * 30) }}
                        >
                          <BarChart
                            data={profitChartData}
                            layout="vertical"
                            margin={{ top: 4, right: 24, left: 4, bottom: 4 }}
                          >
                            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                            <XAxis type="number" tickFormatter={compact} tickLine={false} axisLine={false} />
                            <YAxis
                              type="category"
                              dataKey="plate"
                              width={86}
                              tickLine={false}
                              axisLine={false}
                              tick={{ fontSize: 11, fontWeight: 700 }}
                            />
                            <ReferenceLine x={0} stroke="currentColor" className="text-border" />
                            <ChartTooltip
                              content={<ChartTooltipContent formatter={(v) => sar(Number(v))} />}
                            />
                            <Bar dataKey="net_profit" radius={4} onClick={(d: any) => openVehicle(d.vehicle_id)}>
                              {profitChartData.map((d) => (
                                <Cell
                                  key={d.vehicle_id}
                                  fill={d.net_profit >= 0 ? INCOME : EXPENSE}
                                  className="cursor-pointer"
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ChartContainer>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <PieChartIcon className="w-4 h-4 text-rose-600" /> Where the Money Goes
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Fleet cost split between workshop maintenance and document renewals.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {expenseSplit.length === 0 ? (
                        <NoData message="No expenses recorded in this period." />
                      ) : (
                        <>
                          <ChartContainer config={chartConfig} className="w-full aspect-square max-h-[240px]">
                            <PieChart>
                              <ChartTooltip
                                content={<ChartTooltipContent nameKey="name" formatter={(v) => sar(Number(v))} />}
                              />
                              <Pie
                                data={expenseSplit}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={58}
                                outerRadius={92}
                                paddingAngle={2}
                                strokeWidth={2}
                              />
                            </PieChart>
                          </ChartContainer>
                          <Separator className="my-3" />
                          <div className="space-y-2">
                            {expenseSplit.map((s) => (
                              <div key={s.name} className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-2 font-semibold text-slate-600 dark:text-slate-300">
                                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.fill }} />
                                  {s.name}
                                </span>
                                <span className="font-mono font-bold tabular-nums">{sar(s.value)}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Monthly fleet trend */}
                <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-emerald-600" /> Fleet Income vs Expenses Over Time
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Monthly earned revenue against maintenance spend for the whole fleet.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {(fleet?.monthly.length ?? 0) === 0 ? (
                      <NoData message="No dated activity to plot in this period." />
                    ) : (
                      <ChartContainer config={chartConfig} className="w-full aspect-auto h-[280px]">
                        <AreaChart data={withLabels(fleet?.monthly)} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="fillIncome" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={INCOME} stopOpacity={0.35} />
                              <stop offset="95%" stopColor={INCOME} stopOpacity={0.02} />
                            </linearGradient>
                            <linearGradient id="fillExpenses" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={EXPENSE} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={EXPENSE} stopOpacity={0.02} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid vertical={false} strokeDasharray="3 3" />
                          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                          <YAxis tickFormatter={compact} tickLine={false} axisLine={false} width={48} />
                          <ChartTooltip content={<ChartTooltipContent formatter={(v) => sar(Number(v))} />} />
                          <ChartLegend content={<ChartLegendContent />} />
                          <Area
                            dataKey="income" type="monotone" stroke={INCOME} strokeWidth={2}
                            fill="url(#fillIncome)"
                          />
                          <Area
                            dataKey="expenses" type="monotone" stroke={EXPENSE} strokeWidth={2}
                            fill="url(#fillExpenses)"
                          />
                        </AreaChart>
                      </ChartContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Profitability by asset type */}
                <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Truck className="w-4 h-4 text-indigo-600" /> Profitability by Asset Type
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Net profit and margin rolled up by truck class — is one class of asset carrying the fleet?
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {assetTypeBreakdown.length === 0 ? (
                      <NoData message="No vehicles with recorded activity in this period." />
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                        <ChartContainer config={chartConfig} className="w-full aspect-auto h-[240px]">
                          <BarChart data={assetTypeBreakdown} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" />
                            <XAxis dataKey="type" tickLine={false} axisLine={false} tick={{ fontSize: 11, fontWeight: 700 }} />
                            <YAxis tickFormatter={compact} tickLine={false} axisLine={false} width={48} />
                            <ReferenceLine y={0} stroke="currentColor" className="text-border" />
                            <ChartTooltip content={<ChartTooltipContent formatter={(v) => sar(Number(v))} />} />
                            <Bar dataKey="net_profit" radius={4} maxBarSize={56}>
                              {assetTypeBreakdown.map((d) => (
                                <Cell key={d.type} fill={d.net_profit >= 0 ? INCOME : EXPENSE} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ChartContainer>

                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                          {assetTypeBreakdown.map((d) => (
                            <div key={d.type} className="flex items-center justify-between py-2.5 text-xs">
                              <div>
                                <div className="font-bold text-slate-900 dark:text-slate-100">{d.type}</div>
                                <div className="text-[10px] text-slate-400">
                                  {d.vehicles} vehicle{d.vehicles === 1 ? '' : 's'} · {d.trips} trip{d.trips === 1 ? '' : 's'}
                                </div>
                              </div>
                              <div className="text-right">
                                <Money value={d.net_profit} className="text-xs" />
                                <div className={cn(
                                  'text-[10px] font-bold',
                                  d.margin_percent >= 0 ? 'text-emerald-600' : 'text-rose-600'
                                )}>
                                  {d.margin_percent}% margin
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Leaderboards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <Card className="border border-emerald-200 dark:border-emerald-900/50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs overflow-hidden">
                    <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-emerald-600" /> Most Profitable Vehicles
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Best earners after maintenance costs in this period.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
                      {topPerformers.length === 0 ? (
                        <NoData message="No vehicle is currently profitable in this period." />
                      ) : (
                        topPerformers.map((row, i) => (
                          <RankRow key={row.vehicle_id} rank={i + 1} row={row} max={maxAbsProfit} onSelect={openVehicle} />
                        ))
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border border-rose-200 dark:border-rose-900/50 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs overflow-hidden">
                    <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <Ban className="w-4 h-4 text-rose-600" /> Biggest Loss Makers
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Vehicles whose costs exceed the revenue they brought in.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
                      {lossMakers.length === 0 ? (
                        <NoData message="No vehicle is running at a loss." />
                      ) : (
                        lossMakers.map((row, i) => (
                          <RankRow key={row.vehicle_id} rank={i + 1} row={row} max={maxAbsProfit} onSelect={openVehicle} />
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Full comparison table */}
                <DataTable<FleetVehicleFinancials>
                  title="Full Fleet P&L Comparison"
                  subtitle="Every vehicle, sortable by any financial column. Click a row to open its detailed statement."
                  columns={columns}
                  data={sortedRows}
                  onRowClick={(r) => openVehicle(r.vehicle_id)}
                  onExport={exportFleet}
                  searchValue={tableSearch}
                  onSearchChange={setTableSearch}
                  searchPlaceholder="Search by plate number…"
                  emptyTitle="No vehicles"
                  emptyMessage="Add vehicles to the fleet to see their profitability here."
                  compact
                />
              </>
            )}
          </TabsContent>

          {/* ══ VEHICLE DETAIL ═══════════════════════════════════════════ */}
          <TabsContent value="vehicle" className="space-y-5 mt-0">
            {!selectedId ? (
              <EmptyState
                title="No Vehicle Selected"
                message="Pick a truck from the selector above to view its Profit & Loss statement."
              />
            ) : (
              <>
                {/* Identity banner */}
                {vehicle && (
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center shrink-0">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                            {vehicle.plate_number}
                          </h2>
                          {vehicle.asset_type && (
                            <Badge className="bg-[#FFF0EB] text-[#E8450F] border-[#E8450F]/30 text-[10px] font-bold">
                              {vehicle.asset_type}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 font-mono">
                          Ref ID:{' '}
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {vehicle.ref_id || `VEH-${vehicle.id.slice(0, 6).toUpperCase()}`}
                          </span>{' '}
                          • Odometer: {(vehicle.current_odometer ?? 0).toLocaleString()} km
                        </p>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => navigate(`/vehicles/${vehicle.id}`)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                    >
                      View Full Vehicle Details →
                    </Button>
                  </div>
                )}

                {isFinancialsLoading ? (
                  <FleetSkeleton />
                ) : !financials ? (
                  <EmptyState
                    title="No statement available"
                    message="This vehicle's P&L could not be loaded. Try refreshing."
                  />
                ) : (
                  <>
                    {/* Early-warning banner: this vehicle has been bleeding money for a while, not just this period */}
                    {consecutiveLossMonths >= 2 && (
                      <div className="rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-4 py-2.5 flex items-center gap-2.5">
                        <AlertOctagon className="w-4 h-4 text-rose-600 shrink-0" />
                        <p className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                          Running at a loss for {consecutiveLossMonths} consecutive months — worth a closer look
                          before the next dispatch.
                        </p>
                      </div>
                    )}

                    {/* KPIs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                      <StatCard
                        label="Total Income Generated"
                        value={sar(financials.summary.total_income)}
                        hint={`${financials.summary.completed_trips_count} completed trip dispatches`}
                        tone="income"
                        icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
                      />
                      <StatCard
                        label="Total Expenses"
                        value={sar(financials.summary.total_expenses)}
                        hint={`${financials.summary.total_maintenance_count} service & renewal records`}
                        tone="expense"
                        icon={<TrendingDown className="w-4 h-4 text-rose-600" />}
                        ratio={
                          financials.summary.total_income > 0
                            ? financials.summary.total_expenses / financials.summary.total_income
                            : 0
                        }
                      />
                      <StatCard
                        label="Net Vehicle Profit"
                        value={sar(financials.summary.net_profit)}
                        hint="Gross revenue less maintenance costs"
                        tone={financials.summary.net_profit >= 0 ? 'profit' : 'expense'}
                        icon={<DollarSign className="w-4 h-4 text-indigo-600" />}
                      />
                      <StatCard
                        label="Cost / Trip"
                        value={sar(vehicleCostPerTrip)}
                        hint="Average expense per completed trip"
                        tone="neutral"
                        icon={<Route className="w-4 h-4 text-slate-400" />}
                      />
                      <StatCard
                        label="Profit Margin"
                        value={`${financials.summary.margin_percent}%`}
                        hint="Operational asset margin"
                        tone="neutral"
                        icon={
                          financials.summary.margin_percent >= 0
                            ? <TrendingUp className="w-4 h-4 text-emerald-500" />
                            : <TrendingDown className="w-4 h-4 text-rose-500" />
                        }
                        ratio={Math.min(1, Math.abs(financials.summary.margin_percent) / 100)}
                      />
                    </div>

                    {/* Trend + breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                      <Card className="lg:col-span-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-indigo-600" /> Monthly Performance
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Income and expense bars with the resulting profit line for this vehicle.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          {financials.monthly.length === 0 ? (
                            <NoData message="No dated activity to plot for this vehicle." />
                          ) : (
                            <ChartContainer config={chartConfig} className="w-full aspect-auto h-[300px]">
                              <ComposedChart
                                data={withLabels(financials.monthly)}
                                margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                              >
                                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                                <YAxis tickFormatter={compact} tickLine={false} axisLine={false} width={48} />
                                <ChartTooltip content={<ChartTooltipContent formatter={(v) => sar(Number(v))} />} />
                                <ChartLegend content={<ChartLegendContent />} />
                                <Bar dataKey="income" fill={INCOME} radius={[4, 4, 0, 0]} maxBarSize={28} />
                                <Bar dataKey="expenses" fill={EXPENSE} radius={[4, 4, 0, 0]} maxBarSize={28} />
                                <Line
                                  dataKey="profit" type="monotone" stroke={PROFIT}
                                  strokeWidth={2.5} dot={{ r: 3 }}
                                />
                              </ComposedChart>
                            </ChartContainer>
                          )}
                        </CardContent>
                      </Card>

                      <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-bold flex items-center gap-2">
                            <Layers className="w-4 h-4 text-slate-500" /> Revenue to Net
                          </CardTitle>
                          <CardDescription className="text-xs">
                            How gross revenue is eroded by maintenance and renewals.
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ChartContainer config={chartConfig} className="w-full aspect-auto h-[300px]">
                            <BarChart data={breakdownData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                              <CartesianGrid vertical={false} strokeDasharray="3 3" />
                              <XAxis
                                dataKey="name" tickLine={false} axisLine={false}
                                tick={{ fontSize: 10, fontWeight: 700 }}
                              />
                              <YAxis tickFormatter={compact} tickLine={false} axisLine={false} width={48} />
                              <ReferenceLine y={0} stroke="currentColor" className="text-border" />
                              <ChartTooltip
                                content={<ChartTooltipContent nameKey="name" formatter={(v) => sar(Number(v))} />}
                              />
                              <Bar dataKey="value" radius={4} maxBarSize={44}>
                                {breakdownData.map((d) => (
                                  <Cell key={d.name} fill={d.fill} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ChartContainer>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Ledgers */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                      <LedgerCard
                        title="Trip Revenue Ledger"
                        description="Income generated from completed freight runs for this vehicle."
                        icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
                        count={`${financials.income_sources.length} TRIPS`}
                        countClass="bg-emerald-50 text-emerald-700 border-emerald-200"
                        emptyMessage="No completed trip revenue recorded for this vehicle yet."
                        headers={['Customer', 'Reference', 'Amount']}
                        rows={financials.income_sources.map((trip) => ({
                          key: trip.id,
                          cells: [
                            <span key="customer" className="font-bold text-slate-900 dark:text-slate-100">
                              {trip.customer_name}
                            </span>,
                            <span key="ref" className="font-mono text-[10px] text-slate-400">
                              {trip.ref_id || 'TRIP'}
                            </span>,
                            <span key="amount" className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
                              +{sar(trip.income)}
                            </span>,
                          ],
                        }))}
                        total={sar(financials.summary.total_income)}
                        totalClass="text-emerald-600 dark:text-emerald-400"
                      />

                      <LedgerCard
                        title="Maintenance & Service Ledger"
                        description="Itemized workshop repairs and document renewal costs."
                        icon={<TrendingDown className="w-4 h-4 text-rose-600" />}
                        count={`${financials.expense_records.length} LOGS`}
                        countClass="bg-rose-50 text-rose-700 border-rose-200"
                        emptyMessage="No maintenance expense logs recorded for this vehicle yet."
                        headers={['Workshop', 'Type / Date', 'Amount']}
                        rows={financials.expense_records.map((m) => ({
                          key: m.id,
                          cells: [
                            <div key="workshop">
                              <div className="font-bold text-slate-900 dark:text-slate-100">{m.workshop_name}</div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[180px]">
                                {m.work_done || m.remarks || 'Standard service work'}
                              </div>
                            </div>,
                            <div key="type">
                              <Badge variant="outline" className="text-[9px] font-semibold">{m.maintenance_type}</Badge>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {m.start_date ? new Date(m.start_date).toLocaleDateString() : '—'}
                              </div>
                            </div>,
                            <div key="amount">
                              <div className="font-mono font-extrabold text-rose-600 dark:text-rose-400 tabular-nums">
                                -{sar(m.cost || 0)}
                              </div>
                              {m.invoice_number && (
                                <div className="text-[10px] text-slate-400 font-mono">Inv: {m.invoice_number}</div>
                              )}
                            </div>,
                          ],
                        }))}
                        total={sar(financials.summary.total_expenses)}
                        totalClass="text-rose-600 dark:text-rose-400"
                      />
                    </div>
                  </>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

/* ── Shared presentational pieces ─────────────────────────────────────── */

/** Scrollable itemized ledger with a sticky header and a totals footer. */
function LedgerCard({
  title, description, icon, count, countClass, headers, rows, emptyMessage, total, totalClass,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  count: string;
  countClass: string;
  headers: string[];
  rows: { key: string; cells: React.ReactNode[] }[];
  emptyMessage: string;
  total: string;
  totalClass: string;
}) {
  return (
    <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs overflow-hidden">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-sm font-bold flex items-center gap-2">{icon} {title}</CardTitle>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
        <Badge className={cn('text-[10px] font-bold shrink-0', countClass)}>{count}</Badge>
      </CardHeader>

      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs font-medium italic">{emptyMessage}</div>
        ) : (
          <ScrollArea className="h-[340px]">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((h, i) => (
                    <TableHead key={h} className={cn('text-[10px] uppercase', i === headers.length - 1 && 'text-right')}>
                      {h}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.key}>
                    {r.cells.map((c, i) => (
                      <TableCell
                        key={i}
                        className={cn('text-xs py-2.5', i === r.cells.length - 1 && 'text-right')}
                      >
                        {c}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={headers.length - 1} className="text-[11px] font-extrabold uppercase tracking-wide">
                    Total
                  </TableCell>
                  <TableCell className={cn('text-right font-mono font-extrabold text-xs tabular-nums', totalClass)}>
                    {total}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function NoData({ message }: { message: string }) {
  return (
    <div className="py-10 text-center text-xs text-slate-400 font-medium italic">{message}</div>
  );
}

function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
      <AlertTriangle size={32} className="text-amber-500 opacity-60" />
      <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300">{title}</p>
      <p className="text-xs text-slate-500 max-w-sm">{message}</p>
    </div>
  );
}

function FleetSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Skeleton className="lg:col-span-2 h-[360px] rounded-2xl" />
        <Skeleton className="h-[360px] rounded-2xl" />
      </div>
      <Skeleton className="h-[320px] rounded-2xl" />
    </div>
  );
}
