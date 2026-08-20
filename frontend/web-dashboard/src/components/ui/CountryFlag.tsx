import React from 'react';

interface CountryFlagProps {
  code: string; // ISO country code e.g. 'SA', 'AE', 'KW'
  className?: string;
  alt?: string;
}

/**
 * CountryFlag renders high-definition SVG/PNG flag images for country codes.
 * Ensures crisp, real flag graphic icons on Windows, macOS, Android, and iOS
 * (bypassing Windows font engine issue where regional indicator emojis show up as text letters like "SA").
 */
export const CountryFlag: React.FC<CountryFlagProps> = ({ code = 'SA', className = 'w-4.5 h-3', alt = '' }) => {
  const cleanCode = (code || 'SA').toLowerCase();
  
  return (
    <img
      src={`https://flagcdn.com/w40/${cleanCode}.png`}
      srcSet={`https://flagcdn.com/w80/${cleanCode}.png 2x`}
      width="18"
      height="12"
      alt={alt || `${code} Flag`}
      className={`inline-block object-cover rounded-[2px] shadow-2xs shrink-0 border border-slate-200/80 dark:border-slate-700/80 ${className}`}
      loading="lazy"
    />
  );
};

export default CountryFlag;
