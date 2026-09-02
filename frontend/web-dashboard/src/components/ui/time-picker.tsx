import * as React from 'react';
import { Clock, Check, X, ChevronUp, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export interface TimePickerProps {
  value?: string; // Standard "HH:mm" (24-hour, e.g. "14:30")
  onChange?: (time: string) => void;
  placeholder?: string;
  disabled?: boolean;
  stepMinutes?: number; // default 5 or 15
  showPresets?: boolean;
  clearable?: boolean;
  format12h?: boolean;
  className?: string;
  buttonClassName?: string;
  id?: string;
  error?: boolean;
}

const TIME_PRESETS = [
  { label: 'Now', time: 'NOW' },
  { label: '08:00 AM', time: '08:00' },
  { label: '12:00 PM', time: '12:00' },
  { label: '04:00 PM', time: '16:00' },
  { label: '08:00 PM', time: '20:00' },
];

export function TimePicker({
  value = '',
  onChange,
  placeholder = 'Select time...',
  disabled = false,
  stepMinutes = 15,
  showPresets = false,
  clearable = true,
  format12h = true,
  className,
  buttonClassName,
  id,
  error = false,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Parse "HH:mm" into hours and minutes
  const parsed = React.useMemo(() => {
    if (!value || !value.includes(':')) {
      return { hours24: 12, minutes: 0, period: 'AM' as 'AM' | 'PM', hours12: 12, raw: '' };
    }
    const [hStr, mStr] = value.split(':');
    const h = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    const period = h >= 12 ? ('PM' as const) : ('AM' as const);
    const hours12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return {
      hours24: h,
      minutes: m,
      period,
      hours12,
      raw: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
    };
  }, [value]);

  const formatDisplayTime = (val: string) => {
    if (!val) return placeholder;
    if (!format12h) return val;
    const [hStr, mStr] = val.split(':');
    const h = parseInt(hStr, 10) || 0;
    const m = parseInt(mStr, 10) || 0;
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
  };

  const handleTimeChange = (newHours24: number, newMinutes: number) => {
    const h = Math.max(0, Math.min(23, newHours24));
    const m = Math.max(0, Math.min(59, newMinutes));
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    onChange?.(timeStr);
  };

  const handle12hChange = (h12: number, m: number, period: 'AM' | 'PM') => {
    let h24 = h12;
    if (period === 'PM' && h12 < 12) h24 = h12 + 12;
    if (period === 'AM' && h12 === 12) h24 = 0;
    handleTimeChange(h24, m);
  };

  const handlePreset = (presetTime: string) => {
    if (presetTime === 'NOW') {
      const now = new Date();
      const h = now.getHours();
      const m = now.getMinutes();
      handleTimeChange(h, m);
    } else {
      onChange?.(presetTime);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange?.('');
  };

  // Generate hour options
  const hours12List = Array.from({ length: 12 }, (_, i) => i + 1);
  const hours24List = Array.from({ length: 24 }, (_, i) => i);
  const minutesList = Array.from(
    { length: Math.ceil(60 / stepMinutes) },
    (_, i) => i * stepMinutes
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!open && ['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
      e.preventDefault();
      setOpen(true);
    }
  };

  return (
    <div className={cn('relative inline-block w-full', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            onKeyDown={handleKeyDown}
            className={cn(
              'w-full justify-between text-left font-normal h-9 px-3 rounded-xl border-input bg-background transition-all hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-[#FA634E] focus-visible:outline-none focus-visible:border-[#FA634E]',
              !value && 'text-muted-foreground',
              error && 'border-destructive ring-1 ring-destructive/30',
              disabled && 'opacity-50 cursor-not-allowed',
              buttonClassName
            )}
          >
            <div className="flex items-center gap-2 truncate">
              <Clock className="w-4 h-4 text-primary shrink-0 opacity-80" />
              <span className="truncate text-xs font-mono font-medium">
                {formatDisplayTime(value)}
              </span>
            </div>

            {clearable && value && !disabled && (
              <div
                role="button"
                tabIndex={-1}
                onClick={handleClear}
                onKeyDown={(e) => e.key === 'Enter' && handleClear(e as any)}
                className="p-1 hover:bg-muted rounded-md text-muted-foreground hover:text-foreground transition-colors shrink-0"
                title="Clear time"
              >
                <X className="w-3.5 h-3.5" />
              </div>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-64 p-0 rounded-2xl shadow-xl border-border bg-popover z-[9999]" align="start" side="bottom" sideOffset={4} avoidCollisions={false}>
          {/* Quick Presets Bar */}
          {showPresets && (
            <div className="p-2 border-b bg-muted/20">
              <div className="flex flex-wrap gap-1">
                {TIME_PRESETS.map((preset) => {
                  const isCurrent =
                    preset.time !== 'NOW' &&
                    value === preset.time;
                  return (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handlePreset(preset.time)}
                      className={cn(
                        'text-[10px] px-2 py-0.5 rounded-md font-medium transition-all flex items-center gap-1',
                        isCurrent
                          ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                          : 'bg-background hover:bg-muted text-foreground border border-border/60'
                      )}
                    >
                      {isCurrent && <Check className="w-2.5 h-2.5" />}
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Interactive Stepper & Column Selection */}
          <div className="p-3 space-y-2.5">
            {/* Header Value Display */}
            <div className="flex items-center justify-center p-2 rounded-lg bg-muted/30 border text-center">
              <span className="text-base font-bold font-mono text-foreground tracking-wider">
                {value ? formatDisplayTime(value) : '00:00 --'}
              </span>
            </div>

            {format12h ? (
              <div className="grid grid-cols-3 gap-1.5">
                {/* Hours 12 column */}
                <div className="space-y-1 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hour</span>
                  <div className="max-h-28 overflow-y-auto rounded-lg border bg-background p-1 space-y-1 scrollbar-thin">
                    {hours12List.map((h) => {
                      const isSelected = parsed.raw && parsed.hours12 === h;
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => handle12hChange(h, parsed.minutes, parsed.period)}
                          className={cn(
                            'w-full py-0.5 rounded-md text-xs font-mono font-medium transition-all',
                            isSelected
                              ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                              : 'hover:bg-muted text-foreground'
                          )}
                        >
                          {String(h).padStart(2, '0')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Minutes column */}
                <div className="space-y-1 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Min</span>
                  <div className="max-h-28 overflow-y-auto rounded-lg border bg-background p-1 space-y-1 scrollbar-thin">
                    {minutesList.map((m) => {
                      const isSelected = parsed.raw && parsed.minutes === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handle12hChange(parsed.hours12, m, parsed.period)}
                          className={cn(
                            'w-full py-0.5 rounded-md text-xs font-mono font-medium transition-all',
                            isSelected
                              ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                              : 'hover:bg-muted text-foreground'
                          )}
                        >
                          {String(m).padStart(2, '0')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Period AM / PM column */}
                <div className="space-y-1 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Shift</span>
                  <div className="flex flex-col gap-1 pt-1">
                    {(['AM', 'PM'] as const).map((p) => {
                      const isSelected = parsed.raw && parsed.period === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => handle12hChange(parsed.hours12, parsed.minutes, p)}
                          className={cn(
                            'py-1.5 rounded-md text-xs font-bold transition-all',
                            isSelected
                              ? 'bg-primary text-primary-foreground shadow-xs'
                              : 'border border-border/70 hover:bg-muted text-foreground'
                          )}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-1.5">
                {/* 24-hour selector */}
                <div className="space-y-1 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Hour (24h)</span>
                  <div className="max-h-28 overflow-y-auto rounded-lg border bg-background p-1 space-y-1 scrollbar-thin">
                    {hours24List.map((h) => {
                      const isSelected = parsed.raw && parsed.hours24 === h;
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => handleTimeChange(h, parsed.minutes)}
                          className={cn(
                            'w-full py-0.5 rounded-md text-xs font-mono font-medium transition-all',
                            isSelected
                              ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                              : 'hover:bg-muted text-foreground'
                          )}
                        >
                          {String(h).padStart(2, '0')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1 text-center">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Min</span>
                  <div className="max-h-28 overflow-y-auto rounded-lg border bg-background p-1 space-y-1 scrollbar-thin">
                    {minutesList.map((m) => {
                      const isSelected = parsed.raw && parsed.minutes === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => handleTimeChange(parsed.hours24, m)}
                          className={cn(
                            'w-full py-0.5 rounded-md text-xs font-mono font-medium transition-all',
                            isSelected
                              ? 'bg-primary text-primary-foreground font-bold shadow-xs'
                              : 'hover:bg-muted text-foreground'
                          )}
                        >
                          {String(m).padStart(2, '0')}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="p-2 border-t bg-muted/20 flex items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onChange?.('')}
              className="text-xs h-6 px-2 text-destructive hover:bg-destructive/10"
            >
              Reset
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => setOpen(false)}
              className="text-xs h-6 px-3 rounded-md bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
            >
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default TimePicker;
