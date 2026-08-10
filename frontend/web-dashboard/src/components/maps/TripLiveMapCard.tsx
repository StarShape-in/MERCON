import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Gauge } from 'lucide-react';

import { PREDEFINED_ROUTES, GeoPoint } from '@/services/telemetrySimulator';
import { useSimulatedTelemetry } from '@/hooks/useSimulatedTelemetry';
import { MAP_THEMES } from '@/components/maps/mapThemes';
import MapThemeSelector from '@/components/maps/MapThemeSelector';
import { cn } from '@/lib/utils';

// Shadcn UI components
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// High-Tech Neon Pickup Marker (Emerald LED with 3D Warehouse)
const pickupMarkerIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
      <div class="animate-ping" style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background-color: rgba(16, 185, 129, 0.35);"></div>
      <div style="width: 30px; height: 30px; border-radius: 50%; background: #0F1017; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 16px rgba(16, 185, 129, 0.8); border: 2.5px solid #10B981; z-index: 2; padding: 4.5px;">
        <img src="/warehouse_3d.png" style="width: 100%; height: 100%; object-fit: contain;" />
      </div>
    </div>
  `,
  className: '',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

// High-Tech Neon Dropoff Marker (Crimson LED with 3D Warehouse)
const dropoffMarkerIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
      <div class="animate-ping" style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background-color: rgba(244, 63, 94, 0.35);"></div>
      <div style="width: 30px; height: 30px; border-radius: 50%; background: #0F1017; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 16px rgba(244, 63, 94, 0.8); border: 2.5px solid #F43F5E; z-index: 2; padding: 4.5px;">
        <img src="/warehouse_3d.png" style="width: 100%; height: 100%; object-fit: contain;" />
      </div>
    </div>
  `,
  className: '',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

function createLiveTruckIcon(heading: number) {
  return L.divIcon({
    html: `
      <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
        <div class="animate-ping" style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background-color: rgba(255, 85, 0, 0.25);"></div>
        <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: #0F1017; border: 2px solid #FF5500; box-shadow: 0 0 20px rgba(255, 85, 0, 0.8);"></div>
        <div style="width: 30px; height: 30px; z-index: 2; display: flex; align-items: center; justify-content: center; transform: rotate(${heading}deg); transition: transform 0.3s ease;">
          <img src="/truck_3d_orange_transparent.png" style="width: 30px; height: 30px; object-fit: contain;" />
        </div>
      </div>
    `,
    className: '',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

function MapFlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lng], map.getZoom(), { animate: true });
  }, [lat, lng, map]);
  return null;
}

/** Fits the map to real pickup/dropoff points — used when there's no
 *  simulated-fleet truck to fly the camera to (i.e. a real trip whose
 *  route isn't one of the canned demo routes). */
function FitBounds({ aLat, aLng, bLat, bLng }: { aLat: number; aLng: number; bLat: number; bLng: number }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(L.latLngBounds([[aLat, aLng], [bLat, bLng]]), { padding: [56, 56], maxZoom: 10 });
  }, [aLat, aLng, bLat, bLng, map]);
  return null;
}

interface TripLiveMapCardProps {
  tripId: string;
  refId: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffLat?: number;
  dropoffLng?: number;
  pickupLabel?: string;
  dropoffLabel?: string;
  /** Show the title/theme-selector/"Full Radar" header row. Default true. */
  showHeader?: boolean;
  /** Show the bottom telemetry overlay (speed/progress/ETA bar). Default true. */
  showTelemetryBar?: boolean;
  /** Card corner radius + map inset height — lets embedding pages match their own layout. */
  className?: string;
  mapHeightClassName?: string;
}

const DEMO_PICKUP: GeoPoint = { lat: 24.6432, lng: 46.7214 };
const DEMO_DROPOFF: GeoPoint = { lat: 21.5433, lng: 39.1728 };

export default function TripLiveMapCard({
  tripId,
  refId,
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  pickupLabel,
  dropoffLabel,
  showHeader = true,
  showTelemetryBar = true,
  className,
  mapHeightClassName = 'h-[310px]',
}: TripLiveMapCardProps) {
  const navigate = useNavigate();
  const { fleet } = useSimulatedTelemetry(1);
  const [mapThemeId, setMapThemeId] = useState<string>('voyager');

  const currentTheme = MAP_THEMES[mapThemeId] || MAP_THEMES.voyager;

  // A trip only has a "live truck" to show if it matches one of the canned
  // demo fleet entries — falling back to fleet[0] regardless of the trip's
  // real coordinates used to draw a Riyadh↔Jeddah truck on top of an
  // unrelated real route. Real trips outside the demo set just show pickup/
  // dropoff pins on their real route, no fabricated live position.
  const hasRealCoords = pickupLat != null && pickupLng != null && dropoffLat != null && dropoffLng != null;
  const matchedTruck = fleet.find((f) => f.tripId === tripId || f.refId === refId);
  const simulatedTruck = matchedTruck || (hasRealCoords ? undefined : fleet[0]);

  const pickupPoint: GeoPoint = hasRealCoords ? { lat: pickupLat!, lng: pickupLng! } : DEMO_PICKUP;
  const dropoffPoint: GeoPoint = hasRealCoords ? { lat: dropoffLat!, lng: dropoffLng! } : DEMO_DROPOFF;

  const demoRoute = PREDEFINED_ROUTES['riyadh-jeddah'];
  const polylineWaypoints: [number, number][] = hasRealCoords
    ? [[pickupPoint.lat, pickupPoint.lng], [dropoffPoint.lat, dropoffPoint.lng]]
    : demoRoute
      ? demoRoute.waypoints.map((w) => [w.lat, w.lng])
      : [[pickupPoint.lat, pickupPoint.lng], [dropoffPoint.lat, dropoffPoint.lng]];

  const currentLat = simulatedTruck ? simulatedTruck.currentCoords.lat : pickupPoint.lat;
  const currentLng = simulatedTruck ? simulatedTruck.currentCoords.lng : pickupPoint.lng;
  const speed = simulatedTruck ? simulatedTruck.speedKmH : 0;
  const heading = simulatedTruck ? simulatedTruck.heading : 0;
  const progress = simulatedTruck ? simulatedTruck.progressPercentage : 0;
  const etaMin = simulatedTruck ? simulatedTruck.etaMinutes : 0;

  return (
    <Card className={cn('border-black/[0.06] shadow-md rounded-2xl bg-white overflow-hidden p-0 gap-0', className)}>
      {showHeader && (
        <CardHeader className="p-4 pb-3 border-b border-black/[0.04]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-ping" />
                <CardTitle className="text-sm font-extrabold text-[#111]">Live Trip Route Tracking</CardTitle>
                <Badge variant="outline" className={`text-[10px] font-mono ${currentTheme.badgeColor}`}>
                  {currentTheme.name}
                </Badge>
              </div>
              <CardDescription className="text-xs text-[#6E6E80] mt-0.5">
                Live GPS telemetry positioning along Expressway Route 40
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              {/* Map Theme Dropdown Selector */}
              <MapThemeSelector
                currentThemeId={mapThemeId}
                onThemeChange={(newTheme) => setMapThemeId(newTheme)}
              />

              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/trips/${tripId}/track`)}
                className="h-8 text-xs font-bold gap-1 border-black/[0.08] hover:bg-[#F5F5F7]"
              >
                <Navigation size={13} className="text-[#FF5500]" />
                <span>Full Radar</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="p-4">
        {/* Map View */}
        <div className={cn('rounded-xl overflow-hidden border border-black/[0.1] relative z-0 shadow-xl', mapHeightClassName)} style={{ background: currentTheme.previewColor }}>
          <MapContainer
            center={[currentLat, currentLng]}
            zoom={8}
            scrollWheelZoom={true}
            zoomControl={false}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
          >
            <ZoomControl position="bottomright" />
            <TileLayer
              key={currentTheme.id}
              attribution={currentTheme.attribution}
              url={currentTheme.url}
            />

            {simulatedTruck ? (
              <MapFlyTo lat={currentLat} lng={currentLng} />
            ) : (
              <FitBounds aLat={pickupPoint.lat} aLng={pickupPoint.lng} bLat={dropoffPoint.lat} bLng={dropoffPoint.lng} />
            )}

            <Polyline
              positions={polylineWaypoints}
              pathOptions={{ color: '#FF5500', weight: 4, opacity: 0.85, dashArray: '6, 10' }}
            />

            <Marker position={[pickupPoint.lat, pickupPoint.lng]} icon={pickupMarkerIcon}>
              <Popup className={currentTheme.isDark ? "dark-map-popup" : ""}>
                <div className="text-xs font-sans p-1">
                  <p className="font-bold text-[#10B981]">Pickup</p>
                  <p className="text-[10px] text-gray-500">{pickupLabel || `${pickupPoint.lat.toFixed(4)}, ${pickupPoint.lng.toFixed(4)}`}</p>
                </div>
              </Popup>
            </Marker>

            <Marker position={[dropoffPoint.lat, dropoffPoint.lng]} icon={dropoffMarkerIcon}>
              <Popup className={currentTheme.isDark ? "dark-map-popup" : ""}>
                <div className="text-xs font-sans p-1">
                  <p className="font-bold text-[#F43F5E]">Drop-off</p>
                  <p className="text-[10px] text-gray-500">{dropoffLabel || `${dropoffPoint.lat.toFixed(4)}, ${dropoffPoint.lng.toFixed(4)}`}</p>
                </div>
              </Popup>
            </Marker>

            {simulatedTruck && (
              <Marker position={[currentLat, currentLng]} icon={createLiveTruckIcon(heading)}>
                <Popup className={currentTheme.isDark ? "dark-map-popup" : ""}>
                  <div className="text-xs font-sans p-1">
                    <p className="font-bold text-[#FF5500]">{simulatedTruck.plateNumber}</p>
                    <p className="text-[10px] text-gray-500">Speed: {speed} km/h</p>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>

          {/* Bottom Telemetry Bar */}
          {showTelemetryBar && (
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
                    {speed} km/h • <span className="font-mono text-[11px] text-orange-500">{currentLat.toFixed(4)}, {currentLng.toFixed(4)}</span>
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-[9px] text-gray-400 font-mono uppercase tracking-wider">Progress / ETA</p>
                <p className="text-xs font-bold text-[#FF5500]">
                  {progress}% • ~{Math.floor(etaMin / 60)}h {etaMin % 60}m
                </p>
              </div>
            </div>

            <Progress value={progress} className="h-1.5 bg-gray-200 dark:bg-white/10" />
          </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
