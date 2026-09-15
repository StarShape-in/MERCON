import React from 'react';
import { Truck, Calendar, Zap, Layers, Tag, Lock } from 'lucide-react';
import { CustomerSelectionHeader } from './CustomerSelectionHeader';
import { RecentRoutesAccelerator } from './RecentRoutesAccelerator';
import { RouteWorkspace } from './RouteWorkspace';
import { ScheduleServicePanel } from './ScheduleServicePanel';
import { CommercialSection } from './CommercialSection';
import { ExecutionAssignmentSection } from './ExecutionAssignmentSection';
import { TripEconomicsSection } from './TripEconomicsSection';
import { MonthlyDaysSelector } from './MonthlyDaysSelector';
import TransitTimeBadge from '@/components/trips/TransitTimeBadge';
import { ComboboxOption } from '@/components/ui/combobox';
import { cn } from '@/lib/utils';

interface TripStep1UnifiedWorkspaceProps {
  contractCustomer: string;
  setContractCustomer: (customerId: string) => void;
  customers: any[];
  customerRateCards?: any[];
  customerOptions?: ComboboxOption[];
  contractSlots: any[];
  contractRateCategory: string;
  setContractRateCategory?: (cat: string) => void;
  contractBillingType: string;
  setContractBillingType?: (type: string) => void;
  contractVehicleType: string;
  setContractVehicleType?: (vType: string) => void;
  selectedMonth?: string;
  setSelectedMonth?: (m: string) => void;
  selectedDates?: string[];
  setSelectedDates?: React.Dispatch<React.SetStateAction<string[]>>;
  triggerRateLookupForSlots?: (vType?: string, rCat?: string, custId?: string, bType?: string) => void;
  handleAddSlotIntermediate: (slotId: string) => void;
  handleRemoveTripSlot: (slotId: string) => void;
  handleSlotLocationChange: (slotId: string, field: 'origin' | 'destination', locName: string, locObj: any) => void;
  handleUpdateTripSlot: (slotId: string, patch: any) => void;
  handleRemoveSlotIntermediate: (slotId: string, index: number) => void;
  handleUpdateSlotIntermediate: (slotId: string, index: number, locName: string) => void;
  handleAddSlotReturnIntermediate?: (slotId: string) => void;
  handleRemoveSlotReturnIntermediate?: (slotId: string, index: number) => void;
  handleUpdateSlotReturnIntermediate?: (slotId: string, index: number, locName: string) => void;
  recentRoutesList: any[];
  handleApplyRecentRoute: (route: any) => void;
  isRoundTripCategory: (cat: string) => boolean;
  normalizeRateCategory?: (cat?: string | null) => string;
  getAvailableRateCardsForLane: (slot: any) => any[];
  handleOpenCreateQuotation?: () => void;
  setIsManualRateOverride?: (override: boolean) => void;
  isRoundTrip?: boolean;
  assignmentType: 'own' | 'third_party' | '3pl' | 'fleet' | any;
  setAssignmentType: (type: any) => void;
  masterVehicle: string;
  masterDriver: string;
  handleVehicleChange: (val: string) => void;
  handleDriverChange: (val: string) => void;
  vehicleOptions: any[];
  driverOptions: any[];
  thirdPartyProviderId: string;
  setThirdPartyProviderId: (id: string) => void;
  thirdPartyProviders: any[];
  thirdPartyVehiclePlate: string;
  setThirdPartyVehiclePlate: (val: string) => void;
  thirdPartyDriverName: string;
  setThirdPartyDriverName: (val: string) => void;
  thirdPartyCost: string;
  setThirdPartyCost?: (val: string) => void;
  marginMetrics: any;
  drivers?: any[];
  vehicles?: any[];
  dayAssignments?: Record<string, { driverId: string; vehicleId: string }>;
  setDayAssignments?: React.Dispatch<React.SetStateAction<Record<string, { driverId: string; vehicleId: string }>>>;
  fieldErrors?: Record<string, boolean>;
}

export const TripStep1UnifiedWorkspace: React.FC<TripStep1UnifiedWorkspaceProps> = ({
  contractCustomer,
  setContractCustomer,
  customers,
  customerRateCards = [],
  customerOptions = [],
  contractSlots,
  contractRateCategory,
  setContractRateCategory,
  contractBillingType,
  setContractBillingType,
  contractVehicleType,
  setContractVehicleType,
  selectedMonth = '',
  setSelectedMonth,
  selectedDates = [],
  setSelectedDates,
  triggerRateLookupForSlots,
  handleAddSlotIntermediate,
  handleRemoveTripSlot,
  handleSlotLocationChange,
  handleUpdateTripSlot,
  handleRemoveSlotIntermediate,
  handleUpdateSlotIntermediate,
  handleAddSlotReturnIntermediate,
  handleRemoveSlotReturnIntermediate,
  handleUpdateSlotReturnIntermediate,
  recentRoutesList,
  handleApplyRecentRoute,
  isRoundTripCategory,
  normalizeRateCategory,
  getAvailableRateCardsForLane,
  handleOpenCreateQuotation,
  setIsManualRateOverride,
  isRoundTrip: isRoundTripProp,
  assignmentType,
  setAssignmentType,
  masterVehicle,
  masterDriver,
  handleVehicleChange,
  handleDriverChange,
  vehicleOptions,
  driverOptions,
  thirdPartyProviderId,
  setThirdPartyProviderId,
  thirdPartyProviders,
  thirdPartyVehiclePlate,
  setThirdPartyVehiclePlate,
  thirdPartyDriverName,
  setThirdPartyDriverName,
  thirdPartyCost,
  setThirdPartyCost,
  marginMetrics,
  drivers = [],
  vehicles = [],
  dayAssignments = {},
  setDayAssignments,
  fieldErrors = {},
}) => {
  const primarySlot = contractSlots[0] || {};
  const isRoundTrip = isRoundTripProp ?? (isRoundTripCategory ? isRoundTripCategory(contractRateCategory) : contractRateCategory === 'Round Trip');

  const isQuotationDefinedOrSelected = Boolean(
    primarySlot.matchedRateCard ||
    primarySlot.rateMatched ||
    (primarySlot.billingAmount && Number(primarySlot.billingAmount) > 0)
  );

  return (
    <div className="space-y-4 animate-fade-in max-w-full text-[#3E3C3D]">
      {/* MODE-SPECIFIC WORKSPACE HEADER BANNER */}
      {contractBillingType?.toLowerCase() === 'monthly' ? (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-purple-50/90 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900/80 shadow-2xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-purple-600 text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs">
              <Calendar className="w-3 h-3" /> Monthly Contract Duty Mode
            </span>
            <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
              Recurring monthly billing contract • Billed per monthly agreement rate
            </span>
          </div>
          <span className="text-[10px] font-extrabold text-purple-700 dark:text-purple-300 bg-white dark:bg-purple-900/60 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
            Monthly Contract
          </span>
        </div>
      ) : contractBillingType?.toLowerCase() === 'extra' ? (
        <div className="flex items-center justify-between p-2 rounded-xl bg-orange-50/90 dark:bg-orange-950/30 border border-orange-200/90 dark:border-orange-900/80 shadow-2xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-full bg-[#FA634E] text-white text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-2xs">
              <Zap className="w-3 h-3" /> Extra / Spot Trip Mode
            </span>
          </div>
          <span className="text-[10px] font-extrabold text-[#FA634E] bg-white dark:bg-slate-900 px-2 py-0.5 rounded border border-orange-200 dark:border-orange-900">
            Extra (Spot Rate)
          </span>
        </div>
      ) : null}

      {/* 58% / 42% 2-COLUMN COMMAND CENTER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* LEFT WORKSPACE (lg:col-span-7): COMMERCIAL QUOTATIONS + CUSTOMER + ROUTE WORKSPACE */}
        <div className="lg:col-span-7 space-y-3.5">
          {/* COMMERCIAL QUOTATIONS BAR WITH INTEGRATED CUSTOMER SELECTION (TOP LEFT ~60% WIDTH) */}
          <CommercialSection
            contractSlots={contractSlots}
            contractRateCategory={contractRateCategory}
            contractBillingType={contractBillingType}
            contractVehicleType={contractVehicleType}
            getAvailableRateCardsForLane={getAvailableRateCardsForLane}
            customerRateCards={customerRateCards}
            handleOpenCreateQuotation={handleOpenCreateQuotation}
            setIsManualRateOverride={setIsManualRateOverride}
            handleUpdateTripSlot={handleUpdateTripSlot}
            handleSlotLocationChange={handleSlotLocationChange}
            setContractRateCategory={setContractRateCategory}
            setContractBillingType={setContractBillingType}
            setContractVehicleType={setContractVehicleType}
            contractCustomer={contractCustomer}
            setContractCustomer={setContractCustomer}
            customers={customers}
            customerOptions={customerOptions}
            fieldErrors={fieldErrors}
          />

          {/* PROGRESSIVE LOCK CONTAINER FOR ROUTE WORKSPACE */}
          <div className="relative">
            {!isQuotationDefinedOrSelected && (
              <div className="p-4 mb-3 rounded-2xl bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/80 shadow-2xs text-center space-y-1.5 animate-fade-in">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center justify-center font-bold mx-auto border border-amber-200 dark:border-amber-800">
                  <Lock className="w-4 h-4 text-amber-600" />
                </div>
                <h4 className="text-xs font-extrabold text-amber-950 dark:text-amber-100">
                  Select a Quotation Card Above or Click "+ Define Quotation"
                </h4>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 max-w-md mx-auto font-medium leading-relaxed">
                  Selecting a commercial quotation locks in rate terms (Billing Rate, Driver Payout, Vehicle Class, Line Type) to configure route & fleet assignment.
                </p>
              </div>
            )}

            <div className={cn("space-y-3 transition-all duration-200", !isQuotationDefinedOrSelected && "opacity-55 pointer-events-none select-none filter blur-[0.3px]")}>
              {contractSlots.map((slot) => (
                <RouteWorkspace
                  key={slot.id}
                  slot={slot}
                  contractCustomer={contractCustomer}
                  isRoundTrip={isRoundTrip}
                  canRemoveSlot={contractSlots.length > 1}
                  contractRateCategory={contractRateCategory}
                  contractBillingType={contractBillingType}
                  setContractRateCategory={setContractRateCategory}
                  triggerRateLookupForSlots={triggerRateLookupForSlots}
                  handleAddSlotIntermediate={handleAddSlotIntermediate}
                  handleRemoveTripSlot={handleRemoveTripSlot}
                  handleSlotLocationChange={handleSlotLocationChange}
                  handleUpdateTripSlot={handleUpdateTripSlot}
                  handleRemoveSlotIntermediate={handleRemoveSlotIntermediate}
                  handleUpdateSlotIntermediate={handleUpdateSlotIntermediate}
                  handleAddSlotReturnIntermediate={handleAddSlotReturnIntermediate}
                  handleRemoveSlotReturnIntermediate={handleRemoveSlotReturnIntermediate}
                  handleUpdateSlotReturnIntermediate={handleUpdateSlotReturnIntermediate}
                  fieldErrors={fieldErrors}
                />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT WORKSPACE (lg:col-span-5): EXECUTION ASSIGNMENT (TOP) & FINANCIAL SUMMARY (BELOW) */}
        <div className="lg:col-span-5">
          <div className="sticky top-4 space-y-3">
            <div className={cn("transition-all duration-200 space-y-3", !isQuotationDefinedOrSelected && "opacity-55 pointer-events-none select-none filter blur-[0.3px]")}>
              <ExecutionAssignmentSection
                assignmentType={assignmentType}
                setAssignmentType={setAssignmentType}
                masterVehicle={masterVehicle}
                masterDriver={masterDriver}
                handleVehicleChange={handleVehicleChange}
                handleDriverChange={handleDriverChange}
                vehicleOptions={vehicleOptions}
                driverOptions={driverOptions}
                thirdPartyProviderId={thirdPartyProviderId}
                setThirdPartyProviderId={setThirdPartyProviderId}
                thirdPartyProviders={thirdPartyProviders}
                thirdPartyVehiclePlate={thirdPartyVehiclePlate}
                setThirdPartyVehiclePlate={setThirdPartyVehiclePlate}
                thirdPartyDriverName={thirdPartyDriverName}
                setThirdPartyDriverName={setThirdPartyDriverName}
                thirdPartyCost={thirdPartyCost}
                setThirdPartyCost={setThirdPartyCost}
                contractSlots={contractSlots}
                contractVehicleType={contractVehicleType}
                setContractVehicleType={setContractVehicleType}
              />

              <TripEconomicsSection
                contractSlots={contractSlots}
                masterDriver={masterDriver}
                assignmentType={assignmentType}
                thirdPartyCost={thirdPartyCost}
                marginMetrics={marginMetrics}
                contractCustomer={contractCustomer}
                customers={customers}
                handleUpdateTripSlot={handleUpdateTripSlot}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TripStep1UnifiedWorkspace;
