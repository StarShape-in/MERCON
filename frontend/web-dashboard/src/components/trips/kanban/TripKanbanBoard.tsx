import { useState, useMemo, useRef } from 'react';
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
} from 'lucide-react';
import { Trip, TripStatus } from '@/services/tripService';
import TripKanbanCard from './TripKanbanCard';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

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
  id: TripStatus | 'Delayed';
  label: string;
  icon: any;
  colorClass: string;
  badgeClass: string;
  headerBg: string;
}

const COLUMNS: ColumnConfig[] = [
  {
    id: 'Draft',
    label: 'Scheduled',
    icon: Clock,
    colorClass: 'text-indigo-600 dark:text-indigo-400',
    badgeClass: 'bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    headerBg: 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200/60 dark:border-indigo-900/40',
  },
  {
    id: 'AtPickup',
    label: 'Loading',
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
    id: 'Delayed',
    label: 'Delayed',
    icon: AlertTriangle,
    colorClass: 'text-rose-600 dark:text-rose-400',
    badgeClass: 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    headerBg: 'bg-rose-50/70 dark:bg-rose-950/30 border-rose-200/60 dark:border-rose-900/40',
  },
  {
    id: 'Completed',
    label: 'Completed',
    icon: CheckCircle2,
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    headerBg: 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/60 dark:border-emerald-900/40',
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
  const [dragOverColumn, setDragOverColumn] = useState<TripStatus | 'Delayed' | null>(null);
  const [columnSearch, setColumnSearch] = useState<Record<string, string>>({});
  const [visibleLimits, setVisibleLimits] = useState<Record<string, number>>({});
  const [zoomLevel, setZoomLevel] = useState<'fit' | 'normal' | 'in'>('fit');
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
      // 1. Check if the trip is active and overdue (delayed)
      const isDelayed =
        ['Dispatched', 'AtPickup', 'InTransit', 'AtDelivery'].includes(t.status) &&
        t.planned_end != null &&
        new Date(t.planned_end).getTime() < nowMs;

      if (isDelayed) {
        map.Delayed.push(t);
      } else if (t.status === 'Draft' || t.status === 'Cancelled') {
        map.Draft.push(t); // Scheduled Column
      } else if (t.status === 'Dispatched' || t.status === 'AtPickup') {
        map.AtPickup.push(t); // Loading Column
      } else if (t.status === 'InTransit' || t.status === 'AtDelivery') {
        map.InTransit.push(t); // In Transit Column
      } else if (t.status === 'Completed' || t.status === 'Invoiced') {
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

  const handleWheel = (e: React.WheelEvent) => {
    if (scrollContainerRef.current && Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  const handleZoomOut = () => {
    if (zoomLevel === 'in') {
      setZoomLevel('normal');
    } else if (zoomLevel === 'normal') {
      setZoomLevel('fit');
    }
  };

  const handleZoomIn = () => {
    if (zoomLevel === 'fit') {
      setZoomLevel('normal');
    } else if (zoomLevel === 'normal') {
      setZoomLevel('in');
    }
  };

  const columnWidthClass =
    zoomLevel === 'fit'
      ? 'flex-1 min-w-[200px]'
      : zoomLevel === 'normal'
      ? 'w-[290px] min-w-[290px] max-w-[290px]'
      : 'w-[360px] min-w-[360px] max-w-[360px]';

  const cardDensity =
    zoomLevel === 'fit' ? 'compact' : zoomLevel === 'normal' ? 'normal' : 'expanded';

  return (
    <div className="w-full h-full flex flex-col min-h-0 overflow-hidden gap-2">
      {/* Navigation, Zoom & Column Cards-Per-Page Controls Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-1 shrink-0 gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Zoom Out / Zoom In Controls */}
          <div className="inline-flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              disabled={zoomLevel === 'fit'}
              className="h-6 px-2 gap-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 text-[11px] font-bold disabled:opacity-40 cursor-pointer"
              title="Zoom Out (Fit all 5 columns)"
            >
              <ZoomOut size={13} />
              Zoom Out
            </Button>

            <span className="text-[10px] font-extrabold tracking-wider uppercase px-2.5 text-slate-700 dark:text-slate-200 border-x border-slate-200 dark:border-slate-700 min-w-[100px] text-center">
              {zoomLevel === 'fit' ? 'All 5 Columns' : zoomLevel === 'normal' ? 'Normal' : 'Zoomed In'}
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              disabled={zoomLevel === 'in'}
              className="h-6 px-2 gap-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-700 dark:text-slate-200 text-[11px] font-bold disabled:opacity-40 cursor-pointer"
              title="Zoom In (Larger cards)"
            >
              <ZoomIn size={13} />
              Zoom In
            </Button>
          </div>

        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('left')}
            className="h-7 w-7 flex items-center justify-center text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Scroll Left"
          >
            <ChevronLeft size={14} />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('right')}
            className="h-7 w-7 flex items-center justify-center text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-2xs rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Scroll Right"
          >
            <ChevronRight size={14} />
          </Button>
        </div>
      </div>

      {/* Scrollable Column Track Container */}
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
                'flex flex-col h-full rounded-2xl border transition-all snap-start',
                columnWidthClass,
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
              </div>

              {/* Column Scrollable Cards Body */}
              <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2.5 min-h-0 custom-scrollbar">
                {isLoading ? (
                  <div className="flex flex-col gap-3 py-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-28 rounded-xl bg-slate-200/60 dark:bg-slate-800/60 animate-pulse" />
                    ))}
                  </div>
                ) : displayedColTrips.length === 0 ? (
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
                        className="w-full mt-1.5 py-1.5 h-8 border border-dashed border-slate-200/70 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl cursor-pointer shadow-3xs"
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
    </div>
  );
}
