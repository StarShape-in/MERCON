import { Building2, Check, Sparkles, Phone, CreditCard, ShieldCheck, Search } from 'lucide-react';
import { Customer } from '@/services/customerService';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface TripStepCustomerProps {
  customerId: string;
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (id: string) => void;
}

export default function TripStepCustomer({
  customerId,
  customers,
  selectedCustomer,
  onSelectCustomer,
}: TripStepCustomerProps) {
  const custPhone = selectedCustomer ? (selectedCustomer.phone || selectedCustomer.contact_phone || 'N/A') : 'N/A';
  const custCompany = selectedCustomer ? (selectedCustomer.company_name || 'Commercial Shipper') : 'Commercial Shipper';
  const custPayment = selectedCustomer ? (selectedCustomer.payment_terms || 'Net 30') : 'Net 30';

  // Top 4 quick-select customers for 1-click selection
  const quickSelectCustomers = customers.slice(0, 4);

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#E8450F]" /> Select Customer Account
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Pick the client responsible for freight billing and contracted lane rates.
        </p>
      </div>

      {/* Quick Select Frequent Customer Cards */}
      {quickSelectCustomers.length > 0 && (
        <div className="space-y-1.5">
          <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Frequent Shippers
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {quickSelectCustomers.map((c) => {
              const isSelected = c.id === customerId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectCustomer(c.id)}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden group',
                    isSelected
                      ? 'border-[#E8450F] bg-orange-50/60 dark:bg-orange-950/30 text-[#E8450F] shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300'
                  )}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className={cn(
                      "w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px]",
                      isSelected ? "bg-[#E8450F] text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    )}>
                      {c.name.substring(0, 2).toUpperCase()}
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[#E8450F]" />}
                  </div>
                  <span className="font-extrabold text-xs block truncate text-slate-900 dark:text-slate-100">
                    {c.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate font-mono mt-0.5">
                    {c.company_name || 'Commercial'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Customer Account Search Dropdown */}
      <div className="space-y-1.5">
        <Label htmlFor="customer_id" className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-slate-400" /> Search All Accounts <span className="text-rose-500">*</span>
        </Label>
        <Select value={customerId} onValueChange={onSelectCustomer}>
          <SelectTrigger id="customer_id" className="h-11 rounded-xl font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <SelectValue placeholder="-- Search or select customer account --" />
          </SelectTrigger>
          <SelectContent className="max-h-64">
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id} className="py-2 cursor-pointer">
                <div className="flex items-center justify-between gap-4 w-full">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{c.name}</span>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {c.company_name || 'Commercial'} • {c.payment_terms || 'Standard'}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Active Customer Account Detail Card */}
      {selectedCustomer && (
        <Card className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/60 flex items-center justify-center text-[#E8450F] font-extrabold text-sm border border-orange-200/60 dark:border-orange-900/60">
                {selectedCustomer.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{selectedCustomer.name}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">{custCompany}</p>
              </div>
            </div>

            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 text-[10px] font-bold gap-1 px-2.5 py-0.5">
              <ShieldCheck className="w-3 h-3 text-emerald-600" /> Active Account
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs pt-2.5 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                <Phone className="w-3 h-3" /> Contact Phone
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">{custPhone}</span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                <CreditCard className="w-3 h-3" /> Payment Terms
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">{custPayment}</span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> Account Credit
              </span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block truncate">
                {selectedCustomer.credit_limit ? `SAR ${selectedCustomer.credit_limit.toLocaleString()}` : 'Good Standing'}
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
