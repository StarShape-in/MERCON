import React from 'react';
import { Receipt, Loader2, AlertTriangle, DollarSign, Tag, ArrowRight } from 'lucide-react';
import { Customer } from '@/services/customerService';
import { RateCard } from '@/services/rateCardService';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface TripStepRatesBillingProps {
  pickupLocationName: string;
  dropoffLocationName: string;
  isLookingUpRate: boolean;
  matchedRateCard: RateCard | null;
  rateSource: 'customer' | 'standard' | null;
  laneHasNoRate: boolean;
  saveRateAs: 'standard' | 'customer' | 'none';
  selectedCustomer: Customer | null;
  rateSaveWarning: string | null;
  billingAmount: string;
  onSaveRateAsChange: (val: 'standard' | 'customer' | 'none') => void;
  onBillingAmountChange: (val: string) => void;
  onAdjustPrice: (amount: number) => void;
}

export default function TripStepRatesBilling({
  pickupLocationName,
  dropoffLocationName,
  isLookingUpRate,
  matchedRateCard,
  rateSource,
  laneHasNoRate,
  saveRateAs,
  selectedCustomer,
  rateSaveWarning,
  billingAmount,
  onSaveRateAsChange,
  onBillingAmountChange,
  onAdjustPrice,
}: TripStepRatesBillingProps) {
  return (
    <div className="space-y-5 animate-in fade-in-50 duration-200">
      <div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-[#E8450F]" /> 4. Lane Rate Card &amp; Billing Calculation
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Automatic contract rate card pricing for {pickupLocationName || 'Origin'} → {dropoffLocationName || 'Destination'}.
        </p>
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
              System rate card matching for this operational lane
            </p>
          </div>

          {isLookingUpRate && (
            <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-semibold animate-pulse">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Looking up contract rate...
            </div>
          )}
        </div>

        {/* Matched Contract Rate */}
        {matchedRateCard && (
          <div className="rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 p-4 border border-emerald-200/80 dark:border-emerald-900 flex items-center justify-between text-xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-emerald-900 dark:text-emerald-200 text-sm">
                  Contract Rate Found: SAR {matchedRateCard.base_price.toLocaleString()}
                </span>
                <Badge className="bg-emerald-600 text-white text-[10px] uppercase tracking-wider font-extrabold">
                  {rateSource === 'customer' ? 'Customer Contract' : 'Standard Rate Card'}
                </Badge>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                Applied automatically to trip billing amount.
              </p>
            </div>
          </div>
        )}

        {/* No Rate Found Banner */}
        {laneHasNoRate && (
          <div className="rounded-xl bg-amber-50/80 dark:bg-amber-950/30 p-4 border border-amber-200/80 dark:border-amber-900 space-y-3 text-xs">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-900 dark:text-amber-200">
                  No contract rate found for {pickupLocationName || 'origin'} → {dropoffLocationName || 'destination'}
                </p>
                <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                  Enter the billing price below and choose how to save it for future dispatches.
                </p>
              </div>
            </div>

            <div className="space-y-1.5 pl-6 pt-1">
              {([
                { key: 'standard', label: 'Save as Standard Rate Card', hint: 'Applies to all customers on this lane' },
                { key: 'customer', label: `Save for ${selectedCustomer?.name || 'this customer'} only`, hint: 'Overrides standard rate for customer' },
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
