import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import QuotationRateCard, { RateCardItem } from './QuotationRateCard';

interface QuotationCardCarouselProps {
  rateCards: RateCardItem[];
  activeSelectedId: string | null;
  primarySlotMatchedId?: string | null;
  contractRateCategory?: string;
  contractVehicleType?: string;
  onApplyRateCard: (rc: RateCardItem, targetCategory: string, targetVehicleClass: string, origName: string, destName: string, rateVal: number) => void;
}

export const QuotationCardCarousel: React.FC<QuotationCardCarouselProps> = ({
  rateCards,
  activeSelectedId,
  primarySlotMatchedId,
  contractRateCategory,
  contractVehicleType,
  onApplyRateCard,
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

  if (!rateCards || rateCards.length === 0) {
    return (
      <div className="w-full p-4 text-center rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 text-xs text-slate-500">
        No active quotations found for the selected customer/filter.
      </div>
    );
  }

  if (rateCards.length <= 3) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
        {rateCards.map((rc, idx) => {
          const isSelected = Boolean(
            activeSelectedId && (rc.id === activeSelectedId || primarySlotMatchedId === rc.id)
          );

          return (
            <div key={rc.id || `card-${idx}`} className="w-full">
              <QuotationRateCard
                rc={rc}
                idx={idx}
                isSelected={isSelected}
                contractRateCategory={contractRateCategory}
                contractVehicleType={contractVehicleType}
                onApplyRateCard={onApplyRateCard}
                className="w-full"
              />
            </div>
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
        {rateCards.map((rc, idx) => {
          const isSelected = Boolean(
            activeSelectedId && (rc.id === activeSelectedId || primarySlotMatchedId === rc.id)
          );

          return (
            <div
              key={rc.id || `card-${idx}`}
              className="w-[260px] sm:w-[calc(33.333%-8px)] min-w-[220px] shrink-0"
            >
              <QuotationRateCard
                rc={rc}
                idx={idx}
                isSelected={isSelected}
                contractRateCategory={contractRateCategory}
                contractVehicleType={contractVehicleType}
                onApplyRateCard={onApplyRateCard}
                className="w-full"
              />
            </div>
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

export default QuotationCardCarousel;
