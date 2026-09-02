import React from 'react';
import { DollarSign, CheckCircle2, ChevronDown, Tag } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';

interface CommercialSectionProps {
  contractSlots: any[];
  contractRateCategory: string;
  contractBillingType: string;
  contractVehicleType: string;
  getAvailableRateCardsForLane: (slot: any) => any[];
  handleOpenCreateQuotation?: () => void;
  setIsManualRateOverride?: (override: boolean) => void;
  handleUpdateTripSlot: (slotId: string, patch: any) => void;
}

export const CommercialSection: React.FC<CommercialSectionProps> = ({
  contractSlots,
  contractRateCategory,
  contractBillingType,
  contractVehicleType,
  getAvailableRateCardsForLane,
  handleOpenCreateQuotation,
  handleUpdateTripSlot,
}) => {
  const primarySlot = contractSlots[0] || {};
  const availableRateCards = getAvailableRateCardsForLane(primarySlot);
  const matchedRateCard = primarySlot.matchedRateCard || availableRateCards[0];
  const billingAmount = primarySlot.billingAmount || matchedRateCard?.rate || '';

  return (
    <div className="p-3 rounded-xl border border-blue-200/90 dark:border-blue-900 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5">
      <div className="flex items-center justify-between pb-1.5 border-b border-blue-100 dark:border-blue-900">
        <h4 className="text-xs font-extrabold text-blue-900 dark:text-blue-200 uppercase tracking-wider flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-blue-600 shrink-0" /> COMMERCIAL TERMS
        </h4>
        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
          Matched Quotation
        </span>
      </div>

      {/* MATCHED COMMERCIAL QUOTATION OPERATIONAL RESULT */}
      <div className="p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-blue-950 dark:text-blue-100 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            {matchedRateCard?.customer_name || 'Matched Rate Card'}
          </span>
          <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
            {contractRateCategory}
          </span>
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-blue-100/80 dark:border-blue-900 text-xs">
          <span className="text-slate-500 font-medium">Base Revenue:</span>
          <span className="font-extrabold text-slate-800 dark:text-slate-100">
            {billingAmount ? `SAR ${Number(billingAmount).toLocaleString()}` : '— Rate Unset'}
          </span>
        </div>

        {/* CHANGE QUOTATION POPOVER */}
        <div className="pt-1">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 w-full text-[11px] font-bold border-blue-200 text-blue-800 hover:bg-blue-50 justify-between cursor-pointer"
              >
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3 text-blue-600" />
                  {matchedRateCard ? 'Change Matched Rate Card' : 'Select Commercial Rate'}
                </span>
                <ChevronDown className="w-3 h-3 text-blue-600" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2 space-y-1 z-[9999]">
              <p className="text-[11px] font-bold text-slate-500 px-2 py-1 uppercase tracking-wider">
                Available Rate Cards ({availableRateCards.length})
              </p>
              {availableRateCards.length > 0 ? (
                availableRateCards.map((rc, idx) => (
                  <button
                    key={rc.id || idx}
                    type="button"
                    onClick={() => {
                      handleUpdateTripSlot(primarySlot.id, {
                        matchedRateCard: rc,
                        billingAmount: String(rc.rate || ''),
                        rateMatched: true,
                      });
                    }}
                    className="w-full text-left p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div>
                      <p className="font-bold text-slate-800 dark:text-slate-100">{rc.route_origin} → {rc.route_destination}</p>
                      <p className="text-[10px] text-slate-500">{rc.line_type || 'Single Trip'} • {rc.vehicle_class || contractVehicleType}</p>
                    </div>
                    <span className="font-extrabold text-emerald-700">SAR {rc.rate}</span>
                  </button>
                ))
              ) : (
                <div className="p-2 text-center text-xs text-slate-400">
                  No rate cards matched for this route.
                </div>
              )}
              {handleOpenCreateQuotation && (
                <button
                  type="button"
                  onClick={handleOpenCreateQuotation}
                  className="w-full mt-1 p-1.5 rounded-md bg-brand/10 text-brand text-xs font-bold text-center hover:bg-brand/20 transition-colors cursor-pointer"
                >
                  + Create New Commercial Quotation
                </button>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};
