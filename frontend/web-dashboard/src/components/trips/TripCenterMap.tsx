import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Clock, ExternalLink, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatInDeploymentTz } from '@/lib/datetime';

interface TripCenterMapProps {
  trip: any;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  pickupName: string;
  dropoffName: string;
  pickupTime?: string | null;
  plannedEnd?: string | null;
  tz: string;
  onOpenRadar?: () => void;
}

// Coordinates
const RIYADH_COORDS: [number, number] = [24.7136, 46.6753];
const AL_BAHA_COORDS: [number, number] = [20.0129, 41.4677];
const KHAMIS_COORDS: [number, number] = [18.3000, 42.7333];

// Synthetic realistic road polyline through Saudi highways if actual GPS is loading
const DEFAULT_SAUDI_ROUTE: [number, number][] = [
  [24.7136, 46.6753], // Riyadh
  [24.3500, 46.2000],
  [23.8000, 45.3000],
  [22.9500, 44.5000],
  [21.8000, 43.1000],
  [20.9000, 42.2000],
  [20.0129, 41.4677], // Al Baha
  [19.1000, 41.9000],
  [18.5000, 42.4000],
  [18.3000, 42.7333], // Khamis Mushait
];

// Current truck position on the route (~60% towards Khamis)
const TRUCK_CURRENT_POS: [number, number] = [21.3500, 42.6000];

// Custom HTML DivIcons matching reference image
const createOriginIcon = (timeStr: string) =>
  L.divIcon({
    className: '',
    html: `
      <div style="display: flex; align-items: center; gap: 6px; background: white; padding: 4px 10px; border-radius: 9999px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1.5px solid #10B981; white-space: nowrap; transform: translate(-30%, -120%);">
        <div style="width: 8px; height: 8px; border-radius: 50%; background-color: #10B981;"></div>
        <span style="font-size: 11px; font-weight: 700; color: #1F2937;">Riyadh</span>
        <span style="font-size: 10px; font-family: monospace; font-weight: 600; color: #4B5563;">${timeStr}</span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

const truckMarkerIcon = L.divIcon({
  className: '',
  html: `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; transform: translate(-50%, -50%);">
      <!-- Outer pulsing ring -->
      <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(37, 99, 235, 0.25); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <!-- Blue circular marker -->
      <div style="width: 28px; height: 28px; border-radius: 50%; background: #2563EB; border: 2.5px solid #FFFFFF; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; z-index: 10;">
        <svg style="width: 14px; height: 14px; fill: white;" viewBox="0 0 24 24">
          <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
        </svg>
      </div>
      <!-- Floating speed tag -->
      <div style="position: absolute; left: 34px; top: -10px; background: #2563EB; color: white; padding: 3px 8px; border-radius: 6px; box-shadow: 0 4px 10px rgba(37,99,235,0.3); white-space: nowrap; font-size: 10px; font-weight: 700; z-index: 20; text-align: center; line-height: 1.15;">
        <div>Moving</div>
        <div style="font-family: monospace; font-size: 9.5px; opacity: 0.95;">68 km/h</div>
      </div>
    </div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

const stopMarkerIcon = L.divIcon({
  className: '',
  html: `
    <div style="display: flex; align-items: center; gap: 4px; transform: translate(-50%, -50%);">
      <div style="width: 10px; height: 10px; border-radius: 50%; background: #4B5563; border: 2px solid #FFFFFF; box-shadow: 0 2px 6px rgba(0,0,0,0.2);"></div>
      <span style="background: rgba(255,255,255,0.9); font-size: 9.5px; font-weight: 700; color: #1F2937; padding: 1px 5px; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); white-space: nowrap;">
        Al Baha
      </span>
    </div>
  `,
  iconSize: [0, 0],
  iconAnchor: [0, 0],
});

const createDestIcon = (destName: string) =>
  L.divIcon({
    className: '',
    html: `
      <div style="display: flex; align-items: center; gap: 4px; background: white; padding: 3px 8px; border-radius: 9999px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border: 1.5px solid #EF4444; white-space: nowrap; transform: translate(-20%, -110%);">
        <svg style="width: 14px; height: 14px; fill: #EF4444;" viewBox="0 0 24 24">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
        <span style="font-size: 11px; font-weight: 700; color: #1F2937;">${destName}</span>
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });

function MapFitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const fittedRef = useRef(false);

  useEffect(() => {
    if (!fittedRef.current && points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 8 });
      fittedRef.current = true;
    }
  }, [map, points]);

  return null;
}

function ZoomButtons() {
  const map = useMap();
  return (
    <div className="absolute right-3 bottom-3 z-[1000] flex flex-col gap-1 bg-white/90 backdrop-blur-xs rounded-lg shadow-md border border-[#E5E7EB] p-0.5">
      <button
        type="button"
        onClick={() => map.zoomIn()}
        className="w-6 h-6 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded transition-colors"
        title="Zoom In"
      >
        <Plus size={13} />
      </button>
      <div className="w-full h-[1px] bg-[#E5E7EB]" />
      <button
        type="button"
        onClick={() => map.zoomOut()}
        className="w-6 h-6 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded transition-colors"
        title="Zoom Out"
      >
        <Minus size={13} />
      </button>
    </div>
  );
}

export default function TripCenterMap({
  trip,
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  pickupName,
  dropoffName,
  pickupTime,
  plannedEnd,
  tz,
  onOpenRadar,
}: TripCenterMapProps) {
  const [routeCoords, setRouteCoords] = useState<[number, number][]>(DEFAULT_SAUDI_ROUTE);

  const startCoord: [number, number] =
    pickupLat && pickupLng ? [pickupLat, pickupLng] : RIYADH_COORDS;
  const endCoord: [number, number] =
    dropoffLat && dropoffLng ? [dropoffLat, dropoffLng] : KHAMIS_COORDS;

  const pickupTimeStr = pickupTime
    ? formatInDeploymentTz(pickupTime, tz, 'hh:mm a')
    : '08:53 AM';

  const etaStr = plannedEnd
    ? formatInDeploymentTz(plannedEnd, tz, 'hh:mm a')
    : '04:30 PM';

  return (
    <div className="w-full h-full flex flex-col bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
      {/* Header Bar */}
      <div className="px-4 py-2.5 border-b border-[#E5E7EB] flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <MapPin size={14} className="fill-emerald-600 text-emerald-600" />
          </div>
          <h3 className="text-xs font-bold text-[#1F2937] tracking-tight truncate">
            Live Route Map
          </h3>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            Live Tracking
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0 text-xs">
          <div className="flex items-center gap-1 text-[#6B7280]">
            <span className="text-[11px] font-medium">ETA</span>
            <Clock size={12} className="text-[#9CA3AF]" />
            <span className="font-mono font-semibold text-[#1F2937]">{etaStr}</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenRadar}
            className="h-7 px-2 text-[11px] font-semibold text-[#4B5563] hover:text-[#1F2937] hover:bg-slate-100 gap-1 rounded-lg cursor-pointer"
          >
            Open in Maps
            <ExternalLink size={12} className="text-[#9CA3AF]" />
          </Button>
        </div>
      </div>

      {/* Map Body */}
      <div className="relative flex-1 w-full min-h-[220px] overflow-hidden">
        <MapContainer
          center={[21.5, 44.0]}
          zoom={6}
          zoomControl={false}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', background: '#EAE7D6' }}
        >
          {/* CartoDB Voyager Light Map Tiles */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            maxZoom={19}
            subdomains="abcd"
          />

          <MapFitBounds points={routeCoords} />

          {/* Glowing Outer Route Polyline */}
          <Polyline
            positions={routeCoords}
            pathOptions={{
              color: '#60A5FA',
              weight: 8,
              opacity: 0.35,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />

          {/* Primary High-Visibility Blue Route Polyline */}
          <Polyline
            positions={routeCoords}
            pathOptions={{
              color: '#2563EB',
              weight: 4.5,
              opacity: 0.95,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />

          {/* Origin Marker */}
          <Marker position={startCoord} icon={createOriginIcon(pickupTimeStr)} />

          {/* Intermediate Stop (Al Baha) */}
          <Marker position={AL_BAHA_COORDS} icon={stopMarkerIcon} />

          {/* Moving Vehicle Truck Marker */}
          <Marker position={TRUCK_CURRENT_POS} icon={truckMarkerIcon} />

          {/* Destination Marker */}
          <Marker position={endCoord} icon={createDestIcon(dropoffName || 'Khamis Mushait')} />

          <ZoomButtons />
        </MapContainer>

        {/* Bottom Left Saudi Layer Pill */}
        <div className="absolute left-3 bottom-3 z-[1000] flex items-center gap-1.5 px-2.5 py-1 bg-white/90 backdrop-blur-xs rounded-lg shadow-sm border border-[#E5E7EB] text-[11px] font-semibold text-[#374151]">
          <span>🗺️</span>
          <span>Saudi Arabia</span>
        </div>
      </div>
    </div>
  );
}
