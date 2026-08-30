import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Gauge, Maximize2, X, MapPin } from 'lucide-react';

import { PREDEFINED_ROUTES, GeoPoint } from '@/services/telemetrySimulator';
import { useSimulatedTelemetry } from '@/hooks/useSimulatedTelemetry';
import { MAP_THEMES } from '@/components/maps/mapThemes';
import MapThemeSelector from '@/components/maps/MapThemeSelector';
import { cn } from '@/lib/utils';
import { SAUDI_MAP_CONTAINER_PROPS } from '@/utils/saudiMapConfig';
import SaudiRedBorderOverlay from '@/components/maps/SaudiRedBorderOverlay';
import type { ResolvedLocation } from '@/services/vehicleService';

// Shadcn UI components
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// High-Tech Neon Pickup Marker (Emerald LED with 3D Warehouse)
const pickupMarkerIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
      <div class="animate-ping" style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background-color: rgba(16, 185, 129, 0.35);"></div>
      <img src="/warehouse_pickup_3d.png?v=3" style="width: 34px; height: 34px; object-fit: contain; z-index: 2;" />
    </div>
  `,
  className: '',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
});

// High-Tech Neon Dropoff Marker (Orange LED with 3D Warehouse)
const dropoffMarkerIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
      <div class="animate-ping" style="position: absolute; width: 38px; height: 38px; border-radius: 50%; background-color: rgba(255, 85, 0, 0.35);"></div>
      <img src="/warehouse_dropoff_3d.png?v=3" style="width: 34px; height: 34px; object-fit: contain; z-index: 2;" />
    </div>
  `,
  className: '',
  iconSize: [44, 44],
  iconAnchor: [22, 22],
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

function createResolvedTruckIcon(heading: number = 0, displayState: 'CURRENT' | 'LAST_KNOWN' = 'CURRENT') {
  const isCurrent = displayState === 'CURRENT';
  const glowColor = isCurrent ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)';
  const borderColor = isCurrent ? '#10B981' : '#F59E0B';
  const pingClass = isCurrent ? 'animate-ping' : '';

  return L.divIcon({
    html: `
      <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
        ${isCurrent ? `<div class="${pingClass}" style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background-color: ${glowColor};"></div>` : ''}
        <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: #0F1017; border: 2px solid ${borderColor}; box-shadow: 0 0 16px ${glowColor};"></div>
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

function MapResizeTrigger({ isFullscreen }: { isFullscreen: boolean }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize({ animate: true });
    }, 100);
    return () => clearTimeout(timer);
  }, [isFullscreen, map]);
  return null;
}

/** Fits map bounds once to include pickup, dropoff, and vehicle location without camera jumping on polling updates */
function FitAllBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (points.length === 0 || hasFittedRef.current) return;
    const validPoints = points.filter(([lat, lng]) => typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng));
    if (validPoints.length === 0) return;

    map.fitBounds(L.latLngBounds(validPoints), { padding: [60, 60], maxZoom: 12 });
    hasFittedRef.current = true;
  }, [map, points]);

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
  resolvedLocation?: ResolvedLocation;
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
  resolvedLocation,
  showHeader = true,
  showTelemetryBar = true,
  className,
  mapHeightClassName = 'h-[400px]',
}: TripLiveMapCardProps) {
  const navigate = useNavigate();
  const { fleet } = useSimulatedTelemetry(1);
  const [mapThemeId, setMapThemeId] = useState<string>('voyager');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [roadPolyline, setRoadPolyline] = useState<[number, number][] | null>(null);
  const [isRoutingFallback, setIsRoutingFallback] = useState(false);

  const currentTheme = MAP_THEMES[mapThemeId] || MAP_THEMES.voyager;

  const resLat = resolvedLocation?.latitude;
  const resLng = resolvedLocation?.longitude;
  const displayState = resolvedLocation?.display_state;
  const hasResolvedCoords =
    typeof resLat === 'number' &&
    typeof resLng === 'number' &&
    Number.isFinite(resLat) &&
    Number.isFinite(resLng) &&
    (displayState === 'CURRENT' || displayState === 'LAST_KNOWN');

  const hasRealCoords = pickupLat != null && pickupLng != null && dropoffLat != null && dropoffLng != null;
  const matchedTruck = fleet.find((f) => f.tripId === tripId || f.refId === refId);
  const simulatedTruck = hasResolvedCoords ? undefined : (matchedTruck || (hasRealCoords ? undefined : fleet[0]));

  const pickupPoint: GeoPoint = hasRealCoords ? { lat: pickupLat!, lng: pickupLng! } : DEMO_PICKUP;
  const dropoffPoint: GeoPoint = hasRealCoords ? { lat: dropoffLat!, lng: dropoffLng! } : DEMO_DROPOFF;

  // OSRM Driving Route fetch & memoization — runs ONLY when pickup/dropoff coordinates change
  useEffect(() => {
    if (!hasRealCoords) {
      setRoadPolyline(null);
      setIsRoutingFallback(false);
      return;
    }

    let isMounted = true;
    const fromLng = pickupPoint.lng;
    const fromLat = pickupPoint.lat;
    const toLng = dropoffPoint.lng;
    const toLat = dropoffPoint.lat;

    const fetchOsrmRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
        const data = await res.json();
        if (data?.code === 'Ok' && Array.isArray(data?.routes?.[0]?.geometry?.coordinates)) {
          const rawCoords: [number, number][] = data.routes[0].geometry.coordinates;
          const leafletCoords: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng]);
          if (isMounted) {
            setRoadPolyline(leafletCoords);
            setIsRoutingFallback(false);
          }
          return;
        }
        throw new Error('Invalid OSRM geometry response');
      } catch (err) {
        console.warn('OSRM road routing fallback active:', err);
        if (isMounted) {
          setRoadPolyline(null);
          setIsRoutingFallback(true);
        }
      }
    };

    fetchOsrmRoute();

    return () => {
      isMounted = false;
    };
  }, [pickupPoint.lat, pickupPoint.lng, dropoffPoint.lat, dropoffPoint.lng, hasRealCoords]);

  const demoRoute = PREDEFINED_ROUTES['riyadh-jeddah'];
  const polylineWaypoints: [number, number][] = roadPolyline
    ? roadPolyline
    : hasRealCoords
      ? [[pickupPoint.lat, pickupPoint.lng], [dropoffPoint.lat, dropoffPoint.lng]]
      : demoRoute
        ? demoRoute.waypoints.map((w) => [w.lat, w.lng])
        : [[pickupPoint.lat, pickupPoint.lng], [dropoffPoint.lat, dropoffPoint.lng]];

  const activeTruckLat = hasResolvedCoords ? resLat! : (simulatedTruck ? simulatedTruck.currentCoords.lat : pickupPoint.lat);
  const activeTruckLng = hasResolvedCoords ? resLng! : (simulatedTruck ? simulatedTruck.currentCoords.lng : pickupPoint.lng);
  const activeSpeed = hasResolvedCoords ? (resolvedLocation?.speed_kph ?? 0) : (simulatedTruck ? simulatedTruck.speedKmH : 0);
  const activeHeading = hasResolvedCoords ? (resolvedLocation?.heading_deg ?? 0) : (simulatedTruck ? simulatedTruck.heading : 0);
  const progress = simulatedTruck ? simulatedTruck.progressPercentage : 0;
  const etaMin = simulatedTruck ? simulatedTruck.etaMinutes : 0;
  const sourceText = resolvedLocation?.source === 'DRIVER_GPS' ? 'Driver GPS' : resolvedLocation?.source === 'PHYSICAL_GPS' ? 'Vehicle GPS' : null;

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
        <div 
          className={cn(
            'overflow-hidden relative shadow-xl transition-all duration-300',
            isFullscreen 
              ? 'fixed inset-0 z-[9999] w-screen h-screen rounded-none border-none m-0' 
              : cn('rounded-xl border border-black/[0.1] z-0', mapHeightClassName)
          )} 
          style={{ background: currentTheme.previewColor }}
        >
          {/* Floating Fullscreen / Close Toggle Button */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className={cn(
              "absolute top-3 right-3 z-[400] flex items-center justify-center gap-1.5 rounded-xl transition-all duration-200 border shadow-lg hover:scale-105 active:scale-95 font-sans text-xs font-bold cursor-pointer",
              isFullscreen
                ? "bg-red-500/90 hover:bg-red-500 border-red-600/20 text-white px-3 py-2"
                : currentTheme.isDark
                  ? "bg-[#090A0F]/85 backdrop-blur-xl border-white/10 hover:border-white/20 text-white hover:bg-[#090A0F] p-2"
                  : "bg-white/95 backdrop-blur-xl border-black/[0.08] hover:border-black/[0.15] text-[#111] hover:bg-white p-2"
            )}
            title={isFullscreen ? "Close Fullscreen" : "Fullscreen Map"}
          >
            {isFullscreen ? (
              <>
                <X size={14} />
                <span>Close</span>
              </>
            ) : (
              <Maximize2 size={14} />
            )}
          </button>

          <MapContainer
            center={[activeTruckLat, activeTruckLng]}
            zoom={8}
            minZoom={SAUDI_MAP_CONTAINER_PROPS.minZoom}
            maxZoom={SAUDI_MAP_CONTAINER_PROPS.maxZoom}
            maxBounds={SAUDI_MAP_CONTAINER_PROPS.maxBounds}
            maxBoundsViscosity={SAUDI_MAP_CONTAINER_PROPS.maxBoundsViscosity}
            scrollWheelZoom={true}
            zoomControl={false}
            attributionControl={false}
            style={{ height: '100%', width: '100%', zIndex: 0 }}
          >
            <MapResizeTrigger isFullscreen={isFullscreen} />
            <ZoomControl position="bottomright" />
            <SaudiRedBorderOverlay />
            <TileLayer
              key={currentTheme.id}
              attribution={currentTheme.attribution}
              url={currentTheme.url}
            />

            <FitAllBounds
              points={
                hasResolvedCoords
                  ? [[pickupPoint.lat, pickupPoint.lng], [dropoffPoint.lat, dropoffPoint.lng], [resLat!, resLng!]]
                  : [[pickupPoint.lat, pickupPoint.lng], [dropoffPoint.lat, dropoffPoint.lng]]
              }
            />

            <Polyline
              positions={polylineWaypoints}
              pathOptions={{
                color: isRoutingFallback ? '#94A3B8' : '#FF5500',
                weight: 4,
                opacity: isRoutingFallback ? 0.6 : 0.85,
                dashArray: isRoutingFallback ? '6, 10' : undefined,
              }}
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

            {hasResolvedCoords ? (
              <Marker position={[resLat!, resLng!]} icon={createResolvedTruckIcon(activeHeading, displayState as 'CURRENT' | 'LAST_KNOWN')}>
                <Popup className={currentTheme.isDark ? "dark-map-popup" : ""}>
                  <div className="text-xs font-sans p-1 space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <span className={cn("w-2 h-2 rounded-full", displayState === 'CURRENT' ? "bg-emerald-500" : "bg-amber-500")} />
                      <span className="text-[#111] dark:text-white">
                        {displayState === 'CURRENT' ? 'Current location' : 'Last known location'}
                      </span>
                    </div>
                    {resolvedLocation?.plate_number && (
                      <p className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">
                        {resolvedLocation.plate_number}
                      </p>
                    )}
                    <p className="text-[10px] text-gray-500">
                      {resLat!.toFixed(4)}, {resLng!.toFixed(4)}
                      {resolvedLocation?.formatted_time_ago && ` · ${resolvedLocation.formatted_time_ago}`}
                    </p>
                    {sourceText && (
                      <p className="text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                        Source: {sourceText}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ) : simulatedTruck ? (
              <Marker position={[simulatedTruck.currentCoords.lat, simulatedTruck.currentCoords.lng]} icon={createLiveTruckIcon(simulatedTruck.heading)}>
                <Popup className={currentTheme.isDark ? "dark-map-popup" : ""}>
                  <div className="text-xs font-sans p-1">
                    <p className="font-bold text-[#FF5500]">{simulatedTruck.plateNumber}</p>
                    <p className="text-[10px] text-gray-500">Speed: {simulatedTruck.speedKmH} km/h</p>
                  </div>
                </Popup>
              </Marker>
            ) : null}
          </MapContainer>

          {/* Bottom Telemetry Bar */}
          {showTelemetryBar && (
          <div className={`absolute bottom-3 left-3 right-3 z-[400] p-3 rounded-xl shadow-xl border text-xs space-y-2 ${
            currentTheme.isDark 
              ? 'bg-[#090A0F]/90 backdrop-blur-xl border-white/10 text-white' 
              : 'bg-white/95 backdrop-blur-xl border-black/[0.08] text-[#111]'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={cn(
                  "p-2 rounded-lg border shrink-0",
                  hasResolvedCoords && displayState === 'CURRENT'
                    ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30"
                    : hasResolvedCoords && displayState === 'LAST_KNOWN'
                    ? "bg-amber-500/20 text-amber-500 border-amber-500/30"
                    : "bg-[#FF5500]/20 text-[#FF5500] border-[#FF5500]/30"
                )}>
                  {hasResolvedCoords ? <Navigation size={18} /> : <Gauge size={18} />}
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] text-gray-400 font-mono uppercase tracking-wider truncate">
                    {hasResolvedCoords
                      ? (displayState === 'CURRENT' ? 'Current location' : 'Last known location')
                      : resolvedLocation?.display_state === 'UNAVAILABLE'
                      ? 'Location unavailable'
                      : 'Telemetry Stream'}
                  </p>
                  <p className="text-xs font-bold truncate">
                    {hasResolvedCoords ? (
                      <>
                        <span className="font-mono text-[11px] text-emerald-500 dark:text-emerald-400">
                          {resLat!.toFixed(4)}, {resLng!.toFixed(4)}
                        </span>
                        {activeSpeed > 0 && ` • ${activeSpeed} km/h`}
                        {sourceText && ` • ${sourceText}`}
                        {resolvedLocation?.formatted_time_ago && ` (${resolvedLocation.formatted_time_ago})`}
                      </>
                    ) : resolvedLocation?.display_state === 'UNAVAILABLE' ? (
                      <span className="text-slate-400 dark:text-slate-500 italic">No GPS telemetry available</span>
                    ) : (
                      <>
                        {activeSpeed} km/h • <span className="font-mono text-[11px] text-orange-500">{activeTruckLat.toFixed(4)}, {activeTruckLng.toFixed(4)}</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              {!hasResolvedCoords && (
                <div className="text-right shrink-0">
                  <p className="text-[9px] text-gray-400 font-mono uppercase tracking-wider">Progress / ETA</p>
                  <p className="text-xs font-bold text-[#FF5500]">
                    {progress}% • ~{Math.floor(etaMin / 60)}h {etaMin % 60}m
                  </p>
                </div>
              )}
            </div>

            {!hasResolvedCoords && <Progress value={progress} className="h-1.5 bg-gray-200 dark:bg-white/10" />}
          </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
