import React from 'react';
import { X, CheckCircle2, Building2, MapPin, Truck, Calendar, ArrowRight, ShieldCheck, Tag, AlertCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KbdBadge } from '@/components/ui/KbdBadge';
import DriverAvatar from '@/components/ui/DriverAvatar';
import { cn } from '@/lib/utils';
import { computeTripFinancials } from '@/utils/financialCalculations';

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
  contractRateCategory?: string;
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

const isUuidString = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

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
  contractRateCategory = '',
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

  // Resolve Customer Name & Object
  const customerObj = customers.find((c) => c.id === contractCustomer || c.name === contractCustomer);
  const customerName = customerObj?.name || contractCustomer || 'Unspecified Customer';

  // Resolve Primary Route Slot
  const primarySlot = contractSlots[0] || {};
  const originName = primarySlot.originName || primarySlot.origin || 'Origin';
  const destName = primarySlot.destinationName || primarySlot.destination || 'Destination';
  const intermediates: string[] = primarySlot.intermediates || [];
  const rateCategory = contractRateCategory || primarySlot.rateCategory || 'Single Trip';

  // Calculate Totals
  const totalOperatingDays = selectedDates.length || 1;
  const totalLanesCount = contractSlots.length || 1;
  const totalTripsCount = totalOperatingDays * totalLanesCount;
  const slotBillingTotal = contractSlots.reduce((sum, s) => sum + (Number(s.billingAmount) || 0), 0);
  const grandTotalBilling = slotBillingTotal * (contractBillingType === 'Monthly' ? 1 : totalOperatingDays);

  // Helper to safely resolve Driver Name & Avatar (NEVER returns a raw UUID)
  const resolveDriverDisplay = (dId: string) => {
    if (!dId || dId === 'unassigned') return { name: 'Assign Later', avatar: null, firstName: 'Assign', lastName: 'Later', phone: '', status: '' };
    const dObj = drivers.find((d) => d.id === dId || d.ref_id === dId || d.uuid === dId);
    if (dObj) {
      const fullName = `${dObj.first_name || ''} ${dObj.last_name || ''}`.trim() || dObj.name;
      if (fullName && !isUuidString(fullName)) {
        return {
          name: fullName,
          avatar: dObj.avatar_url || dObj.photo_url || dObj.avatarUrl || null,
          firstName: dObj.first_name || fullName.split(' ')[0],
          lastName: dObj.last_name || fullName.split(' ')[1] || '',
          phone: dObj.phone_primary || dObj.phone || '',
          status: dObj.status || 'Available',
        };
      }
    }
    if (!isUuidString(dId)) {
      return { name: dId, avatar: null, firstName: dId.split(' ')[0], lastName: dId.split(' ')[1] || '', phone: '', status: '' };
    }
    return { name: 'Assign Later', avatar: null, firstName: 'Assign', lastName: 'Later', phone: '', status: '' };
  };

  // Helper to safely resolve Vehicle Plate (NEVER returns a raw UUID)
  const resolveVehicleDisplay = (vId: string) => {
    if (!vId || vId === 'unassigned') return 'Vehicle: Assign Later';
    const vObj = vehicles.find((v) => v.id === vId || v.plate_number === vId || v.plateNumber === vId);
    if (vObj) {
      const plate = vObj.plate_number || vObj.plateNumber;
      if (plate && !isUuidString(plate)) return plate;
    }
    if (!isUuidString(vId)) return vId;
    return 'Vehicle: Assign Later';
  };

  // Resolve Primary Fleet Assignment
  const primaryDriverInfo = resolveDriverDisplay(masterDriver);
  const primaryVehiclePlate = resolveVehicleDisplay(masterVehicle);
  const thirdPartyProviderObj = thirdPartyProviders.find((p) => p.id === thirdPartyProviderId);

  // Resolve Roster / Rotation Pairs & Operating Days per Driver
  const rosterMap = new Map<string, { driverId: string; vehicleId: string; daysCount: number }>();
  Object.values(dayAssignments).forEach((a: any) => {
    if (a?.driverId || a?.vehicleId) {
      const key = `${a.driverId || ''}_${a.vehicleId || ''}`;
      const existing = rosterMap.get(key);
      if (existing) {
        existing.daysCount += 1;
      } else {
        rosterMap.set(key, { driverId: a.driverId, vehicleId: a.vehicleId, daysCount: 1 });
      }
    }
  });

  const rosterPairs = Array.from(rosterMap.values());

  // Validate that all slots satisfy planned_start < planned_end
  const scheduleErrors = React.useMemo(() => {
    const errors: string[] = [];
    contractSlots.forEach((slot, idx) => {
      const pDate = slot.date;
      const dDate = slot.dropoffDate || slot.date;
      if (!pDate || !dDate) {
        errors.push(`Slot #${idx + 1}: Missing start or drop-off date.`);
        return;
      }
      if (dDate < pDate) {
        errors.push(`Slot #${idx + 1}: Drop-off date (${dDate}) cannot be before start date (${pDate}).`);
        return;
      }
      const pTime = (slot.pickupTime || '08:00').split(' ')[0];
      const dTime = (slot.dropoffTime || '14:00').split(' ')[0];
      if (dDate === pDate && dTime <= pTime) {
        errors.push(`Slot #${idx + 1}: Drop-off time (${dTime}) must be after start time (${pTime}).`);
        return;
      }
      const pClean = pTime.length === 4 ? '0' + pTime : pTime;
      const dClean = dTime.length === 4 ? '0' + dTime : dTime;
      const pTs = new Date(`${pDate}T${pClean}`).getTime();
      const dTs = new Date(`${dDate}T${dClean}`).getTime();
      if (isNaN(pTs) || isNaN(dTs) || dTs <= pTs) {
        errors.push(`Slot #${idx + 1}: Drop-off date and time must be strictly later than start date and time.`);
      }
    });
    return errors;
  }, [contractSlots]);

  return (
    <div className="fixed inset-0 z-[999] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden text-[#3E3C3D] dark:text-slate-200 animate-scale-in">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-[#FA634E] flex items-center justify-center font-bold shrink-0 border border-orange-100 dark:border-orange-900/60">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                Confirm Trip Dispatch
              </h3>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                {totalTripsCount} Trip{totalTripsCount > 1 ? 's' : ''} Ready • <span className="text-[#FA634E] font-bold">{contractBillingType} Contract</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 space-y-4">

          {/* SCHEDULE ERROR BANNER */}
          {scheduleErrors.length > 0 && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Invalid Trip Schedule</span>
              </div>
              <ul className="list-disc list-inside text-[11px] text-rose-600 dark:text-rose-300">
                {scheduleErrors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* MINIMAL ROUTE PATH BANNER */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
            <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#FA634E]" /> Commercial Lane
              </span>
              <span className="px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-mono">
                {rateCategory}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 pt-0.5">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                  {originName}
                </span>
              </div>

              {/* Arrow Indicator */}
              <div className="flex-1 flex items-center justify-center px-2">
                <div className="w-full flex items-center gap-1.5">
                  <div className="h-px flex-1 bg-slate-300 dark:bg-slate-700" />
                  <ArrowRight className="w-3.5 h-3.5 text-[#FA634E] shrink-0" />
                  <div className="h-px flex-1 bg-slate-300 dark:bg-slate-700" />
                </div>
              </div>

              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                  {destName}
                </span>
                <span className="w-2.5 h-2.5 rounded-full bg-[#FA634E] shrink-0" />
              </div>
            </div>

            {/* Intermediate Stops list if present */}
            {intermediates.length > 0 && (
              <div className="flex items-center gap-1.5 pt-1 text-[10px] text-slate-500 overflow-x-auto">
                <span className="font-bold text-slate-400">Via:</span>
                {intermediates.map((stop, idx) => (
                  <span key={idx} className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-700 dark:text-slate-300">
                    {stop}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 2-COLUMN OPERATIONAL DETAILS LEDGER */}
          <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 py-1 text-xs">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <Building2 className="w-3 h-3 text-slate-400" /> Customer
              </span>
              <span className="font-bold text-slate-900 dark:text-white truncate block mt-0.5">
                {customerName}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <Tag className="w-3 h-3 text-slate-400" /> Contract Class
              </span>
              <span className="font-bold text-slate-900 dark:text-white truncate block mt-0.5">
                {contractBillingType} • {contractVehicleType}
              </span>
            </div>

            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" /> Schedule
              </span>
              <span className="font-bold text-slate-900 dark:text-white truncate block mt-0.5">
                {selectedMonth || 'Active Month'} ({totalOperatingDays} Day{totalOperatingDays > 1 ? 's' : ''})
              </span>
            </div>

            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                <Truck className="w-3 h-3 text-slate-400" /> Fleet Model
              </span>
              <span className="font-bold text-slate-900 dark:text-white truncate block mt-0.5">
                {assignmentType === 'third_party'
                  ? '3PL Logistics Partner'
                  : rosterPairs.length > 1
                  ? `${rosterPairs.length}-Driver Rotation`
                  : 'Dedicated Fleet Pair'}
              </span>
            </div>
          </div>

          {/* ASSIGNED FLEET ROSTER */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Assigned Fleet & Driver
            </span>

            {assignmentType === 'third_party' ? (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs">
                <span className="font-bold text-slate-900 dark:text-white">
                  {thirdPartyProviderObj?.name || '3PL Partner'}
                </span>
                <span className="font-mono text-slate-500">
                  {thirdPartyDriverName || 'Driver: TBD'} • {thirdPartyVehiclePlate || 'Plate: TBD'}
                </span>
              </div>
            ) : rosterPairs.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {rosterPairs.map((pair, idx) => {
                  const dInfo = resolveDriverDisplay(pair.driverId);
                  const vPlate = resolveVehicleDisplay(pair.vehicleId);
                  const singleDriverRate = parseFloat(String(primarySlot.driverPayout || primarySlot.driverTripCharge || primarySlot.tripCharges || 0)) || 0;
                  const driverPayoutTotal = singleDriverRate * pair.daysCount;

                  return (
                    <div key={idx} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs">
                      <DriverAvatar
                        src={dInfo.avatar}
                        firstName={dInfo.firstName}
                        lastName={dInfo.lastName}
                        size="sm"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="font-black text-slate-900 dark:text-white truncate block text-[11px]">
                          {dInfo.name}
                        </span>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-bold mt-0.5">
                          <span className="font-mono text-slate-600 dark:text-slate-300">{vPlate}</span>
                          <span className="text-[#FA634E] font-mono font-black">
                            {pair.daysCount} Day{pair.daysCount > 1 ? 's' : ''} {singleDriverRate > 0 ? `(SAR ${driverPayoutTotal.toLocaleString()})` : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (!masterDriver || masterDriver === 'unassigned') && (!masterVehicle || masterVehicle === 'unassigned') ? (
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900 text-xs">
                <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold shrink-0 border border-amber-200 dark:border-amber-800">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-extrabold text-amber-900 dark:text-amber-200 text-xs block">
                    Assign Later (Pending Fleet Assignment)
                  </span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 block">
                    Driver and vehicle will be assigned prior to trip pickup dispatch.
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 text-xs">
                <DriverAvatar
                  src={primaryDriverInfo.avatar}
                  firstName={primaryDriverInfo.firstName}
                  lastName={primaryDriverInfo.lastName}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="font-black text-slate-900 dark:text-white truncate block text-xs">
                      {primaryDriverInfo.name}
                    </span>
                    {primaryDriverInfo.phone && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({primaryDriverInfo.phone})
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-[#FA634E] font-bold block truncate">
                    {primaryVehiclePlate}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* FINANCIAL SUMMARY */}
          {/* FINANCIAL SUMMARY */}
          {(() => {
            const fin = computeTripFinancials({
              customerBilling: grandTotalBilling,
              driverPayout: assignmentType === 'third_party' ? thirdPartyCost : primarySlot.driverPayout,
              is3PL: assignmentType === 'third_party',
              subcontractCost: thirdPartyCost,
              pricingBasis: contractBillingType === 'Monthly' ? 'Per Month' : 'Per Trip',
              selectedOperatingDays: totalOperatingDays,
            });

            const costValue = fin.perDriverPayout;
            const totalCost = fin.resolvedDriverPayout;
            const netMargin = fin.balanceMargin;
            const marginPct = fin.marginPercent;

            return (
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                    Financial Summary
                  </span>
                  {costValue > 0 && (
                    <span className={cn(
                      "text-[10px] font-extrabold px-2 py-0.5 rounded-full border",
                      netMargin >= 0
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                        : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800"
                    )}>
                      {netMargin >= 0 ? `+${marginPct.toFixed(1)}% Net Margin` : `${marginPct.toFixed(1)}% Loss`}
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700 space-y-2">
                  {fin.isMonthly && grandTotalBilling > 0 && (
                    <div className="text-[10px] font-extrabold text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 px-2.5 py-1 rounded-lg border border-purple-200 dark:border-purple-900 flex items-center justify-between">
                      <span>Rate Basis: <strong>Monthly Contract</strong></span>
                      <span>Daily Breakdown: <strong className="font-mono">{fin.formattedLabels.dailyLabel}</strong></span>
                    </div>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                    {/* 1. REVENUE BILLING */}
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/70 dark:border-slate-700">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Customer Billing</span>
                      <span className="text-xs font-mono font-black text-slate-900 dark:text-white block">
                        SAR {fin.resolvedBilling.toLocaleString()}
                      </span>
                      {fin.isMonthly && (
                        <span className="text-[9px] text-slate-400 block truncate font-sans font-semibold">
                          {totalOperatingDays} day{totalOperatingDays > 1 ? 's' : ''} @ SAR {fin.dailyRate}/day
                        </span>
                      )}
                    </div>

                    {/* 2. DRIVER PAYOUT / 3PL COST */}
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200/70 dark:border-slate-700">
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase block">
                        {assignmentType === 'third_party' ? '3PL Cost' : 'Driver Charge'}
                      </span>
                      <span className="text-xs font-mono font-black text-slate-900 dark:text-white">
                        {costValue > 0 ? `SAR ${totalCost.toLocaleString()}` : '—'}
                      </span>
                    </div>

                    {/* 3. NET MARGIN */}
                    <div className={cn(
                      "p-2 rounded-lg border col-span-2 sm:col-span-1",
                      netMargin >= 0
                        ? "bg-emerald-50/60 border-emerald-200/80 dark:bg-emerald-950/30 dark:border-emerald-800"
                        : "bg-rose-50/60 border-rose-200/80 dark:bg-rose-950/30 dark:border-rose-800"
                    )}>
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase block">Net Margin</span>
                      <span className={cn(
                        "text-xs font-mono font-black",
                        netMargin >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
                      )}>
                        {netMargin >= 0 ? '+' : ''}SAR {netMargin.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 bg-slate-50/80 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-9 px-4 rounded-xl border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 cursor-pointer gap-1.5"
          >
            <span>Back to Edit</span>
            <KbdBadge keys="Esc" />
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isPending || scheduleErrors.length > 0}
            className="h-9 px-5 rounded-xl bg-[#FA634E] hover:bg-[#d13d0d] text-white font-extrabold text-xs cursor-pointer shadow-2xs gap-1.5"
          >
            {isPending ? (
              <>Dispatching...</>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Dispatch</span>
                <KbdBadge keys="Ctrl+Enter" />
              </>
            )}
          </Button>
        </div>

      </div>
    </div>
  );
};

export default TripReviewConfirmModal;
