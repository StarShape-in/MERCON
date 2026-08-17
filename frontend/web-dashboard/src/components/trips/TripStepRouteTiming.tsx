import React from 'react';
import { format, parseISO, isValid } from 'date-fns';
import { Navigation, Keyboard, Truck, MapPinned, Loader2, AlertTriangle, Sparkles } from 'lucide-react';
import TripLocationField from '@/components/trips/TripLocationField';
import TripDateTimeField from '@/components/trips/TripDateTimeField';
import { Location } from '@/services/locationService';
import { Card } from '@/components/ui/card';
import { EstimatedDeliveryResult } from '@/hooks/useEstimatedDelivery';
import { cn } from '@/lib/utils';

interface TripStepRouteTimingProps {
  pickupLocationId: string;
  pickupLocationName: string;
  pickupLat: number | null;
  pickupLng: number | null;
  pickupName: string;
  pickupAddress: string;
  dropoffLocationId: string;
  dropoffLocationName: string;
  dropoffLat: number | null;
  dropoffLng: number | null;
  dropoffName: string;
  dropoffAddress: string;
  locations: Location[];
  onPickupLocationIdChange: (id: string) => void;
  onPickupLocationNameChange: (name: string) => void;
  onPickupCoordinatesChange: (lat: number | null, lng: number | null) => void;
  onPickupNameChange: (name: string) => void;
  onPickupAddressChange: (address: string) => void;
  onDropoffLocationIdChange: (id: string) => void;
  onDropoffLocationNameChange: (name: string) => void;
  onDropoffCoordinatesChange: (lat: number | null, lng: number | null) => void;
  onDropoffNameChange: (name: string) => void;
  onDropoffAddressChange: (address: string) => void;
  focusPickupSearch?: boolean;
  focusDropoffSearch?: boolean;
  // Truck Arrival Time (the only manually-entered time in this step)
  truckArrivalTime: string;
  onTruckArrivalTimeChange: (time: string) => void;
  // Estimated Delivery — calculated, never typed
  estimatedDelivery: EstimatedDeliveryResult;
}

export default function TripStepRouteTiming({
  pickupLocationId,
  pickupLocationName,
  pickupLat,
  pickupLng,
  pickupName,
  pickupAddress,
  dropoffLocationId,
  dropoffLocationName,
  dropoffLat,
  dropoffLng,
  dropoffName,
  dropoffAddress,
  locations,
  onPickupLocationIdChange,
  onPickupLocationNameChange,
  onPickupCoordinatesChange,
  onPickupNameChange,
  onPickupAddressChange,
  onDropoffLocationIdChange,
  onDropoffLocationNameChange,
  onDropoffCoordinatesChange,
  onDropoffNameChange,
  onDropoffAddressChange,
  focusPickupSearch,
  focusDropoffSearch,
  truckArrivalTime,
  onTruckArrivalTimeChange,
  estimatedDelivery,
}: TripStepRouteTimingProps) {
  const routeReady = pickupLat != null && pickupLng != null && dropoffLat != null && dropoffLng != null;

  const truckArrivalDate = truckArrivalTime ? parseISO(truckArrivalTime) : null;
  const deliveryDate =
    estimatedDelivery.status === 'ready' && estimatedDelivery.estimatedDeliveryLocal
      ? parseISO(estimatedDelivery.estimatedDeliveryLocal)
      : null;

  return (
    <div className="space-y-3 animate-in fade-in-50 duration-200">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Navigation className="w-4 h-4 text-brand" /> Route &amp; Timing
        </h3>
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
          <Keyboard className="w-3.5 h-3.5 text-brand" />
          <span>Press <kbd className="font-mono bg-white dark:bg-slate-900 px-1 py-0.2 border rounded text-slate-700 dark:text-slate-300 font-bold">\</kbd> Pickup, <kbd className="font-mono bg-white dark:bg-slate-900 px-1 py-0.2 border rounded text-slate-700 dark:text-slate-300 font-bold">Shift+\</kbd> Dropoff</span>
        </div>
      </div>

      <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3.5 shadow-2xs">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          <TripLocationField
            tone="pickup"
            label="Pickup Location"
            locationId={pickupLocationId}
            onLocationChange={(locId, loc) => {
              onPickupLocationIdChange(locId);
              onPickupLocationNameChange(loc?.name || '');
              if (loc?.lat != null && loc?.lng != null && !pickupAddress.trim()) {
                onPickupCoordinatesChange(loc.lat, loc.lng);
              }
              if (loc && !pickupName.trim()) onPickupNameChange(loc.name);
              if (loc?.address && !pickupAddress.trim()) onPickupAddressChange(loc.address);
            }}
            lat={pickupLat}
            lng={pickupLng}
            onCoordsChange={(lat, lng) => onPickupCoordinatesChange(lat, lng)}
            name={pickupName}
            onNameChange={onPickupNameChange}
            address={pickupAddress}
            onAddressChange={onPickupAddressChange}
            locations={locations}
            autoFocusSearch={focusPickupSearch}
            shortcutBadge="\"
          />

          <TripLocationField
            tone="dropoff"
            label="Dropoff Location"
            locationId={dropoffLocationId}
            onLocationChange={(locId, loc) => {
              onDropoffLocationIdChange(locId);
              onDropoffLocationNameChange(loc?.name || '');
              if (loc?.lat != null && loc?.lng != null && !dropoffAddress.trim()) {
                onDropoffCoordinatesChange(loc.lat, loc.lng);
              }
              if (loc && !dropoffName.trim()) onDropoffNameChange(loc.name);
              if (loc?.address && !dropoffAddress.trim()) onDropoffAddressChange(loc.address);
            }}
            lat={dropoffLat}
            lng={dropoffLng}
            onCoordsChange={(lat, lng) => onDropoffCoordinatesChange(lat, lng)}
            name={dropoffName}
            onNameChange={onDropoffNameChange}
            address={dropoffAddress}
            onAddressChange={onDropoffAddressChange}
            locations={locations}
            autoFocusSearch={focusDropoffSearch}
            shortcutBadge="Shift+\"
          />
        </div>

        {routeReady && (
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 px-3 py-1.5 flex items-center gap-2 text-xs font-bold">
            <span className="px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 truncate max-w-[45%]">
              {pickupName || pickupLocationName || 'Pickup'}
            </span>
            <Navigation className="w-3.5 h-3.5 text-slate-400 shrink-0 rotate-90" />
            <span className="px-2 py-0.5 rounded-lg bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300 truncate max-w-[45%]">
              {dropoffName || dropoffLocationName || 'Dropoff'}
            </span>
          </div>
        )}
      </Card>

      {/* Truck Arrival Time + calculated Estimated Delivery */}
      <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3 shadow-2xs">
        <TripDateTimeField label="Truck Arrival Time" value={truckArrivalTime} onChange={onTruckArrivalTimeChange} />

        <div
          className={cn(
            'rounded-xl border p-3',
            estimatedDelivery.status === 'ready'
              ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20'
              : estimatedDelivery.status === 'unavailable'
              ? 'border-amber-200 dark:border-amber-900 bg-amber-50/50 dark:bg-amber-950/20'
              : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
          )}
        >
          {!truckArrivalTime || !routeReady ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <MapPinned className="w-3.5 h-3.5 shrink-0" />
              Estimated delivery appears once pickup, dropoff and truck arrival time are all set.
            </p>
          ) : estimatedDelivery.status === 'loading' ? (
            <p className="text-xs text-indigo-600 dark:text-indigo-300 flex items-center gap-2 font-semibold">
              <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" />
              Calculating route with Google Maps...
            </p>
          ) : estimatedDelivery.status === 'unavailable' ? (
            <p className="text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              Estimated delivery could not be calculated. You can still continue — no time was invented.
            </p>
          ) : estimatedDelivery.status === 'ready' && estimatedDelivery.travel && deliveryDate && isValid(deliveryDate) ? (
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center justify-center gap-1">
                  <Truck className="w-3 h-3" /> Truck Arrival
                </span>
                <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100 block">
                  {truckArrivalDate && isValid(truckArrivalDate) ? format(truckArrivalDate, 'h:mm a') : '—'}
                </span>
              </div>
              <div className="space-y-0.5 border-x border-slate-200/70 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center justify-center gap-1">
                  <Navigation className="w-3 h-3" /> Travel Time
                </span>
                <span className="font-extrabold text-sm text-indigo-700 dark:text-indigo-300 block">
                  {estimatedDelivery.travel.durationText}
                </span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center justify-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500" /> Est. Delivery
                </span>
                <span className="font-extrabold text-sm text-emerald-700 dark:text-emerald-300 block">
                  {format(deliveryDate, 'h:mm a')}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
