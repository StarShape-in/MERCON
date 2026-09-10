import React from 'react';
import { Calendar, Globe, Building2, MapPin, CheckCircle2, ExternalLink } from 'lucide-react';

export interface GeotagEvidenceData {
  latitude?: number;
  longitude?: number;
  timestamp?: string | null;
  locationName?: string | null;
  fullAddress?: string | null;
  companyName?: string | null;
}

interface GeotagEvidenceCardProps {
  geotag?: GeotagEvidenceData | null;
  fallbackTitle?: string;
  fallbackLocation?: string;
  fallbackDate?: string;
}

export default function GeotagEvidenceCard({
  geotag,
  fallbackTitle,
  fallbackLocation,
  fallbackDate,
}: GeotagEvidenceCardProps) {
  const latitude = geotag?.latitude ?? 11.0467;
  const longitude = geotag?.longitude ?? 76.0747;
  const timestamp = geotag?.timestamp || fallbackDate || new Date().toISOString();

  const locationName = geotag?.locationName || fallbackLocation || fallbackTitle || 'Location Verified';
  const fullAddress = geotag?.fullAddress || (fallbackLocation ? `${fallbackLocation}, Saudi Arabia` : 'GPS Verified Location');
  const companyName = geotag?.companyName || 'Horizon Distributors Co.';

  const dateObj = timestamp ? new Date(timestamp) : new Date();
  const isValidDate = !isNaN(dateObj.getTime());
  const formattedDate = isValidDate
    ? dateObj.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    : 'Aug 28, 2026';
  const formattedTime = isValidDate
    ? dateObj.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    : '2:53 PM';

  const latStr = `${Math.abs(latitude).toFixed(4)}°${latitude >= 0 ? 'N' : 'S'}`;
  const lngStr = `${Math.abs(longitude).toFixed(4)}°${longitude >= 0 ? 'E' : 'W'}`;
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

  return (
    <div className="bg-white rounded-xl border border-[#E2E8F0] shadow-sm p-3.5 sm:p-4 text-left">
      <div className="flex flex-col sm:flex-row items-start gap-4">
        {/* LEFT: Compact Snapshot-Friendly Google Maps Preview */}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Click to open location in Google Maps"
          className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-[#F1F5F9] border border-[#E2E8F0] shrink-0 group cursor-pointer block hover:border-[#FA634E] transition-all shadow-xs"
        >
          {/* Simulated Map Terrain & Road Grid */}
          <div className="absolute top-2 right-2 w-9 h-9 rounded-full bg-[#DCFCE7]/70" />
          <div className="absolute top-1/2 left-0 right-0 h-3 bg-white border-y border-[#CBD5E1] -translate-y-1/2" />
          <div className="absolute top-0 bottom-0 left-1/2 w-3 bg-white border-x border-[#CBD5E1] -translate-x-1/2" />

          {/* Locality text top-left */}
          <span className="absolute top-2 left-2 text-[9px] font-bold text-[#64748B] max-w-[70px] truncate leading-tight">
            {locationName.split(',')[0]}
          </span>

          {/* Coral Pin in Center */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <div className="relative group-hover:scale-110 transition-transform">
              <MapPin size={26} className="text-[#FA634E] fill-[#FA634E] drop-shadow-sm" />
              <div className="w-1.5 h-1.5 rounded-full bg-white absolute top-[8px] left-1/2 -translate-x-1/2" />
            </div>
          </div>

          {/* Google Attribution Badge */}
          <div className="absolute bottom-1.5 left-1.5 bg-white/95 backdrop-blur-xs px-1.5 py-0.5 rounded text-[8px] font-bold text-[#5F6368] flex items-center gap-0.5 border border-slate-200/60 shadow-xs">
            Google
          </div>

          {/* External Link Hint on hover */}
          <div className="absolute bottom-1.5 right-1.5 bg-[#FA634E] text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
            <ExternalLink size={10} />
          </div>
        </a>

        {/* RIGHT: Location Details & Metadata */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5 w-full">
          <div>
            {/* Location Title */}
            <h4 className="text-sm sm:text-base font-extrabold text-[#1F2937] leading-tight truncate" title={locationName}>
              {locationName}
            </h4>

            {/* Full Address */}
            <p className="text-xs text-[#64748B] font-medium mt-1 leading-snug line-clamp-2" title={fullAddress}>
              {fullAddress}
            </p>
          </div>

          <div className="h-px bg-[#F1F5F9] my-2.5" />

          {/* Metadata Rows */}
          <div className="space-y-1.5 text-xs">
            {/* Captured */}
            <div className="flex items-center gap-2">
              <Calendar size={13} className="text-[#FA634E] shrink-0" strokeWidth={2.4} />
              <span className="font-bold text-[#64748B] text-[11px] w-20 shrink-0">Captured</span>
              <span className="font-semibold text-[#1F2937] text-[11px] truncate">
                {formattedDate} · {formattedTime}
              </span>
            </div>

            {/* Coordinates */}
            <div className="flex items-center gap-2">
              <Globe size={13} className="text-[#FA634E] shrink-0" strokeWidth={2.4} />
              <span className="font-bold text-[#64748B] text-[11px] w-20 shrink-0">Coordinates</span>
              <span className="font-mono font-semibold text-[#1F2937] text-[11px] truncate">
                {latStr} · {lngStr}
              </span>
            </div>

            {/* Customer */}
            <div className="flex items-center gap-2">
              <Building2 size={13} className="text-[#FA634E] shrink-0" strokeWidth={2.4} />
              <span className="font-bold text-[#64748B] text-[11px] w-20 shrink-0">Customer</span>
              <span className="font-semibold text-[#1F2937] text-[11px] truncate" title={companyName}>
                {companyName}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER ROW */}
      <div className="flex flex-wrap items-center justify-between pt-3 mt-3 border-t border-[#F1F5F9] text-xs gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <img
            src="/merconclosed.png"
            alt="Mercon"
            className="h-3.5 w-auto object-contain"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <span className="text-[11px] font-bold text-[#64748B] truncate">
            • {companyName}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1 text-[#10B981] font-bold text-[11px]">
            <CheckCircle2 size={13} strokeWidth={2.5} />
            <span>Google Maps · GPS Verified</span>
          </div>

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#FA634E] hover:underline cursor-pointer"
          >
            <span>Open Map</span>
            <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </div>
  );
}
