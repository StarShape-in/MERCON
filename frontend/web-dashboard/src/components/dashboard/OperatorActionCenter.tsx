import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Clock, Wrench, ShieldAlert, CheckCircle2,
  Truck, User, MapPin, Eye, FileText, UploadCloud, Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import QuickAssignModal from '@/components/trips/QuickAssignModal';
import { cn } from '@/lib/utils';
import { Trip } from '@/services/tripService';

interface OperatorActionCenterProps {
  trips: Trip[];
  onOpenQuickAssign?: (trip: Trip) => void;
}

export interface ActionItem {
  id: string;
  trip: Trip;
  category: 'unassigned' | 'delayed' | 'location_review' | 'missing_pod';
  severity: 'high' | 'medium' | 'low';
  title: string;
  subtitle: string;
  actionLabel: string;
  actionType: 'assign' | 'view' | 'location' | 'pod';
}

export default function OperatorActionCenter({ trips, onOpenQuickAssign }: OperatorActionCenterProps) {
  const navigate = useNavigate();

  const [assignTargetTrip, setAssignTargetTrip] = useState<Trip | null>(null);
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<'all' | 'unassigned' | 'delayed' | 'location_review' | 'missing_pod'>('all');

  // Derive Action Items directly from real trip records
  const { actionItems, counts } = useMemo(() => {
    const items: ActionItem[] = [];
    let unassignedCount = 0;
    let delayedCount = 0;
    let locationReviewCount = 0;
    let missingPodCount = 0;

    trips.forEach((t) => {
      const tripRef = t.ref_id || `TRIP-${t.id.slice(0, 6).toUpperCase()}`;
      const customerName = t.customer?.name || (t as any).customerName || 'Customer';
      const stops = t.stops || [];
      const origin = stops[0]?.location_name || (t as any).pickup || 'Origin';
      const dest = stops[stops.length - 1]?.location_name || (t as any).dropoff || 'Destination';
      const routeStr = `${origin} → ${dest}`;

      // 1. Unassigned Trips
      const isUnassigned = t.status === 'Draft' || !t.driver || !t.vehicle;
      if (isUnassigned && t.status !== 'Cancelled' && t.status !== 'Completed' && t.status !== 'Invoiced') {
        unassignedCount++;
        const missingText = !t.driver && !t.vehicle ? 'Driver & Vehicle missing' : !t.driver ? 'Driver missing' : 'Vehicle missing';
        items.push({
          id: `unassigned-${t.id}`,
          trip: t,
          category: 'unassigned',
          severity: 'high',
          title: `Needs Resource Assignment`,
          subtitle: `${customerName} • ${routeStr} (${missingText})`,
          actionLabel: 'Assign',
          actionType: 'assign',
        });
      }

      // 2. Delayed Active Trips
      const nowMs = Date.now();
      const isDelayed =
        ['Dispatched', 'AtPickup', 'InTransit', 'AtDelivery', 'Loading'].includes(t.status) &&
        t.planned_end != null &&
        new Date(t.planned_end).getTime() < nowMs;

      if (isDelayed) {
        delayedCount++;
        items.push({
          id: `delayed-${t.id}`,
          trip: t,
          category: 'delayed',
          severity: 'high',
          title: `Active Dispatch Delayed`,
          subtitle: `${customerName} • ${routeStr} (Status: ${t.status})`,
          actionLabel: 'Track',
          actionType: 'view',
        });
      }

      // 3. Location Review Needed (Approximate / Unknown precision)
      const hasApproxLocation = stops.some((s) => s.location_coordinate_precision === 'APPROXIMATE' || s.location_coordinate_precision === 'UNKNOWN');
      if (hasApproxLocation && (t.status === 'Draft' || t.status === 'Dispatched')) {
        locationReviewCount++;
        items.push({
          id: `location-${t.id}`,
          trip: t,
          category: 'location_review',
          severity: 'medium',
          title: `Location Precision Review`,
          subtitle: `${customerName} • ${routeStr} (Approximate/Unknown pin)`,
          actionLabel: 'Review',
          actionType: 'location',
        });
      }

      // 4. Missing POD for Completed Trips
      const isCompletedWithoutPOD = t.status === 'Completed' && (!t.documents || t.documents.length === 0);
      if (isCompletedWithoutPOD) {
        missingPodCount++;
        items.push({
          id: `pod-${t.id}`,
          trip: t,
          category: 'missing_pod',
          severity: 'medium',
          title: `POD Evidence Missing`,
          subtitle: `${customerName} • ${routeStr} (Trip completed without attached POD)`,
          actionLabel: 'Upload POD',
          actionType: 'pod',
        });
      }
    });

    return {
      actionItems: items,
      counts: {
        total: items.length,
        unassigned: unassignedCount,
        delayed: delayedCount,
        locationReview: locationReviewCount,
        missingPod: missingPodCount,
      },
    };
  }, [trips]);

  const filteredItems = useMemo(() => {
    if (activeCategoryFilter === 'all') return actionItems;
    return actionItems.filter((item) => item.category === activeCategoryFilter);
  }, [actionItems, activeCategoryFilter]);

  const handleActionClick = (item: ActionItem) => {
    if (item.actionType === 'assign') {
      if (onOpenQuickAssign) {
        onOpenQuickAssign(item.trip);
      } else {
        setAssignTargetTrip(item.trip);
      }
    } else {
      navigate(`/trips/${item.trip.id}`);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs p-4 flex flex-col justify-between h-full overflow-hidden space-y-3">
      
      {/* Action Center Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/60 flex items-center justify-center font-bold">
            <ShieldAlert className="w-4.5 h-4.5" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Operator Action Center</span>
              {counts.total > 0 && (
                <Badge variant="secondary" className="bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-extrabold text-[10px] px-1.5 py-0 h-4">
                  {counts.total} Requires Action
                </Badge>
              )}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">Prioritized dispatch issues &amp; operational blockers</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveCategoryFilter('all')}
            className={cn(
              "px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all",
              activeCategoryFilter === 'all'
                ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 hover:text-slate-900"
            )}
          >
            All ({counts.total})
          </button>
          {counts.unassigned > 0 && (
            <button
              type="button"
              onClick={() => setActiveCategoryFilter('unassigned')}
              className={cn(
                "px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1",
                activeCategoryFilter === 'unassigned'
                  ? "bg-indigo-600 text-white"
                  : "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300"
              )}
            >
              Unassigned ({counts.unassigned})
            </button>
          )}
          {counts.delayed > 0 && (
            <button
              type="button"
              onClick={() => setActiveCategoryFilter('delayed')}
              className={cn(
                "px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1",
                activeCategoryFilter === 'delayed'
                  ? "bg-rose-600 text-white"
                  : "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"
              )}
            >
              Delayed ({counts.delayed})
            </button>
          )}
        </div>
      </div>

      {/* Action Items List */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        {filteredItems.length === 0 ? (
          <div className="p-6 text-center space-y-2 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-900/40">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">All Dispatches Running Smoothly</h4>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
              No unassigned, delayed, or missing POD trips currently requiring operator action.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                "p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs",
                item.severity === 'high'
                  ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40"
                  : "bg-amber-50/40 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40"
              )}
            >
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] font-extrabold uppercase px-1.5 py-0",
                      item.category === 'unassigned' ? "bg-indigo-100 text-indigo-800 border-indigo-300" :
                      item.category === 'delayed' ? "bg-rose-100 text-rose-800 border-rose-300" :
                      item.category === 'location_review' ? "bg-amber-100 text-amber-800 border-amber-300" :
                      "bg-slate-100 text-slate-800 border-slate-300"
                    )}
                  >
                    {item.category.replace('_', ' ')}
                  </Badge>
                  <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                    {item.trip.ref_id || item.trip.id}
                  </span>
                </div>
                <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                  {item.title}
                </div>
                <div className="text-[10px] text-slate-500 truncate">
                  {item.subtitle}
                </div>
              </div>

              <Button
                size="sm"
                onClick={() => handleActionClick(item)}
                className={cn(
                  "h-7 text-xs font-bold shrink-0 shadow-2xs",
                  item.actionType === 'assign'
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                    : "bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900"
                )}
              >
                {item.actionLabel}
              </Button>
            </div>
          ))
        )}
      </div>

      {/* Quick Assign Modal fallback */}
      <QuickAssignModal
        isOpen={!!assignTargetTrip}
        onClose={() => setAssignTargetTrip(null)}
        trip={assignTargetTrip}
      />
    </div>
  );
}
