import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { SAUDI_CITY_COORDS } from '@/services/travelTimeService';
import { MAP_THEMES } from '@/components/maps/mapThemes';
import { SAUDI_MAP_CONTAINER_PROPS } from '@/utils/saudiMapConfig';
import { MapPin } from 'lucide-react';

// Custom Leaflet Icons for Pickup (Green) & Dropoff (Coral Red)
const pickupMarkerIcon = L.divIcon({
  html: `<div style="background-color: #10B981; color: white; border-radius: 50%; box-shadow: 0 0 10px rgba(16, 185, 129, 0.8); width: 22px; height: 22px; border: 2.5px solid white; display: grid; place-items: center; font-weight: 900; font-size: 10px;">A</div>`,
  className: '',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const dropoffMarkerIcon = L.divIcon({
  html: `<div style="background-color: #FA634E; color: white; border-radius: 50%; box-shadow: 0 0 10px rgba(250, 99, 78, 0.8); width: 22px; height: 22px; border: 2.5px solid white; display: grid; place-items: center; font-weight: 900; font-size: 10px;">B</div>`,
  className: '',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const stopMarkerIcon = L.divIcon({
  html: `<div style="background-color: #3B82F6; color: white; border-radius: 50%; box-shadow: 0 0 8px rgba(59, 130, 246, 0.8); width: 18px; height: 18px; border: 2px solid white; display: grid; place-items: center; font-weight: 900; font-size: 9px;">•</div>`,
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/** Helper to resolve city coordinates from name string */
function resolveCoords(name?: string, lat?: number | null, lng?: number | null): [number, number] | null {
  if (lat && lng && !isNaN(lat) && !isNaN(lng)) return [lat, lng];
  if (!name) return null;

  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  // Direct key lookup in SAUDI_CITY_COORDS
  for (const [key, coords] of Object.entries(SAUDI_CITY_COORDS)) {
    const keyNorm = key.replace(/[^a-z0-9]/g, '');
    if (normalized.includes(keyNorm) || keyNorm.includes(normalized)) {
      return coords;
    }
  }

  // Common city aliases fallback
  if (normalized.includes('baha')) return [20.0129, 41.4677];
  if (normalized.includes('hofuf') || normalized.includes('hasa')) return [25.3800, 49.5833];
  if (normalized.includes('damm')) return [26.4207, 50.0888];
  if (normalized.includes('riyadh')) return [24.7136, 46.6753];
  if (normalized.includes('jeddah')) return [21.5433, 39.1728];

  return null;
}

function MapBoundsHandler({ originCoords, destCoords }: { originCoords?: [number, number] | null; destCoords?: [number, number] | null }) {
  const map = useMap();

  useEffect(() => {
    if (originCoords && destCoords) {
      const bounds = L.latLngBounds([originCoords, destCoords]);
      map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12, animate: true });
    } else if (originCoords) {
      map.flyTo(originCoords, 9, { animate: true });
    } else if (destCoords) {
      map.flyTo(destCoords, 9, { animate: true });
    }
  }, [originCoords, destCoords, map]);

  return null;
}

interface RouteMiniMapProps {
  origin?: string;
  destination?: string;
  originLat?: number | null;
  originLng?: number | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  className?: string;
}

export const RouteMiniMap: React.FC<RouteMiniMapProps> = ({
  origin,
  destination,
  originLat,
  originLng,
  destinationLat,
  destinationLng,
  className,
}) => {
  const currentTheme = MAP_THEMES.voyager;

  const originCoords = resolveCoords(origin, originLat, originLng);
  const destCoords = resolveCoords(destination, destinationLat, destinationLng);

  const defaultCenter: [number, number] = originCoords || destCoords || [24.7136, 46.6753];

  const polylineWaypoints: [number, number][] = [];
  if (originCoords) polylineWaypoints.push(originCoords);
  if (destCoords) polylineWaypoints.push(destCoords);

  return (
    <div className={`relative w-full h-full min-h-[145px] rounded-2xl overflow-hidden border border-orange-200/90 dark:border-orange-900/60 shadow-2xs group flex flex-col ${className || ''}`}>
      <MapContainer
        center={defaultCenter}
        zoom={6}
        minZoom={SAUDI_MAP_CONTAINER_PROPS.minZoom}
        maxZoom={SAUDI_MAP_CONTAINER_PROPS.maxZoom}
        maxBounds={SAUDI_MAP_CONTAINER_PROPS.maxBounds}
        maxBoundsViscosity={SAUDI_MAP_CONTAINER_PROPS.maxBoundsViscosity}
        scrollWheelZoom={false}
        zoomControl={false}
        attributionControl={false}
        className="w-full h-full min-h-[145px] z-0"
      >
        <TileLayer url={currentTheme.url} />
        <MapBoundsHandler originCoords={originCoords} destCoords={destCoords} />

        {polylineWaypoints.length > 1 && (
          <Polyline
            positions={polylineWaypoints}
            pathOptions={{ color: '#FA634E', weight: 3.5, opacity: 0.85, dashArray: '6, 6' }}
          />
        )}

        {originCoords && (
          <Marker position={originCoords} icon={pickupMarkerIcon}>
            <Popup className="text-xs font-bold">{origin || 'Origin'}</Popup>
          </Marker>
        )}

        {destCoords && (
          <Marker position={destCoords} icon={dropoffMarkerIcon}>
            <Popup className="text-xs font-bold">{destination || 'Destination'}</Popup>
          </Marker>
        )}
      </MapContainer>

      {/* OVERLAY BADGE */}
      <div className="absolute bottom-1.5 left-1.5 z-10 px-2 py-0.5 rounded-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-xs border border-slate-200 dark:border-slate-700 text-[10px] font-extrabold text-slate-700 dark:text-slate-200 flex items-center gap-1 shadow-2xs pointer-events-none">
        <MapPin className="w-3 h-3 text-brand" />
        <span>Saudi Route Map</span>
      </div>
    </div>
  );
};
