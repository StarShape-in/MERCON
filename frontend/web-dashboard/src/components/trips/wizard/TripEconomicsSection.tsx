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

  const driverCostNum = marginMetrics?.cost
    ? Number(marginMetrics.cost)
    : assignmentType === '3pl' && thirdPartyCost
    ? Number(thirdPartyCost)
    : null;

  const isCostKnown = driverCostNum != null && driverCostNum > 0;
  const contributionNum = isCostKnown ? revenueNum - driverCostNum : null;
  const marginPercent = isCostKnown && revenueNum > 0 ? ((contributionNum! / revenueNum) * 100).toFixed(1) : null;

  return (
    <div className="p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 shadow-2xs space-y-2">
      <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
        <h4 className="text-[11px] font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-brand shrink-0" /> TRIP ECONOMICS
        </h4>
        <span className="text-[10px] font-bold text-slate-500">Live Margin</span>
      </div>

      <div className="space-y-1 text-xs">
        {/* REVENUE */}
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">Customer Revenue:</span>
          <span className="font-extrabold text-slate-800 dark:text-slate-100">
            {revenueNum > 0 ? `SAR ${revenueNum.toLocaleString()}` : '—'}
          </span>
        </div>

        {/* DRIVER COST */}
        <div className="flex items-center justify-between">
          <span className="text-slate-500 font-medium">Driver / 3PL Cost:</span>
          <span className="font-extrabold text-slate-800 dark:text-slate-100">
            {isCostKnown ? `SAR ${driverCostNum!.toLocaleString()}` : '— Pending assignment'}
          </span>
        </div>

        {/* CONTRIBUTION & MARGIN */}
        <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between font-bold">
          <span className="text-slate-700 dark:text-slate-300">Contribution Margin:</span>
          {isCostKnown ? (
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
              <Info className="w-3 h-3 text-slate-400" /> Pending driver cost
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
