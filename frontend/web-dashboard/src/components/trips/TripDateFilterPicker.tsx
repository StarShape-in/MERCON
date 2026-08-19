import * as React from 'react';
import {
  format,
  subDays,
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
  X,
  Check,
  CalendarDays,
  Sparkles,
  RotateCcw,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export type DateFilterType = 'All' | 'Today' | 'Yesterday' | 'ThisWeek' | 'Last7Days' | 'ThisMonth' | 'Last30Days' | 'Custom';

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
  badge?: string;
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
  const [tempRange, setTempRange] = React.useState<DateRange | undefined>(customDateRange);

  const presets: PresetOption[] = React.useMemo(() => {
    const today = new Date();
    return [
      {
        id: 'Today',
        label: 'Today',
        badge: 'Live',
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
        id: 'Last7Days',
        label: 'Last 7 Days',
        getRange: () => ({ from: subDays(today, 6), to: today }),
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
      {
        id: 'All',
        label: 'All Dates',
        badge: 'Full',
        getRange: () => undefined,
      },
    ];
  }, []);

  React.useEffect(() => {
    setTempRange(customDateRange);
  }, [customDateRange, open]);

  const handleSelectPreset = (preset: PresetOption) => {
    if (preset.id === 'All') {
      setDateFilter('All');
      setCustomDateRange(undefined);
      setTempRange(undefined);
    } else if (preset.id === 'Today' || preset.id === 'ThisWeek' || preset.id === 'ThisMonth') {
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

  const handleApplyCalendarRange = () => {
    if (tempRange?.from) {
      setCustomDateRange(tempRange);
      setDateFilter('Custom');
      setOpen(false);
      onFilterChange?.();
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDateFilter('All');
    setCustomDateRange(undefined);
    setTempRange(undefined);
    onFilterChange?.();
  };

  const getButtonLabel = () => {
    if (dateFilter === 'All') return 'All Dates';
    if (dateFilter === 'Today') return 'Today';
    if (dateFilter === 'Yesterday') return 'Yesterday';
    if (dateFilter === 'ThisWeek') return 'This Week';
    if (dateFilter === 'ThisMonth') return 'This Month';
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
          className={cn(
            "h-9 px-3 shrink-0 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-2xs outline-none cursor-pointer border select-none",
            isFiltered
              ? "bg-orange-50/90 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800 text-orange-700 dark:text-orange-300 font-bold"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
          )}
        >
          <CalendarIcon
            className={cn(
              "h-3.5 w-3.5 shrink-0 transition-colors",
              isFiltered ? "text-brand" : "text-slate-400"
            )}
          />
          <span className="truncate max-w-[150px]">{getButtonLabel()}</span>

          {isFiltered ? (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-0.5 -mr-1 rounded-md hover:bg-orange-200/70 dark:hover:bg-orange-900/60 text-orange-600 dark:text-orange-400 transition-colors"
              title="Reset to All Dates"
            >
              <X className="h-3 w-3" />
            </span>
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0 opacity-70" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={8}
        collisionPadding={16}
        className="w-auto p-0 shadow-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl z-50 overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
          {/* Left Panel: Presets List */}
          <div className="w-full sm:w-44 p-3 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col justify-between shrink-0">
            <div>
              <div className="px-2 pb-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-brand" />
                <span>Quick Filters</span>
              </div>
              <div className="space-y-1">
                {presets.map((preset) => {
                  const isActive =
                    (preset.id === 'Today' && dateFilter === 'Today') ||
                    (preset.id === 'ThisWeek' && dateFilter === 'ThisWeek') ||
                    (preset.id === 'ThisMonth' && dateFilter === 'ThisMonth') ||
                    (preset.id === 'All' && dateFilter === 'All');

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={cn(
                        "w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-between cursor-pointer",
                        isActive
                          ? "bg-brand text-white shadow-2xs font-bold"
                          : "text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800"
                      )}
                    >
                      <span className="truncate">{preset.label}</span>
                      {preset.badge && !isActive && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-slate-200/80 dark:bg-slate-800 text-slate-500">
                          {preset.badge}
                        </span>
                      )}
                      {isActive && <Check className="h-3.5 w-3.5 text-white" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clear Shortcut in sidebar */}
            {isFiltered && (
              <button
                type="button"
                onClick={handleClear}
                className="mt-3 w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset to All</span>
              </button>
            )}
          </div>

          {/* Right Panel: Calendar & Custom Date Range */}
          <div className="p-3 sm:p-4 flex flex-col justify-between">
            {/* Header: Date Range preview */}
            <div className="pb-2.5 mb-1 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                <CalendarDays className="h-4 w-4 text-brand" />
                <span>Custom Date Range</span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-mono font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                <span>{tempRange?.from ? format(tempRange.from, 'MMM d, yyyy') : 'Start'}</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span>{tempRange?.to ? format(tempRange.to, 'MMM d, yyyy') : 'End'}</span>
              </div>
            </div>

            {/* Interactive Calendar */}
            <div className="flex justify-center py-1">
              <Calendar
                mode="range"
                selected={tempRange}
                onSelect={setTempRange}
                numberOfMonths={1}
                className="p-1 select-none"
              />
            </div>

            {/* Footer Action Bar */}
            <div className="pt-2.5 mt-1 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <span className="text-[10.5px] text-slate-400">
                {tempRange?.from && tempRange?.to
                  ? `${Math.round((tempRange.to.getTime() - tempRange.from.getTime()) / (1000 * 60 * 60 * 24)) + 1} days selected`
                  : 'Click two dates to select range'}
              </span>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpen(false)}
                  className="h-7.5 text-xs px-2.5 rounded-lg text-slate-500 hover:text-slate-800 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!tempRange?.from}
                  onClick={handleApplyCalendarRange}
                  className="h-7.5 text-xs px-3.5 rounded-lg bg-brand hover:bg-[#d13d0d] text-white font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  Apply Range
                </Button>
              </div>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

