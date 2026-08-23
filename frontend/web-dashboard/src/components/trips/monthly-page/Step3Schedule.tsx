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
    <div className="space-y-4 animate-fade-in max-w-3xl mx-auto py-2">
      <div className="space-y-0.5">
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand" />
          Select Operating Month & Days
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Choose target month and operational days for this monthly contract batch.
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between flex-wrap gap-2.5">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChangeSelectedMonth(shiftMonth(selectedMonth, -1))}
              className="h-8 rounded-lg px-2 text-xs font-bold"
            >
              ‹
            </Button>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 min-w-[120px] text-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 rounded-xl shadow-2xs">
              {monthLabel(selectedMonth)}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChangeSelectedMonth(shiftMonth(selectedMonth, 1))}
              className="h-8 rounded-lg px-2 text-xs font-bold"
            >
              ›
            </Button>
          </div>

          {/* Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase mr-1">Quick Select:</span>
            <button
              type="button"
              onClick={() => onSelectPreset('weekdays')}
              className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-xs font-bold text-slate-900 dark:text-slate-100 transition-colors shadow-2xs"
            >
              Sun–Thu
            </button>
            <button
              type="button"
              onClick={() => onSelectPreset('mwf')}
              className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-xs font-bold text-slate-900 dark:text-slate-100 transition-colors shadow-2xs"
            >
              Mon, Wed, Fri
            </button>
            <button
              type="button"
              onClick={() => onSelectPreset('daily')}
              className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-xs font-bold text-slate-900 dark:text-slate-100 transition-colors shadow-2xs"
            >
              All Days
            </button>
            <button
              type="button"
              onClick={() => onSelectPreset('clear')}
              className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-2 pt-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
            <div key={d} className="text-center text-[10px] font-bold text-slate-400 uppercase py-1">
              {d}
            </div>
          ))}

          {Array.from({ length: monthDates[0]?.dayOfWeek || 0 }).map((_, i) => (
            <div key={`pad-${i}`} className="h-10 rounded-xl opacity-0 pointer-events-none" />
          ))}

          {monthDates.map((item) => {
            const isSelected = selectedDates.includes(item.dateStr);
            return (
              <button
                key={item.dateStr}
                type="button"
                onClick={() => onToggleDate(item.dateStr)}
                className={`h-11 rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-brand text-white shadow-md'
                    : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 hover:border-brand/40'
                }`}
              >
                <span>{item.dayNumber}</span>
                <span className={`text-[9px] font-medium -mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                  {item.dayName}
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-500 dark:text-slate-400 pt-1 text-center font-medium">
          Selected: <span className="font-bold text-slate-900 dark:text-slate-100">{selectedDates.length} days</span> × {contractSlotsCount} slot(s) = <span className="font-bold text-brand">{selectedDates.length * contractSlotsCount} total trips</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="h-10 px-5 rounded-xl font-bold text-xs"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to Route Slots
        </Button>

        <Button
          type="button"
          disabled={!isStep3Valid}
          onClick={onNext}
          className="h-10 px-6 rounded-xl bg-brand hover:bg-[#d13d0d] text-white font-bold text-xs gap-1.5 shadow-md disabled:opacity-50"
        >
          Next: Driver & Fleet Assignments
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
