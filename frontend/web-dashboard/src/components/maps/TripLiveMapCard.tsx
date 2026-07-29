import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Gauge, MapPin, ExternalLink, ShieldCheck } from 'lucide-react';

import { PREDEFINED_ROUTES, interpolateRoutePosition, GeoPoint } from '@/services/telemetrySimulator';
import { useSimulatedTelemetry } from '@/hooks/useSimulatedTelemetry';
import Btn from '@/components/ui/Btn';

// Custom icons
const pickupMarkerIcon = L.divIcon({
  html: `<div style="background-color: #16A34A; color: white; border-radius: 50%; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; border: 2px solid white;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  className: '',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

const dropoffMarkerIcon = L.divIcon({
  html: `<div style="background-color: #DC2626; color: white; border-radius: 50%; box-shadow: 0 4px 6px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; width: 26px; height: 26px; border: 2px solid white;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>`,
  className: '',
  iconSize: [26, 26],
  iconAnchor: [13, 26],
});

function createLiveTruckIcon(heading: number) {
  return L.divIcon({
    html: `
      <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
        <div class="animate-ping" style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background-color: rgba(232, 69, 15, 0.25); border: 1.5px solid #E8450F;"></div>
        <div style="width: 28px; height: 28px; border-radius: 50%; background-color: #E8450F; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.4); border: 2px solid white; transform: rotate(${heading}deg); transition: transform 0.3s ease;">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
        </div>
      </div>
    `,
    className: '',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });
}

function MapFlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);
  return null;
}

interface TripLiveMapCardProps {
  tripId: string;
  refId: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
}

export default function TripLiveMapCard({
  tripId,
  refId,
  pickupLat = 24.6432,
  pickupLng = 46.7214,
  dropoffLat = 21.5433,
  dropoffLng = 39.1728,
}: TripLiveMapCardProps) {
  const navigate = useNavigate();
  const { fleet } = useSimulatedTelemetry(1);

  // Find matching truck from fleet hook or fallback
  const simulatedTruck = fleet.find((f) => f.tripId === tripId || f.refId === refId) || fleet[0];

  const pickupPoint: GeoPoint = { lat: pickupLat, lng: pickupLng };
  const dropoffPoint: GeoPoint = { lat: dropoffLat, lng: dropoffLng };

  // Use waypoints from route definition for Polyline curve
  const route = PREDEFINED_ROUTES['riyadh-jeddah'];
  const polylineWaypoints = route
    ? route.waypoints.map((w) => [w.lat, w.lng] as [number, number])
    : [
        [pickupPoint.lat, pickupPoint.lng] as [number, number],
        [dropoffPoint.lat, dropoffPoint.lng] as [number, number],
      ];

  const currentLat = simulatedTruck ? simulatedTruck.currentCoords.lat : pickupLat;
  const currentLng = simulatedTruck ? simulatedTruck.currentCoords.lng : pickupLng;
  const speed = simulatedTruck ? simulatedTruck.speedKmH : 88;
  const heading = simulatedTruck ? simulatedTruck.heading : 240;
  const progress = simulatedTruck ? simulatedTruck.progressPercentage : 42;
  const etaMin = simulatedTruck ? simulatedTruck.etaMinutes : 320;

  return (
    <div className="bg-white rounded-lg p-5 border border-black/[0.06] shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-ping" />
            <h3 className="text-sm font-bold text-[#111]">Live Trip Route Tracking</h3>
          </div>
          <p className="text-xs text-[#6E6E80] mt-0.5">
            Simulated live telemetry signal from assigned vehicle
          </p>
        </div>

        <Btn
          label="Full Screen Tracker"
          variant="secondary"
          size="sm"
          icon={<Navigation size={13} />}
          onClick={() => navigate(`/trips/${tripId}/track`)}
        />
      </div>

      {/* Map Container */}
      <div className="h-[280px] rounded-xl overflow-hidden border border-black/[0.06] relative z-0">
        <MapContainer
          center={[currentLat, currentLng]}
          zoom={8}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapFlyTo lat={currentLat} lng={currentLng} />

          {/* Polyline connecting stops */}
          <Polyline
            positions={polylineWaypoints}
            pathOptions={{ color: '#E8450F', weight: 4, opacity: 0.75, dashArray: '8, 8' }}
          />

          {/* Pickup Marker */}
          <Marker position={[pickupPoint.lat, pickupPoint.lng]} icon={pickupMarkerIcon}>
            <Popup>
              <div className="text-xs">
                <p className="font-bold text-[#16A34A]">Pickup Location</p>
                <p className="text-[10px] text-gray-500">Riyadh Dry Port</p>
              </div>
            </Popup>
          </Marker>

          {/* Dropoff Marker */}
          <Marker position={[dropoffPoint.lat, dropoffPoint.lng]} icon={dropoffMarkerIcon}>
            <Popup>
              <div className="text-xs">
                <p className="font-bold text-[#DC2626]">Dropoff Destination</p>
                <p className="text-[10px] text-gray-500">Jeddah Islamic Port</p>
              </div>
            </Popup>
          </Marker>

          {/* Animated Truck Marker */}
          <Marker
            position={[currentLat, currentLng]}
            icon={createLiveTruckIcon(heading)}
          >
            <Popup>
              <div className="text-xs font-sans">
                <p className="font-bold text-[#111]">{simulatedTruck.plateNumber}</p>
                <p className="text-[10px] text-gray-500">Speed: {speed} km/h</p>
              </div>
            </Popup>
          </Marker>
        </MapContainer>

        {/* Live GPS Coords & Telemetry Overlay */}
        <div className="absolute bottom-3 left-3 right-3 z-[400] bg-white/95 backdrop-blur p-3 rounded-xl shadow-md border border-black/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#FFF0EB] p-2 rounded-lg text-[#E8450F]">
              <Gauge size={16} />
            </div>
            <div>
              <p className="text-[9px] text-[#6E6E80] font-bold uppercase tracking-wider">Current Telemetry</p>
              <p className="text-xs font-bold text-[#111] mt-0.5">
                {speed} km/h • <span className="font-mono text-[11px]">{currentLat.toFixed(4)}, {currentLng.toFixed(4)}</span>
              </p>
            </div>
          </div>

          <div className="text-right">
            <p className="text-[9px] text-[#6E6E80] font-bold uppercase tracking-wider">Progress / ETA</p>
            <p className="text-xs font-bold text-[#E8450F] mt-0.5">
              {progress}% • ~{Math.floor(etaMin / 60)}h {etaMin % 60}m
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
