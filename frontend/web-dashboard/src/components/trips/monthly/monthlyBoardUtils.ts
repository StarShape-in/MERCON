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

/** Days in the month, as local Date objects — the calendar grid's spine. */
export const daysInMonth = (month: string): Date[] => {
  const [year, monthNumber] = month.split('-').map(Number);
  const total = new Date(year, monthNumber, 0).getDate();
  return Array.from({ length: total }, (_, i) => new Date(year, monthNumber - 1, i + 1));
};

/** Local YYYY-MM-DD. Never toISOString() — that shifts the day across UTC. */
export const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const isToday = (date: Date): boolean => dayKey(date) === dayKey(new Date());

/** "Fri, 14 Aug" — the schedule view's day heading. */
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

/**
 * Colour a company by its own name so the same company keeps its colour
 * across months and reloads — a random or index-based hue would not.
 */
export const COMPANY_HUES = [
  { chip: 'bg-blue-100 text-blue-700', rail: 'bg-blue-500', tint: 'bg-blue-50/60' },
  { chip: 'bg-emerald-100 text-emerald-700', rail: 'bg-emerald-500', tint: 'bg-emerald-50/60' },
  { chip: 'bg-purple-100 text-purple-700', rail: 'bg-purple-500', tint: 'bg-purple-50/60' },
  { chip: 'bg-amber-100 text-amber-700', rail: 'bg-amber-500', tint: 'bg-amber-50/60' },
  { chip: 'bg-rose-100 text-rose-700', rail: 'bg-rose-500', tint: 'bg-rose-50/60' },
  { chip: 'bg-teal-100 text-teal-700', rail: 'bg-teal-500', tint: 'bg-teal-50/60' },
  { chip: 'bg-indigo-100 text-indigo-700', rail: 'bg-indigo-500', tint: 'bg-indigo-50/60' },
] as const;

export const companyHue = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return COMPANY_HUES[hash % COMPANY_HUES.length];
};

/** Status → the dot colour used on calendar chips, matching StatusBadge. */
export const STATUS_DOT: Record<string, string> = {
  Draft: 'bg-slate-400',
  Dispatched: 'bg-blue-500',
  AtPickup: 'bg-purple-500',
  InTransit: 'bg-amber-500',
  AtDelivery: 'bg-indigo-500',
  Completed: 'bg-emerald-500',
  Invoiced: 'bg-teal-500',
  Cancelled: 'bg-rose-500',
};
