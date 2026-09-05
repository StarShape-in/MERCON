import React from 'react';
import {
  CheckCircle2,
  X,
  Building2,
  User,
  Truck,
  Calendar,
  DollarSign,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Tag,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import DriverAvatar from '@/components/ui/DriverAvatar';

interface TripReviewConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  contractCustomer: string;
  customers: any[];
  contractSlots: any[];
  contractBillingType: string;
  contractVehicleType: string;
  selectedMonth?: string;
  selectedDates?: string[];
  assignmentType?: 'own' | 'third_party';
  masterDriver?: string;
  masterVehicle?: string;
  drivers?: any[];
  vehicles?: any[];
  dayAssignments?: Record<string, any>;
  thirdPartyProviderId?: string;
  thirdPartyDriverName?: string;
  thirdPartyVehiclePlate?: string;
  thirdPartyCost?: number | string;
  thirdPartyProviders?: any[];
}

export const TripReviewConfirmModal: React.FC<TripReviewConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  isPending,
  contractCustomer,
  customers = [],
  contractSlots = [],
  contractBillingType,
  contractVehicleType,
  selectedMonth,
  selectedDates = [],
  assignmentType = 'own',
  masterDriver = '',
  masterVehicle = '',
  drivers = [],
  vehicles = [],
  dayAssignments = {},
  thirdPartyProviderId = '',
  thirdPartyDriverName = '',
  thirdPartyVehiclePlate = '',
  thirdPartyCost = 0,
  thirdPartyProviders = [],
}) => {
  if (!isOpen) return null;

  // Resolve Customer
  const customerObj = customers.find((c) => c.id === contractCustomer || c.name === contractCustomer);
  const customerName = customerObj?.name || contractCustomer || 'Unspecified Customer';

  // Resolve Primary Route Slot
  const primarySlot = contractSlots[0] || {};
  const originName = primarySlot.originName || primarySlot.origin || 'Origin';
  const destName = primarySlot.destinationName || primarySlot.destination || 'Destination';
  const intermediates: string[] = primarySlot.intermediates || [];
  const rateCategory = primarySlot.rateCategory || 'Standard';

  // Calculate Totals
  const totalOperatingDays = selectedDates.length || 1;
  const totalLanesCount = contractSlots.length || 1;
  const totalTripsCount = totalOperatingDays * totalLanesCount;
  const slotBillingTotal = contractSlots.reduce((sum, s) => sum + (Number(s.billingAmount) || 0), 0);
  const grandTotalBilling = slotBillingTotal * (contractBillingType === 'Monthly' ? 1 : totalOperatingDays);

  // Resolve Fleet Assignment Details
  const masterDriverObj = drivers.find((d) => d.id === masterDriver || d.name === masterDriver);
  const masterVehicleObj = vehicles.find((v) => v.id === masterVehicle || v.plateNumber === masterVehicle || v.plate_number === masterVehicle);
  const thirdPartyProviderObj = thirdPartyProviders.find((p) => p.id === thirdPartyProviderId);

  // Resolve Roster / Rotation Pairs if dayAssignments exist
  const assignedPairsMap = new Map<string, { driver: any; vehicle: any }>();
  Object.values(dayAssignments).forEach((a: any) => {
    if (a?.driverId || a?.vehicleId) {
      const key = `${a.driverId || ''}_${a.vehicleId || ''}`;
      if (!assignedPairsMap.has(key)) {
        const dObj = drivers.find((d) => d.id === a.driverId || d.name === a.driverId);
        const vObj = vehicles.find((v) => v.id === a.vehicleId || v.plateNumber === a.vehicleId);
        assignedPairsMap.set(key, { driver: dObj, vehicle: vObj });
      }
    }
  });

  const rosterPairs = Array.from(assignedPairsMap.values());

  return (
    <div className="fixed inset-0 z-[999] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden text-[#3E3C3D] dark:text-slate-200 animate-scale-in">
        
        {/* TOP BRAND ACCENT BAR */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#FA634E] via-[#F97316] to-[#FA634E]" />

        <div className="p-5 space-y-4">

          {/* MODAL HEADER */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/50 border border-orange-200/80 dark:border-orange-900/60 text-[#FA634E] flex items-center justify-center font-black shadow-2xs shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wide">
                  Review & Confirm Dispatch
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[#FA634E] bg-orange-50 dark:bg-orange-950/40 px-2 py-0.5 rounded-md border border-orange-200/60 dark:border-orange-900/40">
                    <CheckCircle2 className="w-3 h-3" />
                    {totalTripsCount} Total Trip{totalTripsCount > 1 ? 's' : ''} Ready
                  </span>
                  <span className="text-[11px] font-bold text-slate-400">
                    • {contractBillingType} Contract
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* VISUAL COMMERCIAL ROUTE BANNER */}
          <div className="p-3.5 rounded-xl bg-slate-900 dark:bg-slate-950 text-white shadow-md relative overflow-hidden space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold tracking-wider uppercase text-slate-400 border-b border-slate-800 pb-1.5">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#FA634E]" /> Commercial Route Lane
              </span>
              <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                {rateCategory}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 pt-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-400/20 shrink-0" />
                <span className="text-sm font-black text-white truncate">
                  {originName}
                </span>
              </div>

              {/* Route Arrow Line */}
              <div className="flex-1 flex items-center justify-center px-2">
                <div className="w-full flex items-center gap-1">
                  <div className="h-0.5 flex-1 bg-gradient-to-r from-emerald-400 to-[#FA634E] opacity-70" />
                  <ArrowRight className="w-4 h-4 text-[#FA634E] shrink-0" />
                </div>
              </div>

              <div className="flex items-center gap-2 min-w-0 justify-end">
                <span className="text-sm font-black text-white truncate">
                  {destName}
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#FA634E] ring-4 ring-[#FA634E]/20 shrink-0" />
              </div>
            </div>

            {/* Intermediate Stops if present */}
            {intermediates.length > 0 && (
              <div className="flex items-center gap-1.5 pt-1 text-[10px] text-slate-400 overflow-x-auto">
                <span className="font-bold text-slate-500">Stops:</span>
                {intermediates.map((stop, idx) => (
                  <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                    {stop}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 2-COLUMN OPERATIONAL METRICS GRID */}
          <div className="grid grid-cols-2 gap-2.5">
            
            {/* CUSTOMER CARD */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-900/40 text-indigo-600 flex items-center justify-center shrink-0">
                <Building2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Customer</span>
                <span className="text-xs font-black text-slate-900 dark:text-white truncate block">
                  {customerName}
                </span>
              </div>
            </div>

            {/* CONTRACT & VEHICLE CLASS CARD */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 border border-purple-200/60 dark:border-purple-900/40 text-purple-600 flex items-center justify-center shrink-0">
                <Tag className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Contract Class</span>
                <span className="text-xs font-black text-slate-900 dark:text-white truncate block">
                  {contractBillingType} • {contractVehicleType}
                </span>
              </div>
            </div>

            {/* OPERATING SCHEDULE CARD */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-900/40 text-blue-600 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Schedule</span>
                <span className="text-xs font-black text-slate-900 dark:text-white truncate block">
                  {selectedMonth || 'Active Month'} ({totalOperatingDays} Days)
                </span>
              </div>
            </div>

            {/* FLEET ASSIGNMENT SUMMARY CARD */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/60 dark:border-emerald-900/40 text-emerald-600 flex items-center justify-center shrink-0">
                <Truck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">Fleet Model</span>
                <span className="text-xs font-black text-slate-900 dark:text-white truncate block">
                  {assignmentType === 'third_party'
                    ? '3PL Logistics Partner'
                    : rosterPairs.length > 1
                    ? `${rosterPairs.length}-Driver Rotation Roster`
                    : 'Dedicated Fleet Pair'}
                </span>
              </div>
            </div>

          </div>

          {/* DETAILED FLEET ROSTER & DRIVER PAIRS */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700 space-y-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Assigned Driver & Vehicle Roster
            </span>

            {assignmentType === 'third_party' ? (
              <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {thirdPartyProviderObj?.name || '3PL Partner'}
                </span>
                <span className="font-mono text-slate-500">
                  {thirdPartyDriverName || 'Driver: TBD'} • {thirdPartyVehiclePlate || 'Plate: TBD'}
                </span>
              </div>
            ) : rosterPairs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {rosterPairs.map((pair, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-xs">
                    <DriverAvatar
                      src={pair.driver?.avatarUrl || pair.driver?.photoUrl}
                      firstName={pair.driver?.name?.split(' ')[0] || 'Driver'}
                      lastName={pair.driver?.name?.split(' ')[1] || ''}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="font-black text-slate-900 dark:text-white truncate block text-[11px]">
                        {pair.driver?.name || 'Assigned Driver'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 block truncate">
                        {pair.vehicle?.plateNumber || pair.vehicle?.plate_number || 'Vehicle Assigned'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 text-xs">
                <DriverAvatar
                  src={masterDriverObj?.avatarUrl || masterDriverObj?.photoUrl}
                  firstName={masterDriverObj?.name?.split(' ')[0] || 'Driver'}
                  lastName={masterDriverObj?.name?.split(' ')[1] || ''}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <span className="font-black text-slate-900 dark:text-white truncate block text-xs">
                    {masterDriverObj?.name || masterDriver || 'Primary Fleet Driver'}
                  </span>
                  <span className="text-[10px] font-mono text-[#FA634E] font-bold block truncate">
                    {masterVehicleObj?.plateNumber || masterVehicleObj?.plate_number || masterVehicle || 'Primary Vehicle Plate'}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* EXECUTIVE FINANCIAL SUMMARY BANNER */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md flex items-center justify-between">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-100 block">
                Total Revenue Billing
              </span>
              <span className="text-xs font-bold text-emerald-50 block">
                {contractBillingType === 'Monthly' ? 'Monthly Contract Total' : `${totalOperatingDays} Days × SAR ${slotBillingTotal.toLocaleString()}/day`}
              </span>
            </div>

            <div className="text-right">
              <span className="text-xs font-extrabold text-emerald-100 mr-1">SAR</span>
              <span className="text-xl font-black font-mono tracking-tight text-white">
                {grandTotalBilling.toLocaleString()}
              </span>
            </div>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 px-4 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Back to Edit
            </Button>
            <Button
              type="button"
              onClick={onConfirm}
              disabled={isPending}
              className="h-9 px-6 rounded-xl bg-[#FA634E] hover:bg-[#d13d0d] text-white font-extrabold text-xs cursor-pointer shadow-md gap-2"
            >
              {isPending ? (
                <>Dispatching Trips...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm & Dispatch Trips
                </>
              )}
            </Button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default TripReviewConfirmModal;
