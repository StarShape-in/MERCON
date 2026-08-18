import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { VehicleTypeBadge } from './VehicleTypeBadge';
import { Truck, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { getAllVehicleTypes, saveCustomVehicleType } from '@/utils/customVehicleTypeStore';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export interface VehicleTypeSelectProps {
  value: string | null | undefined;
  onValueChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  showBadgesInOptions?: boolean;
  /** Override the option list (defaults to canonical + user custom types). */
  options?: readonly string[];
}

const NONE_VALUE = '__none__';
const ADD_CUSTOM_VALUE = '__add_custom__';

export function VehicleTypeSelect({
  value,
  onValueChange,
  placeholder = 'Select Vehicle Type...',
  allowClear = true,
  disabled = false,
  className,
  size = 'default',
  showBadgesInOptions = true,
  options: customOptionsProp,
}: VehicleTypeSelectProps) {
  const [allTypes, setAllTypes] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  useEffect(() => {
    if (customOptionsProp) {
      setAllTypes([...customOptionsProp]);
    } else {
      setAllTypes(getAllVehicleTypes());
    }
  }, [customOptionsProp]);

  const currentValue = value || NONE_VALUE;

  const heightClass = {
    sm: 'h-8 text-[11px]',
    default: 'h-9 text-xs',
    lg: 'h-10 text-sm',
  }[size];

  const handleSelectChange = (val: string) => {
    if (val === ADD_CUSTOM_VALUE) {
      setIsAddModalOpen(true);
      return;
    }
    onValueChange(val === NONE_VALUE ? '' : val);
  };

  const handleSaveCustom = () => {
    if (!newTypeName.trim()) return;
    const updated = saveCustomVehicleType(newTypeName);
    setAllTypes(updated);
    const addedVal = newTypeName.trim().toUpperCase();
    onValueChange(addedVal);
    setNewTypeName('');
    setIsAddModalOpen(false);
  };

  return (
    <>
      <div className="relative flex items-center w-full">
        <Select
          value={currentValue}
          onValueChange={handleSelectChange}
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
            {allTypes.map((vType) => (
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

            <SelectItem
              value={ADD_CUSTOM_VALUE}
              className="text-xs font-bold text-brand cursor-pointer py-2 border-t border-slate-100 bg-slate-50/80 hover:bg-orange-50/80"
            >
              <span className="flex items-center gap-1.5 text-brand">
                <Plus className="w-3.5 h-3.5 text-brand" /> + Add Custom Capacity / Type...
              </span>
            </SelectItem>
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

      {/* Add Custom Type Modal Dialog */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-sm rounded-2xl p-5 bg-white border border-slate-100 shadow-xl z-[99999]">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-4 h-4 text-brand" /> Add Custom Vehicle Type
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-xs text-slate-500">
              Enter custom capacity or vehicle classification (e.g. <span className="font-mono text-slate-700">20 TON</span>, <span className="font-mono text-slate-700">25 TON</span>, <span className="font-mono text-slate-700">12M REEFER</span>):
            </p>
            <Input
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              placeholder="e.g. 20 TON or 25 TON..."
              className="h-9 text-xs rounded-xl border-slate-200 focus:border-brand"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveCustom();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
              className="h-8 text-xs font-semibold rounded-xl border-slate-200"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveCustom}
              className="h-8 text-xs font-bold rounded-xl bg-brand hover:bg-brand-dark text-white"
            >
              Add & Select
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default VehicleTypeSelect;
