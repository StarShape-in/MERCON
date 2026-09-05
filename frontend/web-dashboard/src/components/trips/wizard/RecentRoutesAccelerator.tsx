import React from 'react';
import { RotateCcw, ArrowRight } from 'lucide-react';

interface RecentRoutesAcceleratorProps {
  recentRoutesList: any[];
  handleApplyRecentRoute: (route: any) => void;
}

export const RecentRoutesAccelerator: React.FC<RecentRoutesAcceleratorProps> = ({
  recentRoutesList,
  handleApplyRecentRoute,
}) => {
  if (!recentRoutesList || recentRoutesList.length === 0) return null;

  return (
    <div className="space-y-1.5 p-2 rounded-xl bg-orange-50/30 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/40">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-extrabold text-orange-900 dark:text-orange-300 uppercase tracking-wider flex items-center gap-1.5">
          <RotateCcw className="w-3.5 h-3.5 text-brand" /> RECENTLY USED ROUTES
        </span>
        <span className="text-[10px] font-semibold text-slate-400">Click to populate route</span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {recentRoutesList.map((route, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleApplyRecentRoute(route)}
            className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-orange-200 dark:border-orange-900 text-xs font-bold text-slate-800 dark:text-slate-200 hover:border-brand hover:text-brand transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
          >
            <span>{route.origin}</span>
            <ArrowRight className="w-3 h-3 text-brand shrink-0" />
            <span>{route.destination}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
