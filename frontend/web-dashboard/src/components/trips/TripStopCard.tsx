import { ReactNode } from 'react';
import { Clock } from 'lucide-react';

import LocationCombobox from '@/components/rate-cards/LocationCombobox';
import LocationPickerMap from '@/components/trips/LocationPickerMap';
import { Label } from '@/components/ui/label';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Location } from '@/services/locationService';
import { cn } from '@/lib/utils';

interface TripStopCardProps {
  /** Colours the accent dot and the hub icon: green for pickup, red for dropoff. */
  tone: 'pickup' | 'dropoff';
  title: string;
  /** Lane endpoint — what the rate card is priced against. */
  hubLabel: string;
  hubPlaceholder: string;
  locationId: string;
  onLocationChange: (locationId: string, location: Location | null) => void;
  excludeLocationId?: string;
  lat: number | null;
  lng: number | null;
  onCoordsChange: (lat: number, lng: number) => void;
  name: string;
  onNameChange: (name: string) => void;
  address: string;
  onAddressChange: (address: string) => void;
  time: string;
  onTimeChange: (value: string) => void;
  timeLabel: string;
  timePlaceholder: string;
  minDate?: Date;
  timeError?: boolean;
  /** Small chips that fill the time in one click. */
  presets: { label: string; onClick: () => void }[];
  /** Rendered under the fields — e.g. the pin-far-from-hub warning. */
  warning?: ReactNode;
}

/**
 * One stop of the trip: the pricing hub, the exact place, and when the truck is
 * due there — in that order, which is the order the dispatcher thinks in.
 *
 * Two of these sit side by side in step 3. That only fits because the map and
 * the manual name/address inputs are folded away inside `LocationPickerMap`
 * until they're needed; the search box handles the common case on its own.
 */
export default function TripStopCard({
  tone,
  title,
  hubLabel,
  hubPlaceholder,
  locationId,
  onLocationChange,
  excludeLocationId,
  lat,
  lng,
  onCoordsChange,
  name,
  onNameChange,
  address,
  onAddressChange,
  time,
  onTimeChange,
  timeLabel,
  timePlaceholder,
  minDate,
  timeError,
  presets,
  warning,
}: TripStopCardProps) {
  const isPickup = tone === 'pickup';

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="flex items-center gap-2 border-b bg-muted/30 px-3.5 py-2.5">
        <span
          className={cn(
            'w-2.5 h-2.5 rounded-full ring-4 shrink-0',
            isPickup ? 'bg-emerald-500 ring-emerald-500/20' : 'bg-destructive ring-destructive/20'
          )}
        />
        <span className="text-sm font-bold text-foreground">{title}</span>
      </div>

      <div className="p-3.5 space-y-3">
        {/* Lane endpoint — the only thing pricing looks at. */}
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold text-foreground">
            {hubLabel} <span className="text-destructive">*</span>
          </Label>
          <LocationCombobox
            value={locationId}
            onChange={onLocationChange}
            placeholder={hubPlaceholder}
            excludeLocationId={excludeLocationId}
            newLocationLat={lat}
            newLocationLng={lng}
          />
        </div>

        {/* Exact place — what the driver navigates to. */}
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold text-foreground">
            Exact {isPickup ? 'pickup' : 'dropoff'} point <span className="text-destructive">*</span>
          </Label>
          <LocationPickerMap
            compact
            label=""
            lat={lat}
            lng={lng}
            onChange={onCoordsChange}
            name={name}
            onNameChange={onNameChange}
            address={address}
            onAddressChange={onAddressChange}
          />
        </div>

        {warning}

        {/* When it's due. */}
        <div className="space-y-1.5">
          <Label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
            <Clock className={cn('w-3.5 h-3.5', isPickup ? 'text-emerald-600' : 'text-destructive')} />
            {timeLabel} <span className="text-destructive">*</span>
          </Label>
          <DateTimePicker
            value={time}
            onChange={onTimeChange}
            placeholder={timePlaceholder}
            label={timeLabel}
            minDate={minDate}
            error={timeError}
          />
          <div className="flex flex-wrap items-center gap-1 pt-0.5">
            {presets.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={preset.onClick}
                className="text-[11px] px-2 py-0.5 rounded-md font-medium bg-background hover:bg-muted text-foreground border border-border/70 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
