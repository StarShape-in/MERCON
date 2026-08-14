import React from 'react';
import { Navigation, Keyboard } from 'lucide-react';
import TripStopCard from '@/components/trips/TripStopCard';
import { Location } from '@/services/locationService';

interface TripStepRouteStopsProps {
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
  focusPickupSearch?: boolean;
  focusDropoffSearch?: boolean;
}

export default function TripStepRouteStops({
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
  focusPickupSearch,
  focusDropoffSearch,
}: TripStepRouteStopsProps) {
  return (
    <div className="space-y-3.5 animate-in fade-in-50 duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-brand" /> Route Stops (Origin &amp; Destination)
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Select origin pickup and destination dropoff locations for this trip route.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
          <Keyboard className="w-3.5 h-3.5 text-brand" />
          <span>Press <kbd className="font-mono bg-white dark:bg-slate-900 px-1 py-0.2 border rounded text-slate-700 dark:text-slate-300 font-bold">\</kbd> for Pickup, <kbd className="font-mono bg-white dark:bg-slate-900 px-1 py-0.2 border rounded text-slate-700 dark:text-slate-300 font-bold">Shift+\</kbd> for Dropoff</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pickup Stop Card */}
        <TripStopCard
          tone="pickup"
          title="Pickup Stop (Origin)"
          hubLabel="Pricing hub (origin)"
          hubPlaceholder="Where does this trip start?"
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
          time={pickupTime}
          onTimeChange={onPickupTimeChange}
          name={pickupName}
          onNameChange={onPickupNameChange}
          address={pickupAddress}
          onAddressChange={onPickupAddressChange}
          hideSchedule={true}
          autoFocusSearch={focusPickupSearch}
          shortcutBadge="\"
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
          time={dropoffTime}
          onTimeChange={onDropoffTimeChange}
          name={dropoffName}
          onNameChange={onDropoffNameChange}
          address={dropoffAddress}
          onAddressChange={onDropoffAddressChange}
          hideSchedule={true}
          autoFocusSearch={focusDropoffSearch}
          shortcutBadge="Shift+\"
        />
      </div>
    </div>
  );
}

