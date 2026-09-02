import React from 'react';
import { CustomerSelectionHeader } from './CustomerSelectionHeader';
import { RecentRoutesAccelerator } from './RecentRoutesAccelerator';
import { RouteWorkspace } from './RouteWorkspace';
import { ScheduleServicePanel } from './ScheduleServicePanel';
import { CommercialSection } from './CommercialSection';
import { ExecutionAssignmentSection } from './ExecutionAssignmentSection';
import { TripEconomicsSection } from './TripEconomicsSection';
import TransitTimeBadge from '@/components/trips/TransitTimeBadge';
import { ComboboxOption } from '@/components/ui/combobox';

interface TripStep1UnifiedWorkspaceProps {
  contractCustomer: string;
  setContractCustomer: (customerId: string) => void;
  customers: any[];
  customerOptions?: ComboboxOption[];
  contractSlots: any[];
  contractRateCategory: string;
  setContractRateCategory?: (cat: string) => void;
  contractBillingType: string;
  setContractBillingType?: (type: string) => void;
  contractVehicleType: string;
  setContractVehicleType?: (vType: string) => void;
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
  marginMetrics: any;
}

export const TripStep1UnifiedWorkspace: React.FC<TripStep1UnifiedWorkspaceProps> = ({
  contractCustomer,
  setContractCustomer,
  customers,
  customerOptions = [],
  contractSlots,
  contractRateCategory,
  setContractRateCategory,
  contractBillingType,
  setContractBillingType,
  contractVehicleType,
  setContractVehicleType,
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
  isRoundTrip,
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
  marginMetrics,
}) => {
  const primarySlot = contractSlots[0] || {};

  return (
    <div className="space-y-4 animate-fade-in max-w-full text-[#3E3C3D]">
      {/* 60% / 40% 2-COLUMN COMMAND CENTER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* LEFT WORKSPACE (60% / lg:col-span-7): COMMERCIAL QUOTATIONS + CUSTOMER + ROUTE WORKSPACE */}
        <div className="lg:col-span-7 space-y-3.5">
          {/* COMMERCIAL QUOTATIONS BAR (TOP LEFT ~60% WIDTH) */}
          <CommercialSection
            contractSlots={contractSlots}
            contractRateCategory={contractRateCategory}
            contractBillingType={contractBillingType}
            contractVehicleType={contractVehicleType}
            getAvailableRateCardsForLane={getAvailableRateCardsForLane}
            handleOpenCreateQuotation={handleOpenCreateQuotation}
            setIsManualRateOverride={setIsManualRateOverride}
            handleUpdateTripSlot={handleUpdateTripSlot}
            handleSlotLocationChange={handleSlotLocationChange}
            setContractRateCategory={setContractRateCategory}
            setContractVehicleType={setContractVehicleType}
          />

          <CustomerSelectionHeader
            contractCustomer={contractCustomer}
            setContractCustomer={setContractCustomer}
            customers={customers}
            customerOptions={customerOptions}
          />

          <div className="space-y-3">
            {contractSlots.map((slot) => (
              <RouteWorkspace
                key={slot.id}
                slot={slot}
                contractCustomer={contractCustomer}
                isRoundTrip={isRoundTrip}
                canRemoveSlot={contractSlots.length > 1}
                contractRateCategory={contractRateCategory}
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
              />
            ))}
          </div>
        </div>

        {/* RIGHT WORKSPACE (40% / lg:col-span-5): EXECUTION ASSIGNMENT, ROUTE ESTIMATE & ECONOMICS PANEL */}
        <div className="lg:col-span-5">
          <div className="sticky top-4 space-y-3 bg-slate-50/70 dark:bg-slate-900/70 border border-slate-200/90 dark:border-slate-800 p-3.5 rounded-2xl shadow-2xs">
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
            />

            {/* ROUTE EVALUATION & TRANSIT TIME ESTIMATE BADGE (MOVED TO RIGHT COLUMN) */}
            {primarySlot.origin && primarySlot.destination && (
              <TransitTimeBadge
                origin={primarySlot.origin}
                destination={primarySlot.destination}
                returnDestination={primarySlot.returnDestination}
                isRoundTrip={isRoundTrip}
                intermediateLocations={primarySlot.intermediateLocations}
                returnIntermediateLocations={primarySlot.returnIntermediateLocations}
                pickupTime={primarySlot.pickupTime}
                dropoffTime={primarySlot.dropoffTime}
              />
            )}

            <TripEconomicsSection
              contractSlots={contractSlots}
              masterDriver={masterDriver}
              assignmentType={assignmentType}
              thirdPartyCost={thirdPartyCost}
              marginMetrics={marginMetrics}
            />
          </div>
        </div>

      </div>
    </div>
  );
};

export default TripStep1UnifiedWorkspace;
