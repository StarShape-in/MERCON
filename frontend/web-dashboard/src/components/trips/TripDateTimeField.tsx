import { format, parseISO, isValid, addHours, setHours, setMinutes, isToday, isTomorrow } from 'date-fns';
import { Clock, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

function toLocalInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export interface TripDateTimeFieldProps {
  label: string;
  value: string; // YYYY-MM-DDTHH:mm
  onChange: (value: string) => void;
}

/**
 * Single-row date+time entry: one native picker plus a few quick chips.
 * Replaces `TripScheduleSelector`'s full calendar/time-slot widget for
 * Create Trip's Truck Arrival Time — the only manually-typed time left in
 * the workflow.
 */
export default function TripDateTimeField({ label, value, onChange }: TripDateTimeFieldProps) {
  const dateObj = value ? parseISO(value) : null;
  const isSet = !!dateObj && isValid(dateObj);

  const relativeText = isSet
    ? isToday(dateObj as Date)
      ? `Today, ${format(dateObj as Date, 'h:mm a')}`
      : isTomorrow(dateObj as Date)
      ? `Tomorrow, ${format(dateObj as Date, 'h:mm a')}`
      : format(dateObj as Date, 'EEE, MMM d · h:mm a')
    : null;

  const applyPreset = (target: Date) => onChange(toLocalInput(target));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-brand" /> {label} <span className="text-rose-500">*</span>
        </span>
        {relativeText && (
          <Badge className="bg-orange-50 text-brand dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 text-[10px] font-bold px-2 py-0.5">
            {relativeText}
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <div className="relative flex-1 min-w-[190px]">
          <Input
            type="datetime-local"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              'h-10 rounded-xl text-xs font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 focus-visible:ring-brand/20 focus-visible:border-brand',
              !isSet && 'text-slate-400'
            )}
          />
          {isSet && (
            <button
              type="button"
              onClick={() => onChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
              title="Clear"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => applyPreset(setMinutes(setHours(new Date(), new Date().getHours() + 1), 0))}
          className="h-9 px-2.5 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
        >
          In 1h
        </button>
        <button
          type="button"
          onClick={() => applyPreset(setMinutes(setHours(addHours(new Date(), 24), 8), 0))}
          className="h-9 px-2.5 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
        >
          Tomorrow 8AM
        </button>
      </div>
    </div>
  );
}
