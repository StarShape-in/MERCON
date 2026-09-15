import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Customer } from '@/services/customerService';

interface CustomerCardCarouselProps {
  customers: Customer[];
  onSelectCustomer: (customerId: string) => void;
}

export const CustomerCardCarousel: React.FC<CustomerCardCarouselProps> = ({
  customers,
  onSelectCustomer,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: -320, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({ left: 320, behavior: 'smooth' });
    }
  };

  if (!customers || customers.length === 0) {
    return (
      <div className="w-full p-4 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 text-xs text-slate-500">
        No customer accounts found. Use the search box above.
      </div>
    );
  }

  if (customers.length <= 3) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
        {customers.map((c, idx) => {
          const cInitials = c.name.substring(0, 2).toUpperCase();
          const firstName = c.name.split(' ')[0];

          return (
            <button
              key={c.id || idx}
              type="button"
              onClick={() => onSelectCustomer(c.id)}
              className="p-3 rounded-xl border transition-all duration-200 text-left flex flex-col justify-between h-[104px] w-full bg-white dark:bg-slate-800 shadow-2xs cursor-pointer select-none border-slate-200 dark:border-slate-700 hover:border-brand hover:bg-orange-50/50 dark:hover:bg-slate-700/80 group"
            >
              <div className="flex items-center gap-2.5">
                {c.logo_url ? (
                  <img
                    src={c.logo_url}
                    alt={c.name}
                    className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-brand font-black text-xs grid place-items-center shrink-0 border border-orange-200/60 dark:border-orange-900/40 group-hover:bg-brand group-hover:text-white transition-colors shadow-2xs">
                    {cInitials}
                  </div>
                )}

                <div className="truncate">
                  <div
                    className="text-sm font-black text-slate-800 dark:text-slate-100 truncate group-hover:text-brand transition-colors"
                    title={c.name}
                  >
                    {firstName}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate">
                    {c.name}
                  </div>
                </div>
              </div>

              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end text-[10px]">
                <span className="font-extrabold text-slate-500 group-hover:text-brand transition-colors flex items-center gap-1">
                  Select Company →
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="relative group/carousel w-full flex items-center gap-1.5">
      <button
        type="button"
        onClick={handleScrollLeft}
        className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-brand hover:text-white hover:border-brand grid place-items-center transition-all cursor-pointer shrink-0 z-10"
        title="Scroll Left"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>

      <div
        ref={scrollContainerRef}
        className="flex items-center gap-3 overflow-x-auto scroll-smooth py-1 px-0.5 flex-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {customers.map((c, idx) => {
          const cInitials = c.name.substring(0, 2).toUpperCase();
          const firstName = c.name.split(' ')[0];

          return (
            <button
              key={c.id || idx}
              type="button"
              onClick={() => onSelectCustomer(c.id)}
              className="p-3 rounded-xl border transition-all duration-200 text-left flex flex-col justify-between h-[104px] w-[260px] sm:w-[calc(33.333%-8px)] min-w-[220px] shrink-0 bg-white dark:bg-slate-800 shadow-2xs cursor-pointer select-none border-slate-200 dark:border-slate-700 hover:border-brand hover:bg-orange-50/50 dark:hover:bg-slate-700/80 group"
            >
              <div className="flex items-center gap-2.5">
                {c.logo_url ? (
                  <img
                    src={c.logo_url}
                    alt={c.name}
                    className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0 shadow-2xs"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-brand font-black text-xs grid place-items-center shrink-0 border border-orange-200/60 dark:border-orange-900/40 group-hover:bg-brand group-hover:text-white transition-colors shadow-2xs">
                    {cInitials}
                  </div>
                )}

                <div className="truncate">
                  <div
                    className="text-sm font-black text-slate-800 dark:text-slate-100 truncate group-hover:text-brand transition-colors"
                    title={c.name}
                  >
                    {firstName}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate">
                    {c.name}
                  </div>
                </div>
              </div>

              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-700 flex items-center justify-end text-[10px]">
                <span className="font-extrabold text-slate-500 group-hover:text-brand transition-colors flex items-center gap-1">
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
        className="w-7 h-7 rounded-full bg-white dark:bg-slate-800 shadow-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-brand hover:text-white hover:border-brand grid place-items-center transition-all cursor-pointer shrink-0 z-10"
        title="Scroll Right"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

export default CustomerCardCarousel;
