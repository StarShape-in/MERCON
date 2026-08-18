import { useState, useMemo } from 'react';
import {
  Clock,
  Send,
  MapPin,
  Truck,
  CheckCircle2,
  FileText,
  XCircle,
  Search,
  Plus,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { Trip, TripStatus } from '@/services/tripService';
import TripKanbanCard from './TripKanbanCard';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export interface TripKanbanBoardProps {
  trips: Trip[];
  onStatusChange: (trip: Trip, newStatus: TripStatus) => void;
  onLogDelay?: (trip: Trip) => void;
  onShareWhatsapp?: (trip: Trip) => void;
  onDelete?: (trip: Trip) => void;
  onCreateTrip?: () => void;
  isLoading?: boolean;
}

interface ColumnConfig {
  id: TripStatus;
  label: string;
  icon: any;
  colorClass: string;
  badgeClass: string;
  headerBg: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'Draft',
    label: 'Draft / Unassigned',
    icon: Clock,
    colorClass: 'text-indigo-600 dark:text-indigo-400',
    badgeClass: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    headerBg: 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200/60 dark:border-indigo-900/40',
  },
  {
    id: 'Dispatched',
    label: 'Dispatched',
    icon: Send,
    colorClass: 'text-blue-600 dark:text-blue-400',
    badgeClass: 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    headerBg: 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200/60 dark:border-blue-900/40',
  },
  {
    id: 'AtPickup',
    label: 'At Pickup',
    icon: MapPin,
    colorClass: 'text-sky-600 dark:text-sky-400',
    badgeClass: 'bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    headerBg: 'bg-sky-50/70 dark:bg-sky-950/30 border-sky-200/60 dark:border-sky-900/40',
  },
  {
    id: 'InTransit',
    label: 'In Transit',
    icon: Truck,
    colorClass: 'text-amber-600 dark:text-amber-400',
    badgeClass: 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    headerBg: 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-900/40',
  },
  {
    id: 'AtDelivery',
    label: 'At Delivery',
    icon: MapPin,
    colorClass: 'text-purple-600 dark:text-purple-400',
    badgeClass: 'bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    headerBg: 'bg-purple-50/70 dark:bg-purple-950/30 border-purple-200/60 dark:border-purple-900/40',
  },
  {
    id: 'Completed',
    label: 'Completed',
    icon: CheckCircle2,
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    headerBg: 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-900/40',
  },
  {
    id: 'Invoiced',
    label: 'Invoiced',
    icon: FileText,
    colorClass: 'text-teal-600 dark:text-teal-400',
    badgeClass: 'bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
    headerBg: 'bg-teal-50/70 dark:bg-teal-950/30 border-teal-200/60 dark:border-teal-900/40',
  },
];

export default function TripKanbanBoard({
  trips,
  onStatusChange,
  onLogDelay,
  onShareWhatsapp,
  onDelete,
  onCreateTrip,
  isLoading,
}: TripKanbanBoardProps) {
  const [dragOverColumn, setDragOverColumn] = useState<TripStatus | null>(null);
  const [columnSearch, setColumnSearch] = useState<Record<string, string>>({});

  // Group trips by status
  const groupedTrips = useMemo(() => {
    const map: Record<TripStatus, Trip[]> = {
      Draft: [],
      Dispatched: [],
      AtPickup: [],
      InTransit: [],
      AtDelivery: [],
      Completed: [],
      Invoiced: [],
      Cancelled: [],
    };

    trips.forEach((t) => {
      if (map[t.status]) {
        map[t.status].push(t);
      } else {
        map.Draft.push(t);
      }
    });

    return map;
  }, [trips]);

  const handleDragOver = (e: React.DragEvent, colId: TripStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== colId) {
      setDragOverColumn(colId);
    }
  };

  const handleDragLeave = (colId: TripStatus) => {
    if (dragOverColumn === colId) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TripStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const tripId = e.dataTransfer.getData('text/plain');
    if (!tripId) return;

    const trip = trips.find((t) => t.id === tripId);
    if (trip && trip.status !== targetStatus) {
      onStatusChange(trip, targetStatus);
    }
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 overflow-hidden">
      {/* Scrollable Column Track Container */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-1 pb-4 flex gap-4 min-h-0 snap-x">
        {COLUMNS.map((col) => {
          const Icon = col.icon;
          const rawColTrips = groupedTrips[col.id] || [];
          const filterTerm = (columnSearch[col.id] || '').toLowerCase().trim();

          const colTrips = filterTerm
            ? rawColTrips.filter(
                (t) =>
                  t.ref_id.toLowerCase().includes(filterTerm) ||
                  (t.customer?.name && t.customer.name.toLowerCase().includes(filterTerm)) ||
                  (t.driver && `${t.driver.first_name} ${t.driver.last_name}`.toLowerCase().includes(filterTerm)) ||
                  (t.vehicle?.plate_number && t.vehicle.plate_number.toLowerCase().includes(filterTerm))
              )
            : rawColTrips;

          const totalFinancials = rawColTrips.reduce((sum, t) => {
            const amt = t.billing_amount ?? t.trip_charges ?? t.rateCard?.base_price ?? 0;
            return sum + (Number(amt) || 0);
          }, 0);

          const isOver = dragOverColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={() => handleDragLeave(col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={cn(
                'w-[310px] min-w-[310px] max-w-[310px] flex flex-col h-full rounded-2xl border transition-all select-none snap-start',
                isOver
                  ? 'bg-orange-50/40 dark:bg-orange-950/20 border-brand ring-2 ring-brand/20'
                  : 'bg-slate-50/60 dark:bg-slate-900/40 border-slate-200/80 dark:border-slate-800'
              )}
            >
              {/* Column Sticky Header */}
              <div className={cn('p-3 rounded-t-2xl border-b flex flex-col gap-2 shrink-0', col.headerBg)}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon size={16} className={col.colorClass} />
                    <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200 truncate">
                      {col.label}
                    </span>
                  </div>

                  <span
                    className={cn(
                      'font-mono text-[11px] font-extrabold px-2 py-0.5 rounded-full border shrink-0',
                      col.badgeClass
                    )}
                  >
                    {rawColTrips.length}
                  </span>
                </div>

                {/* Financial Summary & Column Quick Search */}
                <div className="flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 pt-0.5">
                  <span className="truncate">
                    Total: <strong className="font-mono text-slate-900 dark:text-slate-200 font-bold">SAR {totalFinancials.toLocaleString('en-US')}</strong>
                  </span>
                </div>
              </div>

              {/* Column Scrollable Cards Body */}
              <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2.5 min-h-0 custom-scrollbar">
                {isLoading ? (
                  <div className="flex flex-col gap-3 py-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-28 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
                    ))}
                  </div>
                ) : colTrips.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 dark:text-slate-600 border-2 border-dashed border-slate-200/60 dark:border-slate-800/60 rounded-xl my-1">
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2">
                      <Icon size={16} className="text-slate-400" />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">No trips</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      Drag a card here to set status
                    </span>
                  </div>
                ) : (
                  colTrips.map((trip) => (
                    <TripKanbanCard
                      key={trip.id}
                      trip={trip}
                      onStatusChange={onStatusChange}
                      onLogDelay={onLogDelay}
                      onShareWhatsapp={onShareWhatsapp}
                      onDelete={onDelete}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
