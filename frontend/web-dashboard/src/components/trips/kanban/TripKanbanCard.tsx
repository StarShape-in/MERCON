import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  Clock,
  Building2,
  MoreHorizontal,
  AlertTriangle,
  FileText,
  Share2,
  Trash2,
  Edit2,
  Navigation,
} from 'lucide-react';
import { Trip, TripStatus, getTripPayloadCapacity } from '@/services/tripService';
import { formatInDeploymentTz, useDeploymentTimezone } from '@/lib/datetime';
import DeletedBadge from '@/components/ui/DeletedBadge';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { WhatsAppIcon } from '@/components/ui/whatsapp-icon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface TripKanbanCardProps {
  trip: Trip;
  onStatusChange: (trip: Trip, newStatus: TripStatus) => void;
  onLogDelay?: (trip: Trip) => void;
  onShareWhatsapp?: (trip: Trip) => void;
  onDelete?: (trip: Trip) => void;
  density?: 'compact' | 'normal' | 'expanded';
  hideCustomer?: boolean;
}

const getPickupName = (trip: Trip) => {
  const pickup = trip.stops?.find((s) => s.stop_type === 'Pickup') || trip.stops?.[0];
  if (!pickup) return '—';
  const name = pickup.location_name || pickup.location?.name || pickup.location_address || pickup.location?.address || '—';
  return name.replace(/🔁\s*/g, '').trim();
};

const getDropoffName = (trip: Trip) => {
  const dropoff = trip.stops?.find((s) => s.stop_type === 'Dropoff') || (trip.stops && trip.stops.length > 1 ? trip.stops[trip.stops.length - 1] : undefined);
  if (!dropoff) return '—';
  const name = dropoff.location_name || dropoff.location?.name || dropoff.location_address || dropoff.location?.address || '—';
  return name.replace(/🔁\s*/g, '').trim();
};

/** Derive a human-readable trip type label */
const getTripTypeLabel = (trip: Trip): string => {
  if (trip.is_third_party) return '3PL Trip';
  const stopsCount = trip.stops?.length ?? 0;
  if (stopsCount > 2) return 'Multi-Stop';
  return 'Single Trip';
};

export default function TripKanbanCard({
  trip,
  onStatusChange,
  onLogDelay,
  onShareWhatsapp,
  onDelete,
  density = 'normal',
  hideCustomer = false,
}: TripKanbanCardProps) {
  const navigate = useNavigate();
  const tz = useDeploymentTimezone();
  const [isDragging, setIsDragging] = useState(false);

  const pickupName = getPickupName(trip);
  const dropoffName = getDropoffName(trip);
  const billingAmount = trip.billing_amount ?? trip.trip_charges ?? trip.rateCard?.base_price;
  const capacity = getTripPayloadCapacity(trip);
  const tripType = getTripTypeLabel(trip);
  const routeText = `${pickupName}  →  ${dropoffName}`;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', trip.id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const driverName = trip.is_third_party
    ? trip.third_party_driver_name || trip.carrier_name || '3PL Driver'
    : trip.driver
      ? `${trip.driver.first_name} ${trip.driver.last_name || ''}`.trim()
      : 'Unassigned';

  const vehiclePlate = trip.is_third_party
    ? trip.third_party_vehicle_plate || '3PL'
    : trip.vehicle?.plate_number || '—';

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => navigate(`/trips/${trip.id}`)}
      className={cn(
        'group relative bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-grab active:cursor-grabbing flex flex-col select-none',
        density === 'compact' ? 'p-3 gap-2' : density === 'expanded' ? 'p-4 gap-3' : 'p-3 gap-2.5',
        isDragging && 'opacity-40 border-dashed border-brand bg-orange-50/20 dark:bg-orange-950/10'
      )}
    >
      {/* ── ROW 1: Trip Type (left) + Trip ID (right) ─────────────────────── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Badge className={cn(
            'text-[10px] font-bold px-1.5 py-0 rounded-md border whitespace-nowrap',
            trip.is_third_party
              ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800'
              : 'bg-slate-50 text-slate-600 dark:bg-slate-800/60 dark:text-slate-400 border-slate-200 dark:border-slate-700'
          )}>
            {tripType}
          </Badge>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <span className="font-mono text-[11px] font-black text-slate-900 dark:text-slate-100 group-hover:text-brand transition-colors tracking-tight">
            {trip.ref_id}
          </span>
          {onShareWhatsapp && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onShareWhatsapp(trip);
              }}
              className="p-1 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 transition-colors cursor-pointer"
              title="Share Trip Status on WhatsApp"
            >
              <WhatsAppIcon className="w-3.5 h-3.5 fill-emerald-600 dark:fill-emerald-400" />
            </button>
          )}

          {/* Quick Action Dropdown */}
          <div onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Trip Actions"
                >
                  <MoreHorizontal size={14} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-48 p-1.5 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl z-50"
              >
                <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                  Trip Actions
                </DropdownMenuLabel>

                <DropdownMenuItem
                  onClick={() => navigate(`/trips/${trip.id}`)}
                  className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md"
                >
                  <FileText className="mr-2 h-3.5 w-3.5 text-slate-500" />
                  View Details
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => navigate(`/trips/${trip.id}/edit`)}
                  className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md"
                >
                  <Edit2 className="mr-2 h-3.5 w-3.5 text-slate-500" />
                  Edit Trip
                </DropdownMenuItem>

                {trip.status === 'InTransit' && (
                  <DropdownMenuItem
                    onClick={() => navigate(`/trips/${trip.id}/track`)}
                    className="cursor-pointer text-xs font-bold py-1.5 px-2 rounded-md text-brand hover:bg-orange-50 dark:hover:bg-orange-950/40"
                  >
                    <Navigation className="mr-2 h-3.5 w-3.5" />
                    Live GPS Track
                  </DropdownMenuItem>
                )}

                {onLogDelay && (
                  <DropdownMenuItem
                    onClick={() => onLogDelay(trip)}
                    className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                  >
                    <AlertTriangle className="mr-2 h-3.5 w-3.5 text-amber-500" />
                    Log Delay Reason
                  </DropdownMenuItem>
                )}

                {onShareWhatsapp && (
                  <DropdownMenuItem
                    onClick={() => onShareWhatsapp(trip)}
                    className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  >
                    <WhatsAppIcon className="mr-2 h-3.5 w-3.5 text-emerald-500" />
                    Share WhatsApp
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />
                <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                  Move Status
                </DropdownMenuLabel>

                {(['Draft', 'Dispatched', 'AtPickup', 'InTransit', 'AtDelivery', 'Completed', 'Invoiced'] as TripStatus[])
                  .filter((s) => s !== trip.status)
                  .map((s) => (
                    <DropdownMenuItem
                      key={s}
                      onClick={() => onStatusChange(trip, s)}
                      className="cursor-pointer text-xs font-semibold py-1 px-2 rounded-md capitalize"
                    >
                      Move to {s}
                    </DropdownMenuItem>
                  ))}

                {onDelete && (
                  <>
                    <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />
                    <DropdownMenuItem
                      onClick={() => onDelete(trip)}
                      className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="mr-2 h-3.5 w-3.5 text-rose-500" />
                      Delete Trip
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* ── ROW 2: Customer Name ──────────────────────────────────────────── */}
      {trip.customer?.name && !hideCustomer && (
        <div className="flex items-center gap-1.5 min-w-0">
          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span
            className="text-[12px] font-extrabold text-slate-800 dark:text-slate-200 truncate"
            title={trip.customer.name}
          >
            {trip.customer.name}
          </span>
        </div>
      )}

      {/* ── ROW 3: Animated Route Line (pickup → dropoff) ─────────────────── */}
      <div className="bg-slate-50/90 dark:bg-slate-800/50 rounded-lg px-2.5 py-1.5 border border-slate-200/70 dark:border-slate-700/50 overflow-hidden min-w-0">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ring-1 ring-emerald-200 dark:ring-emerald-900" />
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="group/route whitespace-nowrap text-[11px] font-bold text-slate-700 dark:text-slate-300">
              <span className="inline-block animate-marquee group-hover/route:animation-paused">
                {routeText}
              </span>
            </div>
          </div>
          <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0 ring-1 ring-rose-200 dark:ring-rose-900" />
        </div>
      </div>

      {/* ── ROW 4: Driver (left) + Truck plate & tonnage (right) ──────────── */}
      <div className="flex items-center justify-between gap-2">
        {/* Driver */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <div className={cn(
            'w-5 h-5 rounded-full font-bold text-[9px] flex items-center justify-center shrink-0 border',
            trip.is_third_party
              ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border-purple-200 dark:border-purple-800'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200/80 dark:border-slate-700'
          )}>
            {trip.is_third_party ? '3P' : trip.driver ? trip.driver.first_name[0] : 'U'}
          </div>
          <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 truncate">
            {driverName}
          </span>
          {trip.driver?.deletedAt && <DeletedBadge />}
        </div>

        {/* Truck plate + tonnage */}
        <div className="flex items-center gap-1 shrink-0">
          <Truck size={12} className={trip.is_third_party ? 'text-purple-500' : 'text-slate-400'} />
          <span className="font-mono text-[10px] font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60 truncate max-w-[80px]">
            {vehiclePlate}
          </span>
          {capacity !== '—' && (
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-500">
              {capacity}
            </span>
          )}
        </div>
      </div>

      {/* ── ROW 5: Time (left) + Rate amount (right) ──────────────────────── */}
      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
        {/* Time */}
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          <Clock size={11} className="text-slate-400 shrink-0" />
          {trip.planned_start
            ? formatInDeploymentTz(trip.planned_start, tz, 'MMM d, HH:mm')
            : '—'}
        </span>

        {/* Rate / Amount */}
        <span className="font-mono text-xs font-black text-slate-900 dark:text-slate-100 shrink-0">
          {billingAmount !== undefined && billingAmount !== null && billingAmount > 0
            ? `SAR ${Number(billingAmount).toLocaleString('en-US')}`
            : '—'}
        </span>
      </div>
    </div>
  );
}
