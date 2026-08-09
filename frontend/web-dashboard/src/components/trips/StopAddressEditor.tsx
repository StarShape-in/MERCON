import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Loader2, MapPin } from 'lucide-react';

import LocationPickerMap from '@/components/trips/LocationPickerMap';
import LocationCombobox from '@/components/rate-cards/LocationCombobox';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { tripService, TripStop } from '@/services/tripService';
import { cn } from '@/lib/utils';

interface StopAddressEditorProps {
  tripId: string;
  stop: TripStop;
  /** "Pickup" / "Drop-off" — the heading shown above the fields. */
  title: string;
  /** False once the trip is completed/invoiced/cancelled; the API refuses then too. */
  editable: boolean;
}

/**
 * Correct one stop's place: the lane endpoint, the exact yard's name and
 * address, and the pin.
 *
 * Saves on its own rather than joining the manifest form's submit, because it
 * hits a different endpoint (`PATCH /trips/:id/stops/:stopId`) and the common
 * case is fixing one address without touching the driver, vehicle or status.
 */
export default function StopAddressEditor({ tripId, stop, title, editable }: StopAddressEditorProps) {
  const queryClient = useQueryClient();

  const [locationId, setLocationId] = useState(stop.locationId ?? '');
  const [name, setName] = useState(stop.location_name ?? '');
  const [address, setAddress] = useState(stop.location_address ?? '');
  const [lat, setLat] = useState<number | null>(stop.location_lat);
  const [lng, setLng] = useState<number | null>(stop.location_lng);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // Re-sync when the trip refetches, so a save elsewhere doesn't leave stale
  // values sitting in these inputs.
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

  return (
    <div className="rounded-xl border border-black/[0.08] dark:border-slate-800 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold text-[#111] dark:text-slate-100 flex items-center gap-1.5">
          <MapPin size={13} className="text-[#E8450F]" />
          {title}
        </span>
        {editable && (
          <Button
            type="button"
            size="sm"
            disabled={!isDirty || saveMutation.isPending}
            onClick={() => { setError(null); saveMutation.mutate(); }}
            className={cn(
              'h-7 gap-1.5 px-3 text-[11px] font-bold',
              saved
                ? 'bg-emerald-600 hover:bg-emerald-600 text-white'
                : 'bg-[#E8450F] hover:bg-[#d03d0c] text-white'
            )}
          >
            {saveMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
            {saved && <Check className="h-3 w-3" />}
            {saved ? 'Saved' : 'Save stop'}
          </Button>
        )}
      </div>

      {!editable ? (
        <div className="space-y-1 text-xs">
          <p className="font-semibold text-[#111] dark:text-slate-100">
            {stop.location_name || `${stop.location_lat.toFixed(4)}, ${stop.location_lng.toFixed(4)}`}
          </p>
          <p className="text-[11px] text-[#6E6E80]">
            {stop.location_address || stop.location?.address || 'No address recorded'}
          </p>
          <p className="text-[11px] text-[#9898A4] italic pt-1">
            This trip is closed — its stops are a record of what happened and can no longer be changed.
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold">Lane endpoint</Label>
            <LocationCombobox
              value={locationId}
              onChange={(locId, loc) => {
                setLocationId(locId);
                if (loc?.address && !address.trim()) setAddress(loc.address);
                if (loc && !name.trim()) setName(loc.name);
              }}
              placeholder="Which city/hub is this in?"
              newLocationLat={lat}
              newLocationLng={lng}
            />
            <p className="text-[10px] text-[#6E6E80]">
              Changing this does not re-price the trip — the amount was fixed when it was created.
            </p>
          </div>

          <LocationPickerMap
            label="Exact point, name and address"
            lat={lat}
            lng={lng}
            onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }}
            name={name}
            onNameChange={setName}
            address={address}
            onAddressChange={setAddress}
          />

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[11px] font-semibold text-rose-700">
              {error}
            </div>
          )}
        </>
      )}
    </div>
  );
}
