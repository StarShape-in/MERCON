import React from 'react';
import { Building2, Search, Zap } from 'lucide-react';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';

interface CustomerSelectionHeaderProps {
  contractCustomer: string;
  setContractCustomer: (customerId: string) => void;
  customers: any[];
  customerOptions?: ComboboxOption[];
}

export const CustomerSelectionHeader: React.FC<CustomerSelectionHeaderProps> = ({
  contractCustomer,
  setContractCustomer,
  customers,
  customerOptions = [],
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
      {/* 1 SINGLE UNIFIED CUSTOMER ACCOUNT LABEL */}
      <div className="space-y-1 max-w-lg">
        <label className="text-xs font-bold text-[#3E3C3D] dark:text-slate-300 uppercase tracking-wider flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-brand shrink-0" /> CUSTOMER ACCOUNT <span className="text-brand">*</span>
          </span>
          {selectedCust ? (
            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
              Code: <span className="font-mono text-slate-800 dark:text-slate-100">{selectedCust.code || 'SYS'}</span>
              {selectedCust.city ? ` • ${selectedCust.city}` : ''}
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 font-normal normal-case">
              Search by company name, code or city
            </span>
          )}
        </label>

        <Combobox
          id="step1-customer-combobox"
          options={derivedOptions}
          value={contractCustomer}
          onChange={setContractCustomer}
          placeholder="Search or select customer account..."
          searchPlaceholder="Type customer name or code (e.g. iMile, AKS)..."
          emptyText="No customer matching your search."
          triggerClassName="h-9.5 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold shadow-2xs w-full focus-visible:ring-2 focus-visible:ring-brand"
        />
      </div>

      {/* QUICK PICK TILES (NO SEPARATE HEADER ROW) */}
      <div className="flex items-center gap-2 pt-0.5 max-w-xl overflow-x-auto">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider shrink-0 flex items-center gap-1">
          <Zap className="w-3 h-3 text-amber-500 fill-amber-500/20" /> Quick Pick:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 flex-1">
          {customers.slice(0, 4).map((c, idx) => {
            const isSelected = contractCustomer === c.id;
            const cInitials = c.name.substring(0, 2).toUpperCase();

            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setContractCustomer(c.id)}
                className={`px-2 py-1.5 rounded-lg border text-left transition-all flex items-center justify-between gap-1.5 h-10 cursor-pointer focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none ${
                  isSelected
                    ? 'bg-orange-50/90 dark:bg-orange-950/40 border-brand ring-1 ring-brand/30 shadow-2xs'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-2xs'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className={`w-5.5 h-5.5 rounded-md font-extrabold text-[10px] grid place-items-center shrink-0 overflow-hidden shadow-2xs ${
                      isSelected
                        ? 'bg-brand text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {c.logo_url || c.avatar_url ? (
                      <img src={c.logo_url || c.avatar_url || ''} alt={c.name} className="w-full h-full object-cover" />
                    ) : (
                      cInitials
                    )}
                  </span>
                  <p className="text-xs font-bold text-[#3E3C3D] dark:text-slate-100 truncate" title={c.name}>
                    {c.name}
                  </p>
                </div>

                <span
                  className={`text-[9px] font-bold border px-1 py-0.2 rounded shrink-0 ${
                    isSelected
                      ? 'bg-brand/10 text-brand border-brand/20'
                      : 'bg-slate-50 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:border-slate-700'
                  }`}
                >
                  Key {idx + 1}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
