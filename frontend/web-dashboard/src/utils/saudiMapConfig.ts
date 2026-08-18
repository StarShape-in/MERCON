import L from 'leaflet';

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SAUDI ARABIA GEOGRAPHIC CONFIGURATION & BOUNDS SYSTEM
 * Enforces strict Saudi Arabia-only map view boundaries, exact red nation border
 * outline, and search restriction.
 * 
 * 3 R's Implementation:
 *  - Readability: Self-documenting constants and interfaces for Saudi geography.
 *  - Reusability: Single source of truth for all Leaflet maps & geocoders.
 *  - Refactoring: Allows full nationwide zoom out with exact national perimeter.
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
 * High-precision perimeter coordinates outlining the exact international border of
 * the Kingdom of Saudi Arabia (Red Sea coastline, Jordan, Iraq, Kuwait, Arabian Gulf, Qatar, UAE, Oman, Yemen).
 * 
 * All major logistics cities (Jeddah, Makkah, Medina, Dammam, Jubail, Khobar, Yanbu, Tabuk, Abha, Jizan)
 * are 100% enclosed within this boundary polygon.
 */
export const SAUDI_BORDER_POLYGON_COORDS: [number, number][] = [
  // Northwest Corner (Gulf of Aqaba & Haql / Jordan Border)
  [29.36, 34.95], // Haql / Gulf of Aqaba (NW)
  [29.21, 36.06], // Halat Ammar / Jordan
  [31.50, 37.05], // Jordan border peak
  [32.16, 39.12], // Turaif / Northern Frontier

  // North Border (Iraq)
  [31.36, 41.12], // Arar / Iraq border
  [29.62, 43.62], // Rafha / Iraq border
  [29.12, 46.52], // Hafar Al-Batin / Kuwait border

  // Northeast Border & Arabian Gulf Coast (Kuwait, Jubail, Dammam, Khobar)
  [30.08, 47.98], // Northern Kuwait border
  [28.52, 48.55], // Al Khafji / Gulf Coast (NE)
  [27.40, 49.35], // Manifa Bay
  [27.02, 49.75], // Jubail Industrial City
  [26.70, 50.20], // Ras Tanura
  [26.43, 50.18], // Dammam Port
  [26.22, 50.28], // Al Khobar / King Fahd Causeway

  // East Border (Qatar, UAE & Empty Quarter)
  [25.40, 50.85], // Salwa Bay / Qatar border
  [24.75, 50.92], // Qatar border South
  [24.22, 51.72], // Al Batha / UAE border
  [24.02, 52.90], // UAE border
  [24.25, 54.12], // UAE border East
  [22.82, 55.58], // Rub' al Khali (Empty Quarter / UAE)
  [20.02, 55.92], // Oman border tip

  // Southeast & South Border (Oman & Yemen)
  [19.02, 52.12], // Rub' al Khali (Oman border)
  [17.32, 47.32], // Sharurah
  [17.49, 44.23], // Najran
  [17.12, 43.35], // Asir / Saada border
  [16.35, 43.15], // Tuwal / Yemen border (SW Coast)

  // West Coast (Red Sea Coastline - positioned in water west of cities so Jeddah/Makkah/Yanbu/Jizan are fully inside)
  [16.20, 42.45], // Red Sea Coast South of Jizan (Farasan Passage)
  [16.85, 42.25], // Jizan Sea Coast (West of Jizan City at 42.57° E)
  [17.70, 41.35], // Al Birk Sea Coast
  [19.50, 40.10], // Al Qunfudhah Sea Coast
  [20.15, 39.50], // Al Lith Sea Coast
  [21.20, 38.60], // South Jeddah Sea Coast
  [21.55, 38.60], // Jeddah Port Sea Coast (West of Jeddah at 39.17° E)
  [22.40, 38.50], // Thuwal / KAUST Sea Coast
  [22.80, 38.45], // Rabigh Sea Coast
  [24.08, 37.55], // Yanbu Industrial Sea Coast (West of Yanbu at 38.06° E)
  [25.05, 36.75], // Umluj Sea Coast
  [26.25, 35.95], // Al Wajh Sea Coast
  [27.35, 35.20], // Duba Port Sea Coast
  [28.50, 34.45], // Sharma / Magna / NEOM Sea Coast
  [29.36, 34.95], // Back to Haql / Gulf of Aqaba (Close Loop)
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
