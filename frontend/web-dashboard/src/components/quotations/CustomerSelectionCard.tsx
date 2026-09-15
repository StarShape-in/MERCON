import React, { useMemo, useRef } from 'react';
import { Building2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Combobox, ComboboxOption } from '@/components/ui/combobox';
import { Button } from '@/components/ui/button';

export interface CustomerOption {
  id: string;
  name: string;
  code?: string;
  city?: string;
  logo_url?: string | null;
}

interface CustomerSelectionCardProps {
  value: string;
  onChange: (customerId: string) => void;
  customers: CustomerOption[];
  label?: string;
  required?: boolean;
  className?: string;
}

export const CustomerSelectionCard: React.FC<CustomerSelectionCardProps> = ({
  value,
  onChange,
  customers = [],
  label = 'Customer',
  required = true,
  className = '',
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const selectedCust = useMemo(
    () => customers.find((c) => c.id === value),
    [customers, value]
  );

  const sortedCustomers = useMemo(() => {
    return [...customers].sort((a, b) => {
      const aTrips = (a as any)._count?.trips ?? (a as any).trip_count ?? (a as any).tripsCount ?? 0;
      const bTrips = (b as any)._count?.trips ?? (b as any).trip_count ?? (b as any).tripsCount ?? 0;
      if (bTrips !== aTrips) return bTrips - aTrips;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [customers]);

  const derivedCustomerOptions: ComboboxOption[] = useMemo(() => {
    return customers.map((c) => ({
      value: c.id,
      label: c.name,
      keywords: `${c.code || ''} ${c.city || ''} ${c.name}`,
    }));
  }, [customers]);

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -240, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 240, behavior: 'smooth' });
    }
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Label Bar */}
      {label && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#FA634E]" />
            <span>{label}</span>
            {required && <span className="text-[#FA634E]">*</span>}
          </label>
        </div>
      )}

      {/* Selected Customer View */}
      {selectedCust ? (
        <div className="p-3 rounded-xl border border-[#FA634E]/30 bg-orange-50/40 dark:bg-slate-800/60 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {selectedCust.logo_url ? (
              <img
                src={selectedCust.logo_url}
                alt={selectedCust.name}
                className="w-9 h-9 rounded-xl object-cover border border-[#FA634E]/30 shadow-2xs shrink-0 bg-white"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-[#FA634E] text-white font-black text-xs grid place-items-center shrink-0 shadow-2xs">
                {selectedCust.name.substring(0, 2).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="text-sm font-black text-slate-900 dark:text-slate-100 truncate">
                {selectedCust.name}
              </div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2">
                {selectedCust.code && <span>Code: {selectedCust.code}</span>}
                {selectedCust.city && <span>• {selectedCust.city}</span>}
              </div>
            </div>
          </div>

          <div className="w-full sm:w-[260px] shrink-0">
            <Combobox
              options={derivedCustomerOptions}
              value={value}
              onChange={onChange}
              placeholder="Select customer account..."
              searchPlaceholder="Search customer account..."
              triggerClassName="h-9 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs w-full focus:ring-2 focus:ring-[#FA634E]"
            />
          </div>
        </div>
      ) : (
        /* Stage: No Customer Selected */
        <div className="space-y-3">
          {/* Customer Search Combobox with Icon */}
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/80 text-slate-400 font-bold grid place-items-center shrink-0 border border-slate-200 dark:border-slate-700">
              <Building2 className="w-4.5 h-4.5 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <Combobox
                options={derivedCustomerOptions}
                value={value}
                onChange={onChange}
                placeholder="Select customer account..."
                searchPlaceholder="Search customer name or code..."
                triggerClassName="h-10 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-800 dark:text-slate-200 shadow-2xs w-full focus:ring-2 focus:ring-[#FA634E]"
              />
            </div>
          </div>

          {/* Quick Pick Customer Cards */}
          {sortedCustomers.length > 0 ? (
            sortedCustomers.length <= 3 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full">
                {sortedCustomers.map((c) => {
                  const cInitials = c.name.substring(0, 2).toUpperCase();
                  const firstName = c.name.split(' ')[0];

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onChange(c.id)}
                      className="p-2.5 rounded-xl border transition-all duration-200 text-left flex flex-col justify-between h-[96px] w-full bg-white dark:bg-slate-800 shadow-2xs cursor-pointer select-none border-slate-200 dark:border-slate-700 hover:border-[#FA634E] hover:bg-orange-50/50 dark:hover:bg-slate-700/80 group"
                    >
                      <div className="flex items-center gap-2.5">
                        {c.logo_url ? (
                          <img
                            src={c.logo_url}
                            alt={c.name}
                            className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0 shadow-2xs"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-[#FA634E] font-black text-xs grid place-items-center shrink-0 border border-orange-200/60 dark:border-orange-900/40 group-hover:bg-[#FA634E] group-hover:text-white transition-colors shadow-2xs">
                            {cInitials}
                          </div>
                        )}

                        <div className="truncate">
                          <div
                            className="text-xs font-black text-slate-800 dark:text-slate-100 truncate group-hover:text-[#FA634E] transition-colors"
                            title={c.name}
                          >
                            {firstName}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate">
                            {c.name}
                          </div>
                        </div>
                      </div>

                      <div className="pt-1 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end text-[10px]">
                        <span className="font-extrabold text-slate-500 group-hover:text-[#FA634E] transition-colors flex items-center gap-1">
                          Select Company →
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="relative group/carousel w-full flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleScrollLeft}
                  className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-[#FA634E] hover:text-white hover:border-[#FA634E] grid place-items-center transition-all cursor-pointer shrink-0 z-10"
                  title="Scroll Left"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div
                  ref={scrollContainerRef}
                  className="flex items-center gap-2.5 overflow-x-auto scroll-smooth py-1 px-0.5 flex-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                >
                  {sortedCustomers.map((c) => {
                    const cInitials = c.name.substring(0, 2).toUpperCase();
                    const firstName = c.name.split(' ')[0];

                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => onChange(c.id)}
                        className="p-2.5 rounded-xl border transition-all duration-200 text-left flex flex-col justify-between h-[96px] w-[calc(33.333%-8px)] min-w-[200px] shrink-0 bg-white dark:bg-slate-800 shadow-2xs cursor-pointer select-none border-slate-200 dark:border-slate-700 hover:border-[#FA634E] hover:bg-orange-50/50 dark:hover:bg-slate-700/80 group"
                      >
                        <div className="flex items-center gap-2.5">
                          {c.logo_url ? (
                            <img
                              src={c.logo_url}
                              alt={c.name}
                              className="w-8 h-8 rounded-lg object-cover border border-slate-200 shrink-0 shadow-2xs"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-950/60 text-[#FA634E] font-black text-xs grid place-items-center shrink-0 border border-orange-200/60 dark:border-orange-900/40 group-hover:bg-[#FA634E] group-hover:text-white transition-colors shadow-2xs">
                              {cInitials}
                            </div>
                          )}

                          <div className="truncate">
                            <div
                              className="text-xs font-black text-slate-800 dark:text-slate-100 truncate group-hover:text-[#FA634E] transition-colors"
                              title={c.name}
                            >
                              {firstName}
                            </div>
                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate">
                              {c.name}
                            </div>
                          </div>
                        </div>

                        <div className="pt-1 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end text-[10px]">
                          <span className="font-extrabold text-slate-500 group-hover:text-[#FA634E] transition-colors flex items-center gap-1">
                            Select Company →
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleScrollRight}
                  className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-[#FA634E] hover:text-white hover:border-[#FA634E] grid place-items-center transition-all cursor-pointer shrink-0 z-10"
                  title="Scroll Right"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )
          ) : null}
        </div>
      )}
    </div>
  );
};
