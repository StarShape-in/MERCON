import React from 'react';
import { Building2, Search, Zap } from 'lucide-react';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { CustomerQuotationPresetsAccelerator } from './CustomerQuotationPresetsAccelerator';

interface CustomerSelectionHeaderProps {
  contractCustomer: string;
  setContractCustomer: (customerId: string) => void;
  customers: any[];
  customerOptions?: ComboboxOption[];
  quotationPresets?: any[];
  onSelectQuotationPreset?: (preset: any) => void;
  selectedQuotationId?: string;
}

export const CustomerSelectionHeader: React.FC<CustomerSelectionHeaderProps> = ({
  contractCustomer,
  setContractCustomer,
  customers,
  customerOptions = [],
  quotationPresets = [],
  onSelectQuotationPreset,
  selectedQuotationId,
}) => {
  const selectedCust = customers.find((c) => c.id === contractCustomer);

  const derivedOptions = React.useMemo(() => {
    if (customerOptions && customerOptions.length > 0) return customerOptions;
    return customers.map((c) => ({
      value: c.id,
      label: c.name,
      keywords: `${c.code || ''} ${c.city || ''} ${c.name}`,
    }));
  }, [customerOptions, customers]);

  return (
    <div className="space-y-2">
      {/* SIDE-BY-SIDE HORIZONTAL ROW: CUSTOMER ACCOUNT (LEFT ~280px) + QUICK PICK TILES (RIGHT) */}
      <div className="flex items-end gap-3 flex-wrap w-full">
        {/* LEFT: COMPACT CUSTOMER SEARCH FIELD (~280px) */}
        <div className="space-y-1 w-full sm:w-[280px] shrink-0">
          <label className="text-xs font-extrabold text-[#3E3C3D] dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-brand shrink-0" /> CUSTOMER ACCOUNT <span className="text-brand">*</span>
            </span>
            {selectedCust && (
              <span className="text-[10px] font-mono font-extrabold text-slate-500">
                {selectedCust.code || 'SYS'}
              </span>
            )}
          </label>

          <Combobox
            id="step1-customer-combobox"
            options={derivedOptions}
            value={contractCustomer}
            onChange={setContractCustomer}
            placeholder="Search or select customer..."
            searchPlaceholder="Type customer name or code..."
            emptyText="No customer matching search."
            triggerClassName="h-9 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold shadow-2xs w-full focus-visible:ring-2 focus-visible:ring-brand"
          />
        </div>

        {/* RIGHT: QUICK PICK TILES (ALIGNED ON THE SAME HORIZONTAL LINE) */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar flex-1 pb-0.5">
            {customers.slice(0, 4).map((c, idx) => {
              const isSelected = contractCustomer === c.id;
              const cInitials = c.name.substring(0, 2).toUpperCase();

              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setContractCustomer(c.id)}
                  className={`px-2 py-1 rounded-lg border text-left transition-all flex items-center gap-1.5 h-9 shrink-0 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
                    isSelected
                      ? 'bg-orange-50/90 dark:bg-orange-950/40 border-brand ring-1 ring-brand/30 shadow-2xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xs'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-md font-extrabold text-[9px] grid place-items-center shrink-0 shadow-2xs ${
                      isSelected ? 'bg-brand text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {c.logo_url || c.avatar_url ? (
                      <img src={c.logo_url || c.avatar_url || ''} alt={c.name} className="w-full h-full object-cover" />
                    ) : (
                      cInitials
                    )}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate leading-tight" title={c.name}>
                      {c.name.split(' ')[0]}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

    </div>
  );
};
