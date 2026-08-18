/**
 * Central timezone-aware date helpers. Every DateTime column in the DB is
 * @db.Timestamptz (UTC) — this file is the only place that should convert
 * between that UTC storage and the deployment's configured display timezone
 * (Settings.timezone, default "Asia/Riyadh"). Components should format dates
 * via `formatInDeploymentTz` / `useDeploymentTimezone` rather than calling
 * date-fns `format()` or `toLocaleString()` directly on API-sourced dates,
 * since those implicitly use the browser's local timezone instead.
 */
import { useQuery } from '@tanstack/react-query';
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { settingsService } from '@/services/settingsService';

const DEFAULT_TZ = 'Asia/Riyadh';

/** The deployment's configured display timezone, cached via react-query alongside branding. */
export function useDeploymentTimezone(): string {
  const { data } = useQuery({
    queryKey: ['settings', 'public'],
    queryFn: settingsService.getPublic,
    staleTime: 5 * 60 * 1000,
  });
  return data?.timezone || DEFAULT_TZ;
}

/** Formats a UTC ISO string / Date in the given IANA timezone (date-fns `format` tokens). */
export function formatInDeploymentTz(date: string | Date, tz: string, formatStr: string): string {
  return formatInTimeZone(date, tz, formatStr);
}

/**
 * Converts a UTC ISO string / Date to a "wall clock" JS Date matching the
 * given timezone, for feeding into components (e.g. date pickers) that
 * render whatever local time a plain Date carries.
 */
export function toZonedDisplay(date: string | Date, tz: string): Date {
  return toZonedTime(date, tz);
}

/**
 * Converts a "wall clock" Date entered by the user (assumed to represent a
 * moment in the given timezone) back to a real UTC Date, for sending to the
 * API. Use this in date/time pickers before submitting planned_start,
 * actual_arrival, issue_date, etc.
 */
export function zonedInputToUtc(date: Date, tz: string): Date {
  return fromZonedTime(date, tz);
}
