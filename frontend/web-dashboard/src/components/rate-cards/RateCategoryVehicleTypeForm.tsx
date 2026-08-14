import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RateCategorySelect } from './RateCategorySelect';
import { VehicleTypeSelect } from './VehicleTypeSelect';
import { RateCategoryBadge } from './RateCategoryBadge';
import { VehicleTypeBadge } from './VehicleTypeBadge';
import { Edit3, Check, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface RateCategoryVehicleTypeFormProps {
  vehicleType: string | null | undefined;
  onVehicleTypeChange: (val: string) => void;
  rateCategory: string | null | undefined;
  onRateCategoryChange: (val: string) => void;
  showPreviewBar?: boolean;
  required?: boolean;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

export function RateCategoryVehicleTypeForm({
  vehicleType,
  onVehicleTypeChange,
  rateCategory,
  onRateCategoryChange,
  showPreviewBar = true,
  required = false,
  className,
  size = 'default',
}: RateCategoryVehicleTypeFormProps) {
  const [isCustomVehicleType, setIsCustomVehicleType] = useState(false);
  const [isCustomRateCategory, setIsCustomRateCategory] = useState(false);

  return (
    <TooltipProvider>
      <div className={cn('space-y-3', className)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          
          {/* Vehicle Type Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                Vehicle Type
                {!required && (
                  <span className="font-semibold text-[10px] text-slate-400">(optional)</span>
                )}
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px] font-semibold">
                    Target vehicle specification (e.g. 5 TON, 10 TON, 40 FEET)
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCustomVehicleType(!isCustomVehicleType)}
                className="h-5 px-1.5 text-[10px] font-semibold text-slate-500 hover:text-brand"
              >
                {isCustomVehicleType ? <Check className="w-2.5 h-2.5 mr-0.5" /> : <Edit3 className="w-2.5 h-2.5 mr-0.5" />}
                {isCustomVehicleType ? 'List' : 'Custom'}
              </Button>
            </div>

            {isCustomVehicleType ? (
              <Input
                value={vehicleType || ''}
                onChange={(e) => onVehicleTypeChange(e.target.value)}
                placeholder="Enter custom vehicle specification..."
                className="h-9 text-xs font-semibold"
              />
            ) : (
              <VehicleTypeSelect
                value={vehicleType}
                onValueChange={onVehicleTypeChange}
                size={size}
              />
            )}
          </div>

          {/* Rate Category Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                Rate Category
                {!required && (
                  <span className="font-semibold text-[10px] text-slate-400">(optional)</span>
                )}
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px] font-semibold">
                    Pricing structure (e.g. Trip, Monthly Round, Daily Local)
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCustomRateCategory(!isCustomRateCategory)}
                className="h-5 px-1.5 text-[10px] font-semibold text-slate-500 hover:text-brand"
              >
                {isCustomRateCategory ? <Check className="w-2.5 h-2.5 mr-0.5" /> : <Edit3 className="w-2.5 h-2.5 mr-0.5" />}
                {isCustomRateCategory ? 'List' : 'Custom'}
              </Button>
            </div>

            {isCustomRateCategory ? (
              <Input
                value={rateCategory || ''}
                onChange={(e) => onRateCategoryChange(e.target.value)}
                placeholder="Enter custom rate category..."
                className="h-9 text-xs font-semibold"
              />
            ) : (
              <RateCategorySelect
                value={rateCategory}
                onValueChange={onRateCategoryChange}
                size={size}
              />
            )}
          </div>
        </div>

        {/* Live Preview Bar */}
        {showPreviewBar && (vehicleType || rateCategory) && (
          <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Specs:</span>
            <div className="flex items-center gap-2">
              <VehicleTypeBadge vehicleType={vehicleType} size="sm" />
              <RateCategoryBadge category={rateCategory} size="sm" />
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default RateCategoryVehicleTypeForm;
