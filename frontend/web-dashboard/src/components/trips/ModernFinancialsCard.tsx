import React from 'react';
import { DollarSign, Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ModernFinancialsCardProps {
  customerBilling?: number;
  baseRate?: number;
  driverPayout?: number;
  is3PL?: boolean;
  extraDriverPayment?: number;
  additionalCharges?: number;
  additionalChargesCount?: number;
  balanceMargin?: number;
  marginPercent?: string | number;
  totalAmount?: number;
  paidAmount?: number;
  balanceDue?: number;
  tripType?: string;
  quotationName?: string | null;
  quotationId?: string | null;
  isMonthlyContract?: boolean;
  monthlyContractRate?: number;
  onAddCharge: () => void;
  onViewBreakdown?: () => void;
}

export default function ModernFinancialsCard({
  customerBilling,
  baseRate,
  driverPayout = 0,
  is3PL = false,
  extraDriverPayment = 0,
  additionalCharges = 0,
  additionalChargesCount = 0,
  balanceMargin,
  marginPercent,
  totalAmount,
  paidAmount = 0,
  balanceDue,
  quotationName,
  quotationId,
  onAddCharge,
}: ModernFinancialsCardProps) {
  // Resolve customer billing amount
  const billingVal = customerBilling !== undefined ? customerBilling : (baseRate ?? 0);
  const addChargesVal = additionalCharges ?? 0;
  const driverPayoutVal = driverPayout ?? 0;

  // Resolve total amount for this trip (Customer Billing + Extras)
  const resolvedTotal = totalAmount !== undefined ? totalAmount : (billingVal + addChargesVal);

  // Margin math matching trip creation
  const resolvedMargin = balanceMargin !== undefined ? balanceMargin : (resolvedTotal - driverPayoutVal);
  const resolvedMarginPercent = marginPercent !== undefined
    ? String(marginPercent)
    : (resolvedTotal > 0 ? ((resolvedMargin / resolvedTotal) * 100).toFixed(1) : '0.0');

  const driverPayoutLabel = is3PL ? '3PL Payout' : 'Driver Payout';

  return (
    <div className="w-full h-full bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] px-4.5 py-4 flex flex-col justify-between gap-3 text-[#3E3C3D] dark:text-slate-100">
      {/* Top Section */}
      <div className="flex flex-col gap-2.5">
        {/* HEADER: $ FINANCIAL SUMMARY & QUOTATION NAME */}
        <div className="pb-1.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <DollarSign className="w-4 h-4 text-[#FA634E] shrink-0" />
            <h4 className="text-[11px] font-extrabold text-[#FA634E] uppercase tracking-wider">
              FINANCIAL SUMMARY
            </h4>
          </div>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 max-w-[160px] truncate shrink-0 border border-slate-200/80 dark:border-slate-700"
            title={quotationName ? `Applied Quotation: ${quotationName}` : 'No Quotation (Ad-hoc / Manual Rate)'}
          >
            <FileText size={10} className="shrink-0 text-slate-500" />
            <span className="truncate">{quotationName || 'Ad-hoc Rate'}</span>
          </span>
        </div>

        {/* METRIC ROWS — MATCHING TRIP CREATION PAGE */}
        <div className="space-y-1">
          {/* ROW 1: CUSTOMER BILLING */}
          <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Customer Billing
            </span>
            <span className="text-xs font-black font-mono text-[#1F2937] dark:text-white">
              SAR {billingVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* ROW 2: DRIVER PAYOUT / DRIVER CHARGE (DEDUCTED WITH MINUS SIGN) */}
          <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 gap-2">
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {driverPayoutLabel}
              </span>
              {extraDriverPayment > 0 && (
                <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400">
                  Incl. SAR {extraDriverPayment} extra
                </span>
              )}
            </div>
            <span className="text-xs font-black font-mono text-rose-600 dark:text-rose-400">
              {driverPayoutVal > 0
                ? `- SAR ${driverPayoutVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                : 'SAR 0.00'}
            </span>
          </div>

          {/* ROW 3: ADDITIONAL CHARGES */}
          <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-slate-50/70 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Additional Charges
            </span>
            <span className="text-xs font-black font-mono text-[#1F2937] dark:text-white">
              {addChargesVal > 0
                ? `+ SAR ${addChargesVal.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                : 'SAR 0.00'}
            </span>
          </div>

          {/* ROW 4: BALANCE */}
          <div className="flex items-center justify-between py-2 px-2.5 rounded-lg bg-orange-50/40 dark:bg-orange-950/20 border border-orange-200/70 dark:border-orange-900/50 mt-1">
            <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Balance
            </span>
            <div className="flex items-center gap-1.5 font-mono">
              <span className={cn(
                "text-xs font-black",
                resolvedMargin >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              )}>
                SAR {resolvedMargin.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </span>
              <span className={cn(
                "text-[10px] font-extrabold px-1.5 py-0.2 rounded-full border",
                resolvedMargin >= 0
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                  : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
              )}>
                {resolvedMarginPercent}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons — ONLY Add Charge Needed */}
      <div className="pt-2 mt-auto border-t border-slate-100 dark:border-slate-800">
        <Button
          variant="outline"
          size="sm"
          onClick={onAddCharge}
          className="w-full h-8 rounded-xl border-orange-200 text-[#FA634E] hover:bg-orange-50 dark:border-orange-900/60 dark:text-orange-400 dark:hover:bg-orange-950/40 text-[11px] font-bold gap-1 shadow-none cursor-pointer"
        >
          <Plus size={13} />
          {additionalChargesCount > 0 ? `Add Charge (${additionalChargesCount})` : 'Add Charge'}
        </Button>
      </div>
    </div>
  );
}
