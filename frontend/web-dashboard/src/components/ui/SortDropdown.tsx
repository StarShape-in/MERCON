import React from 'react';
import { ArrowUpDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface SortOption {
  value: string;
  label: string;
  icon?: React.ElementType;
}

interface SortDropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: SortOption[];
  className?: string;
  placeholder?: string;
}

export function SortDropdown({
  value,
  onChange,
  options,
  className = '',
  placeholder = 'Sort by...',
}: SortDropdownProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={`h-9 w-[160px] text-xs font-semibold bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 ${className}`}>
        <div className="flex items-center gap-1.5 truncate">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <SelectValue placeholder={placeholder} />
        </div>
      </SelectTrigger>
      <SelectContent side="bottom" align="end" className="text-xs font-semibold">
        {options.map((opt) => (
          <SelectItem key={opt.value} value={opt.value} className="text-xs font-semibold">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default SortDropdown;
