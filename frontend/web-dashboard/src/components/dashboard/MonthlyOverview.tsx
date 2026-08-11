import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Maximize2,
  ChevronRight,
  RefreshCw,
  FileSpreadsheet,
  Layers,
  PieChart as PieChartIcon,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  AreaChart,
  Area,
  XAxis,
  CartesianGrid,
} from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { reportsService } from '@/services/reportsService';

// ─── Chart Configuration ──────────────────────────────────────────────────
const REVENUE_CHART_CONFIG = {
  revenue: { label: 'Revenue', color: '#10B981' },
  expense: { label: 'Expense', color: '#EF4444' },
};

export type PeriodType = 'monthly' | '6months' | 'yearly';

export interface ExpenseItem {
  id: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  status: 'Approved' | 'Pending' | 'Processed';
}

const FALLBACK_DATASETS = {
  monthly: [
    { period: 'Nov', revenue: 31200, expense: 10400 },
    { period: 'Dec', revenue: 36800, expense: 11900 },
    { period: 'Jan', revenue: 33500, expense: 12100 },
    { period: 'Feb', revenue: 38900, expense: 13200 },
    { period: 'Mar', revenue: 35600, expense: 11800 },
    { period: 'Apr', revenue: 40100, expense: 13750 },
    { period: 'May', revenue: 42420, expense: 14320 },
  ],
  '6months': [
    { period: 'Q4\'24', revenue: 98000, expense: 34000 },
    { period: 'Jan',    revenue: 33500, expense: 12100 },
    { period: 'Feb',    revenue: 38900, expense: 13200 },
    { period: 'Mar',    revenue: 35600, expense: 11800 },
    { period: 'Apr',    revenue: 40100, expense: 13750 },
    { period: 'May',    revenue: 42420, expense: 14320 },
  ],
  yearly: [
    { period: '2020', revenue: 210000, expense: 78000 },
    { period: '2021', revenue: 265000, expense: 91000 },
    { period: '2022', revenue: 318000, expense: 108000 },
    { period: '2023', revenue: 374000, expense: 121000 },
    { period: '2024', revenue: 431000, expense: 139000 },
    { period: '2025', revenue: 508000, expense: 162000 },
  ],
};

const PERIOD_KPI_FALLBACK = {
  monthly:  { rev: 'SAR 42,420', revVal: 42420, net: 'SAR 28,100', netVal: 28100, exp: 'SAR 14,320', expVal: 14320, revPct: '+14.2%', netPct: '+12.5%', expPct: '+8.3%', expK: '14.3K', margin: '66.2%' },
  '6months':{ rev: 'SAR 221,520', revVal: 221520, net: 'SAR 152,370', netVal: 152370, exp: 'SAR 69,150', expVal: 69150, revPct: '+18.7%', netPct: '+20.1%', expPct: '+11.4%', expK: '69.2K', margin: '68.7%' },
  yearly:   { rev: 'SAR 508,000', revVal: 508000, net: 'SAR 346,000', netVal: 346000, exp: 'SAR 162,000', expVal: 162000, revPct: '+17.9%', netPct: '+15.3%', expPct: '+16.5%', expK: '162K', margin: '68.1%' },
};

const DONUT_DATASETS = {
  monthly: [
    { name: 'Fuel',        value: 6420,  pct: 45, color: '#E8450F', val: 'SAR 6,420' },
    { name: 'Maintenance', value: 4230,  pct: 30, color: '#1E293B', val: 'SAR 4,230' },
    { name: 'Labor',       value: 2120,  pct: 15, color: '#10B981', val: 'SAR 2,120' },
    { name: 'Other',       value: 1550,  pct: 10, color: '#3B82F6', val: 'SAR 1,550' },
  ],
  '6months': [
    { name: 'Fuel',        value: 31200, pct: 45, color: '#E8450F', val: 'SAR 31,200' },
    { name: 'Maintenance', value: 20700, pct: 30, color: '#1E293B', val: 'SAR 20,700' },
    { name: 'Labor',       value: 10400, pct: 15, color: '#10B981', val: 'SAR 10,400' },
    { name: 'Other',       value: 6850,  pct: 10, color: '#3B82F6', val: 'SAR 6,850' },
  ],
  yearly: [
    { name: 'Fuel',        value: 72900, pct: 45, color: '#E8450F', val: 'SAR 72,900' },
    { name: 'Maintenance', value: 48600, pct: 30, color: '#1E293B', val: 'SAR 48,600' },
    { name: 'Labor',       value: 24300, pct: 15, color: '#10B981', val: 'SAR 24,300' },
    { name: 'Other',       value: 16200, pct: 10, color: '#3B82F6', val: 'SAR 16,200' },
  ],
};

const ITEMIZED_EXPENSES: ExpenseItem[] = [
  { id: 'EXP-901', category: 'Fuel', description: 'Dammam - Riyadh Fleet Diesel Top-up (12 Units)', amount: 3840, date: '2026-08-10', status: 'Approved' },
  { id: 'EXP-902', category: 'Maintenance', description: 'Volvo FH16 Brake Pad & Hydraulic Fluid Replacement', amount: 2450, date: '2026-08-08', status: 'Approved' },
  { id: 'EXP-903', category: 'Labor', description: 'Long-haul Driver Per Diem & Night Allowances', amount: 1520, date: '2026-08-07', status: 'Approved' },
  { id: 'EXP-904', category: 'Fuel', description: 'Jeddah Port Transit Cargo Refueling', amount: 2580, date: '2026-08-05', status: 'Approved' },
  { id: 'EXP-905', category: 'Maintenance', description: 'Actros Scheduled Engine Oil & Filter Change', amount: 1780, date: '2026-08-04', status: 'Approved' },
  { id: 'EXP-906', category: 'Other', description: 'Highway Toll Charges & Weighbridge Clearance Fees', amount: 950, date: '2026-08-03', status: 'Approved' },
  { id: 'EXP-907', category: 'Labor', description: 'Overtime Handling for Off-peak Reefer Discharge', amount: 600, date: '2026-08-01', status: 'Approved' },
  { id: 'EXP-908', category: 'Other', description: 'GPS Tracker Telematics Subscription (Fleet-wide)', amount: 600, date: '2026-07-31', status: 'Processed' },
];

export default function MonthlyOverview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [chartPeriod, setChartPeriod] = useState<PeriodType>('monthly');
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Live Query integration from backend reports summary
  const { data: summaryData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: reportsService.getSummary,
  });

  // Calculate dynamic chart dataset if live reports data is present
  const chartData = useMemo(() => {
    if (summaryData?.monthly_revenue_chart && summaryData.monthly_revenue_chart.length > 0) {
      return summaryData.monthly_revenue_chart.map((item) => ({
        period: item.month,
        revenue: item.revenue,
        expense: Math.round(item.revenue * 0.33), // Estimated expense ratio
      }));
    }
    return FALLBACK_DATASETS[chartPeriod];
  }, [summaryData, chartPeriod]);

  // Derived KPI stats
  const kpiStats = useMemo(() => {
    const fallback = PERIOD_KPI_FALLBACK[chartPeriod];
    if (summaryData?.kpis?.revenue_this_month?.value && chartPeriod === 'monthly') {
      const revVal = summaryData.kpis.revenue_this_month.value;
      const expVal = Math.round(revVal * 0.337);
      const netVal = revVal - expVal;
      const revPct = summaryData.kpis.revenue_this_month.delta
        ? `${summaryData.kpis.revenue_this_month.delta > 0 ? '+' : ''}${summaryData.kpis.revenue_this_month.delta.toFixed(1)}%`
        : fallback.revPct;
      return {
        rev: `SAR ${revVal.toLocaleString()}`,
        revVal,
        net: `SAR ${netVal.toLocaleString()}`,
        netVal,
        exp: `SAR ${expVal.toLocaleString()}`,
        expVal,
        revPct,
        netPct: fallback.netPct,
        expPct: fallback.expPct,
        expK: `${(expVal / 1000).toFixed(1)}K`,
        margin: `${((netVal / revVal) * 100).toFixed(1)}%`,
      };
    }
    return fallback;
  }, [summaryData, chartPeriod]);

  const donutData = DONUT_DATASETS[chartPeriod];

  const filteredExpenses = useMemo(() => {
    if (!selectedCategory) return ITEMIZED_EXPENSES;
    return ITEMIZED_EXPENSES.filter(
      (item) => item.category.toLowerCase() === selectedCategory.toLowerCase()
    );
  }, [selectedCategory]);

  return (
    <TooltipProvider>
      <div className="bg-white rounded-[18px] border border-black/[0.06] shadow-sm overflow-hidden flex flex-col transition-all hover:shadow-md">
        
        {/* ── Top Bar: Title + Period Switcher + Actions ── */}
        <div className="px-5 py-3.5 border-b border-black/[0.04] flex items-center justify-between bg-slate-50/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#FFF0EB] flex items-center justify-center border border-[#FFE2D6]">
              <DollarSign className="w-4 h-4 text-[#E8450F]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold text-slate-800 uppercase tracking-widest">
                  {chartPeriod === 'monthly' ? 'Monthly' : chartPeriod === '6months' ? '6 Months' : 'Yearly'} Overview
                </span>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[9px] font-extrabold px-1.5 py-0 h-4">
                  Live
                </Badge>
              </div>
            </div>
          </div>

          {/* Controls: Refetch & Period Selector */}
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => refetch()}
                  className="w-6 h-6 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60"
                >
                  <RefreshCw className={`w-3 h-3 ${isFetching ? 'animate-spin text-[#E8450F]' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="text-[10px] font-bold">Refresh Overview</TooltipContent>
            </Tooltip>

            {/* Period switcher with orange active state */}
            <ToggleGroup
              value={[chartPeriod]}
              onValueChange={(v) => v[0] && setChartPeriod(v[0] as PeriodType)}
              className="border border-slate-200 bg-slate-100/80 p-0.5 rounded-lg"
            >
              <ToggleGroupItem
                value="monthly"
                className="text-[9px] font-extrabold h-6 px-2.5 rounded-md text-slate-600 transition-all data-[state=on]:!bg-[#E8450F] data-[state=on]:!text-white hover:text-[#E8450F]"
              >
                1M
              </ToggleGroupItem>
              <ToggleGroupItem
                value="6months"
                className="text-[9px] font-extrabold h-6 px-2.5 rounded-md text-slate-600 transition-all data-[state=on]:!bg-[#E8450F] data-[state=on]:!text-white hover:text-[#E8450F]"
              >
                6M
              </ToggleGroupItem>
              <ToggleGroupItem
                value="yearly"
                className="text-[9px] font-extrabold h-6 px-2.5 rounded-md text-slate-600 transition-all data-[state=on]:!bg-[#E8450F] data-[state=on]:!text-white hover:text-[#E8450F]"
              >
                1Y
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {/* ── KPI Numbers ── */}
        <div className="p-5 pb-3">
          {/* Primary Revenue Display */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Gross Revenue</p>
              <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                Margin: <span className="text-slate-900 font-extrabold">{kpiStats.margin}</span>
              </span>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[26px] font-extrabold text-slate-900 tracking-tight leading-none">
                {kpiStats.rev}
              </p>
              <span className="flex items-center gap-1 bg-emerald-50 text-emerald-600 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-1 rounded-full shadow-2xs">
                <TrendingUp className="w-3 h-3" />
                {kpiStats.revPct}
              </span>
            </div>
          </div>

          {/* Net Amount & Expense Sub-Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100/80 hover:bg-emerald-50/20 transition-colors">
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Net Profit</p>
              <p className="text-[15px] font-extrabold text-emerald-600 leading-tight">{kpiStats.net}</p>
              <div className="flex items-center gap-0.5 mt-1 text-emerald-600">
                <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
                <span className="text-[9px] font-extrabold">{kpiStats.netPct}</span>
                <span className="text-[8px] text-slate-400 font-medium ml-1">vs prior</span>
              </div>
            </div>

            <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100/80 hover:bg-rose-50/20 transition-colors">
              <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Total Expense</p>
              <p className="text-[15px] font-extrabold text-rose-500 leading-tight">{kpiStats.exp}</p>
              <div className="flex items-center gap-0.5 mt-1 text-rose-500">
                <TrendingDown className="w-3 h-3 stroke-[2.5]" />
                <span className="text-[9px] font-extrabold">{kpiStats.expPct}</span>
                <span className="text-[8px] text-slate-400 font-medium ml-1">vs prior</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Dynamic Area Graph ── */}
        <div className="px-5 pt-2 pb-2">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
              {chartPeriod === 'monthly' ? '7-Month' : chartPeriod === '6months' ? '6-Month' : '6-Year'} Trend
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-1 rounded-full bg-emerald-500" />
                <span className="text-[9px] font-extrabold text-slate-500">Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-2.5 h-1 rounded-full bg-red-400"
                  style={{ backgroundImage: 'repeating-linear-gradient(90deg,#EF4444 0 3px,transparent 3px 6px)' }}
                />
                <span className="text-[9px] font-extrabold text-slate-500">Expense</span>
              </div>
            </div>
          </div>

          <ChartContainer config={REVENUE_CHART_CONFIG} className="h-[125px] w-full aspect-auto">
            <AreaChart data={chartData} margin={{ top: 8, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10B981" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="fillExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#EF4444" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#EF4444" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#F1F5F9" strokeDasharray="3 6" />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 9, fontWeight: 800, fill: '#94A3B8' }}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip
                cursor={{ stroke: '#CBD5E1', strokeWidth: 1.5 }}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    labelClassName="font-extrabold text-slate-800"
                    formatter={(value, name) => (
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ background: name === 'revenue' ? '#10B981' : '#EF4444' }}
                        />
                        <span className="text-[10px] font-bold text-slate-600">
                          {name === 'revenue' ? 'Revenue' : 'Expense'}
                        </span>
                        <span
                          className="ml-auto text-[11px] font-extrabold"
                          style={{ color: name === 'revenue' ? '#10B981' : '#EF4444' }}
                        >
                          SAR {Number(value).toLocaleString()}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#10B981"
                strokeWidth={2.5}
                fill="url(#fillRevenue)"
                dot={{ r: 2.5, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 4.5, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
              />
              <Area
                type="monotone"
                dataKey="expense"
                stroke="#EF4444"
                strokeWidth={2}
                strokeDasharray="5 3"
                fill="url(#fillExpense)"
                dot={{ r: 2, fill: '#EF4444', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 4, fill: '#EF4444', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ChartContainer>
        </div>

        {/* ── Divider ── */}
        <div className="h-px bg-slate-100 mx-5" />

        {/* ── Expense Breakdown (Donut + Dynamic Legend) ── */}
        <div className="p-5 pt-4 flex-1 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
              Expense Breakdown
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedCategory(null);
                setIsDetailsModalOpen(true);
              }}
              className="h-6 text-[10px] font-extrabold text-[#E8450F] hover:text-[#C7380A] hover:bg-orange-50 px-2 gap-1 rounded-md"
            >
              View Items <Maximize2 className="w-2.5 h-2.5" />
            </Button>
          </div>

          <div className="flex items-center gap-4">
            {/* Donut Chart */}
            <div className="relative w-[115px] h-[115px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={36}
                    outerRadius={52}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {donutData.map((d, i) => (
                      <Cell
                        key={i}
                        fill={d.color}
                        className="transition-all hover:opacity-80 cursor-pointer"
                        onClick={() => {
                          setSelectedCategory(d.name);
                          setIsDetailsModalOpen(true);
                        }}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '6px 10px',
                    }}
                    formatter={(v: any, name: any) => [`SAR ${Number(v || 0).toLocaleString()}`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Donut Center Label */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Total</span>
                <span className="text-[12px] font-extrabold text-slate-900 leading-tight">
                  {kpiStats.expK}
                </span>
              </div>
            </div>

            {/* Category Legend List */}
            <div className="flex-1 flex flex-col gap-2.5">
              {donutData.map((item) => (
                <div
                  key={item.name}
                  onClick={() => {
                    setSelectedCategory(item.name);
                    setIsDetailsModalOpen(true);
                  }}
                  className="group cursor-pointer rounded-md p-0.5 transition-colors hover:bg-slate-50"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                      <span className="text-[10px] font-bold text-slate-600 group-hover:text-slate-900 transition-colors">
                        {item.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-bold text-slate-400">{item.pct}%</span>
                      <span className="text-[10px] font-extrabold text-slate-900">{item.val}</span>
                    </div>
                  </div>
                  <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all group-hover:brightness-90"
                      style={{ width: `${item.pct}%`, background: item.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer Action Button */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> AI Cost Optimization Active
            </span>
            <Button
              onClick={() => navigate('/reports/revenue')}
              className="h-7 text-[10px] font-extrabold bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-3 gap-1 shadow-2xs active:scale-[0.98]"
            >
              Full Revenue Report <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* ── Detailed Expenses Modal ── */}
        <Dialog open={isDetailsModalOpen} onOpenChange={setIsDetailsModalOpen}>
          <DialogContent className="max-w-xl bg-white rounded-2xl p-0 overflow-hidden border border-slate-200">
            <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center">
                    <FileSpreadsheet className="w-4 h-4 text-[#E8450F]" />
                  </div>
                  <div>
                    <DialogTitle className="text-base font-extrabold text-slate-900">
                      {selectedCategory ? `${selectedCategory} Expenses` : 'Operational Expense Ledger'}
                    </DialogTitle>
                    <DialogDescription className="text-xs font-semibold text-slate-500">
                      Itemized operational cost entries for {chartPeriod} period
                    </DialogDescription>
                  </div>
                </div>
                {selectedCategory && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedCategory(null)}
                    className="h-7 text-[10px] font-extrabold text-slate-600 border-slate-200"
                  >
                    Clear Filter
                  </Button>
                )}
              </div>
            </DialogHeader>

            {/* Modal Body: Expense Table */}
            <div className="p-6 max-h-[380px] overflow-y-auto">
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                {filteredExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="p-3.5 flex items-center justify-between bg-white hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 font-extrabold text-[10px]">
                        {expense.category.substring(0, 3).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900">{expense.description}</p>
                          <Badge variant="outline" className="text-[9px] font-extrabold py-0 h-4 bg-slate-50 text-slate-600">
                            {expense.id}
                          </Badge>
                        </div>
                        <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                          {expense.date} • Category: <span className="text-slate-700">{expense.category}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-extrabold text-slate-900">
                        SAR {expense.amount.toLocaleString()}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-600">
                        <CheckCircle2 className="w-2.5 h-2.5" /> {expense.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <div className="text-xs font-semibold text-slate-500">
                Total Listed: <span className="font-extrabold text-slate-900">
                  SAR {filteredExpenses.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}
                </span>
              </div>
              <Button
                onClick={() => {
                  setIsDetailsModalOpen(false);
                  navigate('/reports/revenue');
                }}
                className="h-8 text-xs font-extrabold bg-[#E8450F] hover:bg-[#C7380A] text-white px-4 rounded-lg"
              >
                Go to Revenue Reports
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
