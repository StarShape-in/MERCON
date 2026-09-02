import React from 'react';
import { Building2, Zap, Search, CheckCircle2, Eye, Edit2 } from 'lucide-react';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { Badge } from '@/components/ui/badge';

interface TripStep1CustomerProps {
  contractCustomer: string;
  setContractCustomer: (customerId: string) => void;
  customers: any[];
  customerOptions?: ComboboxOption[];
  setPreviewCustomer: (customer: any) => void;
  setEditCustomer: (customer: any) => void;
  setIsCreateCustomerOpen?: (open: boolean) => void;
}

export const TripStep1Customer: React.FC<TripStep1CustomerProps> = ({
  contractCustomer,
  setContractCustomer,
  customers,
  customerOptions = [],
  setPreviewCustomer,
  setEditCustomer,
  setIsCreateCustomerOpen,
}) => {
  const selectedCust = customers.find((c) => c.id === contractCustomer);
  const initials = selectedCust ? selectedCust.name.substring(0, 2).toUpperCase() : '';

  const derivedOptions = React.useMemo(() => {
    if (customerOptions && customerOptions.length > 0) return customerOptions;
    return customers.map((c) => ({ value: c.id, label: c.name }));
  }, [customerOptions, customers]);

  return (
    <div className="space-y-3.5 animate-fade-in">
      <div className="space-y-0.5">
        <h4 className="text-sm font-bold text-[#111111] flex items-center gap-2">
          <Building2 className="w-4 h-4 text-brand" />
          Select Customer Account
        </h4>
      </div>

      {/* Frequent Shippers Cards */}
      <div className="space-y-1.5">
        <span className="text-[11px] font-bold text-[#9898A4] uppercase tracking-wider flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-500" /> Frequent Shippers
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {customers.slice(0, 4).map((c, idx) => {
            const isSelected = contractCustomer === c.id;
            const cInitials = c.name.substring(0, 2).toUpperCase();
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setContractCustomer(c.id)}
                className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between min-h-[84px] h-auto space-y-2 cursor-pointer ${
                  isSelected
                    ? 'bg-orange-50/70 border-brand ring-1 ring-brand/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className={`w-7 h-7 rounded-lg font-bold text-[11px] grid place-items-center shrink-0 overflow-hidden ${
                    isSelected ? 'bg-brand text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {c.logo_url || c.avatar_url ? (
                      <img src={c.logo_url || c.avatar_url || ''} alt={c.name} className="w-full h-full object-cover" />
                    ) : (
                      cInitials
                    )}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-md shrink-0">
                    Key {idx + 1}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-[#111111] leading-tight line-clamp-1" title={c.name}>{c.name}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Search All Accounts (Full Width) */}
      <div className="space-y-1.5 pt-2 border-t border-black/[0.06]">
        <label className="text-[11px] font-bold text-[#6E6E80] uppercase tracking-wider flex items-center gap-1">
          <Search className="w-3 h-3 text-slate-400" /> Search All Accounts *
        </label>
        <Combobox
          options={derivedOptions}
          value={contractCustomer}
          onChange={setContractCustomer}
          placeholder="-- Select or search customer account --"
          searchPlaceholder="Search customer account by name e.g. AKS, Al-Marai..."
          emptyText="No customer matching your search."
          triggerClassName="h-9.5 rounded-xl border-slate-200 bg-white text-xs font-semibold shadow-2xs w-full"
        />

        {/* Selected Customer Details Card */}
        {selectedCust && (
          <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-300 space-y-2 animate-fade-in mt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-extrabold text-xs grid place-items-center shrink-0 border border-emerald-700 overflow-hidden">
                  {selectedCust.logo_url || selectedCust.avatar_url ? (
                    <img src={selectedCust.logo_url || selectedCust.avatar_url || ''} alt={selectedCust.name} className="w-full h-full object-cover" />
                  ) : (
                    initials
                  )}
                </span>
                <div>
                  <h5 className="text-sm font-extrabold text-emerald-950 flex items-center gap-1.5">
                    ✓ {selectedCust.name}
                  </h5>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setPreviewCustomer(selectedCust)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 font-semibold px-2 py-1 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-md flex items-center gap-1 cursor-pointer"
                >
                  <Eye className="w-3 h-3" /> Preview
                </button>
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setEditCustomer(selectedCust)}
                  className="text-xs text-slate-700 hover:text-slate-900 dark:text-slate-300 font-semibold px-2 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-bold text-[10px] gap-1 px-2 py-0.5 rounded-lg">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Active Account
                </Badge>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TripStep1Customer;
