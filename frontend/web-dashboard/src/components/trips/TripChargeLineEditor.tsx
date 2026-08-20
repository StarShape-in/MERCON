import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { surchargeRuleService, SurchargeRule } from '@/services/rateCardService';
import { TripChargeInput } from '@/services/tripService';
import ChargeTypeCombobox from '@/components/rate-cards/ChargeTypeCombobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SUGGESTED_UNIT_BY_CHARGE_TYPE } from '@mercon/shared-types';
import { useGridKeyboardNavigation } from '@/hooks/useGridKeyboardNavigation';
import { KbdBadge } from '@/components/ui/KbdBadge';

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
  save_as_rule: false,
});

const formatSar = (n: number) =>
  `SAR ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function TripChargeLineEditor({ customerId, rateCardId, value, onChange }: TripChargeLineEditorProps) {
  const { data: rules = [] } = useQuery({
    queryKey: ['surcharge-rules', customerId, rateCardId],
    queryFn: () => surchargeRuleService.list({ customerId, rateCardId: rateCardId || undefined, active_only: true }),
    enabled: !!customerId,
  });

  const addLine = () => {
    onChange([...value, emptyLine()]);
  };

  const updateLine = (index: number, patch: Partial<TripChargeInput>) => {
    const next = value.map((line, i) => (i === index ? { ...line, ...patch } : line));
    onChange(next);
  };

  const setChargeType = (index: number, type: string) => {
    const suggestedUnit = type in SUGGESTED_UNIT_BY_CHARGE_TYPE
      ? SUGGESTED_UNIT_BY_CHARGE_TYPE[type as keyof typeof SUGGESTED_UNIT_BY_CHARGE_TYPE]
      : undefined;
    updateLine(index, {
      charge_type: type,
      unit: suggestedUnit || value[index].unit || null,
    });
  };

  const pickRule = (index: number, ruleId: string) => {
    if (ruleId === '__custom__') {
      updateLine(index, { surchargeRuleId: null, save_as_rule: false });
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
      save_as_rule: false,
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

  const containerRef = useRef<HTMLDivElement>(null);

  useGridKeyboardNavigation({
    containerRef,
    rowCount: value.length,
    onAddRow: addLine,
    onDeleteRow: removeLine,
  });

  const total = value.reduce((s, l) => s + (Number(l.amount) || 0), 0);

  return (
    <div ref={containerRef} className="space-y-3">
      {value.length === 0 && (
        <div className="text-center py-6 px-4 rounded-xl border border-dashed border-black/[0.12] dark:border-slate-700 bg-black/[0.015] dark:bg-slate-800/30">
          <p className="text-xs font-bold text-slate-600 dark:text-slate-300">No extra charges added</p>
        </div>
      )}

      {value.map((line, index) => {
        const selectValue = line.surchargeRuleId || '__custom__';
        return (
          <div
            key={index}
            data-row-index={index}
            className="rounded-xl border border-black/[0.08] dark:border-slate-700 bg-white dark:bg-slate-900 overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-2 bg-black/[0.02] dark:bg-slate-800/60 border-b border-black/[0.06] dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Charge {index + 1}
              </span>
              <button
                type="button"
                onClick={() => removeLine(index)}
                className="w-6.5 h-6.5 shrink-0 rounded-md flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                aria-label="Remove charge"
              >
                <Trash2 size={13} />
              </button>
            </div>

            <div className="p-3 space-y-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                  Select Charge
                </label>
                <Select value={selectValue} onValueChange={(v) => pickRule(index, v)}>
                  <SelectTrigger className="h-9 text-xs font-semibold w-full">
                    <SelectValue placeholder="Select a saved surcharge..." />
                  </SelectTrigger>
                  <SelectContent>
                    {rules.map((r: SurchargeRule) => (
                      <SelectItem key={r.id} value={r.id} className="text-xs">
                        {r.charge_type}{r.unit ? ` (${r.unit})` : ''} — {r.currency} {r.rate}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__" className="text-xs font-bold text-brand">
                      + Add New Charge Type...
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!line.surchargeRuleId && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                      New Charge Type Name
                    </label>
                    <ChargeTypeCombobox
                      value={line.charge_type}
                      onChange={(v) => setChargeType(index, v)}
                      customerId={customerId}
                      placeholder="e.g. Detention Fee, Helper Fee"
                    />
                  </div>

                  <label className="flex items-center gap-2 pt-1 text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={!!line.save_as_rule}
                      onChange={(e) => updateLine(index, { save_as_rule: e.target.checked })}
                      className="w-4 h-4 rounded border-slate-300 text-brand focus:ring-brand accent-brand cursor-pointer"
                    />
                    <span>Save as default surcharge for this customer</span>
                  </label>
                </>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Quantity
                  </label>
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
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Rate (SAR)
                  </label>
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
                  <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 mb-1">
                    Amount (SAR)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.amount}
                    onChange={(e) => updateLine(index, { amount: parseFloat(e.target.value) || 0 })}
                    className="w-full h-9 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/50 rounded-lg px-2.5 text-xs font-mono font-bold text-amber-800 dark:text-amber-300 outline-none focus:border-brand"
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={addLine}
        className="w-full py-2.5 rounded-xl border border-dashed border-black/[0.15] dark:border-slate-700 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-brand hover:border-brand transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <Plus size={14} /> Add Charge <KbdBadge keys="Alt+N" />
      </button>

      {value.length > 0 && (
        <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50">
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300">
            Total Extra Charges
          </span>
          <span className="text-base font-extrabold font-mono text-amber-950 dark:text-amber-100">
            {formatSar(total)}
          </span>
        </div>
      )}
    </div>
  );
}

export default TripChargeLineEditor;
