import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { ArrowLeft, Navigation, Wifi, WifiOff, Gauge } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import DashboardLayout from '@/components/layout/DashboardLayout';
import StatusBadge from '@/components/ui/StatusBadge';
import { tripService } from '@/services/tripService';
import { authStore } from '@/store/authStore';
import { MAP_THEMES } from '@/components/maps/mapThemes';
import MapThemeSelector from '@/components/maps/MapThemeSelector';
import { Button } from '@/components/ui/button';
import { SAUDI_MAP_CONTAINER_PROPS } from '@/utils/saudiMapConfig';
import SaudiRedBorderOverlay from '@/components/maps/SaudiRedBorderOverlay';

// Crisp Origin Terminal Marker
const pickupMarkerIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
      <div style="width: 28px; height: 28px; border-radius: 50%; background: #0F1017; color: #10B981; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(0,0,0,0.35); border: 2.5px solid #10B981;">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/></svg>
      </div>
      <div style="position: absolute; bottom: -8px; background: #10B981; color: #022C22; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 8px; font-weight: 800; padding: 0.5px 4px; border-radius: 3px; letter-spacing: 0.04em; box-shadow: 0 1px 3px rgba(0,0,0,0.3);">
        ORIGIN
      </div>
    </div>
  `,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Crisp Destination Terminal Marker
const dropoffMarkerIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
      <div style="width: 28px; height: 28px; border-radius: 50%; background: #0F1017; color: #F43F5E; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 8px rgba(0,0,0,0.35); border: 2.5px solid #F43F5E;">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F43F5E" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
      </div>
      <div style="position: absolute; bottom: -8px; background: #F43F5E; color: #FFFFFF; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 8px; font-weight: 800; padding: 0.5px 4px; border-radius: 3px; letter-spacing: 0.04em; box-shadow: 0 1px 3px rgba(0,0,0,0.3);">
        DEST
      </div>
    </div>
  `,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

function createCrispTruckMarker(plateNumber: string, speed: number) {
  return L.divIcon({
    className: 'crisp-truck-marker',
    iconSize: [52, 52],
    iconAnchor: [26, 26],
    html: `
      <div style="position: relative; width: 52px; height: 52px; display: flex; align-items: center; justify-content: center; pointer-events: auto;">
        <div style="
          filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.45));
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="26" height="46" viewBox="0 0 26 46" fill="none" xmlns="http://www.w3.org/2000/svg" style="shape-rendering: geometricPrecision;">
            <rect x="3.5" y="14" width="19" height="28" rx="2" fill="#1E293B" stroke="#0F172A" stroke-width="1.4"/>
            <line x1="6" y1="19.5" x2="20" y2="19.5" stroke="#334155" stroke-width="1.3"/>
            <line x1="6" y1="25.5" x2="20" y2="25.5" stroke="#334155" stroke-width="1.3"/>
            <line x1="6" y1="31.5" x2="20" y2="31.5" stroke="#334155" stroke-width="1.3"/>
            <line x1="6" y1="37" x2="20" y2="37" stroke="#334155" stroke-width="1.3"/>
            <rect x="4.5" y="41" width="3" height="1" rx="0.5" fill="#EF4444"/>
            <rect x="18.5" y="41" width="3" height="1" rx="0.5" fill="#EF4444"/>
            <rect x="10.5" y="11" width="5" height="3.5" rx="0.5" fill="#0F172A"/>
            <rect x="4.5" y="2" width="17" height="9.5" rx="2.5" fill="#E8450F" stroke="#9A2C07" stroke-width="1.2"/>
            <path d="M7 4.5 Q13 3.3 19 4.5 L18 7 Q13 6.1 8 7 Z" fill="#94A3B8"/>
            <rect x="2.5" y="4.5" width="2" height="3" rx="0.5" fill="#0F172A"/>
            <rect x="21.5" y="4.5" width="2" height="3" rx="0.5" fill="#0F172A"/>
            <rect x="5.5" y="1.8" width="2.5" height="1" rx="0.5" fill="#FEF08A"/>
            <rect x="18" y="1.8" width="2.5" height="1" rx="0.5" fill="#FEF08A"/>
          </svg>
        </div>
        <div style="
          position: absolute;
          bottom: -13px;
          background: #0F172A;
          color: #FFFFFF;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.03em;
          padding: 1.5px 7px;
          border-radius: 9999px;
          white-space: nowrap;
          border: 1px solid rgba(255, 255, 255, 0.2);
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          pointer-events: none;
        ">
          ${plateNumber} • ${speed} km/h
        </div>
      </div>
    `,
  });
}

function MapUpdater({ lat, lng, waypoints }: { lat: number; lng: number; waypoints?: [number, number][] }) {
  const map = useMap();
  const hasInit = useRef(false);

  useEffect(() => {
    if (!hasInit.current && waypoints && waypoints.length > 0) {
      try {
        map.fitBounds(L.latLngBounds(waypoints), { padding: [50, 50], maxZoom: 11, animate: false });
        hasInit.current = true;
      } catch (e) {
        // fallback
      }
    }
  }, [waypoints, map]);

  useEffect(() => {
    map.panTo([lat, lng], { animate: true, duration: 0.8 });
  }, [lat, lng, map]);

  return null;
}

interface GpsPoint {
  lat: number;
  lng: number;
  speed: number;
  receivedAt: number;
}

export default function TripTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [mapThemeId, setMapThemeId] = useState<string>('voyager');
  const [gpsData, setGpsData] = useState<GpsPoint | null>(null);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const { data: trip, isLoading } = useQuery({
    queryKey: ['trip-track', id],
    queryFn: () => tripService.getById(id!),
    enabled: !!id,
  });

  // Real live GPS: authenticate, join this trip's room, listen for updates.
  useEffect(() => {
    if (!id) return;

    const socket: Socket = io(import.meta.env.VITE_API_URL || 'https://dev.mercon.tech', {
      auth: { token: authStore.getToken() },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join:trip', id);
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));

    socket.on(`trip:location_update:${id}`, (data: { lat: number; lng: number; speed: number }) => {
      setGpsData({ lat: data.lat, lng: data.lng, speed: data.speed ?? 0, receivedAt: Date.now() });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [id]);

  const currentTheme = MAP_THEMES[mapThemeId] || MAP_THEMES.voyager;

  if (isLoading || !trip) {
    return (
      <DashboardLayout active="Trips" title="Live Tracking">
        <div className="p-8 flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-[#FF5500] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  const pickup = trip.stops?.find((s) => s.stop_type === 'Pickup');
  const dropoff = trip.stops?.find((s) => s.stop_type === 'Dropoff');

  const latCenter = gpsData ? gpsData.lat : pickup ? pickup.location_lat : 24.7136;
  const lngCenter = gpsData ? gpsData.lng : pickup ? pickup.location_lng : 46.6753;
  const currentSpeed = gpsData ? Math.round(gpsData.speed) : 0;

  const polylinePositions: [number, number][] = [
    [pickup ? pickup.location_lat : latCenter, pickup ? pickup.location_lng : lngCenter],
    [dropoff ? dropoff.location_lat : latCenter, dropoff ? dropoff.location_lng : lngCenter],
  ];

  const secondsSinceUpdate = gpsData ? Math.round((Date.now() - gpsData.receivedAt) / 1000) : null;

  return (
    <DashboardLayout
      active="Trips"
      title="Live Tracking"
      breadcrumb={`Trips / ${trip.ref_id || 'Track'}`}
      pageTitle="Live GPS Tracking"
      actions={
        <div className="flex items-center gap-2">
          <MapThemeSelector
            currentThemeId={mapThemeId}
            onThemeChange={(newTheme) => setMapThemeId(newTheme)}
          />

          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/trips/${id}`)}
            className="h-8 text-xs font-bold gap-1 border-black/[0.08]"
          >
            <ArrowLeft size={13} />
            <span>Details</span>
          </Button>
        </div>
      }
    >
      <div className="px-4 sm:px-6 pb-6 grid grid-cols-1 lg:grid-cols-3 gap-5 lg:h-[calc(100vh-170px)] animate-fade-in">

        {/* Map panel */}
        <div className="lg:col-span-2 rounded-[24px] border border-black/[0.1] shadow-2xl relative overflow-hidden flex flex-col min-h-[400px] z-0" style={{ background: currentTheme.previewColor }}>
          <MapContainer
            center={[latCenter, lngCenter]}
            zoom={8}
            minZoom={SAUDI_MAP_CONTAINER_PROPS.minZoom}
            maxZoom={SAUDI_MAP_CONTAINER_PROPS.maxZoom}
            maxBounds={SAUDI_MAP_CONTAINER_PROPS.maxBounds}
            maxBoundsViscosity={SAUDI_MAP_CONTAINER_PROPS.maxBoundsViscosity}
            scrollWheelZoom={true}
            attributionControl={false}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
          >
            <SaudiRedBorderOverlay />
            <TileLayer
              key={currentTheme.id}
              attribution={currentTheme.attribution}
              url={currentTheme.url}
            />

            <MapUpdater lat={latCenter} lng={lngCenter} />

            <Polyline
              positions={polylinePositions}
              pathOptions={{ color: '#FF5500', weight: 4, opacity: 0.85, dashArray: '6, 10' }}
            />

            {pickup && (
              <Marker position={[pickup.location_lat, pickup.location_lng]} icon={pickupMarkerIcon}>
                <Popup className={currentTheme.isDark ? "dark-map-popup" : ""}>
                  <div className="text-xs font-sans p-1">
                    <p className="font-bold text-[#10B981]">Pickup Location</p>
                    <p className="text-[10px] text-gray-500">{pickup.location_lat.toFixed(5)}, {pickup.location_lng.toFixed(5)}</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {dropoff && (
              <Marker position={[dropoff.location_lat, dropoff.location_lng]} icon={dropoffMarkerIcon}>
                <Popup className={currentTheme.isDark ? "dark-map-popup" : ""}>
                  <div className="text-xs font-sans p-1">
                    <p className="font-bold text-[#F43F5E]">Dropoff Location</p>
                    <p className="text-[10px] text-gray-500">{dropoff.location_lat.toFixed(5)}, {dropoff.location_lng.toFixed(5)}</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {gpsData && (
              <Marker position={[latCenter, lngCenter]} icon={createCrispTruckMarker(trip.vehicle?.plate_number || 'Truck', currentSpeed)}>
                <Popup className={currentTheme.isDark ? "dark-map-popup" : ""}>
                  <div className="text-center font-sans p-1">
                    <p className="font-bold text-[#E8450F]">{trip.vehicle?.plate_number || 'Truck'}</p>
                    <p className="text-xs text-gray-500">Speed: {currentSpeed} km/h</p>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Top Floating HUD Badges */}
          <div className="absolute top-4 left-4 right-4 z-[400] flex justify-between items-start pointer-events-none">
            <div className={`px-3.5 py-2 rounded-xl shadow-xl border flex items-center gap-2 pointer-events-auto text-xs ${
              currentTheme.isDark ? 'bg-[#090A0F]/90 backdrop-blur-xl border-white/10 text-white' : 'bg-white/95 backdrop-blur-xl border-black/[0.08] text-[#111]'
            }`}>
              {connected ? (
                <>
                  <Wifi size={13} className="text-green-500" />
                  <span className="font-mono font-bold">LIVE</span>
                </>
              ) : (
                <>
                  <WifiOff size={13} className="text-red-500" />
                  <span className="font-mono font-bold">DISCONNECTED</span>
                </>
              )}
            </div>

            {!gpsData && (
              <div className={`px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xl border flex items-center gap-2 pointer-events-auto ${
                currentTheme.isDark ? 'bg-[#090A0F]/90 backdrop-blur-xl border-white/10 text-white' : 'bg-white/95 backdrop-blur-xl border-black/[0.08] text-[#111]'
              }`}>
                <span>Waiting for the driver's GPS signal…</span>
              </div>
            )}
          </div>

          {/* Bottom Floating Telemetry Panel */}
          <div className={`absolute bottom-4 left-4 right-4 z-[400] p-4 rounded-xl shadow-2xl border flex items-center justify-between pointer-events-auto ${
            currentTheme.isDark ? 'bg-[#090A0F]/90 backdrop-blur-xl border-white/10 text-white' : 'bg-white/95 backdrop-blur-xl border-black/[0.08] text-[#111]'
          }`}>
            <div className="flex items-center gap-4">
              <div className="bg-[#FF5500]/20 p-2.5 rounded-xl text-[#FF5500] border border-[#FF5500]/30">
                <Gauge size={20} />
              </div>
              <div>
                <p className="text-[9px] text-gray-400 font-mono uppercase tracking-wider">Live Coordinates</p>
                <p className="text-xs font-mono font-bold mt-0.5">
                  {latCenter.toFixed(5)}, {lngCenter.toFixed(5)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[9px] text-gray-400 font-mono uppercase tracking-wider">Speed</p>
                <p className="text-sm font-bold text-[#FF5500] mt-0.5">{currentSpeed} km/h</p>
              </div>
              <div className="text-right border-l border-gray-200 dark:border-white/10 pl-6">
                <p className="text-[9px] text-gray-400 font-mono uppercase tracking-wider">Last Update</p>
                <p className="text-sm font-bold mt-0.5">
                  {secondsSinceUpdate === null ? '—' : secondsSinceUpdate < 60 ? `${secondsSinceUpdate}s ago` : `${Math.round(secondsSinceUpdate / 60)}m ago`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tracking info panel */}
        <div className="bg-white rounded-[24px] border border-black/[0.06] p-5 shadow-sm space-y-5 flex flex-col justify-between h-full">
          <div>
            <div className="border-b border-black/[0.04] pb-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[#6E6E80] font-bold uppercase tracking-wider">Active Manifest</span>
                <StatusBadge status={trip.status} />
              </div>
              <p className="text-base font-extrabold text-[#111] mt-1">{trip.ref_id}</p>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-[9px] text-[#6E6E80] uppercase font-bold tracking-wider">Driver Profile</p>
                {trip.driver ? (
                  <p className="text-xs font-semibold text-[#111] mt-0.5">
                    {trip.driver.first_name} {trip.driver.last_name} ({trip.driver.phone_primary})
                  </p>
                ) : (
                  <p className="text-xs text-red-500 font-semibold mt-0.5">Driver Not Assigned</p>
                )}
              </div>

              <div>
                <p className="text-[9px] text-[#6E6E80] uppercase font-bold tracking-wider">Vehicle Details</p>
                {trip.vehicle ? (
                  <p className="text-xs font-semibold text-[#111] mt-0.5">
                    {trip.vehicle.plate_number} ({trip.vehicle.asset_type})
                  </p>
                ) : (
                  <p className="text-xs text-red-500 font-semibold mt-0.5">Vehicle Not Assigned</p>
                )}
              </div>

              {pickup && dropoff && (
                <div>
                  <p className="text-[9px] text-[#6E6E80] uppercase font-bold tracking-wider">Terminal Stops</p>
                  <div className="mt-2 space-y-3 pl-3 border-l-2 border-[#F5F5F7]">
                    <div className="text-xs">
                      <p className="font-bold text-[#10B981]">1. Pickup Location</p>
                      <p className="text-[10px] text-gray-500 font-medium">{pickup.location_lat.toFixed(4)}, {pickup.location_lng.toFixed(4)}</p>
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-[#F43F5E]">2. Dropoff Destination</p>
                      <p className="text-[10px] text-gray-500 font-medium">{dropoff.location_lat.toFixed(4)}, {dropoff.location_lng.toFixed(4)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-black/[0.04] pt-4">
            <div className="bg-brand-light border border-[#FF5500]/10 p-3 rounded-xl flex items-start gap-2.5">
              <Navigation size={16} className="text-[#FF5500] shrink-0 mt-0.5 stroke-[2.2]" />
              <div>
                <p className="text-xs font-bold text-[#FF5500]">{connected ? 'Live Telemetry Connected' : 'Reconnecting…'}</p>
                <p className="text-[10px] text-[#FF5500]/80 mt-0.5">
                  {gpsData
                    ? "Position updates from the driver's app in real time."
                    : "No GPS ping received yet for this trip."}
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
