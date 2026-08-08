import * as React from 'react';
import { format, parseISO, isValid, addDays, addWeeks, addMonths, startOfToday } from 'date-fns';
import { Calendar as CalendarIcon, X, Check } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface DatePickerProps {
  value?: Date | string | null;
  onChange?: (date: Date | undefined, dateString: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  showPresets?: boolean;
  clearable?: boolean;
  formatString?: string;
  className?: string;
  id?: string;
  error?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date...',
  disabled = false,
  minDate,
  maxDate,
  showPresets = true,
  clearable = true,
  formatString = 'MMM d, yyyy',
  className,
  id,
  error = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Parse input value into a valid Date object if provided
  const parsedDate = React.useMemo<Date | undefined>(() => {
    if (!value) return undefined;
    if (value instanceof Date) {
      return isValid(value) ? value : undefined;
    }
    if (typeof value === 'string') {
      const parsed = parseISO(value);
      return isValid(parsed) ? parsed : undefined;
    }
    return undefined;
  }, [value]);

  const handleSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      onChange?.(undefined, '');
    } else {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      onChange?.(selectedDate, dateString);
    }
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(undefined, '');
  };

  const presets = React.useMemo(() => {
    const today = startOfToday();
    return [
      { label: 'Today', date: today },
      { label: 'Tomorrow', date: addDays(today, 1) },
      { label: '+3 Days', date: addDays(today, 3) },
      { label: '+1 Week', date: addWeeks(today, 1) },
      { label: '+1 Month', date: addMonths(today, 1) },
    ];
  }, []);

  return (
    <div className={cn('relative inline-block w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'w-full justify-between text-left font-normal h-9 px-3 rounded-xl border-input bg-background transition-all hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-primary/30',
              !parsedDate && 'text-muted-foreground',
              error && 'border-destructive ring-1 ring-destructive/30',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <CalendarIcon className="w-4 h-4 text-primary shrink-0 opacity-80" />
              <span className="truncate text-xs">
                {parsedDate ? format(parsedDate, formatString) : placeholder}
              </span>
            </div>

            {clearable && parsedDate && !disabled && (
              <div
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => e.key === 'Enter' && handleClear(e as any)}
                className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="Clear date"
              >
                <X className="w-3.5 h-3.5" />
              </div>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-border bg-popover z-50" align="start">
          {showPresets && (
            <div className="p-2 border-b bg-muted/20 flex flex-wrap items-center gap-1">
              {presets.map((preset) => {
                const isSelected = parsedDate && format(parsedDate, 'yyyy-MM-dd') === format(preset.date, 'yyyy-MM-dd');
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handleSelect(preset.date)}
                    className={cn(
                      'text-[11px] px-2 py-1 rounded-lg font-medium transition-all flex items-center gap-1',
                      isSelected
                        ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                        : 'bg-background hover:bg-muted text-foreground border border-border/60 hover:border-border'
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                    {preset.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="p-1">
            <Calendar
              mode="single"
              selected={parsedDate}
              onSelect={handleSelect}
              disabled={(date) => {
                if (minDate && date < minDate) return true;
                if (maxDate && date > maxDate) return true;
                return false;
              }}
              autoFocus
            />
          </div>

          <div className="p-2.5 border-t bg-muted/20 flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {parsedDate ? format(parsedDate, 'EEEE, MMMM d, yyyy') : 'No date selected'}
            </span>
            {parsedDate && clearable && (
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] font-semibold text-destructive hover:underline"
              >
                Reset
              </button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default DatePicker;
