import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { quotationService, RateCard } from '@/services/quotationService';
import { normalizeVehicleClass, normalizeRateCategory, normalizeBillingType } from './useCreateTripForm';

export function useTripRateLookup(
  contractCustomer: string,
  contractVehicleType: string,
  contractRateCategory: string,
  contractBillingType: string,
  contractStep: number
) {
  const navigate = useNavigate();

  const { data: rateCardsRes } = useQuery({
    queryKey: ['quotations-select', contractCustomer],
    queryFn: () => quotationService.getAll({ customerId: contractCustomer, active_only: true }),
    enabled: Boolean(contractCustomer),
  });

  const customerRateCards: RateCard[] = rateCardsRes?.data ?? [];

  const handleOpenCreateQuotation = (slot?: any) => {
    const originId = slot?.originLocationId || '';
    const destId = slot?.destinationLocationId || '';
    const vClass = normalizeVehicleClass(contractVehicleType);
    const lType = normalizeRateCategory(contractRateCategory);
    const bType = normalizeBillingType(contractBillingType);
    const priceVal = slot?.billingAmount || '';

    const params = new URLSearchParams({
      return_to_trip: 'true',
      return_step: String(contractStep),
      customer_id: contractCustomer || '',
      origin_id: originId,
      destination_id: destId,
      vehicle_class: vClass,
      line_type: lType,
      billing_type: bType,
      price: priceVal,
    });

    navigate(`/quotations/new?${params.toString()}`);
  };

  const getMatchingRateCard = useCallback((
    origin?: string,
    destination?: string,
    vehicleType?: string,
    rateCategory?: string,
    billingType?: string,
    targetDate?: string,
    originLocationId?: string | null,
    destinationLocationId?: string | null
  ): RateCard | null => {
    if ((!origin && !originLocationId) || (!destination && !destinationLocationId) || customerRateCards.length === 0) return null;

    const norm = (s?: string | null) => String(s || '').toLowerCase().replace(/[\s,_()[\]\/{}\-.]/g, '');
    const oNorm = norm(origin);
    const dNorm = norm(destination);
    const vNorm = norm(vehicleType);
    const cNorm = norm(rateCategory);
    const bNormTarget = norm(billingType);

    const checkValidity = (rc: RateCard) => {
      if (!targetDate) return true;
      const t = new Date(targetDate).getTime();
      if (isNaN(t)) return true;
      if (rc.valid_from && new Date(rc.valid_from).getTime() > t) return false;
      if (rc.valid_to && new Date(rc.valid_to).getTime() < t) return false;
      return true;
    };

    const matchLocation = (cardLocRaw: string, targetLocRaw: string) => {
      if (!cardLocRaw || !targetLocRaw) return false;
      const cleanCard = norm(cardLocRaw);
      const cleanTarget = norm(targetLocRaw);
      if (cleanCard === cleanTarget) return true;
      if (cleanCard.includes(cleanTarget) || cleanTarget.includes(cleanCard)) return true;

      const getTokens = (s: string) =>
        s.toLowerCase().split(/[\s,_()[\]\/{}\-.]+/).filter((t) => t.length > 2 && t !== 'al' && t !== 'el' && t !== 'the' && t !== 'station' && t !== 'centre' && t !== 'center' && t !== 'hub');

      const cardTokens = getTokens(cardLocRaw);
      const targetTokens = getTokens(targetLocRaw);
      if (cardTokens.length === 0 || targetTokens.length === 0) return false;
      return cardTokens.some((ct) => targetTokens.some((tt) => ct === tt || ct.includes(tt) || tt.includes(ct)));
    };

    const matchLane = (rc: RateCard) => {
      const firstStop = rc.stops && rc.stops.length > 0 ? rc.stops[0] : null;
      const lastStop = rc.stops && rc.stops.length > 1 ? rc.stops[rc.stops.length - 1] : firstStop;

      const rcO = String(
        firstStop?.source_label || firstStop?.location?.name || firstStop?.location?.address || (firstStop as any)?.location_name || rc.route_origin || rc.origin_name || rc.originLocation?.name || rc.originLocation?.address || (rc as any).origin_location_id || rc.originLocationId || ''
      );
      const rcD = String(
        lastStop?.source_label || lastStop?.location?.name || lastStop?.location?.address || (lastStop as any)?.location_name || rc.route_destination || rc.destination_name || rc.destinationLocation?.name || rc.destinationLocation?.address || (rc as any).destination_location_id || rc.destinationLocationId || ''
      );

      const rcOriginLocId = firstStop?.locationId || firstStop?.location?.id || (rc as any).origin_location_id || rc.originLocationId;
      const rcDestLocId = lastStop?.locationId || lastStop?.location?.id || (rc as any).destination_location_id || rc.destinationLocationId;

      if (originLocationId && destinationLocationId && rcOriginLocId && rcDestLocId) {
        if (rcOriginLocId === originLocationId && rcDestLocId === destinationLocationId) {
          return true;
        }
      }

      return matchLocation(rcO, origin || '') && matchLocation(rcD, destination || '');
    };

    const exact = customerRateCards.find((rc) => {
      if (!checkValidity(rc)) return false;
      if (!matchLane(rc)) return false;

      const rcV = norm(rc.vehicle_type || rc.vehicle_class || rc.source_vehicle_label);
      const rcC = norm(rc.rate_category || rc.line_type);
      const rcB = norm(rc.billing_type);

      const vMatch = !vNorm || !rcV || rcV === vNorm;
      const cMatch = !cNorm || !rcC || rcC === cNorm || rcC.includes(cNorm) || cNorm.includes(rcC);
      const bMatch = !bNormTarget || !rcB || rcB === bNormTarget;

      return vMatch && cMatch && bMatch;
    });

    return exact || null;
  }, [customerRateCards]);

  const getAvailableRateCardsForLane = useCallback((
    origin?: string,
    destination?: string,
    originLocationId?: string | null,
    destinationLocationId?: string | null,
    rateCategory?: string | null,
    returnDestination?: string | null,
    returnDestinationLocationId?: string | null
  ): RateCard[] => {
    if ((!origin && !originLocationId) || (!destination && !destinationLocationId) || customerRateCards.length === 0) return [];

    const norm = (s?: string | null) => String(s || '').toLowerCase().replace(/[\s,_()[\]\/{}\-.]/g, '');
    const targetCategory = norm(rateCategory);
    const isRoundTrip = targetCategory.includes('roundtrip') || targetCategory.includes('round');

    const matchLocation = (cardLocRaw: string, targetLocRaw: string) => {
      if (!cardLocRaw || !targetLocRaw) return false;
      const cleanCard = norm(cardLocRaw);
      const cleanTarget = norm(targetLocRaw);
      if (cleanCard === cleanTarget) return true;
      if (cleanCard.includes(cleanTarget) || cleanTarget.includes(cleanCard)) return true;

      const getTokens = (s: string) =>
        s.toLowerCase().split(/[\s,_()[\]\/{}\-.]+/).filter((t) => t.length > 2 && t !== 'al' && t !== 'el' && t !== 'the' && t !== 'station' && t !== 'center' && t !== 'centre' && t !== 'hub');

      const cardTokens = getTokens(cardLocRaw);
      const targetTokens = getTokens(targetLocRaw);
      if (cardTokens.length === 0 || targetTokens.length === 0) return false;
      return cardTokens.some((ct) => targetTokens.some((tt) => ct === tt || ct.includes(tt) || tt.includes(ct)));
    };

    return customerRateCards.filter((rc) => {
      const firstStop = rc.stops && rc.stops.length > 0 ? rc.stops[0] : null;
      const lastStop = rc.stops && rc.stops.length > 1 ? rc.stops[rc.stops.length - 1] : firstStop;

      const rcO = String(
        firstStop?.source_label || firstStop?.location?.name || firstStop?.location?.address || (firstStop as any)?.location_name || rc.route_origin || rc.origin_name || rc.originLocation?.name || rc.originLocation?.address || (rc as any).origin_location_id || rc.originLocationId || ''
      );
      const rcD = String(
        lastStop?.source_label || lastStop?.location?.name || lastStop?.location?.address || (lastStop as any)?.location_name || rc.route_destination || rc.destination_name || rc.destinationLocation?.name || rc.destinationLocation?.address || (rc as any).destination_location_id || rc.destinationLocationId || ''
      );

      const rcOriginLocId = firstStop?.locationId || firstStop?.location?.id || (rc as any).origin_location_id || rc.originLocationId;
      const rcDestLocId = lastStop?.locationId || lastStop?.location?.id || (rc as any).destination_location_id || rc.destinationLocationId;

      if (originLocationId && rcOriginLocId && rcOriginLocId === originLocationId) {
        if (destinationLocationId && rcDestLocId === destinationLocationId) return true;
        if (returnDestinationLocationId && rcDestLocId === returnDestinationLocationId) return true;
      }

      const originMatches = matchLocation(rcO, origin || '');
      const destMatches = matchLocation(rcD, destination || '') || (returnDestination ? matchLocation(rcD, returnDestination) : false);

      if (!originMatches) return false;

      if (isRoundTrip) {
        const rcLineType = norm(rc.line_type || rc.rate_category);
        if (rcLineType.includes('roundtrip') || rcLineType.includes('round')) {
          return true;
        }
      }

      return destMatches;
    });
  }, [customerRateCards]);

  return {
    customerRateCards,
    handleOpenCreateQuotation,
    getMatchingRateCard,
    getAvailableRateCardsForLane,
  };
}
