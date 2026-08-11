import * as React from 'react';
import { format } from 'date-fns';
import { DateRange } from 'react-day-picker';
import { Calendar as CalendarIcon, ChevronDown, X, Check, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export type DateFilterType = 'All' | 'Today' | 'ThisWeek' | 'ThisMonth' | 'Custom';

export interface TripDateFilterPickerProps {
  dateFilter: DateFilterType;
  setDateFilter: (filter: DateFilterType) => void;
  customDateRange?: DateRange;
  setCustomDateRange: (range: DateRange | undefined) => void;
  onFilterChange?: () => void;
}

export function TripDateFilterPicker({
  dateFilter,
  setDateFilter,
  customDateRange,
  setCustomDateRange,
  onFilterChange,
}: TripDateFilterPickerProps) {
  const [open, setOpen] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'preset' | 'calendar'>(
    dateFilter === 'Custom' ? 'calendar' : 'preset'
  );
  const [tempRange, setTempRange] = React.useState<DateRange | undefined>(customDateRange);

  React.useEffect(() => {
    setTempRange(customDateRange);
  }, [customDateRange]);

  const handlePresetSelect = (preset: DateFilterType) => {
    setDateFilter(preset);
    if (preset !== 'Custom') {
      setCustomDateRange(undefined);
      setTempRange(undefined);
      setOpen(false);
      onFilterChange?.();
    } else {
      setActiveTab('calendar');
    }
  };

  const handleApplyCustomRange = () => {
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
    setActiveTab('preset');
    onFilterChange?.();
  };

  const getLabel = () => {
    if (dateFilter === 'All') return 'All Dates';
    if (dateFilter === 'Today') return 'Today';
    if (dateFilter === 'ThisWeek') return 'This Week';
    if (dateFilter === 'ThisMonth') return 'This Month';
    if (dateFilter === 'Custom' && customDateRange?.from) {
      if (customDateRange.to) {
        return `${format(customDateRange.from, 'MMM d')} - ${format(customDateRange.to, 'MMM d, yyyy')}`;
      }
      return format(customDateRange.from, 'MMM d, yyyy');
    }
    return 'All Dates';
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-9 px-3 shrink-0 border rounded-lg text-xs font-semibold flex items-center gap-2 transition-all shadow-2xs outline-none cursor-pointer",
            dateFilter !== 'All'
              ? "bg-indigo-50/80 border-indigo-200 text-indigo-700 dark:bg-indigo-950/40 dark:border-indigo-800 dark:text-indigo-300"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
          )}
        >
          <CalendarIcon className={cn("h-3.5 w-3.5 shrink-0", dateFilter !== 'All' ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500")} />
          <span className="truncate max-w-[140px]">{getLabel()}</span>
          {dateFilter !== 'All' ? (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-0.5 rounded-full hover:bg-indigo-200/60 dark:hover:bg-indigo-800/60 text-indigo-600 dark:text-indigo-300"
              title="Clear date filter"
            >
              <X className="h-3 w-3" />
            </span>
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-auto p-0 shadow-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl overflow-hidden z-50">
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
            <CalendarDays className="h-4 w-4 text-indigo-600" />
            <span>Date Horizon</span>
          </div>

          <div className="flex items-center bg-slate-200/60 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-medium">
            <button
              type="button"
              onClick={() => setActiveTab('preset')}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                activeTab === 'preset'
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              )}
            >
              Presets
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className={cn(
                "px-2.5 py-1 rounded-md transition-all cursor-pointer",
                activeTab === 'calendar'
                  ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs font-semibold"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              )}
            >
              Custom Range
            </button>
          </div>
        </div>

        {activeTab === 'preset' ? (
          <div className="p-2 space-y-1 w-56">
            {[
              { id: 'All', label: 'All Dates' },
              { id: 'Today', label: 'Today' },
              { id: 'ThisWeek', label: 'This Week' },
              { id: 'ThisMonth', label: 'This Month' },
            ].map((p) => {
              const isSelected = dateFilter === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetSelect(p.id as DateFilterType)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer",
                    isSelected
                      ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold"
                      : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  )}
                >
                  <span>{p.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                </button>
              );
            })}

            <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('calendar')}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer",
                  dateFilter === 'Custom'
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-semibold"
                    : "text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30"
                )}
              >
                <span>Select Custom Range...</span>
                <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
              </button>
            </div>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            <Calendar
              mode="range"
              selected={tempRange}
              onSelect={setTempRange}
              numberOfMonths={1}
            />

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 px-1">
              <div className="text-[11px] text-slate-500 truncate max-w-[160px]">
                {tempRange?.from ? (
                  tempRange.to ? (
                    `${format(tempRange.from, 'MMM d')} - ${format(tempRange.to, 'MMM d')}`
                  ) : (
                    `From: ${format(tempRange.from, 'MMM d')}`
                  )
                ) : (
                  'Select start & end date'
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setTempRange(undefined);
                    setActiveTab('preset');
                  }}
                  className="h-7 text-xs px-2.5 rounded-lg text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!tempRange?.from}
                  onClick={handleApplyCustomRange}
                  className="h-7 text-xs px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-2xs cursor-pointer"
                >
                  Apply
                </Button>
              </div>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
