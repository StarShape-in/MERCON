import { useState, useMemo, useRef } from 'react';
import {
  Building2,
  Clock,
  Send,
  MapPin,
  Truck,
  CheckCircle2,
  AlertTriangle,
  Search,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  SlidersHorizontal,
  Package,
} from 'lucide-react';
import { Trip, TripStatus } from '@/services/tripService';
import TripKanbanCard from './TripKanbanCard';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface CompanyTripKanbanBoardProps {
  trips: Trip[];
  companies?: string[];
  onStatusChange: (trip: Trip, newStatus: TripStatus) => void;
  onLogDelay?: (trip: Trip) => void;
  onShareWhatsapp?: (trip: Trip) => void;
  onDelete?: (trip: Trip) => void;
  onCreateTrip?: () => void;
  isLoading?: boolean;
  isError?: boolean;
  onRetry?: () => void;
  statusFilter?: string;
  onStatusFilterChange?: (status: string) => void;
}

const STATUS_FILTER_OPTIONS = [
  { label: 'All Statuses', value: 'all' },
  { label: 'Scheduled', value: 'Draft' },
  { label: 'Dispatched', value: 'Dispatched' },
  { label: 'Loading (At Pickup)', value: 'AtPickup' },
  { label: 'In Transit', value: 'InTransit' },
  { label: 'At Delivery', value: 'AtDelivery' },
  { label: 'Delayed', value: 'Delayed' },
  { label: 'Completed', value: 'Completed' },
];

export default function CompanyTripKanbanBoard({
  trips,
  companies,
  onStatusChange,
  onLogDelay,
  onShareWhatsapp,
  onDelete,
  onCreateTrip,
  isLoading,
  isError,
  onRetry,
  statusFilter = 'all',
  onStatusFilterChange,
}: CompanyTripKanbanBoardProps) {
  const [internalStatusFilter, setInternalStatusFilter] = useState<string>('all');
  const activeStatusFilter = onStatusFilterChange ? statusFilter : internalStatusFilter;
  const handleStatusFilterChange = (val: string) => {
    if (onStatusFilterChange) {
      onStatusFilterChange(val);
    } else {
      setInternalStatusFilter(val);
    }
  };

  const [columnSearch, setColumnSearch] = useState<Record<string, string>>({});
  const [columnPages, setColumnPages] = useState<Record<string, number>>({});
  const [cardsPerPage, setCardsPerPage] = useState<number>(10);
  const [density, setDensity] = useState<'compact' | 'normal' | 'expanded'>('normal');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Filter trips by status filter
  const statusFilteredTrips = useMemo(() => {
    if (activeStatusFilter === 'all') return trips;
    const nowMs = Date.now();

    return trips.filter((t) => {
      if (activeStatusFilter === 'Delayed') {
        const isDelayed =
          ['Dispatched', 'AtPickup', 'InTransit', 'AtDelivery'].includes(t.status) &&
          t.planned_end != null &&
          new Date(t.planned_end).getTime() < nowMs;
        return isDelayed;
      }
      return t.status === activeStatusFilter;
    });
  }, [trips, activeStatusFilter]);

  // Group trips dynamically by company/customer name
  const companyGroups = useMemo(() => {
    const map = new Map<string, Trip[]>();

    if (companies && companies.length > 0) {
      companies.forEach((c) => {
        if (c && c !== 'all') {
          map.set(c, []);
        }
      });
    }

    statusFilteredTrips.forEach((trip) => {
      const companyName = trip.customer?.name || (trip as any).customerName || 'General Logistics';
      if (!map.has(companyName)) {
        map.set(companyName, []);
      }
      map.get(companyName)!.push(trip);
    });

    // Sort: companies with trips first, then alphabetically
    const sorted = Array.from(map.entries()).sort((a, b) => {
      if (b[1].length !== a[1].length) {
        return b[1].length - a[1].length;
      }
      return a[0].localeCompare(b[0]);
    });
    return sorted;
  }, [statusFilteredTrips, companies]);

  // Horizontal track scrolling
  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const offset = direction === 'left' ? -340 : 340;
    scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!scrollContainerRef.current) return;
    if (e.deltaY !== 0 && Math.abs(e.deltaX) < Math.abs(e.deltaY)) {
      scrollContainerRef.current.scrollLeft += e.deltaY;
    }
  };

  const columnWidthClass =
    density === 'compact'
      ? 'w-[260px] min-w-[260px]'
      : density === 'expanded'
      ? 'w-[360px] min-w-[360px]'
      : 'w-[310px] min-w-[310px]';

  return (
    <div className="flex flex-col h-full w-full gap-3 select-none">
      {/* ── Sub-Controls Toolbar (Matches Design Screenshot) ──────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap shrink-0 px-1">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Zoom / Scale Density Pill */}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shrink-0">
            <button
              type="button"
              onClick={() => setDensity('compact')}
              className={cn(
                'px-2 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer',
                density === 'compact'
                  ? 'bg-white dark:bg-slate-700 text-brand font-black shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              )}
              title="Compact Cards"
            >
              <ZoomOut size={12} />
              <span>Scale Down</span>
            </button>

            <button
              type="button"
              onClick={() => setDensity('normal')}
              className={cn(
                'px-2 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer',
                density === 'normal'
                  ? 'bg-white dark:bg-slate-700 text-brand font-black shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              )}
            >
              NORMAL ({cardsPerPage === 9999 ? 'ALL' : cardsPerPage}/COL)
            </button>

            <button
              type="button"
              onClick={() => setDensity('expanded')}
              className={cn(
                'px-2 py-1 text-[11px] font-bold rounded-md transition-all flex items-center gap-1 cursor-pointer',
                density === 'expanded'
                  ? 'bg-white dark:bg-slate-700 text-brand font-black shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              )}
              title="Expanded Cards"
            >
              <ZoomIn size={12} />
              <span>Scale Up</span>
            </button>
          </div>

          {/* Cards Per Column Selector Pill */}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">Cards/Col:</span>
            {[
              { label: '5', value: 5 },
              { label: '10', value: 10 },
              { label: '25', value: 25 },
              { label: 'All', value: 9999 },
            ].map((opt) => {
              const active = cardsPerPage === opt.value;
              return (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => {
                    setCardsPerPage(opt.value);
                    setColumnPages({});
                  }}
                  className={cn(
                    'px-2 py-0.5 text-[11px] font-extrabold rounded-md transition-all cursor-pointer',
                    active
                      ? 'bg-white dark:bg-slate-700 text-brand font-black shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                  )}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Area: Scroll < > Navigation */}
        <div className="flex items-center gap-1 shrink-0 ml-auto">
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

      {/* ── Scrollable Company Columns Track ──────────────────────── */}
      <div
        ref={scrollContainerRef}
        onWheel={handleWheel}
        className="flex-1 overflow-x-auto overflow-y-hidden p-1 pb-4 flex gap-4 min-h-0 snap-x custom-scrollbar select-none"
      >
        {isLoading ? (
          <div className="flex gap-4 w-full py-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className={cn('h-80 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse border border-slate-200/60', columnWidthClass)} />
            ))}
          </div>
        ) : isError ? (
          <div className="w-full flex-1 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-rose-200 dark:border-rose-900/50 rounded-2xl my-2">
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
        ) : companyGroups.length === 0 ? (
          <div className="w-full flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400 dark:text-slate-600 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl my-2">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-900/50 flex items-center justify-center mb-3">
              <Building2 className="w-6 h-6 text-brand" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-700 dark:text-slate-300">No active trips found</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
              There are no dispatches matching the current date, company, or status filter.
            </p>
          </div>
        ) : (
          companyGroups.map(([companyName, rawColTrips]) => {
            const filterTerm = (columnSearch[companyName] || '').toLowerCase().trim();

            const colTrips = filterTerm
              ? rawColTrips.filter(
                  (t) =>
                    t.ref_id.toLowerCase().includes(filterTerm) ||
                    (t.driver && `${t.driver.first_name} ${t.driver.last_name}`.toLowerCase().includes(filterTerm)) ||
                    (t.vehicle?.plate_number && t.vehicle.plate_number.toLowerCase().includes(filterTerm))
                )
              : rawColTrips;

            // Pagination logic per company column
            const colTotalPages = cardsPerPage === 9999 ? 1 : Math.ceil(colTrips.length / cardsPerPage) || 1;
            const colCurrentPage = Math.min(columnPages[companyName] || 1, colTotalPages);
            const startIndex = (colCurrentPage - 1) * cardsPerPage;
            const displayedColTrips = cardsPerPage === 9999 ? colTrips : colTrips.slice(startIndex, startIndex + cardsPerPage);

            return (
              <div
                key={companyName}
                className={cn(
                  'flex flex-col h-full rounded-2xl border transition-all snap-start bg-slate-100/75 dark:bg-slate-900/50 border-slate-200/90 dark:border-slate-800 shadow-2xs',
                  columnWidthClass
                )}
              >
                {/* 🏢 Company Column Sticky Header */}
                <div className="p-3 rounded-t-2xl border-b border-indigo-100 dark:border-indigo-950/80 bg-indigo-50/80 dark:bg-indigo-950/40 flex flex-col gap-2 shrink-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="p-1 rounded-md bg-indigo-600 text-white shrink-0 shadow-2xs">
                        <Building2 size={13} />
                      </div>
                      <span className="font-extrabold text-xs text-slate-900 dark:text-slate-100 truncate" title={companyName}>
                        {companyName}
                      </span>
                    </div>

                    <span className="font-mono text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-600 text-white shadow-2xs border border-indigo-700 shrink-0">
                      {rawColTrips.length}
                    </span>
                  </div>
                </div>

                {/* Column Scrollable Cards Body */}
                <div className="flex-1 overflow-y-auto p-2.5 flex flex-col gap-2.5 min-h-0 custom-scrollbar">
                  {displayedColTrips.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-400 dark:text-slate-600 border-2 border-dashed border-slate-200/60 dark:border-slate-800/60 rounded-xl my-1">
                      <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2">
                        <Package size={16} className="text-slate-400" />
                      </div>
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">No trips</span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                        No trips for this status
                      </span>
                    </div>
                  ) : (
                    displayedColTrips.map((trip) => (
                      <TripKanbanCard
                        key={trip.id}
                        trip={trip}
                        onStatusChange={onStatusChange}
                        onLogDelay={onLogDelay}
                        onShareWhatsapp={onShareWhatsapp}
                        onDelete={onDelete}
                        density={density}
                        hideCustomer={true}
                      />
                    ))
                  )}
                </div>

                {/* Column Pagination Bar Footer */}
                {colTotalPages > 1 && (
                  <div className="px-3 py-2 border-t border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-b-2xl flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400 shrink-0 shadow-2xs">
                    <span className="font-mono text-[10px] text-slate-500">
                      Pg <strong className="text-slate-800 dark:text-slate-200">{colCurrentPage}</strong>/{colTotalPages} ({colTrips.length} total)
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={colCurrentPage <= 1}
                        onClick={() => setColumnPages((prev) => ({ ...prev, [companyName]: Math.max(1, colCurrentPage - 1) }))}
                        className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded disabled:opacity-30 cursor-pointer"
                        title="Previous Page"
                      >
                        <ChevronLeft size={13} />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={colCurrentPage >= colTotalPages}
                        onClick={() => setColumnPages((prev) => ({ ...prev, [companyName]: Math.min(colTotalPages, colCurrentPage + 1) }))}
                        className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-800 rounded disabled:opacity-30 cursor-pointer"
                        title="Next Page"
                      >
                        <ChevronRight size={13} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
