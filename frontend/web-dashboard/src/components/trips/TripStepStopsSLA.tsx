import React from 'react';
import { Navigation, Calendar } from 'lucide-react';
import TripStopCard from '@/components/trips/TripStopCard';
import { Location } from '@/services/locationService';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TransitInfo {
  totalMinutes: number;
  durationString: string;
  isInvalid: boolean;
  isTight: boolean;
  isOptimal: boolean;
}

interface TripStepStopsSLAProps {
  pickupLocationId: string;
  pickupLocationName: string;
  pickupLat: number | null;
  pickupLng: number | null;
  pickupTime: string;
  pickupName: string;
  pickupAddress: string;
  dropoffLocationId: string;
  dropoffLocationName: string;
  dropoffLat: number | null;
  dropoffLng: number | null;
  dropoffTime: string;
  dropoffName: string;
  dropoffAddress: string;
  locations: Location[];
  selectedPickupLocation: Location | null;
  selectedDropoffLocation: Location | null;
  pickupDistanceKm: number | null;
  dropoffDistanceKm: number | null;
  transitInfo: TransitInfo | null;
  onPickupLocationIdChange: (id: string) => void;
  onPickupLocationNameChange: (name: string) => void;
  onPickupCoordinatesChange: (lat: number | null, lng: number | null) => void;
  onPickupTimeChange: (time: string) => void;
  onPickupNameChange: (name: string) => void;
  onPickupAddressChange: (address: string) => void;
  onDropoffLocationIdChange: (id: string) => void;
  onDropoffLocationNameChange: (name: string) => void;
  onDropoffCoordinatesChange: (lat: number | null, lng: number | null) => void;
  onDropoffTimeChange: (time: string) => void;
  onDropoffNameChange: (name: string) => void;
  onDropoffAddressChange: (address: string) => void;
  onApplyDropoffOffset: (hours: number, setEod?: boolean) => void;
}

export default function TripStepStopsSLA({
  pickupLocationId,
  pickupLocationName,
  pickupLat,
  pickupLng,
  pickupTime,
  pickupName,
  pickupAddress,
  dropoffLocationId,
  dropoffLocationName,
  dropoffLat,
  dropoffLng,
  dropoffTime,
  dropoffName,
  dropoffAddress,
  locations,
  selectedPickupLocation,
  selectedDropoffLocation,
  pickupDistanceKm,
  dropoffDistanceKm,
  transitInfo,
  onPickupLocationIdChange,
  onPickupLocationNameChange,
  onPickupCoordinatesChange,
  onPickupTimeChange,
  onPickupNameChange,
  onPickupAddressChange,
  onDropoffLocationIdChange,
  onDropoffLocationNameChange,
  onDropoffCoordinatesChange,
  onDropoffTimeChange,
  onDropoffNameChange,
  onDropoffAddressChange,
  onApplyDropoffOffset,
}: TripStepStopsSLAProps) {
  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Navigation className="w-4 h-4 text-[#E8450F]" /> Route Stops &amp; SLA Schedule
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Select origin and destination locations and set planned arrival delivery windows.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pickup Stop Card */}
        <TripStopCard
          tone="pickup"
          title="Pickup Stop (Origin)"
          hubLabel="Pricing hub (origin)"
          hubPlaceholder="Where does this trip start?"
          locationId={pickupLocationId}
          onLocationChange={(locId, loc) => {
            onPickupLocationIdChange(locId);
            if (loc) onPickupLocationNameChange(loc.name);
            if (loc?.lat != null && loc?.lng != null && !pickupAddress.trim()) {
              onPickupCoordinatesChange(loc.lat, loc.lng);
            }
            if (loc && !pickupName.trim()) onPickupNameChange(loc.name);
            if (loc?.address && !pickupAddress.trim()) onPickupAddressChange(loc.address);
          }}
          lat={pickupLat}
          lng={pickupLng}
          onCoordsChange={(lat, lng) => onPickupCoordinatesChange(lat, lng)}
          time={pickupTime}
          onTimeChange={onPickupTimeChange}
          timeLabel="Scheduled Pickup Time"
          timePlaceholder="Select pickup date and time"
          presets={[]}
          name={pickupName}
          onNameChange={onPickupNameChange}
          address={pickupAddress}
          onAddressChange={onPickupAddressChange}
        />

        {/* Dropoff Stop Card */}
        <TripStopCard
          tone="dropoff"
          title="Dropoff Stop (Destination)"
          hubLabel="Pricing hub (destination)"
          hubPlaceholder="Where is this trip heading?"
          locationId={dropoffLocationId}
          onLocationChange={(locId, loc) => {
            onDropoffLocationIdChange(locId);
            if (loc) onDropoffLocationNameChange(loc.name);
            if (loc?.lat != null && loc?.lng != null && !dropoffAddress.trim()) {
              onDropoffCoordinatesChange(loc.lat, loc.lng);
            }
            if (loc && !dropoffName.trim()) onDropoffNameChange(loc.name);
            if (loc?.address && !dropoffAddress.trim()) onDropoffAddressChange(loc.address);
          }}
          lat={dropoffLat}
          lng={dropoffLng}
          onCoordsChange={(lat, lng) => onDropoffCoordinatesChange(lat, lng)}
          time={dropoffTime}
          onTimeChange={onDropoffTimeChange}
          timeLabel="Scheduled Delivery SLA"
          timePlaceholder="Select target arrival date and time"
          presets={[]}
          name={dropoffName}
          onNameChange={onDropoffNameChange}
          address={dropoffAddress}
          onAddressChange={onDropoffAddressChange}
        />
      </div>

      {/* Schedule SLA Presets Card */}
      <Card className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
              Dropoff SLA Delivery Presets
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => onApplyDropoffOffset(4)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300 shadow-2xs cursor-pointer"
            >
              +4 Hours SLA
            </button>
            <button
              type="button"
              onClick={() => onApplyDropoffOffset(8)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300 shadow-2xs cursor-pointer"
            >
              +8 Hours SLA
            </button>
            <button
              type="button"
              onClick={() => onApplyDropoffOffset(24)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300 shadow-2xs cursor-pointer"
            >
              +24 Hours (Next Day)
            </button>
            <button
              type="button"
              onClick={() => onApplyDropoffOffset(0, true)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-slate-300 shadow-2xs cursor-pointer"
            >
              End of Day (23:59)
            </button>
          </div>
        </div>

        {transitInfo && (
          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500 font-semibold">Calculated Transit Window:</span>
            <Badge
              className={cn(
                'font-extrabold text-xs',
                transitInfo.isInvalid
                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200'
                  : transitInfo.isTight
                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-200'
                  : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950/80 dark:text-emerald-200'
              )}
            >
              {transitInfo.isInvalid ? 'Invalid Schedule (Delivery before pickup)' : transitInfo.durationString}
            </Badge>
          </div>
        )}
      </Card>
    </div>
  );
}
