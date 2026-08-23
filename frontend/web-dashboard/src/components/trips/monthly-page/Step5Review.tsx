import { CheckCircle2, Coins, Truck, Calendar, UserCheck, Loader2, Sparkles, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KbdBadge } from '@/components/ui/KbdBadge';
import { Customer } from '@/services/customerService';
import { ContractSlot, BatchTripRow } from './types';

interface Step5ReviewProps {
  selectedCustomer: Customer | undefined;
  contractRateCategory: string;
  contractVehicleType: string;
  assignMode: 'single' | 'alternating';
  contractSlots: ContractSlot[];
  selectedDatesCount: number;
  batchTripRows: BatchTripRow[];
  isSubmitting: boolean;
  onConfirm: () => void;
  onBack: () => void;
}

export default function Step5Review({
  selectedCustomer,
  contractRateCategory,
  contractVehicleType,
  assignMode,
  contractSlots,
  selectedDatesCount,
  batchTripRows,
  isSubmitting,
  onConfirm,
  onBack,
}: Step5ReviewProps) {
  const billingTotal = (contractSlots.reduce((sum, s) => sum + (Number(s.billingAmount) || 0), 0)) * selectedDatesCount;

  return (
    <div className="space-y-4 animate-fade-in py-1 max-w-5xl mx-auto">
      <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="space-y-0.5">
          <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Ready to Generate {batchTripRows.length} Monthly Trips
          </h3>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Total Estimated Revenue: <span className="font-bold text-slate-900 dark:text-slate-100">SAR {billingTotal.toLocaleString()}</span> across {selectedDatesCount} operating days.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="h-8 px-3.5 rounded-xl font-bold text-xs"
          >
            <ChevronLeft className="w-3.5 h-3.5 mr-1" />
            Adjust Assignments
          </Button>

          <Button
            type="button"
            disabled={isSubmitting || batchTripRows.length === 0}
            onClick={onConfirm}
            className="h-8 px-5 rounded-xl bg-brand hover:bg-[#d13d0d] text-white font-bold text-xs shadow-md gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Confirm & Generate {batchTripRows.length} Trips <KbdBadge keys="Ctrl+S" />
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 4-Card Instrument KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimated Billing</span>
              <Coins className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <span className="text-base font-extrabold text-emerald-600 block mt-1">
              SAR {billingTotal.toLocaleString()}
            </span>
          </div>
          <span className="text-[9px] text-slate-400 font-medium">({selectedDatesCount} days × {contractSlots.length} slots)</span>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Batch Volume</span>
              <Truck className="w-3.5 h-3.5 text-brand" />
            </div>
            <span className="text-base font-extrabold text-slate-900 dark:text-slate-100 block mt-1">
              {batchTripRows.length} Trips
            </span>
          </div>
          <span className="text-[9px] text-slate-400 font-medium">Over {selectedDatesCount} operating days</span>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Configuration</span>
              <Calendar className="w-3.5 h-3.5 text-brand" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block mt-1 truncate">
              {contractRateCategory} • {contractVehicleType}
            </span>
          </div>
          <span className="text-[9px] text-slate-400 font-medium truncate">
            {contractSlots.filter((s) => s.isOvernight).length} overnight slot(s)
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assignments</span>
              <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block mt-1 truncate">
              {assignMode === 'alternating' ? 'A/B Rotation' : 'Single Driver'}
            </span>
          </div>
          <span className="text-[9px] text-slate-400 font-medium">Auto-fill mapping applied</span>
        </div>
      </div>

      {/* Detailed Slots Ledger */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
        <div className="p-2.5 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">Daily Slots & Transit Times</h5>
          <span className="text-[10px] font-semibold text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded">
            {contractSlots.length} Active {contractSlots.length === 1 ? 'Slot' : 'Slots'}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
              <tr>
                <th className="px-3 py-2">Slot</th>
                <th className="px-3 py-2">Route</th>
                <th className="px-3 py-2">Pickup Time</th>
                <th className="px-3 py-2">Dropoff Time</th>
                <th className="px-3 py-2 text-right">Contract Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {contractSlots.map((s, idx) => (
                <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="px-3 py-2 font-semibold">Slot #{idx + 1}</td>
                  <td className="px-3 py-2 font-medium">{s.origin} ➔ {s.destination}</td>
                  <td className="px-3 py-2">{s.pickupTime}</td>
                  <td className="px-3 py-2">{s.dropoffTime}</td>
                  <td className="px-3 py-2 text-right font-bold text-slate-900 dark:text-slate-100">
                    {s.billingAmount ? `SAR ${s.billingAmount}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
