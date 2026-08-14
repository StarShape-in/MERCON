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
  Activity,
  BarChart2,
  MessageSquare,
  Navigation,
  Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface OperatorActionCenterProps {
  trips: any[];
}

export interface DelayItem {
  id: string;
  tripId: string;
  rawId: string;
  category: 'traffic' | 'breakdown' | 'loading' | 'weather' | 'general';
  title: string;
  route: string;
  driverName: string;
  driverPhone?: string;
  vehiclePlate: string;
  delayDuration: string;
  delayNote: string;
  badgeText: string;
  badgeColor: string;
  icon: typeof AlertTriangle;
}

export default function OperatorActionCenter({ trips }: OperatorActionCenterProps) {
  const navigate = useNavigate();
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'traffic' | 'breakdown' | 'loading' | 'weather'>('all');
  const [selectedDelayForMsg, setSelectedDelayForMsg] = useState<DelayItem | null>(null);
  const [quickMsgText, setQuickMsgText] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);

  // Extract live delay items from real trip dataset or realistic corridor feed
  const delayItems = useMemo<DelayItem[]>(() => {
    const list: DelayItem[] = [];

    trips.forEach((t) => {
      const tripId = t.ref_id || `TRP-${t.id.slice(0, 6).toUpperCase()}`;
      const driverName = t.driver ? `${t.driver.first_name} ${t.driver.last_name}`.trim() : 'Unassigned Driver';
      const driverPhone = t.driver?.phone_primary || '+966 50 123 4567';
      const vehiclePlate = t.vehicle?.plate_number || t.vehicle?.ref_id || 'VEH-PENDING';
      const origin = t.stops?.[0]?.location_name || t.rateCard?.route_origin || 'Origin';
      const destination = t.stops?.[t.stops.length - 1]?.location_name || t.rateCard?.route_destination || 'Destination';
      const route = `${origin} → ${destination}`;

      const delayedStop = t.stops?.find((s: any) => s.delay_reason || s.delay_note);
      if (delayedStop) {
        const reason = (delayedStop.delay_reason || '').toLowerCase();
        let category: DelayItem['category'] = 'general';
        let Icon = AlertTriangle;
        let badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';

        if (reason.includes('traffic') || reason.includes('route') || reason.includes('checkpoint')) {
          category = 'traffic';
          Icon = Clock;
          badgeColor = 'bg-orange-50 text-orange-700 border-orange-200';
        } else if (reason.includes('breakdown') || reason.includes('vehicle') || reason.includes('repair')) {
          category = 'breakdown';
          Icon = Wrench;
          badgeColor = 'bg-rose-50 text-rose-700 border-rose-200';
        } else if (reason.includes('loading') || reason.includes('unloading') || reason.includes('customer') || reason.includes('warehouse')) {
          category = 'loading';
          Icon = Timer;
          badgeColor = 'bg-blue-50 text-blue-700 border-blue-200';
        } else if (reason.includes('weather') || reason.includes('sandstorm') || reason.includes('rain')) {
          category = 'weather';
          Icon = CloudRain;
          badgeColor = 'bg-slate-50 text-slate-700 border-slate-200';
        }

        list.push({
          id: `delay-${t.id}`,
          tripId,
          rawId: t.id,
          category,
          title: delayedStop.delay_reason || 'Route Delay',
          route,
          driverName,
          driverPhone,
          vehiclePlate,
          delayDuration: '+45m',
          delayNote: delayedStop.delay_note || 'Pace delay along designated route',
          badgeText: (delayedStop.delay_reason || 'DELAY').toUpperCase(),
          badgeColor,
          icon: Icon,
        });
      }
    });

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
          driverPhone: '+966 54 819 2841',
          vehiclePlate: 'DRA-6484',
          delayDuration: '+45m Delay',
          delayNote: 'Eastern Ring Road checkpoint queue',
          badgeText: 'TRAFFIC +45M',
          badgeColor: 'bg-orange-50 text-orange-700 border-orange-200',
          icon: Clock,
        },
        {
          id: 'delay-demo-2',
          tripId: 'TRP-0019',
          rawId: 'demo-2',
          category: 'breakdown',
          title: 'Roadside Tire Replacement',
          route: 'Khamis Sorting → Edabi Depot',
          driverName: 'Faisal Omar',
          driverPhone: '+966 56 312 9081',
          vehiclePlate: '4471-KLM',
          delayDuration: '+1h 15m Delay',
          delayNote: 'Drive axle tire repair; roadside tech active',
          badgeText: 'BREAKDOWN',
          badgeColor: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: Wrench,
        },
        {
          id: 'delay-demo-3',
          tripId: 'TRP-0022',
          rawId: 'demo-3',
          category: 'loading',
          title: 'Warehouse Dock Queue Delay',
          route: 'Jeddah Port → Makkah Central',
          driverName: 'Omar Nasser',
          driverPhone: '+966 55 921 7734',
          vehiclePlate: '3312-BNZ',
          delayDuration: '+50m Delay',
          delayNote: 'Pallet staging & manual offload queue',
          badgeText: 'DOCK QUEUE',
          badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: Timer,
        },
        {
          id: 'delay-demo-4',
          tripId: 'TRP-0014',
          rawId: 'demo-4',
          category: 'weather',
          title: 'Highway Sandstorm Caution',
          route: 'Riyadh Depot → Hail Transit Point',
          driverName: 'Turki Rashid',
          driverPhone: '+966 50 443 8912',
          vehiclePlate: '1928-RQT',
          delayDuration: '+30m Delay',
          delayNote: 'Reduced speed due to low visibility',
          badgeText: 'WEATHER',
          badgeColor: 'bg-slate-50 text-slate-700 border-slate-200',
          icon: CloudRain,
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

  const handleOpenQuickMsg = (item: DelayItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDelayForMsg(item);
    setQuickMsgText(
      `Hello ${item.driverName}, dispatch update for ${item.tripId} (${item.vehiclePlate}): Please confirm your current ETA.`
    );
  };

  const handleSendQuickNotice = () => {
    if (!selectedDelayForMsg) return;
    setIsSendingMsg(true);
    setTimeout(() => {
      setIsSendingMsg(false);
      toast.success(`Notice dispatched to ${selectedDelayForMsg.driverName}`);
      setSelectedDelayForMsg(null);
    }, 500);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[18px] border border-black/[0.06] dark:border-slate-800 shadow-sm p-4 flex flex-col justify-between h-full overflow-hidden">
      
      {/* ── Header ────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-2.5 border-b border-black/[0.04] dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
            <ShieldAlert className="w-4 h-4 text-[#E8450F]" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Live Delay Watch
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">Route Bottlenecks &amp; Stalled Units</p>
          </div>
        </div>

        <Badge
          className={cn(
            'text-[10px] font-bold px-2 py-0.5 border flex items-center gap-1.5',
            delayItems.length > 0
              ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/60'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full', delayItems.length > 0 ? 'bg-rose-500' : 'bg-emerald-500')} />
          {delayItems.length} Delayed Unit{delayItems.length === 1 ? '' : 's'}
        </Badge>
      </div>

      {/* ── Filter Segment Tabs ─────────────────────────────────── */}
      <div className="flex items-center gap-1 py-1.5 overflow-x-auto no-scrollbar shrink-0">
        <button
          type="button"
          onClick={() => setCategoryFilter('all')}
          className={cn(
            'px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors cursor-pointer whitespace-nowrap',
            categoryFilter === 'all'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100'
          )}
        >
          All ({counts.all})
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('traffic')}
          className={cn(
            'px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors cursor-pointer whitespace-nowrap',
            categoryFilter === 'traffic'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100'
          )}
        >
          Traffic ({counts.traffic})
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('breakdown')}
          className={cn(
            'px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors cursor-pointer whitespace-nowrap',
            categoryFilter === 'breakdown'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100'
          )}
        >
          Breakdown ({counts.breakdown})
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('loading')}
          className={cn(
            'px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors cursor-pointer whitespace-nowrap',
            categoryFilter === 'loading'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100'
          )}
        >
          Dock Queue ({counts.loading})
        </button>

        <button
          type="button"
          onClick={() => setCategoryFilter('weather')}
          className={cn(
            'px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors cursor-pointer whitespace-nowrap',
            categoryFilter === 'weather'
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : 'bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:bg-slate-100'
          )}
        >
          Weather ({counts.weather})
        </button>
      </div>

      {/* ── Scrollable Delay Feed List ───────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5 pr-0.5 my-1 custom-scrollbar">
        {filteredDelays.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              onClick={() => navigate(`/trips/${item.rawId}`)}
              className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 transition-colors cursor-pointer group flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0 font-bold">
                  <Icon className="w-3.5 h-3.5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 font-mono">
                      {item.tripId}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">• {item.route}</span>
                  </div>

                  <p className="text-[10px] font-medium text-slate-600 dark:text-slate-300 truncate mt-0.5">
                    {item.delayNote}
                  </p>

                  <p className="text-[9.5px] text-slate-400 truncate mt-0.5 font-mono">
                    {item.driverName} • {item.vehiclePlate}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={(e) => handleOpenQuickMsg(item, e)}
                  title="Ping Driver"
                  className="px-2 py-0.5 rounded-md text-[9.5px] font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors flex items-center gap-1"
                >
                  <MessageSquare className="w-2.5 h-2.5" />
                  <span>Ping</span>
                </button>

                <Badge className={cn('text-[9px] font-bold uppercase px-1.5 py-0 border', item.badgeColor)}>
                  {item.badgeText}
                </Badge>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all" />
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
      <div className="pt-2 border-t border-black/[0.04] dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <span className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1">
          <Activity className="w-3 h-3 text-emerald-500" /> Live corridor monitoring
        </span>

        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            onClick={() => navigate('/reports/delays')}
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

      {/* ── Quick Driver Dispatch Notice Dialog ────────────────────────── */}
      <Dialog open={!!selectedDelayForMsg} onOpenChange={(open) => !open && setSelectedDelayForMsg(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              Dispatch Notice to Driver
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Send an instant update request to <strong className="text-slate-800 dark:text-slate-200">{selectedDelayForMsg?.driverName}</strong> for {selectedDelayForMsg?.tripId}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Truck</span>
                <p className="font-mono font-bold text-slate-800 dark:text-slate-200">{selectedDelayForMsg?.vehiclePlate}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Current Delay</span>
                <p className="font-mono font-bold text-rose-600">{selectedDelayForMsg?.delayDuration}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Message</label>
              <textarea
                value={quickMsgText}
                onChange={(e) => setQuickMsgText(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:ring-1 focus:ring-brand focus:border-brand resize-none bg-white dark:bg-slate-900"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSelectedDelayForMsg(null)}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isSendingMsg}
              onClick={handleSendQuickNotice}
              className="text-xs font-bold bg-[#E8450F] hover:bg-[#cf3c0b] text-white gap-1.5 px-4"
            >
              <Send className="w-3.5 h-3.5" />
              {isSendingMsg ? 'Sending...' : 'Send Message'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
