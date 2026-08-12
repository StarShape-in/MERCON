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
              ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100"
              : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-200"
          )}
        >
          <CalendarIcon className={cn("h-3.5 w-3.5 shrink-0", dateFilter !== 'All' ? "text-white dark:text-slate-900" : "text-indigo-600")} />
          <span className="truncate max-w-[150px]">{getLabel()}</span>
          {dateFilter !== 'All' ? (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-0.5 rounded-md hover:bg-slate-700 dark:hover:bg-slate-300 text-slate-300 dark:text-slate-600 transition-colors"
              title="Clear date filter"
            >
              <X className="h-3 w-3" />
            </span>
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          )}
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={16}
        className="w-80 p-4 shadow-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl z-50"
      >
        {/* Header & Tabs */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
            <CalendarDays className="h-4 w-4 text-[#E8450F]" />
            <span>Date Horizon</span>
          </div>

          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px] font-medium">
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
              Custom
            </button>
          </div>
        </div>

        {/* Tab 1: Presets */}
        {activeTab === 'preset' ? (
          <div className="space-y-1.5">
            {[
              { id: 'All', label: 'All Dates', desc: 'Show full history' },
              { id: 'Today', label: 'Today', desc: 'Trips scheduled today' },
              { id: 'ThisWeek', label: 'This Week', desc: 'Current calendar week' },
              { id: 'ThisMonth', label: 'This Month', desc: 'Current calendar month' },
            ].map((p) => {
              const isSelected = dateFilter === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handlePresetSelect(p.id as DateFilterType)}
                  className={cn(
                    "w-full text-left px-3 py-2.5 rounded-xl text-xs transition-all flex items-center justify-between cursor-pointer border",
                    isSelected
                      ? "bg-slate-900 text-white border-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:border-slate-100 font-semibold"
                      : "bg-slate-50/50 dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <div>
                    <div className="font-semibold">{p.label}</div>
                    <div className={cn("text-[10px]", isSelected ? "text-slate-300 dark:text-slate-600" : "text-slate-400")}>
                      {p.desc}
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-[#E8450F]" />}
                </button>
              );
            })}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setActiveTab('calendar')}
                className={cn(
                  "w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-between cursor-pointer border border-dashed border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                )}
              >
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-3.5 w-3.5 text-[#E8450F]" />
                  <span>Select Custom Date Range...</span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 -rotate-90 text-slate-400" />
              </button>
            </div>
          </div>
        ) : (
          /* Tab 2: Custom Calendar Range */
          <div className="space-y-3">
            <div className="flex justify-center">
              <Calendar
                mode="range"
                selected={tempRange}
                onSelect={setTempRange}
                numberOfMonths={1}
                className="rounded-xl border border-slate-100 dark:border-slate-800 p-2"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <div className="text-[11px] text-slate-500 font-mono truncate max-w-[140px]">
                {tempRange?.from ? (
                  tempRange.to ? (
                    `${format(tempRange.from, 'MMM d')} - ${format(tempRange.to, 'MMM d')}`
                  ) : (
                    `From: ${format(tempRange.from, 'MMM d')}`
                  )
                ) : (
                  'Pick start & end date'
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
                  className="h-8 text-xs px-3 rounded-lg text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!tempRange?.from}
                  onClick={handleApplyCustomRange}
                  className="h-8 text-xs px-3.5 rounded-lg bg-[#E8450F] hover:bg-[#d03d0c] text-white font-semibold shadow-xs cursor-pointer disabled:opacity-50"
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
