import { CheckCircle2, Coins, Truck, Calendar, UserCheck } from 'lucide-react';
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
  contractRateCategory,
  contractVehicleType,
  assignMode,
  contractSlots,
  selectedDatesCount,
  batchTripRows,
}: Step5ReviewProps) {
  const billingTotal = (contractSlots.reduce((sum, s) => sum + (Number(s.billingAmount) || 0), 0)) * selectedDatesCount;

  return (
    <div className="w-full space-y-4 animate-fade-in py-1">
      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-200 dark:border-slate-800 w-full">
        <div className="space-y-0.5">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Ready to Generate {batchTripRows.length} Monthly Trips
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Total Estimated Revenue: <span className="font-bold text-slate-900 dark:text-slate-100">SAR {billingTotal.toLocaleString()}</span> across {selectedDatesCount} operating days.
          </p>
        </div>
      </div>

      {/* 4-Card Instrument KPI Grid - Full Width */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 w-full">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs flex flex-col justify-between w-full">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estimated Billing</span>
              <Coins className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-lg font-extrabold text-emerald-600 block mt-1">
              SAR {billingTotal.toLocaleString()}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">({selectedDatesCount} days × {contractSlots.length} slots)</span>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs flex flex-col justify-between w-full">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Batch Volume</span>
              <Truck className="w-4 h-4 text-brand" />
            </div>
            <span className="text-lg font-extrabold text-slate-900 dark:text-slate-100 block mt-1">
              {batchTripRows.length} Trips
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Over {selectedDatesCount} operating days</span>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs flex flex-col justify-between w-full">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Configuration</span>
              <Calendar className="w-4 h-4 text-brand" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block mt-1.5 truncate">
              {contractRateCategory} • {contractVehicleType}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium truncate">
            {contractSlots.filter((s) => s.isOvernight).length} overnight slot(s)
          </span>
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xs flex flex-col justify-between w-full">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assignments</span>
              <UserCheck className="w-4 h-4 text-indigo-500" />
            </div>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block mt-1 truncate">
              {assignMode === 'alternating' ? 'A/B Rotation' : 'Single Driver'}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Auto-fill mapping applied</span>
        </div>
      </div>

      {/* Detailed Slots Ledger - Full Width */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs w-full">
        <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h5 className="text-xs font-bold text-slate-900 dark:text-slate-100">Daily Slots & Transit Times</h5>
          <span className="text-[10px] font-semibold text-slate-500 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded">
            {contractSlots.length} Active {contractSlots.length === 1 ? 'Slot' : 'Slots'}
          </span>
        </div>
        <div className="overflow-x-auto w-full">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
              <tr>
                <th className="px-4 py-2.5">Slot</th>
                <th className="px-4 py-2.5">Route</th>
                <th className="px-4 py-2.5">Pickup Time</th>
                <th className="px-4 py-2.5">Dropoff Time</th>
                <th className="px-4 py-2.5 text-right">Contract Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {contractSlots.map((s, idx) => (
                <tr key={s.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-2 font-semibold">Slot #{idx + 1}</td>
                  <td className="px-4 py-2 font-medium">{s.origin} ➔ {s.destination}</td>
                  <td className="px-4 py-2">{s.pickupTime}</td>
                  <td className="px-4 py-2">{s.dropoffTime}</td>
                  <td className="px-4 py-2 text-right font-bold text-slate-900 dark:text-slate-100">
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
