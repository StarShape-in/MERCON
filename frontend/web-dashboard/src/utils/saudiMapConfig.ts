import L from 'leaflet';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SAUDI ARABIA GEOGRAPHIC CONFIGURATION & BOUNDS SYSTEM
 * Enforces strict Saudi Arabia-only map view boundaries and search restriction.
 * 
 * 3 R's Implementation:
 *  - Readability: Self-documenting constants and interfaces for Saudi geography.
 *  - Reusability: Single source of truth for all Leaflet maps & geocoders.
 *  - Refactoring: Prevents panning/zooming outside Saudi Arabia nationwide.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Geographic bounding box coordinates covering the Kingdom of Saudi Arabia.
 * Latitudes: ~16.0° N to 32.5° N
 * Longitudes: ~34.0° E to 55.8° E
 */
export const SAUDI_BOUNDS_COORDS: [[number, number], [number, number]] = [
  [16.0, 34.0], // South-West corner (Near Red Sea / Yemeni border)
  [32.5, 55.8], // North-East corner (Near Jordan/Iraq border to Arabian Gulf)
];

export const SAUDI_BOUNDS: L.LatLngBounds = L.latLngBounds(SAUDI_BOUNDS_COORDS);

/** Central coordinates for the Kingdom of Saudi Arabia (Riyadh Hub) */
export const SAUDI_CENTER: [number, number] = [24.0, 45.0];

/** Default zoom level when displaying nationwide Saudi Arabia */
export const DEFAULT_SAUDI_ZOOM = 6;

/** Minimum zoom allowed - prevents users from zooming out into Europe/Africa/Asia */
export const SAUDI_MIN_ZOOM = 5.8;

/** Maximum zoom allowed for city/district level view */
export const SAUDI_MAX_ZOOM = 18;

/** ISO 3166-1 alpha-2 country code for Saudi Arabia */
export const SAUDI_COUNTRY_CODE = 'sa';

/**
 * Standardized Leaflet MapContainer props to enforce Saudi-only view.
 * Prevents panning or zooming out beyond Saudi Arabia.
 */
export const SAUDI_MAP_CONTAINER_PROPS = {
  center: SAUDI_CENTER as [number, number],
  zoom: DEFAULT_SAUDI_ZOOM,
  minZoom: SAUDI_MIN_ZOOM,
  maxZoom: SAUDI_MAX_ZOOM,
  maxBounds: SAUDI_BOUNDS_COORDS as L.LatLngBoundsExpression,
  maxBoundsViscosity: 1.0, // Hard rubber wall boundary preventing panning out of KSA
};

/**
 * Checks if a given latitude and longitude falls within Saudi Arabia boundaries.
 */
export function isWithinSaudiArabia(lat: number, lng: number): boolean {
  return lat >= 16.0 && lat <= 32.5 && lng >= 34.0 && lng <= 55.8;
}

/**
 * Filters a list of items or places to only retain those inside Saudi Arabia.
 */
export function filterSaudiOnly<T extends { lat?: number; lng?: number; country?: string; address?: string }>(items: T[]): T[] {
  return items.filter((item) => {
    if (item.lat != null && item.lng != null) {
      return isWithinSaudiArabia(item.lat, item.lng);
    }
    if (item.country) {
      return item.country.toLowerCase().includes('saudi') || item.country.toLowerCase() === 'sa';
    }
    if (item.address) {
      return item.address.toLowerCase().includes('saudi') || item.address.toLowerCase().includes('ksa');
    }
    return true;
  });
}
