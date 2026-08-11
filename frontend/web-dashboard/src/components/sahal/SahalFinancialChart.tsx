import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Mock high-resolution financial timeseries for Sahal Dashboard
const MOCK_FINANCIAL_DATA_7D = [
  { time: 'Mon', revenue: 42000, expense: 26000, profit: 16000, margin: 38.1 },
  { time: 'Tue', revenue: 58000, expense: 33000, profit: 25000, margin: 43.1 },
  { time: 'Wed', revenue: 51000, expense: 29000, profit: 22000, margin: 43.1 },
  { time: 'Thu', revenue: 67000, expense: 38000, profit: 29000, margin: 43.3 },
  { time: 'Fri', revenue: 84000, expense: 46000, profit: 38000, margin: 45.2 },
  { time: 'Sat', revenue: 92000, expense: 51000, profit: 41000, margin: 44.6 },
  { time: 'Sun', revenue: 78000, expense: 42000, profit: 36000, margin: 46.2 },
];

const MOCK_FINANCIAL_DATA_30D = [
  { time: 'Week 1', revenue: 260000, expense: 155000, profit: 105000, margin: 40.4 },
  { time: 'Week 2', revenue: 310000, expense: 178000, profit: 132000, margin: 42.6 },
  { time: 'Week 3', revenue: 345000, expense: 192000, profit: 153000, margin: 44.3 },
  { time: 'Week 4', revenue: 390000, expense: 215000, profit: 175000, margin: 44.9 },
];

const MOCK_FINANCIAL_DATA_6M = [
  { time: 'Mar', revenue: 1120000, expense: 670000, profit: 450000, margin: 40.2 },
  { time: 'Apr', revenue: 1280000, expense: 740000, profit: 540000, margin: 42.2 },
  { time: 'May', revenue: 1350000, expense: 780000, profit: 570000, margin: 42.2 },
  { time: 'Jun', revenue: 1490000, expense: 830000, profit: 660000, margin: 44.3 },
  { time: 'Jul', revenue: 1620000, expense: 890000, profit: 730000, margin: 45.1 },
  { time: 'Aug', revenue: 1780000, expense: 950000, profit: 830000, margin: 46.6 },
];

interface SahalFinancialChartProps {
  timeframe?: '7d' | '30d' | '6m';
}

export default function SahalFinancialChart({ timeframe = '7d' }: SahalFinancialChartProps) {
  const [selectedRange, setSelectedRange] = useState<'7d' | '30d' | '6m'>(timeframe);
  const [activeSeries, setActiveSeries] = useState<{
    revenue: boolean;
    expense: boolean;
    profit: boolean;
  }>({
    revenue: true,
    expense: true,
    profit: true,
  });

  const chartData = useMemo(() => {
    switch (selectedRange) {
      case '30d':
        return MOCK_FINANCIAL_DATA_30D;
      case '6m':
        return MOCK_FINANCIAL_DATA_6M;
      case '7d':
      default:
        return MOCK_FINANCIAL_DATA_7D;
    }
  }, [selectedRange]);

  const totals = useMemo(() => {
    const totalRev = chartData.reduce((acc, curr) => acc + curr.revenue, 0);
    const totalExp = chartData.reduce((acc, curr) => acc + curr.expense, 0);
    const totalProf = totalRev - totalExp;
    const avgMargin = totalRev > 0 ? (totalProf / totalRev) * 100 : 0;
    return {
      revenue: totalRev,
      expense: totalExp,
      profit: totalProf,
      margin: avgMargin.toFixed(1),
    };
  }, [chartData]);

  const formatSAR = (value: number) => {
    if (value >= 1_000_000) return `SAR ${(value / 1_000_000).toFixed(2)}M`;
    if (value >= 1_000) return `SAR ${(value / 1_000).toFixed(0)}k`;
    return `SAR ${value}`;
  };

  return (
    <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm rounded-2xl overflow-hidden backdrop-blur-sm">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/15 to-emerald-500/15 dark:from-indigo-500/25 dark:to-emerald-500/25 flex items-center justify-center border border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <TrendingUp size={18} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Financial Analytics
                </CardTitle>
                <Badge variant="outline" className="text-[10px] uppercase tracking-wider font-bold bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                  P&L Metrics
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Revenue, operating expenses & net profit margins
              </p>
            </div>
          </div>

          {/* Time range pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700/60 text-xs">
            <button
              onClick={() => setSelectedRange('7d')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                selectedRange === '7d'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setSelectedRange('30d')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                selectedRange === '30d'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              30 Days
            </button>
            <button
              onClick={() => setSelectedRange('6m')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                selectedRange === '6m'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              6 Months
            </button>
          </div>
        </div>

        {/* 3 Metric Pills with toggles */}
        <div className="grid grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {/* Revenue Pill */}
          <div
            onClick={() => setActiveSeries(prev => ({ ...prev, revenue: !prev.revenue }))}
            className={`cursor-pointer select-none p-2.5 rounded-xl border transition-all ${
              activeSeries.revenue
                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60 ring-1 ring-emerald-500/20'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Revenue
              </span>
              <ArrowUpRight size={14} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-1">
              {formatSAR(totals.revenue)}
            </p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              +14.8% vs prior period
            </span>
          </div>

          {/* Expense Pill */}
          <div
            onClick={() => setActiveSeries(prev => ({ ...prev, expense: !prev.expense }))}
            className={`cursor-pointer select-none p-2.5 rounded-xl border transition-all ${
              activeSeries.expense
                ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60 ring-1 ring-rose-500/20'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                Expenses
              </span>
              <ArrowDownRight size={14} className="text-rose-600 dark:text-rose-400" />
            </div>
            <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-1">
              {formatSAR(totals.expense)}
            </p>
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-medium">
              56.2% fuel & tolls
            </span>
          </div>

          {/* Net Profit Pill */}
          <div
            onClick={() => setActiveSeries(prev => ({ ...prev, profit: !prev.profit }))}
            className={`cursor-pointer select-none p-2.5 rounded-xl border transition-all ${
              activeSeries.profit
                ? 'bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/60 ring-1 ring-indigo-500/20'
                : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                Net Profit
              </span>
              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-indigo-100 text-indigo-800 border-none font-bold">
                {totals.margin}% margin
              </Badge>
            </div>
            <p className="text-sm sm:text-base font-bold text-indigo-950 dark:text-indigo-200 mt-1">
              {formatSAR(totals.profit)}
            </p>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
              +18.4% Net Yield
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 pb-2 px-2 sm:px-4">
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {/* Revenue Gradient */}
                <linearGradient id="sahalRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                </linearGradient>
                {/* Expense Gradient */}
                <linearGradient id="sahalExpGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F43F5E" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#F43F5E" stopOpacity={0.0} />
                </linearGradient>
                {/* Net Profit Gradient */}
                <linearGradient id="sahalProfGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200/70 dark:text-slate-800" />
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'currentColor', fontSize: 11 }}
                className="text-slate-500 dark:text-slate-400 font-medium"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={val => (val >= 1000 ? `${val / 1000}k` : val)}
                tick={{ fill: 'currentColor', fontSize: 11 }}
                className="text-slate-500 dark:text-slate-400 font-medium"
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-slate-900/95 text-white p-3 rounded-xl shadow-xl border border-slate-700/80 backdrop-blur-md text-xs min-w-[170px]">
                      <p className="font-bold text-slate-300 pb-1.5 border-b border-slate-700 mb-2 flex items-center justify-between">
                        <span>{label}</span>
                        <span className="text-[10px] text-emerald-400">Verified</span>
                      </p>
                      {payload.map((entry: any) => (
                        <div key={entry.dataKey} className="flex items-center justify-between py-0.5">
                          <span className="flex items-center gap-1.5 text-slate-300 capitalize">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                            {entry.name}:
                          </span>
                          <span className="font-semibold text-white">
                            SAR {entry.value?.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />

              {activeSeries.revenue && (
                <Area
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#sahalRevGrad)"
                />
              )}
              {activeSeries.expense && (
                <Area
                  type="monotone"
                  dataKey="expense"
                  name="Expenses"
                  stroke="#F43F5E"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#sahalExpGrad)"
                />
              )}
              {activeSeries.profit && (
                <Area
                  type="monotone"
                  dataKey="profit"
                  name="Net Profit"
                  stroke="#6366F1"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#sahalProfGrad)"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
