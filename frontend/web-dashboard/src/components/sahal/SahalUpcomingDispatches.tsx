import { useState } from 'react';
import {
  CalendarDays,
  Clock,
  UserCheck,
  UserX,
  ArrowRight,
  Package,
  Sparkles,
  PlaneTakeoff,
  Building,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

interface UpcomingTrip {
  id: string;
  ref_id: string;
  customerName: string;
  origin: string;
  destination: string;
  scheduledTime: string;
  timeTag: string;
  cargoType: string;
  assignedDriver?: string;
  assignedVehicle?: string;
  status: 'Ready' | 'NeedsDriver' | 'Draft';
}

const UPCOMING_TRIPS: UpcomingTrip[] = [
  {
    id: 'up-1',
    ref_id: 'SCH-802',
    customerName: 'SABIC Petrochem',
    origin: 'Jubail Industrial',
    destination: 'Riyadh Dry Port',
    scheduledTime: 'Today 17:30',
    timeTag: 'in 1h 15m',
    cargoType: 'Polymer Pellets (24T)',
    assignedDriver: 'Khalid Al-Harbi',
    assignedVehicle: 'TRK-440',
    status: 'Ready',
  },
  {
    id: 'up-2',
    ref_id: 'SCH-803',
    customerName: 'Almarai Foods',
    origin: 'Al Kharj Plant',
    destination: 'Dammam Cold Hub',
    scheduledTime: 'Today 19:00',
    timeTag: 'in 2h 45m',
    cargoType: 'Chilled Dairy (18T)',
    assignedDriver: 'Omar Sayed',
    assignedVehicle: 'TRK-205',
    status: 'Ready',
  },
  {
    id: 'up-3',
    ref_id: 'SCH-804',
    customerName: 'Panda Retail',
    origin: 'Jeddah Center',
    destination: 'Taif Depot',
    scheduledTime: 'Tomorrow 06:00',
    timeTag: 'Tomorrow Morning',
    cargoType: 'Dry Groceries (12T)',
    status: 'NeedsDriver',
  },
];

export default function SahalUpcomingDispatches() {
  const [trips, setTrips] = useState<UpcomingTrip[]>(UPCOMING_TRIPS);

  const handleAssign = (tripId: string) => {
    toast.success('Driver auto-assigned via Sahal Smart Match');
    setTrips(prev =>
      prev.map(t =>
        t.id === tripId
          ? {
              ...t,
              status: 'Ready',
              assignedDriver: 'Sultan Al-Dosari',
              assignedVehicle: 'TRK-552',
            }
          : t
      )
    );
  };

  return (
    <div className="rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-b from-white via-slate-50/50 to-white dark:from-slate-900 dark:via-slate-900/90 dark:to-slate-950 p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-60 h-60 bg-purple-500/5 dark:bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header bar */}
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
              <CalendarDays size={20} className="stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white tracking-tight">
                  Flight-Board Queue
                </h2>
                <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-bold text-[10px] px-2 py-0.5">
                  {trips.length} Dispatches
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Scheduled departures for the next 24 hours
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduled Dispatches List */}
      <div className="my-4 space-y-2.5 flex-1 overflow-y-auto max-h-[260px] relative z-10">
        {trips.map(trip => (
          <div
            key={trip.id}
            className="p-3 rounded-2xl border border-slate-200/70 dark:border-slate-800 bg-white/80 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs"
          >
            {/* Top row */}
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-black text-purple-600 dark:text-purple-400">
                  {trip.ref_id}
                </span>
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                  {trip.customerName}
                </span>
              </div>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider ${
                  trip.status === 'Ready'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse'
                }`}
              >
                {trip.status === 'Ready' ? 'Cleared' : 'Needs Driver'}
              </span>
            </div>

            {/* Lane */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
              <span className="truncate">{trip.origin}</span>
              <ArrowRight size={12} className="text-slate-400 shrink-0" />
              <span className="truncate">{trip.destination}</span>
            </div>

            {/* Countdown & Cargo */}
            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                <Clock size={11} /> {trip.scheduledTime} ({trip.timeTag})
              </span>
              <span className="text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                <Package size={11} /> {trip.cargoType}
              </span>
            </div>

            {/* Assignment action footer */}
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              {trip.status === 'Ready' ? (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                  <UserCheck size={13} className="text-emerald-500" />
                  <span className="font-semibold">{trip.assignedDriver}</span>
                  <span className="text-slate-400 font-mono">({trip.assignedVehicle})</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                  <UserX size={13} />
                  <span>Unassigned</span>
                </div>
              )}

              {trip.status !== 'Ready' && (
                <button
                  onClick={() => handleAssign(trip.id)}
                  className="px-2.5 py-1 text-xs font-bold rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-all shadow-xs cursor-pointer"
                >
                  Auto Match
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
