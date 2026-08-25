import { BulkImportTripRow, TripStatus } from '@/services/tripService';

export interface PastDateAnalysis {
  hasPastTrips: boolean;
  totalTripsCount: number;
  pastTripsCount: number;
  hasOnlyYesterday: boolean;
  hasOlderThanYesterday: boolean;
  oldestPastDate: string | null;
  samplePastDate: string | null;
}

/**
 * Returns today's date at 00:00:00 in local timezone.
 */
export function getTodayStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Parses a date string (YYYY-MM-DD or ISO string) into a Date object at 00:00:00 local time.
 */
export function parseDateStart(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const rawDateStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.slice(0, 10);
  const parts = rawDateStr.split('-');
  if (parts.length !== 3) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return new Date(year, month, day);
}

/**
 * Checks if a date string is strictly before today (local timezone).
 */
export function isDateInPast(dateStr?: string | null): boolean {
  const d = parseDateStart(dateStr);
  if (!d) return false;
  const today = getTodayStart();
  return d.getTime() < today.getTime();
}

/**
 * Analyzes a set of trip rows to detect past dates and determine allowable status choices.
 */
export function analyzePastDateRows(rows: BulkImportTripRow[]): PastDateAnalysis {
  const today = getTodayStart();
  const oneDayMs = 24 * 60 * 60 * 1000;
  const yesterday = new Date(today.getTime() - oneDayMs);

  let pastTripsCount = 0;
  let hasOnlyYesterday = true;
  let hasOlderThanYesterday = false;
  let oldestTime: number | null = null;
  let oldestDateStr: string | null = null;
  let samplePastDateStr: string | null = null;

  rows.forEach((row) => {
    const dateVal = row.planned_start || row.date;
    const d = parseDateStart(dateVal);
    if (!d) return;

    if (d.getTime() < today.getTime()) {
      pastTripsCount++;
      const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!samplePastDateStr) samplePastDateStr = formatted;

      if (oldestTime === null || d.getTime() < oldestTime) {
        oldestTime = d.getTime();
        oldestDateStr = formatted;
      }

      // Check if older than yesterday (strictly before yesterday's start)
      if (d.getTime() < yesterday.getTime()) {
        hasOlderThanYesterday = true;
        hasOnlyYesterday = false;
      }
    }
  });

  return {
    hasPastTrips: pastTripsCount > 0,
    totalTripsCount: rows.length,
    pastTripsCount,
    hasOnlyYesterday: pastTripsCount > 0 && hasOnlyYesterday,
    hasOlderThanYesterday,
    oldestPastDate: oldestDateStr,
    samplePastDate: samplePastDateStr,
  };
}

/**
 * Overrides status on rows that have past dates to the specified selected status.
 * Ensures past date trips are never left as 'Scheduled'.
 */
export function applyPastStatusToRows(
  rows: BulkImportTripRow[],
  targetStatus: TripStatus = 'Completed'
): BulkImportTripRow[] {
  const today = getTodayStart();

  return rows.map((row) => {
    const dateVal = row.planned_start || row.date;
    const d = parseDateStart(dateVal);
    if (d && d.getTime() < today.getTime()) {
      // Past date trips cannot be Scheduled. If status is Scheduled or Draft or unset, change to targetStatus
      if (!row.status || row.status === 'Scheduled' || row.status === 'Draft' || row.status?.toLowerCase() === 'scheduled') {
        return {
          ...row,
          status: targetStatus,
        };
      }
    }
    return row;
  });
}
