import { parseISO, isValid } from 'date-fns';
import { formatInDeploymentTz } from '@/lib/datetime';

const DEFAULT_TZ = 'Asia/Riyadh';

export interface ScheduledTripInfo {
  id: string;
  ref_id?: string | null;
  status?: string | null;
  planned_start?: string | null;
  createdAt?: string | null;
}

export interface ScheduledDateChip {
  rawDate: string;
  formattedDate: string;
  tripId?: string;
  tripRef?: string;
  status?: string;
}

/**
 * Returns formatted date strings (e.g. ['Aug 15', 'Aug 18']) for active/scheduled trips.
 */
export function getUpcomingScheduledDates(trips?: ScheduledTripInfo[] | null, tz: string = DEFAULT_TZ): ScheduledDateChip[] {
  if (!trips || !Array.isArray(trips)) return [];

  const results: ScheduledDateChip[] = [];
  const seenDates = new Set<string>();

  // Filter non-completed, non-cancelled trips
  const activeTrips = trips.filter((t) => {
    const s = t.status?.toLowerCase() || '';
    return s !== 'completed' && s !== 'invoiced' && s !== 'cancelled';
  });

  for (const trip of activeTrips) {
    const dateStr = trip.planned_start || trip.createdAt;
    if (!dateStr) continue;

    try {
      const parsed = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
      if (!isValid(parsed)) continue;

      const ymd = formatInDeploymentTz(parsed, tz, 'yyyy-MM-dd');
      if (seenDates.has(ymd)) continue;
      seenDates.add(ymd);

      results.push({
        rawDate: ymd,
        formattedDate: formatInDeploymentTz(parsed, tz, 'MMM d'),
        tripId: trip.id,
        tripRef: trip.ref_id || trip.id,
        status: trip.status || undefined,
      });
    } catch (e) {
      // skip invalid dates
    }
  }

  return results;
}

/**
 * Check if a driver or vehicle has a trip scheduled on a given date (YYYY-MM-DD or ISO string).
 */
export function isScheduledOnDate(trips: ScheduledTripInfo[] | null | undefined, targetDateIso: string, tz: string = DEFAULT_TZ): boolean {
  if (!trips || !Array.isArray(trips) || !targetDateIso) return false;

  let targetYmd = '';
  try {
    const parsedTarget = typeof targetDateIso === 'string' ? parseISO(targetDateIso) : new Date(targetDateIso);
    if (isValid(parsedTarget)) {
      targetYmd = formatInDeploymentTz(parsedTarget, tz, 'yyyy-MM-dd');
    } else {
      targetYmd = targetDateIso.split('T')[0];
    }
  } catch {
    targetYmd = targetDateIso.split('T')[0];
  }

  if (!targetYmd) return false;

  return trips.some((t) => {
    const s = t.status?.toLowerCase() || '';
    if (s === 'completed' || s === 'invoiced' || s === 'cancelled') return false;

    const dateStr = t.planned_start || t.createdAt;
    if (!dateStr) return false;

    try {
      const parsed = parseISO(dateStr);
      if (isValid(parsed)) {
        return formatInDeploymentTz(parsed, tz, 'yyyy-MM-dd') === targetYmd;
      }
    } catch {
      // fall back to string matching
    }
    return dateStr.startsWith(targetYmd);
  });
}
