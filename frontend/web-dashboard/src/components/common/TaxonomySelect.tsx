import React, { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  TaxonomyCategory,
  TaxonomyOption,
  getAllTaxonomyOptions,
  saveCustomTaxonomyOption,
  TAXONOMY_UPDATED_EVENT,
  COLOR_PALETTES,
  normalizeCode,
} from '@/utils/taxonomyRegistry';

export interface TaxonomySelectProps {
  category: TaxonomyCategory;
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
const ADD_CUSTOM_VALUE = '__add_custom__';

export function TaxonomySelect({
  category,
  value,
  onValueChange,
  placeholder,
  allowClear = true,
  disabled = false,
  className,
  size = 'default',
  showBadgesInOptions = true,
}: TaxonomySelectProps) {
  const [options, setOptions] = useState<TaxonomyOption[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [selectedColorId, setSelectedColorId] = useState(COLOR_PALETTES[0].id);

  const categoryTitle =
    category === 'VEHICLE_CLASS'
      ? 'Vehicle Class'
      : category === 'LINE_TYPE'
      ? 'Line Type'
      : 'Operation Type';

  const defaultPlaceholder = placeholder || `Select ${categoryTitle}...`;

  const refreshOptions = () => {
    setOptions(getAllTaxonomyOptions(category));
  };

  useEffect(() => {
    refreshOptions();
    window.addEventListener(TAXONOMY_UPDATED_EVENT, refreshOptions);
    return () => {
      window.removeEventListener(TAXONOMY_UPDATED_EVENT, refreshOptions);
    };
  }, [category]);

  const currentValue = value
    ? options.find(
        o => normalizeCode(o.code) === normalizeCode(value) || o.code === value || o.label === value
      )?.code || value
    : NONE_VALUE;

  const heightClass = {
    sm: 'h-8 text-[11px]',
    default: 'h-9 text-xs',
    lg: 'h-10 text-sm',
  }[size];

  const handleSelectChange = (val: string) => {
    if (val === ADD_CUSTOM_VALUE) {
      setIsModalOpen(true);
      return;
    }
    onValueChange(val === NONE_VALUE ? '' : val);
  };

  const handleSaveCustom = () => {
    if (!newLabel.trim()) return;

    try {
      const created = saveCustomTaxonomyOption({
        label: newLabel,
        category,
        colorThemeId: selectedColorId,
      });

      onValueChange(created.code);
      setNewLabel('');
      setIsModalOpen(false);
      refreshOptions();
    } catch (e) {
      console.error('Failed to add custom option', e);
    }
  };

  return (
    <>
      <Select value={currentValue} onValueChange={handleSelectChange} disabled={disabled}>
        <SelectTrigger
          className={cn(
            'w-full font-bold border-slate-200 bg-white dark:bg-[#2D2B2C] dark:border-slate-800 transition-colors focus:ring-1 focus:ring-brand rounded-xl',
            heightClass,
            className
          )}
        >
          <SelectValue placeholder={defaultPlaceholder} />
        </SelectTrigger>

        <SelectContent className="z-[9999] max-h-64 shadow-xl border-slate-200 dark:border-slate-800 w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)]">
          {allowClear && (
            <SelectItem value={NONE_VALUE} className="text-xs font-medium text-slate-400">
              None / Unspecified
            </SelectItem>
          )}

          {options.map(opt => (
            <SelectItem
              key={opt.id}
              value={opt.code}
              className="cursor-pointer text-xs font-semibold py-1.5 px-2 rounded-md"
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'w-2.5 h-2.5 rounded-full shrink-0 border shadow-2xs',
                    opt.colorTheme.bg,
                    opt.colorTheme.border
                  )}
                  style={{ backgroundColor: opt.colorTheme.hex }}
                />
                <span className="font-bold text-slate-800 dark:text-slate-100">{opt.label}</span>
                {opt.isCustom && (
                  <span className="text-[9px] font-extrabold uppercase px-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    Custom
                  </span>
                )}
              </div>
            </SelectItem>
          ))}

          <SelectItem
            value={ADD_CUSTOM_VALUE}
            className="cursor-pointer text-xs font-extrabold text-[#FA634E] hover:text-[#FA634E] hover:bg-[#FA634E]/10 py-2 border-t border-slate-100 dark:border-slate-800 mt-1"
          >
            <div className="flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create New {categoryTitle}</span>
            </div>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Creation Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#1E1C1D] border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-extrabold text-slate-900 dark:text-white">
              <Sparkles className="w-4 h-4 text-[#FA634E]" />
              Add New {categoryTitle}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {categoryTitle} Name / Value *
              </Label>
              <Input
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                placeholder={
                  category === 'VEHICLE_CLASS'
                    ? 'e.g., 15 TON, 30 TON, 12M REEFER'
                    : category === 'LINE_TYPE'
                    ? 'e.g., Dedicated Daily, Express Intercity'
                    : 'e.g., Project Rate, Spot Adhoc'
                }
                className="h-9 text-xs font-semibold rounded-xl"
                autoFocus
              />
            </div>

            {/* Universal Color Palette Picker */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Universal Badge Color Theme
              </Label>
              <div className="grid grid-cols-4 gap-2 max-h-44 overflow-y-auto p-1 border border-slate-100 dark:border-slate-800 rounded-xl">
                {COLOR_PALETTES.map(palette => {
                  const isSelected = selectedColorId === palette.id;
                  return (
                    <button
                      key={palette.id}
                      type="button"
                      onClick={() => setSelectedColorId(palette.id)}
                      className={cn(
                        'flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-center group relative',
                        palette.bg,
                        palette.border,
                        isSelected
                          ? 'ring-2 ring-[#FA634E] ring-offset-1 border-[#FA634E]'
                          : 'opacity-80 hover:opacity-100'
                      )}
                    >
                      <span
                        className="w-4 h-4 rounded-full border mb-1 shadow-2xs"
                        style={{ backgroundColor: palette.hex }}
                      />
                      <span className={cn('text-[9px] font-bold truncate max-w-full', palette.text)}>
                        {palette.name.split(' ')[0]}
                      </span>
                      {isSelected && (
                        <span className="absolute top-1 right-1 w-3 h-3 rounded-full bg-[#FA634E] text-white flex items-center justify-center">
                          <Check size={8} strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="h-8.5 text-xs font-bold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSaveCustom}
              disabled={!newLabel.trim()}
              className="h-8.5 text-xs font-bold bg-[#FA634E] hover:bg-[#E04F3A] text-white rounded-xl shadow-md"
            >
              Save {categoryTitle}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default TaxonomySelect;
