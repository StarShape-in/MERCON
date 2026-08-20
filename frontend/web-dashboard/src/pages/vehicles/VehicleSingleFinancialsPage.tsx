import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import {
  AlertTriangle, Wallet, CalendarRange,
  ReceiptText, TrendingUp, TrendingDown, ChevronDown, ChevronLeft, ChevronRight, CalendarDays, Download,
  Fuel, Wrench, UserCheck, Coins, FileSpreadsheet, FileText
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
import { exportExcelTable, exportPDFTable } from '@/utils/exportUtils';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

const PERIODS = [
  { value: 'all', label: 'All Time' },
  { value: '1', label: 'Last 30 Days' },
  { value: '3', label: 'Last 3 Months' },
  { value: '6', label: 'Last 6 Months' },
  { value: '12', label: 'Last 12 Months' },
] as const;

const rangeFor = (period: string): { from?: string; to?: string } => {
  if (period === 'all' || period === 'custom') return {};
  const from = new Date();
  from.setMonth(from.getMonth() - Number(period));
  return { from: from.toISOString() };
};

const sar = (v: number | null | undefined) => {
  if (v === null || v === undefined) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(v);
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function VehicleSingleFinancialsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [period, setPeriod] = useState<string>('all');
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'trips' | 'expenses'>('trips');
  
  // Search states for tables
  const [tripSearch, setTripSearch] = useState('');
  const [expenseSearch, setExpenseSearch] = useState('');

  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const setMonthAndYear = (month: number, year: number) => {
    let targetMonth = month;
    let targetYear = year;

    // Prevent future year
    if (targetYear > currentYear) {
      targetYear = currentYear;
    }

    // Prevent future month in current year
    if (targetYear === currentYear && targetMonth > currentMonth) {
      targetMonth = currentMonth;
    }

    setSelectedMonth(targetMonth);
    setSelectedYear(targetYear);
    const from = new Date(targetYear, targetMonth, 1);
    const to = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59);
    setCustomRange({ from, to });
    setPeriod('custom');
  };

  const handlePrevMonth = () => {
    let nextMonth = selectedMonth - 1;
    let nextYear = selectedYear;
    if (nextMonth < 0) {
      nextMonth = 11;
      nextYear -= 1;
    }
    setMonthAndYear(nextMonth, nextYear);
  };

  const handleNextMonth = () => {
    // If we're already at the current month/year limit, don't allow going forward
    if (selectedYear > currentYear || (selectedYear === currentYear && selectedMonth >= currentMonth)) {
      return;
    }

    let nextMonth = selectedMonth + 1;
    let nextYear = selectedYear;
    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear += 1;
    }
    setMonthAndYear(nextMonth, nextYear);
  };

  useEffect(() => {
    if (period === 'custom' && customRange?.from) {
      setSelectedMonth(customRange.from.getMonth());
      setSelectedYear(customRange.from.getFullYear());
    } else if (period !== 'custom' && period !== 'all') {
      const start = new Date();
      start.setMonth(start.getMonth() - Number(period));
      setSelectedMonth(start.getMonth());
      setSelectedYear(start.getFullYear());
    }
  }, [period, customRange]);

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

  /* Exporters ----------------------------------------------------------- */

  const exportExcel = () => {
    if (!financials || !vehicle || !summary) return;
    const dateStr = period === 'custom' && customRange?.from
      ? `${format(customRange.from, 'MMM d, yyyy')} - ${format(customRange.to ?? customRange.from, 'MMM d, yyyy')}`
      : PERIODS.find((p) => p.value === period)?.label || 'All Time';

    const pnlRows = [
      ['Vehicle P&L Statement', ''],
      ['Vehicle Plate Number', vehicle.plate_number],
      ['Date Range', dateStr],
      ['Asset Type', vehicle.asset_type],
      [],
      ['PROFIT & LOSS STATEMENT SUMMARY', ''],
      ['Total Revenue', summary.total_income],
      ['Total Trips', summary.completed_trips_count],
      ['Total Operating Expenses', summary.total_expenses],
      ['Actual Profit', summary.net_profit],
      ['Profit Margin', `${summary.margin_percent}%`],
      [],
      ['OPERATING EXPENSES BREAKDOWN', ''],
      ['Driver Charges', summary.driver_charges],
      ['Fuel', summary.fuel_expenses],
      ['Maintenance', summary.maintenance_expenses],
      ['Salary / Allowance', summary.salary_expenses],
      ['Other Vehicle Expenses', summary.other_expenses],
      [],
      ['TRIP REVENUE LEDGER', ''],
      ['Date', 'Trip Ref ID', 'Customer', 'Driver Charges (SAR)', 'Revenue (SAR)'],
      ...tripsData.map((t) => [
        t.date ? format(new Date(t.date), 'MMM d, yyyy') : '',
        t.ref_id || 'N/A',
        t.customer_name,
        t.trip_charges,
        t.income
      ]),
      [],
      ['EXPENSE STATEMENT LEDGER', ''],
      ['Date', 'Ref ID', 'Type', 'Category', 'Description', 'Amount (SAR)'],
      ...expensesData.map((e) => [
        e.date ? format(new Date(e.date), 'MMM d, yyyy') : '',
        e.ref_id || 'N/A',
        e.type,
        e.category,
        e.description,
        e.amount
      ])
    ];

    exportExcelTable(
      `P&L Statement — ${vehicle.plate_number}`,
      ['Metric / Column', 'Value / Details'],
      pnlRows,
      `PL_Statement_${vehicle.plate_number}.xlsx`
    );
  };

  const exportPDF = () => {
    if (!financials || !vehicle || !summary) return;
    const dateStr = period === 'custom' && customRange?.from
      ? `${format(customRange.from, 'MMM d, yyyy')} - ${format(customRange.to ?? customRange.from, 'MMM d, yyyy')}`
      : PERIODS.find((p) => p.value === period)?.label || 'All Time';

    const pnlRows = [
      ['Total Revenue', summary.total_income.toLocaleString()],
      ['Total Trips', summary.completed_trips_count.toString()],
      ['Driver Charges', summary.driver_charges.toLocaleString()],
      ['Fuel', summary.fuel_expenses.toLocaleString()],
      ['Maintenance', summary.maintenance_expenses.toLocaleString()],
      ['Salary / Allowance', summary.salary_expenses.toLocaleString()],
      ['Other Expenses', summary.other_expenses.toLocaleString()],
      ['Total Cost', summary.total_expenses.toLocaleString()],
      ['Actual Profit', summary.net_profit.toLocaleString()],
      ['Profit Margin', `${summary.margin_percent}%`],
    ];

    exportPDFTable(
      `P&L Statement — ${vehicle.plate_number} (${dateStr})`,
      ['Statement Item', 'Amount (SAR)'],
      pnlRows,
      `PL_Statement_${vehicle.plate_number}.pdf`
    );
  };

  /* Columns definitions -------------------------------------------------- */

  const tripColumns: Column<(typeof tripsData)[number]>[] = [
    {
      header: 'Date',
      accessor: (r) => (
        <span className="font-mono text-slate-500 text-xs">
          {r.date ? format(new Date(r.date), 'MMM d') : '—'}
        </span>
      ),
    },
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
      accessor: (r) => <span className="font-semibold text-xs">{r.customer_name}</span>,
    },
    {
      header: 'Driver Charges',
      accessor: (r) => <span className="font-mono text-slate-600 text-xs">{sar(r.trip_charges)}</span>,
    },
    {
      header: 'Revenue',
      accessor: (r) => <span className="font-mono font-bold text-emerald-600 text-xs">{sar(r.income)}</span>,
    },
  ];

  const expenseColumns: Column<(typeof expensesData)[number]>[] = [
    {
      header: 'Date',
      accessor: (r) => (
        <span className="font-mono text-slate-500 text-xs">
          {r.date ? format(new Date(r.date), 'MMM d') : '—'}
        </span>
      ),
    },
    {
      header: 'Category',
      accessor: (r) => <span className="font-bold text-xs text-slate-700 dark:text-slate-350">{r.category}</span>,
    },
    {
      header: 'Description',
      accessor: (r) => <span className="text-slate-500 text-xs truncate max-w-[280px] inline-block">{r.description}</span>,
    },
    {
      header: 'Amount',
      accessor: (r) => <span className="font-mono font-bold text-rose-600 text-xs">{sar(r.amount)}</span>,
    },
    {
      header: 'Source',
      accessor: (r) => {
        let label = 'Expenses →';
        let path = `/expenses/${r.id}`;
        if (r.type === 'Maintenance') {
          label = 'Maintenance →';
          path = `/maintenance/${r.id}`;
        } else if (r.category?.toLowerCase() === 'fuel') {
          label = 'Fuel Module →';
          path = `/expenses/${r.id}`;
        } else if (r.category?.toLowerCase() === 'salary' || r.category?.toLowerCase() === 'salary advance') {
          label = 'Payroll →';
          path = `/expenses/${r.id}`;
        } else if (r.ref_id?.startsWith('TRP-')) {
          label = 'Trip →';
          path = `/trips`;
        }
        
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              navigate(path);
            }}
            className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline cursor-pointer"
          >
            {label}
          </button>
        );
      }
    }
  ];

  const isLoading = isVehicleLoading || isFinancialsLoading;

  return (
    <DashboardLayout active="Vehicle P&L" title="Vehicle P&L Statement">
      <div className="px-4 sm:px-6 pb-6 space-y-5 animate-fade-in max-w-[1500px] mx-auto w-full">
        
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Vehicle P&amp;L
              </h1>
              <p className="text-sm font-bold text-slate-500 font-mono">
                {vehicle?.plate_number || '...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Date popover filter in toolbar */}
            {/* Month Name navigator & Small select year table */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-0.5 shadow-2xs">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer"
                  onClick={handlePrevMonth}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </Button>
                <span className="text-[11px] font-extrabold text-slate-700 dark:text-slate-300 px-1.5 min-w-[65px] text-center font-mono uppercase tracking-wider">
                  {MONTH_NAMES[selectedMonth].slice(0, 3)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={selectedYear >= currentYear && selectedMonth >= currentMonth}
                  className={cn(
                    "h-6 w-6 rounded-lg cursor-pointer",
                    (selectedYear >= currentYear && selectedMonth >= currentMonth)
                      ? "text-slate-300 dark:text-slate-700 cursor-not-allowed opacity-50"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-850"
                  )}
                  onClick={handleNextMonth}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Small year grid selector */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xs gap-1 px-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/80"
                  >
                    <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                    <span>{selectedYear}</span>
                    <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-48 p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl shadow-md">
                  <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 px-1">Select Year</div>
                  <div className="grid grid-cols-3 gap-1">
                    {Array.from({ length: 9 }, (_, i) => currentYear - 8 + i).map((yr) => (
                      <button
                        key={yr}
                        type="button"
                        onClick={() => setMonthAndYear(selectedMonth, yr)}
                        className={cn(
                          "py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer",
                          selectedYear === yr
                            ? "bg-brand/10 text-brand border border-brand/20"
                            : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                        )}
                      >
                        {yr}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 text-xs font-semibold gap-1.5 shadow-2xs cursor-pointer bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Export</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
                <DropdownMenuItem onClick={exportExcel} className="text-xs font-semibold cursor-pointer py-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <FileSpreadsheet className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                  Excel Statement
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportPDF} className="text-xs font-semibold cursor-pointer py-2 hover:bg-slate-50 dark:hover:bg-slate-800">
                  <FileText className="w-3.5 h-3.5 mr-2 text-rose-600" />
                  PDF Statement
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
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
          <div className="space-y-6">
            {/* KPI Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <Card className="border border-slate-200/80 dark:border-slate-800/85 rounded-2xl bg-white dark:bg-slate-950 p-5 flex flex-col justify-between min-h-[105px] shadow-2xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Revenue</span>
                  <div className="text-xl font-black font-mono tracking-tight mt-1 text-slate-800 dark:text-slate-100">
                    {sar(summary.total_income)}
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 mt-1">Revenue from completed trips</span>
              </Card>

              <Card className="border border-slate-200/80 dark:border-slate-800/85 rounded-2xl bg-white dark:bg-slate-950 p-5 flex flex-col justify-between min-h-[105px] shadow-2xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Trips</span>
                  <div className="text-xl font-black font-mono tracking-tight mt-1 text-slate-800 dark:text-slate-100">
                    {summary.completed_trips_count}
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 mt-1">Revenue-generating completed trips</span>
              </Card>

              <Card className="border border-slate-200/80 dark:border-slate-800/85 rounded-2xl bg-white dark:bg-slate-950 p-5 flex flex-col justify-between min-h-[105px] shadow-2xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Cost</span>
                  <div className="text-xl font-black font-mono tracking-tight mt-1 text-slate-800 dark:text-slate-100">
                    {sar(summary.total_expenses)}
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 mt-1">All costs attributed to the vehicle</span>
              </Card>

              {/* VISUAL FOCUS: Actual Profit */}
              <Card className={cn(
                "rounded-2xl p-5 flex flex-col justify-between min-h-[105px] border-2 shadow-sm transition-all duration-200",
                summary.net_profit >= 0 
                  ? "border-emerald-500/80 bg-emerald-50/20 dark:bg-emerald-950/10" 
                  : "border-rose-500/80 bg-rose-50/20 dark:bg-rose-950/10"
              )}>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Actual Profit / Loss</span>
                  <div className={cn(
                    "text-2xl font-black font-mono tracking-tight mt-0.5",
                    summary.net_profit >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
                  )}>
                    {summary.net_profit >= 0 ? '+' : ''}{sar(summary.net_profit)}
                  </div>
                  <div className={cn(
                    "text-xs font-extrabold mt-0.5 font-mono",
                    summary.margin_percent >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  )}>
                    {summary.margin_percent}% Margin
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 mt-1">Revenue − Total Cost</span>
              </Card>

              <Card className="border border-slate-200/80 dark:border-slate-800/85 rounded-2xl bg-white dark:bg-slate-950 p-5 flex flex-col justify-between min-h-[105px] shadow-2xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Cost / KM</span>
                  <div className="text-xl font-black font-mono tracking-tight mt-1 text-slate-800 dark:text-slate-100">
                    {summary.total_distance_km > 0 
                      ? sar(summary.total_expenses / summary.total_distance_km) 
                      : '—'}
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 mt-1">
                  {summary.total_distance_km > 0 
                    ? `Over ${summary.total_distance_km.toLocaleString()} KM driven` 
                    : 'Only when reliable odometer data exists'}
                </span>
              </Card>
            </div>

            {/* P&L Statement and Expense Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Profit & Loss Statement */}
              <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 overflow-hidden shadow-2xs">
                <div className="px-5 py-4 border-b border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Profit &amp; Loss Statement</h3>
                </div>
                <CardContent className="p-5 space-y-4 text-xs">
                  {/* Revenue */}
                  <div>
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Revenue</div>
                    <div className="flex justify-between py-1.5 text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-900">
                      <span className="font-medium">Trip Revenue</span>
                      <span className="font-mono font-bold text-slate-950 dark:text-slate-50">{sar(summary.total_income)}</span>
                    </div>
                    <div className="flex justify-between py-2 text-slate-950 dark:text-slate-50 font-black border-b border-slate-250 dark:border-slate-800">
                      <span>Total Revenue</span>
                      <span className="font-mono">{sar(summary.total_income)}</span>
                    </div>
                  </div>

                  {/* Operating Expenses */}
                  <div className="pt-2">
                    <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Operating Expenses</div>
                    <div className="space-y-1">
                      <div className="flex justify-between py-1.5 text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-900/50">
                        <span className="pl-2">Driver Charges</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{sar(summary.driver_charges)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-900/50">
                        <span className="pl-2">Fuel</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{sar(summary.fuel_expenses)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-900/50">
                        <span className="pl-2">Maintenance</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{sar(summary.maintenance_expenses)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-900/50">
                        <span className="pl-2">Salary / Allowance</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{sar(summary.salary_expenses)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-900/50">
                        <span className="pl-2">Other Vehicle Expenses</span>
                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">{sar(summary.other_expenses)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between py-2.5 text-slate-950 dark:text-slate-50 font-black border-b border-slate-250 dark:border-slate-800">
                      <span>Total Operating Expenses</span>
                      <span className="font-mono">{sar(summary.total_expenses)}</span>
                    </div>
                  </div>

                  {/* Summary block */}
                  <div className={cn(
                    "p-3 rounded-xl border flex flex-col gap-0.5 mt-2",
                    summary.net_profit >= 0 
                      ? "bg-emerald-500/5 border-emerald-500/20" 
                      : "bg-rose-500/5 border-rose-500/20"
                  )}>
                    <div className="flex justify-between text-slate-950 dark:text-slate-50 font-black text-sm uppercase tracking-wide">
                      <span>Actual Profit</span>
                      <span className="font-mono">{sar(summary.net_profit)}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-slate-500">
                      <span>Profit Margin</span>
                      <span className="font-mono">{summary.margin_percent}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Expense Breakdown */}
              <Card className="border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-950 overflow-hidden shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="px-5 py-4 border-b border-slate-150 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Expense Breakdown</h3>
                  </div>
                  <CardContent className="p-5 space-y-4">
                    <ExpenseBarItem label="Fuel" value={summary.fuel_expenses} total={summary.total_expenses} color="bg-amber-500" />
                    <ExpenseBarItem label="Driver Charges" value={summary.driver_charges} total={summary.total_expenses} color="bg-teal-500" />
                    <ExpenseBarItem label="Salary / Allowance" value={summary.salary_expenses} total={summary.total_expenses} color="bg-purple-500" />
                    <ExpenseBarItem label="Maintenance" value={summary.maintenance_expenses} total={summary.total_expenses} color="bg-blue-500" />
                    <ExpenseBarItem label="Other" value={summary.other_expenses} total={summary.total_expenses} color="bg-slate-500" />
                  </CardContent>
                </div>
                <div className="p-5 border-t border-slate-100 dark:border-slate-900 bg-slate-50/20 dark:bg-slate-950/20 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Visual Operational Cost Ratio Comparison
                </div>
              </Card>
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

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                    {activeTab === 'trips' ? 'Inflow' : 'Outflow'} Ledger
                  </span>
                </div>
              </div>

              {activeTab === 'trips' ? (
                <DataTable
                  title="Trip Revenue"
                  subtitle="Detailed revenue transactions for completed trips"
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
                  title="Expense Statement"
                  subtitle="Detailed list of maintenance and operational expenses"
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

/* ── Expense Bar Helper ──────────────────────────────────────────────── */

function ExpenseBarItem({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-bold">
        <span className="text-slate-500 dark:text-slate-400">{label}</span>
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-slate-800 dark:text-slate-200">{sar(value)}</span>
          <span className="text-[10px] text-slate-400 font-mono">({pct}%)</span>
        </div>
      </div>
      <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
