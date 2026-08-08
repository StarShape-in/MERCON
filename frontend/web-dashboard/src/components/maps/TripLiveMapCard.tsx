import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Gauge, SatelliteDish } from 'lucide-react';

import { authStore } from '@/store/authStore';
import { MAP_THEMES } from '@/components/maps/mapThemes';
import MapThemeSelector from '@/components/maps/MapThemeSelector';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const pickupMarkerIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <div class="animate-ping" style="position: absolute; width: 30px; height: 30px; border-radius: 50%; background-color: rgba(16, 185, 129, 0.4);"></div>
      <div style="width: 26px; height: 26px; border-radius: 50%; background: #0F1017; color: #10B981; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 16px rgba(16, 185, 129, 0.8); border: 2px solid #10B981; z-index: 2;">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
    </div>
  `,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const dropoffMarkerIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <div class="animate-ping" style="position: absolute; width: 30px; height: 30px; border-radius: 50%; background-color: rgba(244, 63, 94, 0.4);"></div>
      <div style="width: 26px; height: 26px; border-radius: 50%; background: #0F1017; color: #F43F5E; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 16px rgba(244, 63, 94, 0.8); border: 2px solid #F43F5E; z-index: 2;">
        <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
    </div>
  `,
  className: '',
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function truckIcon(heading: number) {
  return L.divIcon({
    html: `
      <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
        <div class="animate-ping" style="position: absolute; width: 40px; height: 40px; border-radius: 50%; background-color: rgba(255, 85, 0, 0.4);"></div>
        <div style="width: 30px; height: 30px; border-radius: 50%; background: #0F1017; color: #FF5500; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(255, 85, 0, 0.9), inset 0 0 8px #FF5500; border: 2px solid #FF5500; transform: rotate(${heading}deg); transition: transform 0.3s ease;">
          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
        </div>
      </div>
    `,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
}

function MapFlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);
  return null;
}

interface GpsPoint {
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  receivedAt: number;
}

interface TripLiveMapCardProps {
  tripId: string;
  refId: string;
  status: string;
  vehiclePlate?: string | null;
  /** Vehicle must have an ICCES tracker for the cron job to ever emit a
   *  location for this trip — without it there is no live position to show. */
  hasTracker: boolean;
  /** Last known position persisted on the vehicle row, used before any
   *  socket event has arrived this session. */
  lastLat?: number | null;
  lastLng?: number | null;
  pickupLat?: number;
  pickupLng?: number;
  pickupName?: string | null;
  dropoffLat?: number;
  dropoffLng?: number;
  dropoffName?: string | null;
}

export default function TripLiveMapCard({
  tripId,
  refId,
  status,
  vehiclePlate,
  hasTracker,
  lastLat,
  lastLng,
  pickupLat,
  pickupLng,
  pickupName,
  dropoffLat,
  dropoffLng,
  dropoffName,
}: TripLiveMapCardProps) {
  const navigate = useNavigate();
  const [mapThemeId, setMapThemeId] = useState<string>('voyager');
  const [gps, setGps] = useState<GpsPoint | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const isLive = status === 'InTransit' && hasTracker;

  useEffect(() => {
    if (!isLive) return;

    const socket: Socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
      auth: { token: authStore.getToken() },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join:trip', tripId);
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    socket.on(`trip:location_update:${tripId}`, (data: { lat: number; lng: number; speed?: number; heading?: number }) => {
      setGps({ lat: data.lat, lng: data.lng, speed: data.speed ?? 0, heading: data.heading ?? 0, receivedAt: Date.now() });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [tripId, isLive]);

  const currentTheme = MAP_THEMES[mapThemeId] || MAP_THEMES.voyager;

  const hasPickup = pickupLat != null && pickupLng != null;
  const hasDropoff = dropoffLat != null && dropoffLng != null;

  // Center on the live position if we have one, else the last known vehicle
  // fix, else the pickup stop — never a fabricated default.
  const centerLat = gps?.lat ?? lastLat ?? pickupLat ?? 24.7136;
  const centerLng = gps?.lng ?? lastLng ?? pickupLng ?? 46.6753;
  const truckLat = gps?.lat ?? lastLat;
  const truckLng = gps?.lng ?? lastLng;

  const polylinePositions: [number, number][] =
    hasPickup && hasDropoff
      ? [[pickupLat!, pickupLng!], [dropoffLat!, dropoffLng!]]
      : [];

  return (
    <Card className="border-black/[0.06] shadow-md rounded-2xl bg-white overflow-hidden">
      <CardHeader className="pb-3 border-b border-black/[0.04]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-[#FF5500] animate-ping' : 'bg-[#9898A4]'}`} />
              <CardTitle className="text-sm font-extrabold text-[#111]">Route & Live Position</CardTitle>
              <Badge variant="outline" className={`text-[10px] font-mono ${currentTheme.badgeColor}`}>
                {currentTheme.name}
              </Badge>
            </div>
            <CardDescription className="text-xs text-[#6E6E80] mt-0.5">
              {isLive
                ? connected
                  ? 'Live ICCES GPS telemetry'
                  : 'Connecting to live telemetry…'
                : hasTracker
                ? 'No live position — trip is not In Transit'
                : 'This vehicle has no GPS tracker configured'}
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <MapThemeSelector
              currentThemeId={mapThemeId}
              onThemeChange={(newTheme) => setMapThemeId(newTheme)}
            />

            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate(`/trips/${tripId}/track`)}
              className="h-8 text-xs font-bold gap-1 border-black/[0.08] hover:bg-[#F5F5F7]"
              disabled={!isLive}
            >
              <Navigation size={13} className="text-[#FF5500]" />
              <span>Full Radar</span>
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-3">
        <div className="h-[310px] rounded-xl overflow-hidden border border-black/[0.1] relative z-0 shadow-xl" style={{ background: currentTheme.previewColor }}>
          <MapContainer
            center={[centerLat, centerLng]}
            zoom={hasPickup && hasDropoff ? 8 : 11}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
          >
            <TileLayer
              key={currentTheme.id}
              attribution={currentTheme.attribution}
              url={currentTheme.url}
            />

            <MapFlyTo lat={centerLat} lng={centerLng} />

            {polylinePositions.length === 2 && (
              <Polyline
                positions={polylinePositions}
                pathOptions={{ color: '#FF5500', weight: 4, opacity: 0.85, dashArray: '6, 10' }}
              />
            )}

            {hasPickup && (
              <Marker position={[pickupLat!, pickupLng!]} icon={pickupMarkerIcon}>
                <Popup className={currentTheme.isDark ? 'dark-map-popup' : ''}>
                  <div className="text-xs font-sans p-1">
                    <p className="font-bold text-[#10B981]">Pickup</p>
                    <p className="text-[10px] text-gray-500">{pickupName || `${pickupLat!.toFixed(4)}, ${pickupLng!.toFixed(4)}`}</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {hasDropoff && (
              <Marker position={[dropoffLat!, dropoffLng!]} icon={dropoffMarkerIcon}>
                <Popup className={currentTheme.isDark ? 'dark-map-popup' : ''}>
                  <div className="text-xs font-sans p-1">
                    <p className="font-bold text-[#F43F5E]">Dropoff</p>
                    <p className="text-[10px] text-gray-500">{dropoffName || `${dropoffLat!.toFixed(4)}, ${dropoffLng!.toFixed(4)}`}</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {isLive && truckLat != null && truckLng != null && (
              <Marker position={[truckLat, truckLng]} icon={truckIcon(gps?.heading ?? 0)}>
                <Popup className={currentTheme.isDark ? 'dark-map-popup' : ''}>
                  <div className="text-xs font-sans p-1">
                    <p className="font-bold text-[#FF5500]">{vehiclePlate || refId}</p>
                    <p className="text-[10px] text-gray-500">Speed: {Math.round(gps?.speed ?? 0)} km/h</p>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>

          {isLive && (
            <div className={`absolute bottom-3 left-3 right-3 z-[400] p-3.5 rounded-xl shadow-xl border text-xs space-y-2 ${
              currentTheme.isDark
                ? 'bg-[#090A0F]/90 backdrop-blur-xl border-white/10 text-white'
                : 'bg-white/95 backdrop-blur-xl border-black/[0.08] text-[#111]'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="bg-[#FF5500]/20 p-2 rounded-lg text-[#FF5500] border border-[#FF5500]/30">
                    <Gauge size={18} />
                  </div>
                  <div>
                    <p className="text-[9px] text-gray-400 font-mono uppercase tracking-wider">Telemetry Stream</p>
                    <p className="text-xs font-bold">
                      {gps ? (
                        <>
                          {Math.round(gps.speed)} km/h • <span className="font-mono text-[11px] text-orange-500">{gps.lat.toFixed(4)}, {gps.lng.toFixed(4)}</span>
                        </>
                      ) : (
                        <span className="text-gray-400 font-semibold">Waiting for first GPS ping…</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-right">
                  <SatelliteDish size={13} className={connected ? 'text-[#16A34A]' : 'text-gray-400'} />
                  <span className={`text-[10px] font-bold font-mono uppercase ${connected ? 'text-[#16A34A]' : 'text-gray-400'}`}>
                    {connected ? 'Connected' : 'Offline'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
