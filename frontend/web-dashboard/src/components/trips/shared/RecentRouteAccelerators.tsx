import React from 'react';
import { RotateCcw, MapPin } from 'lucide-react';

export interface RecentRouteItem {
  key: string;
  origin: string;
  originLocationId: string | null;
  originLat?: number | null;
  originLng?: number | null;
  destination: string;
  destinationLocationId: string | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  stopsCount: number;
  count: number;
  lastUsedDate: Date;
  formattedLastUsed: string;
}

interface RecentRouteAcceleratorsProps {
  recentRoutesList: RecentRouteItem[];
  onApplyRecentRoute: (route: RecentRouteItem) => void;
}

export const RecentRouteAccelerators: React.FC<RecentRouteAcceleratorsProps> = ({
  recentRoutesList,
  onApplyRecentRoute,
}) => {
  if (!recentRoutesList || recentRoutesList.length === 0) return null;

  return (
    <div className="p-2.5 rounded-xl bg-[#EEF1F6]/70 border border-slate-200/80 space-y-1.5 animate-fade-in mb-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-extrabold text-[#3E3C3D] uppercase tracking-wider flex items-center gap-1.5">
          <RotateCcw className="w-3 h-3 text-[#FA634E]" />
          RECENT ROUTES
        </span>
        <span className="text-[10px] font-bold text-[#6E6E80]">Click to prefill lane stops</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
        {recentRoutesList.map((route) => (
          <button
            key={route.key}
            type="button"
            onClick={() => onApplyRecentRoute(route)}
            className="p-2 rounded-xl bg-white border border-slate-200/90 hover:border-[#FA634E] hover:bg-orange-50/40 transition-all text-left group shadow-2xs cursor-pointer flex flex-col justify-between"
          >
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#FA634E] shrink-0" />
              <span className="text-xs font-extrabold text-[#3E3C3D] group-hover:text-[#FA634E] truncate">
                {route.origin} → {route.destination}
              </span>
            </div>
            <p className="text-[10px] font-semibold text-[#6E6E80] mt-1">
              {route.stopsCount} Stops · Used {route.count} {route.count === 1 ? 'time' : 'times'} · {route.formattedLastUsed}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default RecentRouteAccelerators;
