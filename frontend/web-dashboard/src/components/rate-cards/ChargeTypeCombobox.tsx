import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Edit3, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { surchargeRuleService } from '@/services/rateCardService';
import { cn } from '@/lib/utils';

interface ChargeTypeComboboxProps {
  value: string;
  onChange: (val: string) => void;
  /** Scopes suggestions to one customer's own previously-used charge types. */
  customerId?: string;
  className?: string;
  placeholder?: string;
}

/**
 * A charge type is free text ("Additional Stop", "Labour Charge") — there is
 * no fixed list to pick from, because every customer's quotation names its
 * fees differently. But once someone has typed one, it should be selectable
 * next time rather than retyped, so this pairs the List/Custom toggle used
 * for RateCard.vehicle_type/rate_category (see RateCategoryVehicleTypeForm)
 * with a live query instead of a fixed constant array: a newly typed value
 * needs nothing extra to "save" — it becomes a suggestion the moment the
 * SurchargeRule holding it exists.
 */
export function ChargeTypeCombobox({ value, onChange, customerId, className, placeholder }: ChargeTypeComboboxProps) {
  const { data: knownTypes = [] } = useQuery({
    queryKey: ['surcharge-charge-types', customerId],
    queryFn: () => surchargeRuleService.getDistinctChargeTypes(customerId),
  });

  // Start in Custom mode until there's something to pick from, or the current
  // value isn't one of the known ones (e.g. editing a rule with an old type).
  const [isCustom, setIsCustom] = useState(() => knownTypes.length === 0 || (!!value && !knownTypes.includes(value)));

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

      {isCustom || knownTypes.length === 0 ? (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || 'e.g. Additional Stop'}
          className="h-9 text-xs font-semibold"
        />
      ) : (
        <Select value={value || undefined} onValueChange={onChange}>
          <SelectTrigger className="h-9 text-xs">
            <SelectValue placeholder="Select a charge type..." />
          </SelectTrigger>
          <SelectContent>
            {knownTypes.map((t) => (
              <SelectItem key={t} value={t} className="text-xs">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

export default ChargeTypeCombobox;
