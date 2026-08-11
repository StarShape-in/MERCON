import { useState } from 'react';
import {
  Radio,
  Navigation,
  Truck,
  Clock,
  ArrowRight,
  ChevronRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

interface LiveTrip {
  id: string;
  ref_id: string;
  driverName: string;
  plateNumber: string;
  origin: string;
  destination: string;
  cargo: string;
  speed: number;
  progressPercent: number;
  eta: string;
  status: 'InTransit' | 'AtPickup' | 'AtDelivery';
  statusLabel: string;
}

const LIVE_TRIPS: LiveTrip[] = [
  {
    id: '1',
    ref_id: 'TRP-9481',
    driverName: 'Tariq Al-Otaibi',
    plateNumber: 'TRK-882',
    origin: 'Riyadh Central Yard',
    destination: 'Jeddah Islamic Port',
    cargo: 'Electronics & Parts (14T)',
    speed: 86,
    progressPercent: 68,
    eta: '18:45 (in 1h 40m)',
    status: 'InTransit',
    statusLabel: 'Cruising • On Highway 40',
  },
  {
    id: '2',
    ref_id: 'TRP-9482',
    driverName: 'Ahmed Mansoor',
    plateNumber: 'TRK-104',
    origin: 'Dammam Petrochemicals',
    destination: 'Jubail Industrial Complex',
    cargo: 'Industrial Polymers (22T)',
    speed: 72,
    progressPercent: 91,
    eta: '16:15 (in 25m)',
    status: 'AtDelivery',
    statusLabel: 'Approaching Gate 4',
  },
  {
    id: '3',
    ref_id: 'TRP-9483',
    driverName: 'Zaid Al-Ghamdi',
    plateNumber: 'TRK-319',
    origin: 'Yanbu Logistics Hub',
    destination: 'Medina Food Terminal',
    cargo: 'Refrigerated Dairy (18T)',
    speed: 68,
    progressPercent: 35,
    eta: '20:10 (in 3h 15m)',
    status: 'InTransit',
    statusLabel: 'Passing Badr Interchange',
  },
];

export default function SahalLiveOperations() {
  const [selectedTrip, setSelectedTrip] = useState<LiveTrip>(LIVE_TRIPS[0]);

  return (
    <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm rounded-2xl overflow-hidden backdrop-blur-sm flex flex-col">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="relative flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-4 w-4 rounded-full bg-emerald-400 opacity-75" />
              <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold relative shadow-xs shadow-emerald-500/20">
                <Radio size={18} className="stroke-[2.5]" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Live Operations
                </CardTitle>
                <Badge className="bg-emerald-500 text-white font-bold text-[10px] px-2 py-0.5 animate-pulse">
                  18 Active
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time GPS telemetry & fleet movement
              </p>
            </div>
          </div>

          <Link
            to="/trips"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0"
          >
            All Trips <ChevronRight size={13} />
          </Link>
        </div>
      </CardHeader>

      <CardContent className="p-3 flex-1 overflow-y-auto space-y-3 max-h-[300px]">
        {LIVE_TRIPS.map(trip => (
          <div
            key={trip.id}
            onClick={() => setSelectedTrip(trip)}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              selectedTrip.id === trip.id
                ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-700/80 shadow-xs ring-1 ring-emerald-500/20'
                : 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                  {trip.ref_id}
                </span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {trip.plateNumber}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <Navigation size={12} className="rotate-45" />
                <span>{trip.speed} km/h</span>
              </div>
            </div>

            {/* Route */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <span className="truncate">{trip.origin}</span>
              <ArrowRight size={12} className="text-slate-400 shrink-0" />
              <span className="truncate">{trip.destination}</span>
            </div>

            {/* Progress Bar */}
            <div className="mt-2.5 space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-500 dark:text-slate-400">
                  {trip.statusLabel}
                </span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {trip.progressPercent}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-slate-200/80 dark:bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                  style={{ width: `${trip.progressPercent}%` }}
                />
              </div>
            </div>

            {/* Driver & ETA Footer */}
            <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
              <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1">
                <Truck size={12} />
                {trip.driverName}
              </span>
              <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1">
                <Clock size={11} />
                ETA: {trip.eta}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
