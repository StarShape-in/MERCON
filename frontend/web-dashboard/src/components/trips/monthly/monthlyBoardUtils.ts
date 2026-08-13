import type { MonthlyBoardTrip } from '@/services/tripService';

/** Current month as YYYY-MM, from local time — the board's default. */
export const currentMonthKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

/** Shift a YYYY-MM key by whole months. */
export const shiftMonth = (month: string, delta: number): string => {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(year, monthNumber - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export const monthLabel = (month: string): string => {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Date(year, monthNumber - 1, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Months for the dropdown picker: a year back (contract history) through a
 * few months ahead (forward planning), newest first, current month included
 * even if the range math ever drifts.
 */
export const monthOptions = (
  centerMonth: string = currentMonthKey(),
  monthsBack = 12,
  monthsForward = 3,
): { value: string; label: string }[] => {
  const months: string[] = [];
  for (let i = monthsForward; i >= -monthsBack; i -= 1) {
    months.push(shiftMonth(centerMonth, i));
  }
  return months.map((value) => ({ value, label: monthLabel(value) }));
};

/** "Fri, 14 Aug" — the table's date cell. */
export const formatDayHeading = (isoDay: string): string => {
  const [year, month, day] = isoDay.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
};

/** Planned arrival time, or an em dash when the trip was never scheduled. */
export const formatTime = (iso: string | null): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

/** Two-letter chip, the same convention UserChip uses for people. */
export const initialsOf = (name: string): string =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '—';

export const formatMoney = (value: number, currency = 'SAR'): string =>
  `${currency} ${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

/** A trip is only covered when both a driver and a truck are on it. */
export const isUnassigned = (trip: MonthlyBoardTrip): boolean => !trip.driver || !trip.vehicle;
