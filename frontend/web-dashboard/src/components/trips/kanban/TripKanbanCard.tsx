import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  User,
  MapPin,
  ArrowRight,
  Clock,
  Building2,
  Navigation,
  MoreHorizontal,
  AlertTriangle,
  FileText,
  Share2,
  Trash2,
  Edit2,
  CheckCircle2,
  RotateCw,
} from 'lucide-react';
import { Trip, TripStatus, getTripPayloadCapacity, getTripRateCategory } from '@/services/tripService';
import { formatInDeploymentTz, useDeploymentTimezone } from '@/lib/datetime';
import StatusBadge from '@/components/ui/StatusBadge';
import DeletedBadge from '@/components/ui/DeletedBadge';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
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
}

const getPickupInfo = (trip: Trip) => {
  const pickup = trip.stops?.find((s) => s.stop_type === 'Pickup') || trip.stops?.[0];
  if (!pickup) return { name: '—', address: null };
  const name = pickup.location_name || pickup.location?.name || pickup.location_address || pickup.location?.address || (pickup.location_lat ? `${pickup.location_lat.toFixed(3)}, ${pickup.location_lng.toFixed(3)}` : '—');
  const address = (pickup.location_name && (pickup.location_address || pickup.location?.address)) ? (pickup.location_address || pickup.location?.address) : null;
  return { name, address };
};

const getDropoffInfo = (trip: Trip) => {
  const dropoff = trip.stops?.find((s) => s.stop_type === 'Dropoff') || (trip.stops && trip.stops.length > 1 ? trip.stops[trip.stops.length - 1] : undefined);
  if (!dropoff) return { name: '—', address: null };
  const name = dropoff.location_name || dropoff.location?.name || dropoff.location_address || dropoff.location?.address || (dropoff.location_lat ? `${dropoff.location_lat.toFixed(3)}, ${dropoff.location_lng.toFixed(3)}` : '—');
  const address = (dropoff.location_name && (dropoff.location_address || dropoff.location?.address)) ? (dropoff.location_address || dropoff.location?.address) : null;
  return { name, address };
};

export default function TripKanbanCard({
  trip,
  onStatusChange,
  onLogDelay,
  onShareWhatsapp,
  onDelete,
  density = 'normal',
}: TripKanbanCardProps) {
  const navigate = useNavigate();
  const tz = useDeploymentTimezone();
  const [isDragging, setIsDragging] = useState(false);

  const pickup = getPickupInfo(trip);
  const dropoff = getDropoffInfo(trip);
  const payloadCap = getTripPayloadCapacity(trip);
  const rateCat = getTripRateCategory(trip);
  const billingAmount = trip.billing_amount ?? trip.trip_charges ?? trip.rateCard?.base_price;

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', trip.id);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => navigate(`/trips/${trip.id}`)}
      className={cn(
        'group relative bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-xl shadow-2xs hover:shadow-md hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-grab active:cursor-grabbing flex flex-col select-none',
        density === 'compact' ? 'p-2.5 gap-2' : density === 'expanded' ? 'p-4 gap-3.5' : 'p-3.5 gap-3',
        isDragging && 'opacity-40 border-dashed border-brand bg-orange-50/20 dark:bg-orange-950/10'
      )}
    >
      {/* Top Row: Ref ID + Customer + Actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-brand transition-colors">
              {trip.ref_id}
            </span>
            {trip.is_third_party && (
              <Badge className="bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200 dark:border-purple-800 font-semibold text-[10px] px-1.5 py-0">
                3PL
              </Badge>
            )}
          </div>
          {trip.customer?.name && (
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 truncate max-w-[170px]" title={trip.customer.name}>
              {trip.customer.name}
            </span>
          )}
        </div>

        {/* Quick Menu */}
        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Trip Actions"
              >
                <MoreHorizontal size={15} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-1.5 shadow-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl">
              <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2 py-1">
                Trip Actions
              </DropdownMenuLabel>

              <DropdownMenuItem
                onClick={() => navigate(`/trips/${trip.id}`)}
                className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md"
              >
                <FileText className="mr-2 h-3.5 w-3.5 text-slate-500" />
                View Details
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => navigate(`/trips/${trip.id}/edit`)}
                className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md"
              >
                <Edit2 className="mr-2 h-3.5 w-3.5 text-slate-500" />
                Edit Trip
              </DropdownMenuItem>

              {trip.status === 'InTransit' && (
                <DropdownMenuItem
                  onClick={() => navigate(`/trips/${trip.id}/track`)}
                  className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md text-brand hover:bg-orange-50 dark:hover:bg-orange-950/40"
                >
                  <Navigation className="mr-2 h-3.5 w-3.5" />
                  Live GPS Track
                </DropdownMenuItem>
              )}

              {onLogDelay && (
                <DropdownMenuItem
                  onClick={() => onLogDelay(trip)}
                  className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                >
                  <AlertTriangle className="mr-2 h-3.5 w-3.5 text-amber-500" />
                  Log Delay Reason
                </DropdownMenuItem>
              )}

              {onShareWhatsapp && (
                <DropdownMenuItem
                  onClick={() => onShareWhatsapp(trip)}
                  className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                >
                  <Share2 className="mr-2 h-3.5 w-3.5 text-emerald-500" />
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
                    className="cursor-pointer text-xs py-1 px-2 rounded-md capitalize"
                  >
                    Move to {s}
                  </DropdownMenuItem>
                ))}

              {onDelete && (
                <>
                  <DropdownMenuSeparator className="my-1 border-slate-100 dark:border-slate-800" />
                  <DropdownMenuItem
                    onClick={() => onDelete(trip)}
                    className="cursor-pointer text-xs font-medium py-1.5 px-2 rounded-md text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
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

      {/* Route Preview Node */}
      <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-2.5 flex items-center justify-between gap-2 border border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" title="Pickup Origin" />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title={pickup.name}>
            {pickup.name}
          </span>
        </div>
        <ArrowRight size={13} className="text-slate-400 shrink-0" />
        <div className="flex items-center gap-1.5 min-w-0 flex-1 justify-end text-right">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate" title={dropoff.name}>
            {dropoff.name}
          </span>
          <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="Dropoff Destination" />
        </div>
      </div>

      {/* Driver & Vehicle Info Pill */}
      <div className="flex items-center justify-between gap-2 text-xs">
        {/* Driver */}
        <div className="flex items-center gap-1.5 min-w-0 max-w-[50%]">
          {trip.is_third_party ? (
            <div className="flex items-center gap-1 min-w-0">
              <div className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 font-bold text-[9px] flex items-center justify-center shrink-0">
                3P
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                {trip.third_party_driver_name || trip.carrier_name || '3PL Driver'}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1 min-w-0">
              <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[9px] flex items-center justify-center shrink-0">
                {trip.driver ? `${trip.driver.first_name[0]}` : 'U'}
              </div>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                {trip.driver ? `${trip.driver.first_name} ${trip.driver.last_name || ''}`.trim() : 'Unassigned'}
              </span>
              {trip.driver?.deletedAt && <DeletedBadge />}
            </div>
          )}
        </div>

        {/* Vehicle */}
        <div className="flex items-center gap-1 shrink-0">
          <Truck size={12} className={trip.is_third_party ? 'text-purple-500' : 'text-slate-400'} />
          <span className="font-mono text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded truncate max-w-[90px]">
            {trip.is_third_party
              ? trip.third_party_vehicle_plate || '3PL Truck'
              : trip.vehicle?.plate_number || 'Unassigned'}
          </span>
        </div>
      </div>

      {/* Card Footer: Metadata badges + Financial Amount */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {trip.planned_start && (
            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
              <Clock size={11} className="text-slate-400" />
              {formatInDeploymentTz(trip.planned_start, tz, 'MMM d, HH:mm')}
            </span>
          )}
          {rateCat !== '—' && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-indigo-50/60 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200/80">
              {rateCat}
            </Badge>
          )}
        </div>

        {/* Financial SAR Amount */}
        <div className="font-mono text-xs font-extrabold text-slate-900 dark:text-slate-100 shrink-0">
          {billingAmount !== undefined && billingAmount !== null && billingAmount > 0
            ? `SAR ${Number(billingAmount).toLocaleString('en-US')}`
            : '—'}
        </div>
      </div>
    </div>
  );
}
