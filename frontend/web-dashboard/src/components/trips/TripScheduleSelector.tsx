import React, { useMemo, useState } from 'react';
import {
  format,
  parseISO,
  isValid,
  addDays,
  addHours,
  setHours,
  setMinutes,
  isToday,
  isTomorrow,
  formatDistanceToNow,
  isBefore,
} from 'date-fns';
import {
  Calendar as CalendarIcon,
  Clock,
  Check,
  Sparkles,
  ChevronDown,
  AlertCircle,
  X,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

export interface TripScheduleSelectorProps {
  tone: 'pickup' | 'dropoff';
  label: string;
  value: string; // ISO string format YYYY-MM-DDTHH:mm
  onChange: (isoString: string) => void;
  placeholder?: string;
  minDate?: Date;
  error?: boolean;
  errorMessage?: string;
  onApplyOffset?: (hours: number, setEod?: boolean) => void;
  className?: string;
}

export function TripScheduleSelector({
  tone,
  label,
  value,
  onChange,
  placeholder = 'Select date and time...',
  minDate,
  error = false,
  errorMessage,
  onApplyOffset,
  className,
}: TripScheduleSelectorProps) {
  const isPickup = tone === 'pickup';
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Parse ISO string to Date object
  const dateObj = useMemo<Date | null>(() => {
    if (!value || !value.trim()) return null;
    const d = parseISO(value);
    return isValid(d) ? d : null;
  }, [value]);

  // Format Helper: Emit ISO string YYYY-MM-DDTHH:mm
  const emitDateTime = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    onChange(`${y}-${m}-${day}T${h}:${mins}`);
  };

  // Quick Date Handlers
  const handleSelectDatePreset = (daysOffset: number) => {
    const now = new Date();
    const targetDate = addDays(now, daysOffset);
    const currentHours = dateObj ? dateObj.getHours() : 9; // Default 09:00 AM
    const currentMinutes = dateObj ? dateObj.getMinutes() : 0;
    const updated = setMinutes(setHours(targetDate, currentHours), currentMinutes);
    emitDateTime(updated);
  };

  const handleCalendarSelect = (newDate: Date | undefined) => {
    if (!newDate) return;
    const currentHours = dateObj ? dateObj.getHours() : 9;
    const currentMinutes = dateObj ? dateObj.getMinutes() : 0;
    const updated = setMinutes(setHours(newDate, currentHours), currentMinutes);
    emitDateTime(updated);
    setCalendarOpen(false);
  };

  // Quick Time Handlers
  const handleTimeSlotSelect = (hours24: number, minutesVal: number) => {
    const baseDate = dateObj || new Date();
    const updated = setMinutes(setHours(baseDate, hours24), minutesVal);
    emitDateTime(updated);
  };

  // Time Slot Options
  const timeSlots = [
    { label: '08:00 AM', h: 8, m: 0, tag: 'Morning' },
    { label: '10:00 AM', h: 10, m: 0, tag: 'Mid-Morning' },
    { label: '12:00 PM', h: 12, m: 0, tag: 'Noon' },
    { label: '02:00 PM', h: 14, m: 0, tag: 'Afternoon' },
    { label: '04:00 PM', h: 16, m: 0, tag: 'Late Afternoon' },
    { label: '06:00 PM', h: 18, m: 0, tag: 'Evening' },
    { label: '08:00 PM', h: 20, m: 0, tag: 'Night' },
    { label: '11:59 PM', h: 23, m: 59, tag: 'End of Day' },
  ];

  // Relative Time Display Text
  const relativeText = useMemo(() => {
    if (!dateObj) return null;
    const now = new Date();
    if (isToday(dateObj)) {
      return `Today • ${format(dateObj, 'h:mm a')}`;
    }
    if (isTomorrow(dateObj)) {
      return `Tomorrow • ${format(dateObj, 'h:mm a')}`;
    }
    try {
      return formatDistanceToNow(dateObj, { addSuffix: true });
    } catch {
      return format(dateObj, 'MMM d, h:mm a');
    }
  }, [dateObj]);

  // Is Current Date Preset Selected?
  const activeDatePreset = useMemo(() => {
    if (!dateObj) return null;
    if (isToday(dateObj)) return 'today';
    if (isTomorrow(dateObj)) return 'tomorrow';
    const dayAfter = addDays(new Date(), 2);
    if (
      dateObj.getDate() === dayAfter.getDate() &&
      dateObj.getMonth() === dayAfter.getMonth() &&
      dateObj.getFullYear() === dayAfter.getFullYear()
    ) {
      return 'dayAfter';
    }
    return 'custom';
  }, [dateObj]);

  const currentHours = dateObj ? dateObj.getHours() : null;
  const currentMinutes = dateObj ? dateObj.getMinutes() : null;

  return (
    <div
      className={cn(
        'rounded-2xl border transition-all duration-200 overflow-hidden bg-card text-card-foreground shadow-2xs',
        isPickup
          ? 'border-emerald-200/80 dark:border-emerald-900/50 hover:border-emerald-300 dark:hover:border-emerald-800'
          : 'border-amber-200/80 dark:border-amber-900/50 hover:border-amber-300 dark:hover:border-amber-800',
        error && 'border-rose-400 ring-2 ring-rose-400/20 dark:border-rose-600',
        className
      )}
    >
      {/* Header Banner */}
      <div
        className={cn(
          'px-4 py-2.5 flex items-center justify-between border-b text-xs font-bold',
          isPickup
            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300'
            : 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/40 text-amber-900 dark:text-amber-300'
        )}
      >
        <div className="flex items-center gap-2">
          <div
            className={cn(
              'size-6 rounded-lg flex items-center justify-center text-white shadow-2xs',
              isPickup ? 'bg-emerald-600' : 'bg-[#E8450F]'
            )}
          >
            <Clock className="size-3.5" />
          </div>
          <span>{label}</span>
          <span className="text-rose-500 font-extrabold">*</span>
        </div>

        {dateObj && (
          <div className="flex items-center gap-2">
            <Badge
              className={cn(
                'text-[10px] font-extrabold px-2 py-0.5 border shadow-2xs',
                isPickup
                  ? 'bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 border-emerald-200'
                  : 'bg-amber-100 dark:bg-amber-900/80 text-amber-800 dark:text-amber-200 border-amber-200'
              )}
            >
              {relativeText}
            </Badge>
            <button
              type="button"
              onClick={() => onChange('')}
              className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-colors cursor-pointer"
              title="Clear time"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="p-3.5 space-y-3.5 bg-background">
        {/* Step 1: Select Date */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
            <span className="flex items-center gap-1 uppercase tracking-wider">
              <CalendarIcon className="size-3 text-primary" /> Step 1: Select Date
            </span>
            {dateObj && (
              <span className="text-foreground font-semibold">
                {format(dateObj, 'EEEE, MMM d, yyyy')}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {/* Quick Date Pills */}
            <button
              type="button"
              onClick={() => handleSelectDatePreset(0)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border cursor-pointer flex items-center gap-1.5',
                activeDatePreset === 'today'
                  ? isPickup
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-[#E8450F] text-white border-[#E8450F] shadow-2xs'
                  : 'bg-muted/40 hover:bg-muted text-foreground border-border'
              )}
            >
              Today
            </button>

            <button
              type="button"
              onClick={() => handleSelectDatePreset(1)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border cursor-pointer flex items-center gap-1.5',
                activeDatePreset === 'tomorrow'
                  ? isPickup
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-[#E8450F] text-white border-[#E8450F] shadow-2xs'
                  : 'bg-muted/40 hover:bg-muted text-foreground border-border'
              )}
            >
              Tomorrow
            </button>

            <button
              type="button"
              onClick={() => handleSelectDatePreset(2)}
              className={cn(
                'px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border cursor-pointer flex items-center gap-1.5',
                activeDatePreset === 'dayAfter'
                  ? isPickup
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-[#E8450F] text-white border-[#E8450F] shadow-2xs'
                  : 'bg-muted/40 hover:bg-muted text-foreground border-border'
              )}
            >
              In 2 Days
            </button>

            {/* Calendar Popover Picker for Specific Custom Date */}
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all border cursor-pointer flex items-center gap-1.5 ml-auto',
                    activeDatePreset === 'custom'
                      ? 'bg-primary text-primary-foreground border-primary shadow-2xs'
                      : 'bg-muted/40 hover:bg-muted text-foreground border-border'
                  )}
                >
                  <CalendarIcon className="size-3.5" />
                  <span>{activeDatePreset === 'custom' && dateObj ? format(dateObj, 'MMM d') : 'Pick Date'}</span>
                  <ChevronDown className="size-3 opacity-60" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-border bg-popover z-50" align="end">
                <Calendar
                  mode="single"
                  selected={dateObj || undefined}
                  onSelect={handleCalendarSelect}
                  disabled={(d) => (minDate ? d < new Date(minDate.setHours(0, 0, 0, 0)) : false)}
                  className="rounded-2xl p-3"
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Step 2: Select Time Slot or SLA Offset */}
        <div className="space-y-1.5 pt-1 border-t border-border/60">
          <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground">
            <span className="flex items-center gap-1 uppercase tracking-wider">
              <Clock className="size-3 text-primary" /> Step 2: Select Time Target
            </span>
            {dateObj && (
              <span className="text-primary font-bold font-mono">
                {format(dateObj, 'hh:mm a')}
              </span>
            )}
          </div>

          {/* Quick Time Slots */}
          <div className="grid grid-cols-4 sm:grid-cols-4 gap-1.5">
            {timeSlots.map((slot) => {
              const isSelected = currentHours === slot.h && currentMinutes === slot.m;
              return (
                <button
                  key={slot.label}
                  type="button"
                  onClick={() => handleTimeSlotSelect(slot.h, slot.m)}
                  className={cn(
                    'py-1.5 px-2 rounded-xl text-center transition-all border cursor-pointer flex flex-col items-center justify-center gap-0.5',
                    isSelected
                      ? isPickup
                        ? 'bg-emerald-600 text-white border-emerald-600 font-extrabold shadow-2xs'
                        : 'bg-[#E8450F] text-white border-[#E8450F] font-extrabold shadow-2xs'
                      : 'bg-muted/30 hover:bg-muted text-foreground border-border/80'
                  )}
                >
                  <span className="text-xs font-mono font-bold">{slot.label}</span>
                </button>
              );
            })}
          </div>

          {/* Custom Time Input & Quick SLA Offset Bar */}
          <div className="flex items-center justify-between gap-2 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-muted-foreground">Exact Time:</span>
              <input
                type="time"
                value={dateObj ? format(dateObj, 'HH:mm') : ''}
                onChange={(e) => {
                  if (!e.target.value) return;
                  const [hStr, mStr] = e.target.value.split(':');
                  handleTimeSlotSelect(parseInt(hStr, 10), parseInt(mStr, 10));
                }}
                className="h-8 px-2.5 rounded-lg border border-input bg-background font-mono text-xs font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Quick SLA Offsets for Delivery */}
            {onApplyOffset && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-0.5">
                  <Zap className="size-3 text-amber-500" /> SLA:
                </span>
                <button
                  type="button"
                  onClick={() => onApplyOffset(4)}
                  className="px-2 py-1 rounded-md text-[11px] font-bold bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-900 dark:text-amber-200 border border-amber-200/80 cursor-pointer"
                >
                  +4h
                </button>
                <button
                  type="button"
                  onClick={() => onApplyOffset(8)}
                  className="px-2 py-1 rounded-md text-[11px] font-bold bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-900 dark:text-amber-200 border border-amber-200/80 cursor-pointer"
                >
                  +8h
                </button>
                <button
                  type="button"
                  onClick={() => onApplyOffset(24)}
                  className="px-2 py-1 rounded-md text-[11px] font-bold bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 text-amber-900 dark:text-amber-200 border border-amber-200/80 cursor-pointer"
                >
                  +24h
                </button>
                <button
                  type="button"
                  onClick={() => onApplyOffset(0, true)}
                  className="px-2 py-1 rounded-md text-[11px] font-bold bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-900 dark:text-indigo-200 border border-indigo-200/80 cursor-pointer"
                >
                  EOD
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Selected Time Summary pill */}
        {!dateObj ? (
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
            <AlertCircle className="size-3.5 shrink-0 text-amber-600" />
            <span>Please pick a date and target time window for this stop.</span>
          </div>
        ) : (
          <div
            className={cn(
              'p-2.5 rounded-xl border flex items-center justify-between text-xs',
              isPickup
                ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-900/40 text-emerald-950 dark:text-emerald-200'
                : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/40 text-amber-950 dark:text-amber-200'
            )}
          >
            <div className="flex items-center gap-2">
              <Check className={cn('size-4 font-bold', isPickup ? 'text-emerald-600' : 'text-[#E8450F]')} />
              <span className="font-semibold">
                Scheduled Target:{' '}
                <strong className="font-mono font-bold text-foreground">
                  {format(dateObj, 'EEEE, MMM d, yyyy @ hh:mm a')}
                </strong>
              </span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="text-xs font-bold text-rose-600 flex items-center gap-1.5">
            <AlertCircle className="size-3.5" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
