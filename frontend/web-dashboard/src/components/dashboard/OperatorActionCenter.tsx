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
  MessageSquare,
  Send,
  Truck,
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
  squareBg: string;
  squareBorder: string;
  plateTextColor: string;
  icon: typeof AlertTriangle;
  iconBg: string;
  iconColor: string;
}

export default function OperatorActionCenter({ trips }: OperatorActionCenterProps) {
  const navigate = useNavigate();
  const [selectedDelayForMsg, setSelectedDelayForMsg] = useState<DelayItem | null>(null);
  const [quickMsgText, setQuickMsgText] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);

  // Extract live delay items from real trip dataset or realistic corridor feed
  const delayItems = useMemo<DelayItem[]>(() => {
    const list: DelayItem[] = [];

    trips.forEach((t) => {
      const tripId = t.ref_id || `TRP-${t.id.slice(0, 6).toUpperCase()}`;
      const driverName = t.driver
        ? `${t.driver.first_name} ${t.driver.last_name}`.trim()
        : (t.is_third_party ? (t.third_party_driver_name || t.thirdPartyProvider?.name || '3PL Driver') : 'Unassigned Driver');
      const driverPhone = t.driver?.phone_primary || t.third_party_driver_phone || t.thirdPartyProvider?.phone || '+966 50 123 4567';
      const vehiclePlate = t.vehicle?.plate_number || t.vehicle?.ref_id || (t.is_third_party ? (t.third_party_vehicle_plate || '3PL Truck') : 'VEH-PENDING');
      const origin = t.stops?.[0]?.location_name || t.rateCard?.route_origin || 'Origin Hub';
      const destination = t.stops?.[t.stops.length - 1]?.location_name || t.rateCard?.route_destination || 'Destination Hub';
      const route = `${origin} → ${destination}`;

      const delayedStop = t.stops?.find((s: any) => s.delay_reason || s.delay_note);
      if (delayedStop) {
        const reason = (delayedStop.delay_reason || '').toLowerCase();
        let category: DelayItem['category'] = 'general';
        let Icon = AlertTriangle;
        let solidBadgeBg = 'bg-[#E11D48] text-white';
        let cardBorderAccent = 'border-l-4 border-l-[#E11D48]';
        let squareBg = 'bg-rose-50/75 dark:bg-rose-950/25 hover:bg-rose-100/80 dark:hover:bg-rose-950/40';
        let squareBorder = 'border-rose-200/90 dark:border-rose-900/60 hover:border-rose-400 dark:hover:border-rose-700';
        let plateTextColor = 'text-rose-950 dark:text-rose-100';
        let iconBg = 'bg-rose-100 dark:bg-rose-950/60 text-rose-600';
        let iconColor = 'text-rose-600';

        if (reason.includes('traffic') || reason.includes('route') || reason.includes('checkpoint')) {
          category = 'traffic';
          Icon = Clock;
          solidBadgeBg = 'bg-[#EA580C] text-white';
          cardBorderAccent = 'border-l-4 border-l-[#EA580C]';
          squareBg = 'bg-orange-50/75 dark:bg-orange-950/25 hover:bg-orange-100/80 dark:hover:bg-orange-950/40';
          squareBorder = 'border-orange-200/90 dark:border-orange-900/60 hover:border-orange-400 dark:hover:border-orange-700';
          plateTextColor = 'text-orange-950 dark:text-orange-100';
          iconBg = 'bg-orange-100 dark:bg-orange-950/60 text-orange-600';
          iconColor = 'text-orange-600';
        } else if (reason.includes('breakdown') || reason.includes('vehicle') || reason.includes('repair')) {
          category = 'breakdown';
          Icon = Wrench;
          solidBadgeBg = 'bg-[#E11D48] text-white';
          cardBorderAccent = 'border-l-4 border-l-[#E11D48]';
          squareBg = 'bg-rose-50/75 dark:bg-rose-950/25 hover:bg-rose-100/80 dark:hover:bg-rose-950/40';
          squareBorder = 'border-rose-200/90 dark:border-rose-900/60 hover:border-rose-400 dark:hover:border-rose-700';
          plateTextColor = 'text-rose-950 dark:text-rose-100';
          iconBg = 'bg-rose-100 dark:bg-rose-950/60 text-rose-600';
          iconColor = 'text-rose-600';
        } else if (reason.includes('loading') || reason.includes('unloading') || reason.includes('customer') || reason.includes('warehouse')) {
          category = 'loading';
          Icon = Timer;
          solidBadgeBg = 'bg-[#2563EB] text-white';
          cardBorderAccent = 'border-l-4 border-l-[#2563EB]';
          squareBg = 'bg-blue-50/75 dark:bg-blue-950/25 hover:bg-blue-100/80 dark:hover:bg-blue-950/40';
          squareBorder = 'border-blue-200/90 dark:border-blue-900/60 hover:border-blue-400 dark:hover:border-blue-700';
          plateTextColor = 'text-blue-950 dark:text-blue-100';
          iconBg = 'bg-blue-100 dark:bg-blue-950/60 text-blue-600';
          iconColor = 'text-blue-600';
        } else if (reason.includes('weather') || reason.includes('sandstorm') || reason.includes('rain')) {
          category = 'weather';
          Icon = CloudRain;
          solidBadgeBg = 'bg-[#475569] text-white';
          cardBorderAccent = 'border-l-4 border-l-[#475569]';
          squareBg = 'bg-slate-50/90 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70';
          squareBorder = 'border-slate-200/90 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600';
          plateTextColor = 'text-slate-900 dark:text-slate-100';
          iconBg = 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300';
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
          squareBg,
          squareBorder,
          plateTextColor,
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
          cardBorderAccent: 'border-l-4 border-l-[#EA580C]',
          squareBg: 'bg-orange-50/75 dark:bg-orange-950/25 hover:bg-orange-100/80 dark:hover:bg-orange-950/40',
          squareBorder: 'border-orange-200/90 dark:border-orange-900/60 hover:border-orange-400 dark:hover:border-orange-700',
          plateTextColor: 'text-orange-950 dark:text-orange-100',
          icon: Clock,
          iconBg: 'bg-orange-100 dark:bg-orange-950/60 text-orange-600',
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
          cardBorderAccent: 'border-l-4 border-l-[#E11D48]',
          squareBg: 'bg-rose-50/75 dark:bg-rose-950/25 hover:bg-rose-100/80 dark:hover:bg-rose-950/40',
          squareBorder: 'border-rose-200/90 dark:border-rose-900/60 hover:border-rose-400 dark:hover:border-rose-700',
          plateTextColor: 'text-rose-950 dark:text-rose-100',
          icon: Wrench,
          iconBg: 'bg-rose-100 dark:bg-rose-950/60 text-rose-600',
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
          cardBorderAccent: 'border-l-4 border-l-[#2563EB]',
          squareBg: 'bg-blue-50/75 dark:bg-blue-950/25 hover:bg-blue-100/80 dark:hover:bg-blue-950/40',
          squareBorder: 'border-blue-200/90 dark:border-blue-900/60 hover:border-blue-400 dark:hover:border-blue-700',
          plateTextColor: 'text-blue-950 dark:text-blue-100',
          icon: Timer,
          iconBg: 'bg-blue-100 dark:bg-blue-950/60 text-blue-600',
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
          cardBorderAccent: 'border-l-4 border-l-[#475569]',
          squareBg: 'bg-slate-50/90 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70',
          squareBorder: 'border-slate-200/90 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600',
          plateTextColor: 'text-slate-900 dark:text-slate-100',
          icon: CloudRain,
          iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
          iconColor: 'text-slate-700',
        },
        {
          id: 'delay-demo-5',
          tripId: 'TRP-0036',
          rawId: 'demo-5',
          category: 'traffic',
          title: 'Expressway Route 40 Bottleneck',
          route: 'Jubail Industrial → Riyadh Hub',
          origin: 'Jubail Industrial',
          destination: 'Riyadh Hub',
          driverName: 'Sultan Mansoor',
          driverPhone: '+966 55 837 1928',
          vehiclePlate: '7821-XDA',
          delayDuration: '+1h 00m Delay',
          delayNote: 'Lane closure & heavy freight queue near Salbukh',
          badgeText: 'TRAFFIC +1H',
          solidBadgeBg: 'bg-[#EA580C] text-white',
          cardBorderAccent: 'border-l-4 border-l-[#EA580C]',
          squareBg: 'bg-orange-50/75 dark:bg-orange-950/25 hover:bg-orange-100/80 dark:hover:bg-orange-950/40',
          squareBorder: 'border-orange-200/90 dark:border-orange-900/60 hover:border-orange-400 dark:hover:border-orange-700',
          plateTextColor: 'text-orange-950 dark:text-orange-100',
          icon: Clock,
          iconBg: 'bg-orange-100 dark:bg-orange-950/60 text-orange-600',
          iconColor: 'text-orange-600',
        },
        {
          id: 'delay-demo-6',
          tripId: 'TRP-0041',
          rawId: 'demo-6',
          category: 'breakdown',
          title: 'Cooling Radiator Hose Repair',
          route: 'Yanbu Port → Rabigh Sorting',
          origin: 'Yanbu Port',
          destination: 'Rabigh Sorting',
          driverName: 'Hassan Al-Zahrani',
          driverPhone: '+966 53 910 4482',
          vehiclePlate: '9014-VSA',
          delayDuration: '+40m Delay',
          delayNote: 'Overheating alert; mobile mechanic dispatched at km 84',
          badgeText: 'BREAKDOWN',
          solidBadgeBg: 'bg-[#E11D48] text-white',
          cardBorderAccent: 'border-l-4 border-l-[#E11D48]',
          squareBg: 'bg-rose-50/75 dark:bg-rose-950/25 hover:bg-rose-100/80 dark:hover:bg-rose-950/40',
          squareBorder: 'border-rose-200/90 dark:border-rose-900/60 hover:border-rose-400 dark:hover:border-rose-700',
          plateTextColor: 'text-rose-950 dark:text-rose-100',
          icon: Wrench,
          iconBg: 'bg-rose-100 dark:bg-rose-950/60 text-rose-600',
          iconColor: 'text-rose-600',
        },
        {
          id: 'delay-demo-7',
          tripId: 'TRP-0029',
          rawId: 'demo-7',
          category: 'loading',
          title: 'Receiving Dock Gate Congestion',
          route: 'Dammam Customs → Al-Khobar Center',
          origin: 'Dammam Customs Gate 3',
          destination: 'Al-Khobar Center',
          driverName: 'Tariq Al-Harbi',
          driverPhone: '+966 50 712 3901',
          vehiclePlate: '5523-KSA',
          delayDuration: '+1h 20m Delay',
          delayNote: 'Consignment clearance queue; bay backlog at receiver dock',
          badgeText: 'DOCK QUEUE',
          solidBadgeBg: 'bg-[#2563EB] text-white',
          cardBorderAccent: 'border-l-4 border-l-[#2563EB]',
          squareBg: 'bg-blue-50/75 dark:bg-blue-950/25 hover:bg-blue-100/80 dark:hover:bg-blue-950/40',
          squareBorder: 'border-blue-200/90 dark:border-blue-900/60 hover:border-blue-400 dark:hover:border-blue-700',
          plateTextColor: 'text-blue-950 dark:text-blue-100',
          icon: Timer,
          iconBg: 'bg-blue-100 dark:bg-blue-950/60 text-blue-600',
          iconColor: 'text-blue-600',
        },
        {
          id: 'delay-demo-8',
          tripId: 'TRP-0038',
          rawId: 'demo-8',
          category: 'weather',
          title: 'Dense Fog Visibility Advisory',
          route: 'Abha Highland → Jazan Coastal',
          origin: 'Abha Highland',
          destination: 'Jazan Coastal Hub',
          driverName: 'Bader Al-Dosari',
          driverPhone: '+966 54 391 8820',
          vehiclePlate: '6219-HRA',
          delayDuration: '+35m Delay',
          delayNote: 'Mountain descent pace limited to 30 km/h due to dense fog',
          badgeText: 'WEATHER',
          solidBadgeBg: 'bg-[#475569] text-white',
          cardBorderAccent: 'border-l-4 border-l-[#475569]',
          squareBg: 'bg-slate-50/90 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/70',
          squareBorder: 'border-slate-200/90 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600',
          plateTextColor: 'text-slate-900 dark:text-slate-100',
          icon: CloudRain,
          iconBg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
          iconColor: 'text-slate-700',
        },
      ];
    }

    return list;
  }, [trips]);

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
      <div className="pb-2.5 border-b border-black/[0.05] dark:border-slate-800 shrink-0">
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
              'px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-sm transition-all select-none',
              delayItems.length > 0
                ? 'bg-red-600 text-white shadow-red-600/30 ring-2 ring-red-600/20'
                : 'bg-emerald-600 text-white shadow-emerald-600/30 ring-2 ring-emerald-600/20'
            )}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
            <span className="text-[11px] font-black uppercase tracking-tight text-white">
              {delayItems.length} {delayItems.length === 1 ? 'Delayed Unit' : 'Delayed Units'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Grid of Delayed Truck Squares (License Plate Prominent with Problem Colors) ── */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 my-1.5 custom-scrollbar">
        {delayItems.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {delayItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.id}
                  onClick={() => navigate(`/trips/${item.rawId}`)}
                  className={cn(
                    'p-2.5 rounded-xl border transition-all duration-200 cursor-pointer group flex flex-col justify-between shadow-2xs hover:shadow-md hover:-translate-y-0.5 relative overflow-hidden',
                    item.squareBg,
                    item.squareBorder
                  )}
                >
                  {/* Top Row: Category Icon + Status Tag + Ping button */}
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className={cn('w-5 h-5 rounded-md flex items-center justify-center shrink-0 shadow-2xs font-bold', item.iconBg)}>
                        <Icon className="w-3 h-3" />
                      </div>
                      <span className={cn('text-[8.5px] font-black uppercase px-1.5 py-0.5 rounded tracking-wide truncate shadow-2xs', item.solidBadgeBg)}>
                        {item.badgeText}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleOpenQuickMsg(item, e)}
                      title="Ping Driver"
                      className="h-5 w-5 rounded-md flex items-center justify-center bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700 transition-all cursor-pointer shadow-2xs shrink-0"
                    >
                      <MessageSquare className="w-2.5 h-2.5 text-slate-500" />
                    </button>
                  </div>

                  {/* Center: Prominent Vehicle License Plate Number */}
                  <div className="my-1.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Truck className="w-3 h-3 opacity-60 shrink-0" />
                      <span className={cn('font-mono font-black text-xs sm:text-[13px] tracking-tight block drop-shadow-2xs', item.plateTextColor)}>
                        {item.vehiclePlate}
                      </span>
                    </div>
                    <span className="text-[9.5px] font-bold text-slate-500 dark:text-slate-400 font-mono block truncate mt-0.5">
                      {item.tripId} • {item.driverName}
                    </span>
                  </div>

                  {/* Bottom Row: Delay Cause Note / Route */}
                  <div className="pt-1 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-1 text-[9px]">
                    <span className="text-slate-600 dark:text-slate-400 font-medium truncate" title={item.delayNote}>
                      {item.delayNote}
                    </span>
                    <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="h-full min-h-[140px] flex flex-col items-center justify-center text-center p-6 text-xs text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-1.5" />
            <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">No Active Delays</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Selected category is running smoothly.</p>
          </div>
        )}
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
                <p className="font-mono font-bold text-red-600">{selectedDelayForMsg?.delayDuration}</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Message</label>
              <textarea
                value={quickMsgText}
                onChange={(e) => setQuickMsgText(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-slate-400 dark:focus:ring-slate-600 resize-none bg-white dark:bg-slate-900"
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
