import React from 'react';
import { Zap, ArrowRight, DollarSign } from 'lucide-react';

interface QuotationPreset {
  id: string;
  quotationNumber: string;
  customerName?: string;
  originName: string;
  destinationName: string;
  rateCategory: string;
  vehicleClass: string;
  rate: number;
}

interface CustomerQuotationPresetsAcceleratorProps {
  presets: QuotationPreset[];
  onSelectPreset: (preset: QuotationPreset) => void;
  selectedQuotationId?: string;
}

export const CustomerQuotationPresetsAccelerator: React.FC<CustomerQuotationPresetsAcceleratorProps> = ({
  presets,
  onSelectPreset,
  selectedQuotationId,
}) => {
  if (!presets || presets.length === 0) return null;

  return (
    <div className="pt-1 pb-0.5 space-y-1 animate-fade-in">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        {presets.map((preset) => {
          const isSelected = selectedQuotationId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => onSelectPreset(preset)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0 cursor-pointer shadow-2xs ${
                isSelected
                  ? 'bg-amber-50 border-amber-400 text-amber-950 ring-2 ring-amber-400/30 dark:bg-amber-950/40 dark:border-amber-700 dark:text-amber-200'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-amber-300 hover:bg-amber-50/50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:border-amber-700'
              }`}
            >
              <div className="flex items-center gap-1 text-slate-900 dark:text-white font-extrabold">
                <span>{preset.originName || 'Origin'}</span>
                <ArrowRight className="w-3 h-3 text-amber-500 shrink-0" />
                <span>{preset.destinationName || 'Destination'}</span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px]">
                <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                  {preset.rateCategory || 'Trip'}
                </span>
                {preset.vehicleClass && (
                  <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                    {preset.vehicleClass}
                  </span>
                )}
                <span className="text-emerald-700 dark:text-emerald-400 font-extrabold flex items-center">
                  SAR {preset.rate?.toLocaleString()}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
