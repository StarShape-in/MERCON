import React from 'react';
import { RATE_CATEGORIES, type RateCategory } from '@mercon/shared-types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RateCategoryBadge } from './RateCategoryBadge';
import { Tag, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface RateCategorySelectProps {
  value: string | null | undefined;
  onValueChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  showBadgesInOptions?: boolean;
}

const NONE_VALUE = '__none__';

export function RateCategorySelect({
  value,
  onValueChange,
  placeholder = 'Select Rate Category...',
  allowClear = true,
  disabled = false,
  className,
  size = 'default',
  showBadgesInOptions = true,
}: RateCategorySelectProps) {
  const currentValue = value || NONE_VALUE;

  const heightClass = {
    sm: 'h-8 text-[11px]',
    default: 'h-9 text-xs',
    lg: 'h-10 text-sm',
  }[size];

  return (
    <div className="relative flex items-center w-full">
      <Select
        value={currentValue}
        onValueChange={(val) => onValueChange(val === NONE_VALUE ? '' : val)}
        disabled={disabled}
      >
        <SelectTrigger
          className={cn(
            'w-full font-semibold border-slate-200 bg-white transition-colors focus:ring-1 focus:ring-[#E8450F]',
            heightClass,
            className
          )}
        >
          <SelectValue placeholder={placeholder}>
            {value ? (
              <div className="flex items-center gap-2 overflow-hidden">
                <RateCategoryBadge category={value} size={size === 'lg' ? 'default' : 'sm'} />
              </div>
            ) : (
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                {placeholder}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[280px] bg-white border border-slate-200 shadow-md">
          {allowClear && (
            <SelectItem value={NONE_VALUE} className="text-xs text-slate-400 font-semibold cursor-pointer">
              Any / Unspecified Category
            </SelectItem>
          )}
          {RATE_CATEGORIES.map((cat) => (
            <SelectItem key={cat} value={cat} className="text-xs font-semibold cursor-pointer py-1.5">
              {showBadgesInOptions ? (
                <div className="flex items-center gap-2">
                  <RateCategoryBadge category={cat} size="sm" />
                </div>
              ) : (
                <span>{cat}</span>
              )}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {allowClear && value && !disabled && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onValueChange('');
          }}
          className="absolute right-7 w-4 h-4 text-slate-400 hover:text-slate-700 p-0 rounded-full"
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}

export default RateCategorySelect;
