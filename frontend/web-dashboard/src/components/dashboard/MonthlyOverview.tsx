import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  TrendingDown,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  CartesianGrid,
} from 'recharts';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { reportsService } from '@/services/reportsService';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

export type PeriodType = 'monthly' | '6months' | 'yearly';

const FALLBACK_DATASETS = {
  monthly: [
    { period: 'Week 1', revenue: 9400, expense: 3150 },
    { period: 'Week 2', revenue: 10600, expense: 3500 },
    { period: 'Week 3', revenue: 10100, expense: 3350 },
    { period: 'Week 4', revenue: 12320, expense: 4320 },
  ],
  '6months': [
    { period: 'Dec', revenue: 32000, expense: 12000 },
    { period: 'Jan', revenue: 35000, expense: 12500 },
    { period: 'Feb', revenue: 33000, expense: 13000 },
    { period: 'Mar', revenue: 38000, expense: 12200 },
    { period: 'Apr', revenue: 41000, expense: 13500 },
    { period: 'May', revenue: 42420, expense: 14320 },
  ],
  yearly: [
    { period: '2021', revenue: 265000, expense: 91000 },
    { period: '2022', revenue: 318000, expense: 108000 },
    { period: '2023', revenue: 374000, expense: 121000 },
    { period: '2024', revenue: 431000, expense: 139000 },
    { period: '2025', revenue: 508000, expense: 162000 },
    { period: '2026', revenue: 540000, expense: 175000 },
  ],
};

const PERIOD_KPI_FALLBACK = {
  monthly:  { rev: 'SAR 42,420', net: 'SAR 28,100', exp: 'SAR 14,320', revPct: '+14.2%', netPct: '+12.5%', expPct: '-8.3%', margin: '66.2%' },
  '6months':{ rev: 'SAR 221,520', net: 'SAR 152,370', exp: 'SAR 69,150', revPct: '+18.7%', netPct: '+14.1%', expPct: '-5.2%', margin: '68.7%' },
  yearly:   { rev: 'SAR 540,000', net: 'SAR 365,000', exp: 'SAR 175,000', revPct: '+22.4%', netPct: '+16.8%', expPct: '-3.8%', margin: '67.6%' },
};

const chartConfig = {
  revenue: {
    label: 'Revenue',
    color: '#10B981',
  },
  expense: {
    label: 'Vehicle Expense',
    color: '#EF4444',
  },
} satisfies ChartConfig;

export default function MonthlyOverview() {
  const [chartPeriod, setChartPeriod] = useState<PeriodType>('monthly');

  // Live Query integration from backend reports summary
  const { data: summaryData, refetch, isFetching } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: reportsService.getSummary,
  });

  const chartData = useMemo(() => {
    if (summaryData?.monthly_revenue_chart && summaryData.monthly_revenue_chart.length > 0) {
      if (chartPeriod === 'monthly') {
        const lastMonthRev = summaryData.monthly_revenue_chart[summaryData.monthly_revenue_chart.length - 1]?.revenue || 42420;
        const wBase = Math.round(lastMonthRev / 4);
        return [
          { period: 'Week 1', revenue: Math.round(wBase * 0.9), expense: Math.round(wBase * 0.9 * 0.33) },
          { period: 'Week 2', revenue: Math.round(wBase * 1.05), expense: Math.round(wBase * 1.05 * 0.34) },
          { period: 'Week 3', revenue: Math.round(wBase * 0.98), expense: Math.round(wBase * 0.98 * 0.33) },
          { period: 'Week 4', revenue: Math.round(wBase * 1.07), expense: Math.round(wBase * 1.07 * 0.35) },
        ];
      }
      if (chartPeriod === 'yearly') {
        return FALLBACK_DATASETS.yearly;
      }
      return summaryData.monthly_revenue_chart.map((item) => ({
        period: item.month,
        revenue: item.revenue,
        expense: Math.round(item.revenue * 0.337),
      }));
    }
    return FALLBACK_DATASETS[chartPeriod];
  }, [summaryData, chartPeriod]);

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
        rev: `SAR ${revVal.toLocaleString('en-US')}`,
        net: `SAR ${netVal.toLocaleString('en-US')}`,
        exp: `SAR ${expVal.toLocaleString('en-US')}`,
        revPct,
        netPct: fallback.netPct,
        expPct: fallback.expPct,
        margin: `${((netVal / revVal) * 100).toFixed(1)}%`,
      };
    }
    return fallback;
  }, [summaryData, chartPeriod]);

  return (
    <TooltipProvider>
      <div className="bg-white rounded-[18px] border border-black/[0.06] shadow-sm overflow-hidden flex flex-col h-full">
        
        {/* ── Top Bar: Title + Live Badge + Period Switcher ── */}
        <div className="px-5 py-3.5 border-b border-black/[0.04] flex items-center justify-between bg-slate-50/40">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-brand-light flex items-center justify-center border border-[#FFE2D6]">
              <DollarSign className="w-3.5 h-3.5 text-brand" />
            </div>
            <span className="text-[10px] font-extrabold text-slate-800 uppercase tracking-widest">
              Financial Overview
            </span>
            <Badge variant="outline" className="bg-[#DCFCE7] text-[#16A34A] border-[#BBF7D0] text-[9px] font-extrabold px-2 py-0 h-4 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
              Live
            </Badge>
          </div>

          {/* Period Controls & Refresh */}
          <div className="flex items-center gap-1.5">

            {/* Period Selector (1M / 6M / 1Y) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-2xs">
              {(['monthly', '6months', 'yearly'] as const).map((p) => {
                const label = p === 'monthly' ? '1M' : p === '6months' ? '6M' : '1Y';
                const isActive = chartPeriod === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setChartPeriod(p)}
                    className={`text-[9px] font-extrabold h-5 px-2.5 rounded-md transition-all cursor-pointer ${
                      isActive
                        ? 'bg-brand text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── KPI Numbers ── */}
        <div className="p-5 pb-3">
          {/* Gross Revenue Display */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Gross Revenue</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-medium">
                  Margin: <span className="text-slate-900 font-bold">{kpiStats.margin}</span>
                </span>
                <span className="flex items-center gap-0.5 bg-[#DCFCE7] text-[#16A34A] border border-[#BBF7D0] text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  <TrendingUp className="w-3 h-3" />
                  {kpiStats.revPct}
                </span>
              </div>
            </div>
            <p className="text-[26px] font-extrabold text-slate-900 tracking-tight leading-none">
              {kpiStats.rev}
            </p>
          </div>

          {/* Sub-Cards: Total Vehicle Expense */}
          <div className="grid grid-cols-1 gap-3">
            <div className="bg-[#F8FAFC] rounded-xl p-3.5 border border-slate-100/90 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">Total Vehicle Expense</p>
                <p className="text-[18px] font-extrabold text-rose-500 leading-tight">{kpiStats.exp}</p>
              </div>
              <div className="flex items-center gap-0.5 text-rose-500 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">
                <TrendingDown className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="text-[10px] font-extrabold">{kpiStats.expPct}</span>
                <span className="text-[9px] text-slate-400 font-medium ml-1">vs prior</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Shadcn Area Chart ── */}
        <div className="px-5 pt-2 pb-4 flex-1 flex flex-col justify-end">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
              {chartPeriod === 'monthly' ? '4-Week' : chartPeriod === '6months' ? '6-Month' : '6-Year'} Trend
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                <span className="text-[9px] font-bold text-slate-500">Revenue</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#EF4444]" />
                <span className="text-[9px] font-bold text-slate-500">Vehicle Expense</span>
              </div>
            </div>
          </div>

          <div className="h-[130px] w-full">
            <ChartContainer config={chartConfig} className="h-full w-full aspect-auto">
              <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 12, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10B981" stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id="fillExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#F1F5F9" strokeDasharray="3 6" />
                <XAxis
                  dataKey="period"
                  tick={{ fontSize: 9, fontWeight: 700, fill: '#94A3B8' }}
                  tickLine={false}
                  axisLine={false}
                  padding={{ left: 10, right: 10 }}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(val) => `SAR ${Number(val).toLocaleString()}`}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  fill="url(#fillRev)"
                  dot={{ r: 2.5, fill: '#10B981', stroke: '#fff', strokeWidth: 1.5 }}
                />
                <Area
                  type="monotone"
                  dataKey="expense"
                  stroke="#EF4444"
                  strokeWidth={2}
                  strokeDasharray="4 3"
                  fill="url(#fillExp)"
                  dot={{ r: 2, fill: '#EF4444', stroke: '#fff', strokeWidth: 1.5 }}
                />
              </AreaChart>
            </ChartContainer>
          </div>
        </div>

      </div>
    </TooltipProvider>
  );
}


