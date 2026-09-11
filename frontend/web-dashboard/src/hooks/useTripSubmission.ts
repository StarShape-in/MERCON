import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { tripService, BulkImportTripRow, BulkImportResult, TripStatus } from '@/services/tripService';
import { analyzePastDateRows, applyPastStatusToRows, PastDateAnalysis } from '@/utils/pastDateTripUtils';
import { isUuid } from '@/lib/utils';
import { localDateTimeToUtcIso, useDeploymentTimezone } from '@/lib/datetime';
import { isRoundTripCategory, addDays } from './useCreateTripForm';

export function useTripSubmission(
  contractCustomer: string,
  contractSlots: any[],
  contractVehicleType: string,
  contractRateCategory: string,
  contractBillingType: string,
  assignmentType: string,
  masterDriver: string,
  masterVehicle: string,
  thirdPartyProviderId: string,
  thirdPartyDriverName: string,
  thirdPartyDriverPhone: string,
  thirdPartyVehiclePlate: string,
  thirdPartyCost: string,
  dayAssignments: Record<string, any>,
  selectedDates: string[],
  setContractStep: React.Dispatch<React.SetStateAction<1 | 2 | 3>>,
  setSelectedDates: (dates: string[]) => void,
  setDayAssignments: (assignments: any) => void,
  setParsedRows: (rows: any[]) => void,
  setImportedFile: (file: File | null) => void,
  setParseError: (err: string | null) => void
) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tz = useDeploymentTimezone();

  const [submissionResult, setSubmissionResult] = useState<BulkImportResult | null>(null);
  const [pastDateModalOpen, setPastDateModalOpen] = useState(false);
  const [pendingRows, setPendingRows] = useState<BulkImportTripRow[] | null>(null);
  const [pastDateAnalysis, setPastDateAnalysis] = useState<PastDateAnalysis | null>(null);

  const bulkMutation = useMutation({
    mutationFn: (rows: BulkImportTripRow[]) => tripService.bulkImport(rows),
    onSuccess: (data) => {
      setSubmissionResult(data);
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trips-kpi-summary'] });
      queryClient.invalidateQueries({ queryKey: ['trips-kpi-period'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-trips'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
      queryClient.invalidateQueries({ queryKey: ['rate-cards'] });
      queryClient.invalidateQueries({ queryKey: ['rate-cards-summary'] });
      queryClient.invalidateQueries({ queryKey: ['rate-cards-customer-lookup'] });

      if (data.imported >= 1) {
        toast.success(data.imported === 1 ? 'Trip created successfully' : `${data.imported} Trips created successfully`);
        navigate('/trips?view=kanban');
      } else {
        const firstErr = data?.results?.find((r: any) => !r.success)?.error;
        toast.error(firstErr || 'Failed to create trip');
      }
    },
  });

  const executeBulkSubmit = (rows: BulkImportTripRow[]) => {
    const analysis = analyzePastDateRows(rows);
    if (analysis.hasPastTrips) {
      setPendingRows(rows);
      setPastDateAnalysis(analysis);
      setPastDateModalOpen(true);
    } else {
      bulkMutation.mutate(rows);
    }
  };

  const handlePastDateConfirm = (selectedStatus: TripStatus) => {
    if (!pendingRows) return;
    const finalRows = applyPastStatusToRows(pendingRows, selectedStatus);
    setPastDateModalOpen(false);
    setPendingRows(null);
    bulkMutation.mutate(finalRows);
  };

  const handleContractSubmit = async () => {
    if (!contractCustomer || contractSlots.length === 0) return;

    // Validate that all slots satisfy planned_start < planned_end
    for (let i = 0; i < contractSlots.length; i++) {
      const slot = contractSlots[i];
      const dropoffDateVal = slot.dropoffDate || slot.date;
      if (!slot.date || !dropoffDateVal) {
        toast.error(`Slot #${i + 1} is missing schedule dates.`);
        return;
      }
      try {
        const plannedStart = localDateTimeToUtcIso(slot.date, slot.pickupTime, tz);
        const plannedEnd = localDateTimeToUtcIso(dropoffDateVal, slot.dropoffTime, tz);
        const startMs = new Date(plannedStart).getTime();
        const endMs = new Date(plannedEnd).getTime();
        if (isNaN(startMs) || isNaN(endMs) || endMs <= startMs) {
          toast.error(`Invalid schedule for Slot #${i + 1}: Drop-off date & time must be strictly after pickup date & time.`);
          return;
        }
      } catch (err) {
        toast.error(`Invalid schedule format for Slot #${i + 1}.`);
        return;
      }
    }

    const slotsToSaveAsQuotation = contractSlots.filter(
      (slot) => (slot.saveAsQuotation || slot.saveAsRateCard) && Number(slot.billingAmount) > 0
    );
    if (slotsToSaveAsQuotation.length > 0) {
      const { quotationService } = await import('@/services/quotationService');
      const { locationService } = await import('@/services/locationService');

      await Promise.all(
        slotsToSaveAsQuotation.map(async (slot) => {
          let origId = slot.originLocationId;
          let destId = slot.destinationLocationId;

          if (!origId && slot.origin.trim()) {
            try {
              const createdOrig = await locationService.create({
                customerId: contractCustomer || 'default-customer-id',
                name: slot.origin.trim(),
                lat: slot.originLat ?? null,
                lng: slot.originLng ?? null,
              });
              origId = createdOrig.id;
            } catch (err) {
              console.error(`Failed to ensure origin location '${slot.origin}':`, err);
            }
          }

          if (!destId && slot.destination.trim()) {
            try {
              const createdDest = await locationService.create({
                customerId: contractCustomer || 'default-customer-id',
                name: slot.destination.trim(),
                lat: slot.destinationLat ?? null,
                lng: slot.destinationLng ?? null,
              });
              destId = createdDest.id;
            } catch (err) {
              console.error(`Failed to ensure destination location '${slot.destination}':`, err);
            }
          }

          const intermediateStops = (slot.intermediateLocations || []).map((locVal: string, idx: number) => {
            const locId = slot.intermediateLocationIds?.[idx] || (isUuid(locVal) ? locVal : null);
            return {
              sequence: idx + 2,
              location_id: locId || null,
              source_label: locVal || null,
              stop_type: 'Dropoff',
            };
          });

          const quotationStops = [
            { sequence: 1, location_id: origId || null, source_label: slot.origin.trim() || null, stop_type: 'Pickup' },
            ...intermediateStops,
            { sequence: intermediateStops.length + 2, location_id: destId || null, source_label: slot.destination.trim() || null, stop_type: 'Dropoff' },
          ];

          const slotDriverPayout = slot.driverPayout !== undefined ? Number(slot.driverPayout) : (Number(slot.tripCharges) || null);
          return quotationService
            .create({
              name: `${slot.origin.trim() || 'Origin'} → ${slot.destination.trim() || 'Destination'}`,
              rate: Number(slot.billingAmount),
              base_price: Number(slot.billingAmount),
              driver_payout: slotDriverPayout,
              customerId: contractCustomer,
              origin_location_id: origId || null,
              destination_location_id: destId || null,
              origin_name: origId ? null : slot.origin.trim() || null,
              destination_name: destId ? null : slot.destination.trim() || null,
              origin_lat: slot.originLat ?? null,
              origin_lng: slot.originLng ?? null,
              destination_lat: slot.destinationLat ?? null,
              destination_lng: slot.destinationLng ?? null,
              vehicle_class: contractVehicleType || null,
              source_vehicle_label: contractVehicleType || null,
              vehicle_type: contractVehicleType || null,
              line_type: contractRateCategory || null,
              billing_type: contractBillingType || null,
              pricing_basis: slot.pricingBasis || 'Per Trip',
              stops: quotationStops,
              reason: slot.rateReason?.trim() || `Created inline during trip dispatch for ${slot.origin || 'origin'} → ${slot.destination || 'destination'} (${contractVehicleType || 'Standard'})`,
              source: 'TRIP_CREATION',
            })
            .then((res: any) => {
              const createdQuo = res?.data || res;
              const quoId = createdQuo?.id;
              if (quoId) {
                slot.rateCardId = quoId;
                slot.matchedRateCard = createdQuo;
              }
              toast.success(`Quotation '${createdQuo?.name || slot.origin + ' → ' + slot.destination}' saved to Quotations ledger!`);
              return createdQuo;
            })
            .catch((err: any) => {
              const errMsg = err.response?.data?.error?.message || err.message || 'Unknown error';
              console.error(`Failed to save quotation for slot ${slot.id}:`, err);
              toast.error(`Couldn't save quotation for ${slot.origin} → ${slot.destination}: ${errMsg}`);
            });
        })
      );

      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotations-select'] });
      queryClient.invalidateQueries({ queryKey: ['quotations-select-all'] });
      queryClient.invalidateQueries({ queryKey: ['quotations-all'] });
      queryClient.invalidateQueries({ queryKey: ['quotations', 'select-all'] });
      queryClient.invalidateQueries({ queryKey: ['rate-cards'] });
      queryClient.invalidateQueries({ queryKey: ['rate-card-lookup'] });
      queryClient.invalidateQueries({ queryKey: ['locations-list'] });
    }

    const rows: BulkImportTripRow[] = [];
    const isMonthlyMode = contractBillingType === 'Monthly' && selectedDates.length > 0;
    const datesToSchedule: Array<string | null> = isMonthlyMode ? selectedDates : [null];

    datesToSchedule.forEach((currentDateStr) => {
      contractSlots.forEach((slot) => {
        const date = currentDateStr || slot.date || new Date().toISOString().slice(0, 10);
        const dateKey = contractSlots.length > 1 ? `${date}::${slot.id}` : date;
        const assignment = dayAssignments[dateKey] || dayAssignments[date] || dayAssignments[slot.id] || { driverId: '', vehicleId: '' };

        const outboundStops = slot.intermediateLocations.map((s: string) => s.trim()).filter(Boolean);
        const returnStops = (slot.returnIntermediateLocations || []).map((s: string) => s.trim()).filter(Boolean);

        const outboundFeesSum = (slot.intermediateStopFees || []).reduce((sum: number, f: string) => sum + (Number(f) || 0), 0);
        const returnFeesSum = (slot.returnIntermediateStopFees || []).reduce((sum: number, f: string) => sum + (Number(f) || 0), 0);
        const baseAmount = Number(slot.billingAmount) || 0;
        const totalAmount = baseAmount + outboundFeesSum + returnFeesSum;

        let destString = slot.destination.trim();

        if (isRoundTripCategory(contractRateCategory)) {
          const returnStart = slot.returnOrigin?.trim() || slot.destination.trim();
          const returnEnd = slot.returnDestination?.trim() || slot.origin.trim();

          const outboundChain = outboundStops.length > 0 ? ` → ${outboundStops.join(' → ')}` : '';
          const returnChain = returnStops.length > 0 ? ` → ${returnStops.join(' → ')}` : '';

          destString = `${slot.destination.trim()}${outboundChain} [RETURN: ${returnStart}${returnChain} → ${returnEnd}]`;
        } else if (outboundStops.length > 0) {
          destString = `${slot.destination.trim()} → ${outboundStops.join(' → ')}`;
        }

        let planned_end_val: string | undefined = undefined;
        if (slot.dropoffTime) {
          const isOvernightOrEarlier = slot.isOvernight || (slot.pickupTime && slot.dropoffTime <= slot.pickupTime);
          const targetDropoffDate = isOvernightOrEarlier ? addDays(date, 1) : (slot.dropoffDate && slot.dropoffDate >= date ? slot.dropoffDate : date);
          planned_end_val = localDateTimeToUtcIso(targetDropoffDate, slot.dropoffTime, tz);
        }

        if (assignmentType === 'third_party') {
          const costVal = thirdPartyCost ? Number(thirdPartyCost) : (Number(slot.tripCharges) || 0);
          rows.push({
            customer_id: contractCustomer,
            planned_start: localDateTimeToUtcIso(date, slot.pickupTime, tz),
            planned_end: planned_end_val,
            is_third_party: true,
            third_party_provider_id: thirdPartyProviderId || undefined,
            third_party_driver_name: thirdPartyDriverName.trim() || undefined,
            third_party_driver_phone: thirdPartyDriverPhone.trim() || undefined,
            third_party_vehicle_plate: thirdPartyVehiclePlate.trim() || undefined,
            third_party_vehicle_type: contractVehicleType || undefined,
            third_party_cost: costVal,
            trip_charges: costVal,
            rate_category: contractRateCategory || undefined,
            billing_type: contractBillingType || undefined,
            vehicle_type: contractVehicleType || undefined,
            origin: slot.origin.trim() || undefined,
            destination: destString || undefined,
            billing_amount: totalAmount > 0 ? totalAmount : undefined,
            rate_card_id: slot.rateCardId || undefined,
            status: 'Draft',
          });
        } else {
          const driverId = (assignment.driverId && assignment.driverId !== 'unassigned')
            ? assignment.driverId
            : (masterDriver && masterDriver !== 'unassigned' ? masterDriver : undefined);

          const vehicleId = (assignment.vehicleId && assignment.vehicleId !== 'unassigned')
            ? assignment.vehicleId
            : (masterVehicle && masterVehicle !== 'unassigned' ? masterVehicle : undefined);

          const slotDriverPayout = slot.driverPayout !== undefined ? Number(slot.driverPayout) : (Number(slot.tripCharges) || 0);
          const shouldUpdateQuotation = Boolean(slot.updateQuotationPayout || slot.driverPayoutModified);

          rows.push({
            customer_id: contractCustomer,
            planned_start: localDateTimeToUtcIso(date, slot.pickupTime, tz),
            planned_end: planned_end_val,
            driver_id: driverId,
            vehicle_id: vehicleId,
            rate_category: contractRateCategory || undefined,
            billing_type: contractBillingType || undefined,
            vehicle_type: contractVehicleType || undefined,
            origin: slot.origin.trim() || undefined,
            destination: destString || undefined,
            billing_amount: totalAmount > 0 ? totalAmount : undefined,
            trip_charges: slotDriverPayout > 0 ? slotDriverPayout : undefined,
            driver_charge: slotDriverPayout > 0 ? slotDriverPayout : undefined,
            driver_payout: slotDriverPayout > 0 ? slotDriverPayout : undefined,
            update_quotation_driver_payout: shouldUpdateQuotation,
            rate_card_id: slot.rateCardId || slot.matchedRateCard?.id || undefined,
            status: 'Draft',
          });
        }
      });
    });

    executeBulkSubmit(rows);
  };

  const handleGridSubmit = (gridRows: any[]) => {
    const validRows = gridRows.filter((r) => r.customerId && r.date);
    if (validRows.length === 0) return;

    const rows: BulkImportTripRow[] = validRows.map((r) => ({
      customer_id: r.customerId,
      planned_start: r.date,
      driver_id: r.driverId || undefined,
      vehicle_id: r.vehicleId || undefined,
      rate_category: r.rateCategory || undefined,
      vehicle_type: r.vehicleType || undefined,
      origin: r.origin.trim() || undefined,
      destination: r.destination.trim() || undefined,
      billing_amount: r.amount ? Number(r.amount) : undefined,
      status: 'Draft',
    }));

    executeBulkSubmit(rows);
  };

  const handleFileSubmit = (parsedRows: any[]) => {
    if (parsedRows.length === 0) return;
    executeBulkSubmit(parsedRows);
  };

  const resetAll = () => {
    setContractStep(1);
    setSelectedDates([]);
    setDayAssignments({});
    setSubmissionResult(null);
    setParsedRows([]);
    setImportedFile(null);
    setParseError(null);
    bulkMutation.reset();
  };

  const handleDialogClose = () => {
    resetAll();
    navigate('/trips');
  };

  return {
    submissionResult,
    pastDateModalOpen,
    setPastDateModalOpen,
    pastDateAnalysis,
    handlePastDateConfirm,
    bulkMutation,
    handleContractSubmit,
    handleGridSubmit,
    handleFileSubmit,
    resetAll,
    handleDialogClose,
  };
}
