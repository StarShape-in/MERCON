import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import {
  ArrowLeft, DollarSign, TrendingUp, TrendingDown, Truck,
  FileSpreadsheet, FileText, RefreshCw, AlertTriangle, ArrowUpDown, Wallet,
  Layers, CalendarRange, Route, ReceiptText,
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { vehicleService } from '@/services/vehicleService';
import type { FleetVehicleFinancials } from '@/services/vehicleService';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DataTable from '@/components/ui/DataTable';
import type { Column } from '@/components/ui/DataTable';
import { exportExcelTable, exportPDFTable } from '@/utils/exportUtils';
import { cn } from '@/lib/utils';
import { matchesSearch } from '@/lib/search';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, Tooltip } from 'recharts';

/* ── Formatting & palette ─────────────────────────────────────────────── */

const INCOME_COLOR = '#00B074';
const EXPENSE_COLOR = '#FF5B5B';

const compact = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(Math.round(n));
};
const sar = (n: number) => `SAR ${Math.round(n).toLocaleString()}`;

const PROFIT_TIERS = [
  { key: 'high', label: 'High + profit', test: (m: number) => m >= 20 },
  { key: 'profitable', label: 'Medium chans profit', test: (m: number) => m >= 10 && m < 20 },
  { key: 'low', label: 'Low profit', test: (m: number) => m >= 0 && m < 10 },
  { key: 'loss', label: 'Average profit', test: (m: number) => m < 0 },
] as const;

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

  const activeRows = useMemo(
    () => fleetRows.filter((r) => r.total_income !== 0 || r.total_expenses !== 0),
    [fleetRows]
  );

  const assetTypesForGrid = useMemo(
    () => Array.from(new Set(activeRows.map((r) => r.asset_type))).sort(),
    [activeRows]
  );

  const profitabilityGrid = useMemo(
    () => PROFIT_TIERS.map((tier) => ({
      tier,
      cells: assetTypesForGrid.map((type) => ({
        type,
        vehicles: activeRows.filter((r) => r.asset_type === type && tier.test(r.margin_percent)),
      })),
    })),
    [activeRows, assetTypesForGrid]
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

  const topVehicles = useMemo(() => {
    return [...activeRows]
      .sort((a, b) => b.net_profit - a.net_profit)
      .slice(0, 5)
      .map(v => ({
        name: v.plate_number,
        profit: v.net_profit,
      }));
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

  const vehicleCostPerTrip = useMemo(() => {
    if (!financials) return 0;
    const { total_expenses, completed_trips_count } = financials.summary;
    return completed_trips_count > 0 ? Math.round(total_expenses / completed_trips_count) : 0;
  }, [financials]);

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
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                    <CardContent className="pt-6 pb-6 flex-1 flex items-center justify-center">
                      <div className="w-full flex justify-center overflow-x-auto py-2">
                        <div className="w-fit flex flex-col items-center gap-3">
                          
                          {/* Top Header Label: Region */}
                          <div className="text-[11px] font-black tracking-widest text-slate-400 uppercase select-none mr-[60px]">
                            Region
                          </div>

                          <div className="flex items-center gap-3">
                            {/* Left Vertical Label: Region */}
                            <div className="flex items-center justify-center w-6 select-none relative h-32">
                              <span className="text-[11px] font-black tracking-widest text-slate-400 uppercase -rotate-90 whitespace-nowrap block absolute origin-center">
                                Region
                              </span>
                            </div>

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
                                        boxStyle = 'bg-[#00B074] text-white hover:bg-[#009b66]';
                                      } else if (tier.key === 'profitable') {
                                        boxStyle = 'bg-[#2E7D32] text-white hover:bg-[#256428]';
                                      } else if (tier.key === 'low') {
                                        boxStyle = 'bg-[#374151] text-slate-200 hover:bg-[#1f2937]';
                                      } else {
                                        boxStyle = 'bg-[#FF5B5B] text-white hover:bg-[#e04f4f]';
                                      }

                                      return item.isPlaceholder ? (
                                        <div
                                          key={item.vehicleId}
                                          className={cn(
                                            'w-14 h-8 rounded-lg text-[11px] font-extrabold flex items-center justify-center select-none shadow-3xs border border-transparent opacity-85',
                                            boxStyle
                                          )}
                                        >
                                          {item.plateNumber}
                                        </div>
                                      ) : (
                                        <button
                                          key={item.vehicleId}
                                          type="button"
                                          onClick={() => openVehicle(item.vehicleId)}
                                          title={`${item.plateNumber} · ${sar(item.profit)} · ${item.margin}% margin`}
                                          className={cn(
                                            'w-14 h-8 rounded-lg text-[11px] font-extrabold flex items-center justify-center transition-all active:scale-95 shadow-3xs hover:brightness-95',
                                            boxStyle
                                          )}
                                        >
                                          {item.plateNumber.slice(-6)}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Bottom Header Label: Vehicle Type */}
                          <div className="text-[11px] font-black tracking-widest text-slate-400 uppercase select-none mt-1 mr-[60px]">
                            Vehicle Type
                          </div>

                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Right Side: Performance Chart */}
                  <Card className="xl:col-span-5 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl shadow-2xs flex flex-col justify-between">
                    <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-indigo-600" /> TOP PERFORMING VEHICLES
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Top 5 assets ranked by net profit contributions.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 pb-6 flex-1 flex items-center justify-center">
                      {topVehicles.length === 0 ? (
                        <NoData message="No active vehicle financial records found." />
                      ) : (
                        <div className="w-full h-[220px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={topVehicles}
                              layout="vertical"
                              margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.4} />
                              <XAxis type="number" tickFormatter={compact} stroke="#94a3b8" fontSize={10} />
                              <YAxis dataKey="name" type="category" width={80} stroke="#94a3b8" fontSize={10} />
                              <Tooltip
                                formatter={(v) => [sar(Number(v)), 'Net Profit']}
                                contentStyle={{
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                }}
                              />
                              <Bar dataKey="profit" fill="#00B074" radius={[0, 6, 6, 0]} maxBarSize={20}>
                                {topVehicles.map((entry, index) => (
                                  <Cell
                                    key={`cell-${index}`}
                                    fill={entry.profit >= 0 ? INCOME_COLOR : EXPENSE_COLOR}
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                </div>

                {/* Full comparison table */}
                <DataTable<FleetVehicleFinancials>
                  title="🥞 Vehicle Profitability Ledger"
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
                            <Badge className="bg-brand-light text-brand border-brand/30 text-[10px] font-bold">
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
                    {/* KPIs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-row items-start justify-between gap-3 bg-slate-50/40 dark:bg-slate-900/40">
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
                    <TableHead key={h} className={cn('text-[10px] uppercase font-bold text-slate-500', i === headers.length - 1 && 'text-right')}>
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
      <Skeleton className="h-[320px] rounded-2xl" />
    </div>
  );
}
