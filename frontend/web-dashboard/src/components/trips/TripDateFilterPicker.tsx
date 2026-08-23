import * as React from 'react';
import {
  format,
  subDays,
  addDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isSameDay,
} from 'date-fns';
import { DateRange } from 'react-day-picker';
import {
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronLeft,
  Check,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export type DateFilterType = 'All' | '3Days' | 'Today' | 'Yesterday' | 'ThisWeek' | 'Last7Days' | 'ThisMonth' | 'Last30Days' | 'Custom';

export interface TripDateFilterPickerProps {
  dateFilter: DateFilterType;
  setDateFilter: (filter: DateFilterType) => void;
  customDateRange?: DateRange;
  setCustomDateRange: (range: DateRange | undefined) => void;
  onFilterChange?: () => void;
}

interface PresetOption {
  id: DateFilterType;
  label: string;
  getRange: () => DateRange | undefined;
}

export function TripDateFilterPicker({
  dateFilter,
  setDateFilter,
  customDateRange,
  setCustomDateRange,
  onFilterChange,
}: TripDateFilterPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [isCustomMode, setIsCustomMode] = React.useState(false);
  const [tempRange, setTempRange] = React.useState<DateRange | undefined>(customDateRange);

  const presets: PresetOption[] = React.useMemo(() => {
    const today = new Date();
    return [
      {
        id: 'All',
        label: 'All Dates',
        getRange: () => undefined,
      },
      {
        id: '3Days',
        label: '3 Days (Prev, Today, Next)',
        getRange: () => ({ from: subDays(today, 1), to: addDays(today, 1) }),
      },
      {
        id: 'Today',
        label: 'Today',
        getRange: () => ({ from: today, to: today }),
      },
      {
        id: 'Yesterday',
        label: 'Yesterday',
        getRange: () => {
          const y = subDays(today, 1);
          return { from: y, to: y };
        },
      },
      {
        id: 'ThisWeek',
        label: 'This Week',
        getRange: () => ({
          from: startOfWeek(today, { weekStartsOn: 0 }),
          to: endOfWeek(today, { weekStartsOn: 0 }),
        }),
      },
      {
        id: 'ThisMonth',
        label: 'This Month',
        getRange: () => ({ from: startOfMonth(today), to: endOfMonth(today) }),
      },
      {
        id: 'Last30Days',
        label: 'Last 30 Days',
        getRange: () => ({ from: subDays(today, 29), to: today }),
      },
    ];
  }, []);

  React.useEffect(() => {
    setTempRange(customDateRange);
    if (!open) {
      setIsCustomMode(false);
    }
  }, [customDateRange, open]);

  const handleSelectPreset = (preset: PresetOption) => {
    if (preset.id === 'All') {
      setDateFilter('All');
      setCustomDateRange(undefined);
      setTempRange(undefined);
    } else if (preset.id === 'Today' || preset.id === 'Yesterday' || preset.id === '3Days' || preset.id === 'ThisWeek' || preset.id === 'ThisMonth') {
      setDateFilter(preset.id);
      setCustomDateRange(undefined);
      setTempRange(undefined);
    } else {
      const range = preset.getRange();
      setCustomDateRange(range);
      setTempRange(range);
      setDateFilter('Custom');
    }
    setOpen(false);
    onFilterChange?.();
  };

  const handleApplyCustomRange = () => {
    if (tempRange?.from) {
      setCustomDateRange(tempRange);
      setDateFilter('Custom');
      setOpen(false);
      onFilterChange?.();
    }
  };

  const getButtonLabel = () => {
    if (dateFilter === 'All') return 'All Dates';
    if (dateFilter === '3Days') return '3 Days (Prev, Today, Next)';
    if (dateFilter === 'Today') return 'Today';
    if (dateFilter === 'Yesterday') return 'Yesterday';
    if (dateFilter === 'ThisWeek') return 'This Week';
    if (dateFilter === 'ThisMonth') return 'This Month';
    if (dateFilter === 'Last30Days') return 'Last 30 Days';
    if (dateFilter === 'Custom' && customDateRange?.from) {
      if (customDateRange.to && !isSameDay(customDateRange.from, customDateRange.to)) {
        return `${format(customDateRange.from, 'MMM d')} – ${format(customDateRange.to, 'MMM d')}`;
      }
      return format(customDateRange.from, 'MMM d, yyyy');
    }
    return 'All Dates';
  };

  const isFiltered = dateFilter !== 'All';

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-8 px-2.5 w-48 whitespace-nowrap shrink-0 border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold rounded-lg shadow-2xs flex items-center justify-between gap-2 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors cursor-pointer outline-none"
        >
          <div className="flex items-center gap-2 whitespace-nowrap min-w-0 flex-1">
            <CalendarIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className={cn(isFiltered && "text-brand font-bold", "truncate flex-1 text-left")}>{getButtonLabel()}</span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0 opacity-70" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className={cn(
          "p-1.5 shadow-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl z-50 transition-all",
          isCustomMode ? "w-72" : "w-56"
        )}
      >
        {!isCustomMode ? (
          <div>
            <div className="px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Date Filter
            </div>

            <div className="space-y-0.5">
              {presets.map((preset) => {
                const isActive =
                  (preset.id === '3Days' && dateFilter === '3Days') ||
                  (preset.id === 'Today' && dateFilter === 'Today') ||
                  (preset.id === 'Yesterday' && dateFilter === 'Yesterday') ||
                  (preset.id === 'ThisWeek' && dateFilter === 'ThisWeek') ||
                  (preset.id === 'ThisMonth' && dateFilter === 'ThisMonth') ||
                  (preset.id === 'All' && dateFilter === 'All');

                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset)}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer",
                      isActive
                        ? "bg-orange-50 dark:bg-orange-950/40 text-brand font-bold"
                        : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    )}
                  >
                    <span>{preset.label}</span>
                    {isActive && <Check className="h-3.5 w-3.5 text-brand" />}
                  </button>
                );
              })}
            </div>

            <div className="my-1 border-t border-slate-100 dark:border-slate-800" />

            <button
              type="button"
              onClick={() => setIsCustomMode(true)}
              className={cn(
                "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between cursor-pointer",
                dateFilter === 'Custom'
                  ? "bg-orange-50 dark:bg-orange-950/40 text-brand font-bold"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              <div className="flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
                <span>Custom Range...</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 -rotate-90 text-slate-400" />
            </button>
          </div>
        ) : (
          /* Custom Calendar Mode inside little box */
          <div className="p-1 space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setIsCustomMode(false)}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 rounded px-1.5 py-0.5 hover:bg-slate-100 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </button>

              <span className="text-[11px] font-mono text-slate-500 truncate max-w-[150px]">
                {tempRange?.from ? (
                  tempRange.to ? (
                    `${format(tempRange.from, 'MMM d')} – ${format(tempRange.to, 'MMM d')}`
                  ) : (
                    format(tempRange.from, 'MMM d, yyyy')
                  )
                ) : (
                  'Select range'
                )}
              </span>
            </div>

            <div className="flex justify-center">
              <Calendar
                mode="range"
                selected={tempRange}
                onSelect={setTempRange}
                numberOfMonths={1}
                className="p-0 select-none"
              />
            </div>

            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCustomMode(false)}
                className="h-7 text-xs px-2 rounded-lg text-slate-500 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={!tempRange?.from}
                onClick={handleApplyCustomRange}
                className="h-7 text-xs px-3 rounded-lg bg-brand hover:bg-[#d13d0d] text-white font-bold shadow-xs cursor-pointer disabled:opacity-50"
              >
                Apply
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

