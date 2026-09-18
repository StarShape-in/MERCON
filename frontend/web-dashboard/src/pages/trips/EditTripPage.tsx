import React, { useState } from 'react';
import { Truck, RotateCcw, Eye, Save, Lock, AlertCircle, ArrowRight, ShieldAlert } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import CreateDriverModal from '@/components/drivers/CreateDriverModal';
import CreateVehicleModal from '@/components/fleet/CreateVehicleModal';
import CreateCustomerModal from '@/components/customers/CreateCustomerModal';
import CreateThirdPartyModal from '@/components/third-party/CreateThirdPartyModal';
import CustomerPreviewModal from '@/components/customers/CustomerPreviewModal';
import VehiclePreviewModal from '@/components/fleet/VehiclePreviewModal';
import DriverPreviewModal from '@/components/drivers/DriverPreviewModal';
import ThirdPartyPreviewModal from '@/components/third-party/ThirdPartyPreviewModal';
import EditCustomerModal from '@/components/customers/EditCustomerModal';
import EditVehicleModal from '@/components/fleet/EditVehicleModal';
import EditDriverModal from '@/components/drivers/EditDriverModal';
import EditThirdPartyModal from '@/components/third-party/EditThirdPartyModal';
import TripStep1UnifiedWorkspace from '@/components/trips/wizard/TripStep1UnifiedWorkspace';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KbdBadge } from '@/components/ui/KbdBadge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useEditTripForm, isRoundTripCategory, normalizeRateCategory } from '@/hooks/useEditTripForm';
import { TripStatus } from '@/services/tripService';

const STAGE_ORDER: TripStatus[] = ['Draft', 'Dispatched', 'AtPickup', 'InTransit', 'Completed', 'Invoiced'];

export default function EditTripPage() {
  const form = useEditTripForm();
  const [pendingStatusChange, setPendingStatusChange] = useState<TripStatus | null>(null);

  if (form.isTripLoading || !form.trip) {
    return (
      <DashboardLayout active="Trips" title="Edit Trip">
        <div className="p-12 flex flex-col items-center justify-center gap-3">
          <div className="h-8 w-8 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-muted-foreground font-medium">Loading trip details...</p>
        </div>
      </DashboardLayout>
    );
  }

  const handleStatusSelect = (newStatus: TripStatus) => {
    const currentIndex = STAGE_ORDER.indexOf(form.status);
    const newIndex = STAGE_ORDER.indexOf(newStatus);

    // If moving backward from Completed or Invoiced, prompt for confirmation
    if (currentIndex >= 4 && newIndex < currentIndex) {
      setPendingStatusChange(newStatus);
    } else {
      form.setStatus(newStatus);
    }
  };

  const confirmStatusRegression = () => {
    if (pendingStatusChange) {
      form.setStatus(pendingStatusChange);
      setPendingStatusChange(null);
    }
  };

  return (
    <DashboardLayout active="Trips" title={`Edit ${form.trip.ref_id || 'Trip'}`} hideBackButton hideHeader fixedViewport>
      <div className="px-2 sm:px-4 pb-2 sm:pb-3 animate-fade-in w-full h-full flex flex-col min-h-0 text-[#3E3C3D]">
        <div className="w-full flex-1 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl flex flex-col min-h-0">
          
          {/* Operational Header Bar */}
          <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 flex items-center justify-between px-4 py-2.5 gap-3 w-full flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge className="bg-[#FA634E] text-white font-black border-none text-xs px-2.5 py-1 flex items-center gap-1.5 shadow-2xs">
                <Truck className="w-3.5 h-3.5" /> Edit Trip
              </Badge>
              <span className="text-xs text-slate-700 dark:text-slate-300 font-mono font-black">
                Ref: {form.trip.ref_id || 'TRIP-LOG'}
              </span>

              {/* Status Stage Stepper Selector */}
              <div className="flex items-center gap-1.5 ml-1 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Stage:</span>
                <Select
                  value={form.status}
                  onValueChange={(val: TripStatus) => handleStatusSelect(val)}
                >
                  <SelectTrigger className="h-7 text-xs font-black w-[140px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
                    <SelectValue placeholder="Select status..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft" className="text-xs font-bold">Scheduled</SelectItem>
                    <SelectItem value="Dispatched" className="text-xs font-bold">Dispatched</SelectItem>
                    <SelectItem value="AtPickup" className="text-xs font-bold">At Pickup</SelectItem>
                    <SelectItem value="InTransit" className="text-xs font-bold">In Transit</SelectItem>
                    <SelectItem value="Completed" className="text-xs font-bold">Completed</SelectItem>
                    <SelectItem value="Invoiced" className="text-xs font-bold">Invoiced</SelectItem>
                    <SelectItem value="Cancelled" className="text-xs font-bold text-rose-600">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Editing Rules Badges */}
              {form.isAssignmentLocked ? (
                <Badge variant="outline" className="text-[10px] text-rose-700 border-rose-300 bg-rose-50 dark:bg-rose-950/40 font-extrabold flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Trip Frozen ({form.status})
                </Badge>
              ) : form.isRouteLocked ? (
                <Badge variant="outline" className="text-[10px] text-amber-800 border-amber-300 bg-amber-50 dark:bg-amber-950/40 font-extrabold flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-600" /> Route Locked ({form.status})
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-slate-500 border-slate-200 font-bold flex items-center gap-1">
                  Customer & Quotation Fixed
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => form.handleReset()}
                className="h-7 text-xs text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 px-2.5 font-bold"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" /> Reset
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.history.back()}
                className="h-7 text-xs font-bold border-slate-200 dark:border-slate-800 px-2.5"
              >
                Cancel <KbdBadge keys="Esc" />
              </Button>
              <Button
                size="sm"
                onClick={() => form.handleSave()}
                disabled={form.isSubmitting}
                className="h-7 text-xs bg-[#FA634E] hover:bg-[#d13d0d] text-white font-black px-3.5 shadow-2xs"
              >
                {form.isSubmitting ? 'Saving...' : 'Save Changes'} <KbdBadge keys="Ctrl+S" />
              </Button>
            </div>
          </div>

          {/* Unified Workspace Form Body */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-4 pt-2 pb-4 min-h-0 custom-scrollbar">
            <TripStep1UnifiedWorkspace
              contractCustomer={form.contractCustomer}
              setContractCustomer={form.setContractCustomer}
              customers={form.customers}
              customerRateCards={form.customerRateCards}
              customerOptions={form.customerOptions}
              contractSlots={form.contractSlots}
              contractRateCategory={form.contractRateCategory}
              setContractRateCategory={form.setContractRateCategory}
              contractBillingType={form.contractBillingType}
              setContractBillingType={form.setContractBillingType}
              contractVehicleType={form.contractVehicleType}
              setContractVehicleType={form.setContractVehicleType}
              selectedMonth={form.selectedMonth}
              setSelectedMonth={form.setSelectedMonth}
              selectedDates={form.selectedDates}
              setSelectedDates={form.setSelectedDates}
              handleAddSlotIntermediate={form.handleAddSlotIntermediate}
              handleRemoveTripSlot={form.handleRemoveTripSlot}
              handleSlotLocationChange={form.handleSlotLocationChange}
              handleUpdateTripSlot={form.handleUpdateTripSlot}
              handleRemoveSlotIntermediate={form.handleRemoveSlotIntermediate}
              handleUpdateSlotIntermediate={form.handleUpdateSlotIntermediate}
              handleAddSlotReturnIntermediate={form.handleAddSlotReturnIntermediate}
              handleRemoveSlotReturnIntermediate={form.handleRemoveSlotReturnIntermediate}
              handleUpdateSlotReturnIntermediate={form.handleUpdateSlotReturnIntermediate}
              recentRoutesList={form.recentRoutesList}
              handleApplyRecentRoute={form.handleApplyRecentRoute}
              isRoundTripCategory={isRoundTripCategory}
              normalizeRateCategory={normalizeRateCategory}
              getAvailableRateCardsForLane={form.getAvailableRateCardsForLane}
              handleOpenCreateQuotation={form.handleOpenCreateQuotation}
              setIsManualRateOverride={form.setIsManualRateOverride}
              assignmentType={form.assignmentType}
              setAssignmentType={form.setAssignmentType}
              masterVehicle={form.masterVehicle}
              masterDriver={form.masterDriver}
              handleVehicleChange={form.handleVehicleChange}
              handleDriverChange={form.handleDriverChange}
              vehicleOptions={form.vehicleOptions}
              driverOptions={form.driverOptions}
              thirdPartyProviderId={form.thirdPartyProviderId}
              setThirdPartyProviderId={form.setThirdPartyProviderId}
              thirdPartyProviders={form.thirdPartyProviders}
              thirdPartyVehiclePlate={form.thirdPartyVehiclePlate}
              setThirdPartyVehiclePlate={form.setThirdPartyVehiclePlate}
              thirdPartyDriverName={form.thirdPartyDriverName}
              setThirdPartyDriverName={form.setThirdPartyDriverName}
              thirdPartyCost={form.thirdPartyCost}
              setThirdPartyCost={form.setThirdPartyCost}
              marginMetrics={form.marginMetrics}
              drivers={form.drivers}
              vehicles={form.vehicles}
              dayAssignments={form.dayAssignments}
              setDayAssignments={form.setDayAssignments}
              isEditMode={true}
              isRouteLocked={form.isRouteLocked}
            />
          </div>

        </div>
      </div>

      {/* Status Regression Warning Modal */}
      {pendingStatusChange && (
        <Dialog open={!!pendingStatusChange} onOpenChange={() => setPendingStatusChange(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-rose-600 font-black text-base">
                <ShieldAlert className="w-5 h-5 shrink-0 text-rose-600" /> Confirm Status Regression
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600 dark:text-slate-300 font-medium pt-1">
                You are moving trip status backward from <strong className="text-slate-900 dark:text-slate-100">{form.status}</strong> to <strong className="text-[#FA634E]">{pendingStatusChange}</strong>.
                This will unlock previously frozen execution or route fields.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button variant="outline" size="sm" onClick={() => setPendingStatusChange(null)} className="text-xs font-bold">
                Cancel
              </Button>
              <Button size="sm" onClick={confirmStatusRegression} className="text-xs bg-rose-600 hover:bg-rose-700 text-white font-bold">
                Revert Status to {pendingStatusChange}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Dialogs */}
      <CreateDriverModal
        isOpen={form.isCreateDriverOpen}
        onClose={() => form.setIsCreateDriverOpen(false)}
        onSuccess={form.handleDriverCreated}
      />
      <CreateVehicleModal
        isOpen={form.isCreateVehicleOpen}
        onClose={() => form.setIsCreateVehicleOpen(false)}
        onSuccess={(v) => {
          form.setMasterVehicle(v.id);
        }}
      />
      <CreateCustomerModal
        isOpen={form.isCreateCustomerOpen}
        onClose={() => form.setIsCreateCustomerOpen(false)}
        onSuccess={(c) => {
          form.setContractCustomer(c.id);
        }}
      />
      <CreateThirdPartyModal
        isOpen={form.isCreateProviderOpen}
        onClose={() => form.setIsCreateProviderOpen(false)}
        onSuccess={(provider) => {
          form.setThirdPartyProviderId(provider.id);
        }}
      />

      <VehiclePreviewModal
        vehicle={form.previewVehicle}
        isOpen={!!form.previewVehicle}
        onClose={() => form.setPreviewVehicle(null)}
        onEdit={(v) => form.setEditVehicle(v)}
      />
      <CustomerPreviewModal
        customer={form.previewCustomer}
        isOpen={!!form.previewCustomer}
        onClose={() => form.setPreviewCustomer(null)}
        onEdit={(c) => form.setEditCustomer(c)}
      />
      <ThirdPartyPreviewModal
        provider={form.previewThirdParty}
        isOpen={!!form.previewThirdParty}
        onClose={() => form.setPreviewThirdParty(null)}
        onEdit={(p) => form.setEditThirdParty(p)}
      />
      <DriverPreviewModal
        driver={form.previewDriver}
        isOpen={!!form.previewDriver}
        onClose={() => form.setPreviewDriver(null)}
        onEdit={(d) => form.setEditDriver(d)}
      />

      {form.editCustomer && (
        <EditCustomerModal
          isOpen={!!form.editCustomer}
          customer={form.editCustomer}
          onClose={() => form.setEditCustomer(null)}
        />
      )}
      {form.editThirdParty && (
        <EditThirdPartyModal
          isOpen={!!form.editThirdParty}
          provider={form.editThirdParty}
          onClose={() => form.setEditThirdParty(null)}
        />
      )}
      {form.editDriver && (
        <EditDriverModal
          isOpen={!!form.editDriver}
          driver={form.editDriver}
          onClose={() => form.setEditDriver(null)}
        />
      )}
      {form.editVehicle && (
        <EditVehicleModal
          isOpen={!!form.editVehicle}
          vehicle={form.editVehicle}
          onClose={() => form.setEditVehicle(null)}
        />
      )}
    </DashboardLayout>
  );
}
