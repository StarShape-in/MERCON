import * as React from 'react';
import { format, subDays, startOfMonth, endOfMonth, subMonths, startOfYear, startOfWeek } from 'date-fns';
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
  buttonClassName?: string;
  iconOnly?: boolean;
  customLabel?: string;
  id?: string;
  align?: 'start' | 'center' | 'end';
  showPresets?: boolean;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Select date range...',
  disabled = false,
  className,
  buttonClassName,
  iconOnly = false,
  customLabel,
  id,
  align = 'start',
  showPresets = false,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  const presets = React.useMemo(() => {
    const today = new Date();
    return [
      { label: 'This Week', range: { from: startOfWeek(today, { weekStartsOn: 1 }), to: today } },
      { label: 'This Month', range: { from: startOfMonth(today), to: endOfMonth(today) } },
      { label: 'Last Month', range: { from: startOfMonth(subMonths(today, 1)), to: endOfMonth(subMonths(today, 1)) } },
      { label: 'Last 7 Days', range: { from: subDays(today, 6), to: today } },
      { label: 'Last 30 Days', range: { from: subDays(today, 29), to: today } },
    ];
  }, []);

  const handleSelect = (range: DateRange | undefined) => {
    onChange?.(range);
    if (range?.from && range?.to) {
      setOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.(undefined);
  };

  const displayText = React.useMemo(() => {
    if (customLabel) return customLabel;
    if (!value?.from) return placeholder;
    if (value.from && !value.to) return `${format(value.from, 'dd/MM/yyyy')} - ...`;
    return `${format(value.from, 'dd/MM/yyyy')} - ${format(value.to!, 'dd/MM/yyyy')}`;
  }, [value, placeholder, customLabel]);

  return (
    <div className={cn('relative inline-block', iconOnly ? 'w-auto' : 'w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            className={cn(
              'justify-center border-input bg-background transition-all hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-primary/30',
              iconOnly ? 'w-8 h-8 p-0 rounded-lg' : 'w-full justify-between text-left font-normal px-3',
              !value?.from && 'text-muted-foreground',
              disabled && 'opacity-50 cursor-not-allowed',
              buttonClassName || (iconOnly ? '' : 'h-9 rounded-xl')
            )}
          >
            <div className={cn('flex items-center gap-2 truncate', iconOnly && 'justify-center')}>
              <CalendarIcon className="w-3.5 h-3.5 text-[#FA634E] shrink-0 opacity-90" />
              {!iconOnly && <span className="truncate text-xs font-mono font-bold">{displayText}</span>}
            </div>

            {!iconOnly && value?.from && !disabled && (
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

        <PopoverContent className="w-auto p-3.5 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-[9999] overflow-hidden space-y-3" align={align}>
          {/* Quick Preset Shortcut Buttons Bar */}
          {showPresets && (
            <div className="flex flex-wrap items-center gap-1.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    onChange?.(p.range);
                    setOpen(false);
                  }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 hover:bg-[#FA634E] hover:text-white text-slate-700 dark:text-slate-200 transition-all cursor-pointer"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}

          <Calendar
            mode="range"
            selected={value}
            onSelect={handleSelect}
            numberOfMonths={1}
            captionLayout="dropdown"
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default DateRangePicker;
