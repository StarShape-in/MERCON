import { useState } from 'react';
import {
  CalendarDays,
  Clock,
  UserCheck,
  UserX,
  ArrowRight,
  Package,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
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
    customerName: 'SABIC Petrochemicals',
    origin: 'Jubail Industrial 1',
    destination: 'Riyadh Dry Port',
    scheduledTime: 'Today 17:30',
    timeTag: 'In 1 hr 15m',
    cargoType: 'Chemical Pellets (24T)',
    assignedDriver: 'Khalid Al-Harbi',
    assignedVehicle: 'TRK-440',
    status: 'Ready',
  },
  {
    id: 'up-2',
    ref_id: 'SCH-803',
    customerName: 'Almarai Logistics',
    origin: 'Al Kharj Dairy Plant',
    destination: 'Dammam Cold Hub',
    scheduledTime: 'Today 19:00',
    timeTag: 'In 2 hrs 45m',
    cargoType: 'Chilled Dairy (18T)',
    assignedDriver: 'Omar Sayed',
    assignedVehicle: 'TRK-205',
    status: 'Ready',
  },
  {
    id: 'up-3',
    ref_id: 'SCH-804',
    customerName: 'Panda Retail Logistics',
    origin: 'Jeddah Distribution Center',
    destination: 'Taif Regional Depot',
    scheduledTime: 'Tomorrow 06:00',
    timeTag: 'Tomorrow Morning',
    cargoType: 'Dry Groceries (12T)',
    status: 'NeedsDriver',
  },
  {
    id: 'up-4',
    ref_id: 'SCH-805',
    customerName: 'Saudi Aramco Logistics',
    origin: 'Ras Tanura Terminal',
    destination: 'Dhahran HQ',
    scheduledTime: 'Tomorrow 08:30',
    timeTag: 'Tomorrow Morning',
    cargoType: 'Heavy Drilling Equipment',
    assignedDriver: 'Mansoor Bilal',
    assignedVehicle: 'TRK-901',
    status: 'Ready',
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
    <Card className="border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-sm rounded-2xl overflow-hidden backdrop-blur-sm flex flex-col">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500/15 to-pink-500/15 dark:from-purple-500/25 dark:to-pink-500/25 flex items-center justify-center border border-purple-500/20 text-purple-600 dark:text-purple-400">
              <CalendarDays size={18} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Upcoming Dispatches
                </CardTitle>
                <Badge variant="outline" className="text-[10px] font-bold bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800">
                  {trips.length} Scheduled
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Next 24–48 hours scheduled transport queue
              </p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-3 flex-1 overflow-y-auto space-y-2.5 max-h-[300px]">
        {trips.map(trip => (
          <div
            key={trip.id}
            className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                  {trip.ref_id}
                </span>
                <span className="text-[11px] font-medium text-slate-500 truncate max-w-[140px]">
                  {trip.customerName}
                </span>
              </div>
              <Badge
                variant="outline"
                className={`text-[9px] px-1.5 py-0 font-semibold ${
                  trip.status === 'Ready'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800'
                    : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800 animate-pulse'
                }`}
              >
                {trip.status === 'Ready' ? 'Ready to Roll' : 'Assign Driver'}
              </Badge>
            </div>

            {/* Lane */}
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
              <span className="truncate">{trip.origin}</span>
              <ArrowRight size={12} className="text-slate-400 shrink-0" />
              <span className="truncate">{trip.destination}</span>
            </div>

            {/* Timing & Cargo */}
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 text-purple-600 dark:text-purple-400 font-semibold">
                <Clock size={11} />
                {trip.scheduledTime} ({trip.timeTag})
              </span>
              <span className="truncate flex items-center gap-1">
                <Package size={11} />
                {trip.cargoType}
              </span>
            </div>

            {/* Assignment row */}
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              {trip.status === 'Ready' ? (
                <div className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                  <UserCheck size={12} className="text-emerald-500" />
                  <span>{trip.assignedDriver}</span>
                  <span className="text-slate-400">({trip.assignedVehicle})</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  <UserX size={12} />
                  <span>No driver assigned</span>
                </div>
              )}

              {trip.status !== 'Ready' && (
                <button
                  onClick={() => handleAssign(trip.id)}
                  className="px-2 py-0.5 text-xs font-semibold rounded-md bg-[#E8450F] text-white hover:bg-[#C7380A] transition-colors cursor-pointer shadow-xs"
                >
                  Quick Assign
                </button>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
