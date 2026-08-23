import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { surchargeRuleService, SurchargeRule } from '@/services/rateCardService';
import { TripChargeInput } from '@/services/tripService';
import ChargeTypeCombobox from '@/components/rate-cards/ChargeTypeCombobox';
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

  const handleChargeTypeSelect = (index: number, type: string) => {
    const matchedRule = rules.find(
      (r: SurchargeRule) => r.charge_type.toLowerCase() === type.trim().toLowerCase()
    );

    const currentQty = value[index].quantity || 1;
    const newRate = matchedRule ? matchedRule.rate : (value[index].rate || 0);

    updateLine(index, {
      charge_type: type,
      surchargeRuleId: matchedRule ? matchedRule.id : null,
      rate: newRate,
      quantity: currentQty,
      amount: currentQty * newRate,
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
        <div className="text-center py-6 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">No extra charges added</p>
        </div>
      )}

      {value.map((line, index) => (
        <div
          key={index}
          data-row-index={index}
          className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs"
        >
          <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/60 dark:border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
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

          <div className="p-3.5 space-y-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Select Charge Type
              </label>
              <ChargeTypeCombobox
                value={line.charge_type}
                onChange={(v) => handleChargeTypeSelect(index, v)}
                customerId={customerId}
                placeholder="Select or enter charge type..."
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Quantity
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.quantity}
                  onChange={(e) => setQuantity(index, parseFloat(e.target.value) || 0)}
                  className="w-full h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 text-xs font-mono font-bold outline-none focus:border-brand transition-colors text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Rate (SAR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.rate}
                  onChange={(e) => setRate(index, parseFloat(e.target.value) || 0)}
                  className="w-full h-9 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 text-xs font-mono font-bold outline-none focus:border-brand transition-colors text-slate-900 dark:text-slate-100"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Amount (SAR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.amount}
                  onChange={(e) => updateLine(index, { amount: parseFloat(e.target.value) || 0 })}
                  className="w-full h-9 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/50 rounded-lg px-2.5 text-xs font-mono font-bold text-amber-800 dark:text-amber-300 outline-none focus:border-brand transition-colors"
                />
              </div>
            </div>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addLine}
        className="w-full py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-brand hover:border-brand transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
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
