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
  DollarSign,
  PieChart,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const MOCK_FINANCIAL_DATA_7D = [
  { time: 'Mon', revenue: 48000, expense: 29000, profit: 19000 },
  { time: 'Tue', revenue: 62000, expense: 35000, profit: 27000 },
  { time: 'Wed', revenue: 54000, expense: 31000, profit: 23000 },
  { time: 'Thu', revenue: 73000, expense: 41000, profit: 32000 },
  { time: 'Fri', revenue: 89000, expense: 48000, profit: 41000 },
  { time: 'Sat', revenue: 98000, expense: 53000, profit: 45000 },
  { time: 'Sun', revenue: 82000, expense: 44000, profit: 38000 },
];

const MOCK_FINANCIAL_DATA_30D = [
  { time: 'W1', revenue: 290000, expense: 165000, profit: 125000 },
  { time: 'W2', revenue: 340000, expense: 190000, profit: 150000 },
  { time: 'W3', revenue: 380000, expense: 205000, profit: 175000 },
  { time: 'W4', revenue: 430000, expense: 230000, profit: 200000 },
];

const MOCK_FINANCIAL_DATA_6M = [
  { time: 'Mar', revenue: 1180000, expense: 690000, profit: 490000 },
  { time: 'Apr', revenue: 1320000, expense: 760000, profit: 560000 },
  { time: 'May', revenue: 1420000, expense: 810000, profit: 610000 },
  { time: 'Jun', revenue: 1560000, expense: 870000, profit: 690000 },
  { time: 'Jul', revenue: 1690000, expense: 920000, profit: 770000 },
  { time: 'Aug', revenue: 1850000, expense: 980000, profit: 870000 },
];

export default function SahalFinancialChart() {
  const [selectedRange, setSelectedRange] = useState<'7d' | '30d' | '6m'>('7d');
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
    <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-b from-white via-slate-50/50 to-white dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 p-5 shadow-sm relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-60 h-60 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
            <TrendingUp size={20} className="stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                Financial Cockpit
              </h2>
              <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold text-[10px] px-2 py-0.5">
                {totals.margin}% Net Margin
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              High-yield P&L breakdown & revenue curves
            </p>
          </div>
        </div>

        {/* Time switch */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl border border-slate-200/70 dark:border-slate-700/60 text-xs font-semibold">
          {(['7d', '30d', '6m'] as const).map(range => (
            <button
              key={range}
              onClick={() => setSelectedRange(range)}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                selectedRange === range
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '6 Months'}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive Metric Cards Strip */}
      <div className="grid grid-cols-3 gap-3 my-4 relative z-10">
        {/* Revenue */}
        <div
          onClick={() => setActiveSeries(p => ({ ...p, revenue: !p.revenue }))}
          className={`p-3 rounded-2xl border transition-all cursor-pointer select-none ${
            activeSeries.revenue
              ? 'bg-emerald-500/10 border-emerald-500/30 dark:bg-emerald-950/30 dark:border-emerald-500/30 ring-1 ring-emerald-500/20 shadow-xs'
              : 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Revenue
            </span>
            <ArrowUpRight size={14} />
          </div>
          <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
            {formatSAR(totals.revenue)}
          </p>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
            +16.4% YoY
          </span>
        </div>

        {/* Expenses */}
        <div
          onClick={() => setActiveSeries(p => ({ ...p, expense: !p.expense }))}
          className={`p-3 rounded-2xl border transition-all cursor-pointer select-none ${
            activeSeries.expense
              ? 'bg-rose-500/10 border-rose-500/30 dark:bg-rose-950/30 dark:border-rose-500/30 ring-1 ring-rose-500/20 shadow-xs'
              : 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-rose-600 dark:text-rose-400">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Expenses
            </span>
            <ArrowDownRight size={14} />
          </div>
          <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
            {formatSAR(totals.expense)}
          </p>
          <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold">
            Fuel & Tolls (54%)
          </span>
        </div>

        {/* Net Profit */}
        <div
          onClick={() => setActiveSeries(p => ({ ...p, profit: !p.profit }))}
          className={`p-3 rounded-2xl border transition-all cursor-pointer select-none ${
            activeSeries.profit
              ? 'bg-indigo-500/10 border-indigo-500/30 dark:bg-indigo-950/30 dark:border-indigo-500/30 ring-1 ring-indigo-500/20 shadow-xs'
              : 'bg-slate-100/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 opacity-60'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
            <span className="flex items-center gap-1.5 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-indigo-500" /> Net Profit
            </span>
            <Sparkles size={13} />
          </div>
          <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
            {formatSAR(totals.profit)}
          </p>
          <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-semibold">
            {totals.margin}% yield
          </span>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[220px] w-full relative z-10">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="sahalRevGradV2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="sahalExpGradV2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F43F5E" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#F43F5E" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="sahalProfGradV2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366F1" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#6366F1" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200/60 dark:text-slate-800" />
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'currentColor', fontSize: 11 }}
              className="text-slate-400 font-semibold"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={val => (val >= 1000 ? `${val / 1000}k` : val)}
              tick={{ fill: 'currentColor', fontSize: 11 }}
              className="text-slate-400 font-semibold"
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="bg-slate-950/95 text-white p-3 rounded-2xl shadow-2xl border border-slate-700/80 backdrop-blur-xl text-xs min-w-[170px]">
                    <p className="font-bold text-slate-300 pb-1.5 border-b border-slate-800 mb-2 flex items-center justify-between">
                      <span>{label}</span>
                      <span className="text-[10px] text-emerald-400 font-mono">SAHAL AUDITED</span>
                    </p>
                    {payload.map((entry: any) => (
                      <div key={entry.dataKey} className="flex items-center justify-between py-0.5">
                        <span className="flex items-center gap-1.5 text-slate-300 capitalize">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                          {entry.name}:
                        </span>
                        <span className="font-bold text-white font-mono">
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
                fill="url(#sahalRevGradV2)"
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
                fill="url(#sahalExpGradV2)"
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
                fill="url(#sahalProfGradV2)"
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Expense Allocation Mini Bar */}
      <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span className="font-semibold text-slate-700 dark:text-slate-300">Cost Structure:</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Fuel 44%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Driver/Labor 28%
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Tolls & Maint 28%
          </span>
        </div>
      </div>
    </div>
  );
}
