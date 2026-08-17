import { useState } from 'react';
import { Edit3, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SUGGESTED_CHARGE_UNITS } from '@mercon/shared-types';
import { cn } from '@/lib/utils';

interface UnitComboboxProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

/**
 * What quantity a surcharge is counted in — "per stop", "per hour". A real
 * dropdown of SUGGESTED_CHARGE_UNITS (same List/Custom toggle idiom as
 * ChargeTypeCombobox), not a plain text input: a native <datalist> looks like
 * a plain textbox until the user notices the tiny arrow, which isn't a
 * dropdown in any way people expect one to behave.
 *
 * Deliberately does NOT default itself to a value on mount — the caller
 * (ChargeTypeCombobox's onChange handler) fills this in from
 * SUGGESTED_UNIT_BY_CHARGE_TYPE once a charge type is picked, e.g.
 * "Additional Stop" -> "per stop". Self-defaulting here would grab a value
 * before that connection ever gets a chance to run.
 */
export function UnitCombobox({ value, onChange, className }: UnitComboboxProps) {
  const [isCustom, setIsCustom] = useState(() => !!value && !SUGGESTED_CHARGE_UNITS.includes(value as any));

  return (
    <div className={cn('space-y-1.5', className)}>
      <div className="flex items-center justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsCustom(!isCustom)}
          className="h-5 px-1.5 text-[10px] font-semibold text-slate-500 hover:text-brand"
        >
          {isCustom ? <Check className="w-2.5 h-2.5 mr-0.5" /> : <Edit3 className="w-2.5 h-2.5 mr-0.5" />}
          {isCustom ? 'List' : 'Custom'}
        </Button>
      </div>

      {isCustom ? (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. per stop"
          className="h-9 text-xs"
        />
      ) : (
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Select a unit..." />
          </SelectTrigger>
          <SelectContent>
            {SUGGESTED_CHARGE_UNITS.map((u) => (
              <SelectItem key={u} value={u} className="text-xs">
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

export default UnitCombobox;
