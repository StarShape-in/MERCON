import React from 'react';
import { DollarSign, CheckCircle2, Plus, Tag, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface CommercialSectionProps {
  contractSlots: any[];
  contractRateCategory: string;
  contractBillingType: string;
  contractVehicleType: string;
  getAvailableRateCardsForLane: (slot: any) => any[];
  handleOpenCreateQuotation?: () => void;
  setIsManualRateOverride?: (override: boolean) => void;
  handleUpdateTripSlot: (slotId: string, patch: any) => void;
  handleSlotLocationChange?: (slotId: string, field: 'origin' | 'destination', locName: string, locObj: any) => void;
  setContractRateCategory?: (cat: string) => void;
  setContractVehicleType?: (vType: string) => void;
}

export const CommercialSection: React.FC<CommercialSectionProps> = ({
  contractSlots,
  contractRateCategory,
  contractBillingType,
  contractVehicleType,
  getAvailableRateCardsForLane,
  handleOpenCreateQuotation,
  handleUpdateTripSlot,
  handleSlotLocationChange,
  setContractRateCategory,
  setContractVehicleType,
}) => {
  const primarySlot = contractSlots[0] || {};
  const availableRateCards = getAvailableRateCardsForLane(primarySlot) || [];
  const matchedRateCard = primarySlot.matchedRateCard || (primarySlot.origin ? availableRateCards[0] : null);

  // Sort quotations with historical trip usage to the top
  const sortedRateCards = React.useMemo(() => {
    if (!availableRateCards) return [];
    return [...availableRateCards].sort((a, b) => {
      const aHasHistory = Boolean(a.driver_name || a.recent_driver || a.vehicle_plate || a.recent_vehicle || a.last_used_at || a.usage_count);
      const bHasHistory = Boolean(b.driver_name || b.recent_driver || b.vehicle_plate || b.recent_vehicle || b.last_used_at || b.usage_count);

      if (aHasHistory && !bHasHistory) return -1;
      if (!aHasHistory && bHasHistory) return 1;
      return 0;
    });
  }, [availableRateCards]);

  return (
    <div className="p-3.5 rounded-xl border border-blue-200/90 dark:border-blue-900 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5">
      {/* SECTION HEADER */}
      <div className="flex items-center justify-between pb-1.5 border-b border-blue-100 dark:border-blue-900">
        <h4 className="text-xs font-extrabold text-blue-900 dark:text-blue-200 uppercase tracking-wider flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-blue-600 shrink-0" /> COMMERCIAL QUOTATIONS ({sortedRateCards.length})
        </h4>
        {matchedRateCard ? (
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Matched Rate Card
          </span>
        ) : (
          <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-amber-600" /> Rate Unset
          </span>
        )}
      </div>

      {/* VISUAL QUOTATION RATE CARDS GRID / CAROUSEL */}
      {sortedRateCards.length > 0 ? (
        <div className="space-y-2">
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
            Select Active Rate Card:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto custom-scrollbar p-0.5">
            {sortedRateCards.map((rc, idx) => {
              const isSelected = matchedRateCard?.id === rc.id || primarySlot.matchedRateCard?.id === rc.id;
              const rateVal = rc.rate ?? rc.base_price ?? 0;
              const vClass = rc.vehicle_class || rc.vehicle_type || 'Standard';
              const rCat = rc.rate_category || rc.line_type || contractRateCategory;

              const origName = rc.origin_name || rc.originLocation?.name || rc.route_origin || '';
              const destName = rc.destination_name || rc.destinationLocation?.name || rc.route_destination || '';

              return (
                <button
                  key={rc.id || idx}
                  type="button"
                  onClick={() => {
                    if (origName && handleSlotLocationChange) {
                      handleSlotLocationChange(primarySlot.id, 'origin', origName, rc.originLocation || null);
                    }
                    if (destName && handleSlotLocationChange) {
                      handleSlotLocationChange(primarySlot.id, 'destination', destName, rc.destinationLocation || null);
                    }
                    if (rc.line_type && setContractRateCategory) {
                      setContractRateCategory(rc.line_type);
                    }
                    if (rc.vehicle_class && setContractVehicleType) {
                      setContractVehicleType(rc.vehicle_class);
                    }
                    handleUpdateTripSlot(primarySlot.id, {
                      matchedRateCard: rc,
                      billingAmount: String(rateVal),
                    });
                  }}
                  className={cn(
                    "p-2.5 rounded-xl border transition-all text-left flex flex-col justify-between space-y-1.5 bg-white dark:bg-slate-800 shadow-2xs cursor-pointer select-none",
                    isSelected
                      ? "border-brand ring-2 ring-brand/20 bg-orange-50/30 dark:bg-amber-950/20"
                      : "border-slate-200 dark:border-slate-700 hover:border-brand/60 hover:bg-slate-50 dark:hover:bg-slate-700"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                      {rc.quotation_number || `QUO-${idx + 1}`}
                    </span>
                    {isSelected && (
                      <span className="text-[9px] font-extrabold text-brand bg-orange-100 dark:bg-brand/20 px-1.5 py-0.2 rounded-full">
                        Applied ✓
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="text-sm font-extrabold font-mono text-slate-900 dark:text-white">
                      SAR {Number(rateVal).toLocaleString()}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium truncate">
                      {rCat} • <span className="font-bold text-slate-700 dark:text-slate-300">{vClass}</span>
                    </div>
                  </div>

                  {/* RECENT DRIVER & VEHICLE PROFILE TAG OR LIGHT ORANGE NEW PILL */}
                  {(rc.driver_name || rc.recent_driver || rc.vehicle_plate || rc.recent_vehicle) ? (
                    <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700/50 px-1.5 py-0.5 rounded border border-slate-200/70 dark:border-slate-700 truncate">
                      <span className="shrink-0">👤</span>
                      <span className="truncate">{rc.driver_name || rc.recent_driver || 'Recent Driver'}</span>
                      {(rc.vehicle_plate || rc.recent_vehicle) && (
                        <span className="font-mono font-bold text-slate-500 shrink-0">({rc.vehicle_plate || rc.recent_vehicle})</span>
                      )}
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1 text-[9px] font-extrabold text-orange-800 dark:text-orange-300 bg-orange-100/70 dark:bg-orange-950/40 px-1.5 py-0.2 rounded-full border border-orange-200/70 dark:border-orange-900/60 w-max">
                      <span>✨ New Rate</span>
                    </div>
                  )}

                  <div className="pt-1 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-[10px] text-slate-400">
                    <span>{rc.origin_name || 'Origin'} → {rc.destination_name || 'Dest'}</span>
                    <span className={cn("font-bold", isSelected ? "text-brand" : "text-slate-500")}>
                      {isSelected ? 'Active' : 'Apply →'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        /* NO QUOTATION MATCHED — ACTIONABLE CREATE BUTTON */
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center space-y-2">
          <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
            No active commercial quotation matched for this route lane.
          </p>
          {handleOpenCreateQuotation && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenCreateQuotation}
              className="h-8 text-xs font-bold border-brand text-brand hover:bg-orange-50 gap-1.5 cursor-pointer w-full"
            >
              <Plus className="w-3.5 h-3.5" /> Create Commercial Quotation
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
