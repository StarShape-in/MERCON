import { Polygon } from 'react-leaflet';
import { SAUDI_BORDER_POLYGON_COORDS } from '@/utils/saudiMapConfig';

interface SaudiRedBorderOverlayProps {
  color?: string;
  weight?: number;
  dashArray?: string;
  fillOpacity?: number;
  fillColor?: string;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * SAUDI ARABIA RED NATION BORDER OVERLAY (3 R's Implementation)
 * Renders a crisp red outline polygon around the Kingdom of Saudi Arabia.
 * 
 *  - Readability: Clean React-Leaflet overlay component.
 *  - Reusability: Placed inside any Leaflet <MapContainer> across the application.
 *  - Refactoring & Robustness: Uses high-precision national perimeter coordinates.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export default function SaudiRedBorderOverlay({
  color = '#DC2626', // Vibrant Red Outline
  weight = 2.5,
  dashArray = '6, 6', // Dotted/dashed border styling
  fillOpacity = 0.035, // Soft reddish tint over Saudi territory
  fillColor = '#EF4444',
}: SaudiRedBorderOverlayProps) {
  return (
    <Polygon
      positions={SAUDI_BORDER_POLYGON_COORDS}
      pathOptions={{
        color,
        weight,
        dashArray,
        fillColor,
        fillOpacity,
        lineCap: 'round',
        lineJoin: 'round',
      }}
    />
  );
}
