import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Crosshair } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SAUDI_MAP_CONTAINER_PROPS } from '@/utils/saudiMapConfig';

// Tone pin icons
const pickupPinIcon = L.divIcon({
  html: `<div style="background-color: #10B981; color: white; border: 2.5px solid white; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 10px rgba(0,0,0,0.3); width: 28px; height: 28px;"></div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const dropoffPinIcon = L.divIcon({
  html: `<div style="background-color: var(--color-brand); color: white; border: 2.5px solid white; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); box-shadow: 0 4px 10px rgba(0,0,0,0.3); width: 28px; height: 28px;"></div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

interface TripStopMapProps {
  tone: 'pickup' | 'dropoff';
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  defaultCenter?: [number, number];
  height?: number;
}

function ClickToPlacePin({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function FlyToPin({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], Math.max(map.getZoom(), 13), { animate: true });
  }, [lat, lng, map]);
  return null;
}

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 80);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

export default function TripStopMap({
  tone,
  lat,
  lng,
  onChange,
  defaultCenter = tone === 'pickup' ? [24.7136, 46.6753] : [21.5433, 39.1728],
  height = 210,
}: TripStopMapProps) {
  const center: [number, number] = lat != null && lng != null ? [lat, lng] : defaultCenter;
  const pinIcon = tone === 'pickup' ? pickupPinIcon : dropoffPinIcon;
  const hasPin = lat != null && lng != null;

  return (
    <div className="space-y-1.5 animate-in fade-in-50 duration-200">
      <div
        className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 relative z-0 shadow-xs"
        style={{ height }}
      >
        <MapContainer
          center={center}
          zoom={hasPin ? 13 : 6}
          minZoom={SAUDI_MAP_CONTAINER_PROPS.minZoom}
          maxZoom={SAUDI_MAP_CONTAINER_PROPS.maxZoom}
          maxBounds={SAUDI_MAP_CONTAINER_PROPS.maxBounds}
          maxBoundsViscosity={SAUDI_MAP_CONTAINER_PROPS.maxBoundsViscosity}
          scrollWheelZoom
          attributionControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; Esri'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          />
          <MapResizer />
          <ClickToPlacePin onPick={onChange} />
          {hasPin && (
            <>
              <FlyToPin lat={lat} lng={lng} />
              <Marker
                position={[lat, lng]}
                icon={pinIcon}
                draggable
                eventHandlers={{
                  dragend: (e) => {
                    const m = e.target as L.Marker;
                    const pos = m.getLatLng();
                    onChange(pos.lat, pos.lng);
                  },
                }}
              />
            </>
          )}
        </MapContainer>
      </div>

      <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5 text-[10px]">
          <Crosshair className={cn("w-3 h-3 shrink-0", tone === 'pickup' ? "text-emerald-600" : "text-brand")} />
          Click map or drag marker to set exact location
        </span>
        {hasPin && (
          <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center">
            <MapPin className="w-3 h-3 text-rose-500 fill-rose-500/20 mr-0.5 shrink-0" />
            <span>{lat.toFixed(5)}, {lng.toFixed(5)}</span>
          </Badge>
        )}
      </div>
    </div>
  );
}
