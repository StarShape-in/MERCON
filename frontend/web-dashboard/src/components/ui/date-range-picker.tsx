import * as React from 'react';
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear } from 'date-fns';
import { Calendar as CalendarIcon, X, Check } from 'lucide-react';
import { DateRange } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  align?: 'start' | 'center' | 'end';
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Select date range...',
  disabled = false,
  className,
  id,
  align = 'start',
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const presets = React.useMemo(() => {
    const today = new Date();
    return [
      { label: 'Today', range: { from: today, to: today } },
      { label: 'Yesterday', range: { from: subDays(today, 1), to: subDays(today, 1) } },
      { label: 'Last 7 Days', range: { from: subDays(today, 6), to: today } },
      { label: 'Last 30 Days', range: { from: subDays(today, 29), to: today } },
      { label: 'This Month', range: { from: startOfMonth(today), to: endOfMonth(today) } },
      {
        label: 'Last Month',
        range: { from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) },
      },
      { label: 'Year to Date', range: { from: startOfYear(today), to: today } },
    ];
  }, []);

  const handleSelect = (range: DateRange | undefined) => {
    onChange?.(range);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(undefined);
  };

  const displayText = React.useMemo(() => {
    if (!value?.from) return placeholder;
    if (value.from && !value.to) return `${format(value.from, 'MMM d, yyyy')} - ...`;
    return `${format(value.from, 'MMM d, yyyy')} - ${format(value.to!, 'MMM d, yyyy')}`;
  }, [value, placeholder]);

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
              !value?.from && 'text-muted-foreground',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <CalendarIcon className="w-4 h-4 text-primary shrink-0 opacity-80" />
              <span className="truncate text-xs font-mono">{displayText}</span>
            </div>

            {value?.from && !disabled && (
              <div
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => e.key === 'Enter' && handleClear(e as any)}
                className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="Clear date range"
              >
                <X className="w-3.5 h-3.5" />
              </div>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0 rounded-2xl shadow-2xl border-border bg-popover z-[9999] overflow-hidden" align={align}>
          {/* Quick Presets Toolbar */}
          <div className="p-2 border-b bg-muted/20 flex flex-wrap items-center gap-1">
            {presets.map((p) => {
              const isSelected =
                value?.from &&
                value?.to &&
                format(value.from, 'yyyy-MM-dd') === format(p.range.from, 'yyyy-MM-dd') &&
                format(value.to, 'yyyy-MM-dd') === format(p.range.to, 'yyyy-MM-dd');
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    handleSelect(p.range);
                  }}
                  className={cn(
                    'text-[11px] px-2 py-1 rounded-lg font-medium transition-all flex items-center gap-1',
                    isSelected
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : 'bg-background hover:bg-muted text-foreground border border-border/60'
                  )}
                >
                  {isSelected && <Check className="w-3 h-3" />}
                  {p.label}
                </button>
              );
            })}
          </div>

          <div className="p-2">
            <Calendar
              mode="range"
              selected={value}
              onSelect={handleSelect}
              numberOfMonths={2}
              autoFocus
            />
          </div>

          <div className="p-2.5 border-t bg-muted/20 flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-mono">{displayText}</span>
            <Button
              type="button"
              size="sm"
              onClick={() => setOpen(false)}
              className="h-7 text-xs px-3 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default DateRangePicker;
