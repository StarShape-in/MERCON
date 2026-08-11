import {
  Gauge,
  Fuel,
  Timer,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

export default function SahalFleetEfficiency() {

  return (
    <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm rounded-2xl overflow-hidden backdrop-blur-sm flex flex-col">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500/15 to-cyan-500/15 dark:from-blue-500/25 dark:to-cyan-500/25 flex items-center justify-center border border-blue-500/20 text-blue-600 dark:text-blue-400">
              <Gauge size={18} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Fleet Efficiency
                </CardTitle>
                <Badge variant="outline" className="text-[10px] uppercase font-bold bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800">
                  92.4% Optimal
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Utilization rate, fuel economy & turnaround velocity
              </p>
            </div>
          </div>

          <Link
            to="/reports/fleet"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0"
          >
            Telemetry <ChevronRight size={13} />
          </Link>
        </div>

        {/* 3 Metric Cards */}
        <div className="grid grid-cols-3 gap-2.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Utilization
              </span>
              <Activity size={13} className="text-blue-500" />
            </div>
            <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-1">
              88.5%
            </p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              ↑ +3.2% vs target
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Fuel Economy
              </span>
              <Fuel size={13} className="text-amber-500" />
            </div>
            <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-1">
              3.4 km/L
            </p>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              SAR 0.48/km cost
            </span>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Turnaround
              </span>
              <Timer size={13} className="text-indigo-500" />
            </div>
            <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mt-1">
              38 mins
            </p>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
              -12m yard dwell
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3.5 flex-1">
        {/* Fleet Allocation Breakdown */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Active Fleet Status Allocation (32 Vehicles)
            </span>
            <span className="font-mono text-slate-500 text-[11px]">28 / 32 In Service</span>
          </div>

          <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-slate-200/60 dark:border-slate-700/60">
            <div
              className="bg-emerald-500 h-full rounded-l-full transition-all"
              style={{ width: '82%' }}
              title="En Route (82%)"
            />
            <div
              className="bg-blue-500 h-full transition-all"
              style={{ width: '10%' }}
              title="Loading / Yard (10%)"
            />
            <div
              className="bg-amber-400 h-full rounded-r-full transition-all"
              style={{ width: '8%' }}
              title="Under Maintenance (8%)"
            />
          </div>

          <div className="grid grid-cols-3 gap-2 mt-2 text-[11px]">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">26</span> En Route
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">4</span> Loading
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">2</span> Maintenance
            </div>
          </div>
        </div>

        {/* Efficiency Highlights */}
        <div className="p-3 rounded-xl bg-gradient-to-r from-slate-50 to-indigo-50/30 dark:from-slate-800/40 dark:to-indigo-950/20 border border-slate-200/60 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
              98%
            </div>
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                On-Time Delivery SLA
              </p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                124 out of 127 trips completed within target SLA window
              </p>
            </div>
          </div>
          <Badge className="bg-emerald-500 text-white text-[10px] font-bold">
            Optimal
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
