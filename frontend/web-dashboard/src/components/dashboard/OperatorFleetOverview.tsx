import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  Plus,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface OperatorFleetOverviewProps {
  trips: any[];
}

export default function OperatorFleetOverview({ trips }: OperatorFleetOverviewProps) {
  const navigate = useNavigate();

  const metrics = useMemo(() => {
    let inTransit = 0;
    let toPickup = 0;
    let atPickup = 0;
    let toDelivery = 0;
    let scheduled = 0;
    let completedToday = 0;

    trips.forEach((t) => {
      const status = t.status;
      if (status === 'In Transit' || status === 'InTransit') inTransit++;
      else if (status === 'To Pickup' || status === 'Dispatched') toPickup++;
      else if (status === 'At Pickup' || status === 'AtPickup') atPickup++;
      else if (status === 'To Delivery' || status === 'AtDelivery') toDelivery++;
      else if (status === 'Scheduled' || status === 'Draft') scheduled++;
      else if (status === 'Completed') completedToday++;
    });

    const activeTotal = inTransit + toPickup + atPickup + toDelivery;
    const totalDispatches = activeTotal + scheduled + completedToday;

    return {
      inTransit,
      toPickup,
      atPickup,
      toDelivery,
      scheduled,
      completedToday,
      activeTotal,
      totalDispatches: totalDispatches || 1,
    };
  }, [trips]);

  const stages = [
    { label: 'In Transit', count: metrics.inTransit, color: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-900/60' },
    { label: 'To Pickup', count: metrics.toPickup, color: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/40', border: 'border-orange-200 dark:border-orange-900/60' },
    { label: 'At Pickup', count: metrics.atPickup, color: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-900/60' },
    { label: 'To Delivery', count: metrics.toDelivery, color: 'bg-purple-500', text: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-200 dark:border-purple-900/60' },
    { label: 'Scheduled', count: metrics.scheduled, color: 'bg-indigo-500', text: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40', border: 'border-indigo-200 dark:border-indigo-900/60' },
  ];

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[18px] border border-black/[0.06] dark:border-slate-800 shadow-sm p-4 flex flex-col justify-between h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-black/[0.04] dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/60 flex items-center justify-center text-brand">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              Operations Control
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">Live Fleet &amp; Dispatch Dispatcher</p>
          </div>
        </div>

        <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 text-[10px] font-extrabold uppercase px-2 py-0.5 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live Fleet
        </Badge>
      </div>

      {/* Main KPI Highlight: Active Transit Units */}
      <div className="py-2.5 space-y-2">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Active Transit Units
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                {metrics.activeTotal}
              </span>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-0.5" /> On Duty
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Scheduled
            </span>
            <div className="text-sm font-bold text-slate-700 dark:text-slate-300 font-mono mt-0.5">
              {metrics.scheduled} trips
            </div>
          </div>
        </div>

        {/* Multi-segment Progress Bar */}
        <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
          {stages.map((st) => {
            const pct = (st.count / metrics.totalDispatches) * 100;
            if (pct <= 0) return null;
            return (
              <div
                key={st.label}
                style={{ width: `${Math.max(pct, 8)}%` }}
                className={cn('h-full transition-all duration-500', st.color)}
                title={`${st.label}: ${st.count}`}
              />
            );
          })}
        </div>
      </div>

      {/* Stage Grid Pills */}
      <div className="grid grid-cols-2 gap-1.5 py-1">
        {stages.slice(0, 4).map((st) => (
          <div
            key={st.label}
            className={cn(
              'px-2.5 py-1.5 rounded-xl border flex items-center justify-between text-xs',
              st.bg,
              st.border
            )}
          >
            <div className="flex items-center gap-1.5 truncate">
              <div className={cn('w-2 h-2 rounded-full shrink-0', st.color)} />
              <span className="text-[11px] font-bold truncate text-slate-700 dark:text-slate-300">
                {st.label}
              </span>
            </div>
            <span className={cn('text-xs font-black font-mono shrink-0 ml-1', st.text)}>
              {st.count}
            </span>
          </div>
        ))}
      </div>

      {/* Footer Quick Action Buttons */}
      <div className="pt-2 border-t border-black/[0.04] dark:border-slate-800 flex items-center gap-2">
        <Button
          onClick={() => navigate('/trips/new')}
          className="flex-1 h-8 bg-brand hover:bg-brand-hover text-white text-xs font-extrabold rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 mr-1 stroke-[2.5]" />
          New Trip
        </Button>

        <Button
          variant="outline"
          onClick={() => navigate('/trips')}
          className="h-8 px-2.5 border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
        >
          <span>All Trips</span>
          <ArrowRight className="w-3 h-3 ml-1" />
        </Button>
      </div>
    </div>
  );
}
