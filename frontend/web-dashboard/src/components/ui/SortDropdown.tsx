import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
}

export function SortDropdown<T extends string = string>({
  value,
  onChange,
  options,
  className,
  triggerClassName,
}: SortDropdownProps<T>) {
  const currentOption = options.find((opt) => opt.value === value) || options[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-9 gap-1.5 text-xs font-medium bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs text-slate-700 dark:text-slate-200',
            className,
            triggerClassName
          )}
        >
          {currentOption?.icon || <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />}
          <span>{currentOption?.label || 'Sort'}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              'text-xs font-medium cursor-pointer flex items-center justify-between',
              option.value === value ? 'bg-slate-100 dark:bg-slate-800 font-bold text-brand' : ''
            )}
          >
            <span className="flex items-center gap-2">
              {option.icon}
              {option.label}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default SortDropdown;
