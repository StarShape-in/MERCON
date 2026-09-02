import React from 'react';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';
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
import DriverAvatar from '@/components/ui/DriverAvatar';
import PastDateTripConfirmModal from '@/components/trips/PastDateTripConfirmModal';
import TripWizardHeader from '@/components/trips/wizard/TripWizardHeader';
import TripStep1CustomerRoute from '@/components/trips/wizard/TripStep1CustomerRoute';
import TripStep3Assignment from '@/components/trips/wizard/TripStep3Assignment';
import TripStep4Summary from '@/components/trips/wizard/TripStep4Summary';
import TripBatchGeneratorTab from '@/components/trips/wizard/TripBatchGeneratorTab';
import TripBulkImportTab from '@/components/trips/wizard/TripBulkImportTab';
import { Button } from '@/components/ui/button';
import { KbdBadge } from '@/components/ui/KbdBadge';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  useCreateTripForm,
  normalizeBillingType,
  normalizeRateCategory,
  normalizeVehicleClass,
  getVehicleTypeFromCapacity,
  isRoundTripCategory,
  getActualCapacityLabel,
} from '@/hooks/useCreateTripForm';

export { getActualCapacityLabel };

function MapBoundsAdjuster({ points }: { points: [number, number][] }) {
  const map = useMap();
  React.useEffect(() => {
    if (points && points.length > 0) {
      map.fitBounds(points, { padding: [15, 15], maxZoom: 12 });
    }
  }, [points, map]);
  return null;
}

const pickupMarkerIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: rgba(16, 185, 129, 0.2);" class="animate-ping"></div>
      <div style="width: 12px; height: 12px; border-radius: 50%; background: #10B981; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
    </div>
  `,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const dropoffMarkerIcon = L.divIcon({
  html: `
    <div style="position: relative; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;">
      <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: rgba(249, 115, 22, 0.2);" class="animate-ping"></div>
      <div style="width: 12px; height: 12px; border-radius: 50%; background: #F97316; border: 2px solid white; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"></div>
    </div>
  `,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

export default function CreateTripPage() {
  const form = useCreateTripForm();

  // Step Transition Focus Management
  React.useEffect(() => {
    if (form.submissionResult) return;
    const timer = setTimeout(() => {
      let target: HTMLElement | null = null;
      if (form.contractStep === 1) {
        target = document.getElementById('step1-customer-combobox');
      } else if (form.contractStep === 2) {
        target = document.getElementById('step2-first-field') || document.getElementById('step2-first-field-oneway');
      } else if (form.contractStep === 3) {
        target = document.getElementById('step3-first-field');
      } else if (form.contractStep === 4) {
        target = document.getElementById('wizard-submit-btn');
      }

      if (!target) {
        const stepContainer = document.querySelector('.custom-scrollbar');
        target = stepContainer?.querySelector('button:not([tabindex="-1"]), input:not([tabindex="-1"]), select:not([tabindex="-1"]), [tabindex="0"]') as HTMLElement;
      }

      if (target) {
        target.focus();
      }
    }, 60);

    return () => clearTimeout(timer);
  }, [form.contractStep, form.submissionResult]);

  // Global Keyboard Shortcuts (Alt+1..4, Ctrl+Enter, Ctrl+S)
  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Alt + 1..4 Step Direct Navigation
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        if (['1', '2', '3', '4'].includes(e.key)) {
          const targetStep = parseInt(e.key, 10) as 1 | 2 | 3 | 4;
          if (form.canNavigateToStep(targetStep)) {
            e.preventDefault();
            form.setContractStep(targetStep);
            return;
          }
        }
      }

      // Ctrl + Enter or Cmd + Enter (Final Submit on Step 4)
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        const hasOpenPopover = !!document.querySelector('[data-state="open"]');
        if (form.contractStep === 4 && !hasOpenPopover && form.isStepValid(3) && !form.bulkMutation.isPending) {
          e.preventDefault();
          form.handleContractSubmit();
          return;
        }
      }

      // Ctrl + S (Next step or Save)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const hasOpenPopover = !!document.querySelector('[data-state="open"]');
        if (!hasOpenPopover) {
          if (form.contractStep < 4 && form.isStepValid(form.contractStep)) {
            form.setContractStep((prev) => (prev + 1) as any);
          } else if (form.contractStep === 4 && form.isStepValid(3) && !form.bulkMutation.isPending) {
            form.handleContractSubmit();
          }
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [form.contractStep, form.canNavigateToStep, form.isStepValid, form.handleContractSubmit, form.bulkMutation.isPending]);

  return (
    <DashboardLayout active="Trips" title="Create New Trip" hideBackButton>
      <div className="px-3 sm:px-6 pb-3 sm:pb-4 animate-fade-in w-full h-[calc(100dvh-105px)] flex flex-col min-h-0">
        <div className="w-full flex-1 overflow-hidden bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-2xl flex flex-col min-h-0">

          {/* Combined Navigation & Stepper Bar */}
          <TripWizardHeader
            contractStep={form.contractStep}
            submissionResult={form.submissionResult}
            isStepValid={form.isStepValid}
            canNavigateToStep={form.canNavigateToStep}
            setContractStep={form.setContractStep}
            handleContractSubmit={form.handleContractSubmit}
            handleDialogClose={form.handleDialogClose}
            isPending={form.bulkMutation.isPending}
            batchTripRowsCount={form.batchTripRows.length}
            KbdBadge={KbdBadge}
          />

          {/* Local Draft Auto-Save Recovery Alert Banner (Only shown on Step 1 Customer) */}
          {form.hasSavedDraft && !form.submissionResult && form.contractStep === 1 && (
            <div className="bg-amber-50 border-b border-amber-200 px-5 py-2 flex items-center justify-between gap-3 text-xs shrink-0 animate-fade-in">
              <div className="flex items-center gap-2 text-amber-900 font-medium">
                <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Unsaved trip draft detected from your previous session.</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  type="button"
                  size="sm"
                  tabIndex={-1}
                  onClick={form.restoreDraft}
                  className="h-7 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg px-3 border-0 shadow-2xs"
                >
                  Restore Draft
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  tabIndex={-1}
                  onClick={form.discardDraft}
                  className="h-7 text-xs font-bold text-amber-800 hover:bg-amber-100 rounded-lg px-2"
                >
                  Discard
                </Button>
              </div>
            </div>
          )}

          {/* Modal Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 min-h-0 custom-scrollbar">
            {/* Submission Result Screen */}
            {form.submissionResult ? (
              <div className="flex flex-col items-center justify-center py-6 text-center animate-fade-in">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                <h3 className="text-xl font-bold text-[#111111]">
                  {form.submissionResult.imported} {form.submissionResult.imported === 1 ? 'Trip' : 'Trips'} Created Successfully!
                </h3>
                <p className="text-xs text-[#6E6E80] mt-1.5 max-w-md">
                  All trips have been added to the database and are now populated on the Monthly Board view.
                </p>

                {form.submissionResult.failed > 0 && (
                  <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 text-left max-w-lg w-full">
                    <p className="font-bold flex items-center gap-1.5 mb-1 text-amber-900">
                      <AlertCircle className="h-4 w-4" /> {form.submissionResult.failed} rows failed validation:
                    </p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-700">
                      {form.submissionResult.results
                        .filter((r) => !r.success)
                        .slice(0, 5)
                        .map((f, idx) => (
                          <li key={idx}>Row {f.row}: {f.error}</li>
                        ))}
                    </ul>
                  </div>
                )}

                {/* Reference ID chips */}
                <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-black/[0.06] max-w-xl w-full text-left">
                  <p className="text-[11px] font-bold text-[#9898A4] uppercase tracking-wider mb-2">
                    Generated Trip References
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                    {form.submissionResult.results
                      .filter((r) => r.success && r.ref_id)
                      .map((r, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2.5 py-1 rounded-md bg-white border border-black/10 text-xs font-bold text-[#111111]"
                        >
                          {r.ref_id}
                        </span>
                      ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 mt-8">
                  <Button
                    variant="outline"
                    onClick={form.resetAll}
                    className="rounded-xl border-black/10 text-xs font-semibold h-10 px-5"
                  >
                    Create More Trips
                  </Button>
                  <Button
                    onClick={form.handleDialogClose}
                    className="rounded-xl bg-brand hover:bg-[#d13d0d] text-white text-xs font-bold h-10 px-6"
                  >
                    Close & View Board
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* TAB 1: MONTHLY CONTRACT BATCH GENERATOR */}
                {form.activeTab === 'contract' && (
                  <div className="pb-4">
                    {/* STEP 1: CUSTOMER, ROUTE & SCHEDULE */}
                    {form.contractStep === 1 && (
                      <TripStep1CustomerRoute
                        contractCustomer={form.contractCustomer}
                        setContractCustomer={form.setContractCustomer}
                        customers={form.customers}
                        contractSlots={form.contractSlots}
                        contractRateCategory={form.contractRateCategory}
                        setContractRateCategory={form.setContractRateCategory}
                        triggerRateLookupForSlots={form.triggerRateLookupForSlots}
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
                      />
                    )}

                    {/* STEP 2: SERVICE & ASSIGNMENT */}
                    {form.contractStep === 2 && (
                      <TripStep3Assignment
                        contractBillingType={form.contractBillingType}
                        setContractBillingType={form.setContractBillingType}
                        contractRateCategory={form.contractRateCategory}
                        setContractRateCategory={form.setContractRateCategory}
                        contractVehicleType={form.contractVehicleType}
                        setContractVehicleType={form.setContractVehicleType}
                        setIsVehicleTypeEditable={form.setIsVehicleTypeEditable}
                        triggerRateLookupForSlots={form.triggerRateLookupForSlots}
                        normalizeBillingType={normalizeBillingType}
                        normalizeRateCategory={normalizeRateCategory}
                        normalizeVehicleClass={normalizeVehicleClass}
                        contractSlots={form.contractSlots}
                        getAvailableRateCardsForLane={form.getAvailableRateCardsForLane}
                        setIsManualRateOverride={form.setIsManualRateOverride}
                        handleOpenCreateQuotation={form.handleOpenCreateQuotation}
                        assignmentType={form.assignmentType}
                        setAssignmentType={form.setAssignmentType}
                        recentDriversList={form.recentDriversList}
                        contractCustomer={form.contractCustomer}
                        masterDriver={form.masterDriver}
                        masterVehicle={form.masterVehicle}
                        handleApplyRecentDriver={form.handleApplyRecentDriver}
                        getVehicleTypeFromCapacity={getVehicleTypeFromCapacity}
                        setIsCreateDriverOpen={form.setIsCreateDriverOpen}
                        drivers={form.drivers}
                        driverOptions={form.driverOptions}
                        handleDriverChange={form.handleDriverChange}
                        vehicles={form.vehicles}
                        vehicleOptions={form.vehicleOptions}
                        handleVehicleChange={form.handleVehicleChange}
                        getCompatibilityRuleForClass={form.getCompatibilityRuleForClass as any}
                        thirdPartyProviderId={form.thirdPartyProviderId}
                        setThirdPartyProviderId={form.setThirdPartyProviderId}
                        thirdPartyProviders={form.thirdPartyProviders}
                        thirdPartyVehiclePlate={form.thirdPartyVehiclePlate}
                        setThirdPartyVehiclePlate={form.setThirdPartyVehiclePlate}
                        thirdPartyDriverName={form.thirdPartyDriverName}
                        setThirdPartyDriverName={form.setThirdPartyDriverName}
                        marginMetrics={form.marginMetrics}
                      />
                    )}

                    {/* STEP 3: REVIEW & CONFIRM */}
                    {form.contractStep === 3 && (
                      <TripStep4Summary
                        contractSlots={form.contractSlots}
                        contractCustomer={form.contractCustomer}
                        masterDriver={form.masterDriver}
                        masterVehicle={form.masterVehicle}
                        assignmentType={form.assignmentType}
                        thirdPartyProviderId={form.thirdPartyProviderId}
                        thirdPartyDriverName={form.thirdPartyDriverName}
                        thirdPartyVehiclePlate={form.thirdPartyVehiclePlate}
                        thirdPartyCost={form.thirdPartyCost}
                        contractBillingType={form.contractBillingType}
                        contractVehicleType={form.contractVehicleType}
                        customers={form.customers}
                        drivers={form.drivers}
                        vehicles={form.vehicles}
                        thirdPartyProviders={form.thirdPartyProviders}
                        normalizeBillingType={normalizeBillingType}
                        getVehicleTypeFromCapacity={getVehicleTypeFromCapacity}
                        setPreviewCustomer={form.setPreviewCustomer}
                        setPreviewDriver={form.setPreviewDriver}
                        setPreviewVehicle={form.setPreviewVehicle}
                        DriverAvatar={DriverAvatar}
                        MapBoundsAdjuster={MapBoundsAdjuster}
                        pickupMarkerIcon={pickupMarkerIcon}
                        dropoffMarkerIcon={dropoffMarkerIcon}
                      />
                    )}
                  </div>
                )}

                {/* TAB 2: QUICK GRID ENTRY */}
                {form.activeTab === 'grid' && (
                  <TripBatchGeneratorTab
                    gridRows={form.gridRows}
                    setGridRows={form.setGridRows}
                    generateEmptyRow={form.generateEmptyRow}
                    updateGridRow={form.updateGridRow}
                    duplicateGridRow={form.duplicateGridRow}
                    deleteGridRow={form.deleteGridRow}
                    handleGridSubmit={form.handleGridSubmit}
                    customers={form.customers}
                    drivers={form.drivers}
                    vehicles={form.vehicles}
                    getVehicleTypeFromCapacity={getVehicleTypeFromCapacity}
                    isPending={form.bulkMutation.isPending}
                  />
                )}

                {/* TAB 3: CSV / EXCEL FILE IMPORT */}
                {form.activeTab === 'file' && (
                  <TripBulkImportTab
                    downloadSampleCsv={form.downloadSampleCsv}
                    fileInputRef={form.fileInputRef}
                    handleFileUpload={form.handleFileUpload}
                    importedFile={form.importedFile}
                    setImportedFile={form.setImportedFile}
                    parsedRows={form.parsedRows}
                    setParsedRows={form.setParsedRows}
                    parseError={form.parseError}
                    handleFileSubmit={form.handleFileSubmit}
                    isPending={form.bulkMutation.isPending}
                  />
                )}
              </>
            )}
          </div>

        </div>
      </div>

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
          form.queryClient.invalidateQueries({ queryKey: ['vehicles'] });
        }}
      />
      <CreateCustomerModal
        isOpen={form.isCreateCustomerOpen}
        onClose={() => form.setIsCreateCustomerOpen(false)}
        onSuccess={(c) => {
          form.setContractCustomer(c.name);
          form.queryClient.invalidateQueries({ queryKey: ['customers'] });
        }}
      />
      <PastDateTripConfirmModal
        open={form.pastDateModalOpen}
        onClose={() => form.setPastDateModalOpen(false)}
        onConfirm={form.handlePastDateConfirm}
        analysis={form.pastDateAnalysis}
        isSubmitting={form.bulkMutation.isPending}
      />
      <CreateThirdPartyModal
        isOpen={form.isCreateProviderOpen}
        onClose={() => form.setIsCreateProviderOpen(false)}
        onSuccess={(provider) => {
          form.setThirdPartyProviderId(provider.id);
          form.queryClient.invalidateQueries({ queryKey: ['third-party-providers-select'] });
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
