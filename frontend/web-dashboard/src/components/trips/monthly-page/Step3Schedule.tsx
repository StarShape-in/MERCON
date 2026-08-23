import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { monthLabel, shiftMonth } from '@/components/trips/monthly/monthlyBoardUtils';
import { MonthDateItem } from './types';

interface Step3ScheduleProps {
  selectedMonth: string;
  onChangeSelectedMonth: (m: string) => void;
  monthDates: MonthDateItem[];
  selectedDates: string[];
  onToggleDate: (dateStr: string) => void;
  onSelectPreset: (type: 'weekdays' | 'mwf' | 'daily' | 'clear') => void;
  contractSlotsCount: number;
  isStep3Valid: boolean;
  onNext: () => void;
  onBack: () => void;
}

export default function Step3Schedule({
  selectedMonth,
  onChangeSelectedMonth,
  monthDates,
  selectedDates,
  onToggleDate,
  onSelectPreset,
  contractSlotsCount,
  isStep3Valid,
  onNext,
  onBack,
}: Step3ScheduleProps) {
  return (
    <div className="space-y-3.5 animate-fade-in max-w-3xl mx-auto py-1">
      <div className="space-y-0.5">
        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-brand" />
          Select Operating Month & Days
        </h4>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Pick target month and operational days across the calendar grid.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-3 shadow-2xs">
        <div className="flex items-center justify-between flex-wrap gap-2">
          {/* Month Switcher */}
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChangeSelectedMonth(shiftMonth(selectedMonth, -1))}
              className="h-7 rounded-lg px-2 text-xs font-bold"
            >
              ‹
            </Button>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 min-w-[110px] text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg shadow-2xs">
              {monthLabel(selectedMonth)}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChangeSelectedMonth(shiftMonth(selectedMonth, 1))}
              className="h-7 rounded-lg px-2 text-xs font-bold"
            >
              ›
            </Button>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Presets:</span>
            <button
              type="button"
              onClick={() => onSelectPreset('weekdays')}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-xs font-bold text-slate-900 dark:text-slate-100 transition-colors shadow-2xs"
            >
              Sun–Thu
            </button>
            <button
              type="button"
              onClick={() => onSelectPreset('mwf')}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-xs font-bold text-slate-900 dark:text-slate-100 transition-colors shadow-2xs"
            >
              Mon, Wed, Fri
            </button>
            <button
              type="button"
              onClick={() => onSelectPreset('daily')}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-xs font-bold text-slate-900 dark:text-slate-100 transition-colors shadow-2xs"
            >
              All Days
            </button>
            <button
              type="button"
              onClick={() => onSelectPreset('clear')}
              className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* 7-Column Calendar Grid */}
        <div className="grid grid-cols-7 gap-1.5 pt-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-0.5">
              {d}
            </div>
          ))}

          {Array.from({ length: monthDates[0]?.dayOfWeek || 0 }).map((_, i) => (
            <div key={`pad-${i}`} className="h-9 rounded-lg opacity-0 pointer-events-none" />
          ))}

          {monthDates.map((item) => {
            const isSelected = selectedDates.includes(item.dateStr);
            return (
              <button
                key={item.dateStr}
                type="button"
                onClick={() => onToggleDate(item.dateStr)}
                className={`h-9 rounded-lg flex flex-col items-center justify-center text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-brand text-white shadow-sm'
                    : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:border-brand/40'
                }`}
              >
                <span>{item.dayNumber}</span>
                <span className={`text-[8px] font-medium -mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                  {item.dayName}
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-400 pt-0.5 text-center font-medium bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl">
          Selected: <span className="font-extrabold text-slate-900 dark:text-slate-100">{selectedDates.length} days</span> × {contractSlotsCount} slot(s) = <span className="font-extrabold text-brand text-sm">{selectedDates.length * contractSlotsCount} Total Generated Trips</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="h-9 px-4 rounded-xl font-bold text-xs"
        >
          <ChevronLeft className="w-3.5 h-3.5 mr-1" />
          Back to Route Slots
        </Button>

        <Button
          type="button"
          disabled={!isStep3Valid}
          onClick={onNext}
          className="h-9 px-5 rounded-xl bg-brand hover:bg-[#d13d0d] text-white font-bold text-xs gap-1.5 shadow-md disabled:opacity-50"
        >
          Next: Driver & Fleet Assignments
          <ChevronRight className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
