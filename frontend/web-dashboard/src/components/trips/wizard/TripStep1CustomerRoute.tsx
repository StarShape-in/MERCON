import React from 'react';
import { CustomerSelectionHeader } from './CustomerSelectionHeader';
import { RecentRoutesAccelerator } from './RecentRoutesAccelerator';
import { RouteWorkspace } from './RouteWorkspace';
import { ScheduleServicePanel } from './ScheduleServicePanel';
import { ComboboxOption } from '@/components/ui/combobox';

interface TripStep1CustomerRouteProps {
  contractCustomer: string;
  setContractCustomer: (customerId: string) => void;
  customers: any[];
  customerOptions?: ComboboxOption[];
  contractSlots: any[];
  contractRateCategory: string;
  setContractRateCategory?: (cat: string) => void;
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
}

export const TripStep1CustomerRoute: React.FC<TripStep1CustomerRouteProps> = ({
  contractCustomer,
  setContractCustomer,
  customers,
  customerOptions = [],
  contractSlots,
  contractRateCategory,
  setContractRateCategory,
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
}) => {
  const currentCategory = (normalizeRateCategory ? normalizeRateCategory(contractRateCategory) : contractRateCategory) || 'Single Trip';
  const isRoundTrip = isRoundTripCategory(contractRateCategory) || currentCategory === 'Round Trip';

  return (
    <div className="space-y-4 animate-fade-in max-w-full text-[#3E3C3D]">
      {/* 65/35 WORKSPACE LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* LEFT COLUMN: CUSTOMER + ACCELERATORS + ROUTE WORKSPACE (~65% / col-span-8) */}
        <div className="lg:col-span-8 space-y-3.5">
          {/* 1. CUSTOMER SELECTION HEADER */}
          <CustomerSelectionHeader
            contractCustomer={contractCustomer}
            setContractCustomer={setContractCustomer}
            customers={customers}
            customerOptions={customerOptions}
          />

          {/* 2. RECENTLY USED ROUTES ACCELERATOR */}
          <RecentRoutesAccelerator
            recentRoutesList={recentRoutesList}
            handleApplyRecentRoute={handleApplyRecentRoute}
          />

          {/* 3. ROUTE SLOTS WORKSPACE */}
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

        {/* RIGHT COLUMN: SCHEDULE & SERVICE PANEL (~35% / col-span-4) */}
        <div className="lg:col-span-4">
          <div className="sticky top-4">
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

      </div>
    </div>
  );
};

export default TripStep1CustomerRoute;
