import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { GeoPoint, PREDEFINED_ROUTES } from '@/services/telemetrySimulator';
import { MAP_THEMES } from '@/components/maps/mapThemes';
import { SAUDI_MAP_CONTAINER_PROPS } from '@/utils/saudiMapConfig';

// Compact Pickup Marker (Emerald)
const microPickupIcon = L.divIcon({
  html: `<div style="background-color: #10B981; color: white; border-radius: 50%; box-shadow: 0 0 8px rgba(16, 185, 129, 0.8); width: 16px; height: 16px; border: 2px solid white;"></div>`,
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Compact Dropoff Marker (Crimson)
const microDropoffIcon = L.divIcon({
  html: `<div style="background-color: #F43F5E; color: white; border-radius: 50%; box-shadow: 0 0 8px rgba(244, 63, 94, 0.8); width: 16px; height: 16px; border: 2px solid white;"></div>`,
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

function createMicroTruckIcon(heading: number) {
  return L.divIcon({
    className: 'crisp-truck-marker',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    html: `
      <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
        <div style="transform: rotate(${heading}deg); transition: transform 0.5s ease; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35));">
          <svg width="14" height="24" viewBox="0 0 24 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="shape-rendering: geometricPrecision;">
            <rect x="3" y="13" width="18" height="26" rx="2" fill="#1E293B" stroke="#0F172A" stroke-width="1.5"/>
            <rect x="4" y="3" width="16" height="8.5" rx="2" fill="#E8450F" stroke="#9A2C07" stroke-width="1.5"/>
            <path d="M6 5 Q12 4 18 5 L17 7 Q12 6.2 7 7 Z" fill="#94A3B8"/>
          </svg>
        </div>
      </div>
    `,
  });
}

function MapPanUpdater({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.panTo([lat, lng], { animate: true, duration: 0.8 });
  }, [lat, lng, map]);
  return null;
}

interface TripMicroMapProps {
  currentLat: number;
  currentLng: number;
  heading: number;
  pickupCoords: GeoPoint;
  dropoffCoords: GeoPoint;
  routeKey?: string;
  themeId?: string;
}

export default function TripMicroMap({
  currentLat,
  currentLng,
  heading,
  pickupCoords,
  dropoffCoords,
  routeKey = 'riyadh-jeddah',
  themeId = 'voyager',
}: TripMicroMapProps) {
  const currentTheme = MAP_THEMES[themeId] || MAP_THEMES.voyager;

  const routeDef = PREDEFINED_ROUTES[routeKey];
  const polylineWaypoints = routeDef
    ? routeDef.waypoints.map((w) => [w.lat, w.lng] as [number, number])
    : [
        [pickupCoords.lat, pickupCoords.lng] as [number, number],
        [dropoffCoords.lat, dropoffCoords.lng] as [number, number],
      ];

  return (
    <div className="h-[120px] w-full rounded-xl overflow-hidden relative z-0 border border-black/[0.08] pointer-events-none select-none" style={{ background: currentTheme.previewColor }}>
      <MapContainer
        center={[currentLat, currentLng]}
        zoom={6.5}
        minZoom={SAUDI_MAP_CONTAINER_PROPS.minZoom}
        maxZoom={SAUDI_MAP_CONTAINER_PROPS.maxZoom}
        maxBounds={SAUDI_MAP_CONTAINER_PROPS.maxBounds}
        maxBoundsViscosity={SAUDI_MAP_CONTAINER_PROPS.maxBoundsViscosity}
        scrollWheelZoom={false}
        dragging={false}
        touchZoom={false}
        doubleClickZoom={false}
        boxZoom={false}
        keyboard={false}
        zoomControl={false}
        attributionControl={false}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <MapPanUpdater lat={currentLat} lng={currentLng} />

        <Polyline
          positions={polylineWaypoints}
          pathOptions={{ color: '#E8450F', weight: 3, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }}
        />

        <Marker position={[pickupCoords.lat, pickupCoords.lng]} icon={microPickupIcon} />
        <Marker position={[dropoffCoords.lat, dropoffCoords.lng]} icon={microDropoffIcon} />
        <Marker position={[currentLat, currentLng]} icon={createMicroTruckIcon(heading)} />
      </MapContainer>
    </div>
  );
}
