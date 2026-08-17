import React from 'react';
import { VEHICLE_TYPES, type VehicleType } from '@mercon/shared-types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VehicleTypeBadge } from './VehicleTypeBadge';
import { Truck, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface VehicleTypeSelectProps {
  value: string | null | undefined;
  onValueChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  showBadgesInOptions?: boolean;
  /** Override the option list (defaults to the full shared VEHICLE_TYPES list). */
  options?: readonly string[];
}

const NONE_VALUE = '__none__';

export function VehicleTypeSelect({
  value,
  onValueChange,
  placeholder = 'Select Vehicle Type...',
  allowClear = true,
  disabled = false,
  className,
  size = 'default',
  showBadgesInOptions = true,
  options = VEHICLE_TYPES,
}: VehicleTypeSelectProps) {
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
            'w-full font-semibold border-slate-200 bg-white transition-colors focus:ring-1 focus:ring-brand',
            heightClass,
            className
          )}
        >
          <SelectValue placeholder={placeholder}>
            {value ? (
              <div className="flex items-center gap-2 overflow-hidden">
                <VehicleTypeBadge vehicleType={value} size={size === 'lg' ? 'default' : 'sm'} />
              </div>
            ) : (
              <span className="text-slate-400 font-medium flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-slate-400" />
                {placeholder}
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[280px] bg-white border border-slate-200 shadow-md">
          {allowClear && (
            <SelectItem value={NONE_VALUE} className="text-xs text-slate-400 font-semibold cursor-pointer">
              Any / All Vehicle Types
            </SelectItem>
          )}
          {options.map((vType) => (
            <SelectItem key={vType} value={vType} className="text-xs font-semibold cursor-pointer py-1.5">
              {showBadgesInOptions ? (
                <div className="flex items-center gap-2">
                  <VehicleTypeBadge vehicleType={vType} size="sm" />
                </div>
              ) : (
                <span>{vType}</span>
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

export default VehicleTypeSelect;
