import { useState, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
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
  ChevronLeft,
  ChevronRight,
  MoveHorizontal,
  Layers,
  ZoomIn,
  ZoomOut,
  AlertTriangle,
  Siren,
} from 'lucide-react';
import { Trip, TripStatus } from '@/services/tripService';
import TripKanbanCard from './TripKanbanCard';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface TripKanbanBoardRef {
  scroll: (direction: 'left' | 'right') => void;
}

export interface TripKanbanBoardProps {
  trips: Trip[];
  onStatusChange: (trip: Trip, newStatus: TripStatus) => void;
  onLogDelay?: (trip: Trip) => void;
  onShareWhatsapp?: (trip: Trip) => void;
  onDelete?: (trip: Trip) => void;
  onCreateTrip?: () => void;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  zoomLevel?: 'fit' | 'normal' | 'in';
}

interface ColumnConfig {
  id: TripStatus | 'Delayed';
  label: string;
  icon: any;
  accentColor: string;
  dotColor: string;
  badgeClass: string;
  columnBg: string;
  headerBg: string;
  headerBorder: string;
  emptyBg: string;
  emptyIconBg: string;
  showMoreClass: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'Draft',
    label: 'Scheduled',
    icon: Clock,
    accentColor: 'text-indigo-600 dark:text-indigo-400',
    dotColor: 'bg-indigo-500',
    badgeClass: 'bg-indigo-100/90 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 border-indigo-200/90 dark:border-indigo-700/60',
    columnBg: 'bg-indigo-50/45 dark:bg-indigo-950/25 border-indigo-200/80 dark:border-indigo-900/50',
    headerBg: 'bg-indigo-100/50 dark:bg-indigo-950/60',
    headerBorder: 'border-indigo-200/80 dark:border-indigo-800/60',
    emptyBg: 'border-indigo-200/70 dark:border-indigo-900/50 bg-white/60 dark:bg-indigo-950/30',
    emptyIconBg: 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-200/90 dark:border-indigo-800',
    showMoreClass: 'border-indigo-200/90 hover:border-indigo-300 bg-white hover:bg-indigo-50/60 text-indigo-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-indigo-300',
  },
  {
    id: 'AtPickup',
    label: 'Loading',
    icon: MapPin,
    accentColor: 'text-sky-600 dark:text-sky-400',
    dotColor: 'bg-sky-500',
    badgeClass: 'bg-sky-100/90 text-sky-700 dark:bg-sky-900/60 dark:text-sky-300 border-sky-200/90 dark:border-sky-700/60',
    columnBg: 'bg-sky-50/45 dark:bg-sky-950/25 border-sky-200/80 dark:border-sky-900/50',
    headerBg: 'bg-sky-100/50 dark:bg-sky-950/60',
    headerBorder: 'border-sky-200/80 dark:border-sky-800/60',
    emptyBg: 'border-sky-200/70 dark:border-sky-900/50 bg-white/60 dark:bg-sky-950/30',
    emptyIconBg: 'bg-sky-50 dark:bg-sky-900/40 border-sky-200/90 dark:border-sky-800',
    showMoreClass: 'border-sky-200/90 hover:border-sky-300 bg-white hover:bg-sky-50/60 text-sky-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-sky-300',
  },
  {
    id: 'InTransit',
    label: 'In Transit',
    icon: Truck,
    accentColor: 'text-amber-600 dark:text-amber-400',
    dotColor: 'bg-amber-500',
    badgeClass: 'bg-amber-100/90 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border-amber-200/90 dark:border-amber-700/60',
    columnBg: 'bg-amber-50/45 dark:bg-amber-950/25 border-amber-200/80 dark:border-amber-900/50',
    headerBg: 'bg-amber-100/50 dark:bg-amber-950/60',
    headerBorder: 'border-amber-200/80 dark:border-amber-800/60',
    emptyBg: 'border-amber-200/70 dark:border-amber-900/50 bg-white/60 dark:bg-amber-950/30',
    emptyIconBg: 'bg-amber-50 dark:bg-amber-900/40 border-amber-200/90 dark:border-amber-800',
    showMoreClass: 'border-amber-200/90 hover:border-amber-300 bg-white hover:bg-amber-50/60 text-amber-800 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-amber-300',
  },
  {
    id: 'Delayed',
    label: 'Delayed',
    icon: AlertTriangle,
    accentColor: 'text-rose-600 dark:text-rose-400',
    dotColor: 'bg-rose-500',
    badgeClass: 'bg-rose-100/90 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300 border-rose-200/90 dark:border-rose-700/60',
    columnBg: 'bg-rose-50/45 dark:bg-rose-950/25 border-rose-200/80 dark:border-rose-900/50',
    headerBg: 'bg-rose-100/50 dark:bg-rose-950/60',
    headerBorder: 'border-rose-200/80 dark:border-rose-800/60',
    emptyBg: 'border-rose-200/70 dark:border-rose-900/50 bg-white/60 dark:bg-rose-950/30',
    emptyIconBg: 'bg-rose-50 dark:bg-rose-900/40 border-rose-200/90 dark:border-rose-800',
    showMoreClass: 'border-rose-200/90 hover:border-rose-300 bg-white hover:bg-rose-50/60 text-rose-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-rose-300',
  },
  {
    id: 'Emergency' as any,
    label: 'Emergency',
    icon: Siren,
    accentColor: 'text-red-700 dark:text-red-400',
    dotColor: 'bg-red-600',
    badgeClass: 'bg-red-100/90 text-red-800 dark:bg-red-900/60 dark:text-red-300 border-red-200/90 dark:border-red-700/60',
    columnBg: 'bg-red-50/45 dark:bg-red-950/25 border-red-200/80 dark:border-red-900/50',
    headerBg: 'bg-red-100/50 dark:bg-red-950/60',
    headerBorder: 'border-red-200/80 dark:border-red-800/60',
    emptyBg: 'border-red-200/70 dark:border-red-900/50 bg-white/60 dark:bg-red-950/30',
    emptyIconBg: 'bg-red-50 dark:bg-red-900/40 border-red-200/90 dark:border-red-800',
    showMoreClass: 'border-red-200/90 hover:border-red-300 bg-white hover:bg-red-50/60 text-red-800 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-red-300',
  },
  {
    id: 'Completed',
    label: 'Completed',
    icon: CheckCircle2,
    accentColor: 'text-emerald-600 dark:text-emerald-400',
    dotColor: 'bg-emerald-500',
    badgeClass: 'bg-emerald-100/90 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-200/90 dark:border-emerald-700/60',
    columnBg: 'bg-emerald-50/45 dark:bg-emerald-950/25 border-emerald-200/80 dark:border-emerald-900/50',
    headerBg: 'bg-emerald-100/50 dark:bg-emerald-950/60',
    headerBorder: 'border-emerald-200/80 dark:border-emerald-800/60',
    emptyBg: 'border-emerald-200/70 dark:border-emerald-900/50 bg-white/60 dark:bg-emerald-950/30',
    emptyIconBg: 'bg-emerald-50 dark:bg-emerald-900/40 border-emerald-200/90 dark:border-emerald-800',
    showMoreClass: 'border-emerald-200/90 hover:border-emerald-300 bg-white hover:bg-emerald-50/60 text-emerald-700 dark:bg-slate-900 dark:hover:bg-slate-800 dark:text-emerald-300',
  },
];

const TripKanbanBoard = forwardRef<TripKanbanBoardRef, TripKanbanBoardProps>(function TripKanbanBoard(
  {
    trips,
    onStatusChange,
    onLogDelay,
    onShareWhatsapp,
    onDelete,
    onCreateTrip,
    isLoading,
    isError,
    onRetry,
    zoomLevel = 'fit',
  },
  ref
) {
  const [dragOverColumn, setDragOverColumn] = useState<TripStatus | 'Delayed' | null>(null);
  const [columnSearch, setColumnSearch] = useState<Record<string, string>>({});
  const [visibleLimits, setVisibleLimits] = useState<Record<string, number>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Group trips by column category
  const groupedTrips = useMemo(() => {
    const map: Record<TripStatus | 'Delayed', Trip[]> = {
      Draft: [],
      Dispatched: [],
      AtPickup: [],
      InTransit: [],
      AtDelivery: [],
      Completed: [],
      Invoiced: [],
      Cancelled: [],
      Delayed: [],
    };

    const nowMs = Date.now();

    trips.forEach((t) => {
      // 1. Check if the trip is an emergency
      if (t.status === 'Emergency' || (t as any).isEmergency) {
        map.Emergency.push(t);
        return;
      }

      // 2. Check if the trip is active and overdue (delayed)
      const isDelayed =
        ['Scheduled', 'Loading', 'InTransit', 'AtPickup', 'Dispatched', 'AtDelivery'].includes(t.status) &&
        t.planned_end != null &&
        new Date(t.planned_end).getTime() < nowMs;

      if (isDelayed || t.status === 'Delayed') {
        map.Delayed.push(t);
      } else if (t.status === 'Draft' || t.status === 'Scheduled' || t.status === 'Dispatched' || t.status === 'Cancelled') {
        map.Draft.push(t); // Scheduled Column
      } else if (t.status === 'AtPickup' || t.status === 'Loading') {
        map.AtPickup.push(t); // Loading Column
      } else if (t.status === 'InTransit') {
        map.InTransit.push(t); // In Transit Column
      } else if (t.status === 'AtDelivery' || t.status === 'Completed' || t.status === 'Invoiced') {
        map.Completed.push(t); // Completed Column
      } else {
        map.Draft.push(t);
      }
    });

    return map;
  }, [trips]);

  const handleDragOver = (e: React.DragEvent, colId: TripStatus | 'Delayed') => {
    if (colId === 'Delayed') return; // Read-only calculated column
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== colId) {
      setDragOverColumn(colId);
    }
  };

  const handleDragLeave = (colId: TripStatus | 'Delayed') => {
    if (dragOverColumn === colId) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStatus: TripStatus | 'Delayed') => {
    e.preventDefault();
    setDragOverColumn(null);
    if (targetStatus === 'Delayed') return; // Read-only calculated column
    const tripId = e.dataTransfer.getData('text/plain');
    if (!tripId) return;

    const trip = trips.find((t) => t.id === tripId);
    if (trip && trip.status !== targetStatus) {
      onStatusChange(trip, targetStatus);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useImperativeHandle(ref, () => ({
    scroll,
  }));

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollContainerRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  const columnWidthClass =
    zoomLevel === 'fit'
      ? 'flex-1 min-w-[210px]'
      : zoomLevel === 'normal'
      ? 'w-[290px] min-w-[290px] max-w-[290px]'
      : 'w-[360px] min-w-[360px] max-w-[360px]';

  const cardDensity =
    zoomLevel === 'fit' ? 'compact' : zoomLevel === 'normal' ? 'normal' : 'expanded';

  return (
    <div className="w-full h-full flex flex-col min-h-0 overflow-hidden">

      {/* Scrollable Column Track Container */}
      {isError ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-rose-200 dark:border-rose-900/50 rounded-2xl my-2">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/50 flex items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6 text-rose-500" />
          </div>
          <h3 className="text-sm font-extrabold text-rose-700 dark:text-rose-400">Failed to load trips</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
            This can happen on a slow or unstable connection.
          </p>
          {onRetry && (
            <Button size="sm" variant="outline" className="mt-3 h-8 text-xs font-bold" onClick={onRetry}>
              Retry
            </Button>
          )}
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          onWheel={handleWheel}
          className="flex-1 overflow-x-auto overflow-y-hidden p-1 pb-4 flex gap-4 min-h-0 snap-x custom-scrollbar select-none"
        >
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

            // Limit visible cards in column. Defaults to showing 10 cards.
            const limit = visibleLimits[col.id] ?? 10;
            const displayedColTrips = colTrips.slice(0, limit);

            const isOver = dragOverColumn === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={() => handleDragLeave(col.id)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={cn(
                  'flex flex-col h-full rounded-2xl border transition-all snap-start shadow-2xs',
                  columnWidthClass,
                  isOver
                    ? 'bg-orange-50/60 dark:bg-orange-950/30 border-brand ring-2 ring-brand/30'
                    : col.columnBg
                )}
              >
                {/* Column Sticky Header */}
                <div
                  className={cn(
                    'px-3.5 py-3 rounded-t-2xl border-b backdrop-blur-xs flex items-center justify-between gap-2 shrink-0',
                    col.headerBg,
                    col.headerBorder
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn('w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-white dark:ring-slate-900', col.dotColor)} />
                    <Icon size={15} className={col.accentColor} />
                    <span className="font-extrabold text-[13px] text-slate-900 dark:text-slate-100 tracking-tight truncate">
                      {col.label}
                    </span>
                  </div>

                  <span
                    className={cn(
                      'font-mono text-[11px] font-bold px-2 py-0.5 rounded-full border shrink-0',
                      col.badgeClass
                    )}
                  >
                    {rawColTrips.length} {rawColTrips.length === 1 ? 'Trip' : 'Trips'}
                  </span>
                </div>

                {/* Column Scrollable Cards Body */}
                <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2.5 min-h-0 custom-scrollbar">
                  {isLoading ? (
                    <div className="flex flex-col gap-3 py-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-28 rounded-xl bg-white/60 dark:bg-slate-800/60 animate-pulse border border-slate-200/50" />
                      ))}
                    </div>
                  ) : displayedColTrips.length === 0 ? (
                    <div
                      className={cn(
                        'flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 dark:text-slate-600 border-2 border-dashed rounded-xl my-1',
                        col.emptyBg
                      )}
                    >
                      <div className={cn('w-9 h-9 rounded-xl border flex items-center justify-center mb-2 shadow-3xs', col.emptyIconBg)}>
                        <Icon size={16} className={col.accentColor} />
                      </div>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">No {col.label} Trips</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        Drag a trip card here to update stage
                      </span>
                    </div>
                  ) : (
                    <>
                      {displayedColTrips.map((trip) => (
                        <TripKanbanCard
                          key={trip.id}
                          trip={trip}
                          onStatusChange={onStatusChange}
                          onLogDelay={onLogDelay}
                          onShareWhatsapp={onShareWhatsapp}
                          onDelete={onDelete}
                          density={cardDensity}
                        />
                      ))}

                      {colTrips.length > limit && (
                        <Button
                          variant="ghost"
                          onClick={() => setVisibleLimits((prev) => ({ ...prev, [col.id]: limit + 10 }))}
                          className={cn(
                            'w-full mt-1 py-1.5 h-8 border border-dashed rounded-xl text-xs font-bold cursor-pointer shadow-3xs transition-colors',
                            col.showMoreClass
                          )}
                        >
                          Show More (+10)
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default TripKanbanBoard;
