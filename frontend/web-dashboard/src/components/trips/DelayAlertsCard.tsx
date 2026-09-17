import React from 'react';
import { AlertTriangle, ChevronRight, CheckCircle2 } from 'lucide-react';

interface DelayAlertsCardProps {
  alerts?: any[];
  onViewAll?: () => void;
}

export default function DelayAlertsCard({ alerts = [], onViewAll }: DelayAlertsCardProps) {
  const hasAlerts = alerts && alerts.length > 0;

  return (
    <div className="w-full h-full bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] px-4 py-2.5 flex flex-col justify-between overflow-hidden">
      {/* Header Row */}
      <div className="flex items-center justify-between pb-1.5 border-b border-[#F3F4F6] shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-md bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
            <AlertTriangle size={13} />
          </div>
          <h3 className="font-bold text-[12.5px] text-[#1F2937]">Delay Alerts</h3>
          {hasAlerts && (
            <span className="w-4 h-4 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center">
              {alerts.length}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onViewAll}
          className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-0.5 cursor-pointer"
        >
          <span>View All</span>
          <ChevronRight size={12} />
        </button>
      </div>

      {/* Alerts List */}
      <div className="space-y-1.5 pt-1">
        {hasAlerts ? (
          alerts.slice(0, 3).map((alert) => (
            <div
              key={alert.id}
              className="flex items-center justify-between text-[11px] leading-tight"
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    alert.severe ? 'bg-rose-500' : 'bg-amber-500'
                  }`}
                />
                <span className="font-medium text-[#374151] truncate max-w-[150px]">
                  {alert.label}
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`font-mono font-bold ${
                    alert.severe ? 'text-rose-600' : 'text-amber-600'
                  }`}
                >
                  {alert.delay}
                </span>
                <span className="font-mono text-[10px] text-[#6B7280]">
                  {alert.time}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="flex items-center gap-2 py-1 text-emerald-600 text-xs">
            <CheckCircle2 size={14} />
            <span className="font-medium">No active delays. All stops on schedule.</span>
          </div>
        )}
      </div>
    </div>
  );
}
