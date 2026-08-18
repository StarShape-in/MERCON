import L from 'leaflet';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SAUDI ARABIA GEOGRAPHIC CONFIGURATION & BOUNDS SYSTEM
 * Enforces strict Saudi Arabia-only map view boundaries, red border outline,
 * and search restriction.
 * 
 * 3 R's Implementation:
 *  - Readability: Self-documenting constants and interfaces for Saudi geography.
 *  - Reusability: Single source of truth for all Leaflet maps & geocoders.
 *  - Refactoring: Allows full nationwide zoom out while keeping Saudi framed.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Geographic bounding box coordinates covering the Kingdom of Saudi Arabia.
 * Allows zooming out to view the entire nation without bouncing off edge bounds.
 */
export const SAUDI_BOUNDS_COORDS: [[number, number], [number, number]] = [
  [14.5, 32.0], // South-West corner (Near Red Sea / Yemeni border)
  [33.5, 57.5], // North-East corner (Near Jordan/Iraq border to Arabian Gulf)
];

export const SAUDI_BOUNDS: L.LatLngBounds = L.latLngBounds(SAUDI_BOUNDS_COORDS);

/** Central coordinates for the Kingdom of Saudi Arabia (Riyadh Hub) */
export const SAUDI_CENTER: [number, number] = [23.8, 45.2];

/** Default zoom level when displaying nationwide Saudi Arabia */
export const DEFAULT_SAUDI_ZOOM = 5.3;

/** Minimum zoom allowed - allows seeing full Saudi Arabia nationwide in cards */
export const SAUDI_MIN_ZOOM = 4.6;

/** Maximum zoom allowed for city/district level view */
export const SAUDI_MAX_ZOOM = 18;

/** ISO 3166-1 alpha-2 country code for Saudi Arabia */
export const SAUDI_COUNTRY_CODE = 'sa';

/**
 * High-precision perimeter coordinates outlining the international border of
 * the Kingdom of Saudi Arabia (Red Sea coast, Jordan, Iraq, Kuwait, Gulf, UAE, Oman, Yemen).
 */
export const SAUDI_BORDER_POLYGON_COORDS: [number, number][] = [
  [29.35, 34.95], // Haql / Gulf of Aqaba (NW)
  [29.20, 36.10], // Halat Ammar / Jordan
  [31.50, 37.00], // Jordan border tip
  [32.15, 39.10], // Turaif / Northern border
  [31.35, 41.10], // Arar / Iraq border
  [29.60, 43.60], // Rafha / Iraq border
  [29.10, 46.50], // Hafar Al Batin / Kuwait border
  [28.45, 48.55], // Al Khafji / Arabian Gulf coast (NE)
  [27.00, 49.65], // Jubail
  [26.42, 50.10], // Dammam
  [26.20, 50.22], // Al Khobar
  [24.75, 50.80], // Salwa / Qatar border
  [24.20, 51.60], // UAE border
  [22.80, 55.20], // UAE / Empty Quarter border
  [20.00, 55.80], // Oman border
  [19.00, 52.00], // Rub' al Khali / Yemen border (East)
  [17.40, 47.00], // Najran border
  [17.30, 44.20], // Saada / Yemen border
  [16.40, 43.15], // Jizan / Yemeni SW Coast
  [17.10, 42.50], // Red Sea Coast (Jizan)
  [18.20, 41.50], // Asir Coast
  [20.15, 40.25], // Al Lith Coast
  [21.50, 39.15], // Jeddah / Makkah Coast
  [22.80, 39.00], // Rabigh Coast
  [24.08, 38.05], // Yanbu Coast
  [25.00, 37.25], // Umluj Coast
  [27.35, 35.70], // Duba Coast
  [28.50, 34.80], // Al Sharma Coast
  [29.35, 34.95], // Back to Haql (Close Loop)
];

/**
 * Standardized Leaflet MapContainer props to enforce Saudi-only view.
 * Enables nationwide zoom out to view the entire country seamlessly.
 */
export const SAUDI_MAP_CONTAINER_PROPS = {
  center: SAUDI_CENTER as [number, number],
  zoom: DEFAULT_SAUDI_ZOOM,
  minZoom: SAUDI_MIN_ZOOM,
  maxZoom: SAUDI_MAX_ZOOM,
  maxBounds: SAUDI_BOUNDS_COORDS as L.LatLngBoundsExpression,
  maxBoundsViscosity: 0.9, // Flexible boundary buffer for smooth nationwide zoom out
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
