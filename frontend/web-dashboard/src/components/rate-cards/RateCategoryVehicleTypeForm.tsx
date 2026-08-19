import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RateCategorySelect } from './RateCategorySelect';
import { VehicleTypeSelect } from './VehicleTypeSelect';
import { BillingTypeSelect } from './BillingTypeSelect';
import { RateCategoryBadge } from './RateCategoryBadge';
import { VehicleTypeBadge } from './VehicleTypeBadge';
import { BillingTypeBadge } from './BillingTypeBadge';
import { Edit3, Check, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface RateCategoryVehicleTypeFormProps {
  vehicleType: string | null | undefined;
  onVehicleTypeChange: (val: string) => void;
  rateCategory: string | null | undefined;
  onRateCategoryChange: (val: string) => void;
  /** Omit to hide the Billing Type field entirely (e.g. surcharge rows that don't have one). */
  billingType?: string | null;
  onBillingTypeChange?: (val: string) => void;
  showPreviewBar?: boolean;
  required?: boolean;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  /** Override the Vehicle Type dropdown's option list (defaults to the full shared list). */
  vehicleTypeOptions?: readonly string[];
  /** Override the Rate Category dropdown's option list (defaults to the full shared list). */
  rateCategoryOptions?: readonly string[];
  /** Override the Billing Type dropdown's option list (defaults to the full shared list). */
  billingTypeOptions?: readonly string[];
}

export function RateCategoryVehicleTypeForm({
  vehicleType,
  onVehicleTypeChange,
  rateCategory,
  onRateCategoryChange,
  billingType,
  onBillingTypeChange,
  showPreviewBar = true,
  required = false,
  className,
  size = 'default',
  vehicleTypeOptions,
  rateCategoryOptions,
  billingTypeOptions,
}: RateCategoryVehicleTypeFormProps) {
  const [isCustomVehicleType, setIsCustomVehicleType] = useState(false);
  const [isCustomRateCategory, setIsCustomRateCategory] = useState(false);
  const [isCustomBillingType, setIsCustomBillingType] = useState(false);

  return (
    <TooltipProvider>
      <div className={cn('space-y-3 min-w-0', className)}>
        <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0', onBillingTypeChange && 'sm:grid-cols-3')}>
          
          {/* Vehicle Type Field */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center justify-between gap-1 min-w-0">
              <div className="flex items-center gap-1 min-w-0">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                  Vehicle Type
                </Label>
                {!required && (
                  <span className="text-[10px] text-slate-400 shrink-0 font-normal">(opt)</span>
                )}
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px] font-semibold">
                    Target vehicle specification (e.g. 5 TON, 10 TON, 40 FEET)
                  </TooltipContent>
                </Tooltip>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCustomVehicleType(!isCustomVehicleType)}
                className="h-5 px-1 text-[10px] font-medium text-slate-400 hover:text-brand shrink-0"
              >
                {isCustomVehicleType ? <Check className="w-2.5 h-2.5 mr-0.5" /> : <Edit3 className="w-2.5 h-2.5 mr-0.5" />}
                {isCustomVehicleType ? 'Select' : 'Custom'}
              </Button>
            </div>

            {isCustomVehicleType ? (
              <Input
                value={vehicleType || ''}
                onChange={(e) => onVehicleTypeChange(e.target.value)}
                placeholder="Enter custom type..."
                className="h-9 text-xs font-medium"
              />
            ) : (
              <VehicleTypeSelect
                value={vehicleType}
                onValueChange={onVehicleTypeChange}
                size={size}
                options={vehicleTypeOptions}
                placeholder="Select vehicle..."
              />
            )}
          </div>

          {/* Rate Category Field */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center justify-between gap-1 min-w-0">
              <div className="flex items-center gap-1 min-w-0">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                  Rate Category
                </Label>
                {!required && (
                  <span className="text-[10px] text-slate-400 shrink-0 font-normal">(opt)</span>
                )}
                <Tooltip>
                  <TooltipTrigger>
                    <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer" />
                  </TooltipTrigger>
                  <TooltipContent className="text-[10px] font-semibold">
                    Pricing structure (e.g. Trip, Monthly Round, Daily Local)
                  </TooltipContent>
                </Tooltip>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsCustomRateCategory(!isCustomRateCategory)}
                className="h-5 px-1 text-[10px] font-medium text-slate-400 hover:text-brand shrink-0"
              >
                {isCustomRateCategory ? <Check className="w-2.5 h-2.5 mr-0.5" /> : <Edit3 className="w-2.5 h-2.5 mr-0.5" />}
                {isCustomRateCategory ? 'Select' : 'Custom'}
              </Button>
            </div>

            {isCustomRateCategory ? (
              <Input
                value={rateCategory || ''}
                onChange={(e) => onRateCategoryChange(e.target.value)}
                placeholder="Enter custom category..."
                className="h-9 text-xs font-medium"
              />
            ) : (
              <RateCategorySelect
                value={rateCategory}
                onValueChange={onRateCategoryChange}
                size={size}
                options={rateCategoryOptions}
                placeholder="Select category..."
              />
            )}
          </div>

          {/* Billing Type Field */}
          {onBillingTypeChange && (
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center justify-between gap-1 min-w-0">
                <div className="flex items-center gap-1 min-w-0">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                    Billing Type
                  </Label>
                  {!required && (
                    <span className="text-[10px] text-slate-400 shrink-0 font-normal">(opt)</span>
                  )}
                  <Tooltip>
                    <TooltipTrigger>
                      <HelpCircle className="w-3 h-3 text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent className="text-[10px] font-semibold">
                      How this is billed (e.g. Monthly, Extra), independent of trip shape
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsCustomBillingType(!isCustomBillingType)}
                  className="h-5 px-1 text-[10px] font-medium text-slate-400 hover:text-brand shrink-0"
                >
                  {isCustomBillingType ? <Check className="w-2.5 h-2.5 mr-0.5" /> : <Edit3 className="w-2.5 h-2.5 mr-0.5" />}
                  {isCustomBillingType ? 'Select' : 'Custom'}
                </Button>
              </div>

              {isCustomBillingType ? (
                <Input
                  value={billingType || ''}
                  onChange={(e) => onBillingTypeChange(e.target.value)}
                  placeholder="Enter custom billing..."
                  className="h-9 text-xs font-medium"
                />
              ) : (
                <BillingTypeSelect
                  value={billingType}
                  onValueChange={onBillingTypeChange}
                  size={size}
                  options={billingTypeOptions}
                  placeholder="Select billing..."
                />
              )}
            </div>
          )}
        </div>

        {/* Live Preview Bar */}
        {showPreviewBar && (vehicleType || rateCategory || billingType) && (
          <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Specs:</span>
            <div className="flex items-center gap-2">
              <VehicleTypeBadge vehicleType={vehicleType} size="sm" />
              <RateCategoryBadge category={rateCategory} size="sm" />
              {onBillingTypeChange && <BillingTypeBadge billingType={billingType} size="sm" />}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

export default RateCategoryVehicleTypeForm;
