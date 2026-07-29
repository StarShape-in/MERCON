import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import { GeoPoint, PREDEFINED_ROUTES } from '@/services/telemetrySimulator';
import { MAP_THEMES } from '@/components/maps/mapThemes';

// Compact Pickup Marker (Emerald)
const microPickupIcon = L.divIcon({
  html: `<div style="background-color: #10B981; color: white; border-radius: 50%; box-shadow: 0 0 10px rgba(16, 185, 129, 0.8); width: 20px; height: 20px; border: 2px solid white; display: flex; align-items: center; justify-content: center;"><div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div></div>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

// Compact Dropoff Marker (Crimson)
const microDropoffIcon = L.divIcon({
  html: `<div style="background-color: #F43F5E; color: white; border-radius: 50%; box-shadow: 0 0 10px rgba(244, 63, 94, 0.8); width: 20px; height: 20px; border: 2px solid white; display: flex; align-items: center; justify-content: center;"><div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div></div>`,
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

function createMicroTruckIcon(heading: number) {
  return L.divIcon({
    html: `
      <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
        <div class="animate-ping" style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background-color: rgba(255, 85, 0, 0.35);"></div>
        <div style="width: 24px; height: 24px; border-radius: 50%; background: #0F1017; color: #FF5500; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 14px rgba(255, 85, 0, 0.9); border: 2px solid #FF5500; transform: rotate(${heading}deg); transition: transform 0.3s ease;">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
        </div>
      </div>
    `,
    className: '',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function MapFlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom(), { animate: true });
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
    <div className="h-[190px] w-full rounded-xl overflow-hidden relative z-0 border border-black/[0.08] shadow-inner" style={{ background: currentTheme.previewColor }}>
      <MapContainer
        center={[currentLat, currentLng]}
        zoom={7}
        scrollWheelZoom={false}
        dragging={false}
        zoomControl={false}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          key={currentTheme.id}
          attribution={currentTheme.attribution}
          url={currentTheme.url}
        />

        <MapFlyTo lat={currentLat} lng={currentLng} />

        <Polyline
          positions={polylineWaypoints}
          pathOptions={{ color: '#FF5500', weight: 3, opacity: 0.85, dashArray: '5, 8' }}
        />

        {/* Pickup Pin */}
        <Marker position={[pickupCoords.lat, pickupCoords.lng]} icon={microPickupIcon}>
          <Popup className={currentTheme.isDark ? "dark-map-popup" : ""}>
            <div className="text-[11px] font-bold">Pickup Origin</div>
          </Popup>
        </Marker>

        {/* Dropoff Pin */}
        <Marker position={[dropoffCoords.lat, dropoffCoords.lng]} icon={microDropoffIcon}>
          <Popup className={currentTheme.isDark ? "dark-map-popup" : ""}>
            <div className="text-[11px] font-bold">Dropoff Destination</div>
          </Popup>
        </Marker>

        {/* Animated Moving Truck */}
        <Marker position={[currentLat, currentLng]} icon={createMicroTruckIcon(heading)} />
      </MapContainer>
    </div>
  );
}
