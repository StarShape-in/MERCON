import {
  Gauge,
  Fuel,
  Timer,
  Activity,
  ChevronRight,
  TrendingUp,
  Zap,
  Leaf,
  CheckCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

export default function SahalFleetEfficiency() {
  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-b from-white via-slate-50/50 to-white dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-60 h-60 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-400 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Gauge size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Fleet Telemetry Engine
                </h2>
                <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-bold text-[10px] px-2 py-0.5">
                  92.4% Score
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Eco-routing, fuel consumption & dock turnaround
              </p>
            </div>
          </div>

          <Link
            to="/reports/fleet"
            className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0"
          >
            Insights <ChevronRight size={14} />
          </Link>
        </div>

        {/* Dual Cockpit Instrument Gauges */}
        <div className="grid grid-cols-2 gap-3 my-4">
          {/* Utilization Dial */}
          <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Fleet Utilization
              </span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                88.5%
              </p>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                ↑ +3.2% vs target
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-xs border border-blue-500/20">
              <Activity size={18} />
            </div>
          </div>

          {/* Fuel Efficiency Dial */}
          <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Eco Fuel Burn
              </span>
              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-0.5">
                3.4 <span className="text-xs font-semibold text-slate-400">km/L</span>
              </p>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                SAR 0.48 / km
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-xs border border-emerald-500/20">
              <Leaf size={18} />
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Status Allocation */}
      <div className="space-y-3 relative z-10">
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
            <span className="text-slate-800 dark:text-slate-200">
              Fleet Motion Distribution (32 Trucks)
            </span>
            <span className="font-mono text-emerald-600 dark:text-emerald-400 text-[11px]">
              26 In Motion
            </span>
          </div>

          {/* Segmented Progress Bar */}
          <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex gap-1 p-0.5">
            <div
              className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all"
              style={{ width: '81%' }}
              title="26 In Transit (81%)"
            />
            <div
              className="bg-blue-500 h-full rounded-full transition-all"
              style={{ width: '13%' }}
              title="4 Loading (13%)"
            />
            <div
              className="bg-amber-400 h-full rounded-full transition-all"
              style={{ width: '6%' }}
              title="2 In Depot (6%)"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>26 En Route</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span>4 Loading</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>2 Service</span>
            </div>
          </div>
        </div>

        {/* Turnaround speed banner */}
        <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-500/20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-xs">
              <Timer size={16} />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-white">
                38 min Yard Turnaround
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                -12m dock dwell reduction across Western Province hubs
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-500 text-white text-[10px] font-black">
            OPTIMAL
          </Badge>
        </div>
      </div>
    </div>
  );
}
