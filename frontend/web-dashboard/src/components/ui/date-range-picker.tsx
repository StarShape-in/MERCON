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

        <PopoverContent
          className="w-[330px] p-3.5 rounded-2xl shadow-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 z-[9999] overflow-hidden space-y-3"
          align={align}
          sideOffset={6}
        >
          {/* Quick Preset Shortcut Buttons Bar */}
          {showPresets && (
            <div className="space-y-1.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Quick Filters
                </span>
                {value?.from && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange?.(undefined);
                    }}
                    className="text-[10px] font-bold text-slate-400 hover:text-[#FA634E] transition-colors cursor-pointer"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 px-0.5 scrollbar-none no-scrollbar">
                {presets.map((p, idx) => {
                  const isSelected =
                    value?.from &&
                    value?.to &&
                    format(value.from, 'yyyy-MM-dd') === format(p.range.from, 'yyyy-MM-dd') &&
                    format(value.to, 'yyyy-MM-dd') === format(p.range.to, 'yyyy-MM-dd');

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        onChange?.(p.range);
                        setOpen(false);
                      }}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 border",
                        isSelected
                          ? "bg-[#FA634E] text-white border-[#FA634E] shadow-2xs"
                          : "bg-slate-50 dark:bg-slate-800/80 hover:bg-orange-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700"
                      )}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-center w-full">
            <Calendar
              mode="range"
              selected={value}
              onSelect={handleSelect}
              numberOfMonths={1}
              captionLayout="dropdown"
              autoFocus
            />
          </div>

          {/* Footer with Selected Range Text & Actions */}
          <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 px-1">
            <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 truncate">
              {value?.from ? (
                value.to ? (
                  `${format(value.from, 'dd MMM')} – ${format(value.to, 'dd MMM yyyy')}`
                ) : (
                  `${format(value.from, 'dd MMM yyyy')}`
                )
              ) : (
                'Select date range'
              )}
            </span>

            {value?.from && (
              <Button
                type="button"
                size="sm"
                onClick={() => setOpen(false)}
                className="h-7 text-xs px-3 rounded-lg bg-[#FA634E] hover:bg-[#e5533e] text-white font-bold shadow-xs cursor-pointer"
              >
                Apply
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default DateRangePicker;
