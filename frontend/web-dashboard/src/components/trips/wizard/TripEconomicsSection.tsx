import React from 'react';
import { TrendingUp, Info } from 'lucide-react';

interface TripEconomicsSectionProps {
  contractSlots: any[];
  masterDriver: string;
  assignmentType: 'own' | 'third_party' | '3pl';
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
  const primarySlot = contractSlots[0] || {};
  const revenueNum = Number(primarySlot.billingAmount || primarySlot.matchedRateCard?.rate || 0);

  const is3PL = assignmentType === 'third_party' || assignmentType === '3pl';
  const thirdPartyCostNum = is3PL && thirdPartyCost ? Number(thirdPartyCost) : null;
  const is3PLCostKnown = thirdPartyCostNum != null && thirdPartyCostNum > 0;
  const contributionNum = is3PLCostKnown ? revenueNum - thirdPartyCostNum : null;
  const marginPercent = is3PLCostKnown && revenueNum > 0 ? ((contributionNum! / revenueNum) * 100).toFixed(1) : null;

  return (
    <div className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 text-xs space-y-1.5">
      <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
        <h4 className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-brand shrink-0" /> COMMERCIAL REVENUE
        </h4>
        <span className="text-[10px] font-bold text-slate-500">
          {is3PL ? '3PL Partner Economics' : 'Own Fleet Trip'}
        </span>
      </div>

      {/* REVENUE */}
      <div className="flex items-center justify-between font-bold">
        <span className="text-slate-500 font-medium">Customer Revenue:</span>
        <span className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
          {revenueNum > 0 ? `SAR ${revenueNum.toLocaleString()}` : '— Rate Unset'}
        </span>
      </div>

      {/* ONLY SHOW 3PL COST & MARGIN IF 3PL PARTNER MODE IS ACTIVE */}
      {is3PL ? (
        <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-medium">3PL Sub-Contractor Payout:</span>
            <span className="font-extrabold text-slate-800 dark:text-slate-100">
              {is3PLCostKnown ? `SAR ${thirdPartyCostNum!.toLocaleString()}` : '— Pending 3PL Cost'}
            </span>
          </div>

          <div className="flex items-center justify-between font-bold text-xs pt-1">
            <span className="text-slate-700 dark:text-slate-300">3PL Net Margin:</span>
            {is3PLCostKnown ? (
              <div className="text-right">
                <span className="text-emerald-700 dark:text-emerald-400 font-extrabold">
                  SAR {contributionNum!.toLocaleString()}
                </span>
                <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                  {marginPercent}%
                </span>
              </div>
            ) : (
              <span className="text-[11px] text-slate-400 font-normal italic flex items-center gap-1">
                <Info className="w-3 h-3 text-slate-400" /> Pending 3PL cost
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="pt-1 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
          <span>Execution Fleet:</span>
          <span className="font-bold text-emerald-700 dark:text-emerald-400">✓ Own Internal Fleet</span>
        </div>
      )}
    </div>
  );
};
