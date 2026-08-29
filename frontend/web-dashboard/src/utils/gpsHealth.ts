export type GpsHealthState = 'ACTIVE' | 'STALE' | 'OFFLINE' | 'UNREPORTED' | 'NOT_CONNECTED';

export interface GpsHealthInfo {
  state: GpsHealthState;
  label: string;
  badgeClass: string;
  dotClass: string;
  timeAgoText: string;
  formattedLastSeen: string;
  iccesDeviceId: string | null;
  details: string;
}

/** Thresholds in milliseconds */
const TWO_MINUTES_MS = 2 * 60 * 1000;
const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

export function formatTimeAgo(dateStr: string | Date | null | undefined, now: Date = new Date()): string {
  if (!dateStr) return '—';
  const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  const diffMs = now.getTime() - date.getTime();
  if (isNaN(diffMs) || diffMs < 0) return 'Just now';

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function getGpsHealthInfo(
  vehicle: {
    icces_device_id?: string | null;
    last_seen_at?: string | Date | null;
    last_lat?: number | null;
    last_lng?: number | null;
    last_speed_kph?: number | null;
    last_status?: string | null;
  } | null | undefined,
  now: Date = new Date()
): GpsHealthInfo {
  const deviceId = vehicle?.icces_device_id?.trim() || null;

  // 1. Not Connected
  if (!deviceId) {
    return {
      state: 'NOT_CONNECTED',
      label: 'Not Connected',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
      dotClass: 'bg-slate-400',
      timeAgoText: '—',
      formattedLastSeen: 'No physical GPS tracker assigned',
      iccesDeviceId: null,
      details: 'This vehicle has no physical GPS tracker assigned in MERCON.',
    };
  }

  const lastSeenStr = vehicle?.last_seen_at;
  const hasCoordinates = vehicle?.last_lat != null && vehicle?.last_lng != null;

  // 2. Unreported / Never Seen
  if (!lastSeenStr || !hasCoordinates) {
    return {
      state: 'UNREPORTED',
      label: 'Never Reported',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800',
      dotClass: 'bg-amber-400',
      timeAgoText: 'Never',
      formattedLastSeen: 'No telemetry received yet',
      iccesDeviceId: deviceId,
      details: `Tracker ${deviceId} is assigned but has not reported telemetry to MERCON yet.`,
    };
  }

  const lastSeenDate = typeof lastSeenStr === 'string' ? new Date(lastSeenStr) : lastSeenStr;
  const ageMs = now.getTime() - lastSeenDate.getTime();
  const timeAgoText = formatTimeAgo(lastSeenDate, now);
  const formattedLastSeen = lastSeenDate.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'medium',
  });

  // 3. GPS Active (< 2 minutes)
  if (ageMs <= TWO_MINUTES_MS) {
    return {
      state: 'ACTIVE',
      label: 'GPS Active',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
      dotClass: 'bg-emerald-500 animate-pulse',
      timeAgoText,
      formattedLastSeen,
      iccesDeviceId: deviceId,
      details: `Tracker ${deviceId} is actively reporting location data (last updated ${timeAgoText}).`,
    };
  }

  // 4. GPS Stale (2 - 15 minutes)
  if (ageMs <= FIFTEEN_MINUTES_MS) {
    return {
      state: 'STALE',
      label: 'GPS Stale',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
      dotClass: 'bg-amber-500',
      timeAgoText,
      formattedLastSeen,
      iccesDeviceId: deviceId,
      details: `Tracker ${deviceId} hasn't updated in ${timeAgoText}.`,
    };
  }

  // 5. GPS Offline (> 15 minutes)
  return {
    state: 'OFFLINE',
    label: 'GPS Offline',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
    dotClass: 'bg-rose-500',
    timeAgoText,
    formattedLastSeen,
    iccesDeviceId: deviceId,
    details: `Tracker ${deviceId} has been offline for ${timeAgoText} (last seen ${formattedLastSeen}).`,
  };
}
