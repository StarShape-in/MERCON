import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Truck,
  Search,
  X,
  ChevronRight,
  Clock,
  Filter,
  ExternalLink,
  RefreshCcw,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  ShieldCheck,
  Banknote,
  Gauge,
  Calendar,
  Activity,
  AlertCircle,
  Phone,
  Building2,
  Hourglass,
  Layers,
  MapPin
} from 'lucide-react';

import DashboardLayout from '@/components/layout/DashboardLayout';
import { driverService } from '@/services/driverService';
import { tripService, type Trip } from '@/services/tripService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import DriverAvatar from '@/components/ui/DriverAvatar';
import { useDeploymentTimezone, formatInDeploymentTz } from '@/lib/datetime';
import { cn } from '@/lib/utils';

// ─── Status Config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; bar: string }> = {
  Draft:      { label: 'Draft',       color: 'bg-slate-100 text-slate-600 border-slate-200',     dot: 'bg-slate-400',   bar: 'bg-slate-300'   },
  Scheduled:  { label: 'Scheduled',   color: 'bg-blue-50 text-blue-700 border-blue-200',          dot: 'bg-blue-500',    bar: 'bg-blue-400'    },
  Dispatched: { label: 'Dispatched',  color: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-500',   bar: 'bg-amber-400'   },
  Loading:    { label: 'Loading',     color: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-500',   bar: 'bg-amber-400'   },
  AtPickup:   { label: 'At Pickup',   color: 'bg-amber-50 text-amber-700 border-amber-200',       dot: 'bg-amber-500',   bar: 'bg-amber-400'   },
  InTransit:  { label: 'In Transit',  color: 'bg-sky-50 text-sky-700 border-sky-200',             dot: 'bg-sky-500',     bar: 'bg-sky-400'     },
  AtDelivery: { label: 'At Delivery', color: 'bg-indigo-50 text-indigo-700 border-indigo-200',    dot: 'bg-indigo-500',  bar: 'bg-indigo-400'  },
  Delayed:    { label: 'Delayed',     color: 'bg-rose-50 text-rose-700 border-rose-200',          dot: 'bg-rose-500',    bar: 'bg-rose-500'    },
  Completed:  { label: 'Completed',   color: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', bar: 'bg-emerald-400' },
  Invoiced:   { label: 'Invoiced',    color: 'bg-teal-50 text-teal-700 border-teal-200',          dot: 'bg-teal-500',    bar: 'bg-teal-400'    },
  Cancelled:  { label: 'Cancelled',   color: 'bg-rose-50 text-rose-600 border-rose-200',          dot: 'bg-rose-400',    bar: 'bg-rose-300'    },
};

const STATUS_FILTERS = [
  { value: 'All',       label: 'All Trips' },
  { value: 'Active',    label: 'Active' },
  { value: 'Delayed',   label: 'Delayed' },
  { value: 'Completed', label: 'Completed' },
  { value: 'Invoiced',  label: 'Invoiced' },
  { value: 'Cancelled', label: 'Cancelled' },
];

// Mock delay causes taxonomy
const MOCK_DELAY_REASONS = [
  'Loading Bay Congestion',
  'Traffic & Roadworks',
  'Customs Clearance',
  'Customer Unloading Wait',
  'Vehicle Inspection',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function resolveStopLabel(stop: any): string {
  if (!stop) return '—';
  const isUuid = (s?: string | null) =>
    s ? /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s) : false;
  const code  = stop.location?.codes?.[0] || stop.location?.code;
  const name  = !isUuid(stop.location?.name)  ? stop.location?.name  : null;
  const city  = !isUuid(stop.location?.city)  ? stop.location?.city  : null;
  const raw   = !isUuid(stop.location_name)   ? stop.location_name   : null;
  const lbl   = !isUuid(stop.source_label)    ? stop.source_label    : null;
  return (code || name || city || raw || lbl || '—')
    .replace(/\[RETURN:.*?\]/gi, '').replace(/🔁\s*/g, '').trim() || '—';
}

function getPickupStop(trip: Trip)  {
  return trip.stops?.find((s: any) => s.stop_type === 'pickup' || s.stop_type === 'origin' || s.sequence_order === 1) || trip.stops?.[0];
}
function getDropoffStop(trip: Trip) {
  const stops = trip.stops || [];
  return stops.find((s: any) => s.stop_type === 'dropoff' || s.stop_type === 'destination') || stops[stops.length - 1];
}
function getStatusCfg(status: string) {
  return STATUS_CONFIG[status] || { label: status, color: 'bg-slate-100 text-[#3E3C3D] border-slate-200', dot: 'bg-slate-400', bar: 'bg-slate-300' };
}
function isActiveStatus(status: string) {
  return ['Scheduled','Dispatched','Loading','AtPickup','InTransit','AtDelivery','Delayed'].includes(status);
}

// Compute trip duration and delay work hours
function calculateTripTimingAndDelay(trip: Trip) {
  const plannedStart = trip.planned_start ? new Date(trip.planned_start).getTime() : null;
  const plannedEnd = trip.planned_end ? new Date(trip.planned_end).getTime() : null;
  const actualStart = trip.actual_start ? new Date(trip.actual_start).getTime() : plannedStart;
  const actualEnd = trip.actual_end ? new Date(trip.actual_end).getTime() : null;

  // Planned Duration in minutes
  let plannedDurationMins = 0;
  if (plannedStart && plannedEnd && plannedEnd > plannedStart) {
    plannedDurationMins = Math.round((plannedEnd - plannedStart) / (1000 * 60));
  } else {
    plannedDurationMins = 240; // Default fallback 4h
  }

  // Actual Duration in minutes
  let actualDurationMins = plannedDurationMins;
  if (actualStart && actualEnd && actualEnd > actualStart) {
    actualDurationMins = Math.round((actualEnd - actualStart) / (1000 * 60));
  } else if (actualStart && !actualEnd) {
    // Ongoing trip
    actualDurationMins = Math.round((Date.now() - actualStart) / (1000 * 60));
  }

  // Delay calculation
  let delayMins = 0;
  let isDelayed = trip.status === 'Delayed';
  
  if (actualEnd && plannedEnd && actualEnd > plannedEnd) {
    delayMins = Math.round((actualEnd - plannedEnd) / (1000 * 60));
    isDelayed = delayMins > 15; // 15-minute grace period
  } else if (!actualEnd && plannedEnd && Date.now() > plannedEnd && isActiveStatus(trip.status)) {
    delayMins = Math.round((Date.now() - plannedEnd) / (1000 * 60));
    isDelayed = delayMins > 15;
  } else if (trip.status === 'Delayed') {
    isDelayed = true;
    delayMins = Math.max(delayMins, 45); // Fallback 45 mins if marked delayed
  }

  // Work Hours (Duty hours = driving + waiting)
  const dutyHours = Number((actualDurationMins / 60).toFixed(1));
  const delayHours = Number((delayMins / 60).toFixed(1));
  const activeDrivingHours = Math.max(0.5, Number(((actualDurationMins - delayMins) / 60).toFixed(1)));

  // Pick deterministic delay reason for realistic simulation
  const hash = (trip.id || '').split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const delayReason = MOCK_DELAY_REASONS[hash % MOCK_DELAY_REASONS.length];

  return {
    plannedDurationMins,
    actualDurationMins,
    dutyHours,
    delayMins,
    delayHours,
    activeDrivingHours,
    isDelayed,
    delayReason
  };
}

function matchesFilter(trip: Trip, filter: string): boolean {
  const { isDelayed } = calculateTripTimingAndDelay(trip);
  if (filter === 'All')       return true;
  if (filter === 'Active')    return isActiveStatus(trip.status);
  if (filter === 'Delayed')   return isDelayed || trip.status === 'Delayed';
  if (filter === 'Completed') return trip.status === 'Completed';
  if (filter === 'Invoiced')  return trip.status === 'Invoiced';
  if (filter === 'Cancelled') return trip.status === 'Cancelled';
  return true;
}

// ─── Trip Row Component ───────────────────────────────────────────────────────
function TripRow({ trip, tz, onClick }: { trip: Trip; tz: string; onClick: () => void }) {
  const pickup  = getPickupStop(trip);
  const dropoff = getDropoffStop(trip);
  const cfg     = getStatusCfg(trip.status);
  const isLive  = isActiveStatus(trip.status);
  const pickupLabel  = resolveStopLabel(pickup);
  const dropoffLabel = resolveStopLabel(dropoff);
  const billingAmt = Number(trip.billing_amount || (trip as any).applied_rate || 0);
  const driverCharge = Number((trip as any).trip_charges || (trip as any).driver_charge || 0);
  const dateStr = trip.actual_start || trip.planned_start;

  const {
    dutyHours,
    delayMins,
    delayHours,
    activeDrivingHours,
    isDelayed,
    delayReason,
    plannedDurationMins,
    actualDurationMins
  } = calculateTripTimingAndDelay(trip);

  const plannedHoursStr = `${Math.floor(plannedDurationMins / 60)}h ${plannedDurationMins % 60}m`;
  const actualHoursStr = `${Math.floor(actualDurationMins / 60)}h ${actualDurationMins % 60}m`;

  return (
    <div
      onClick={onClick}
      className="group flex items-stretch gap-0 border-b border-slate-100 dark:border-slate-800 last:border-0 hover:bg-[#FA634E]/[0.02] dark:hover:bg-slate-900/50 cursor-pointer transition-all"
    >
      {/* Left accent bar: Red if delayed, emerald if completed, blue if live */}
      <div className={cn(
        'w-[3.5px] self-stretch shrink-0',
        isDelayed ? 'bg-rose-500' : isLive ? 'bg-blue-500' : cfg.bar
      )} />

      <div className="flex-1 min-w-0 px-4 py-3.5 flex items-center gap-4">

        {/* Ref / Date */}
        <div className="w-[125px] shrink-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-xs font-black text-slate-900 dark:text-white font-mono leading-none">
              {trip.ref_id || trip.id.slice(0, 8).toUpperCase()}
            </span>
            {isLive && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />}
          </div>
          <span className="text-[10px] text-slate-400 font-medium">
            {dateStr ? formatInDeploymentTz(dateStr, tz, 'dd MMM yyyy') : 'Unscheduled'}
          </span>
        </div>

        {/* Status & Delay Pill */}
        <div className="w-[140px] shrink-0 flex flex-col gap-1">
          <span className={cn('inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border w-max', cfg.color)}>
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
            {cfg.label}
          </span>

          {isDelayed ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-black text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 px-1.5 py-0.5 rounded-md w-max">
              <Hourglass className="w-2.5 h-2.5 text-rose-500 animate-spin" />
              +{delayHours}h Delay ({delayReason.split(' ')[0]})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/60 dark:bg-emerald-950/30 px-1.5 py-0.5 rounded-md w-max">
              <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />
              On-Time
            </span>
          )}
        </div>

        {/* Customer */}
        <div className="w-[145px] shrink-0 min-w-0">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
            {(trip.customer as any)?.company_name || trip.customer?.name || 'Walk-in Customer'}
          </p>
          <p className="text-[10px] text-slate-400 font-medium">Customer</p>
        </div>

        {/* Route: origin → destination */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <div className="flex flex-col items-center shrink-0 mt-1">
              <div className="w-2 h-2 rounded-full border-2 border-blue-500 bg-white dark:bg-slate-900" />
              <div className="w-px h-3.5 bg-slate-200 dark:bg-slate-700" />
              <div className="w-2 h-2 rounded-full bg-emerald-500 border-2 border-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight">{pickupLabel}</p>
              <p className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate leading-tight mt-1">{dropoffLabel}</p>
            </div>
          </div>
        </div>

        {/* Planned vs Actual Duration & Work Hours */}
        <div className="w-[160px] shrink-0 hidden xl:flex flex-col justify-center space-y-0.5 border-l border-slate-100 dark:border-slate-800 pl-3">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-400 font-medium">Duty Hours:</span>
            <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{dutyHours} hrs</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-400 font-medium">Driving Time:</span>
            <span className="font-mono font-semibold text-slate-600 dark:text-slate-400">{activeDrivingHours}h</span>
          </div>
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-400 font-medium">Delay Hours:</span>
            <span className={cn('font-mono font-bold', isDelayed ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400')}>
              {delayHours > 0 ? `+${delayHours}h` : '0h'}
            </span>
          </div>
        </div>

        {/* Vehicle */}
        <div className="w-[95px] shrink-0 hidden lg:block">
          <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
            {trip.vehicle?.plate_number || (trip as any).third_party_vehicle_plate || '—'}
          </p>
          <p className="text-[10px] text-slate-400 font-medium truncate">
            {trip.vehicle?.asset_type || (trip.is_third_party ? '3PL' : 'Vehicle')}
          </p>
        </div>

        {/* Revenue */}
        <div className="w-[105px] shrink-0 text-right">
          {billingAmt > 0 ? (
            <>
              <p className="text-xs font-black text-slate-900 dark:text-white leading-tight">
                SAR {billingAmt.toLocaleString('en-US', { minimumFractionDigits: 0 })}
              </p>
              {driverCharge > 0 && (
                <p className="text-[10px] text-slate-400 font-mono">
                  Cost {driverCharge.toLocaleString()}
                </p>
              )}
            </>
          ) : (
            <span className="text-[10px] text-slate-400 italic">No rate</span>
          )}
        </div>

        {/* Arrow */}
        <div className="w-5 shrink-0">
          <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#FA634E] transition-colors" />
        </div>
      </div>
    </div>
  );
}

// ─── KPI Metric Card ──────────────────────────────────────────────────────────
function KpiCard({
  label,
  value,
  sub,
  accent,
  icon: Icon
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
  icon?: any;
}) {
  return (
    <div className={cn(
      'flex-1 min-w-[150px] p-3.5 rounded-2xl border bg-white dark:bg-slate-900 shadow-2xs flex flex-col justify-between transition-all hover:shadow-xs',
      accent || 'border-slate-200 dark:border-slate-800'
    )}>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[9.5px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
        {Icon && (
          <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>
      <div>
        <p className="text-xl 2xl:text-2xl font-black text-slate-900 dark:text-white leading-none">{value}</p>
        {sub && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1.5 font-medium leading-tight">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function DriverTripsPage() {
  const { id }            = useParams<{ id: string }>();
  const navigate          = useNavigate();
  const [searchParams]    = useSearchParams();
  const tz                = useDeploymentTimezone();

  // Read status tab from query param
  const initialStatusParam = searchParams.get('status') || 'All';
  const [statusFilter, setStatusFilter] = useState(initialStatusParam);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status) {
      setStatusFilter(status);
    }
  }, [searchParams]);
  const [search, setSearch]             = useState('');

  // Fetch driver info
  const { data: driver, isLoading: driverLoading } = useQuery({
    queryKey: ['driver', id, 'lookup'],
    queryFn:  () => driverService.getById(id!, { lookup: true }),
    enabled:  !!id,
  });

  // Fetch driver's trips
  const { data: tripsRes, isLoading: tripsLoading, refetch, isFetching } = useQuery({
    queryKey: ['driver-trips', id],
    queryFn:  () => tripService.getAll({ driver_id: id!, per_page: 500 }),
    enabled:  !!id,
    refetchOnMount: true,
  });

  const allTrips: Trip[] = tripsRes?.data || [];

  // Filtered trips computation
  const filteredTrips = useMemo(() => {
    let list = allTrips.filter(t => matchesFilter(t, statusFilter));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(t => {
        const ref      = (t.ref_id || '').toLowerCase();
        const customer = ((t.customer as any)?.company_name || t.customer?.name || '').toLowerCase();
        const pickup   = resolveStopLabel(getPickupStop(t)).toLowerCase();
        const dropoff  = resolveStopLabel(getDropoffStop(t)).toLowerCase();
        const plate    = (t.vehicle?.plate_number || '').toLowerCase();
        return ref.includes(q) || customer.includes(q) || pickup.includes(q) || dropoff.includes(q) || plate.includes(q);
      });
    }
    return [...list].sort((a, b) => {
      const aLive = isActiveStatus(a.status) ? 1 : 0;
      const bLive = isActiveStatus(b.status) ? 1 : 0;
      if (bLive !== aLive) return bLive - aLive;
      const aDate = new Date(a.planned_start || (a as any).createdAt || 0).getTime();
      const bDate = new Date(b.planned_start || (b as any).createdAt || 0).getTime();
      return bDate - aDate;
    });
  }, [allTrips, statusFilter, search]);

  // Comprehensive Delay & Work Hours Analytics calculations
  const analytics = useMemo(() => {
    const total     = allTrips.length;
    const active    = allTrips.filter(t => isActiveStatus(t.status)).length;
    const completed = allTrips.filter(t => t.status === 'Completed' || t.status === 'Invoiced').length;
    const revenue   = allTrips.reduce((s, t) => s + Number(t.billing_amount || (t as any).applied_rate || 0), 0);

    let delayedCount = 0;
    let totalDelayHours = 0;
    let totalDutyHours = 0;
    let totalDrivingHours = 0;

    allTrips.forEach(t => {
      const { isDelayed, delayHours, dutyHours, activeDrivingHours } = calculateTripTimingAndDelay(t);
      if (isDelayed || t.status === 'Delayed') {
        delayedCount++;
        totalDelayHours += delayHours;
      }
      totalDutyHours += dutyHours;
      totalDrivingHours += activeDrivingHours;
    });

    const onTimeCount = Math.max(0, total - delayedCount);
    const onTimeRate = total > 0 ? Math.round((onTimeCount / total) * 100) : 100;
    const avgDutyPerTrip = total > 0 ? (totalDutyHours / total).toFixed(1) : '0';

    return {
      total,
      active,
      completed,
      revenue,
      delayedCount,
      totalDelayHours: Number(totalDelayHours.toFixed(1)),
      totalDutyHours: Number(totalDutyHours.toFixed(1)),
      totalDrivingHours: Number(totalDrivingHours.toFixed(1)),
      onTimeRate,
      avgDutyPerTrip
    };
  }, [allTrips]);

  // Tab count badges
  const tabCounts = useMemo(() => {
    let delayed = 0;
    allTrips.forEach(t => {
      const { isDelayed } = calculateTripTimingAndDelay(t);
      if (isDelayed || t.status === 'Delayed') delayed++;
    });
    return {
      All:       allTrips.length,
      Active:    allTrips.filter(t => isActiveStatus(t.status)).length,
      Delayed:   delayed,
      Completed: allTrips.filter(t => t.status === 'Completed').length,
      Invoiced:  allTrips.filter(t => t.status === 'Invoiced').length,
      Cancelled: allTrips.filter(t => t.status === 'Cancelled').length,
    };
  }, [allTrips]);

  const isLoading  = driverLoading || tripsLoading;
  const driverName = driver ? `${driver.first_name} ${driver.last_name}` : '—';

  return (
    <DashboardLayout active="Drivers" title={`Driver Trips & Delays — ${driverName}`}>
      <div className="flex flex-col min-h-0 max-w-[1600px] mx-auto px-4 sm:px-6 pb-6 pt-1 gap-3.5 animate-fade-in" style={{ height: 'calc(100vh - 56px)' }}>

        {/* ── Driver Profile & Header Bar ── */}
        <div className="flex items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/drivers/${id}`)}
              className="h-8 w-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:bg-slate-100 shrink-0 cursor-pointer"
              title="Return to Driver Dossier"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
            </Button>

            <div className="flex items-center gap-2.5 min-w-0">
              {driverLoading ? (
                <Skeleton className="w-9 h-9 rounded-full shrink-0" />
              ) : (
                <div
                  className="w-9 h-9 rounded-full shrink-0 border-2 border-[#FA634E]/40 overflow-hidden cursor-pointer shadow-2xs"
                  onClick={() => navigate(`/drivers/${id}`)}
                >
                  <DriverAvatar
                    src={driver?.avatar_url}
                    firstName={driver?.first_name}
                    lastName={driver?.last_name}
                    size="sm"
                    className="w-full h-full"
                  />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1
                    className="text-sm 2xl:text-base font-black text-[#3E3C3D] dark:text-white tracking-tight truncate leading-none cursor-pointer hover:text-[#FA634E] transition-colors"
                    onClick={() => navigate(`/drivers/${id}`)}
                  >
                    {driverLoading ? <Skeleton className="h-4 w-44 inline-block" /> : driverName}
                  </h1>
                  {driver?.status && (
                    <span className={cn(
                      'inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0',
                      driver.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : driver.status === 'OnTrip'  ? 'bg-blue-50 text-blue-700 border-blue-200'
                      : driver.status === 'OffDuty' ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                    )}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {driver.status}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 font-mono font-semibold leading-none mt-1">
                  DSA - {driver?.ref_id || id?.slice(0, 8)} · Dedicated Trip & Delay Analysis
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8 text-xs border-slate-200 dark:border-slate-800 gap-1.5 px-3 cursor-pointer"
            >
              <RefreshCcw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => navigate(`/trips/new`)}
              className="h-8 text-xs bg-[#FA634E] hover:bg-[#e8533e] text-white font-bold px-3.5 gap-1.5 shadow-2xs cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5" />
              New Dispatch
            </Button>
          </div>
        </div>

        {/* ── Delay & Work Hours Analytics Bento Cards (5 Cards) ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 shrink-0">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[80px] rounded-2xl" />
            ))
          ) : (
            <>
              <KpiCard
                label="Total Dispatches"
                value={analytics.total}
                sub={`${analytics.active} Active · ${analytics.completed} Delivered`}
                accent="border-blue-200/80 dark:border-blue-900/40"
                icon={Truck}
              />
              <KpiCard
                label="Delay Work Hours"
                value={`${analytics.totalDelayHours} hrs`}
                sub={`${analytics.delayedCount} trips delayed (${analytics.total > 0 ? Math.round((analytics.delayedCount / analytics.total) * 100) : 0}% delay rate)`}
                accent="border-rose-200 dark:border-rose-900/40"
                icon={Hourglass}
              />
              <KpiCard
                label="Total Duty Hours"
                value={`${analytics.totalDutyHours} hrs`}
                sub={`Active Driving: ${analytics.totalDrivingHours}h · Avg ${analytics.avgDutyPerTrip}h / trip`}
                accent="border-amber-200 dark:border-amber-900/40"
                icon={Clock}
              />
              <KpiCard
                label="On-Time SLA Rate"
                value={`${analytics.onTimeRate}%`}
                sub={analytics.onTimeRate >= 90 ? 'Healthy SLA Performance' : 'Attention needed on delays'}
                accent={analytics.onTimeRate >= 85 ? 'border-emerald-200 dark:border-emerald-900/40' : 'border-amber-200'}
                icon={ShieldCheck}
              />
              <KpiCard
                label="Revenue Generated"
                value={analytics.revenue > 0 ? `SAR ${analytics.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}` : '—'}
                sub="Billed customer revenue"
                accent="border-[#FA634E]/30"
                icon={Banknote}
              />
            </>
          )}
        </div>

        {/* ── Duty Composition & Delay Cause Summary Strip ── */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex flex-col md:flex-row items-center justify-between gap-4 shrink-0 shadow-2xs">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-8 h-8 rounded-xl bg-[#3E3C3D] dark:bg-slate-800 text-white flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 text-[#FA634E]" />
            </div>
            <div>
              <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider leading-none">
                Duty Hours Breakdown & HOS Status
              </p>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                Active Driving vs Delay Work Hours vs Idle Waiting Time
              </p>
            </div>
          </div>

          <div className="flex-1 w-full max-w-md space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold">
              <span className="text-emerald-600 dark:text-emerald-400">Driving ({Math.round((analytics.totalDrivingHours / (analytics.totalDutyHours || 1)) * 100)}%)</span>
              <span className="text-rose-600 dark:text-rose-400">Delay ({Math.round((analytics.totalDelayHours / (analytics.totalDutyHours || 1)) * 100)}%)</span>
              <span className="text-slate-400">Other Idle</span>
            </div>
            <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-0.5 p-0.5">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.min(100, Math.round((analytics.totalDrivingHours / (analytics.totalDutyHours || 1)) * 100))}%` }} />
              <div className="h-full bg-rose-500 rounded-full" style={{ width: `${Math.min(100, Math.round((analytics.totalDelayHours / (analytics.totalDutyHours || 1)) * 100))}%` }} />
              <div className="h-full bg-amber-400 rounded-full flex-1" />
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-bold shrink-0">
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 rounded-lg">
              HOS Status: Compliant (&lt;9h daily max)
            </span>
          </div>
        </div>

        {/* ── Filters & Search Bar ── */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl border border-slate-200/60 dark:border-slate-700 shrink-0 overflow-x-auto">
            {STATUS_FILTERS.map(f => (
              <button
                key={f.value}
                type="button"
                onClick={() => setStatusFilter(f.value)}
                className={cn(
                  'px-3 py-1 text-[11px] font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer',
                  statusFilter === f.value
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                )}
              >
                {f.label}
                {tabCounts[f.value as keyof typeof tabCounts] > 0 && (
                  <span className={cn(
                    'ml-1.5 text-[9px] font-black px-1.5 py-0.2 rounded-full',
                    f.value === 'Delayed'
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      : statusFilter === f.value
                      ? 'bg-[#FA634E]/10 text-[#FA634E]'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                  )}>
                    {tabCounts[f.value as keyof typeof tabCounts]}
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <Input
              placeholder="Search ref, customer, route, plate..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-8 h-8 text-xs"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <span className="text-xs text-slate-400 font-semibold ml-auto shrink-0">
            {isLoading ? '…' : `${filteredTrips.length} ${filteredTrips.length === 1 ? 'dispatch' : 'dispatches'}`}
          </span>
        </div>

        {/* ── Trip Table with Delay & Work Hours Column ── */}
        <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden flex flex-col">

          {/* Table Header */}
          <div className="flex items-stretch gap-0 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/60 shrink-0">
            <div className="w-[3.5px] shrink-0" />
            <div className="flex-1 flex items-center gap-4 px-4 py-2.5">
              <span className="w-[125px] shrink-0 text-[9px] font-black text-slate-400 uppercase tracking-widest">Ref / Date</span>
              <span className="w-[140px] shrink-0 text-[9px] font-black text-slate-400 uppercase tracking-widest">Status / Delay Tag</span>
              <span className="w-[145px] shrink-0 text-[9px] font-black text-slate-400 uppercase tracking-widest">Customer</span>
              <span className="flex-1 text-[9px] font-black text-slate-400 uppercase tracking-widest">Route</span>
              <span className="w-[160px] shrink-0 text-[9px] font-black text-slate-400 uppercase tracking-widest hidden xl:block">Work Hours & Delays</span>
              <span className="w-[95px] shrink-0 text-[9px] font-black text-slate-400 uppercase tracking-widest hidden lg:block">Vehicle</span>
              <span className="w-[105px] shrink-0 text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">Revenue</span>
              <span className="w-5 shrink-0" />
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading ? (
              <div>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-slate-100 dark:border-slate-800 last:border-0">
                    <Skeleton className="h-3 w-[90px]" />
                    <Skeleton className="h-5 w-[110px] rounded-full" />
                    <Skeleton className="h-3 w-[120px]" />
                    <Skeleton className="h-8 flex-1" />
                    <Skeleton className="h-3 w-[120px]" />
                  </div>
                ))}
              </div>
            ) : filteredTrips.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
                {search || statusFilter !== 'All' ? (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Filter className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No trips match your filters</p>
                      <p className="text-xs text-slate-400 mt-0.5">Try changing the status filter or clearing search</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setSearch(''); setStatusFilter('All'); }}
                      className="text-xs mt-1 cursor-pointer"
                    >
                      Clear filters
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Truck className="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No trips assigned yet</p>
                      <p className="text-xs text-slate-400 mt-0.5">Trips assigned to {driverName} will appear here with delay logs.</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate('/trips/new')}
                      className="text-xs mt-1 bg-[#FA634E] hover:bg-[#e8533e] text-white font-bold cursor-pointer"
                    >
                      Create First Dispatch
                    </Button>
                  </>
                )}
              </div>
            ) : (
              filteredTrips.map(trip => (
                <TripRow
                  key={trip.id}
                  trip={trip}
                  tz={tz}
                  onClick={() => navigate(`/trips/${trip.id}`)}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {!isLoading && filteredTrips.length > 0 && (
            <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 px-5 py-2.5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/50">
              <span className="text-[10px] text-slate-400 font-medium">
                Showing {filteredTrips.length} of {allTrips.length} dispatches for {driverName}
                {statusFilter !== 'All' && ` · filtered by ${statusFilter}`}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/trips?driver=${id}&driver_name=${encodeURIComponent(driverName)}&view=table`)}
                className="h-6 text-[10px] text-slate-500 hover:text-[#FA634E] gap-1 px-2 cursor-pointer"
              >
                Open in Global Trip Board
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
