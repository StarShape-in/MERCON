import React, { useState } from 'react';
import { DollarSign, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TripEconomicsSectionProps {
  contractSlots: any[];
  masterDriver: string;
  assignmentType: 'own' | 'third_party' | '3pl' | 'fleet';
  thirdPartyCost?: string;
  marginMetrics?: any;
}

export const TripEconomicsSection: React.FC<TripEconomicsSectionProps> = ({
  contractSlots,
  masterDriver,
  assignmentType,
  thirdPartyCost,
  marginMetrics,
}) => {
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);
  const primarySlot = contractSlots[0] || {};
  const billingAmountNum = Number(primarySlot.billingAmount || primarySlot.matchedRateCard?.rate || 0);

  const is3PL = assignmentType === 'third_party' || assignmentType === '3pl';
  const thirdPartyCostNum = is3PL && thirdPartyCost ? Number(thirdPartyCost) : 0;
  
  // Driver payout (never fabricate driver charges if unknown)
  const driverPayoutNum = is3PL ? thirdPartyCostNum : 0;

  const totalCost = driverPayoutNum + additionalCharges;
  const balanceMarginNum = billingAmountNum - totalCost;
  const marginPercent = billingAmountNum > 0 ? ((balanceMarginNum / billingAmountNum) * 100).toFixed(1) : '0.0';

  return (
    <div className="p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-2.5 text-[#3E3C3D] dark:text-slate-100">
      {/* HEADER: FINANCIAL SUMMARY */}
      <div className="pb-1 border-b border-slate-100 dark:border-slate-800">
        <h4 className="text-[11px] font-extrabold text-rose-500 uppercase tracking-wider flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5 text-rose-500 shrink-0" /> FINANCIAL SUMMARY
        </h4>
      </div>

      {/* ROW 1: CUSTOMER BILLING */}
      <div className="pb-2 border-b border-slate-100 dark:border-slate-800/80 space-y-0.5">
        <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
          CUSTOMER BILLING
        </span>
        <div className="flex items-baseline justify-between font-mono">
          <span className="text-base font-extrabold text-slate-900 dark:text-white">
            SAR {billingAmountNum.toLocaleString()}
          </span>
          <span className="text-xs text-slate-400 font-sans font-medium">/trip</span>
        </div>
      </div>

      {/* ROW 2: DRIVER PAYOUT / 3PL COST */}
      <div className="pb-2 border-b border-slate-100 dark:border-slate-800/80 space-y-0.5">
        <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider block">
          {is3PL ? '3PL PAYOUT' : 'DRIVER PAYOUT'}
        </span>
        <div className="flex items-baseline justify-between font-mono">
          <span className="text-base font-extrabold text-slate-900 dark:text-white">
            SAR {driverPayoutNum.toLocaleString()}
          </span>
          <span className="text-xs text-slate-400 font-sans font-medium">/trip</span>
        </div>
      </div>

      {/* ROW 3: ADDITIONAL CHARGES */}
      <div className="pb-2 border-b border-slate-100 dark:border-slate-800/80 space-y-0.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-400 uppercase tracking-wider">
            ADDITIONAL CHARGES
          </span>
          <button
            type="button"
            onClick={() => {
              const val = prompt('Enter additional charge amount (SAR):', String(additionalCharges));
              if (val !== null && !isNaN(Number(val))) {
                setAdditionalCharges(Math.max(0, Number(val)));
              }
            }}
            className="text-[11px] font-bold text-rose-500 hover:text-rose-600 flex items-center gap-0.5 cursor-pointer"
          >
            <Plus className="w-3 h-3" /> Add Charge
          </button>
        </div>
        <div className="font-mono text-base font-extrabold text-slate-900 dark:text-white">
          SAR {additionalCharges.toFixed(2)}
        </div>
      </div>

      {/* ROW 4: BALANCE / MARGIN */}
      <div className="pt-0.5 space-y-0.5">
        <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
          BALANCE / MARGIN
        </span>
        <div className="flex items-center justify-between">
          <span className={cn(
            "text-base font-extrabold font-mono",
            balanceMarginNum >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          )}>
            SAR {balanceMarginNum.toLocaleString()}
          </span>
          <span className={cn(
            "text-xs font-extrabold px-2 py-0.5 rounded-full border",
            balanceMarginNum >= 0
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
              : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
          )}>
            {marginPercent}%
          </span>
        </div>
      </div>
    </div>
  );
};
