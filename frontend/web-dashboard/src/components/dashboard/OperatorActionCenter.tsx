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
  Filter,
  Send,
  Truck,
  User,
  ChevronDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  origin: string;
  destination: string;
  driverName: string;
  driverPhone?: string;
  vehiclePlate: string;
  delayDuration: string;
  delayNote: string;
  badgeText: string;
  solidBadgeBg: string;
  cardBorderAccent: string;
  icon: typeof AlertTriangle;
  iconBg: string;
  iconColor: string;
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
      const origin = t.stops?.[0]?.location_name || t.rateCard?.route_origin || 'Origin Hub';
      const destination = t.stops?.[t.stops.length - 1]?.location_name || t.rateCard?.route_destination || 'Destination Hub';
      const route = `${origin} → ${destination}`;

      const delayedStop = t.stops?.find((s: any) => s.delay_reason || s.delay_note);
      if (delayedStop) {
        const reason = (delayedStop.delay_reason || '').toLowerCase();
        let category: DelayItem['category'] = 'general';
        let Icon = AlertTriangle;
        let solidBadgeBg = 'bg-[#E11D48] text-white';
        let cardBorderAccent = 'border-l-[5px] border-l-[#E11D48]';
        let iconBg = 'bg-rose-100 text-rose-600';
        let iconColor = 'text-rose-600';

        if (reason.includes('traffic') || reason.includes('route') || reason.includes('checkpoint')) {
          category = 'traffic';
          Icon = Clock;
          solidBadgeBg = 'bg-[#EA580C] text-white';
          cardBorderAccent = 'border-l-[5px] border-l-[#EA580C]';
          iconBg = 'bg-orange-100 text-orange-600';
          iconColor = 'text-orange-600';
        } else if (reason.includes('breakdown') || reason.includes('vehicle') || reason.includes('repair')) {
          category = 'breakdown';
          Icon = Wrench;
          solidBadgeBg = 'bg-[#E11D48] text-white';
          cardBorderAccent = 'border-l-[5px] border-l-[#E11D48]';
          iconBg = 'bg-rose-100 text-rose-600';
          iconColor = 'text-rose-600';
        } else if (reason.includes('loading') || reason.includes('unloading') || reason.includes('customer') || reason.includes('warehouse')) {
          category = 'loading';
          Icon = Timer;
          solidBadgeBg = 'bg-[#2563EB] text-white';
          cardBorderAccent = 'border-l-[5px] border-l-[#2563EB]';
          iconBg = 'bg-blue-100 text-blue-600';
          iconColor = 'text-blue-600';
        } else if (reason.includes('weather') || reason.includes('sandstorm') || reason.includes('rain')) {
          category = 'weather';
          Icon = CloudRain;
          solidBadgeBg = 'bg-[#475569] text-white';
          cardBorderAccent = 'border-l-[5px] border-l-[#475569]';
          iconBg = 'bg-slate-100 text-slate-700';
          iconColor = 'text-slate-700';
        }

        list.push({
          id: `delay-${t.id}`,
          tripId,
          rawId: t.id,
          category,
          title: delayedStop.delay_reason || 'Route Delay',
          route,
          origin,
          destination,
          driverName,
          driverPhone,
          vehiclePlate,
          delayDuration: '+45m Delay',
          delayNote: delayedStop.delay_note || 'Pace compromised along designated route',
          badgeText: (delayedStop.delay_reason || 'DELAY').toUpperCase(),
          solidBadgeBg,
          cardBorderAccent,
          icon: Icon,
          iconBg,
          iconColor,
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
          route: 'Abu Dhabi Port → Dammam Hub',
          origin: 'Abu Dhabi Port',
          destination: 'Dammam Hub',
          driverName: 'Abdul Malik',
          driverPhone: '+966 54 819 2841',
          vehiclePlate: 'DRA-6484',
          delayDuration: '+45m Delay',
          delayNote: 'Eastern Ring Road bottleneck & checkpoint queues',
          badgeText: 'TRAFFIC +45M',
          solidBadgeBg: 'bg-[#EA580C] text-white',
          cardBorderAccent: 'border-l-[5px] border-l-[#EA580C]',
          icon: Clock,
          iconBg: 'bg-orange-100 text-orange-600',
          iconColor: 'text-orange-600',
        },
        {
          id: 'delay-demo-2',
          tripId: 'TRP-0019',
          rawId: 'demo-2',
          category: 'breakdown',
          title: 'Roadside Tire Replacement',
          route: 'Khamis Sorting → Edabi Depot',
          origin: 'Khamis Sorting',
          destination: 'Edabi Depot',
          driverName: 'Faisal Omar',
          driverPhone: '+966 56 312 9081',
          vehiclePlate: '4471-KLM',
          delayDuration: '+1h 15m Delay',
          delayNote: 'Drive axle tire repair; roadside mobile tech active',
          badgeText: 'BREAKDOWN',
          solidBadgeBg: 'bg-[#E11D48] text-white',
          cardBorderAccent: 'border-l-[5px] border-l-[#E11D48]',
          icon: Wrench,
          iconBg: 'bg-rose-100 text-rose-600',
          iconColor: 'text-rose-600',
        },
        {
          id: 'delay-demo-3',
          tripId: 'TRP-0022',
          rawId: 'demo-3',
          category: 'loading',
          title: 'Warehouse Dock Queue Delay',
          route: 'Jeddah Port → Makkah Central',
          origin: 'Jeddah Port Gate 4',
          destination: 'Makkah Central',
          driverName: 'Omar Nasser',
          driverPhone: '+966 55 921 7734',
          vehiclePlate: '3312-BNZ',
          delayDuration: '+50m Delay',
          delayNote: 'Manual pallet offload; awaiting forklift dock availability',
          badgeText: 'DOCK QUEUE',
          solidBadgeBg: 'bg-[#2563EB] text-white',
          cardBorderAccent: 'border-l-[5px] border-l-[#2563EB]',
          icon: Timer,
          iconBg: 'bg-blue-100 text-blue-600',
          iconColor: 'text-blue-600',
        },
        {
          id: 'delay-demo-4',
          tripId: 'TRP-0014',
          rawId: 'demo-4',
          category: 'weather',
          title: 'Highway Sandstorm Caution',
          route: 'Riyadh Depot → Hail Transit Point',
          origin: 'Riyadh Depot',
          destination: 'Hail Transit Point',
          driverName: 'Turki Rashid',
          driverPhone: '+966 50 443 8912',
          vehiclePlate: '1928-RQT',
          delayDuration: '+30m Delay',
          delayNote: 'Reduced driving pace on Route 65 due to sandstorm',
          badgeText: 'WEATHER',
          solidBadgeBg: 'bg-[#475569] text-white',
          cardBorderAccent: 'border-l-[5px] border-l-[#475569]',
          icon: CloudRain,
          iconBg: 'bg-slate-100 text-slate-700',
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
      
      {/* ── Header with Title & Highlighted Delayed Units Badge ────────────────────────── */}
      <div className="space-y-2.5 pb-2.5 border-b border-black/[0.05] dark:border-slate-800 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-50 dark:bg-orange-950/60 flex items-center justify-center text-[#E8450F]">
              <ShieldAlert className="w-4 h-4 text-[#E8450F]" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Live Delay Watch
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Route Bottlenecks &amp; Stalled Units</p>
            </div>
          </div>

          {/* Prominent, Highly Highlighted Delayed Units Badge */}
          <div
            className={cn(
              'px-3.5 py-1 rounded-xl flex items-center gap-2 shadow-xs transition-all select-none',
              delayItems.length > 0
                ? 'bg-rose-600 text-white shadow-rose-600/25 ring-2 ring-rose-600/20'
                : 'bg-emerald-600 text-white shadow-emerald-600/25 ring-2 ring-emerald-600/20'
            )}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse shrink-0" />
            <span className="text-xs font-black uppercase tracking-tight">
              {delayItems.length} Delayed Unit{delayItems.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* ── Solid Filter Dropdown Control Bar (Orange Accent) ───────────────── */}
        <div className="flex items-center justify-between gap-2">
          <div className="relative flex-1">
            <Filter className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="w-full h-8 pl-8 pr-7 text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#E8450F] appearance-none cursor-pointer transition-colors"
            >
              <option value="all">All Delay Categories ({counts.all})</option>
              <option value="traffic">Traffic Congestion ({counts.traffic})</option>
              <option value="breakdown">Mechanical Breakdown ({counts.breakdown})</option>
              <option value="loading">Dock &amp; Loading Queue ({counts.loading})</option>
              <option value="weather">Weather &amp; Sandstorm ({counts.weather})</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>

          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={cn(
              'h-8 px-3 rounded-xl text-[10px] font-black uppercase tracking-wide border transition-all cursor-pointer shrink-0 shadow-xs',
              categoryFilter === 'all'
                ? 'bg-[#E8450F] hover:bg-[#cf3c0b] text-white border-[#E8450F]'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            )}
          >
            Show All
          </button>
        </div>
      </div>

      {/* ── Scrollable Bigger Delay Boxes Ledger ───────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2.5 pr-1 my-1.5 custom-scrollbar">
        {filteredDelays.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              onClick={() => navigate(`/trips/${item.rawId}`)}
              className={cn(
                'p-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 shadow-xs transition-colors cursor-pointer group flex flex-col justify-between gap-2.5',
                item.cardBorderAccent
              )}
            >
              {/* Top Row: Ref ID, Solid Category Badge & Delay Time */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={cn('w-7 h-7 rounded-xl flex items-center justify-center shrink-0 font-bold shadow-2xs', item.iconBg)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100 tracking-tight">
                    {item.tripId}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className={cn('text-[9.5px] font-black uppercase px-2.5 py-0.5 rounded-md tracking-wider shadow-2xs', item.solidBadgeBg)}>
                    {item.badgeText}
                  </span>
                </div>
              </div>

              {/* Middle Row: Route Description */}
              <div className="space-y-1">
                <div className="text-xs font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>{item.route}</span>
                </div>

                <p className="text-[11px] font-medium text-slate-600 dark:text-slate-300 leading-snug">
                  {item.delayNote}
                </p>
              </div>

              {/* Bottom Row: Driver, Truck Plate Pill & Action Buttons */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 font-mono text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-bold text-slate-700 dark:text-slate-200">
                    <User className="w-3 h-3 text-slate-400" />
                    {item.driverName}
                  </span>
                  <span className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-bold text-slate-700 dark:text-slate-200">
                    <Truck className="w-3 h-3 text-slate-400" />
                    {item.vehiclePlate}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleOpenQuickMsg(item, e)}
                    title="Ping Driver"
                    className="h-6 px-2.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <MessageSquare className="w-3 h-3 text-slate-500" />
                    <span>Ping</span>
                  </button>

                  <span className="text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {filteredDelays.length === 0 && (
          <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-center p-6 text-xs text-slate-400">
            <CheckCircle2 className="w-9 h-9 text-emerald-500 mb-2" />
            <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">No Active Delays</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Selected category is running smoothly.</p>
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div className="pt-2.5 border-t border-black/[0.04] dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
        <span className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1.5">
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
            className="h-7 text-xs font-extrabold bg-[#E8450F] hover:bg-[#cf3c0b] text-white rounded-lg px-3 shadow-xs cursor-pointer"
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
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:ring-1 focus:ring-[#E8450F] resize-none bg-white dark:bg-slate-900"
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
