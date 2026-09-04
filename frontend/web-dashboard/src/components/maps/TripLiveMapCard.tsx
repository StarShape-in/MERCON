import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, ZoomControl, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Navigation, Gauge, Maximize2, X, MapPin, Route, Clock, ShieldCheck,
  Play, Pause, RotateCcw, ChevronRight
} from 'lucide-react';

import { PREDEFINED_ROUTES, GeoPoint } from '@/services/telemetrySimulator';
import { useSimulatedTelemetry } from '@/hooks/useSimulatedTelemetry';
import { MAP_THEMES } from '@/components/maps/mapThemes';
import MapThemeSelector from '@/components/maps/MapThemeSelector';
import { cn } from '@/lib/utils';
import { SAUDI_MAP_CONTAINER_PROPS } from '@/utils/saudiMapConfig';
import SaudiRedBorderOverlay from '@/components/maps/SaudiRedBorderOverlay';
import type { ResolvedLocation } from '@/services/vehicleService';
import { reverseGeocode } from '@/services/addressSearch';

// Shadcn UI components
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

// ─── Comprehensive Saudi Hubs & Cities Coordinate Dictionary ───────────────────
export const SAUDI_CITY_COORDS: Record<string, [number, number]> = {
  riyadh: [24.7136, 46.6753],
  jeddah: [21.5433, 39.1728],
  dammam: [26.4207, 50.0888],
  khobar: [26.2172, 50.1971],
  jubail: [27.0046, 49.6601],
  makkah: [21.3891, 39.8579],
  mecca: [21.3891, 39.8579],
  madinah: [24.5247, 39.5692],
  medina: [24.5247, 39.5692],
  qassim: [26.3260, 43.9750],
  buraidah: [26.3260, 43.9750],
  unaizah: [26.0858, 43.9936],
  taif: [21.4373, 40.5127],
  tabuk: [28.3835, 36.5662],
  abha: [18.2164, 42.5053],
  khamis: [18.3000, 42.7333],
  'khamis mushait': [18.3000, 42.7333],
  jizan: [16.8892, 42.5706],
  jazan: [16.8892, 42.5706],
  yanbu: [24.0895, 38.0618],
  hofuf: [25.3835, 49.5864],
  ahsa: [25.3835, 49.5864],
  hail: [27.5236, 41.6966],
  najran: [17.5656, 44.2289],
  kharj: [24.1555, 47.3119],
  'al kharj': [24.1555, 47.3119],
  bisha: [20.0005, 42.6036],
  arar: [30.9753, 41.0381],
  sakaka: [29.9697, 40.2064],
  dawadmi: [24.5072, 44.4088],
  majmaah: [25.9042, 45.3438],
  rabigh: [22.7986, 39.0349],
};

// ─── Marker Icons ─────────────────────────────────────────────────────────────

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

function createStopIcon(letter: string, isCompleted: boolean = false, isCurrent: boolean = false) {
  const bg = isCompleted ? '#10B981' : isCurrent ? '#FA634E' : '#7C3AED';
  const glow = isCompleted ? 'rgba(16, 185, 129, 0.5)' : isCurrent ? 'rgba(250, 99, 78, 0.6)' : 'rgba(124, 58, 237, 0.5)';
  return L.divIcon({
    html: `
      <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
        ${isCurrent ? `<div class="animate-ping" style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: ${glow};"></div>` : ''}
        <div style="width: 28px; height: 28px; border-radius: 50%; background: ${bg}; border: 2.5px solid #FFFFFF; box-shadow: 0 0 14px ${glow}; display: flex; align-items: center; justify-content: center; z-index: 2; transition: all 0.2s ease;">
          <span style="font-size: 11px; font-weight: 900; color: #FFFFFF; font-family: monospace; line-height: 1;">${letter}</span>
        </div>
      </div>
    `,
    className: '',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

function createLiveTruckIcon(heading: number = 0) {
  const adjustedHeading = heading || 0;
  return L.divIcon({
    html: `
      <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
        <div class="animate-ping" style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background-color: rgba(255, 85, 0, 0.25);"></div>
        <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: #0F1017; border: 2px solid #FF5500; box-shadow: 0 0 20px rgba(255, 85, 0, 0.8);"></div>
        <div style="width: 30px; height: 30px; z-index: 2; display: flex; align-items: center; justify-content: center; transform: rotate(${adjustedHeading}deg); transition: transform 0.3s ease;">
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
  const adjustedHeading = heading || 0;

  return L.divIcon({
    html: `
      <div style="position: relative; width: 48px; height: 48px; display: flex; align-items: center; justify-content: center;">
        ${isCurrent ? `<div class="${pingClass}" style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background-color: ${glowColor};"></div>` : ''}
        <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: #0F1017; border: 2px solid ${borderColor}; box-shadow: 0 0 16px ${glowColor};"></div>
        <div style="width: 30px; height: 30px; z-index: 2; display: flex; align-items: center; justify-content: center; transform: rotate(${adjustedHeading}deg); transition: transform 0.3s ease;">
          <img src="/truck_3d_orange_transparent.png" style="width: 30px; height: 30px; object-fit: contain;" />
        </div>
      </div>
    `,
    className: '',
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
}

// ─── Map Helpers ──────────────────────────────────────────────────────────────

function MapResizeTrigger({ isFullscreen }: { isFullscreen: boolean }) {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize({ animate: true });
    }, 120);
    return () => clearTimeout(timer);
  }, [isFullscreen, map]);
  return null;
}

function FitAllBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (points.length === 0 || hasFittedRef.current) return;
    const validPoints = points.filter(([lat, lng]) => typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng));
    if (validPoints.length === 0) return;

    map.fitBounds(L.latLngBounds(validPoints), { padding: [50, 50], maxZoom: 12 });
    hasFittedRef.current = true;
  }, [map, points]);

  return null;
}

function getHeadingBetween(p1: [number, number], p2: [number, number]): number {
  const dLng = (p2[1] - p1[1]) * (Math.PI / 180);
  const lat1 = p1[0] * (Math.PI / 180);
  const lat2 = p2[0] * (Math.PI / 180);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  const brng = Math.atan2(y, x) * (180 / Math.PI);
  return (brng + 360) % 360;
}

function generateCurvedWaypoints(pts: [number, number][]): [number, number][] {
  if (pts.length < 2) return pts;
  const result: [number, number][] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const steps = 18;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const lat = p0[0] + (p1[0] - p0[0]) * t;
      const lng = p0[1] + (p1[1] - p0[1]) * t;
      const curvature = Math.sin(t * Math.PI) * 0.08;
      result.push([lat + curvature, lng - curvature * 0.4]);
    }
  }
  return result;
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface FormattedTripStop {
  id?: string;
  sequence: number;
  label: string;
  letter?: string;
  isOrigin: boolean;
  isDestination: boolean;
  coords: [number, number];
  name: string;
  actual_arrival?: string | null;
  planned_arrival?: string | null;
  isCompleted: boolean;
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
  stops?: any[];
  resolvedLocation?: ResolvedLocation;
  /** Optional custom stop sequence header component rendered inside map canvas */
  stopsSequenceHeader?: React.ReactNode;
  showHeader?: boolean;
  showTelemetryBar?: boolean;
  /** Show only the Live Vehicle Status HUD box (no map canvas). */
  showOnlyTelemetry?: boolean;
  className?: string;
  mapHeightClassName?: string;
  isExpanded?: boolean;
}

const DEFAULT_PICKUP: [number, number] = [24.7136, 46.6753]; // Riyadh Central
const DEFAULT_DROPOFF: [number, number] = [21.5433, 39.1728]; // Jeddah Gateway

export default function TripLiveMapCard({
  tripId,
  refId,
  pickupLat,
  pickupLng,
  dropoffLat,
  dropoffLng,
  pickupLabel,
  dropoffLabel,
  stops,
  resolvedLocation,
  stopsSequenceHeader,
  showHeader = true,
  showTelemetryBar = true,
  showOnlyTelemetry = false,
  className,
  mapHeightClassName = 'h-[400px]',
  isExpanded = false,
}: TripLiveMapCardProps) {
  const navigate = useNavigate();
  const { fleet } = useSimulatedTelemetry(1);
  const [mapThemeId, setMapThemeId] = useState<string>('voyager');
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Road geometry state
  const [roadPolyline, setRoadPolyline] = useState<[number, number][] | null>(null);
  const [remainingRoadPolyline, setRemainingRoadPolyline] = useState<[number, number][] | null>(null);
  const [isRoutingFallback, setIsRoutingFallback] = useState(false);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number | null>(null);

  // Reverse geocoding & display state
  const [currentPlaceName, setCurrentPlaceName] = useState<string | null>(null);
  const [remainingDistanceKm, setRemainingDistanceKm] = useState<number | null>(null);
  const [remainingEtaText, setRemainingEtaText] = useState<string | null>(null);

  // ─── Animation Engine State ─────────────────────────────────────────────────
  const [isAnimating, setIsAnimating] = useState(false);
  const [animationIndex, setAnimationIndex] = useState(0);
  const [animationSpeed, setAnimationSpeed] = useState<1 | 2 | 4>(2);
  const animationFrameRef = useRef<number | null>(null);

  const effectiveExpanded = isExpanded || isFullscreen;

  // ─── 1. Build & Resolve Structured Stops (Pickup -> Stop A -> Stop B -> Dropoff)
  const resolvedStops = useMemo<FormattedTripStop[]>(() => {
    const rawStops = stops && stops.length > 0 ? stops : [];

    const isCoordValid = (lat?: number | null, lng?: number | null): boolean =>
      typeof lat === 'number' && Number.isFinite(lat) && typeof lng === 'number' && Number.isFinite(lng) && !(lat === 0 && lng === 0);

    const lookupCity = (txt: string): [number, number] | null => {
      const clean = txt.toLowerCase();
      for (const [city, c] of Object.entries(SAUDI_CITY_COORDS)) {
        if (clean.includes(city)) return c;
      }
      return null;
    };

    if (rawStops.length === 0) {
      const pCoord: [number, number] = isCoordValid(pickupLat, pickupLng)
        ? [pickupLat!, pickupLng!]
        : (pickupLabel && lookupCity(pickupLabel)) || DEFAULT_PICKUP;

      const dCoord: [number, number] = isCoordValid(dropoffLat, dropoffLng)
        ? [dropoffLat!, dropoffLng!]
        : (dropoffLabel && lookupCity(dropoffLabel)) || DEFAULT_DROPOFF;

      return [
        {
          sequence: 1,
          label: 'Pickup',
          isOrigin: true,
          isDestination: false,
          coords: pCoord,
          name: pickupLabel || 'Pickup Location',
          isCompleted: true,
        },
        {
          sequence: 2,
          label: 'Dropoff',
          isOrigin: false,
          isDestination: true,
          coords: dCoord,
          name: dropoffLabel || 'Destination',
          isCompleted: false,
        },
      ];
    }

    const total = rawStops.length;
    let intermediateIdx = 0;

    return rawStops.map((st, idx) => {
      const isFirst = idx === 0;
      const isLast = idx === total - 1;
      const letter = !isFirst && !isLast ? String.fromCharCode(65 + intermediateIdx++) : undefined;
      const label = isFirst ? 'Pickup' : isLast ? 'Dropoff' : `Stop ${letter}`;

      let c: [number, number] | null = null;
      if (isCoordValid(st.location_lat, st.location_lng)) {
        c = [st.location_lat, st.location_lng];
      } else if (st.location && isCoordValid(st.location.lat, st.location.lng)) {
        c = [st.location.lat, st.location.lng];
      } else {
        const textToSearch = `${st.location_name || ''} ${st.location?.name || ''} ${st.location?.city || ''} ${st.location_address || ''}`;
        c = lookupCity(textToSearch);
      }

      if (!c) {
        const frac = total > 1 ? idx / (total - 1) : 0;
        const lat = DEFAULT_PICKUP[0] + (DEFAULT_DROPOFF[0] - DEFAULT_PICKUP[0]) * frac;
        const lng = DEFAULT_PICKUP[1] + (DEFAULT_DROPOFF[1] - DEFAULT_PICKUP[1]) * frac;
        c = [lat, lng];
      }

      const placeName = st.location_name || st.location?.name || (isFirst ? pickupLabel : isLast ? dropoffLabel : `Stop ${letter}`) || `Waypoint ${idx + 1}`;

      return {
        id: st.id || `stop-${idx}`,
        sequence: idx + 1,
        label,
        letter,
        isOrigin: isFirst,
        isDestination: isLast,
        coords: c,
        name: placeName,
        actual_arrival: st.actual_arrival,
        planned_arrival: st.planned_arrival,
        isCompleted: !!st.actual_arrival,
      };
    });
  }, [stops, pickupLat, pickupLng, dropoffLat, dropoffLng, pickupLabel, dropoffLabel]);

  const originStop = resolvedStops[0];
  const destStop = resolvedStops[resolvedStops.length - 1];
  const intermediateStops = resolvedStops.filter((s) => !s.isOrigin && !s.isDestination);

  // ─── 2. Physical GPS / Telemetry Resolution ──────────────────────────────────
  const currentTheme = MAP_THEMES[mapThemeId] || MAP_THEMES.voyager;
  const resLat = resolvedLocation?.latitude;
  const resLng = resolvedLocation?.longitude;
  const displayState = resolvedLocation?.display_state;

  const hasResolvedCoords =
    typeof resLat === 'number' &&
    typeof resLng === 'number' &&
    Number.isFinite(resLat) &&
    Number.isFinite(resLng) &&
    !(resLat === 0 && resLng === 0) &&
    (displayState === 'CURRENT' || displayState === 'LAST_KNOWN');

  const matchedTruck = fleet.find((f) => f.tripId === tripId || f.refId === refId);
  const simulatedTruck = hasResolvedCoords ? undefined : (matchedTruck || fleet[0]);

  const activeTruckLat = hasResolvedCoords ? resLat! : (simulatedTruck ? simulatedTruck.currentCoords.lat : originStop.coords[0]);
  const activeTruckLng = hasResolvedCoords ? resLng! : (simulatedTruck ? simulatedTruck.currentCoords.lng : originStop.coords[1]);
  const activeSpeed = hasResolvedCoords ? (resolvedLocation?.speed_kph ?? 0) : (simulatedTruck ? simulatedTruck.speedKmH : 0);
  const activeHeading = hasResolvedCoords ? (resolvedLocation?.heading_deg ?? 0) : (simulatedTruck ? simulatedTruck.heading : 0);
  const sourceText = resolvedLocation?.source === 'DRIVER_GPS' ? 'Driver GPS' : resolvedLocation?.source === 'PHYSICAL_GPS' ? 'Vehicle GPS' : null;

  // ─── 3. Multi-Stop OSRM Driving Route Generation ────────────────────────────
  useEffect(() => {
    let isMounted = true;
    const waypoints = resolvedStops.map((s) => s.coords);
    if (waypoints.length < 2) return;

    const fetchMultiStopRoute = async () => {
      try {
        const coordsParam = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(';');
        const url = `https://router.project-osrm.org/route/v1/driving/${coordsParam}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
        const data = await res.json();

        if (data?.code === 'Ok' && Array.isArray(data?.routes?.[0]?.geometry?.coordinates)) {
          const rawCoords: [number, number][] = data.routes[0].geometry.coordinates;
          const leafletCoords: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng]);
          const distKm = Math.round((Number(data.routes[0].distance) || 0) / 1000);

          if (isMounted) {
            setRoadPolyline(leafletCoords);
            setRouteDistanceKm(distKm);
            setIsRoutingFallback(false);
          }
          return;
        }
        throw new Error('OSRM empty geometry');
      } catch (err) {
        console.warn('[TripLiveMapCard] Multi-stop OSRM route fallback active:', err);
        if (isMounted) {
          const curved = generateCurvedWaypoints(waypoints);
          setRoadPolyline(curved);
          setIsRoutingFallback(true);
        }
      }
    };

    fetchMultiStopRoute();
    return () => {
      isMounted = false;
    };
  }, [resolvedStops]);

  // ─── 4. Live Remaining Route: Current Truck GPS -> Destination ──────────────
  useEffect(() => {
    if (!hasResolvedCoords || !resLat || !resLng) {
      setRemainingRoadPolyline(null);
      setRemainingDistanceKm(null);
      setRemainingEtaText(null);
      return;
    }

    let isMounted = true;
    const dest = destStop.coords;

    const fetchRemainingRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${resLng},${resLat};${dest[1]},${dest[0]}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
        const data = await res.json();

        if (data?.code === 'Ok' && Array.isArray(data?.routes?.[0]?.geometry?.coordinates)) {
          const rawCoords: [number, number][] = data.routes[0].geometry.coordinates;
          const leafletRemainingCoords: [number, number][] = rawCoords.map(([lng, lat]) => [lat, lng]);
          const distKm = Math.round((Number(data.routes[0].distance) || 0) / 1000);
          const durSec = Number(data.routes[0].duration) || 0;
          const hours = Math.floor(durSec / 3600);
          const mins = Math.round((durSec % 3600) / 60);
          const etaText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

          if (isMounted) {
            setRemainingRoadPolyline(leafletRemainingCoords);
            setRemainingDistanceKm(distKm);
            setRemainingEtaText(etaText);
          }
          return;
        }
        throw new Error('Invalid remaining route');
      } catch (err) {
        console.warn('[TripLiveMapCard] OSRM remaining route fallback:', err);
        if (isMounted) {
          const directCurve = generateCurvedWaypoints([[resLat, resLng], dest]);
          setRemainingRoadPolyline(directCurve);
          const dLat = (dest[0] - resLat) * 111;
          const dLng = (dest[1] - resLng) * 100;
          const approxKm = Math.round(Math.hypot(dLat, dLng));
          setRemainingDistanceKm(approxKm);
          setRemainingEtaText(`~${Math.round(approxKm / 75)}h`);
        }
      }
    };

    fetchRemainingRoute();
    return () => {
      isMounted = false;
    };
  }, [hasResolvedCoords, resLat, resLng, destStop.coords]);

  // ─── 5. Reverse Geocode for Place Name ───────────────────────────────────────
  useEffect(() => {
    if (!hasResolvedCoords || !resLat || !resLng) {
      setCurrentPlaceName(null);
      return;
    }
    let isMounted = true;
    reverseGeocode(resLat, resLng)
      .then((name) => {
        if (isMounted) setCurrentPlaceName(name);
      })
      .catch(() => {
        if (isMounted) setCurrentPlaceName(null);
      });
    return () => {
      isMounted = false;
    };
  }, [hasResolvedCoords, resLat, resLng]);

  // ─── 6. ROUTE JOURNEY ANIMATION ENGINE ──────────────────────────────────────
  const fullPolyline = roadPolyline || resolvedStops.map((s) => s.coords);

  const startAnimation = useCallback(() => {
    setAnimationIndex(0);
    setIsAnimating(true);
  }, []);

  const pauseAnimation = useCallback(() => {
    setIsAnimating(false);
  }, []);

  const resetAnimation = useCallback(() => {
    setIsAnimating(false);
    setAnimationIndex(0);
  }, []);

  const prevExpandedRef = useRef(false);
  useEffect(() => {
    if (effectiveExpanded && !prevExpandedRef.current) {
      const timer = setTimeout(() => {
        startAnimation();
      }, 500);
      return () => clearTimeout(timer);
    }
    prevExpandedRef.current = effectiveExpanded;
  }, [effectiveExpanded, startAnimation]);

  useEffect(() => {
    if (!isAnimating || fullPolyline.length === 0) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      return;
    }

    let lastTime = performance.now();
    const stepInterval = 35 / animationSpeed;

    const animateLoop = (now: number) => {
      if (now - lastTime >= stepInterval) {
        lastTime = now;
        setAnimationIndex((prev) => {
          if (prev >= fullPolyline.length - 1) {
            setIsAnimating(false);
            return fullPolyline.length - 1;
          }
          return prev + 1;
        });
      }
      animationFrameRef.current = requestAnimationFrame(animateLoop);
    };

    animationFrameRef.current = requestAnimationFrame(animateLoop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isAnimating, fullPolyline.length, animationSpeed]);

  const currentAnimCoord: [number, number] = fullPolyline[animationIndex] || originStop.coords;
  const nextAnimCoord: [number, number] = fullPolyline[Math.min(animationIndex + 1, fullPolyline.length - 1)] || currentAnimCoord;
  const animHeading = getHeadingBetween(currentAnimCoord, nextAnimCoord);

  const animatedVisiblePolyline = useMemo(() => {
    if (!isAnimating && animationIndex === 0) return fullPolyline;
    return fullPolyline.slice(0, animationIndex + 1);
  }, [isAnimating, animationIndex, fullPolyline]);

  const animProgressPct = fullPolyline.length > 1
    ? Math.round((animationIndex / (fullPolyline.length - 1)) * 100)
    : 0;

  const currentLegText = useMemo(() => {
    if (animProgressPct === 100) return `Arrived at ${destStop.name}`;
    if (intermediateStops.length === 0) return `En route to ${destStop.name}`;
    const segmentFrac = 100 / (intermediateStops.length + 1);
    const stopIdx = Math.floor(animProgressPct / segmentFrac);
    if (stopIdx === 0) return `Approaching Stop ${intermediateStops[0]?.letter} (${intermediateStops[0]?.name})`;
    if (stopIdx <= intermediateStops.length) {
      const nextS = intermediateStops[stopIdx] || destStop;
      return `En route to ${nextS.label} (${nextS.name})`;
    }
    return `Approaching Destination (${destStop.name})`;
  }, [animProgressPct, intermediateStops, destStop]);

  const allBoundsPoints = useMemo<[number, number][]>(() => {
    const pts = resolvedStops.map((s) => s.coords);
    if (hasResolvedCoords) pts.push([resLat!, resLng!]);
    return pts;
  }, [resolvedStops, hasResolvedCoords, resLat, resLng]);

  // ─── Render: Telemetry Only View (for bottom HUD banner) ───────────────────
  if (showOnlyTelemetry) {
    return (
      <div className={cn('bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3', className)}>
        <div className="flex items-center justify-between border-b border-slate-200/70 dark:border-slate-700/60 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping shrink-0" />
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-[#3E3C3D] dark:text-slate-200">
              Live Vehicle Status
            </h4>
          </div>
          {resolvedLocation?.plate_number && (
            <span className="text-[11px] font-mono font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
              {resolvedLocation.plate_number}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* 1. Location */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate">Current Location</span>
              <span className="text-xs font-bold text-[#3E3C3D] dark:text-slate-100 truncate" title={currentPlaceName || undefined}>
                {currentPlaceName || `${activeTruckLat.toFixed(4)}, ${activeTruckLng.toFixed(4)}`}
              </span>
            </div>
          </div>

          {/* 2. Distance */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/50 border border-orange-200/80 dark:border-orange-800/80 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
              <Route className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate">Distance Remaining</span>
              <span className="text-xs font-mono font-bold text-[#3E3C3D] dark:text-slate-100 truncate">
                {remainingDistanceKm != null ? `${remainingDistanceKm} km` : routeDistanceKm != null ? `${routeDistanceKm} km` : 'Calculating...'}
              </span>
            </div>
          </div>

          {/* 3. ETA */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-950/50 border border-sky-200/80 dark:border-sky-800/80 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate">ETA Remaining</span>
              <span className="text-xs font-mono font-bold text-[#3E3C3D] dark:text-slate-100 truncate">
                {remainingEtaText || (simulatedTruck ? `${simulatedTruck.etaMinutes}m` : 'Calculating...')}
              </span>
            </div>
          </div>

          {/* 4. Source */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/50 border border-purple-200/80 dark:border-purple-800/80 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 truncate">Source & Updated</span>
              <span className="text-xs font-bold text-[#3E3C3D] dark:text-slate-200 truncate">
                {hasResolvedCoords
                  ? `${sourceText || 'Vehicle GPS'}${resolvedLocation?.formatted_time_ago ? ` · ${resolvedLocation.formatted_time_ago}` : ''}`
                  : 'Simulated Telemetry'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn('border-black/[0.06] shadow-md rounded-2xl bg-white overflow-hidden p-0 gap-0', className)}>
      {showHeader && (
        <CardHeader className="p-4 pb-3 border-b border-black/[0.04]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#FF5500] animate-ping" />
                <CardTitle className="text-sm font-extrabold text-[#111]">Live Multi-Stop Route Radar</CardTitle>
                <Badge variant="outline" className={`text-[10px] font-mono ${currentTheme.badgeColor}`}>
                  {currentTheme.name}
                </Badge>
                {intermediateStops.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] font-bold bg-purple-100 text-purple-800">
                    {intermediateStops.length} Intermediate Stop{intermediateStops.length > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs text-[#6E6E80] mt-0.5">
                {originStop.name} → {intermediateStops.map((s) => `${s.label} (${s.name}) → `).join('')}{destStop.name}
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
              >
                <Navigation size={13} className="text-[#FF5500]" />
                <span>Full Radar</span>
              </Button>
            </div>
          </div>
        </CardHeader>
      )}

      <CardContent className="p-4">
        {/* Side-by-side Layout: Left Stop Sequence Panel + Right Map Canvas */}
        <div className="flex flex-col xl:flex-row items-stretch gap-3">
          {/* Left: Stop Sequence Sidebar Panel (when not in fullscreen) */}
          {stopsSequenceHeader && !isFullscreen && (
            <div className="w-full xl:w-56 sm:xl:w-60 shrink-0 bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800 rounded-xl p-3 shadow-2xs">
              {stopsSequenceHeader}
            </div>
          )}

          {/* Right: Map Canvas */}
          <div className="flex-1 min-w-0">
            <div
              className={cn(
                'overflow-hidden relative shadow-xl transition-all duration-300',
                isFullscreen
                  ? 'fixed inset-0 z-[9999] w-screen h-screen rounded-none border-none m-0'
                  : cn('rounded-xl border border-black/[0.1] z-0', mapHeightClassName)
              )}
              style={{ background: currentTheme.previewColor }}
            >
              {/* Floating Stop Sequence Header Overlay (ONLY when in Fullscreen) */}
              {stopsSequenceHeader && isFullscreen && (
                <div className="absolute top-3 left-3 z-[400] max-h-[calc(100%-24px)] overflow-y-auto no-scrollbar">
                  {stopsSequenceHeader}
                </div>
              )}

              {/* Floating Fullscreen / Close Toggle Button (Right Side) */}
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

              {/* ─── ROUTE ANIMATION FLOATING CONTROLLER BAR ────────────────────── */}
              <div className={cn(
                "absolute z-[400] rounded-xl border shadow-xl backdrop-blur-xl p-2 flex items-center gap-2.5 transition-all text-xs",
                stopsSequenceHeader && isFullscreen ? "top-3 left-64" : "top-3 left-3",
                currentTheme.isDark
                  ? "bg-[#090A0F]/90 border-white/10 text-white"
                  : "bg-white/95 border-black/[0.08] text-[#111]"
              )}>
                <div className="flex items-center gap-1">
                  {isAnimating ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={pauseAnimation}
                      className="h-7 px-2 text-xs font-bold text-amber-500 hover:text-amber-600 gap-1"
                    >
                      <Pause size={13} />
                      <span>Pause</span>
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={startAnimation}
                      className="h-7 px-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 gap-1"
                    >
                      <Play size={13} className="fill-emerald-600" />
                      <span>{animationIndex > 0 && animationIndex < fullPolyline.length - 1 ? 'Resume' : 'Play Route'}</span>
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={resetAnimation}
                    className="h-7 w-7 p-0 text-slate-500 hover:text-slate-700"
                    title="Reset Animation"
                  >
                    <RotateCcw size={12} />
                  </Button>
                </div>

                <div className="h-4 w-px bg-slate-200 dark:bg-white/10" />

                <div className="flex flex-col min-w-[150px] max-w-[240px]">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className="text-slate-500 dark:text-slate-400 truncate">{currentLegText}</span>
                    <span className="font-mono text-[#FF5500] ml-1">{animProgressPct}%</span>
                  </div>
                  <Progress value={animProgressPct} className="h-1.5 mt-1 bg-slate-200 dark:bg-white/10" />
                </div>

                <button
                  type="button"
                  onClick={() => setAnimationSpeed((s) => (s === 1 ? 2 : s === 2 ? 4 : 1))}
                  className="px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 text-[10px] font-mono font-extrabold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Change Speed"
                >
                  {animationSpeed}x
                </button>
              </div>

              {/* ─── LEAFLET MAP CONTAINER ───────────────────────────────────────── */}
              <MapContainer
                center={activeTruckLat && activeTruckLng ? [activeTruckLat, activeTruckLng] : originStop.coords}
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

                <FitAllBounds points={allBoundsPoints} />

                {/* Full Planned Highway Polyline (Dashed background track) */}
                <Polyline
                  positions={fullPolyline}
                  pathOptions={{
                    color: '#94A3B8',
                    weight: 4,
                    opacity: 0.35,
                    dashArray: '6, 8',
                  }}
                />

                {/* Active / Animated Driving Polyline (Dynamic road trace) */}
                <Polyline
                  positions={animatedVisiblePolyline}
                  pathOptions={{
                    color: isRoutingFallback ? '#94A3B8' : '#FF5500',
                    weight: 5,
                    opacity: 0.95,
                  }}
                />

                {/* Real-time GPS Remaining Polyline (When real vehicle GPS is present) */}
                {remainingRoadPolyline && !isAnimating && (
                  <Polyline
                    positions={remainingRoadPolyline}
                    pathOptions={{
                      color: '#10B981',
                      weight: 4,
                      opacity: 0.85,
                      dashArray: '4, 8',
                    }}
                  />
                )}

                {/* ─── MARKERS ─────────────────────────────────────────────────── */}

                {/* Origin Stop (Pickup) */}
                <Marker position={originStop.coords} icon={pickupMarkerIcon}>
                  <Popup className={currentTheme.isDark ? "dark-map-popup" : ""}>
                    <div className="text-xs font-sans p-1">
                      <p className="font-bold text-[#10B981]">Pickup (Origin)</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{originStop.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">{originStop.coords[0].toFixed(4)}, {originStop.coords[1].toFixed(4)}</p>
                    </div>
                  </Popup>
                </Marker>

                {/* Intermediate Stops (Stop A, Stop B, etc.) */}
                {intermediateStops.map((stop) => (
                  <Marker
                    key={stop.id || stop.sequence}
                    position={stop.coords}
                    icon={createStopIcon(stop.letter || `${stop.sequence - 1}`, stop.isCompleted, false)}
                  >
                    <Popup className={currentTheme.isDark ? "dark-map-popup" : ""}>
                      <div className="text-xs font-sans p-1 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-purple-700 dark:text-purple-400">
                          <span className="w-2 h-2 rounded-full bg-purple-600" />
                          <span>{stop.label} (Intermediate)</span>
                        </div>
                        <p className="font-bold text-slate-800 dark:text-slate-200">{stop.name}</p>
                        <p className="text-[10px] text-gray-400 font-mono">{stop.coords[0].toFixed(4)}, {stop.coords[1].toFixed(4)}</p>
                        {stop.actual_arrival ? (
                          <p className="text-[10px] text-emerald-600 font-bold">Arrived: {stop.actual_arrival}</p>
                        ) : stop.planned_arrival ? (
                          <p className="text-[10px] text-slate-500">Planned: {stop.planned_arrival}</p>
                        ) : null}
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {/* Destination Stop (Dropoff) */}
                <Marker position={destStop.coords} icon={dropoffMarkerIcon}>
                  <Popup className={currentTheme.isDark ? "dark-map-popup" : ""}>
                    <div className="text-xs font-sans p-1">
                      <p className="font-bold text-[#F43F5E]">Drop-off (Destination)</p>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{destStop.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">{destStop.coords[0].toFixed(4)}, {destStop.coords[1].toFixed(4)}</p>
                    </div>
                  </Popup>
                </Marker>

                {/* Animated Moving Truck Marker (When animation is running) */}
                {isAnimating ? (
                  <Marker position={currentAnimCoord} icon={createLiveTruckIcon(animHeading)}>
                    <Popup className={currentTheme.isDark ? "dark-map-popup" : ""}>
                      <div className="text-xs font-sans p-1">
                        <p className="font-bold text-[#FF5500]">Animated Truck Simulation</p>
                        <p className="text-[10px] text-gray-500">{currentLegText}</p>
                        <p className="text-[10px] font-mono text-emerald-600">Progress: {animProgressPct}%</p>
                      </div>
                    </Popup>
                  </Marker>
                ) : hasResolvedCoords ? (
                  /* Live Telemetry Vehicle Pin */
                  <Marker position={[resLat!, resLng!]} icon={createResolvedTruckIcon(activeHeading, displayState as 'CURRENT' | 'LAST_KNOWN')}>
                    <Popup className={currentTheme.isDark ? "dark-map-popup" : ""}>
                      <div className="text-xs font-sans p-1 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold">
                          <span className={cn("w-2 h-2 rounded-full", displayState === 'CURRENT' ? "bg-emerald-500" : "bg-amber-500")} />
                          <span className="text-[#111] dark:text-white">
                            {displayState === 'CURRENT' ? 'Current vehicle location' : 'Last known location'}
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
                ) : (
                  /* Default Simulated Truck Marker */
                  <Marker position={[activeTruckLat, activeTruckLng]} icon={createLiveTruckIcon(activeHeading)}>
                    <Popup className={currentTheme.isDark ? "dark-map-popup" : ""}>
                      <div className="text-xs font-sans p-1">
                        <p className="font-bold text-[#FF5500]">{simulatedTruck?.plateNumber || 'MERCON Fleet'}</p>
                        <p className="text-[10px] text-gray-500">Speed: {activeSpeed || 85} km/h</p>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </MapContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
