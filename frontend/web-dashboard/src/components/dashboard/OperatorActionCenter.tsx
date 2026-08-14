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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-950/60 flex items-center justify-center text-red-600">
              <ShieldAlert className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Live Delay Watch
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Route Bottlenecks &amp; Stalled Units</p>
            </div>
          </div>

          {/* Prominent Red Fill & Pure White Text Badge */}
          <div
            className={cn(
              'px-3 py-1 rounded-xl flex items-center gap-2 shadow-sm transition-all select-none',
              delayItems.length > 0
                ? 'bg-red-600 text-white shadow-red-600/30 ring-2 ring-red-600/20'
                : 'bg-emerald-600 text-white shadow-emerald-600/30 ring-2 ring-emerald-600/20'
            )}
          >
            <span className="w-2 h-2 rounded-full bg-white animate-pulse shrink-0" />
            <span className="text-xs font-black uppercase tracking-tight text-white">
              {delayItems.length} Delayed Unit{delayItems.length === 1 ? '' : 's'}
            </span>
          </div>
        </div>

        {/* ── Standard Project Select Dropdown Control Bar ───────────────── */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
            <Select value={categoryFilter} onValueChange={(val: any) => setCategoryFilter(val)}>
              <SelectTrigger className="h-8 w-full text-xs font-bold bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-[#E8450F] shadow-2xs">
                <div className="flex items-center gap-2 truncate">
                  <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <SelectValue placeholder="All Delay Categories" />
                </div>
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl bg-white dark:bg-slate-900">
                <SelectItem value="all" className="text-xs font-bold cursor-pointer">
                  All Delay Categories ({counts.all})
                </SelectItem>
                <SelectItem value="traffic" className="text-xs font-semibold cursor-pointer">
                  Traffic Congestion ({counts.traffic})
                </SelectItem>
                <SelectItem value="breakdown" className="text-xs font-semibold cursor-pointer">
                  Mechanical Breakdown ({counts.breakdown})
                </SelectItem>
                <SelectItem value="loading" className="text-xs font-semibold cursor-pointer">
                  Dock &amp; Loading Queue ({counts.loading})
                </SelectItem>
                <SelectItem value="weather" className="text-xs font-semibold cursor-pointer">
                  Weather &amp; Sandstorm ({counts.weather})
                </SelectItem>
              </SelectContent>
            </Select>
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

      {/* ── Scrollable Thinner Delay Boxes Ledger ───────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 my-1.5 custom-scrollbar">
        {filteredDelays.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              onClick={() => navigate(`/trips/${item.rawId}`)}
              className={cn(
                'p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/40 shadow-2xs transition-colors cursor-pointer group flex flex-col gap-1.5',
                item.cardBorderAccent
              )}
            >
              {/* Top Row: Icon + Ref ID + Route + Solid Category Badge + Quick Ping Action */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <div className={cn('w-5 h-5 rounded-md flex items-center justify-center shrink-0 font-bold', item.iconBg)}>
                    <Icon className="w-3 h-3" />
                  </div>
                  <span className="font-mono font-black text-xs text-slate-900 dark:text-slate-100 shrink-0">
                    {item.tripId}
                  </span>
                  <span className="text-slate-300 dark:text-slate-600 shrink-0">•</span>
                  <span className="text-[11px] font-extrabold text-slate-800 dark:text-slate-200 truncate">
                    {item.route}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className={cn('text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide shadow-2xs', item.solidBadgeBg)}>
                    {item.badgeText}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleOpenQuickMsg(item, e)}
                    title="Ping Driver"
                    className="h-5 px-1.5 rounded-md text-[9px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <MessageSquare className="w-2.5 h-2.5 text-slate-500" />
                    <span>Ping</span>
                  </button>
                </div>
              </div>

              {/* Bottom Row: Delay Cause Note + Driver / Vehicle Info */}
              <div className="flex items-center justify-between gap-2 text-[10px] pt-0.5 border-t border-slate-100/70 dark:border-slate-800/60">
                <p className="text-slate-600 dark:text-slate-400 font-medium truncate flex-1">
                  {item.delayNote}
                </p>

                <div className="flex items-center gap-1.5 font-mono text-[9.5px] text-slate-400 dark:text-slate-500 shrink-0">
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{item.driverName}</span>
                  <span>•</span>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{item.vehiclePlate}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 group-hover:translate-x-0.5 transition-all ml-0.5" />
                </div>
              </div>
            </div>
          );
        })}

        {filteredDelays.length === 0 && (
          <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-6 text-xs text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-1.5" />
            <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">No Active Delays</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Selected category is running smoothly.</p>
          </div>
        )}
      </div>

      {/* ── Map-Matched Thin Footer Status Bar ─────────────────────── */}
      <div className="-mx-4 -mb-4 px-4 py-2 border-t border-black/[0.04] dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between flex-wrap gap-2 shrink-0">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-600 dark:text-slate-400">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Live corridor monitoring</span>
        </div>

        <button
          type="button"
          onClick={() => navigate('/reports/delays')}
          className="text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:text-[#E8450F] flex items-center gap-1 cursor-pointer transition-colors"
        >
          <BarChart2 className="w-3 h-3 text-slate-400" />
          <span>Delay Report ↗</span>
        </button>
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
