import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Navigation, ShieldCheck, Play, Pause, FastForward, Gauge, MapPin, Moon, Sun, Globe } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import DashboardLayout from '@/components/layout/DashboardLayout';
import Btn from '@/components/ui/Btn';
import StatusBadge from '@/components/ui/StatusBadge';
import { tripService } from '@/services/tripService';
import { PREDEFINED_ROUTES } from '@/services/telemetrySimulator';
import { useSimulatedTelemetry } from '@/hooks/useSimulatedTelemetry';
import { MAP_TILES } from '@/components/maps/FleetLiveMap';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// High-Tech Neon Pickup Marker (Emerald LED)
const pickupMarkerIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
      <div class="animate-ping" style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background-color: rgba(16, 185, 129, 0.4);"></div>
      <div style="width: 28px; height: 28px; border-radius: 50%; background: #0F1017; color: #10B981; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 18px rgba(16, 185, 129, 0.8); border: 2px solid #10B981; z-index: 2;">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
    </div>
  `,
  className: '',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

// High-Tech Neon Dropoff Marker (Crimson LED)
const dropoffMarkerIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
      <div class="animate-ping" style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background-color: rgba(244, 63, 94, 0.4);"></div>
      <div style="width: 28px; height: 28px; border-radius: 50%; background: #0F1017; color: #F43F5E; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 18px rgba(244, 63, 94, 0.8); border: 2px solid #F43F5E; z-index: 2;">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
    </div>
  `,
  className: '',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

function createTruckMarkerIcon(heading: number) {
  return L.divIcon({
    html: `
      <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
        <div class="animate-ping" style="position: absolute; width: 46px; height: 46px; border-radius: 50%; background-color: rgba(255, 85, 0, 0.4);"></div>
        <div style="width: 36px; height: 36px; border-radius: 50%; background: #0F1017; color: #FF5500; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 24px rgba(255, 85, 0, 0.9), inset 0 0 10px #FF5500; border: 2px solid #FF5500; transform: rotate(${heading}deg); transition: transform 0.3s ease;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
        </div>
      </div>
    `,
    className: '',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

function MapUpdater({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);
  return null;
}

export default function TripTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { fleet, isPlaying, speedMultiplier, togglePlay, changeSpeedMultiplier } = useSimulatedTelemetry(1);
  const [mapTheme, setMapTheme] = useState<keyof typeof MAP_TILES>('midnight');

  const { data: trip, isLoading } = useQuery({
    queryKey: ['trip-track', id],
    queryFn: () => tripService.getById(id!),
    enabled: !!id,
  });

  const currentTile = MAP_TILES[mapTheme];
  const simulatedTruck = fleet.find((f) => f.tripId === id || f.refId === trip?.ref_id) || fleet[0];

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

  const latCenter = simulatedTruck ? simulatedTruck.currentCoords.lat : pickup ? pickup.location_lat : 24.7136;
  const lngCenter = simulatedTruck ? simulatedTruck.currentCoords.lng : pickup ? pickup.location_lng : 46.6753;
  const currentSpeed = simulatedTruck ? simulatedTruck.speedKmH : 88;
  const heading = simulatedTruck ? simulatedTruck.heading : 240;
  const progress = simulatedTruck ? simulatedTruck.progressPercentage : 42;
  const etaMinutes = simulatedTruck ? simulatedTruck.etaMinutes : 320;

  const route = PREDEFINED_ROUTES['riyadh-jeddah'];
  const polylinePositions = route
    ? route.waypoints.map((w) => [w.lat, w.lng] as [number, number])
    : [
        [pickup ? pickup.location_lat : 24.6432, pickup ? pickup.location_lng : 46.7214] as [number, number],
        [dropoff ? dropoff.location_lat : 21.5433, dropoff ? dropoff.location_lng : 39.1728] as [number, number],
      ];

  return (
    <DashboardLayout
      active="Trips"
      title="Live Tracking"
      breadcrumb={`Trips / ${trip.ref_id || 'Track'}`}
      pageTitle="Cyber Radar Telemetry"
      actions={
        <div className="flex items-center gap-2">
          {/* Tile Switcher */}
          <div className="flex items-center bg-[#F5F5F7] p-1 rounded-xl border border-black/[0.05]">
            <button
              onClick={() => setMapTheme('midnight')}
              className={`h-7 px-2.5 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all ${
                mapTheme === 'midnight' ? 'bg-[#1C1C2E] text-white shadow-sm' : 'text-gray-600 hover:text-black'
              }`}
            >
              <Moon size={11} className={mapTheme === 'midnight' ? 'text-orange-400' : ''} />
              <span>Midnight</span>
            </button>
            <button
              onClick={() => setMapTheme('voyager')}
              className={`h-7 px-2.5 text-[11px] font-bold rounded-lg flex items-center gap-1 transition-all ${
                mapTheme === 'voyager' ? 'bg-white text-black shadow-sm' : 'text-gray-600 hover:text-black'
              }`}
            >
              <Sun size={11} className={mapTheme === 'voyager' ? 'text-amber-500' : ''} />
              <span>Voyager</span>
            </button>
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate(`/trips/${id}`)}
            className="h-8 text-xs font-bold gap-1 border-black/[0.08]"
          >
            <ArrowLeft size={13} />
            <span>Details</span>
          </Button>

          <Button
            size="sm"
            onClick={togglePlay}
            className={`h-8 text-xs font-bold gap-1 ${
              isPlaying ? 'bg-[#1C1C2E] text-white' : 'bg-green-600 text-white'
            }`}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => changeSpeedMultiplier(speedMultiplier === 1 ? 2 : speedMultiplier === 2 ? 5 : 1)}
            className="h-8 text-xs font-bold gap-1 border-black/[0.08]"
          >
            <FastForward size={12} className="text-[#FF5500]" />
            <span>{speedMultiplier}x</span>
          </Button>
        </div>
      }
    >
      <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-3 gap-5 h-[calc(100vh-170px)] animate-fade-in">
        
        {/* Map panel */}
        <div className="lg:col-span-2 bg-[#090A0F] rounded-[24px] border border-white/10 shadow-2xl relative overflow-hidden flex flex-col min-h-[400px] z-0">
          <MapContainer
            center={[latCenter, lngCenter]}
            zoom={8}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
          >
            <TileLayer
              key={mapTheme}
              attribution={currentTile.attribution}
              url={currentTile.url}
            />

            <MapUpdater lat={latCenter} lng={lngCenter} />

            <Polyline
              positions={polylinePositions}
              pathOptions={{ color: '#FF5500', weight: 4, opacity: 0.85, dashArray: '6, 10' }}
            />

            {pickup && (
              <Marker position={[pickup.location_lat, pickup.location_lng]} icon={pickupMarkerIcon}>
                <Popup className="dark-map-popup">
                  <div className="text-xs font-sans text-white p-1">
                    <p className="font-bold text-[#10B981]">Pickup Terminal</p>
                    <p className="text-[10px] text-gray-300">Riyadh Dry Port</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {dropoff && (
              <Marker position={[dropoff.location_lat, dropoff.location_lng]} icon={dropoffMarkerIcon}>
                <Popup className="dark-map-popup">
                  <div className="text-xs font-sans text-white p-1">
                    <p className="font-bold text-[#F43F5E]">Dropoff Terminal</p>
                    <p className="text-[10px] text-gray-300">Jeddah Islamic Port</p>
                  </div>
                </Popup>
              </Marker>
            )}

            <Marker position={[latCenter, lngCenter]} icon={createTruckMarkerIcon(heading)}>
              <Popup className="dark-map-popup">
                <div className="text-center font-sans text-white p-1">
                  <p className="font-bold text-[#FF5500]">{trip.vehicle?.plate_number || 'Truck'}</p>
                  <p className="text-xs text-gray-300">Speed: {currentSpeed} km/h</p>
                </div>
              </Popup>
            </Marker>
          </MapContainer>

          {/* Top Floating HUD Badges */}
          <div className="absolute top-4 left-4 right-4 z-[400] flex justify-between items-start pointer-events-none">
            <div className="bg-[#090A0F]/90 backdrop-blur-xl px-3.5 py-2 rounded-xl shadow-2xl border border-white/10 flex items-center gap-2 pointer-events-auto text-white text-xs">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5500] animate-ping" />
              <span className="font-mono font-bold">CYBER SATELLITE LOCK ({speedMultiplier}x Speed)</span>
            </div>

            <div className="bg-[#090A0F]/90 backdrop-blur-xl text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-2xl border border-white/10 flex items-center gap-2 pointer-events-auto">
              <ShieldCheck size={15} className="text-green-400" />
              <span>Route 40 Expressway Protocol</span>
            </div>
          </div>

          {/* Bottom Floating Telemetry Panel */}
          <div className="absolute bottom-4 left-4 right-4 z-[400] bg-[#090A0F]/90 backdrop-blur-xl p-4 rounded-xl shadow-2xl border border-white/10 text-white flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-4">
              <div className="bg-[#FF5500]/20 p-2.5 rounded-xl text-[#FF5500] border border-[#FF5500]/30">
                <Gauge size={20} />
              </div>
              <div>
                <p className="text-[9px] text-gray-400 font-mono uppercase tracking-wider">Live Coordinates</p>
                <p className="text-xs font-mono font-bold text-white mt-0.5">
                  {latCenter.toFixed(5)}, {lngCenter.toFixed(5)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[9px] text-gray-400 font-mono uppercase tracking-wider">Speed</p>
                <p className="text-sm font-bold text-[#FF5500] mt-0.5">{currentSpeed} km/h</p>
              </div>
              <div className="text-right border-l border-white/10 pl-6">
                <p className="text-[9px] text-gray-400 font-mono uppercase tracking-wider">Estimated ETA</p>
                <p className="text-sm font-bold text-white mt-0.5">
                  ~{Math.floor(etaMinutes / 60)}h {etaMinutes % 60}m
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

              <div>
                <p className="text-[9px] text-[#6E6E80] uppercase font-bold tracking-wider">Cargo Type</p>
                <p className="text-xs font-semibold text-[#111] mt-0.5">{trip.cargo_type}</p>
              </div>

              {pickup && dropoff && (
                <div>
                  <p className="text-[9px] text-[#6E6E80] uppercase font-bold tracking-wider">Terminal Stops</p>
                  <div className="mt-2 space-y-3 pl-3 border-l-2 border-[#F5F5F7]">
                    <div className="text-xs">
                      <p className="font-bold text-[#10B981]">1. Pickup Location</p>
                      <p className="text-[10px] text-gray-500 font-medium">Riyadh Dry Port</p>
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-[#F43F5E]">2. Dropoff Destination</p>
                      <p className="text-[10px] text-gray-500 font-medium">Jeddah Islamic Port</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-black/[0.04] pt-4">
            <div className="bg-[#FFF0EB] border border-[#FF5500]/10 p-3 rounded-xl flex items-start gap-2.5">
              <Navigation size={16} className="text-[#FF5500] shrink-0 mt-0.5 stroke-[2.2]" />
              <div>
                <p className="text-xs font-bold text-[#FF5500]">Cyber Telemetry Active</p>
                <p className="text-[10px] text-[#FF5500]/80 mt-0.5">
                  GPS coordinates interpolate live along Saudi Route 40.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
