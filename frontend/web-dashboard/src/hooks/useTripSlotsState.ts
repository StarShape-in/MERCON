import { useState, useCallback } from 'react';
import { estimateTravelTimeByName, calculateArrivalDropoffTime } from '@/services/travelTimeService';
import { isUuid } from '@/lib/utils';
import { addDays } from './useCreateTripForm';

export interface TripSlot {
  id: string;
  origin: string;
  destination: string;
  originLocationId?: string | null;
  destinationLocationId?: string | null;
  rateMatched?: boolean;
  rateCardId?: string;
  rateCardName?: string;
  rateCardBasePrice?: number;
  rateCardDefaultTripCharge?: number | null;
  pickupTime: string;
  dropoffTime: string;
  date: string;
  dropoffDate: string;
  billingAmount: string;
  tripCharges: string;
  saveAsQuotation?: boolean;
  saveAsRateCard?: boolean;
  rateReason?: string;
  isOvernight?: boolean;
  intermediateLocations: string[];
  intermediateLocationIds?: (string | null)[];
  intermediateStopFees?: string[];
  returnOrigin?: string;
  returnDestination?: string;
  returnPickupTime?: string;
  returnDropoffTime?: string;
  returnIsOvernight?: boolean;
  returnIntermediateLocations?: string[];
  returnIntermediateStopFees?: string[];
  originLat?: number | null;
  originLng?: number | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  returnOriginLat?: number | null;
  returnOriginLng?: number | null;
  returnDestinationLat?: number | null;
  returnDestinationLng?: number | null;
}

export function useTripSlotsState() {
  const [contractSlots, setContractSlots] = useState<TripSlot[]>([
    {
      id: 'slot-1',
      origin: '',
      destination: '',
      originLocationId: null,
      destinationLocationId: null,
      rateMatched: false,
      pickupTime: '08:00',
      dropoffTime: '14:00',
      date: new Date().toISOString().slice(0, 10),
      dropoffDate: new Date().toISOString().slice(0, 10),
      billingAmount: '',
      tripCharges: '',
      saveAsQuotation: false,
      saveAsRateCard: false,
      isOvernight: false,
      intermediateLocations: [],
      intermediateLocationIds: [],
      intermediateStopFees: [],
      returnOrigin: '',
      returnDestination: '',
      returnPickupTime: '16:00',
      returnDropoffTime: '22:00',
      returnIsOvernight: false,
      returnIntermediateLocations: [],
      returnIntermediateStopFees: [],
      originLat: null,
      originLng: null,
      destinationLat: null,
      destinationLng: null,
      returnOriginLat: null,
      returnOriginLng: null,
      returnDestinationLat: null,
      returnDestinationLng: null,
    },
  ]);

  const handleAddTripSlot = () => {
    const nextNum = contractSlots.length + 1;
    const defaultTime = nextNum === 2 ? '14:00' : nextNum === 3 ? '20:00' : '08:00';
    setContractSlots((prev) => [
      ...prev,
      {
        id: `slot-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        origin: prev[0]?.origin || '',
        destination: prev[0]?.destination || '',
        originLocationId: prev[0]?.originLocationId || null,
        destinationLocationId: prev[0]?.destinationLocationId || null,
        pickupTime: defaultTime,
        dropoffTime: '14:00',
        date: prev[0]?.date || new Date().toISOString().slice(0, 10),
        dropoffDate: prev[0]?.dropoffDate || new Date().toISOString().slice(0, 10),
        billingAmount: prev[0]?.billingAmount || '',
        tripCharges: prev[0]?.tripCharges || '',
        rateMatched: prev[0]?.rateMatched || false,
        rateCardId: prev[0]?.rateCardId,
        rateCardName: prev[0]?.rateCardName,
        rateCardBasePrice: prev[0]?.rateCardBasePrice,
        rateCardDefaultTripCharge: prev[0]?.rateCardDefaultTripCharge,
        isOvernight: false,
        intermediateLocations: [...(prev[0]?.intermediateLocations || [])],
        intermediateStopFees: [...(prev[0]?.intermediateStopFees || [])],
        returnOrigin: prev[0]?.returnOrigin || '',
        returnDestination: prev[0]?.returnDestination || '',
        returnPickupTime: '16:00',
        returnDropoffTime: '22:00',
        returnIsOvernight: false,
        returnIntermediateLocations: [...(prev[0]?.returnIntermediateLocations || [])],
        returnIntermediateStopFees: [...(prev[0]?.returnIntermediateStopFees || [])],
      },
    ]);
  };

  const handleRemoveTripSlot = (id: string) => {
    if (contractSlots.length <= 1) return;
    setContractSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdateTripSlot = (id: string, updates: Partial<TripSlot>) => {
    setContractSlots((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );

    if (
      updates.origin !== undefined ||
      updates.destination !== undefined ||
      updates.date !== undefined ||
      updates.pickupTime !== undefined
    ) {
      const slot = contractSlots.find((s) => s.id === id);
      if (slot) {
        const origin = updates.origin !== undefined ? updates.origin : slot.origin;
        const destination = updates.destination !== undefined ? updates.destination : slot.destination;
        const originLat = updates.originLat !== undefined ? updates.originLat : slot.originLat;
        const originLng = updates.originLng !== undefined ? updates.originLng : slot.originLng;
        const destinationLat = updates.destinationLat !== undefined ? updates.destinationLat : slot.destinationLat;
        const destinationLng = updates.destinationLng !== undefined ? updates.destinationLng : slot.destinationLng;
        const date = updates.date !== undefined ? updates.date : slot.date;
        const pickupTime = updates.pickupTime !== undefined ? updates.pickupTime : slot.pickupTime;

        if (origin.trim() && destination.trim()) {
          estimateTravelTimeByName(origin, destination, originLat, originLng, destinationLat, destinationLng)
            .then((estimate) => {
              if (estimate) {
                const arrival = calculateArrivalDropoffTime(pickupTime, estimate.durationMinutes);
                const dropoffDate = arrival.isOvernight ? addDays(date, 1) : date;

                setContractSlots((prev) =>
                  prev.map((s) =>
                    s.id === id
                      ? {
                          ...s,
                          dropoffTime: arrival.dropoffTime,
                          dropoffDate,
                          isOvernight: arrival.isOvernight,
                        }
                      : s
                  )
                );
              }
            })
            .catch((err) => {
              console.warn('Auto-fill dropoff estimate failed', err);
            });
        }
      }
    }
  };

  const handleAddSlotIntermediate = (slotId: string) => {
    setContractSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? {
              ...s,
              intermediateLocations: [...s.intermediateLocations, ''],
              intermediateLocationIds: [...(s.intermediateLocationIds || []), null],
              intermediateStopFees: [...(s.intermediateStopFees || []), ''],
            }
          : s
      )
    );
  };

  const handleRemoveSlotIntermediate = (slotId: string, idx: number) => {
    setContractSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? {
              ...s,
              intermediateLocations: s.intermediateLocations.filter((_, i) => i !== idx),
              intermediateLocationIds: (s.intermediateLocationIds || []).filter((_, i) => i !== idx),
              intermediateStopFees: (s.intermediateStopFees || []).filter((_, i) => i !== idx),
            }
          : s
      )
    );
  };

  const handleUpdateSlotIntermediate = (slotId: string, idx: number, val: string, locObj?: any) => {
    setContractSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        const newLocs = [...s.intermediateLocations];
        const newIds = [...(s.intermediateLocationIds || [])];
        newLocs[idx] = val;
        newIds[idx] = locObj?.id ?? null;
        return {
          ...s,
          intermediateLocations: newLocs,
          intermediateLocationIds: newIds,
        };
      })
    );
  };

  const handleUpdateSlotIntermediateFee = (slotId: string, idx: number, val: string) => {
    setContractSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        const newFees = [...(s.intermediateStopFees || [])];
        newFees[idx] = val;
        return {
          ...s,
          intermediateStopFees: newFees,
        };
      })
    );
  };

  const handleAddSlotReturnIntermediate = (slotId: string) => {
    setContractSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? {
              ...s,
              returnIntermediateLocations: [...(s.returnIntermediateLocations || []), ''],
              returnIntermediateStopFees: [...(s.returnIntermediateStopFees || []), ''],
            }
          : s
      )
    );
  };

  const handleRemoveSlotReturnIntermediate = (slotId: string, idx: number) => {
    setContractSlots((prev) =>
      prev.map((s) =>
        s.id === slotId
          ? {
              ...s,
              returnIntermediateLocations: (s.returnIntermediateLocations || []).filter((_, i) => i !== idx),
              returnIntermediateStopFees: (s.returnIntermediateStopFees || []).filter((_, i) => i !== idx),
            }
          : s
      )
    );
  };

  const handleUpdateSlotReturnIntermediate = (slotId: string, idx: number, val: string) => {
    setContractSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        const newLocs = [...(s.returnIntermediateLocations || [])];
        newLocs[idx] = val;
        return {
          ...s,
          returnIntermediateLocations: newLocs,
        };
      })
    );
  };

  const handleUpdateSlotReturnIntermediateFee = (slotId: string, idx: number, val: string) => {
    setContractSlots((prev) =>
      prev.map((s) => {
        if (s.id !== slotId) return s;
        const newFees = [...(s.returnIntermediateStopFees || [])];
        newFees[idx] = val;
        return {
          ...s,
          returnIntermediateStopFees: newFees,
        };
      })
    );
  };

  return {
    contractSlots,
    setContractSlots,
    handleAddTripSlot,
    handleRemoveTripSlot,
    handleUpdateTripSlot,
    handleAddSlotIntermediate,
    handleRemoveSlotIntermediate,
    handleUpdateSlotIntermediate,
    handleUpdateSlotIntermediateFee,
    handleAddSlotReturnIntermediate,
    handleRemoveSlotReturnIntermediate,
    handleUpdateSlotReturnIntermediate,
    handleUpdateSlotReturnIntermediateFee,
  };
}
