import * as React from 'react';

/**
 * Animated "route map" KpiCard footer — grid + intersecting street lines +
 * a dashed route with a pulsing 3D truck, color-tinted per card. Extracted
 * from the four hand-duplicated instances on `VehicleListPage.tsx`'s
 * instrument panel so other pages can reuse the same visual language
 * without re-copying the SVG block.
 */
export interface KpiRouteFooterBadge {
  icon: React.ReactNode;
  text: string;
}

export interface KpiRouteFooterProps {
  /** Unique id suffix so multiple footers on one page don't collide on SVG pattern/keyframe ids. */
  id: string;
  /** Route/accent color, e.g. '#2563EB'. */
  accentHex: string;
  /** Tailwind class for the footer's tinted background (light mode). */
  bgLightClass: string;
  /** Tailwind class for the footer's tinted background (dark mode). */
  bgDarkClass: string;
  /** Tailwind class for the footer's top border tint. */
  borderClass: string;
  /** Lighter tint of accentHex, used for the decorative street-line network. */
  networkHex: string;
  /** CSS filter applied to the truck image to retint it toward accentHex. */
  truckFilter: string;
  /** Ping/pulse ring color class behind the truck. */
  pulseClass: string;
  /** Optional small bouncing badge (e.g. "MAINTENANCE") shown above the truck. */
  badge?: KpiRouteFooterBadge;
}

export function KpiRouteFooter({
  id,
  accentHex,
  bgLightClass,
  bgDarkClass,
  borderClass,
  networkHex,
  truckFilter,
  pulseClass,
  badge,
}: KpiRouteFooterProps) {
  const gridId = `card-map-grid-${id}`;
  const keyframeName = `routeDash-${id}`;

  return (
    <div className={`relative h-9 mt-4 -mx-5 overflow-hidden rounded-b-2xl ${bgLightClass} ${bgDarkClass} border-t ${borderClass}`}>
      <style>{`
        @keyframes ${keyframeName} {
          to { stroke-dashoffset: -12; }
        }
      `}</style>
      {/* Grid lines for map look */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.06]" stroke="currentColor" fill="none">
        <pattern id={gridId} width="12" height="12" patternUnits="userSpaceOnUse">
          <path d="M 12 0 L 0 0 0 12" strokeWidth="0.5" />
        </pattern>
        <rect width="100%" height="100%" fill={`url(#${gridId})`} />
      </svg>

      {/* Stylized intersecting street map network */}
      <svg className="absolute inset-0 h-full w-full opacity-[0.3]" viewBox="0 0 280 48" preserveAspectRatio="none">
        <path d="M 60 -5 C 65 15, 55 35, 60 55" fill="none" stroke={networkHex} strokeWidth="1.5" />
        <path d="M 140 -5 C 135 15, 145 35, 138 55" fill="none" stroke={networkHex} strokeWidth="1.5" />
        <path d="M 210 -5 C 220 15, 205 35, 215 55" fill="none" stroke={networkHex} strokeWidth="1.5" />
      </svg>

      {/* Route line */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 280 48" preserveAspectRatio="none">
        <path d="M -10 24 C 70 10, 150 38, 290 24" fill="none" stroke="#D1D5DB" strokeWidth="3.5" strokeLinecap="round" />
        <path
          d="M -10 24 C 70 10, 150 38, 290 24"
          fill="none"
          stroke={accentHex}
          strokeWidth="3"
          strokeDasharray="6,6"
          strokeLinecap="round"
          style={{ animation: `${keyframeName} 4s linear infinite` }}
        />
      </svg>

      {/* Start pin */}
      <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
        <div className="h-2 w-2 rounded-full ring-4" style={{ backgroundColor: accentHex, boxShadow: `0 0 0 4px ${accentHex}33` }} />
      </div>

      {/* Truck sitting in the middle of the route */}
      <div
        className="absolute"
        style={{ left: '52%', top: '50%', transform: 'translate(-50%, -50%) scale(0.68)', zIndex: 10 }}
      >
        <div className="relative flex items-center justify-center">
          {badge && (
            <div
              className="absolute bottom-[18px] bg-slate-900 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded-md shadow-md flex items-center gap-1 animate-bounce"
              style={{ whiteSpace: 'nowrap', backgroundColor: accentHex }}
            >
              {badge.icon}
              <span>{badge.text}</span>
              <div
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px]"
                style={{ borderTopColor: accentHex }}
              />
            </div>
          )}
          <div className={`absolute h-8 w-8 rounded-full ${pulseClass}`} />
          <img
            src="/truck_3d_orange_transparent.png"
            alt=""
            className="h-9 w-9 object-contain"
            style={{ filter: truckFilter }}
          />
        </div>
      </div>
    </div>
  );
}

export default KpiRouteFooter;
