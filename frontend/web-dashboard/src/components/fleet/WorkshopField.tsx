import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, Wrench } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { maintenanceService, Workshop } from '@/services/maintenanceService';

interface WorkshopFieldProps {
  value: string;
  /** Called as the operator types, and with the picked name on selection. */
  onChange: (name: string) => void;
  /** Called only when a saved workshop is picked, so the form can fill in its contact. */
  onPick?: (workshop: Workshop) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}

/**
 * Workshop name input that remembers the workshops this fleet has already used.
 *
 * Free text on purpose — a new workshop is just typed in, and it shows up in this list the
 * next time because the suggestions are derived from the service orders themselves. Picking
 * a saved one also fills its contact number, which is the part nobody remembers.
 */
export default function WorkshopField({
  value,
  onChange,
  onPick,
  placeholder = 'e.g. Al Salam Auto Workshop',
  className,
  autoFocus,
}: WorkshopFieldProps) {
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: workshops = [] } = useQuery({
    queryKey: ['workshops'],
    queryFn: () => maintenanceService.getWorkshops(),
    staleTime: 60_000,
  });

  const suggestions = useMemo(() => {
    const typed = value.trim().toLowerCase();
    const matches = typed
      ? workshops.filter((w) => w.name.toLowerCase().includes(typed))
      : workshops;
    return matches.slice(0, 8);
  }, [workshops, value]);

  const isExactMatch = workshops.some((w) => w.name.toLowerCase() === value.trim().toLowerCase());

  const pick = (workshop: Workshop) => {
    onChange(workshop.name);
    onPick?.(workshop);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Let a click on a suggestion land before the list unmounts.
          blurTimer.current = setTimeout(() => setOpen(false), 120);
        }}
        placeholder={placeholder}
        className={cn('h-9 text-xs pr-8', className)}
        autoFocus={autoFocus}
        autoComplete="off"
      />
      {workshops.length > 0 && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen((prev) => !prev)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
          aria-label="Show saved workshops"
        >
          <ChevronDown size={14} />
        </button>
      )}

      {open && suggestions.length > 0 && (
        <div
          onMouseDown={() => blurTimer.current && clearTimeout(blurTimer.current)}
          className="absolute z-50 mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg overflow-hidden"
        >
          <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 border-b border-slate-100 dark:border-slate-800">
            Saved workshops
          </p>
          <ul className="max-h-52 overflow-y-auto py-1">
            {suggestions.map((workshop) => (
              <li key={workshop.name}>
                <button
                  type="button"
                  onClick={() => pick(workshop)}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <Wrench size={12} className="text-amber-500 shrink-0" />
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                    {workshop.name}
                  </span>
                  <span className="ml-auto text-[10px] text-slate-400 shrink-0">
                    {workshop.contact ? `${workshop.contact} · ` : ''}
                    {workshop.order_count} order{workshop.order_count === 1 ? '' : 's'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {value.trim() && !isExactMatch && (
            <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 border-t border-slate-100 dark:border-slate-800">
              Keep typing to save “{value.trim()}” as a new workshop.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
