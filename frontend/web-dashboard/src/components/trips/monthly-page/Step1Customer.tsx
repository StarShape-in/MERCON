import { useState, useMemo } from 'react';
import { Building2, Plus, Zap, Search, Phone, CreditCard, ShieldCheck, CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { Customer } from '@/services/customerService';
import CreateCustomerModal from '@/components/customers/CreateCustomerModal';

interface Step1CustomerProps {
  customers: Customer[];
  contractCustomer: string;
  onSelectCustomer: (id: string) => void;
  onNext: () => void;
  onCustomerCreated: () => void;
}

export default function Step1Customer({
  customers,
  contractCustomer,
  onSelectCustomer,
  onNext,
  onCustomerCreated,
}: Step1CustomerProps) {
  const [isCreateCustomerOpen, setIsCreateCustomerOpen] = useState(false);

  const customerOptions = useMemo<ComboboxOption[]>(() => {
    return customers.map((c) => ({
      value: c.id,
      label: c.name,
      keywords: `${c.name} ${c.phone || ''} ${c.payment_terms || ''}`,
    }));
  }, [customers]);

  const selectedCust = customers.find((c) => c.id === contractCustomer);
  const initials = selectedCust ? selectedCust.name.substring(0, 2).toUpperCase() : '';

  return (
    <div className="w-full space-y-4 animate-fade-in py-1">
      <div className="p-4 sm:p-5 bg-slate-50/70 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-4 shadow-2xs w-full">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-brand" />
            Select Customer Account <span className="text-rose-500">*</span>
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsCreateCustomerOpen(true)}
            className="h-7 text-xs text-brand font-bold hover:bg-orange-50 dark:hover:bg-orange-950/40"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            + New Customer
          </Button>
        </div>

        {/* Frequent Shippers Quick Cards */}
        <div className="space-y-2">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" /> Frequent Shippers
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 w-full">
            {customers.slice(0, 4).map((c, idx) => {
              const isSelected = contractCustomer === c.id;
              const cardInitials = c.name.substring(0, 2).toUpperCase();
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectCustomer(c.id)}
                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between h-22 space-y-1 w-full ${
                    isSelected
                      ? 'bg-orange-50/80 border-brand ring-1 ring-brand/20 shadow-xs dark:bg-orange-950/40'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 w-full">
                    <span className={`w-7 h-7 rounded-lg font-bold text-[11px] grid place-items-center shrink-0 overflow-hidden ${
                      isSelected ? 'bg-brand text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                    }`}>
                      {c.logo_url || c.avatar_url ? (
                        <img src={c.logo_url || c.avatar_url || ''} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        cardInitials
                      )}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-1.5 py-0.5 rounded shrink-0">
                      Key {idx + 1}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug truncate" title={c.name}>{c.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">Commercial Shipper</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search All Accounts */}
        <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800 w-full">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
            <Search className="w-3 h-3 text-slate-400" /> Search All Customer Accounts *
          </label>
          <div className="w-full">
            <Combobox
              options={customerOptions}
              value={contractCustomer}
              onChange={onSelectCustomer}
              placeholder="-- Select or search customer account --"
              searchPlaceholder="Search customer account by name..."
            />
          </div>

          {/* Selected Customer Details Card */}
          {selectedCust && (
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3 animate-fade-in mt-2 w-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-[#E8450F] font-extrabold text-xs grid place-items-center shrink-0 border border-orange-200 dark:border-orange-800">
                    {initials}
                  </span>
                  <div>
                    <h5 className="text-sm font-bold text-slate-900 dark:text-slate-100">{selectedCust.name}</h5>
                    <p className="text-xs text-slate-500 font-medium">Commercial Account</p>
                  </div>
                </div>
                <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-bold text-xs gap-1 px-2.5 py-1 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Active Account
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-200 dark:border-slate-800 text-xs w-full">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                    <Phone className="w-3 h-3 text-slate-400" /> CONTACT PHONE
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate block mt-0.5">
                    {selectedCust.phone || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                    <CreditCard className="w-3 h-3 text-slate-400" /> PAYMENT TERMS
                  </span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate block mt-0.5">
                    {selectedCust.payment_terms || 'Net 30 Days'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-slate-400" /> ACCOUNT CREDIT
                  </span>
                  <span className="text-xs font-bold text-emerald-600 truncate block mt-0.5">
                    Good Standing
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <Button
          type="button"
          disabled={!contractCustomer}
          onClick={onNext}
          className="h-10 px-6 rounded-xl bg-brand hover:bg-[#d13d0d] text-white font-bold text-xs gap-1.5 shadow-md disabled:opacity-50"
        >
          Next: Route Slots
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      <CreateCustomerModal
        isOpen={isCreateCustomerOpen}
        onClose={() => setIsCreateCustomerOpen(false)}
        onSuccess={() => {
          setIsCreateCustomerOpen(false);
          onCustomerCreated();
        }}
      />
    </div>
  );
}
