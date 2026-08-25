import { useState } from 'react';
import { Building2, Check, Sparkles, Phone, CreditCard, ShieldCheck, Search, ChevronsUpDown, Keyboard } from 'lucide-react';
import { Customer } from '@/services/customerService';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import PhoneDisplay from '@/components/ui/PhoneDisplay';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { matchesSearch } from '@/lib/search';

interface TripStepCustomerProps {
  customerId: string;
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (id: string) => void;
  openSearch?: boolean;
  onOpenSearchChange?: (open: boolean) => void;
}

export default function TripStepCustomer({
  customerId,
  customers,
  selectedCustomer,
  onSelectCustomer,
  openSearch,
  onOpenSearchChange,
}: TripStepCustomerProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openSearch !== undefined ? openSearch : internalOpen;
  const setOpen = (val: boolean) => {
    setInternalOpen(val);
    if (onOpenSearchChange) onOpenSearchChange(val);
  };

  const custPhone = selectedCustomer ? (selectedCustomer.phone || selectedCustomer.contact_phone || 'N/A') : 'N/A';
  const custCompany = selectedCustomer ? (selectedCustomer.company_name || 'Commercial Shipper') : 'Commercial Shipper';
  const custPayment = selectedCustomer ? (selectedCustomer.payment_terms || 'Net 30') : 'Net 30';

  // Frequent Shippers — ranked by trip count, highest first, not list order.
  const quickSelectCustomers = [...customers]
    .sort((a, b) => (b._count?.trips ?? 0) - (a._count?.trips ?? 0))
    .slice(0, 4);

  return (
    <div className="space-y-3 animate-in fade-in-50 duration-200">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-brand" /> Customer
        </h3>
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
          <Keyboard className="w-3.5 h-3.5 text-brand" />
          <span>Press <kbd className="font-mono bg-white dark:bg-slate-900 px-1 py-0.2 border rounded text-slate-700 dark:text-slate-300 font-bold">Shift</kbd> search, <kbd className="font-mono bg-white dark:bg-slate-900 px-1 py-0.2 border rounded text-slate-700 dark:text-slate-300 font-bold">1-4</kbd> quick select</span>
        </div>
      </div>

      {/* Quick Select Frequent Customer Cards */}
      {quickSelectCustomers.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" /> Frequent Shippers
            </Label>
            <span className="text-[10px] text-slate-400 font-mono">Keys 1-4</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {quickSelectCustomers.map((c, index) => {
              const isSelected = c.id === customerId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectCustomer(c.id)}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all cursor-pointer relative overflow-hidden group',
                    isSelected
                      ? 'border-brand bg-orange-50/60 dark:bg-orange-950/30 text-brand shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/40 dark:bg-slate-900/30 text-slate-700 dark:text-slate-300'
                  )}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className={cn(
                      "w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] overflow-hidden shrink-0",
                      isSelected ? "bg-brand text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    )}>
                      {c.logo_url || c.avatar_url ? (
                        <img src={c.logo_url || c.avatar_url || ''} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        c.name.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500">
                        {index + 1}
                      </span>
                      {isSelected && <Check className="w-4 h-4 text-brand" />}
                    </div>
                  </div>
                  <span className="font-extrabold text-xs block truncate text-slate-900 dark:text-slate-100">
                    {c.name}
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate font-mono mt-0.5">
                    {(c._count?.trips ?? 0) > 0 ? `${c._count!.trips} trips` : c.company_name || 'Commercial'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Customer Account Search Dropdown */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="customer_id" className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Search className="w-3.5 h-3.5 text-slate-400" /> Search All Accounts <span className="text-rose-500">*</span>
          </Label>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.2 rounded">
            Shift
          </span>
        </div>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id="customer_id"
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "w-full h-11 justify-between rounded-xl font-semibold border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-left px-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 shadow-2xs",
                !selectedCustomer && "text-slate-400 dark:text-slate-500 font-normal"
              )}
            >
              {selectedCustomer ? (
                <div className="flex items-center gap-2.5 min-w-0 truncate">
                  <div className="w-6 h-6 rounded-md bg-orange-100 dark:bg-orange-950/60 flex items-center justify-center text-brand font-bold text-[10px] shrink-0 border border-orange-200 dark:border-orange-900/60 overflow-hidden">
                    {selectedCustomer.logo_url || selectedCustomer.avatar_url ? (
                      <img src={selectedCustomer.logo_url || selectedCustomer.avatar_url || ''} alt={selectedCustomer.name} className="w-full h-full object-cover" />
                    ) : (
                      selectedCustomer.name.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <span className="font-bold text-slate-900 dark:text-slate-100 truncate text-xs">
                    {selectedCustomer.name}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 font-normal truncate hidden sm:inline">
                    • {selectedCustomer.company_name || 'Commercial Shipper'}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  -- Search or select customer account --
                </span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-xl shadow-lg border-slate-200 dark:border-slate-800" align="start">
            <Command
              filter={(itemValue, search) => {
                const customer = customers.find((c) => c.id.toLowerCase() === itemValue.toLowerCase());
                if (!customer) return 0;
                return matchesSearch(search, [
                  customer.name,
                  customer.company_name,
                  customer.phone,
                  customer.contact_phone,
                  customer.tax_number,
                  customer.payment_terms,
                ]) ? 1 : 0;
              }}
            >
              <CommandInput
                placeholder="Search by customer name, company, or phone..."
                className="h-10 text-xs"
              />
              <CommandList className="max-h-64 p-1 overflow-y-auto overscroll-contain">
                <CommandEmpty className="py-6 text-center text-xs text-slate-500">
                  No customer account found.
                </CommandEmpty>
                <CommandGroup>
                  {customers.map((c) => {
                    const isSelected = c.id === customerId;
                    return (
                      <CommandItem
                        key={c.id}
                        value={c.id}
                        onSelect={() => {
                          onSelectCustomer(c.id);
                          setOpen(false);
                        }}
                        className={cn(
                          "flex items-center justify-between gap-3 px-2.5 py-2 rounded-lg cursor-pointer transition-colors text-xs",
                          isSelected
                            ? "bg-orange-50 dark:bg-orange-950/40 text-brand font-bold"
                            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={cn(
                            "w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 overflow-hidden",
                            isSelected
                              ? "bg-brand text-white"
                              : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                          )}>
                            {c.logo_url || c.avatar_url ? (
                              <img src={c.logo_url || c.avatar_url || ''} alt={c.name} className="w-full h-full object-cover" />
                            ) : (
                              c.name.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-slate-100 truncate text-xs">
                              {c.name}
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {c.company_name || 'Commercial'} • {c.phone || c.contact_phone || 'No Phone'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {c.payment_terms && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal border-slate-200 dark:border-slate-700">
                              {c.payment_terms}
                            </Badge>
                          )}
                          <Check
                            className={cn(
                              "h-4 w-4 text-brand",
                              isSelected ? "opacity-100" : "opacity-0"
                            )}
                          />
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active Customer Account Detail Card */}
      {selectedCustomer && (
        <Card className="rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/60 flex items-center justify-center text-brand font-extrabold text-sm border border-orange-200/60 dark:border-orange-900/60 overflow-hidden shrink-0">
                {selectedCustomer.logo_url || selectedCustomer.avatar_url ? (
                  <img src={selectedCustomer.logo_url || selectedCustomer.avatar_url || ''} alt={selectedCustomer.name} className="w-full h-full object-cover" />
                ) : (
                  selectedCustomer.name.substring(0, 2).toUpperCase()
                )}
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

          <div className="grid grid-cols-4 gap-3 text-xs pt-2.5 border-t border-slate-100 dark:border-slate-800">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                Customer Code
              </span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100 block truncate">
                {(selectedCustomer as any).code || selectedCustomer.name.substring(0, 6).toUpperCase()}
              </span>
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
                <Phone className="w-3 h-3" /> Contact Phone
              </span>
              <PhoneDisplay phone={custPhone} showActions variant="inline" />
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

