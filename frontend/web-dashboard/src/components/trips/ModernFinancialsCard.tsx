import React from 'react';
import { Plus, FileText, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaxonomyBadge } from '@/components/common/TaxonomyBadge';

interface ModernFinancialsCardProps {
  baseRate: number;
  additionalCharges: number;
  totalAmount: number;
  paidAmount?: number;
  balanceDue?: number;
  tripType?: string;
  onAddCharge: () => void;
  onViewBreakdown?: () => void;
}

export default function ModernFinancialsCard({
  baseRate,
  additionalCharges,
  totalAmount,
  paidAmount = 0,
  balanceDue,
  tripType,
  onAddCharge,
  onViewBreakdown,
}: ModernFinancialsCardProps) {
  const calculatedBalance = balanceDue !== undefined ? balanceDue : totalAmount - paidAmount;

  return (
    <div className="w-full h-full bg-white rounded-2xl border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)] px-4.5 py-4 flex flex-col justify-between gap-3">
      {/* Top Content Container */}
      <div className="flex flex-col gap-3">
        {/* Header Row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="font-bold text-[14px] text-[#1F2937] shrink-0">Financials</h3>
            {tripType && (
              <TaxonomyBadge
                category="LINE_TYPE"
                value={tripType}
                fallbackText="Single Trip"
                size="sm"
                className="shrink-0"
              />
            )}
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border border-[#E5E7EB] text-[11px] font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors shrink-0"
          >
            <span>SAR</span>
            <ChevronDown size={11} className="text-[#9CA3AF]" />
          </button>
        </div>

        {/* Total Amount Headline */}
        <div>
          <span className="text-[10.5px] font-medium text-[#6B7280] block">Total Amount</span>
          <div className="font-mono font-black text-2xl text-[#1F2937] tracking-tight">
            SAR {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Paid vs Balance Due Row */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100">
          <div>
            <span className="text-[10px] font-medium text-[#6B7280] block">Paid</span>
            <span className="font-mono font-bold text-[13px] text-emerald-600">
              SAR {paidAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span className="text-[10px] font-medium text-[#6B7280] block">Balance Due</span>
            <span className="font-mono font-bold text-[13px] text-[#EF4444]">
              SAR {calculatedBalance.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Itemized breakdown */}
        <div className="space-y-1.5 text-[11px] pt-1 border-t border-[#F3F4F6]">
          {tripType && (
            <div className="flex justify-between items-center text-[#4B5563]">
              <span>Trip Type</span>
              <span className="font-semibold text-[#1F2937]">
                {tripType}
              </span>
            </div>
          )}
          <div className="flex justify-between text-[#4B5563]">
            <span>Base Rate</span>
            <span className="font-mono font-semibold text-[#1F2937]">
              SAR {baseRate.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="flex justify-between text-[#4B5563]">
            <span>Additional Charges</span>
            <span className="font-mono font-semibold text-[#1F2937]">
              SAR {additionalCharges.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="pt-1.5 border-t border-[#E5E7EB] flex justify-between font-bold text-[#1F2937]">
            <span>Total</span>
            <span className="font-mono">
              SAR {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-2 pt-1 mt-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onAddCharge}
          className="h-8 rounded-xl border-blue-200 text-blue-600 hover:bg-blue-50 text-[11px] font-bold gap-1 shadow-none cursor-pointer"
        >
          <Plus size={13} />
          Add Charge
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onViewBreakdown}
          className="h-8 rounded-xl border-[#E5E7EB] text-slate-700 hover:bg-slate-50 text-[11px] font-bold gap-1 shadow-none cursor-pointer"
        >
          <FileText size={12} className="text-[#6B7280]" />
          View Breakdown
        </Button>
      </div>
    </div>
  );
}
