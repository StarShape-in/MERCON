import React from 'react';
import { ArrowUpDown, ChevronDown, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface SortOption<T extends string = string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

export interface SortDropdownProps<T extends string = string> {
  value: T;
  onChange: (value: any) => void;
  options: SortOption<T>[];
  className?: string;
  triggerClassName?: string;
  showSelectedLabel?: boolean;
}

export function SortDropdown<T extends string = string>({
  value,
  onChange,
  options,
  className,
  triggerClassName,
  showSelectedLabel = true,
}: SortDropdownProps<T>) {
  const currentOption = options.find((opt) => opt.value === value) || options[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-9 px-3 gap-1.5 text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 shadow-2xs text-slate-700 dark:text-slate-200 rounded-lg shrink-0 transition-colors cursor-pointer outline-none',
            className,
            triggerClassName
          )}
        >
          {currentOption?.icon || <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />}
          <span>{`Sort by: ${currentOption?.label || 'Default'}`}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 opacity-70 ml-0.5 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl z-50">
        <DropdownMenuLabel className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2 py-1">
          Sort Order
        </DropdownMenuLabel>
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => onChange(option.value)}
              className={cn(
                'text-xs font-medium py-1.5 px-2.5 rounded-lg cursor-pointer flex items-center justify-between transition-colors',
                isSelected
                  ? 'bg-orange-50 dark:bg-orange-950/40 text-brand font-bold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              )}
            >
              <span className="flex items-center gap-2">
                {option.icon}
                {option.label}
              </span>
              {isSelected && <Check className="w-3.5 h-3.5 text-brand ml-2 shrink-0" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default SortDropdown;
