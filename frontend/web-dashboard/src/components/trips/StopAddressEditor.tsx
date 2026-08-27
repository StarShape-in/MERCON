import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, MapPin } from 'lucide-react';

import LocationPickerMap from '@/components/trips/LocationPickerMap';
import LocationCombobox from '@/components/quotations/LocationCombobox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { tripService, TripStop } from '@/services/tripService';
import { cn } from '@/lib/utils';

interface StopAddressEditorProps {
  tripId: string;
  stop: TripStop;
  /** "Pickup Origin" / "Delivery Destination" / "Intermediate" */
  title: string;
  /** False once the trip is completed/invoiced/cancelled */
  editable: boolean;
  customerId?: string;
}

export default function StopAddressEditor({
  tripId,
  stop,
  title,
  editable,
  customerId,
}: StopAddressEditorProps) {
  const queryClient = useQueryClient();

  const [locationId, setLocationId] = useState(stop.locationId ?? '');
  const [name, setName] = useState(stop.location_name ?? '');
  const [address, setAddress] = useState(stop.location_address ?? '');
  const [lat, setLat] = useState<number | null>(stop.location_lat);
  const [lng, setLng] = useState<number | null>(stop.location_lng);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLocationId(stop.locationId ?? '');
    setName(stop.location_name ?? '');
    setAddress(stop.location_address ?? '');
    setLat(stop.location_lat);
    setLng(stop.location_lng);
  }, [stop.id, stop.locationId, stop.location_name, stop.location_address, stop.location_lat, stop.location_lng]);

  const isDirty =
    locationId !== (stop.locationId ?? '') ||
    name !== (stop.location_name ?? '') ||
    address !== (stop.location_address ?? '') ||
    lat !== stop.location_lat ||
    lng !== stop.location_lng;

  const saveMutation = useMutation({
    mutationFn: () =>
      tripService.updateStop(tripId, stop.id, {
        location_id: locationId || null,
        location_name: name.trim(),
        location_address: address.trim(),
        ...(lat != null ? { lat } : {}),
        ...(lng != null ? { lng } : {}),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    onError: (err: any) => {
      setError(err.response?.data?.error?.message || err.message || 'Could not save this stop.');
    },
  });

  const isPickup = stop.stop_type === 'Pickup';
  const isDropoff = stop.stop_type === 'Dropoff';

  // Container styling matching CreateTripPage
  const cardBorderClass = isPickup
    ? 'border-emerald-200/80 bg-emerald-50/30'
    : isDropoff
    ? 'border-orange-200/80 bg-orange-50/30'
    : 'border-blue-200/80 bg-blue-50/30';

  const headerBgClass = isPickup
    ? 'bg-emerald-50/80 border-b border-emerald-100'
    : isDropoff
    ? 'bg-orange-50/80 border-b border-orange-100'
    : 'bg-blue-50/80 border-b border-blue-100';

  const dotClass = isPickup
    ? 'bg-emerald-500 ring-2 ring-emerald-200'
    : isDropoff
    ? 'bg-brand ring-2 ring-orange-200'
    : 'bg-blue-500 ring-2 ring-blue-200';

  const titleTextClass = isPickup
    ? 'text-emerald-950'
    : isDropoff
    ? 'text-orange-950'
    : 'text-blue-950';

  const labelTextClass = isPickup
    ? 'text-emerald-900'
    : isDropoff
    ? 'text-orange-900'
    : 'text-blue-900';

  return (
    <div className={cn('rounded-xl border overflow-hidden space-y-2 shadow-2xs', cardBorderClass)}>
      {/* Header Bar */}
      <div className={cn('p-2 flex items-center justify-between', headerBgClass)}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn('w-2 h-2 rounded-full shrink-0', dotClass)} />
          <span className={cn('text-xs font-bold truncate', titleTextClass)}>
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[9px] font-semibold text-slate-600 bg-white border border-slate-200/80 px-1.5 py-0.5 rounded">
            Rate Hub & Maps
          </span>
          {editable && (
            <Button
              type="button"
              size="sm"
              disabled={!isDirty || saveMutation.isPending}
              onClick={() => { setError(null); saveMutation.mutate(); }}
              className={cn(
                'h-6 gap-1 px-2.5 text-[10px] font-bold shadow-2xs',
                saved
                  ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                  : 'bg-brand hover:bg-brand-hover text-white'
              )}
            >
              {saveMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
              {saved && <Check className="h-3 w-3" />}
              {saved ? 'Saved' : 'Save stop'}
            </Button>
          )}
        </div>
      </div>

      <div className="p-3 space-y-3">
        {!editable ? (
          <div className="space-y-1 text-xs">
            <p className="font-bold text-slate-900 dark:text-slate-100">
              {stop.location_name || `${stop.location_lat.toFixed(4)}, ${stop.location_lng.toFixed(4)}`}
            </p>
            <p className="text-[11px] text-slate-500">
              {stop.location_address || stop.location?.address || 'No address recorded'}
            </p>
            <p className="text-[10px] text-slate-400 italic pt-0.5">
              Trip is closed — stop records are locked.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <label className={cn('text-[10px] font-bold uppercase tracking-wider flex items-center justify-between', labelTextClass)}>
                <span>{isPickup ? 'Pickup Location *' : isDropoff ? 'Dropoff Location *' : 'Stop Location *'}</span>
                <span className="text-[9px] text-slate-400 font-normal">Google Maps & Rate Cards</span>
              </label>
              <LocationCombobox
                customerId={customerId}
                value={locationId}
                onChange={(locId, loc) => {
                  setLocationId(locId);
                  if (loc?.address) setAddress(loc.address);
                  if (loc?.name) setName(loc.name);
                  if (loc?.lat != null) setLat(loc.lat);
                  if (loc?.lng != null) setLng(loc.lng);
                }}
                placeholder={isPickup ? 'Search or select pickup location...' : isDropoff ? 'Search or select dropoff location...' : 'Search or select stop location...'}
                newLocationLat={lat}
                newLocationLng={lng}
                triggerClassName={cn(
                  'h-8.5 bg-white shadow-2xs',
                  isPickup ? 'border-emerald-200' : isDropoff ? 'border-orange-200' : 'border-blue-200'
                )}
              />
            </div>

            <LocationPickerMap
              label="Exact point pin, yard name & address"
              lat={lat}
              lng={lng}
              onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }}
              name={name}
              onNameChange={setName}
              address={address}
              onAddressChange={setAddress}
            />

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-[11px] font-semibold text-rose-700">
                {error}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
