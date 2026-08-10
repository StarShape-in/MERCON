import { Building2 } from 'lucide-react';
import { Customer } from '@/services/customerService';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const custCompany = selectedCustomer ? (selectedCustomer.company_name || 'Individual Shipper') : 'Individual Shipper';
  const custPayment = selectedCustomer ? (selectedCustomer.payment_terms || 'Net 30') : 'Net 30';
  const custTax = selectedCustomer ? (selectedCustomer.tax_number || '3000...') : '3000...';

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-[#E8450F]" /> Select Customer Account
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Choose the shipping client responsible for billing and lane contract rates.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="customer_id" className="text-xs font-bold">
          Customer Account <span className="text-rose-500">*</span>
        </Label>
        <Select value={customerId} onValueChange={onSelectCustomer}>
          <SelectTrigger id="customer_id" className="h-11 rounded-xl font-medium border-slate-200 dark:border-slate-800">
            <SelectValue placeholder="-- Choose Customer Account --" />
          </SelectTrigger>
          <SelectContent>
            {customers.map((c) => (
              <SelectItem key={c.id} value={c.id} className="py-2">
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

      {selectedCustomer && (
        <Card className="rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950/50 flex items-center justify-center text-[#E8450F] font-bold text-xs">
                {selectedCustomer.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">{selectedCustomer.name}</h4>
                <p className="text-[11px] text-slate-500">{custCompany}</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">
              Active Account
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs pt-1 border-t border-slate-200/60 dark:border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Contact Phone</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{custPhone}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Terms</span>
              <span className="font-semibold text-slate-700 dark:text-slate-300">{custPayment}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Tax Registration</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">{custTax}</span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
