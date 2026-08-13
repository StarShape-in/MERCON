import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';
import { matchesSearch } from '@/lib/search';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface ComboboxOption {
  value: string;
  label: string;
  keywords?: string;
  disabled?: boolean;
}

interface ComboboxProps {
  id?: string;
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

export function Combobox({
  id,
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  emptyText = 'No results found.',
  className,
  triggerClassName,
  disabled,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={disabled ? false : open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'h-10 w-full justify-between text-xs font-medium border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl px-3.5 shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-800/60',
            !selected && 'text-slate-400 dark:text-slate-500 font-normal',
            triggerClassName
          )}
        >
          <span className="truncate">{selected ? selected.label : placeholder}</span>
          <ChevronDown className="ml-1.5 h-4 w-4 shrink-0 opacity-50 text-slate-400" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          'w-[--radix-popover-trigger-width] min-w-[280px] p-0 rounded-xl shadow-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 z-[9999]',
          className
        )}
      >
        <Command
          filter={(itemValue, search) => {
            const option = options.find((o) => o.value === itemValue);
            return matchesSearch(search, [option?.label, option?.keywords]) ? 1 : 0;
          }}
        >
          <CommandInput
            placeholder={searchPlaceholder}
            className="h-10 text-xs border-b border-slate-100 dark:border-slate-800"
          />
          <CommandList className="max-h-64 p-1 overflow-y-auto overscroll-contain">
            <CommandEmpty className="py-6 text-center text-xs text-slate-500">{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = value === option.value;
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className={cn(
                      'flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-xs my-0.5',
                      isSelected
                        ? 'bg-orange-50 dark:bg-orange-950/40 text-[#E8450F] font-semibold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300',
                      option.disabled && 'opacity-50 cursor-not-allowed pointer-events-none'
                    )}
                    onSelect={(currentValue) => {
                      if (option.disabled) return;
                      onChange(currentValue === value ? value : currentValue);
                      setOpen(false);
                    }}
                  >
                    <span className="truncate flex-1">{option.label}</span>
                    <Check
                      className={cn(
                        'h-4 w-4 text-[#E8450F] shrink-0 ml-2',
                        isSelected ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

