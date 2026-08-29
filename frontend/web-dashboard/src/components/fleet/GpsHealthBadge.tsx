import React from 'react';
import { getGpsHealthInfo } from '@/utils/gpsHealth';
import { Radio, WifiOff, AlertTriangle, ShieldAlert, Cpu } from 'lucide-react';

interface GpsHealthBadgeProps {
  vehicle?: {
    icces_device_id?: string | null;
    last_seen_at?: string | Date | null;
    last_lat?: number | null;
    last_lng?: number | null;
    last_speed_kph?: number | null;
    last_status?: string | null;
  } | null;
  showDeviceId?: boolean;
  showTimeAgo?: boolean;
  compact?: boolean;
  className?: string;
}

export const GpsHealthBadge: React.FC<GpsHealthBadgeProps> = ({
  vehicle,
  showDeviceId = true,
  showTimeAgo = true,
  compact = false,
  className = '',
}) => {
  const health = getGpsHealthInfo(vehicle);

  const getIcon = () => {
    switch (health.state) {
      case 'ACTIVE':
        return <Radio className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />;
      case 'STALE':
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />;
      case 'OFFLINE':
        return <WifiOff className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />;
      case 'UNREPORTED':
        return <ShieldAlert className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />;
      case 'NOT_CONNECTED':
      default:
        return <Cpu className="w-3.5 h-3.5 text-slate-400 shrink-0" />;
    }
  };

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-bold ${health.badgeClass} ${className}`}
        title={`${health.details} (${health.formattedLastSeen})`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${health.dotClass} shrink-0`} />
        <span>{health.label}</span>
        {showTimeAgo && health.timeAgoText !== '—' && (
          <span className="opacity-80 font-mono text-[10px]">({health.timeAgoText})</span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs font-semibold ${health.badgeClass} ${className}`}
      title={`${health.details} (${health.formattedLastSeen})`}
    >
      <span className={`w-2 h-2 rounded-full ${health.dotClass} shrink-0`} />
      {getIcon()}
      <div className="flex items-center gap-1.5">
        <span className="font-bold">{health.label}</span>
        {showDeviceId && health.iccesDeviceId && (
          <span className="font-mono text-[11px] opacity-75">[{health.iccesDeviceId}]</span>
        )}
        {showTimeAgo && health.timeAgoText !== '—' && (
          <span className="text-[11px] font-mono opacity-80 border-l border-current/20 pl-1.5">
            {health.timeAgoText}
          </span>
        )}
      </div>
    </div>
  );
};

export default GpsHealthBadge;
