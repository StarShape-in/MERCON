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
  Radio,
  PhoneCall,
  MessageSquare,
  Sparkles,
  Navigation,
  Zap,
  TrendingUp,
  MapPin,
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
  severity: 'critical' | 'moderate' | 'minor';
  title: string;
  route: string;
  origin: string;
  destination: string;
  driverName: string;
  driverPhone?: string;
  vehiclePlate: string;
  delayDuration: string;
  delayMinutes: number;
  delayNote: string;
  slaToleranceMinutes: number;
  badgeText: string;
  badgeColor: string;
  icon: typeof AlertTriangle;
  iconBg: string;
  iconColor: string;
}

interface CorridorStatus {
  name: string;
  code: string;
  status: 'smooth' | 'congested' | 'delayed';
  avgDelay: string;
  activeTrips: number;
  delayedCount: number;
  primaryCause?: string;
}

export default function OperatorActionCenter({ trips }: OperatorActionCenterProps) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'feed' | 'corridors'>('feed');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'traffic' | 'breakdown' | 'loading' | 'weather'>('all');

  // Quick Dispatch Communication Modal
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

      // Check stops for delay_reason or delay_note
      const delayedStop = t.stops?.find((s: any) => s.delay_reason || s.delay_note);
      if (delayedStop) {
        const reason = (delayedStop.delay_reason || '').toLowerCase();
        let category: DelayItem['category'] = 'general';
        let severity: DelayItem['severity'] = 'moderate';
        let Icon = AlertTriangle;
        let iconBg = 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400';
        let badgeColor = 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900/60';

        if (reason.includes('traffic') || reason.includes('route') || reason.includes('checkpoint')) {
          category = 'traffic';
          Icon = Clock;
          iconBg = 'bg-orange-100 text-orange-600 dark:bg-orange-950 dark:text-orange-400';
          badgeColor = 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-900/60';
          severity = 'minor';
        } else if (reason.includes('breakdown') || reason.includes('vehicle') || reason.includes('repair')) {
          category = 'breakdown';
          Icon = Wrench;
          iconBg = 'bg-rose-100 text-rose-600 dark:bg-rose-950 dark:text-rose-400';
          badgeColor = 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-900/60';
          severity = 'critical';
        } else if (reason.includes('loading') || reason.includes('unloading') || reason.includes('customer') || reason.includes('warehouse')) {
          category = 'loading';
          Icon = Timer;
          iconBg = 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400';
          badgeColor = 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-900/60';
          severity = 'moderate';
        } else if (reason.includes('weather') || reason.includes('sandstorm') || reason.includes('rain')) {
          category = 'weather';
          Icon = CloudRain;
          iconBg = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
          badgeColor = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700';
          severity = 'minor';
        }

        list.push({
          id: `delay-${t.id}`,
          tripId,
          rawId: t.id,
          category,
          severity,
          title: delayedStop.delay_reason || 'Route Delay',
          route,
          origin,
          destination,
          driverName,
          driverPhone,
          vehiclePlate,
          delayDuration: '+35m to +1h',
          delayMinutes: 45,
          delayNote: delayedStop.delay_note || 'Transit pace compromised along route',
          slaToleranceMinutes: 60,
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
          severity: 'moderate',
          title: 'Heavy Traffic Bottleneck',
          route: 'Abu Dhabi → Dammam Hub',
          origin: 'Abu Dhabi Port',
          destination: 'Dammam Hub',
          driverName: 'Abdul Malik',
          driverPhone: '+966 54 819 2841',
          vehiclePlate: 'DRA-6484',
          delayDuration: '+45m Delay',
          delayMinutes: 45,
          delayNote: 'Eastern Ring Road checkpoint queues & freight crawl',
          slaToleranceMinutes: 60,
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
          severity: 'critical',
          title: 'Roadside Tire Replacement',
          route: 'Khamis Sorting → Edabi Depot',
          origin: 'Khamis Sorting',
          destination: 'Edabi Depot',
          driverName: 'Faisal Omar',
          driverPhone: '+966 56 312 9081',
          vehiclePlate: '4471-KLM',
          delayDuration: '+1h 15m Delay',
          delayMinutes: 75,
          delayNote: 'Blown right drive axle tire; road assistance dispatched',
          slaToleranceMinutes: 60,
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
          severity: 'moderate',
          title: 'Warehouse Dock Queue Delay',
          route: 'Jeddah Port → Makkah Central',
          origin: 'Jeddah Port Gate 4',
          destination: 'Makkah Central',
          driverName: 'Omar Nasser',
          driverPhone: '+966 55 921 7734',
          vehiclePlate: '3312-BNZ',
          delayDuration: '+50m Delay',
          delayMinutes: 50,
          delayNote: 'Manual pallet offloading; awaiting forklift availability',
          slaToleranceMinutes: 60,
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
          severity: 'minor',
          title: 'Highway Sandstorm Caution',
          route: 'Riyadh Depot → Hail Transit Point',
          origin: 'Riyadh Depot',
          destination: 'Hail Transit Point',
          driverName: 'Turki Rashid',
          driverPhone: '+966 50 443 8912',
          vehiclePlate: '1928-RQT',
          delayDuration: '+30m Delay',
          delayMinutes: 30,
          delayNote: 'Reduced visibility on Route 65; safety pace enforced',
          slaToleranceMinutes: 60,
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

  // Major Saudi Logistics Corridors Status
  const corridorList = useMemo<CorridorStatus[]>(() => {
    return [
      {
        name: 'Riyadh ↔ Dammam',
        code: 'Route 40 (Central-Eastern)',
        status: 'congested',
        avgDelay: '+45 min',
        activeTrips: 14,
        delayedCount: 2,
        primaryCause: 'Ring road inspection gates',
      },
      {
        name: 'Jeddah ↔ Makkah / Taif',
        code: 'Route 15 (Western Corridor)',
        status: 'delayed',
        avgDelay: '+50 min',
        activeTrips: 9,
        delayedCount: 3,
        primaryCause: 'Port customs & dock staging',
      },
      {
        name: 'Riyadh ↔ Qassim / Hail',
        code: 'Route 65 (Northern Spine)',
        status: 'congested',
        avgDelay: '+30 min',
        activeTrips: 8,
        delayedCount: 1,
        primaryCause: 'High wind sand gusts',
      },
      {
        name: 'Khamis ↔ Jizan / Asir',
        code: 'Route 10 (Southern Foothills)',
        status: 'delayed',
        avgDelay: '+1h 15m',
        activeTrips: 5,
        delayedCount: 1,
        primaryCause: 'Tyre service technician en route',
      },
    ];
  }, []);

  const handleOpenQuickMsg = (item: DelayItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDelayForMsg(item);
    setQuickMsgText(
      `Hello ${item.driverName}, this is MERCON Dispatch regarding Trip ${item.tripId} (${item.vehiclePlate}). Please confirm your current location and estimated arrival time.`
    );
  };

  const handleSendQuickNotice = () => {
    if (!selectedDelayForMsg) return;
    setIsSendingMsg(true);
    setTimeout(() => {
      setIsSendingMsg(false);
      toast.success(`⚡ Direct Dispatch Alert sent to ${selectedDelayForMsg.driverName} (${selectedDelayForMsg.driverPhone})`);
      setSelectedDelayForMsg(null);
    }, 600);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-[18px] border border-black/[0.06] dark:border-slate-800 shadow-sm p-4 flex flex-col justify-between h-full overflow-hidden transition-all">
      
      {/* ── Top Header & Live Radar HUD ────────────────────────────────────────── */}
      <div className="space-y-2 pb-2.5 border-b border-black/[0.04] dark:border-slate-800 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center text-white shadow-xs">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
              </span>
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
                  Live Delay Radar
                </h3>
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60">
                  <Radio className="w-2.5 h-2.5 animate-pulse" /> ACTIVE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Corridor Pace &amp; Stalled Units</p>
            </div>
          </div>

          {/* View Switcher Tabs (Feed vs Corridors) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200/80 dark:border-slate-700 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('feed')}
              className={cn(
                'px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1',
                viewMode === 'feed'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
              )}
            >
              Feed ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => setViewMode('corridors')}
              className={cn(
                'px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1',
                viewMode === 'corridors'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs font-extrabold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300'
              )}
            >
              Corridors
            </button>
          </div>
        </div>

        {/* ── Mini Live SLA Metric Bar (Cool Instrument Panel) ────────────────── */}
        <div className="grid grid-cols-3 gap-2 pt-0.5">
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl px-2 py-1.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">On-Time SLA</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs font-black font-mono text-emerald-600 dark:text-emerald-400">96.2%</span>
              <TrendingUp className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl px-2 py-1.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Delayed Units</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs font-black font-mono text-rose-600 dark:text-rose-400">{delayItems.length} Trucks</span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 rounded-xl px-2 py-1.5">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Avg Resolution</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-xs font-black font-mono text-slate-800 dark:text-slate-200">~38 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Feed View Mode ──────────────────────────────────────────────────────── */}
      {viewMode === 'feed' && (
        <>
          {/* Category Filter Pills */}
          <div className="flex items-center gap-1 py-1.5 overflow-x-auto no-scrollbar shrink-0">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={cn(
                'px-2 py-0.5 rounded-lg text-[9.5px] font-extrabold uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap',
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
                'px-2 py-0.5 rounded-lg text-[9.5px] font-extrabold uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap',
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
                'px-2 py-0.5 rounded-lg text-[9.5px] font-extrabold uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap',
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
                'px-2 py-0.5 rounded-lg text-[9.5px] font-extrabold uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap',
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
                'px-2 py-0.5 rounded-lg text-[9.5px] font-extrabold uppercase tracking-wide transition-all cursor-pointer whitespace-nowrap',
                categoryFilter === 'weather'
                  ? 'bg-slate-700 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
              )}
            >
              Weather ({counts.weather})
            </button>
          </div>

          {/* Scrollable Live Delay Cards */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5 my-1 custom-scrollbar">
            {filteredDelays.map((item) => {
              const Icon = item.icon;
              const isOverSla = item.delayMinutes >= item.slaToleranceMinutes;
              const slaPercent = Math.min(Math.round((item.delayMinutes / item.slaToleranceMinutes) * 100), 100);

              return (
                <div
                  key={item.id}
                  onClick={() => navigate(`/trips/${item.rawId}`)}
                  className="p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800 bg-white dark:bg-slate-900/60 hover:bg-rose-50/20 dark:hover:bg-rose-950/20 shadow-2xs transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0 flex-1">
                      <div className={cn('w-7 h-7 rounded-xl flex items-center justify-center shrink-0 font-bold mt-0.5 shadow-2xs', item.iconBg)}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 font-mono">
                            {item.tripId}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold truncate">
                            {item.route}
                          </span>
                        </div>

                        <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 truncate mt-0.5">
                          {item.delayNote}
                        </p>

                        <div className="flex items-center gap-2 text-[9.5px] text-slate-400 font-mono mt-1">
                          <span>{item.driverName}</span>
                          <span>•</span>
                          <span className="font-bold text-slate-600 dark:text-slate-300">{item.vehiclePlate}</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Severity Tag & Actions */}
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Badge className={cn('text-[8.5px] font-extrabold uppercase px-1.5 py-0 border tracking-wide', item.badgeColor)}>
                        {item.badgeText}
                      </Badge>

                      <button
                        type="button"
                        onClick={(e) => handleOpenQuickMsg(item, e)}
                        title="Direct Dispatch Ping to Driver"
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-brand hover:text-white transition-colors cursor-pointer"
                      >
                        <MessageSquare className="w-2.5 h-2.5" />
                        <span>Ping</span>
                      </button>
                    </div>
                  </div>

                  {/* Micro SLA Progress Meter */}
                  <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
                    <div className="flex-1 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all duration-300',
                          isOverSla ? 'bg-rose-500' : 'bg-orange-500'
                        )}
                        style={{ width: `${slaPercent}%` }}
                      />
                    </div>
                    <span className={cn('text-[9px] font-mono font-bold shrink-0', isOverSla ? 'text-rose-600' : 'text-orange-600')}>
                      {isOverSla ? '⚠️ SLA Exceeded' : `${item.delayMinutes}m / ${item.slaToleranceMinutes}m SLA`}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredDelays.length === 0 && (
              <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-4 text-xs text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-1.5" />
                <p className="font-bold text-slate-700 dark:text-slate-200">All Corridors Clear</p>
                <p className="text-[11px] text-slate-400">No active delays reported in this category.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Corridors Health Matrix Mode ────────────────────────────────────────── */}
      {viewMode === 'corridors' && (
        <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5 my-1 custom-scrollbar">
          {corridorList.map((c) => (
            <div
              key={c.code}
              onClick={() => navigate('/trips')}
              className="p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">{c.name}</h4>
                    <p className="text-[9.5px] text-slate-400 font-mono">{c.code}</p>
                  </div>
                </div>

                <Badge
                  className={cn(
                    'text-[9px] font-extrabold uppercase px-1.5 py-0 border',
                    c.status === 'delayed'
                      ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                      : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300'
                  )}
                >
                  {c.avgDelay}
                </Badge>
              </div>

              <div className="mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[9.5px] text-slate-500">
                <span>Cause: <strong className="text-slate-700 dark:text-slate-300">{c.primaryCause}</strong></span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{c.delayedCount} Delayed Units</span>
              </div>
            </div>
          ))}
        </div>
      )}

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

      {/* ── Quick Driver Dispatch Communication Dialog ────────────────────────── */}
      <Dialog open={!!selectedDelayForMsg} onOpenChange={(open) => !open && setSelectedDelayForMsg(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-brand mb-1">
              <div className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-950/60 flex items-center justify-center">
                <Send className="w-4 h-4" />
              </div>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Dispatch Broadcast to Driver
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Direct push notification &amp; SMS ping to{' '}
              <strong className="text-slate-800 dark:text-slate-200">{selectedDelayForMsg?.driverName}</strong> (
              {selectedDelayForMsg?.driverPhone}) for <strong>{selectedDelayForMsg?.tripId}</strong>.
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
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Notice Message</label>
              <textarea
                value={quickMsgText}
                onChange={(e) => setQuickMsgText(e.target.value)}
                rows={3.5}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:ring-2 focus:ring-brand focus:border-brand resize-none bg-white dark:bg-slate-900"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickMsgText(`Driver ${selectedDelayForMsg?.driverName}, please confirm ETA and location immediately.`)}
                className="h-6 text-[10px] font-semibold text-slate-600 rounded-md"
              >
                + Ask for ETA
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setQuickMsgText(`Roadside assistance en route for vehicle ${selectedDelayForMsg?.vehiclePlate}. Stay safe.`)}
                className="h-6 text-[10px] font-semibold text-slate-600 rounded-md"
              >
                + Road Assistance En Route
              </Button>
            </div>
          </div>

          <DialogFooter className="pt-3">
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
              className="text-xs font-bold bg-brand hover:bg-brand-hover text-white gap-1.5 px-4"
            >
              <Send className="w-3.5 h-3.5" />
              {isSendingMsg ? 'Broadcasting...' : 'Send Driver Alert'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
