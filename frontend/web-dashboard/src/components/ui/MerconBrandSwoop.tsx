import React from 'react';

interface MerconBrandSwoopProps {
  className?: string;
  height?: number;
  bg?: string;
}

/**
 * MERCON Signature Tri-Color Swoop Ribbon Accent
 * Brand Palette:
 * - Coral Red: #FA634E
 * - Dark Charcoal: #3E3C3D
 * - Light Cool Gray: #EEF1F6
 */
export function MerconBrandSwoop({ className = '', height = 16, bg = 'transparent' }: MerconBrandSwoopProps) {
  return (
    <div className={`w-full overflow-hidden select-none shrink-0 relative ${className}`} style={{ height, backgroundColor: bg }}>
      <svg viewBox="0 0 400 24" preserveAspectRatio="none" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Layer 3: Light Cool Gray (#EEF1F6) */}
        <path d="M0 0 H360 C375 0 385 24 400 24 H0 Z" fill="#EEF1F6" />
        {/* Layer 2: Dark Charcoal (#3E3C3D) */}
        <path d="M0 0 H280 C298 0 310 24 330 24 H0 Z" fill="#3E3C3D" />
        {/* Layer 1: Coral Red (#FA634E) */}
        <path d="M0 0 H200 C220 0 235 24 255 24 H0 Z" fill="#FA634E" />
      </svg>
    </div>
  );
}

export default MerconBrandSwoop;
