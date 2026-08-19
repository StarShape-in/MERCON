import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import {
  ArrowLeft, Truck, FileSpreadsheet, FileText, RefreshCw, AlertTriangle,
  ArrowUpDown, Wallet, Layers, CalendarRange, ReceiptText, TrendingUp, TrendingDown,
  ChevronDown, Download, Filter
} from 'lucide-react';
import { ResponsiveContainer, ComposedChart, BarChart, Bar, Cell, Area, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { vehicleService } from '@/services/vehicleService';
import type { FleetVehicleFinancials, MonthlyPoint } from '@/services/vehicleService';
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
  { value: '3', label: '3M' },
  { value: '6', label: '6M' },
  { value: '12', label: '12M' },
  { value: 'all', label: 'All' },
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
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('all');

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

  const { data: vehicleFin, isLoading: isVehicleFinLoading } = useQuery({
    queryKey: ['vehicle-financials-trend', selectedVehicleId, period, range.from, range.to],
    queryFn: () => vehicleService.getFinancials(selectedVehicleId, range),
    enabled: !!selectedVehicleId && selectedVehicleId !== 'all',
  });

  /* Derived fleet data --------------------------------------------------- */

  const fleetRows = useMemo(() => fleet?.vehicles ?? [], [fleet]);

  const activeRows = useMemo(
    () => fleetRows.filter((r) => r.total_income !== 0 || r.total_expenses !== 0),
    [fleetRows]
  );

  const assetTypesForGrid = useMemo(
    () => Array.from(new Set(activeRows.map((r) => r.asset_type))).sort(),
    [activeRows]
  );

  const gridRows = useMemo(() => {
    return PROFIT_TIERS.map((tier) => {
      const tierVehicles = activeRows.filter((r) => tier.test(r.margin_percent));
      const items = [];
      for (let i = 0; i < 8; i++) {
        if (i < tierVehicles.length) {
          items.push({
            isPlaceholder: false,
            vehicleId: tierVehicles[i].vehicle_id,
            plateNumber: tierVehicles[i].plate_number,
            margin: tierVehicles[i].margin_percent,
            profit: tierVehicles[i].net_profit,
          });
        } else {
          const indexStr = String(i + 1).padStart(2, '0');
          items.push({
            isPlaceholder: true,
            vehicleId: `placeholder-${tier.key}-${i}`,
            plateNumber: `V${indexStr}`,
            margin: 0,
            profit: 0,
          });
        }
      }
      return { tier, items };
    });
  }, [activeRows]);

  const fleetMonthlyPoints = useMemo(() => {
    if (!fleet?.monthly) return [];
    return fleet.monthly.map((p) => ({
      ...p,
      label: monthLabel(p.month),
    }));
  }, [fleet]);

  const vehicleMonthlyPoints = useMemo(() => {
    if (!vehicleFin?.monthly) return [];
    return vehicleFin.monthly.map((p: MonthlyPoint) => ({
      ...p,
      label: monthLabel(p.month),
    }));
  }, [vehicleFin]);

  const comparisonData = useMemo(() => {
    return [...activeRows].sort((a, b) => b.net_profit - a.net_profit);
  }, [activeRows]);

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

  const fleetCostPerTrip = useMemo(() => {
    const s = fleet?.fleet_summary;
    if (!s || s.total_trips === 0) return 0;
    return Math.round(s.total_expenses / s.total_trips);
  }, [fleet]);

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
            <ToggleGroup
              value={[period]}
              onValueChange={(v: string[]) => v[0] && setPeriod(v[0])}
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
                    period === 'custom' && 'border-brand/40 bg-brand/5 text-brand'
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
                    className="h-8 text-xs px-3.5 rounded-lg bg-brand hover:bg-brand-hover text-white font-semibold"
                  >
                    Apply
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

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

            {/* ── Grid & Chart Section ───────────────────────────────────── */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
              
              {/* Left Side: Asset Profitability Grid */}
              <Card className="xl:col-span-7 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs flex flex-col justify-between">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-600" /> ASSET PROFITABILITY GRID
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Fleet-wide performance zone matrix of active assets.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4 pb-4 flex-1 flex flex-col justify-center">
                  <div className="w-full flex justify-center overflow-x-auto py-2">
                    <div className="w-fit flex flex-col items-center gap-3">
                      
                      {/* Top Header Label: Region */}
                      <div className="text-[11px] font-black tracking-widest text-slate-400 uppercase select-none">
                        Region
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Main Grid container */}
                        <div className="flex flex-col gap-1.5 border border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10 p-3 rounded-2xl shadow-3xs">
                          {/* Rows */}
                          {gridRows.map(({ tier, items }) => (
                            <div
                              key={tier.key}
                              className="flex items-center gap-2"
                            >
                              {/* Row label */}
                              <div className="text-xs font-extrabold text-slate-500 dark:text-slate-400 text-right w-[140px] select-none pr-3">
                                {tier.label}
                              </div>

                              {/* Row Cells - exactly 8 boxes */}
                              <div className="flex items-center gap-1.5">
                                {items.map((item) => {
                                  let boxStyle = '';
                                  if (tier.key === 'high') {
                                    boxStyle = 'bg-emerald-100/90 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-900/50 hover:bg-emerald-200 dark:hover:bg-emerald-950/60';
                                  } else if (tier.key === 'profitable') {
                                    boxStyle = 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-950/50';
                                  } else if (tier.key === 'low') {
                                    boxStyle = 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80';
                                  } else {
                                    boxStyle = 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-950/50';
                                  }

                                  return item.isPlaceholder ? (
                                    <div
                                      key={item.vehicleId}
                                      className={cn(
                                        'w-14 h-8 rounded-lg text-[11px] font-extrabold flex items-center justify-center select-none shadow-3xs opacity-85',
                                        boxStyle
                                      )}
                                    >
                                      {item.plateNumber}
                                    </div>
                                  ) : (
                                    <button
                                      key={item.vehicleId}
                                      type="button"
                                      onClick={() => navigate(`/vehicles/${item.vehicleId}`)}
                                      title={`${item.plateNumber} · ${sar(item.profit)} · ${item.margin}% margin`}
                                      className={cn(
                                        'w-14 h-8 rounded-lg text-[11px] font-extrabold flex items-center justify-center transition-all active:scale-95 shadow-3xs hover:brightness-95',
                                        boxStyle
                                      )}
                                    >
                                      {item.plateNumber}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Bottom Header Label: Vehicle Type */}
                      <div className="text-[11px] font-black tracking-widest text-slate-400 uppercase select-none mt-1">
                        Vehicle Type
                      </div>

                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Right Side: Vehicle Profit and Loss Graph */}
              <Card className="xl:col-span-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs flex flex-col justify-between">
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-600" /> VEHICLE PROFIT &amp; LOSS GRAPH
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Monthly trend per asset or full fleet profitability comparison.
                    </CardDescription>
                  </div>
                  <Select
                    value={selectedVehicleId}
                    onValueChange={setSelectedVehicleId}
                  >
                    <SelectTrigger className="h-8 w-40 text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                      <SelectValue placeholder="Select vehicle..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white max-h-56">
                      <SelectItem value="all">All Vehicles (Compare)</SelectItem>
                      {activeRows.map((v) => (
                        <SelectItem key={v.vehicle_id} value={v.vehicle_id}>
                          {v.plate_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent className="pt-4 pb-4 flex-1 flex flex-col justify-between min-h-[280px]">
                  {selectedVehicleId === 'all' ? (
                    comparisonData.length === 0 ? (
                      <NoData message="No active vehicle financial data found for comparison." />
                    ) : (
                      <div className="w-full flex-1 min-h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={comparisonData}
                            margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.4} />
                            <XAxis dataKey="plate_number" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                            <YAxis tickFormatter={compact} stroke="#94a3b8" fontSize={9} width={36} tickLine={false} axisLine={false} />
                            <Tooltip
                              formatter={(v) => sar(Number(v))}
                              contentStyle={{
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: 'bold',
                              }}
                            />
                            <Bar dataKey="net_profit" radius={[4, 4, 0, 0]}>
                              {comparisonData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.net_profit >= 0 ? INCOME_COLOR : EXPENSE_COLOR} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )
                  ) : isVehicleFinLoading ? (
                    <div className="flex items-center justify-center flex-1">
                      <RefreshCw className="w-5 h-5 animate-spin text-slate-400" />
                    </div>
                  ) : vehicleMonthlyPoints.length === 0 ? (
                    <NoData message="No active monthly financial data found for this vehicle." />
                  ) : (
                    <div className="w-full flex-1 min-h-[220px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart
                          data={vehicleMonthlyPoints}
                          margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                        >
                          <defs>
                            <linearGradient id="gridIncome" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={INCOME_COLOR} stopOpacity={0.2} />
                              <stop offset="95%" stopColor={INCOME_COLOR} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="gridExpenses" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={EXPENSE_COLOR} stopOpacity={0.15} />
                              <stop offset="95%" stopColor={EXPENSE_COLOR} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.4} />
                          <XAxis dataKey="label" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                          <YAxis tickFormatter={compact} stroke="#94a3b8" fontSize={9} width={36} tickLine={false} axisLine={false} />
                          <Tooltip
                            formatter={(v) => sar(Number(v))}
                            contentStyle={{
                              borderRadius: '12px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                            }}
                          />
                          <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', marginTop: '10px' }} />
                          <Area name="Revenue" type="monotone" dataKey="income" fill="url(#gridIncome)" stroke={INCOME_COLOR} strokeWidth={1.5} />
                          <Area name="Expenses" type="monotone" dataKey="expenses" fill="url(#gridExpenses)" stroke={EXPENSE_COLOR} strokeWidth={1.5} />
                          <Line name="Net Profit" type="monotone" dataKey="profit" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>

            {/* Full comparison table */}
            <DataTable<FleetVehicleFinancials>
              title="Vehicle Profitability Ledger"
              subtitle="Every vehicle, sortable by any financial column. Click a row to open its detailed statement."
              columns={columns}
              data={sortedRows}
              onRowClick={(r) => navigate(`/vehicles/${r.vehicle_id}`)}
              onExport={exportFleet}
              searchValue={tableSearch}
              onSearchChange={setTableSearch}
              searchPlaceholder="Search by plate number…"
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
