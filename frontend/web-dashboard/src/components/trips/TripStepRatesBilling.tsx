import React from 'react';
import { Receipt, Loader2, AlertTriangle, Tag, Check, Lock, Plus, Building2 } from 'lucide-react';
import { Customer } from '@/services/customerService';
import { RateCard } from '@/services/rateCardService';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TripStepRatesBillingProps {
  pickupLocationName: string;
  dropoffLocationName: string;
  isLookingUpRate: boolean;
  availableRateCards: RateCard[];
  selectedRateCardId: string;
  matchedRateCard: RateCard | null;
  rateSource: 'customer' | null;
  laneHasNoRate: boolean;
  saveRateAs: 'customer' | 'none';
  selectedCustomer: Customer | null;
  rateSaveWarning: string | null;
  billingAmount: string;
  expiredOrFutureRoute?: RateCard | null;
  routeStructureDifferentCandidate?: RateCard | null;
  currentTripRouteSummary?: string;
  plannedStartDate?: string;
  onSelectRateCard: (card: RateCard | null) => void;
  onSaveRateAsChange: (val: 'customer' | 'none') => void;
  onBillingAmountChange: (val: string) => void;
  onAdjustPrice: (amount: number) => void;
  onAddNewRoute?: () => void;
}

export default function TripStepRatesBilling({
  pickupLocationName,
  dropoffLocationName,
  isLookingUpRate,
  availableRateCards,
  selectedRateCardId,
  matchedRateCard,
  selectedCustomer,
  laneHasNoRate,
  billingAmount,
  expiredOrFutureRoute,
  routeStructureDifferentCandidate,
  currentTripRouteSummary,
  plannedStartDate,
  onSelectRateCard,
  onAddNewRoute,
}: TripStepRatesBillingProps) {
  const hasAvailableCards = availableRateCards.length > 0;
  const activeRateCard = matchedRateCard || availableRateCards.find((rc) => rc.id === selectedRateCardId) || null;

  return (
    <div className="space-y-3 animate-in fade-in-50 duration-200">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-brand" /> Commercial Terms (Agreement Route)
        </h3>
        <Badge variant="outline" className="text-[11px] font-semibold bg-indigo-50 text-indigo-700 border-indigo-200 gap-1.5 px-2.5 py-0.5">
          <Lock className="w-3 h-3 text-indigo-600" />
          Enforced Pricing Rules
        </Badge>
      </div>

      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-4 shadow-xs !overflow-visible">
        {/* Established Agreement Routes for this lane */}
        {hasAvailableCards ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                Exact Agreement Routes ({availableRateCards.length})
              </Label>
              {isLookingUpRate && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {availableRateCards.map((rc) => {
                const isSelected = selectedRateCardId === rc.id;
                const driverPayout = rc.driver_payout;
                const validFromStr = rc.valid_from ? rc.valid_from.substring(0, 10) : null;
                const validToStr = rc.valid_to ? rc.valid_to.substring(0, 10) : null;

                return (
                  <div
                    key={rc.id}
                    onClick={() => onSelectRateCard(rc)}
                    className={cn(
                      'p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 text-xs relative',
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-950/30 ring-2 ring-indigo-500/20 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                    )}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="space-y-0.5 min-w-0">
                        <span className="font-bold text-slate-900 dark:text-slate-100 truncate block">{rc.name}</span>
                        {rc.agreement_ref && (
                          <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-mono font-bold">
                            {rc.agreement_ref}
                          </Badge>
                        )}
                        <span className="text-[10px] text-slate-500 font-mono block">
                          {rc.vehicle_class || rc.source_vehicle_label || '10 TON'} · {rc.line_type || 'SINGLE_TRIP'}
                        </span>
                      </div>
                      {isSelected && (
                        <Check className="w-5 h-5 text-white shrink-0" />
                      )}
                    </div>

                    <div className="pt-1 border-t border-slate-100 dark:border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 text-[11px]">Billing Rate:</span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                          SAR {Number(rc.rate ?? rc.base_price ?? 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500 text-[11px]">Driver Charge:</span>
                        {driverPayout != null && Number(driverPayout) > 0 ? (
                          <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono">
                            SAR {Number(driverPayout).toLocaleString()}
                          </span>
                        ) : (
                          <span className="font-bold text-slate-400 font-mono">—</span>
                        )}
                      </div>

                      <div className="text-[10px] text-slate-400 font-mono pt-0.5">
                        {validFromStr || validToStr ? (
                          <span>📅 Valid: {validFromStr || 'Start'} → {validToStr || 'Open'}</span>
                        ) : (
                          <span>📅 Always Active</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {/* WORKFLOW B: If no valid route for current date or route structure differs */}
        {(!selectedRateCardId || laneHasNoRate || !hasAvailableCards) && (
          <div className="space-y-3">
            {routeStructureDifferentCandidate ? (
              /* CASE C: Route exists for corridor, but multi-stop structure differs */
              <div className="rounded-xl bg-amber-50/90 dark:bg-amber-950/40 p-4 border border-amber-300 dark:border-amber-900/60 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 shrink-0 mt-0.5">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-amber-950 dark:text-amber-100 uppercase tracking-wider">
                        ⚠ ROUTE STRUCTURE DIFFERENT
                      </h4>
                      <Badge className="bg-amber-200 text-amber-900 border-amber-300 text-[10px] font-bold">
                        Mismatch
                      </Badge>
                    </div>
                    <p className="text-[11px] text-amber-900/90 dark:text-amber-200/90 leading-relaxed font-medium">
                      A commercial quotation exists for: <strong className="font-mono text-amber-950 font-extrabold">{routeStructureDifferentCandidate.name}</strong>, but its complete multi-stop route structure differs from this trip's stops.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 text-xs">
                      <div className="p-2.5 rounded-lg bg-white/90 dark:bg-slate-900/80 border border-amber-200/80 dark:border-amber-900/40">
                        <span className="text-[10px] font-bold uppercase text-amber-700 dark:text-amber-400 block mb-0.5">
                          Commercial Agreement Route:
                        </span>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                          {routeStructureDifferentCandidate.name}
                        </span>
                        <span className="text-[10px] text-emerald-600 font-extrabold block mt-1">
                          Agreed Rate: SAR {Number(routeStructureDifferentCandidate.rate ?? 0).toLocaleString()}
                        </span>
                      </div>

                      <div className="p-2.5 rounded-lg bg-white/90 dark:bg-slate-900/80 border border-amber-200/80 dark:border-amber-900/40">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block mb-0.5">
                          Current Trip Route:
                        </span>
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-xs">
                          {currentTripRouteSummary || `${pickupLocationName || 'Origin'} → ${dropoffLocationName || 'Destination'}`}
                        </span>
                        <span className="text-[10px] text-rose-600 font-extrabold block mt-1">
                          The existing quotation cannot be used for this trip.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between gap-3 border-t border-amber-200/60 dark:border-amber-900/40">
                  <span className="text-[11px] font-semibold text-amber-900 dark:text-amber-300">
                    Add the new route sequence to the Commercial Agreement to proceed
                  </span>

                  {onAddNewRoute && (
                    <Button
                      type="button"
                      onClick={onAddNewRoute}
                      className="h-8 bg-brand hover:bg-brand/90 text-white font-bold text-xs rounded-lg px-3.5 gap-1.5 shadow-sm shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      + Add Route to Commercial Agreement
                    </Button>
                  )}
                </div>
              </div>
            ) : expiredOrFutureRoute ? (
              /* CASE B: Route exists, but outside validity date range */
              <div className="rounded-xl bg-orange-50/90 dark:bg-orange-950/40 p-4 border border-orange-200 dark:border-orange-900/60 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300 shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-orange-950 dark:text-orange-100 uppercase tracking-wider">
                      Commercial Route Exists — Not Valid For This Date
                    </h4>
                    <p className="text-[11px] text-orange-900/90 dark:text-orange-200/90 leading-relaxed">
                      A commercial route exists for this corridor, but its commercial terms are not valid for the selected trip date.
                    </p>

                    <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                      <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-orange-200/60 dark:border-orange-900/40">
                        <span className="text-[10px] font-bold uppercase text-orange-600 dark:text-orange-400 block">Route Effective:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {expiredOrFutureRoute.valid_from ? expiredOrFutureRoute.valid_from.substring(0, 10) : 'Start'} → {expiredOrFutureRoute.valid_to ? expiredOrFutureRoute.valid_to.substring(0, 10) : 'Open'}
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-orange-200/60 dark:border-orange-900/40">
                        <span className="text-[10px] font-bold uppercase text-slate-500 block">Trip Date:</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {plannedStartDate || 'Selected Date'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between gap-3 border-t border-orange-200/60 dark:border-orange-900/40">
                  <span className="text-[11px] font-medium text-orange-800 dark:text-orange-300">
                    Add a route extension to the agreement to cover this date
                  </span>

                  {onAddNewRoute && (
                    <Button
                      type="button"
                      onClick={onAddNewRoute}
                      className="h-8 bg-brand hover:bg-brand/90 text-white font-bold text-xs rounded-lg px-3.5 gap-1.5 shadow-sm shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      + Add Route to Commercial Agreement
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              /* CASE A: No route exists at all */
              <div className="rounded-xl bg-amber-50/90 dark:bg-amber-950/40 p-4 border border-amber-200/90 dark:border-amber-900/60 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-amber-900 dark:text-amber-200">
                      No Commercial Agreement Route Found
                    </h4>
                    <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                      No commercial route exists for this Customer + Route + Vehicle Class + Line Type. Billing Rate and Driver Charge must come from an established agreement.
                    </p>
                  </div>
                </div>

                <div className="pt-1 flex items-center justify-between gap-3 border-t border-amber-200/60 dark:border-amber-900/40">
                  <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-amber-600" />
                    Add the required route to the agreement to proceed
                  </span>

                  {onAddNewRoute && (
                    <Button
                      type="button"
                      onClick={onAddNewRoute}
                      className="h-8 bg-brand hover:bg-brand/90 text-white font-bold text-xs rounded-lg px-3.5 gap-1.5 shadow-sm shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      + Add Route to Commercial Agreement
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Selected Route Commercial Snapshot (Immutable Display) */}
        {activeRateCard && (
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                Applied Commercial Snapshot
              </span>
              <Badge className="bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 text-[10px] font-bold">
                Commercial Agreement Locked
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Billing Rate (Customer)</span>
                <p className="text-base font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                  SAR {Number(activeRateCard.rate ?? activeRateCard.base_price ?? billingAmount ?? 0).toLocaleString()}
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-0.5">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Driver Charge (Payout)</span>
                {activeRateCard.driver_payout != null && Number(activeRateCard.driver_payout) > 0 ? (
                  <p className="text-base font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
                    SAR {Number(activeRateCard.driver_payout).toLocaleString()}
                  </p>
                ) : (
                  <p className="text-base font-extrabold text-slate-400 font-mono">—</p>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
