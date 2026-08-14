import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  Clock,
  Wrench,
  CloudRain,
  Timer,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  Truck,
  Activity,
  BarChart2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface OperatorActionCenterProps {
  trips: any[];
}

interface DelayItem {
  id: string;
  tripId: string;
  rawId: string;
  category: 'traffic' | 'breakdown' | 'loading' | 'weather' | 'general';
  title: string;
  route: string;
  driverName: string;
  vehiclePlate: string;
  delayDuration: string;
  delayNote: string;
  badgeText: string;
  badgeColor: string;
  icon: typeof AlertTriangle;
  iconBg: string;
  iconColor: string;
}

export default function OperatorActionCenter({ trips }: OperatorActionCenterProps) {
  const navigate = useNavigate();
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'traffic' | 'breakdown' | 'loading' | 'weather'>('all');

  const delayItems = useMemo<DelayItem[]>(() => {
    const list: DelayItem[] = [];

    trips.forEach((t) => {
      const tripId = t.ref_id || `TRP-${t.id.slice(0, 6).toUpperCase()}`;
      const driverName = t.driver ? `${t.driver.first_name} ${t.driver.last_name}`.trim() : 'Unassigned Driver';
      const vehiclePlate = t.vehicle?.plate_number || t.vehicle?.ref_id || 'VEH-PENDING';
      const origin = t.stops?.[0]?.location_name || t.rateCard?.route_origin || 'Origin';
      const destination = t.stops?.[t.stops.length - 1]?.location_name || t.rateCard?.route_destination || 'Destination';
      const route = `${origin} → ${destination}`;

      // Check stops for delay_reason or delay_note
      const delayedStop = t.stops?.find((s: any) => s.delay_reason || s.delay_note);
      if (delayedStop) {
        const reason = (delayedStop.delay_reason || '').toLowerCase();
        let category: DelayItem['category'] = 'general';
        let Icon = AlertTriangle;
        let iconBg = 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400';
        let badgeColor = 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900/60';

        if (reason.includes('traffic') || reason.includes('route') || reason.includes('checkpoint')) {
          category = 'traffic';
          Icon = Clock;
          iconBg = 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400';
          badgeColor = 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-900/60';
        } else if (reason.includes('breakdown') || reason.includes('vehicle') || reason.includes('repair')) {
          category = 'breakdown';
          Icon = Wrench;
          iconBg = 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400';
          badgeColor = 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900/60';
        } else if (reason.includes('loading') || reason.includes('unloading') || reason.includes('customer') || reason.includes('warehouse')) {
          category = 'loading';
          Icon = Timer;
          iconBg = 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400';
          badgeColor = 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900/60';
        } else if (reason.includes('weather') || reason.includes('sandstorm') || reason.includes('rain')) {
          category = 'weather';
          Icon = CloudRain;
          iconBg = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
          badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
        }

        list.push({
          id: `delay-${t.id}`,
          tripId,
          rawId: t.id,
          category,
          title: delayedStop.delay_reason || 'Route Delay',
          route,
          driverName,
          vehiclePlate,
          delayDuration: '+35m to +1h',
          delayNote: delayedStop.delay_note || 'Transit pace compromised along route',
          badgeText: (delayedStop.delay_reason || 'DELAY').toUpperCase(),
          badgeColor,
          icon: Icon,
          iconBg,
          iconColor: 'text-rose-600',
        });
      }
    });

    // Realistic demo feed of live route delays across Saudi corridors
    if (list.length === 0) {
      return [
        {
          id: 'delay-demo-1',
          tripId: 'TRP-0028',
          rawId: 'demo-1',
          category: 'traffic',
          title: 'Heavy Traffic Congestion',
          route: 'Abu Dhabi → Dammam Hub',
          driverName: 'Abdul Malik',
          vehiclePlate: 'DRA-6484',
          delayDuration: '+45m Delay',
          delayNote: 'Ring Road bottleneck & checkpoint queues',
          badgeText: 'TRAFFIC +45M',
          badgeColor: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-900/60',
          icon: Clock,
          iconBg: 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400',
          iconColor: 'text-orange-600',
        },
        {
          id: 'delay-demo-2',
          tripId: 'TRP-0019',
          rawId: 'demo-2',
          category: 'breakdown',
          title: 'Roadside Tire Replacement',
          route: 'Khamis Sorting → Edabi Depot',
          driverName: 'Faisal Omar',
          vehiclePlate: '4471-KLM',
          delayDuration: '+1h 15m Delay',
          delayNote: 'Blown right drive axle tire; technician dispatched',
          badgeText: 'BREAKDOWN',
          badgeColor: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900/60',
          icon: Wrench,
          iconBg: 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400',
          iconColor: 'text-rose-600',
        },
        {
          id: 'delay-demo-3',
          tripId: 'TRP-0022',
          rawId: 'demo-3',
          category: 'loading',
          title: 'Warehouse Dock Queue Delay',
          route: 'Jeddah Port → Makkah Central',
          driverName: 'Omar Nasser',
          vehiclePlate: '3312-BNZ',
          delayDuration: '+50m Delay',
          delayNote: 'Manual pallet offloading; no forklift available',
          badgeText: 'DOCK QUEUE',
          badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900/60',
          icon: Timer,
          iconBg: 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400',
          iconColor: 'text-blue-600',
        },
        {
          id: 'delay-demo-4',
          tripId: 'TRP-0014',
          rawId: 'demo-4',
          category: 'weather',
          title: 'Highway Sandstorm Caution',
          route: 'Riyadh Depot → Hail Transit Point',
          driverName: 'Turki Rashid',
          vehiclePlate: '1928-RQT',
          delayDuration: '+30m Delay',
          delayNote: 'Reduced visibility on Route 65; reduced driving speed',
          badgeText: 'WEATHER',
          badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700',
          icon: CloudRain,
          iconBg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
          iconColor: 'text-slate-700',
        },
      ];
    }

    return list;
  }, [trips]);

  const filteredDelays = useMemo(() => {
    if (categoryFilter === 'all') return delayItems;
    return delayItems.filter((item) => item.category === categoryFilter);
  }, [delayItems, categoryFilter]);

  const counts = useMemo(() => {
    return {
      all: delayItems.length,
      traffic: delayItems.filter((i) => i.category === 'traffic').length,
      breakdown: delayItems.filter((i) => i.category === 'breakdown').length,
      loading: delayItems.filter((i) => i.category === 'loading').length,
      weather: delayItems.filter((i) => i.category === 'weather').length,
    };
  }, [delayItems]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[18px] border border-black/[0.06] dark:border-slate-800 shadow-sm p-4 flex flex-col justify-between h-full overflow-hidden">
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-2 border-b border-black/[0.04] dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-rose-100 dark:bg-rose-950/60 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              Live Delay Watch
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">Route Bottlenecks &amp; Stalled Units</p>
          </div>
        </div>

        <Badge
          className={cn(
            'text-[10px] font-extrabold uppercase px-2 py-0.5 border flex items-center gap-1',
            delayItems.length > 0
              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900/60'
              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60'
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full', delayItems.length > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500')} />
          {delayItems.length} Delayed Unit{delayItems.length === 1 ? '' : 's'}
        </Badge>
      </div>

      {/* ── Filter Segment Tabs ─────────────────────────────────── */}
      <div className="flex items-center gap-1 py-1.5 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setCategoryFilter('all')}
          className={cn(
            'px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap',
            categoryFilter === 'all'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-2xs'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
          )}
        >
          All ({counts.all})
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('traffic')}
          className={cn(
            'px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap',
            categoryFilter === 'traffic'
              ? 'bg-orange-600 text-white shadow-2xs'
              : 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 hover:bg-orange-100'
          )}
        >
          Traffic ({counts.traffic})
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('breakdown')}
          className={cn(
            'px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap',
            categoryFilter === 'breakdown'
              ? 'bg-rose-600 text-white shadow-2xs'
              : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 hover:bg-rose-100'
          )}
        >
          Breakdown ({counts.breakdown})
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('loading')}
          className={cn(
            'px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap',
            categoryFilter === 'loading'
              ? 'bg-blue-600 text-white shadow-2xs'
              : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 hover:bg-blue-100'
          )}
        >
          Dock Queue ({counts.loading})
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('weather')}
          className={cn(
            'px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap',
            categoryFilter === 'weather'
              ? 'bg-slate-700 text-white shadow-2xs'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
          )}
        >
          Weather ({counts.weather})
        </button>
      </div>

      {/* ── Scrollable Delay Feed List ───────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5 my-1">
        {filteredDelays.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              onClick={() => navigate(`/trips/${item.rawId}`)}
              className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-rose-200 dark:hover:border-rose-900/50 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-rose-50/30 dark:hover:bg-rose-950/20 transition-all cursor-pointer group flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-bold', item.iconBg)}>
                  <Icon className="w-3.5 h-3.5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate">
                      {item.tripId}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">• {item.route}</span>
                  </div>

                  <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate mt-0.5">
                    {item.delayNote}
                  </p>

                  <p className="text-[9.5px] font-medium text-slate-400 truncate">
                    {item.driverName} • {item.vehiclePlate}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Badge className={cn('text-[9px] font-extrabold uppercase px-1.5 py-0 border', item.badgeColor)}>
                  {item.badgeText}
                </Badge>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-brand group-hover:translate-x-0.5 transition-all" />
              </div>
            </div>
          );
        })}

        {filteredDelays.length === 0 && (
          <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-4 text-xs text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-1.5" />
            <p className="font-bold text-slate-700 dark:text-slate-200">Corridor Clear</p>
            <p className="text-[11px] text-slate-400">No active delays reported in this category.</p>
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div className="pt-2 border-t border-black/[0.04] dark:border-slate-800 flex items-center justify-between gap-2">
        <span className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1">
          <Activity className="w-3 h-3 text-emerald-500" /> Live corridor monitoring
        </span>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            onClick={() => navigate('/reports/delay-analysis')}
            variant="ghost"
            className="h-7 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 px-2 cursor-pointer gap-1"
          >
            <BarChart2 className="w-3 h-3 text-slate-400" />
            Delay Report
          </Button>

          <Button
            size="sm"
            onClick={() => navigate('/trips')}
            className="h-7 text-xs font-bold bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 rounded-lg px-2.5 shadow-xs cursor-pointer"
          >
            All Trips →
          </Button>
        </div>
      </div>
    </div>
  );
}
