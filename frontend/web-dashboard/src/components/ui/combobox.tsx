import { useState } from 'react';
import { Check, ChevronDown, Plus } from 'lucide-react';

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
  onAddNew?: () => void;
  addNewLabel?: string;
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
  onAddNew,
  addNewLabel,
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
            <CommandEmpty className="py-6 px-4 text-center text-xs text-slate-500 space-y-3">
              <p className="text-slate-500 dark:text-slate-400 font-medium">{emptyText}</p>
              {onAddNew && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs font-semibold border-indigo-200 text-indigo-600 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950/50 shadow-2xs"
                  onClick={() => {
                    setOpen(false);
                    onAddNew();
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1 text-indigo-600 dark:text-indigo-400" />
                  {addNewLabel || 'Add New'}
                </Button>
              )}
            </CommandEmpty>
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
                        ? 'bg-orange-50 dark:bg-orange-950/40 text-brand font-semibold'
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
                        'h-4 w-4 text-brand shrink-0 ml-2',
                        isSelected ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          {onAddNew && (
            <div className="p-1.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 rounded-b-xl">
              <button
                type="button"
                className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 hover:bg-indigo-100/60 dark:text-indigo-400 dark:hover:bg-indigo-950/60 transition-colors"
                onClick={() => {
                  setOpen(false);
                  onAddNew();
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                {addNewLabel || 'Add New'}
              </button>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}


