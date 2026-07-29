import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { 
  Play, Pause, FastForward, Search, Navigation, 
  ExternalLink, Truck, ShieldCheck, MapPin, Gauge 
} from 'lucide-react';

import { SimulatedTruckTelemetry } from '@/services/telemetrySimulator';
import { useSimulatedTelemetry } from '@/hooks/useSimulatedTelemetry';
import StatusBadge from '@/components/ui/StatusBadge';
import Btn from '@/components/ui/Btn';

// Custom SVG HTML marker generator for simulated trucks
function createTruckDivIcon(truck: SimulatedTruckTelemetry) {
  let color = '#E8450F'; // Default brand orange
  let pulseAnimation = 'animate-pulse';
  
  if (truck.status === 'AtPickup') {
    color = '#2563EB'; // Blue
    pulseAnimation = '';
  } else if (truck.status === 'Idle') {
    color = '#6E6E80'; // Muted
    pulseAnimation = '';
  } else if (truck.status === 'Completed') {
    color = '#16A34A'; // Green
    pulseAnimation = '';
  }

  const svgIconHtml = `
    <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;">
      ${truck.status === 'InTransit' ? `<div class="${pulseAnimation}" style="position: absolute; width: 42px; height: 42px; border-radius: 50%; background-color: ${color}33; border: 1.5px solid ${color};"></div>` : ''}
      <div style="width: 32px; height: 32px; border-radius: 50%; background-color: ${color}; color: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.35); border: 2px solid white; transform: rotate(${truck.heading}deg); transition: transform 0.3s ease;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
      </div>
      <div style="position: absolute; bottom: -4px; background: #1C1C2E; color: white; font-size: 8px; font-weight: 800; padding: 1px 4px; border-radius: 4px; white-space: nowrap; border: 1px solid rgba(255,255,255,0.2);">
        ${truck.plateNumber}
      </div>
    </div>
  `;

  return L.divIcon({
    html: svgIconHtml,
    className: '',
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });
}

function MapCenterController({ coords }: { coords: [number, number] }) {
  const map = useMap();
  return null;
}

export default function FleetLiveMap() {
  const navigate = useNavigate();
  const { fleet, isPlaying, speedMultiplier, togglePlay, changeSpeedMultiplier } = useSimulatedTelemetry(1);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Filter fleet based on user input
  const filteredFleet = fleet.filter((truck) => {
    const matchesSearch =
      truck.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      truck.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      truck.refId.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' || truck.status.toUpperCase() === statusFilter.toUpperCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bg-white rounded-[24px] border border-black/[0.06] shadow-sm p-5 space-y-4 overflow-hidden">
      
      {/* Header & Map Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.04] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping" />
            <h2 className="text-base font-bold text-[#111]">Live Fleet Location Radar</h2>
          </div>
          <p className="text-xs text-[#6E6E80] mt-0.5">
            Real-time simulated movement across Saudi Arabia freight corridors
          </p>
        </div>

        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search box */}
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6E6E80]" />
            <input
              type="text"
              placeholder="Search truck, driver, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-3 text-xs bg-[#F5F5F7] border border-transparent rounded-lg focus:bg-white focus:border-[#E8450F]/40 outline-none transition-all w-44"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2.5 text-xs bg-[#F5F5F7] border border-transparent rounded-lg font-semibold text-[#111] focus:bg-white outline-none cursor-pointer"
          >
            <option value="ALL">All Statuses ({fleet.length})</option>
            <option value="INTRANSIT">In Transit ({fleet.filter(f => f.status === 'InTransit').length})</option>
            <option value="ATPICKUP">At Pickup ({fleet.filter(f => f.status === 'AtPickup').length})</option>
            <option value="IDLE">Idle / Rest ({fleet.filter(f => f.status === 'Idle').length})</option>
          </select>

          {/* Simulation Play/Pause */}
          <button
            onClick={togglePlay}
            className={`h-8 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              isPlaying ? 'bg-[#1C1C2E] text-white hover:bg-black' : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} />}
            <span>{isPlaying ? 'Pause Sim' : 'Live Sim'}</span>
          </button>

          {/* Speed Multiplier toggle */}
          <button
            onClick={() => changeSpeedMultiplier(speedMultiplier === 1 ? 2 : speedMultiplier === 2 ? 5 : 1)}
            className="h-8 px-2.5 bg-[#F5F5F7] hover:bg-[#EBEBED] text-[#111] rounded-lg text-xs font-bold flex items-center gap-1 border border-black/[0.05]"
            title="Toggle simulation speed multiplier"
          >
            <FastForward size={12} className="text-[#E8450F]" />
            <span>{speedMultiplier}x Speed</span>
          </button>
        </div>
      </div>

      {/* Interactive Leaflet Map Container */}
      <div className="h-[440px] rounded-[20px] overflow-hidden border border-black/[0.06] relative z-0 shadow-inner">
        <MapContainer
          center={[24.5000, 44.5000]} // Center of Saudi Arabia
          zoom={6}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', zIndex: 0 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Active Fleet Markers */}
          {filteredFleet.map((truck) => (
            <Marker
              key={truck.tripId}
              position={[truck.currentCoords.lat, truck.currentCoords.lng]}
              icon={createTruckDivIcon(truck)}
            >
              <Popup className="fleet-map-popup" maxWidth={320}>
                <div className="p-1 space-y-3 font-sans">
                  
                  {/* Popup Header */}
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{truck.refId}</span>
                      <p className="text-sm font-extrabold text-[#111] leading-tight">{truck.plateNumber}</p>
                    </div>
                    <StatusBadge status={truck.status} />
                  </div>

                  {/* Driver & Truck Info */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#F8F9FA] p-2 rounded-lg">
                      <p className="text-[9px] text-gray-400 font-bold uppercase">Driver</p>
                      <p className="font-bold text-[#111] truncate">{truck.driverName}</p>
                      <p className="text-[10px] text-gray-500">{truck.driverPhone}</p>
                    </div>
                    <div className="bg-[#F8F9FA] p-2 rounded-lg">
                      <p className="text-[9px] text-gray-400 font-bold uppercase">Speed & Progress</p>
                      <p className="font-bold text-[#E8450F] flex items-center gap-1">
                        <Gauge size={11} /> {truck.speedKmH} km/h
                      </p>
                      <p className="text-[10px] text-gray-500 font-medium">{truck.progressPercentage}% Completed</p>
                    </div>
                  </div>

                  {/* Route Corridor */}
                  <div className="text-xs bg-[#FFF5F2] border border-[#E8450F]/10 p-2 rounded-lg">
                    <p className="text-[9px] text-[#E8450F] font-bold uppercase tracking-wider">Logistics Route</p>
                    <p className="font-semibold text-[#111] mt-0.5 truncate">{truck.originName}</p>
                    <p className="text-[10px] text-gray-400 font-bold my-0.5">↓ Destination</p>
                    <p className="font-semibold text-[#111] truncate">{truck.destinationName}</p>
                  </div>

                  {/* Direct Actions to Navigate */}
                  <div className="pt-1 flex gap-2">
                    <button
                      onClick={() => navigate(`/trips/${truck.tripId}`)}
                      className="flex-1 h-8 bg-[#1C1C2E] hover:bg-black text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors"
                    >
                      <ExternalLink size={12} />
                      <span>Trip Details</span>
                    </button>
                    <button
                      onClick={() => navigate(`/trips/${truck.tripId}/track`)}
                      className="flex-1 h-8 bg-[#E8450F] hover:bg-[#d03d0c] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1 transition-colors"
                    >
                      <Navigation size={12} />
                      <span>Live Track</span>
                    </button>
                  </div>

                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Floating Top Map Legend */}
        <div className="absolute top-3 left-3 z-[400] bg-white/95 backdrop-blur px-3 py-2 rounded-xl shadow-md border border-black/[0.06] flex items-center gap-3 text-xs font-bold text-[#111]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E8450F] animate-ping" />
            <span>{fleet.filter(f => f.status === 'InTransit').length} In Transit</span>
          </div>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
            <span>{fleet.filter(f => f.status === 'AtPickup').length} At Pickup</span>
          </div>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#6E6E80]" />
            <span>{fleet.filter(f => f.status === 'Idle').length} Idle</span>
          </div>
        </div>

        {/* Floating Bottom Status Bar */}
        <div className="absolute bottom-3 right-3 z-[400] bg-[#1C1C2E]/95 backdrop-blur text-white px-3.5 py-2 rounded-xl shadow-lg border border-white/10 text-xs flex items-center gap-3">
          <ShieldCheck size={14} className="text-green-400" />
          <span className="font-semibold">Simulated GPS Telemetry Active ({speedMultiplier}x)</span>
        </div>
      </div>
    </div>
  );
}
