import React from 'react';
import { CustomerSelectionHeader } from './CustomerSelectionHeader';
import { RecentRoutesAccelerator } from './RecentRoutesAccelerator';
import { RouteWorkspace } from './RouteWorkspace';
import { ScheduleServicePanel } from './ScheduleServicePanel';
import { CommercialSection } from './CommercialSection';
import { ExecutionAssignmentSection } from './ExecutionAssignmentSection';
import { TripEconomicsSection } from './TripEconomicsSection';
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
  handleRemoveSlotIntermediate: (slotId: string, idx: number) => void;
  handleUpdateSlotIntermediate: (slotId: string, idx: number, val: string) => void;
  handleAddSlotReturnIntermediate: (slotId: string) => void;
  handleRemoveSlotReturnIntermediate: (slotId: string, idx: number) => void;
  handleUpdateSlotReturnIntermediate: (slotId: string, idx: number, val: string) => void;
  recentRoutesList: any[];
  handleApplyRecentRoute: (route: any) => void;
  isRoundTripCategory: (cat: string) => boolean;
  normalizeRateCategory?: (cat?: string | null) => string;

  // Commercial & Execution Props
  getAvailableRateCardsForLane: (slot: any) => any[];
  handleOpenCreateQuotation?: () => void;
  setIsManualRateOverride?: (override: boolean) => void;
  assignmentType: 'own' | '3pl';
  setAssignmentType: (type: 'own' | '3pl') => void;
  masterVehicle: string;
  masterDriver: string;
  handleVehicleChange: (vId: string) => void;
  handleDriverChange: (dId: string) => void;
  vehicleOptions: ComboboxOption[];
  driverOptions: ComboboxOption[];
  thirdPartyProviderId: string;
  setThirdPartyProviderId: (id: string) => void;
  thirdPartyProviders: any[];
  thirdPartyVehiclePlate: string;
  setThirdPartyVehiclePlate: (plate: string) => void;
  thirdPartyDriverName: string;
  setThirdPartyDriverName: (name: string) => void;
  thirdPartyCost?: string;
  marginMetrics?: any;
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
  const currentCategory = (normalizeRateCategory ? normalizeRateCategory(contractRateCategory) : contractRateCategory) || 'Single Trip';
  const isRoundTrip = isRoundTripCategory(contractRateCategory) || currentCategory === 'Round Trip';

  return (
    <div className="space-y-4 animate-fade-in max-w-full text-[#3E3C3D]">
      {/* 45 / 25 / 30 3-COLUMN DESKTOP GRID LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        
        {/* COLUMN 1 (~45% / lg:col-span-5): CUSTOMER + ACCELERATORS + ROUTE WORKSPACE */}
        <div className="lg:col-span-5 space-y-3">
          <CustomerSelectionHeader
            contractCustomer={contractCustomer}
            setContractCustomer={setContractCustomer}
            customers={customers}
            customerOptions={customerOptions}
          />

          <RecentRoutesAccelerator
            recentRoutesList={recentRoutesList}
            handleApplyRecentRoute={handleApplyRecentRoute}
          />

          <div className="space-y-3">
            {contractSlots.map((slot) => (
              <RouteWorkspace
                key={slot.id}
                slot={slot}
                contractCustomer={contractCustomer}
                isRoundTrip={isRoundTrip}
                canRemoveSlot={contractSlots.length > 1}
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

        {/* COLUMN 2 (~25% / lg:col-span-3): SCHEDULE & SERVICE */}
        <div className="lg:col-span-3">
          <div className="sticky top-4 space-y-3">
            {contractSlots.map((slot) => (
              <ScheduleServicePanel
                key={slot.id}
                slot={slot}
                currentCategory={currentCategory}
                isRoundTrip={isRoundTrip}
                setContractRateCategory={setContractRateCategory}
                triggerRateLookupForSlots={triggerRateLookupForSlots}
                handleUpdateTripSlot={handleUpdateTripSlot}
              />
            ))}
          </div>
        </div>

        {/* COLUMN 3 (~30% / lg:col-span-4): COMMERCIAL + EXECUTION ASSIGNMENT + TRIP ECONOMICS */}
        <div className="lg:col-span-4">
          <div className="sticky top-4 space-y-3">
            <CommercialSection
              contractSlots={contractSlots}
              contractRateCategory={contractRateCategory}
              contractBillingType={contractBillingType}
              contractVehicleType={contractVehicleType}
              getAvailableRateCardsForLane={getAvailableRateCardsForLane}
              handleOpenCreateQuotation={handleOpenCreateQuotation}
              setIsManualRateOverride={setIsManualRateOverride}
              handleUpdateTripSlot={handleUpdateTripSlot}
            />

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
