import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Navigation, ShieldCheck, Play, Pause, FastForward, Gauge, MapPin } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import DashboardLayout from '@/components/layout/DashboardLayout';
import Btn from '@/components/ui/Btn';
import StatusBadge from '@/components/ui/StatusBadge';
import { tripService } from '@/services/tripService';
import { PREDEFINED_ROUTES } from '@/services/telemetrySimulator';
import { useSimulatedTelemetry } from '@/hooks/useSimulatedTelemetry';

// Custom markers
const pickupMarkerIcon = L.divIcon({
  html: `<div style="background-color: #16A34A; color: white; border-radius: 50%; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: 2px solid white;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

const dropoffMarkerIcon = L.divIcon({
  html: `<div style="background-color: #DC2626; color: white; border-radius: 50%; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border: 2px solid white;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
});

function createTruckMarkerIcon(heading: number) {
  return L.divIcon({
    html: `
      <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
        <div class="animate-ping" style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background-color: rgba(232, 69, 15, 0.25); border: 1.5px solid #E8450F;"></div>
        <div style="width: 34px; height: 34px; border-radius: 50%; background-color: #E8450F; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.4); border: 2px solid white; transform: rotate(${heading}deg); transition: transform 0.3s ease;">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
        </div>
      </div>
    `,
    className: '',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
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

  const { data: trip, isLoading, refetch } = useQuery({
    queryKey: ['trip-track', id],
    queryFn: () => tripService.getById(id!),
    enabled: !!id,
  });

  const simulatedTruck = fleet.find((f) => f.tripId === id || f.refId === trip?.ref_id) || fleet[0];

  if (isLoading || !trip) {
    return (
      <DashboardLayout active="Trips" title="Live Tracking">
        <div className="p-8 flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-[#E8450F] border-t-transparent rounded-full animate-spin"></div>
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
      pageTitle="Live GPS Telemetry Tracking"
      actions={
        <div className="flex items-center gap-2">
          <Btn
            label="Back to Details"
            variant="secondary"
            size="sm"
            icon={<ArrowLeft size={13} />}
            onClick={() => navigate(`/trips/${id}`)}
          />
          <button
            onClick={togglePlay}
            className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              isPlaying ? 'bg-[#1C1C2E] text-white' : 'bg-green-600 text-white'
            }`}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            <span>{isPlaying ? 'Pause Sim' : 'Play Sim'}</span>
          </button>
          <button
            onClick={() => changeSpeedMultiplier(speedMultiplier === 1 ? 2 : speedMultiplier === 2 ? 5 : 1)}
            className="h-8 px-2.5 bg-white text-[#111] rounded-lg text-xs font-bold flex items-center gap-1 border border-black/[0.08]"
          >
            <FastForward size={12} className="text-[#E8450F]" />
            <span>{speedMultiplier}x</span>
          </button>
        </div>
      }
    >
      <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-3 gap-5 h-[calc(100vh-170px)] animate-fade-in">
        
        {/* Map panel */}
        <div className="lg:col-span-2 bg-[#EBEBED] rounded-[24px] border border-black/[0.06] shadow-sm relative overflow-hidden flex flex-col min-h-[400px] z-0">
          <MapContainer
            center={[latCenter, lngCenter]}
            zoom={8}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapUpdater lat={latCenter} lng={lngCenter} />

            <Polyline
              positions={polylinePositions}
              pathOptions={{ color: '#E8450F', weight: 4, opacity: 0.8, dashArray: '8, 8' }}
            />

            {pickup && (
              <Marker position={[pickup.location_lat, pickup.location_lng]} icon={pickupMarkerIcon}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold text-[#16A34A]">Pickup Origin</p>
                    <p className="text-[10px] text-gray-500">Riyadh Dry Port</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {dropoff && (
              <Marker position={[dropoff.location_lat, dropoff.location_lng]} icon={dropoffMarkerIcon}>
                <Popup>
                  <div className="text-xs">
                    <p className="font-bold text-[#DC2626]">Dropoff Destination</p>
                    <p className="text-[10px] text-gray-500">Jeddah Port Terminal 1</p>
                  </div>
                </Popup>
              </Marker>
            )}

            <Marker position={[latCenter, lngCenter]} icon={createTruckMarkerIcon(heading)}>
              <Popup>
                <div className="text-center font-sans">
                  <p className="font-bold text-[#111]">{trip.vehicle?.plate_number || 'Truck'}</p>
                  <p className="text-xs text-gray-500">Speed: {currentSpeed} km/h</p>
                </div>
              </Popup>
            </Marker>
          </MapContainer>

          {/* Map Overlay Controls */}
          <div className="absolute top-4 left-4 right-4 z-[400] flex justify-between items-start pointer-events-none">
            <div className="bg-white/95 backdrop-blur px-3 py-2 rounded-xl shadow-sm border border-black/[0.06] flex items-center gap-2 pointer-events-auto">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
              <span className="text-xs font-bold text-[#111]">Active GPS Signal ({speedMultiplier}x Speed)</span>
            </div>

            <div className="bg-[#1C1C2E] text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-md flex items-center gap-2 pointer-events-auto">
              <ShieldCheck size={14} className="text-green-400" />
              <span>Simulated Route Corridor Active</span>
            </div>
          </div>

          {/* Bottom Telemetry Card */}
          <div className="absolute bottom-4 left-4 right-4 z-[400] bg-white/95 backdrop-blur p-4 rounded-xl shadow-md border border-black/[0.06] flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-4">
              <div className="bg-[#FFF0EB] p-2.5 rounded-xl text-[#E8450F]">
                <Gauge size={20} />
              </div>
              <div>
                <p className="text-[9px] text-[#6E6E80] uppercase font-bold tracking-wider">Live Coordinates</p>
                <p className="text-xs font-mono font-bold text-[#111] mt-0.5">
                  {latCenter.toFixed(5)}, {lngCenter.toFixed(5)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[9px] text-[#6E6E80] uppercase font-bold tracking-wider">Speed</p>
                <p className="text-sm font-bold text-[#E8450F] mt-0.5">{currentSpeed} km/h</p>
              </div>
              <div className="text-right border-l border-black/[0.06] pl-6">
                <p className="text-[9px] text-[#6E6E80] uppercase font-bold tracking-wider">ETA</p>
                <p className="text-sm font-bold text-[#111] mt-0.5">
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
              <p className="text-base font-bold text-[#111] mt-1">{trip.ref_id}</p>
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
                  <p className="text-[9px] text-[#6E6E80] uppercase font-bold tracking-wider">Stops Sequence</p>
                  <div className="mt-2 space-y-3 pl-3 border-l-2 border-[#F5F5F7]">
                    <div className="text-xs">
                      <p className="font-bold text-[#16A34A]">1. Pickup Location</p>
                      <p className="text-[10px] text-gray-500 font-medium">Riyadh Dry Port</p>
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-[#DC2626]">2. Dropoff Destination</p>
                      <p className="text-[10px] text-gray-500 font-medium">Jeddah Islamic Port</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-black/[0.04] pt-4">
            <div className="bg-[#FFF0EB] border border-[#E8450F]/10 p-3 rounded-xl flex items-start gap-2.5">
              <Navigation size={16} className="text-[#E8450F] shrink-0 mt-0.5 stroke-[2.2]" />
              <div>
                <p className="text-xs font-bold text-[#E8450F]">Simulation Engine Active</p>
                <p className="text-[10px] text-[#E8450F]/80 mt-0.5">
                  GPS coordinates automatically interpolate along Route 40.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
