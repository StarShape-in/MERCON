import React from 'react';
import { Receipt, Loader2, AlertTriangle, DollarSign, Tag, ArrowRight, Check, Keyboard, Pencil } from 'lucide-react';
import { Customer } from '@/services/customerService';
import { RateCard } from '@/services/rateCardService';
import { RateCategoryVehicleTypeForm } from '@/components/rate-cards';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  /** Tier for a brand-new rate card — nothing existing to read it off. */
  newRateVehicleType: string;
  newRateCategory: string;
  onSelectRateCard: (card: RateCard | null) => void;
  onSaveRateAsChange: (val: 'customer' | 'none') => void;
  onBillingAmountChange: (val: string) => void;
  onAdjustPrice: (amount: number) => void;
  onNewRateVehicleTypeChange: (val: string) => void;
  onNewRateCategoryChange: (val: string) => void;
}

export default function TripStepRatesBilling({
  pickupLocationName,
  dropoffLocationName,
  isLookingUpRate,
  availableRateCards,
  selectedRateCardId,
  matchedRateCard,
  rateSource,
  laneHasNoRate,
  saveRateAs,
  selectedCustomer,
  rateSaveWarning,
  billingAmount,
  newRateVehicleType,
  newRateCategory,
  onSelectRateCard,
  onSaveRateAsChange,
  onBillingAmountChange,
  onAdjustPrice,
  onNewRateVehicleTypeChange,
  onNewRateCategoryChange,
}: TripStepRatesBillingProps) {
  const hasAvailableCards = availableRateCards.length > 0;

  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-[#E8450F]" /> Lane Rate Card &amp; Billing Calculation
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Select from available contract rate cards or set custom pricing for {pickupLocationName || 'Origin'} → {dropoffLocationName || 'Destination'}.
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
          <Keyboard className="w-3.5 h-3.5 text-[#E8450F]" />
          <span>Press <kbd className="font-mono bg-white dark:bg-slate-900 px-1 py-0.2 border rounded text-slate-700 dark:text-slate-300 font-bold">1-3</kbd> for Rate Card, <kbd className="font-mono bg-white dark:bg-slate-900 px-1 py-0.2 border rounded text-slate-700 dark:text-slate-300 font-bold">Ctrl+↵</kbd> Schedule</span>
        </div>
      </div>

      {/* Hero Route Banner */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-3.5 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-slate-100">
          <span className="px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-extrabold">
            {pickupLocationName || 'Origin'}
          </span>
          <ArrowRight className="w-4 h-4 text-slate-400" />
          <span className="px-2.5 py-1 rounded-lg bg-orange-100 dark:bg-orange-950/80 text-orange-800 dark:text-orange-300 font-extrabold">
            {dropoffLocationName || 'Destination'}
          </span>
        </div>

        {selectedCustomer && (
          <span className="text-[11px] text-slate-500 font-semibold truncate max-w-[200px]">
            Account: {selectedCustomer.name}
          </span>
        )}
      </div>

      {/* Rate Calculation & Billing Card */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-5 shadow-xs">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-600" /> Contract Pricing Engine
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Choose a contract rate card or enter a custom rate
            </p>
          </div>

          {isLookingUpRate && (
            <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Looking up contract rates...
            </div>
          )}
        </div>

        {/* Section 1: Selectable Available Rate Cards for Lane */}
        {hasAvailableCards ? (
          <div className="space-y-3">
            <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                Available Rate Cards ({availableRateCards.length})
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">Click or press 1-3</span>
            </Label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {availableRateCards.map((rc, idx) => {
                const isSelected = selectedRateCardId === rc.id;
                return (
                  <div
                    key={rc.id}
                    onClick={() => onSelectRateCard(rc)}
                    className={cn(
                      "p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 text-xs relative overflow-hidden",
                      isSelected
                        ? "border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20 shadow-xs"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.2 rounded text-[10px] text-slate-500 font-bold">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-100 block truncate">
                            {rc.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 block truncate pl-6">
                          {rc.route_origin} → {rc.route_destination}
                        </span>
                        {(rc.rate_category || rc.vehicle_type) && (
                          <span className="flex flex-wrap items-center gap-1 pl-6 pt-0.5">
                            {rc.rate_category && (
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0 rounded bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">
                                {rc.rate_category}
                              </span>
                            )}
                            {rc.vehicle_type && (
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                                {rc.vehicle_type}
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="font-extrabold text-sm text-emerald-700 dark:text-emerald-300 font-mono">
                        SAR {rc.base_price.toLocaleString()}
                      </span>
                      <span className={cn("text-[10px] font-extrabold px-2.5 py-1 rounded-lg flex items-center gap-1", isSelected ? "bg-emerald-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300")}>
                        {isSelected && <Check className="w-3 h-3" />}
                        <span>{isSelected ? 'Selected' : 'Use Rate'}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Select Custom Option */}
            <button
              type="button"
              onClick={() => onSelectRateCard(null)}
              className={cn(
                "w-full p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer mt-1",
                !selectedRateCardId
                  ? "border-[#E8450F] bg-orange-50/50 dark:bg-orange-950/20 text-[#E8450F] font-bold"
                  : "border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400"
              )}
            >
              <span className="flex items-center gap-1.5">
                <Pencil className="w-3.5 h-3.5 text-slate-500" />
                <span>Custom Billing Amount / Enter Manual Rate</span>
              </span>
              {!selectedRateCardId && <span className="text-[10px] font-bold px-2 py-0.5 bg-[#E8450F] text-white rounded-md">Custom Mode</span>}
            </button>
          </div>
        ) : null}

        {/* Section 2: Save New Rate Card Option when No Rate Selected / Custom Mode */}
        {(!selectedRateCardId || laneHasNoRate) && (
          <div className="rounded-xl bg-amber-50/80 dark:bg-amber-950/30 p-4 border border-amber-200/80 dark:border-amber-900 space-y-3 text-xs">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900 dark:text-amber-200">
                  {hasAvailableCards ? 'Custom Billing Rate Selected' : `No contract rate card found for ${pickupLocationName || 'origin'} → ${dropoffLocationName || 'destination'}`}
                </p>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                  Enter the billing price below and choose whether to save it as a reusable rate card.
                </p>
              </div>
            </div>

            <div className="space-y-1.5 pl-6 pt-1">
              {([
                { key: 'customer', label: `Save for ${selectedCustomer?.name || 'this customer'}`, hint: 'Reused on their future trips for this lane' },
                { key: 'none', label: 'One-off price (Do not save rate card)', hint: 'Applies to this trip only' },
              ] as const).map((opt) => (
                <label key={opt.key} className="flex items-start gap-2 cursor-pointer text-xs">
                  <input
                    type="radio"
                    name="save_rate_as"
                    checked={saveRateAs === opt.key}
                    onChange={() => onSaveRateAsChange(opt.key)}
                    className="mt-0.5 accent-[#E8450F]"
                  />
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{opt.label}</span>
                    <span className="block text-[10px] text-slate-500">{opt.hint}</span>
                  </div>
                </label>
              ))}
            </div>

            {/* Which tonnage/booking type this price is actually for. */}
            <div className="pl-6 pt-1">
              <RateCategoryVehicleTypeForm
                vehicleType={newRateVehicleType}
                onVehicleTypeChange={onNewRateVehicleTypeChange}
                rateCategory={newRateCategory}
                onRateCategoryChange={onNewRateCategoryChange}
                size="sm"
                showPreviewBar={false}
              />
            </div>
          </div>
        )}

        {rateSaveWarning && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5 text-xs font-semibold text-rose-700">
            {rateSaveWarning}
          </div>
        )}

        {/* Billing Amount Input & Quick Adjustments */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <Label htmlFor="modal_billing_amount" className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Trip Billing Amount (SAR) <span className="text-rose-500">*</span>
            </Label>
            {billingAmount && (
              <span className="text-xs font-mono font-extrabold text-[#E8450F]">
                Total Billed: SAR {Number(billingAmount).toLocaleString()}
              </span>
            )}
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
              SAR
            </span>
            <Input
              id="modal_billing_amount"
              type="number"
              step="0.01"
              min="0"
              value={billingAmount}
              onChange={(e) => onBillingAmountChange(e.target.value)}
              placeholder={matchedRateCard ? String(matchedRateCard.base_price) : 'e.g. 3500.00'}
              className="h-11 pl-12 rounded-xl font-mono text-sm font-bold border-slate-200 dark:border-slate-800 focus-visible:ring-[#E8450F]/20 focus-visible:border-[#E8450F]"
            />
          </div>

          {/* Quick Adjustment Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mr-1">
              Quick Adjustments:
            </span>
            <button
              type="button"
              onClick={() => onAdjustPrice(100)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              +100 SAR
            </button>
            <button
              type="button"
              onClick={() => onAdjustPrice(250)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              +250 SAR
            </button>
            <button
              type="button"
              onClick={() => onAdjustPrice(500)}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              +500 SAR
            </button>
            <button
              type="button"
              onClick={() => onBillingAmountChange('2500')}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              2.5k SAR
            </button>
            <button
              type="button"
              onClick={() => onBillingAmountChange('3500')}
              className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              3.5k SAR
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
