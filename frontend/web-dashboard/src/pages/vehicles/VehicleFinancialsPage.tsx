import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import {
  ArrowLeft, Truck, FileSpreadsheet, FileText, RefreshCw, AlertTriangle,
  ArrowUpDown, Wallet, CalendarRange, ReceiptText, TrendingUp, TrendingDown,
  ChevronDown, Download, Filter, Trophy, Activity, Fuel, Wrench, UserCheck, Coins
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { vehicleService } from '@/services/vehicleService';
import type { FleetVehicleFinancials } from '@/services/vehicleService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import DataTable from '@/components/ui/DataTable';
import type { Column } from '@/components/ui/DataTable';
import { exportExcelTable, exportPDFTable } from '@/utils/exportUtils';
import { cn } from '@/lib/utils';
import { matchesSearch } from '@/lib/search';
import { Skeleton } from '@/components/ui/skeleton';
import ExportModal, { ExportColumn, ExportFilter } from '@/components/ui/ExportModal';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

/* ── Formatting & palette ─────────────────────────────────────────────── */

const INCOME_COLOR = '#00B074';
const EXPENSE_COLOR = '#FF5B5B';

const sar = (n: number) => `SAR ${Math.round(n).toLocaleString()}`;

const compact = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
};

const monthLabel = (key: string) => {
  const [y, m] = key.split('-');
  const d = new Date(Number(y), Number(m) - 1, 1);
  return `${d.toLocaleString('en', { month: 'short' })} ${String(y).slice(2)}`;
};

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

const PROFIT_TIERS = [
  { key: 'high', label: 'High Profit', test: (m: number) => m >= 20 },
  { key: 'profitable', label: 'Medium Profit', test: (m: number) => m >= 10 && m < 20 },
  { key: 'low', label: 'Average Profit', test: (m: number) => m >= 0 && m < 10 },
  { key: 'loss', label: 'Low Profit', test: (m: number) => m < 0 },
] as const;

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
  ratio?: number;
}) {
  const t = TONES[tone];
  return (
    <Card className={cn('rounded-2xl p-4 flex flex-col justify-between gap-1 border shadow-2xs bg-white dark:bg-slate-900', t.card)}>
      <div className="flex items-center justify-between">
        <span className={cn('text-[10px] font-extrabold uppercase tracking-wider', t.label)}>{label}</span>
        {icon}
      </div>
      <div className={cn('text-2xl font-mono font-extrabold mt-1 tabular-nums', t.value)}>{value}</div>
      {ratio !== undefined && (
        <div className="h-1 w-full rounded-full bg-slate-200/70 dark:bg-slate-800 overflow-hidden mt-1.5">
          <div
            className={cn('h-full rounded-full transition-all', t.bar)}
            style={{ width: `${Math.min(100, Math.max(0, ratio * 100))}%` }}
          />
        </div>
      )}
      <div className="text-[11px] text-slate-500 font-medium mt-1">{hint}</div>
    </Card>
  );
}

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

type SortField = 'plate_number' | 'total_income' | 'total_expenses' | 'net_profit' | 'margin_percent' | 'trips_count' | 'driver_charges' | 'fuel_expenses' | 'maintenance_expenses' | 'salary_expenses' | 'other_expenses';

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

const VEHICLE_PL_EXPORT_COLUMNS: ExportColumn<FleetVehicleFinancials>[] = [
  { id: 'plate_number', label: 'Plate Number', accessor: (r) => r.plate_number },
  { id: 'asset_type', label: 'Type', accessor: (r) => r.asset_type },
  { id: 'total_income', label: 'Revenue Generated', accessor: (r) => r.total_income },
  { id: 'trips_count', label: 'Number of Trips', accessor: (r) => r.trips_count },
  { id: 'driver_charges', label: 'Driver Charges', accessor: (r) => r.driver_charges },
  { id: 'fuel_expenses', label: 'Fuel', accessor: (r) => r.fuel_expenses },
  { id: 'maintenance_expenses', label: 'Maintenance', accessor: (r) => r.maintenance_expenses },
  { id: 'salary_expenses', label: 'Driver Salary/Allowance', accessor: (r) => r.salary_expenses },
  { id: 'other_expenses', label: 'Other Expenses', accessor: (r) => r.other_expenses },
  { id: 'net_profit', label: 'Actual Profit', accessor: (r) => r.net_profit },
  { id: 'margin_percent', label: 'Margin %', accessor: (r) => `${r.margin_percent}%` },
];

const VEHICLE_PL_EXPORT_FILTERS: ExportFilter<FleetVehicleFinancials>[] = [
  {
    id: 'asset_type',
    label: 'Vehicle Type',
    options: [
      { label: 'All Types', value: 'All' },
      { label: 'Heavy Truck', value: 'HeavyTruck' },
      { label: 'Medium Truck', value: 'MediumTruck' },
      { label: 'Light Truck', value: 'LightTruck' },
      { label: 'Trailer', value: 'Trailer' },
    ],
    filterFn: (r, val) => r.asset_type === val,
  },
  {
    id: 'profit_tier',
    label: 'Profitability Tier',
    options: [
      { label: 'All Tiers', value: 'All' },
      { label: 'High Profit (>=20%)', value: 'high' },
      { label: 'Medium Profit (10-20%)', value: 'profitable' },
      { label: 'Average Profit (0-10%)', value: 'low' },
      { label: 'Low Profit (<0%)', value: 'loss' },
    ],
    filterFn: (r, val) => {
      if (val === 'high') return r.margin_percent >= 20;
      if (val === 'profitable') return r.margin_percent >= 10 && r.margin_percent < 20;
      if (val === 'low') return r.margin_percent >= 0 && r.margin_percent < 10;
      if (val === 'loss') return r.margin_percent < 0;
      return true;
    },
  },
];

export default function VehicleFinancialsPage() {
  const navigate = useNavigate();

  const [period, setPeriod] = useState<string>('all');
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [sort, setSort] = useState<{ field: SortField; dir: 'asc' | 'desc' }>({
    field: 'net_profit',
    dir: 'desc',
  });
  const [tableSearch, setTableSearch] = useState('');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [profitabilityFilter, setProfitabilityFilter] = useState<string>('all');
  const [rankFilter, setRankFilter] = useState<string>('all');
  const [leaderboardTab, setLeaderboardTab] = useState<'top' | 'loss'>('top');

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
    data: fleet, isLoading: isFleetLoading, refetch: refetchFleet,
  } = useQuery({
    queryKey: ['fleet-financials', period, range.from, range.to],
    queryFn: () => vehicleService.getFleetFinancials(range),
  });

  /* Derived fleet data --------------------------------------------------- */

  const fleetRows = useMemo(() => fleet?.vehicles ?? [], [fleet]);

  const sortedRows = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    let filtered = fleetRows.filter((r) => {
      const matchesText = matchesSearch(tableSearch, [r.plate_number, r.ref_id, r.asset_type]);
      if (!matchesText) return false;

      if (typeFilter !== 'all' && r.asset_type !== typeFilter) return false;

      if (profitabilityFilter !== 'all') {
        if (profitabilityFilter === 'high' && r.margin_percent < 20) return false;
        if (profitabilityFilter === 'profitable' && (r.margin_percent < 10 || r.margin_percent >= 20)) return false;
        if (profitabilityFilter === 'moderate' && (r.margin_percent < 0 || r.margin_percent >= 10)) return false;
        if (profitabilityFilter === 'loss' && r.margin_percent >= 0) return false;
      }

      return true;
    });

    if (rankFilter === 'top_profitable') {
      filtered = [...filtered]
        .sort((a, b) => b.net_profit - a.net_profit)
        .slice(0, 5);
    } else if (rankFilter === 'top_loss') {
      filtered = [...filtered]
        .sort((a, b) => a.net_profit - b.net_profit)
        .slice(0, 5);
    }

    return [...filtered].sort((a, b) => {
      const av = a[sort.field];
      const bv = b[sort.field];
      if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * dir;
      return ((av as number) - (bv as number)) * dir;
    });
  }, [fleetRows, sort, tableSearch, typeFilter, profitabilityFilter, rankFilter]);

  const toggleSort = (field: SortField) =>
    setSort((s) => (s.field === field
      ? { field, dir: s.dir === 'asc' ? 'desc' : 'asc' }
      : { field, dir: field === 'plate_number' ? 'asc' : 'desc' }));

  const fleetCostPerTrip = useMemo(() => {
    const s = fleet?.fleet_summary;
    if (!s || s.total_trips === 0) return 0;
    return Math.round(s.total_expenses / s.total_trips);
  }, [fleet]);

  const expenseBreakdown = useMemo(() => {
    if (!fleetRows.length) return null;
    const fuel = fleetRows.reduce((s, r) => s + (r.fuel_expenses || 0), 0);
    const maintenance = fleetRows.reduce((s, r) => s + (r.maintenance_expenses || 0), 0);
    const salary = fleetRows.reduce((s, r) => s + (r.salary_expenses || 0), 0);
    const driverCharges = fleetRows.reduce((s, r) => s + (r.driver_charges || 0), 0);
    const other = fleetRows.reduce((s, r) => s + (r.other_expenses || 0), 0);
    const total = fuel + maintenance + salary + driverCharges + other;

    return {
      fuel,
      maintenance,
      salary,
      driverCharges,
      other,
      total: total || 1,
      items: [
        { label: 'Fuel & Gas', value: fuel, pct: total > 0 ? Math.round((fuel / total) * 100) : 0, color: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', icon: Fuel },
        { label: 'Maintenance & Repairs', value: maintenance, pct: total > 0 ? Math.round((maintenance / total) * 100) : 0, color: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', icon: Wrench },
        { label: 'Driver Salaries & Allowances', value: salary, pct: total > 0 ? Math.round((salary / total) * 100) : 0, color: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400', icon: UserCheck },
        { label: 'Driver Trip Charges', value: driverCharges, pct: total > 0 ? Math.round((driverCharges / total) * 100) : 0, color: 'bg-teal-500', text: 'text-teal-600 dark:text-teal-400', icon: Coins },
        { label: 'Other Operating Expenses', value: other, pct: total > 0 ? Math.round((other / total) * 100) : 0, color: 'bg-slate-500', text: 'text-slate-600 dark:text-slate-400', icon: ReceiptText },
      ].filter(item => item.value > 0 || total === 0)
    };
  }, [fleetRows]);

  const tierDistribution = useMemo(() => {
    if (!fleetRows.length) return null;
    const total = fleetRows.length;
    const high = fleetRows.filter((r) => r.margin_percent >= 20).length;
    const profitable = fleetRows.filter((r) => r.margin_percent >= 10 && r.margin_percent < 20).length;
    const moderate = fleetRows.filter((r) => r.margin_percent >= 0 && r.margin_percent < 10).length;
    const loss = fleetRows.filter((r) => r.margin_percent < 0).length;

    return {
      total,
      high,
      highPct: Math.round((high / total) * 100),
      profitable,
      profitablePct: Math.round((profitable / total) * 100),
      moderate,
      moderatePct: Math.round((moderate / total) * 100),
      loss,
      lossPct: Math.round((loss / total) * 100),
    };
  }, [fleetRows]);

  const topVehicles = useMemo(() => {
    return [...fleetRows].sort((a, b) => b.net_profit - a.net_profit).slice(0, 5);
  }, [fleetRows]);

  const lossVehicles = useMemo(() => {
    return [...fleetRows].sort((a, b) => a.net_profit - b.net_profit).slice(0, 5);
  }, [fleetRows]);

  const maxAbsProfit = useMemo(() => {
    if (!fleetRows.length) return 1;
    return Math.max(...fleetRows.map(r => Math.abs(r.net_profit)), 1);
  }, [fleetRows]);

  const insights = useMemo(() => {
    if (fleetRows.length === 0) return null;
    const sorted = [...fleetRows].sort((a, b) => b.net_profit - a.net_profit);
    const topVehicle = sorted[0];
    const bottomVehicle = sorted[sorted.length - 1];
    const profitableCount = fleetRows.filter((r) => r.net_profit > 0).length;
    const healthPercent = Math.round((profitableCount / fleetRows.length) * 100);

    return {
      top: topVehicle,
      bottom: bottomVehicle,
      profitableCount,
      totalCount: fleetRows.length,
      healthPercent,
    };
  }, [fleetRows]);

  /* Export --------------------------------------------------------------- */

  const exportFleet = () => {
    if (!fleet) return;
    exportExcelTable(
      'MERCON Fleet — Vehicle Profitability Ledger',
      ['Plate', 'Type', 'Revenue (SAR)', 'Trips', 'Driver Charges (SAR)', 'Fuel (SAR)', 'Maintenance (SAR)', 'Salary/Allowance (SAR)', 'Other Expenses (SAR)', 'Actual Profit (SAR)', 'Margin %'],
      [
        ...sortedRows.map((r) => [
          r.plate_number, r.asset_type,
          r.total_income, r.trips_count, r.driver_charges, r.fuel_expenses, r.maintenance_expenses, r.salary_expenses, r.other_expenses, r.net_profit, `${r.margin_percent}%`
        ]),
        ['FLEET TOTAL', '',
          fleet.fleet_summary.total_income,
          fleet.fleet_summary.total_trips,
          sortedRows.reduce((s, r) => s + r.driver_charges, 0),
          sortedRows.reduce((s, r) => s + r.fuel_expenses, 0),
          sortedRows.reduce((s, r) => s + r.maintenance_expenses, 0),
          sortedRows.reduce((s, r) => s + r.salary_expenses, 0),
          sortedRows.reduce((s, r) => s + r.other_expenses, 0),
          fleet.fleet_summary.net_profit,
          `${fleet.fleet_summary.margin_percent}%`],
      ],
      'Fleet_Profitability.xlsx'
    );
  };

  const exportFleetPDF = () => {
    if (!fleet) return;
    exportPDFTable(
      'Fleet Vehicle Profitability Ledger',
      ['Plate', 'Type', 'Revenue (SAR)', 'Trips', 'Driver Charges (SAR)', 'Fuel (SAR)', 'Maintenance (SAR)', 'Salary/Allowance (SAR)', 'Other Expenses (SAR)', 'Actual Profit (SAR)', 'Margin %'],
      [
        ...sortedRows.map((r) => [
          r.plate_number, r.asset_type,
          r.total_income.toLocaleString(), r.trips_count, r.driver_charges.toLocaleString(), r.fuel_expenses.toLocaleString(), r.maintenance_expenses.toLocaleString(), r.salary_expenses.toLocaleString(), r.other_expenses.toLocaleString(), r.net_profit.toLocaleString(), `${r.margin_percent}%`
        ]),
        ['TOTAL', '',
          fleet.fleet_summary.total_income.toLocaleString(),
          fleet.fleet_summary.total_trips,
          sortedRows.reduce((s, r) => s + r.driver_charges, 0).toLocaleString(),
          sortedRows.reduce((s, r) => s + r.fuel_expenses, 0).toLocaleString(),
          sortedRows.reduce((s, r) => s + r.maintenance_expenses, 0).toLocaleString(),
          sortedRows.reduce((s, r) => s + r.salary_expenses, 0).toLocaleString(),
          sortedRows.reduce((s, r) => s + r.other_expenses, 0).toLocaleString(),
          fleet.fleet_summary.net_profit.toLocaleString(),
          `${fleet.fleet_summary.margin_percent}%`],
      ],
      'Fleet_Profitability.pdf'
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
      header: <SortHeader label="Profitability" field="margin_percent" sort={sort} onSort={toggleSort} align="left" />,
      accessor: (r) => {
        if (r.margin_percent >= 20) {
          return (
            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/50 text-[10px] font-bold hover:bg-emerald-50 shadow-2xs">
              High Profit
            </Badge>
          );
        }
        if (r.margin_percent >= 10) {
          return (
            <Badge className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900/40 text-[10px] font-bold hover:bg-green-50 shadow-2xs">
              Profitable
            </Badge>
          );
        }
        if (r.margin_percent >= 0) {
          return (
            <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-800 text-[10px] font-bold hover:bg-slate-50 shadow-2xs">
              Moderate
            </Badge>
          );
        }
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-900/40 text-[10px] font-bold hover:bg-rose-50 shadow-2xs">
            Loss Making
          </Badge>
        );
      },
    },
    {
      header: <SortHeader label="Revenue" field="total_income" sort={sort} onSort={toggleSort} />,
      className: 'text-right',
      headerClassName: 'text-right',
      accessor: (r) => (
        <span className="font-mono text-xs tabular-nums text-emerald-600 dark:text-emerald-400 font-bold">
          {sar(r.total_income)}
        </span>
      ),
    },
    {
      header: <SortHeader label="Trips" field="trips_count" sort={sort} onSort={toggleSort} />,
      className: 'text-right',
      headerClassName: 'text-right',
      accessor: (r) => <span className="font-mono text-xs tabular-nums">{r.trips_count}</span>,
    },
    {
      header: <SortHeader label="Driver Charges" field="driver_charges" sort={sort} onSort={toggleSort} />,
      className: 'text-right',
      headerClassName: 'text-right',
      accessor: (r) => (
        <span className="font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400 font-medium">
          {sar(r.driver_charges)}
        </span>
      ),
    },
    {
      header: <SortHeader label="Fuel" field="fuel_expenses" sort={sort} onSort={toggleSort} />,
      className: 'text-right',
      headerClassName: 'text-right',
      accessor: (r) => (
        <span className="font-mono text-xs tabular-nums text-rose-600 dark:text-rose-400">
          {sar(r.fuel_expenses)}
        </span>
      ),
    },
    {
      header: <SortHeader label="Maintenance" field="maintenance_expenses" sort={sort} onSort={toggleSort} />,
      className: 'text-right',
      headerClassName: 'text-right',
      accessor: (r) => (
        <span className="font-mono text-xs tabular-nums text-rose-600 dark:text-rose-400">
          {sar(r.maintenance_expenses)}
        </span>
      ),
    },
    {
      header: <SortHeader label="Salary/Allowance" field="salary_expenses" sort={sort} onSort={toggleSort} />,
      className: 'text-right',
      headerClassName: 'text-right',
      accessor: (r) => (
        <span className="font-mono text-xs tabular-nums text-rose-600 dark:text-rose-400">
          {sar(r.salary_expenses)}
        </span>
      ),
    },
    {
      header: <SortHeader label="Other Expenses" field="other_expenses" sort={sort} onSort={toggleSort} />,
      className: 'text-right',
      headerClassName: 'text-right',
      accessor: (r) => (
        <span className="font-mono text-xs tabular-nums text-rose-500 dark:text-rose-500">
          {sar(r.other_expenses)}
        </span>
      ),
    },
    {
      header: <SortHeader label="Actual Profit" field="net_profit" sort={sort} onSort={toggleSort} />,
      className: 'text-right',
      headerClassName: 'text-right',
      accessor: (r) => <Money value={r.net_profit} className="text-xs font-bold" />,
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

  const summary = fleet?.fleet_summary;

  return (
    <DashboardLayout active="Vehicle P&L" title="Vehicle Profit & Loss">
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
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetchFleet()}
              className="h-9 w-9 p-0 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/80 cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!fleet}
                  className="h-9 gap-1.5 text-xs font-semibold border-slate-200 bg-white hover:bg-slate-50 shadow-2xs dark:bg-slate-900 dark:border-slate-800 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                  Export File
                  <ChevronDown className="h-3 w-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl">
                <DropdownMenuLabel className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                  Export Options
                </DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={exportFleet}
                  className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md"
                >
                  <FileSpreadsheet className="mr-2 h-3.5 w-3.5 text-emerald-600" />
                  Export Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={exportFleetPDF}
                  className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md"
                >
                  <FileText className="mr-2 h-3.5 w-3.5 text-rose-600" />
                  Export PDF (.pdf)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setIsExportOpen(true)}
                  className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md text-brand hover:bg-orange-50 dark:hover:bg-orange-950/40"
                >
                  <Filter className="mr-2 h-3.5 w-3.5 text-brand" />
                  Custom Export Settings...
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {isFleetLoading ? (
          <FleetSkeleton />
        ) : !summary ? (
          <EmptyState
            title="Fleet report unavailable"
            message="The fleet profitability report could not be loaded. Try refreshing."
          />
        ) : (
          <div className="space-y-5">
            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard
                label="Total Revenue"
                value={sar(summary.total_income)}
                hint={`${summary.total_trips} earning trips across ${summary.vehicles_count} vehicles`}
                tone="income"
                icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
              />
              <StatCard
                label="Total Trips"
                value={String(summary.total_trips)}
                hint="Completed & invoiced trips"
                tone="neutral"
                icon={<ReceiptText className="w-4 h-4 text-slate-400" />}
              />
              <StatCard
                label="Total Vehicle Cost"
                value={sar(summary.total_expenses)}
                hint="Operating expenses & driver charges"
                tone="expense"
                icon={<TrendingDown className="w-4 h-4 text-rose-600" />}
                ratio={summary.total_income > 0 ? summary.total_expenses / summary.total_income : 0}
              />
              <StatCard
                label="Actual Profit"
                value={sar(summary.net_profit)}
                hint="Revenue minus all operating costs"
                tone={summary.net_profit >= 0 ? 'profit' : 'expense'}
                icon={<Wallet className="w-4 h-4 text-indigo-600" />}
              />
              <StatCard
                label="Profit Margin"
                value={`${summary.margin_percent}%`}
                hint="Overall return rate of fleet revenue"
                tone={summary.margin_percent >= 0 ? 'income' : 'expense'}
                icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
              />
            </div>

            {/* ── 2 Main Visual Intelligence Panels ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* PANEL 1: Vehicle Profit & Loss Visual Spotlight (5 Vehicles with 3D Images, Toggle & Date Filter) */}
              <Card className="rounded-2xl p-4.5 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between space-y-4">
                <div>
                  {/* Top bar inside the card: Title + Date Filter + Profit/Loss Switcher */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center border shrink-0 transition-colors",
                        leaderboardTab === 'top'
                          ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/50 dark:border-emerald-900/60"
                          : "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/50 dark:border-rose-900/60"
                      )}>
                        {leaderboardTab === 'top' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>{leaderboardTab === 'top' ? 'Top 5 Profit Vehicles' : 'Top 5 Loss-Making Vehicles'}</span>
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          {leaderboardTab === 'top' ? 'Leading fleet revenue and net margin contributors' : 'High cost outliers requiring immediate operational attention'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Date Filter directly inside the box */}
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(
                              "h-8 text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-2xs gap-1 px-2.5 cursor-pointer",
                              period === 'custom' && 'border-brand/40 bg-brand/5 text-brand'
                            )}
                          >
                            <CalendarRange className="w-3.5 h-3.5 text-slate-400" />
                            <span className="truncate max-w-[100px] text-[11px]">
                              {period === 'custom' && customRange?.from
                                ? customRange.to
                                  ? `${format(customRange.from, 'MMM d')} - ${format(customRange.to, 'MMM d')}`
                                  : format(customRange.from, 'MMM d')
                                : PERIODS.find((p) => p.value === period)?.label || 'All Time'}
                            </span>
                            <ChevronDown className="w-3 h-3 text-slate-400" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="p-0 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col md:flex-row max-w-[540px] w-auto">
                          {/* Presets */}
                          <div className="w-36 border-r border-slate-100 dark:border-slate-800 p-2 flex flex-col gap-1 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="text-[10px] font-bold tracking-wider uppercase text-slate-400 px-2 py-1">
                              Presets
                            </div>
                            {PERIODS.map((p) => (
                              <button
                                key={p.value}
                                type="button"
                                onClick={() => setPeriod(p.value)}
                                className={cn(
                                  'w-full text-left text-xs font-semibold px-2 py-1.5 rounded-lg transition-colors',
                                  period === p.value ? 'bg-brand/10 text-brand' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                                )}
                              >
                                {p.label}
                              </button>
                            ))}
                            <button
                              type="button"
                              onClick={() => setPeriod('custom')}
                              className={cn(
                                'w-full text-left text-xs font-semibold px-2 py-1.5 rounded-lg transition-colors border-t border-slate-100 dark:border-slate-800 mt-1 pt-1.5',
                                period === 'custom' ? 'bg-brand/10 text-brand' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                              )}
                            >
                              Custom...
                            </button>
                          </div>
                          {period === 'custom' && (
                            <div className="p-3">
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

                      {/* Profit vs Loss Buttons */}
                      <div className="inline-flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => setLeaderboardTab('top')}
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                            leaderboardTab === 'top'
                              ? "bg-emerald-600 text-white shadow-2xs"
                              : "text-slate-600 hover:text-slate-900 dark:text-slate-300"
                          )}
                        >
                          <TrendingUp className="w-3 h-3" />
                          <span>Profit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setLeaderboardTab('loss')}
                          className={cn(
                            "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                            leaderboardTab === 'loss'
                              ? "bg-rose-600 text-white shadow-2xs"
                              : "text-slate-600 hover:text-slate-900 dark:text-slate-300"
                          )}
                        >
                          <TrendingDown className="w-3 h-3" />
                          <span>Loss</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 5 Vehicle Showcase Cards */}
                  <div className="mt-3.5 space-y-2.5">
                    {(leaderboardTab === 'top' ? topVehicles : lossVehicles).length === 0 ? (
                      <div className="py-12 text-center text-xs text-slate-400 font-medium">
                        No vehicle data found for this period.
                      </div>
                    ) : (
                      (leaderboardTab === 'top' ? topVehicles : lossVehicles).map((veh, idx) => {
                        const isProfit = veh.net_profit >= 0;

                        return (
                          <div
                            key={veh.vehicle_id || veh.plate_number}
                            onClick={() => navigate(`/vehicles/${veh.vehicle_id}`)}
                            className={cn(
                              "group relative p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 shadow-2xs hover:shadow-md",
                              isProfit
                                ? "bg-gradient-to-r from-emerald-50/40 via-white to-white dark:from-emerald-950/20 dark:via-slate-900 dark:to-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-emerald-300"
                                : "bg-gradient-to-r from-rose-50/40 via-white to-white dark:from-rose-950/20 dark:via-slate-900 dark:to-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-rose-300"
                            )}
                          >
                            {/* Rank badge */}
                            <div className={cn(
                              "w-6 h-6 rounded-lg text-[10px] font-extrabold flex items-center justify-center shrink-0 font-mono shadow-2xs",
                              idx === 0
                                ? isProfit ? "bg-amber-400 text-amber-950" : "bg-rose-600 text-white"
                                : isProfit ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300" : "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300"
                            )}>
                              #{idx + 1}
                            </div>

                            {/* 3D Vehicle Render & Meta */}
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className="w-11 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-center p-1 shrink-0 overflow-hidden shadow-2xs group-hover:scale-105 transition-transform">
                                <img
                                  src="/truck_3d_orange_transparent.png"
                                  alt="Vehicle"
                                  className="w-full h-full object-contain drop-shadow-xs"
                                />
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 group-hover:text-brand transition-colors tracking-tight font-mono">
                                    {veh.plate_number}
                                  </span>
                                  <Badge variant="outline" className="text-[9px] font-bold px-1.5 py-0">
                                    {veh.asset_type}
                                  </Badge>
                                </div>
                                <div className="text-[10px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                                  <span>{veh.trips_count} trips</span>
                                  <span>•</span>
                                  <span>Revenue: {sar(veh.total_income)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Net Profit & Margin */}
                            <div className="text-right shrink-0">
                              <div className={cn(
                                "font-mono font-extrabold text-sm tabular-nums",
                                isProfit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                              )}>
                                {isProfit ? '+' : ''}{sar(veh.net_profit)}
                              </div>
                              <div className="flex items-center justify-end gap-1 mt-0.5">
                                <span className={cn(
                                  "text-[10px] font-bold px-1.5 py-0.2 rounded font-mono",
                                  isProfit ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" : "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300"
                                )}>
                                  {veh.margin_percent}% margin
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Spotlight Summary</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Showing {Math.min(5, (leaderboardTab === 'top' ? topVehicles : lossVehicles).length)} {leaderboardTab === 'top' ? 'profitable' : 'loss'} units
                  </span>
                </div>
              </Card>

              {/* PANEL 2: Fleet Financial Flow & Operational Cost Intelligence */}
              <Card className="rounded-2xl p-4.5 border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 dark:bg-indigo-950/50 dark:border-indigo-900/60 shrink-0">
                        <Coins className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
                          Fleet Financial Flow &amp; Cost Allocation
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          Revenue retention, operating cost drivers &amp; margin distribution
                        </p>
                      </div>
                    </div>

                    <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 font-mono text-[10px]">
                      {summary.vehicles_count} Active Trucks
                    </Badge>
                  </div>

                  {/* Visual Revenue Partitioning Waterfall */}
                  <div className="mt-3.5 p-3 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Revenue vs Cost Flow
                      </span>
                      <span className="text-[11px] font-bold text-slate-500">
                        Total {sar(summary.total_income)}
                      </span>
                    </div>

                    {/* Dual-tone Progress Bar */}
                    <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex p-0.5 gap-0.5">
                      <div
                        style={{
                          width: `${summary.total_income > 0 ? Math.min(100, Math.max(5, (summary.total_expenses / summary.total_income) * 100)) : 50}%`
                        }}
                        className="h-full bg-rose-500 rounded-l-full transition-all"
                        title={`Operating Costs: ${sar(summary.total_expenses)}`}
                      />
                      <div
                        style={{
                          width: `${summary.total_income > 0 ? Math.min(100, Math.max(5, Math.max(0, summary.net_profit) / summary.total_income * 100)) : 50}%`
                        }}
                        className="h-full bg-emerald-500 rounded-r-full transition-all"
                        title={`Net Profit: ${sar(summary.net_profit)}`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500 pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-rose-500" />
                        <span>Costs: <strong className="text-rose-600 dark:text-rose-400 font-mono">{sar(summary.total_expenses)}</strong></span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Retained Profit: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{sar(summary.net_profit)}</strong> ({summary.margin_percent}%)</span>
                      </div>
                    </div>
                  </div>

                  {/* Cost Drivers Breakdown */}
                  {expenseBreakdown && (
                    <div className="mt-3.5 space-y-2">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Operating Expense Breakdown
                      </div>
                      <div className="space-y-1.5">
                        {expenseBreakdown.items.map((cat) => {
                          const Icon = cat.icon;
                          return (
                            <div key={cat.label} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium text-[11px]">
                                  <Icon className={cn("w-3.5 h-3.5 shrink-0", cat.text)} />
                                  <span className="truncate">{cat.label}</span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-[11px] tabular-nums">
                                    {sar(cat.value)}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-400 w-8 text-right font-mono">
                                    {cat.pct}%
                                  </span>
                                </div>
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={cn("h-full rounded-full transition-all", cat.color)}
                                  style={{ width: `${cat.pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Clickable Profitability Tiers Row */}
                  {tierDistribution && (
                    <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <span>Filter Ledger by Profit Tier</span>
                        <span className="text-slate-500 font-normal">Click to isolate</span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setProfitabilityFilter(profitabilityFilter === 'high' ? 'all' : 'high')}
                          className={cn(
                            "p-1.5 rounded-lg border text-center transition-all cursor-pointer text-[10px]",
                            profitabilityFilter === 'high'
                              ? "border-emerald-400 bg-emerald-50 text-emerald-800 font-bold shadow-2xs"
                              : "border-slate-100 dark:border-slate-800 bg-slate-50/50 text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          <div className="font-bold">High (≥20%)</div>
                          <div className="font-mono font-extrabold text-emerald-600">{tierDistribution.high}</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setProfitabilityFilter(profitabilityFilter === 'profitable' ? 'all' : 'profitable')}
                          className={cn(
                            "p-1.5 rounded-lg border text-center transition-all cursor-pointer text-[10px]",
                            profitabilityFilter === 'profitable'
                              ? "border-green-400 bg-green-50 text-green-800 font-bold shadow-2xs"
                              : "border-slate-100 dark:border-slate-800 bg-slate-50/50 text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          <div className="font-bold">Med (10-20%)</div>
                          <div className="font-mono font-extrabold text-green-600">{tierDistribution.profitable}</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setProfitabilityFilter(profitabilityFilter === 'moderate' ? 'all' : 'moderate')}
                          className={cn(
                            "p-1.5 rounded-lg border text-center transition-all cursor-pointer text-[10px]",
                            profitabilityFilter === 'moderate'
                              ? "border-amber-400 bg-amber-50 text-amber-800 font-bold shadow-2xs"
                              : "border-slate-100 dark:border-slate-800 bg-slate-50/50 text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          <div className="font-bold">Avg (0-10%)</div>
                          <div className="font-mono font-extrabold text-amber-600">{tierDistribution.moderate}</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setProfitabilityFilter(profitabilityFilter === 'loss' ? 'all' : 'loss')}
                          className={cn(
                            "p-1.5 rounded-lg border text-center transition-all cursor-pointer text-[10px]",
                            profitabilityFilter === 'loss'
                              ? "border-rose-400 bg-rose-50 text-rose-800 font-bold shadow-2xs"
                              : "border-slate-100 dark:border-slate-800 bg-slate-50/50 text-slate-600 hover:bg-slate-100"
                          )}
                        >
                          <div className="font-bold">Loss (&lt;0%)</div>
                          <div className="font-mono font-extrabold text-rose-600">{tierDistribution.loss}</div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 font-medium">Avg Net / Trip</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {summary.total_trips > 0 ? sar(summary.net_profit / summary.total_trips) : '—'}
                  </span>
                </div>
              </Card>
            </div>

            {/* Full comparison table */}
            <DataTable<FleetVehicleFinancials>
              title="Vehicle Profitability Ledger"
              subtitle="Every vehicle, sortable by any financial column. Click a row to open its detailed statement."
              columns={columns}
              data={sortedRows}
              onRowClick={(r) => navigate(`/vehicles/${r.vehicle_id}/financials`)}
              searchValue={tableSearch}
              onSearchChange={setTableSearch}
              searchPlaceholder="Search by plate number…"
              filterElement={
                <div className="flex items-center gap-3">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-9 text-xs w-[185px] justify-between font-medium bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 cursor-pointer shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800",
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
                    <PopoverContent align="start" className="p-0 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden flex flex-col md:flex-row max-w-[580px] w-auto">
                      {/* Left Panel: Preset options */}
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

                      {/* Right Panel: Calendar */}
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

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-9 text-xs w-[140px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 cursor-pointer">
                      <SelectValue placeholder="Vehicle Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="HeavyTruck">Heavy Truck</SelectItem>
                      <SelectItem value="MediumTruck">Medium Truck</SelectItem>
                      <SelectItem value="LightTruck">Light Truck</SelectItem>
                      <SelectItem value="Trailer">Trailer</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={profitabilityFilter} onValueChange={setProfitabilityFilter}>
                    <SelectTrigger className="h-9 text-xs w-[140px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 cursor-pointer">
                      <SelectValue placeholder="Profitability" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="all">All Profitability</SelectItem>
                      <SelectItem value="high">High Profit (&gt;=20%)</SelectItem>
                      <SelectItem value="profitable">Profitable (10-20%)</SelectItem>
                      <SelectItem value="moderate">Moderate (0-10%)</SelectItem>
                      <SelectItem value="loss">Loss Making (&lt;0%)</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={rankFilter} onValueChange={setRankFilter}>
                    <SelectTrigger className="h-9 text-xs w-[165px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 cursor-pointer">
                      <SelectValue placeholder="Rank / View Focus" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="all">Show All Vehicles</SelectItem>
                      <SelectItem value="top_profitable">Top 5 Most Profitable</SelectItem>
                      <SelectItem value="top_loss">Top 5 Biggest Loss</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              }
              emptyTitle="No vehicles"
              emptyMessage="Add vehicles to the fleet to see their profitability here."
              compact
            />
          </div>
        )}

        <ExportModal
          isOpen={isExportOpen}
          onClose={() => setIsExportOpen(false)}
          title="Export Vehicle Profitability Ledger"
          description="Choose your export preferences, filters, and columns."
          fileNamePrefix="vehicle_profitability_ledger"
          sheetName="Vehicle P&L"
          subtitle="MERCON Logistics Vehicle Profitability Ledger"
          filteredData={sortedRows}
          allData={fleetRows}
          totalCount={fleetRows.length}
          columns={VEHICLE_PL_EXPORT_COLUMNS}
          filters={VEHICLE_PL_EXPORT_FILTERS}
          formats={['xlsx', 'csv', 'pdf']}
        />
      </div>
    </DashboardLayout>
  );
}

/* ── Shared presentational pieces ─────────────────────────────────────── */

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
      <Skeleton className="h-[320px] rounded-2xl" />
    </div>
  );
}
