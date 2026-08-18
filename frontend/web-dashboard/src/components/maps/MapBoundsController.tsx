import { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { SAUDI_BOUNDS_COORDS } from '@/utils/saudiMapConfig';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * MAP BOUNDS & INTERACTION CONTROLLER (3 R's Implementation)
 * 
 *  - Readability: Clean, self-documenting React components for Leaflet maps.
 *  - Reusability: Reusable across Dashboard map, Fleet live map, Vehicle list map.
 *  - Refactoring & Robustness:
 *      1. Automatically calculates bounding box for ALL vehicles spread across
 *         Saudi Arabia and smoothly adjusts zoom (`fitBounds`).
 *      2. Dynamically toggles scroll wheel zoom on mouse hover (`isHovered`).
 * ─────────────────────────────────────────────────────────────────────────────
 */

export interface VehicleCoordinate {
  lat: number;
  lng: number;
  [key: string]: any;
}

interface AutoFitVehiclesMapBoundsProps {
  vehicles: VehicleCoordinate[];
  padding?: [number, number];
  maxZoom?: number;
}

/**
 * Automatically fits map bounds to include EVERY vehicle on the map.
 * Adjusts zoom dynamically based on vehicle positions across Saudi Arabia.
 */
export function AutoFitVehiclesMapBounds({
  vehicles,
  padding = [50, 50],
  maxZoom = 12,
}: AutoFitVehiclesMapBoundsProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // Filter valid lat/lng points
    const validPoints = vehicles.filter(
      (v) => v && typeof v.lat === 'number' && typeof v.lng === 'number' && !isNaN(v.lat) && !isNaN(v.lng)
    );

    if (validPoints.length === 0) return;

    if (validPoints.length === 1) {
      // Single vehicle: center smoothly on vehicle
      map.setView([validPoints[0].lat, validPoints[0].lng], Math.min(maxZoom, 11), {
        animate: true,
      });
      return;
    }

    // Multiple vehicles spread across Saudi Arabia: compute bounding box
    const bounds = L.latLngBounds(validPoints.map((v) => [v.lat, v.lng] as [number, number]));

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding,
        maxZoom,
        animate: true,
      });
    }
  }, [map, vehicles, padding, maxZoom]);

  return null;
}

interface HoverScrollZoomListenerProps {
  isHovered: boolean;
}

/**
 * Dynamically enables mouse scroll wheel zoom when the mouse enters/hovers over the map,
 * and disables scroll wheel zoom when mouse leaves so page scrolling remains smooth.
 */
export function HoverScrollZoomListener({ isHovered }: HoverScrollZoomListenerProps) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (isHovered) {
      map.scrollWheelZoom.enable();
    } else {
      map.scrollWheelZoom.disable();
    }
  }, [map, isHovered]);

  return null;
}
