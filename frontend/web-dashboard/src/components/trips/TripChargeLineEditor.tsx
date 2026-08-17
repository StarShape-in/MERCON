import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { surchargeRuleService, SurchargeRule } from '@/services/rateCardService';
import { SUGGESTED_CHARGE_UNITS } from '@mercon/shared-types';
import { TripChargeInput } from '@/services/tripService';
import ChargeTypeCombobox from '@/components/rate-cards/ChargeTypeCombobox';

interface TripChargeLineEditorProps {
  customerId?: string;
  rateCardId?: string | null;
  value: TripChargeInput[];
  onChange: (charges: TripChargeInput[]) => void;
}

const emptyLine = (): TripChargeInput => ({
  surchargeRuleId: null,
  charge_type: '',
  unit: null,
  rate: 0,
  quantity: 1,
  amount: 0,
});

/**
 * The itemised list of customer-billable extras applied to one trip —
 * "2 additional stops at 200 SAR = 400 SAR". Shared between
 * PostTripSettlementModal and TripDetailsPage's settlement flow so there is
 * one place this UI lives, not two drifting copies.
 *
 * Picking a saved SurchargeRule pre-fills type/unit/rate and defaults
 * quantity to 1; amount = quantity * rate by default but stays independently
 * editable, matching how every other financial field on a trip already works.
 */
export function TripChargeLineEditor({ customerId, rateCardId, value, onChange }: TripChargeLineEditorProps) {
  const { data: rules = [] } = useQuery({
    queryKey: ['surcharge-rules', customerId, rateCardId],
    queryFn: () => surchargeRuleService.list({ customerId, rateCardId: rateCardId || undefined, active_only: true }),
    enabled: !!customerId,
  });

  const updateLine = (index: number, patch: Partial<TripChargeInput>) => {
    const next = value.map((line, i) => (i === index ? { ...line, ...patch } : line));
    onChange(next);
  };

  const pickRule = (index: number, ruleId: string) => {
    if (ruleId === '__custom__') {
      updateLine(index, { surchargeRuleId: null });
      return;
    }
    const rule = rules.find((r) => r.id === ruleId);
    if (!rule) return;
    const quantity = value[index].quantity || 1;
    updateLine(index, {
      surchargeRuleId: rule.id,
      charge_type: rule.charge_type,
      unit: rule.unit,
      rate: rule.rate,
      quantity,
      amount: quantity * rule.rate,
    });
  };

  const setQuantity = (index: number, quantity: number) => {
    const rate = value[index].rate || 0;
    updateLine(index, { quantity, amount: quantity * rate });
  };

  const setRate = (index: number, rate: number) => {
    const quantity = value[index].quantity || 0;
    updateLine(index, { rate, amount: quantity * rate });
  };

  const removeLine = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const addLine = () => onChange([...value, emptyLine()]);

  return (
    <div className="space-y-3">
      <datalist id="charge-unit-suggestions">
        {SUGGESTED_CHARGE_UNITS.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>
      {value.map((line, index) => {
        const selectValue = line.surchargeRuleId || '__custom__';
        return (
          <div key={index} className="p-3 rounded-xl border border-black/[0.08] dark:border-slate-700 bg-black/[0.015] dark:bg-slate-800/50 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <select
                value={selectValue}
                onChange={(e) => pickRule(index, e.target.value)}
                className="flex-1 h-8 bg-white dark:bg-slate-900 border border-black/[0.12] dark:border-slate-700 rounded-lg px-2 text-xs font-semibold outline-none focus:border-brand"
              >
                <option value="__custom__">Custom charge...</option>
                {rules.map((r: SurchargeRule) => (
                  <option key={r.id} value={r.id}>
                    {r.charge_type}
                    {r.unit ? ` (${r.unit})` : ''} — {r.currency} {r.rate}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeLine(index)}
                className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                aria-label="Remove charge"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {!line.surchargeRuleId && (
              <div className="grid grid-cols-2 gap-2">
                <ChargeTypeCombobox
                  value={line.charge_type}
                  onChange={(v) => updateLine(index, { charge_type: v })}
                  customerId={customerId}
                />
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Unit (optional)</label>
                  <input
                    value={line.unit || ''}
                    onChange={(e) => updateLine(index, { unit: e.target.value || null })}
                    placeholder="e.g. per stop"
                    className="w-full h-9 bg-white dark:bg-slate-900 border border-black/[0.12] dark:border-slate-700 rounded-lg px-2.5 text-xs outline-none focus:border-brand"
                    list="charge-unit-suggestions"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Quantity</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.quantity}
                  onChange={(e) => setQuantity(index, parseFloat(e.target.value) || 0)}
                  className="w-full h-9 bg-white dark:bg-slate-900 border border-black/[0.12] dark:border-slate-700 rounded-lg px-2.5 text-xs font-mono font-semibold outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Rate (SAR)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.rate}
                  onChange={(e) => setRate(index, parseFloat(e.target.value) || 0)}
                  className="w-full h-9 bg-white dark:bg-slate-900 border border-black/[0.12] dark:border-slate-700 rounded-lg px-2.5 text-xs font-mono font-semibold outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Amount (SAR)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.amount}
                  onChange={(e) => updateLine(index, { amount: parseFloat(e.target.value) || 0 })}
                  className="w-full h-9 bg-white dark:bg-slate-900 border border-black/[0.12] dark:border-slate-700 rounded-lg px-2.5 text-xs font-mono font-bold outline-none focus:border-brand"
                />
              </div>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addLine}
        className="w-full py-2 rounded-xl border border-dashed border-black/[0.15] dark:border-slate-700 text-xs font-semibold text-slate-500 hover:text-brand hover:border-brand transition-colors flex items-center justify-center gap-1.5"
      >
        <Plus size={14} /> Add charge
      </button>

      {value.length > 0 && (
        <div className="flex justify-end text-xs font-bold text-slate-700 dark:text-slate-200 pt-1">
          Total extra charges: SAR {value.reduce((s, l) => s + (Number(l.amount) || 0), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      )}
    </div>
  );
}

export default TripChargeLineEditor;
