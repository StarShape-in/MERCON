import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Navigation, NavigationOff, ShieldCheck } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import DashboardLayout from '@/components/layout/DashboardLayout';
import Btn from '@/components/ui/Btn';
import StatusBadge from '@/components/ui/StatusBadge';
import { tripService } from '@/services/tripService';

// Custom Leaflet marker using HTML
const truckIcon = L.divIcon({
  html: `<div style="background-color: #E8450F; color: white; padding: 6px; border-radius: 50%; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; width: 28px; height: 28px;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-navigation"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg></div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Component to dynamically update map center when GPS moves
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

  const { data: trip, isLoading, refetch } = useQuery({
    queryKey: ['trip-track', id],
    queryFn: () => tripService.getById(id!),
    enabled: !!id,
  });

  const [gpsData, setGpsData] = useState<{ lat: number; lng: number; speed: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    
    // Connect to websocket backend
    const socket: Socket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000');

    socket.on(`trip:location_update:${id}`, (data: { lat: number; lng: number; speed: number }) => {
      console.log('Received live GPS update:', data);
      setGpsData(data);
    });

    return () => {
      socket.disconnect();
    };
  }, [id]);

  if (isLoading || !trip) {
    return (
      <DashboardLayout active="Trips" title="Live Tracking">
        <div className="p-8 flex items-center justify-center">
          <div className="h-8 w-8 border-2 border-[#E8450F] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </DashboardLayout>
    );
  }

  // Lat/Lng centers
  const pickup = trip.stops?.find(s => s.stop_type === 'Pickup');
  const dropoff = trip.stops?.find(s => s.stop_type === 'Dropoff');

  // Lat/Lng centers (use live GPS if available, fallback to pickup)
  const latCenter = gpsData ? gpsData.lat : (pickup ? pickup.location_lat : 24.7136);
  const lngCenter = gpsData ? gpsData.lng : (pickup ? pickup.location_lng : 46.6753);
  const currentSpeed = gpsData ? gpsData.speed : 0;

  return (
    <DashboardLayout 
      active="Trips" 
      title="Live Tracking" 
      breadcrumb={`Trips / ${trip.ref_id || 'Track'}`}
      pageTitle="Live GPS Tracking"
      actions={
        <div className="flex gap-2">
          <Btn 
            label="Back" 
            variant="secondary" 
            size="sm" 
            icon={<ArrowLeft size={13} />} 
            onClick={() => navigate(`/trips/${id}`)} 
          />
          <Btn 
            label="Poll Status" 
            variant="secondary" 
            size="sm" 
            icon={<RefreshCw size={13} />} 
            onClick={() => refetch()} 
          />
        </div>
      }
    >
      <div className="px-6 pb-6 grid grid-cols-1 lg:grid-cols-3 gap-5 h-[calc(100vh-170px)] animate-fade-in">
        
        {/* Map panel */}
        <div className="lg:col-span-2 bg-[#EBEBED] rounded-[24px] border border-black/[0.06] shadow-sm relative overflow-hidden flex flex-col min-h-[400px] z-0">
          <MapContainer 
            center={[latCenter, lngCenter]} 
            zoom={13} 
            scrollWheelZoom={true} 
            style={{ height: '100%', width: '100%', zIndex: 0 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            <MapUpdater lat={latCenter} lng={lngCenter} />

            <Marker position={[latCenter, lngCenter]} icon={truckIcon}>
              <Popup>
                <div className="text-center">
                  <p className="font-bold text-[#111]">{trip.vehicle?.plate_number || 'Truck'}</p>
                  <p className="text-xs text-gray-500">Speed: {currentSpeed} km/h</p>
                </div>
              </Popup>
            </Marker>
            
            {/* If pickup exists, show it */}
            {pickup && (
              <Marker position={[pickup.location_lat, pickup.location_lng]}>
                <Popup>Pickup Location</Popup>
              </Marker>
            )}
            
            {/* If dropoff exists, show it */}
            {dropoff && (
              <Marker position={[dropoff.location_lat, dropoff.location_lng]}>
                <Popup>Dropoff Location</Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Map Overlay Controls */}
          <div className="absolute top-4 left-4 right-4 z-[400] flex justify-between items-start pointer-events-none">
            <div className="bg-white/95 backdrop-blur px-3 py-2 rounded-lg shadow-sm border border-black/[0.06] flex items-center gap-2 pointer-events-auto">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
              <span className="text-[10px] font-bold text-[#111]">Active GPS Signal</span>
            </div>
            
            <div className="bg-[#1C1C2E] text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-md flex items-center gap-2 pointer-events-auto">
              <ShieldCheck size={14} className="text-green-400" />
              <span>Secure Route Protocol Enforced</span>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 z-[400] bg-white/95 backdrop-blur p-4 rounded-lg shadow-md border border-black/[0.06] flex items-center justify-between gap-6 pointer-events-auto">
            <div>
              <p className="text-[9px] text-[#6E6E80] uppercase font-bold tracking-wider">Current GPS Coords</p>
              <p className="text-xs font-mono font-bold text-[#111] mt-0.5">{latCenter.toFixed(5)}, {lngCenter.toFixed(5)}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-[#6E6E80] uppercase font-bold tracking-wider">Speed</p>
              <p className="text-xs font-bold text-[#111] mt-0.5">{currentSpeed} km/h</p>
            </div>
          </div>
        </div>

        {/* Tracking info panel */}
        <div className="bg-white rounded-[24px] border border-black/[0.06] p-5 shadow-sm space-y-5 flex flex-col justify-between h-full">
          <div>
            <div className="border-b border-black/[0.04] pb-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-[#6E6E80] font-bold uppercase tracking-wider">Active Trip</span>
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
                      <p className="font-bold text-[#111]">1. Pickup Location</p>
                      <p className="text-[10px] text-gray-500 font-medium">Planned: {pickup.planned_arrival ? new Date(pickup.planned_arrival).toLocaleTimeString() : '—'}</p>
                    </div>
                    <div className="text-xs">
                      <p className="font-bold text-[#111]">2. Dropoff Destination</p>
                      <p className="text-[10px] text-gray-500 font-medium">Planned: {dropoff.planned_arrival ? new Date(dropoff.planned_arrival).toLocaleTimeString() : '—'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-black/[0.04] pt-4">
            <div className="bg-[#FFF0EB] border border-[#E8450F]/10 p-3 rounded-lg flex items-start gap-2.5">
              <Navigation size={16} className="text-[#E8450F] shrink-0 mt-0.5 stroke-[2.2]" />
              <div>
                <p className="text-xs font-bold text-[#E8450F]">Telemetry Auto-Syncing</p>
                <p className="text-[10px] text-[#E8450F]/80 mt-0.5">Live positioning data points update automatically every 10 seconds.</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
