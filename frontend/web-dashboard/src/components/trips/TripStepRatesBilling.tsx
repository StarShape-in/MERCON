import React from 'react';
import { Receipt, Loader2, AlertTriangle, DollarSign, Tag, Check, Keyboard, Pencil } from 'lucide-react';
import { Customer } from '@/services/customerService';
import { RateCard } from '@/services/rateCardService';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
  onSelectRateCard: (card: RateCard | null) => void;
  onSaveRateAsChange: (val: 'customer' | 'none') => void;
  onBillingAmountChange: (val: string) => void;
  onAdjustPrice: (amount: number) => void;
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
  onSelectRateCard,
  onSaveRateAsChange,
  onBillingAmountChange,
  onAdjustPrice,
}: TripStepRatesBillingProps) {
  const hasAvailableCards = availableRateCards.length > 0;

  return (
    <div className="space-y-3 animate-in fade-in-50 duration-200">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Receipt className="w-4 h-4 text-brand" /> Pricing
        </h3>
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200/80 dark:border-slate-700">
          <Keyboard className="w-3.5 h-3.5 text-brand" />
          <span>Press <kbd className="font-mono bg-white dark:bg-slate-900 px-1 py-0.2 border rounded text-slate-700 dark:text-slate-300 font-bold">1-3</kbd> Rate Card</span>
        </div>
      </div>

      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-3.5 shadow-xs !overflow-visible">
        {/* Quotations for this lane */}
        {hasAvailableCards && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                Quotations for {pickupLocationName || 'Origin'} → {dropoffLocationName || 'Destination'} ({availableRateCards.length})
              </Label>
              {isLookingUpRate && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {availableRateCards.map((rc, idx) => {
                const isSelected = selectedRateCardId === rc.id;
                const driverPayout = rc.driver_payout;
                return (
                  <div
                    key={rc.id}
                    onClick={() => onSelectRateCard(rc)}
                    className={cn(
                      'p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 text-xs',
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                    )}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-1.5 py-0.2 rounded text-[10px] text-slate-500 font-bold">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 truncate">{rc.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 ml-auto shrink-0" />}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-emerald-700 dark:text-emerald-300 font-mono">
                        SAR {Number(rc.rate ?? rc.base_price ?? 0).toLocaleString()}
                      </span>
                      {driverPayout != null && Number(driverPayout) > 0 && (
                        <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400">
                          (Driver Charge: SAR {Number(driverPayout).toLocaleString()})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => onSelectRateCard(null)}
              className={cn(
                'w-full py-1.5 px-2.5 rounded-lg border text-[11px] font-semibold flex items-center justify-between transition-all cursor-pointer',
                !selectedRateCardId
                  ? 'border-brand bg-orange-50/50 dark:bg-orange-950/20 text-brand font-bold'
                  : 'border-dashed border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-400'
              )}
            >
              <span className="flex items-center gap-1.5">
                <Pencil className="w-3.5 h-3.5 text-slate-500" /> Custom rate instead
              </span>
              {!selectedRateCardId && <span className="text-[10px] font-bold px-2 py-0.5 bg-brand text-white rounded-md">Active</span>}
            </button>
          </div>
        )}

        {/* No quotation for this lane yet — save choice, one compact row */}
        {(!selectedRateCardId || laneHasNoRate) && (
          <div className="rounded-lg bg-amber-50/80 dark:bg-amber-950/30 px-3 py-2 border border-amber-200/80 dark:border-amber-900 text-xs">
            <p className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              {hasAvailableCards ? 'Custom rate — save as Quotation for reuse?' : `No quotation yet for ${pickupLocationName || 'origin'} → ${dropoffLocationName || 'destination'}`}
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-1.5 pl-5">
              {([
                { key: 'customer', label: `Save as Quotation for ${selectedCustomer?.name || 'customer'}` },
                { key: 'none', label: "Don't save (one-off trip)" },
              ] as const).map((opt) => (
                <label key={opt.key} className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                  <input
                    type="radio"
                    name="save_rate_as"
                    checked={saveRateAs === opt.key}
                    onChange={() => onSaveRateAsChange(opt.key)}
                    className="accent-brand"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>
        )}

        {rateSaveWarning && (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-2 text-[11px] font-semibold text-rose-700">
            {rateSaveWarning}
          </div>
        )}

        {/* Billing amount — the hero number */}
        <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
          <Label htmlFor="modal_billing_amount" className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" /> Total Trip Amount <span className="text-rose-500">*</span>
          </Label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">SAR</span>
            <Input
              id="modal_billing_amount"
              type="number"
              step="0.01"
              min="0"
              value={billingAmount}
              onChange={(e) => onBillingAmountChange(e.target.value)}
              placeholder={matchedRateCard ? String(matchedRateCard.base_price) : 'e.g. 3500.00'}
              className="h-12 pl-14 rounded-xl font-mono text-lg font-extrabold text-brand border-slate-200 dark:border-slate-800 focus-visible:ring-brand/20 focus-visible:border-brand"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {[100, 250, 500].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => onAdjustPrice(amt)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                +{amt}
              </button>
            ))}
            {['2500', '3500'].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => onBillingAmountChange(amt)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 transition-all cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                {Number(amt) / 1000}k
              </button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}
