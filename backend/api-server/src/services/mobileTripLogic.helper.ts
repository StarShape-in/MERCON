/**
 * Helper mirror of mobile trip and routeParser algorithms for backend testing.
 * Verbatim copies the pure logic from:
 * - frontend/mobile-app/mercon-app/src/lib/trips.ts
 * - frontend/mobile-app/mercon-app/src/lib/routeParser.ts
 */

export interface TripStop {
  id: string;
  trip_id?: string;
  stop_sequence: number;
  leg_index?: number;
  stop_type: 'Pickup' | 'Dropoff';
  location_id?: string | null;
  location_name?: string | null;
  location_address?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  arrived_at?: string | null;
  departure_time?: string | null;
  actual_arrival?: string | null;
  actual_departure?: string | null;
  status?: string;
  notes?: string | null;
  location?: {
    name?: string;
    address?: string;
    latitude?: number;
    longitude?: number;
  } | null;
}

export interface MobileTrip {
  id: string;
  ref_id?: string;
  status: string;
  driver_workflow_state?: string | null;
  origin?: string;
  destination?: string;
  line_type_name?: string;
  line_type?: { name?: string };
  stops?: TripStop[];
  planned_distance?: number;
  planned_end?: string | null;
}

export interface TimelineStop {
  id: string;
  typeUrdu: string;
  typeEn: string;
  name: string;
  address: string | null;
  iconType: 'House' | 'MapPin' | 'Route';
  isIntermediate?: boolean;
  isReturnStop?: boolean;
  legIndex?: number;
  stopSequence?: number;
}

export function isRoundTrip(trip?: { line_type_name?: string; line_type?: { name?: string }; stops?: TripStop[] } | null): boolean {
  if (!trip) return false;
  const name = trip.line_type_name || trip.line_type?.name || '';
  if (/round\s*trip/i.test(name)) return true;
  if (Array.isArray(trip.stops) && trip.stops.some(s => s.leg_index === 1)) {
    return true;
  }
  return false;
}

export function stopLabel(stop: TripStop): string {
  return stop.location_name || stop.location?.name || stop.location_address || 'Stop';
}

export function stopAddress(stop: TripStop): string | null {
  return stop.location_address || stop.location?.address || null;
}

function rawStopName(s: TripStop): string {
  return stopLabel(s) || 'Location';
}

function splitChain(str: string): string[] {
  if (!str || !str.trim()) return [];
  return str
    .split(/\s*(?:→|->|-->)\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isChain(str: string): boolean {
  return /→|->|-->/.test(str);
}

function expandStops(stops: TripStop[]): string[] {
  const names: string[] = [];
  for (const s of stops) {
    const raw = rawStopName(s);
    const cleaned = raw.replace(/\s*\[RETURN:.*?\]/gi, '').trim();
    if (isChain(cleaned)) {
      names.push(...splitChain(cleaned));
    } else if (cleaned) {
      names.push(cleaned);
    }
  }
  return names;
}

function extractReturnChain(trip: MobileTrip): string {
  if (trip.destination?.includes('[RETURN:')) {
    const m = trip.destination.match(/\[RETURN:\s*(.*?)\s*\]/i);
    if (m?.[1]) return m[1].trim();
  }
  for (const s of trip.stops ?? []) {
    const raw = s.location_name || s.location?.name || '';
    if (raw.includes('[RETURN:')) {
      const m = raw.match(/\[RETURN:\s*(.*?)\s*\]/i);
      if (m?.[1]) return m[1].trim();
    }
  }
  return '';
}

function buildTimeline(
  outboundNodes: string[],
  returnNodes: string[],
  dbStops?: TripStop[],
): TimelineStop[] {
  const result: TimelineStop[] = [];
  let seq = 1;

  const node = (
    id: string,
    typeEn: string,
    typeUrdu: string,
    name: string,
    iconType: 'House' | 'MapPin' | 'Route',
    opts?: Partial<TimelineStop>,
  ): TimelineStop => ({
    id,
    typeEn,
    typeUrdu,
    name,
    address: null,
    iconType,
    stopSequence: seq++,
    ...opts,
  });

  if (outboundNodes.length === 0) return result;

  const [origin, ...outboundRest] = outboundNodes;
  result.push(node('origin', 'Pickup', 'پک اپ', origin, 'House', { legIndex: 0 }));

  let outboundDelivery = '';
  if (outboundRest.length > 1) {
    const outboundIntermediates = outboundRest.slice(0, -1);
    outboundDelivery = outboundRest[outboundRest.length - 1];
    outboundIntermediates.forEach((name, idx) => {
      result.push(
        node(
          `outbound-stop-${idx}`,
          `Outbound Stop #${idx + 1}`,
          `آؤٹ باؤنڈ اسٹاپ #${idx + 1}`,
          name,
          'Route',
          { legIndex: 0, isIntermediate: true },
        ),
      );
    });
    result.push(node('outbound-delivery', 'Delivery', 'ڈلیوری', outboundDelivery, 'MapPin', { legIndex: 0 }));
  } else if (outboundRest.length === 1) {
    outboundDelivery = outboundRest[0];
    result.push(node('outbound-delivery', 'Delivery', 'ڈلیوری', outboundDelivery, 'MapPin', { legIndex: 0 }));
  }

  if (returnNodes.length > 0) {
    const [returnPickup, ...returnRest] = returnNodes;
    result.push(node('return-pickup', 'Return Loading', 'واپسی لوڈنگ', returnPickup, 'House', { legIndex: 1 }));

    if (returnRest.length > 1) {
      const returnIntermediates = returnRest.slice(0, -1);
      const returnDelivery = returnRest[returnRest.length - 1];
      returnIntermediates.forEach((name, idx) => {
        result.push(
          node(
            `return-stop-${idx}`,
            `Return Stop #${idx + 1}`,
            `واپسی اسٹاپ #${idx + 1}`,
            name,
            'Route',
            { legIndex: 1, isIntermediate: true, isReturnStop: true },
          ),
        );
      });
      result.push(node('return-delivery', 'Return Delivery', 'واپسی ڈلیوری', returnDelivery, 'MapPin', { legIndex: 1 }));
    } else if (returnRest.length === 1) {
      result.push(node('return-delivery', 'Return Delivery', 'واپسی ڈلیوری', returnRest[0], 'MapPin', { legIndex: 1 }));
    }
  }

  if (dbStops && dbStops.length > 0) {
    result.forEach((r) => {
      const match = dbStops.find((s) => {
        const label = rawStopName(s).toLowerCase().trim();
        return label === r.name.toLowerCase().trim();
      });
      if (match) {
        r.address = stopAddress(match);
      }
    });
  }

  return result;
}

export function parseTripRouteNodes(trip: MobileTrip | null): TimelineStop[] {
  if (!trip) return [];

  const dbStops = trip.stops ?? [];
  const isRound = isRoundTrip(trip);

  // Strategy 0: Explicit DB Stops with leg_index (Primary Source of Truth)
  const returnLegStops = dbStops.filter((s) => (s.leg_index ?? 0) === 1);
  const outboundLegStops = dbStops.filter((s) => (s.leg_index ?? 0) === 0);

  if (returnLegStops.length > 0) {
    const outboundNames = outboundLegStops.map(rawStopName);
    const returnNames = returnLegStops.map(rawStopName);
    if (outboundNames.length >= 2 && returnNames.length >= 1) {
      return buildTimeline(outboundNames, returnNames, dbStops);
    }
  }

  if (outboundLegStops.length >= 2 && returnLegStops.length === 0 && !isRound) {
    const outboundNames = outboundLegStops.map(rawStopName);
    return buildTimeline(outboundNames, [], dbStops);
  }

  // Strategy 1: Expand DB stops + [RETURN:] chain
  const returnChain = extractReturnChain(trip);
  if (dbStops.length > 0) {
    const expandedNames = expandStops(dbStops);
    const deduped = expandedNames.filter((n, i) => i === 0 || n !== expandedNames[i - 1]);

    if (returnChain) {
      const returnNodes = splitChain(returnChain);
      return buildTimeline(deduped, returnNodes, dbStops);
    }

    // Strategy 2: Detect second Pickup in DB stops for return leg split
    const secondPickupIdx = dbStops.findIndex((s, i) => i > 0 && s.stop_type === 'Pickup');
    if (isRound && secondPickupIdx > 0) {
      const outboundPart = expandStops(dbStops.slice(0, secondPickupIdx));
      const returnPart = expandStops(dbStops.slice(secondPickupIdx));
      if (outboundPart.length >= 2 && returnPart.length >= 1) {
        return buildTimeline(outboundPart, returnPart, dbStops);
      }
    }

    if (!isRound) {
      return buildTimeline(deduped, [], dbStops);
    }
  }

  // Strategy 3: Origin & Destination string parsing
  const originStr = trip.origin || '';
  const destStr = trip.destination || '';
  const originChain = splitChain(originStr);
  const destChain = splitChain(destStr.replace(/\s*\[RETURN:.*?\]/gi, '').trim());

  let outboundNodes: string[] = [];
  if (originChain.length > 1) {
    outboundNodes = [...originChain];
    if (destChain.length > 0 && destChain[destChain.length - 1] !== originChain[originChain.length - 1]) {
      outboundNodes.push(...destChain);
    }
  } else if (originStr && destStr) {
    outboundNodes = [originStr, ...destChain];
  } else if (destChain.length >= 2) {
    outboundNodes = destChain;
  }

  let returnNodes: string[] = [];
  if (returnChain) {
    returnNodes = splitChain(returnChain);
  } else if (isRound && outboundNodes.length >= 2) {
    returnNodes = [outboundNodes[outboundNodes.length - 1], outboundNodes[0]];
  }

  if (outboundNodes.length >= 2) {
    return buildTimeline(outboundNodes, returnNodes, dbStops);
  }

  return [];
}

export function getEffectiveWorkflowState(trip: MobileTrip | null | undefined): string {
  if (!trip) return 'ASSIGNED';
  const ws = trip.driver_workflow_state;
  const stops = [...(trip.stops || [])].sort((a, b) => a.stop_sequence - b.stop_sequence);
  const isRound = isRoundTrip(trip);

  if (trip.status === 'Completed' || trip.status === 'Invoiced' || ws === 'COMPLETED') {
    return 'COMPLETED';
  }

  if (stops.length > 0) {
    const outboundStops = stops.filter((s) => (s.leg_index ?? 0) === 0);
    const returnStops = stops.filter((s) => (s.leg_index ?? 0) === 1);
    const hasExplicitLegs = returnStops.length > 0;

    const s1 = outboundStops[0] || stops[0];
    const s2 = hasExplicitLegs
      ? (outboundStops.filter((s) => s.stop_type === 'Dropoff').pop() || outboundStops[outboundStops.length - 1])
      : (stops.find((s) => s.stop_sequence === 2) || stops[1] || stops[stops.length - 1]);

    const s3 = isRound
      ? (hasExplicitLegs
          ? (returnStops.find((s) => s.stop_type === 'Pickup') || returnStops[0])
          : stops.find((s) => s.stop_sequence === 3))
      : null;

    const s4 = isRound
      ? (hasExplicitLegs
          ? (returnStops.filter((s) => s.stop_type === 'Dropoff').pop() || returnStops[returnStops.length - 1])
          : (stops.find((s) => s.stop_sequence === 4) || stops[stops.length - 1]))
      : null;

    // 1. Final Delivery (Stop 4 for round trip, Stop 2 for single trip)
    if (isRound && s4) {
      if (s4.actual_departure || ws === 'RETURN_DELIVERY_COMPLETED' || ws === 'COMPLETED') {
        return 'COMPLETED';
      }
      if (s4.actual_arrival || ws === 'ARRIVED_AT_FINAL_DELIVERY' || ws === 'FINAL_DELIVERY_VERIFICATION') {
        return ws && ['ARRIVED_AT_FINAL_DELIVERY', 'FINAL_DELIVERY_VERIFICATION'].includes(ws) ? ws : 'ARRIVED_AT_FINAL_DELIVERY';
      }
    }

    // 2. Return Loading (Stop 3 for round trip)
    if (isRound && s3) {
      if (s3.actual_departure) {
        // Return loading completed and departed -> In transit to return delivery
        return (ws && ['IN_TRANSIT_RETURN', 'ARRIVED_AT_FINAL_DELIVERY', 'FINAL_DELIVERY_VERIFICATION'].includes(ws))
          ? ws
          : 'IN_TRANSIT_RETURN';
      }
      if (s3.actual_arrival || ws === 'RETURN_LOADING' || ws === 'RETURN_LOADING_COMPLETED') {
        return ws && ['RETURN_LOADING', 'RETURN_LOADING_COMPLETED'].includes(ws) ? ws : 'RETURN_LOADING';
      }
    }

    // 3. Outbound Delivery (Stop 2)
    if (s2) {
      if (s2.actual_departure) {
        if (isRound) {
          // First delivery completed and departed -> Ready for return loading
          return (ws && ['RETURN_LOADING', 'RETURN_LOADING_COMPLETED', 'IN_TRANSIT_RETURN', 'ARRIVED_AT_FINAL_DELIVERY'].includes(ws))
            ? ws
            : 'RETURN_LOADING';
        } else {
          return 'COMPLETED';
        }
      }
      if (s2.actual_arrival || ws === 'ARRIVED_AT_DELIVERY' || ws === 'DELIVERY_VERIFICATION' || ws === 'FIRST_DELIVERY_COMPLETED') {
        return ws && ['ARRIVED_AT_DELIVERY', 'DELIVERY_VERIFICATION', 'FIRST_DELIVERY_COMPLETED'].includes(ws) ? ws : 'ARRIVED_AT_DELIVERY';
      }
    }

    // 4. Initial Pickup (Stop 1)
    if (s1) {
      if (s1.actual_departure) {
        // Pickup departed -> In transit to delivery
        return (ws && ['IN_TRANSIT', 'GOING_TO_STOP', 'ARRIVED_AT_STOP', 'STOP_VERIFICATION', 'ARRIVED_AT_DELIVERY', 'DELIVERY_VERIFICATION'].includes(ws))
          ? ws
          : 'IN_TRANSIT';
      }
      if (s1.actual_arrival || ws === 'ARRIVED_AT_PICKUP' || ws === 'LOADING' || ws === 'LOADING_COMPLETED') {
        return ws && ['ARRIVED_AT_PICKUP', 'LOADING', 'LOADING_COMPLETED'].includes(ws) ? ws : 'ARRIVED_AT_PICKUP';
      }
    }
  }

  return ws || 'ASSIGNED';
}

export interface AuthoritativeActiveStop {
  activeStop: TripStop | null;
  activeStopId: string | null;
  activeStopSequence: number | null;
  currentLegIndex: number;
  nextStop: TripStop | null;
  nextStopId: string | null;
  isOutboundCompleted: boolean;
  isReturnAllowedToStart: boolean;
  isTripCompleted: boolean;
  effectiveWorkflowState: string;
}

export function resolveAuthoritativeActiveStop(
  trip?: { stops?: TripStop[]; status?: string; driver_workflow_state?: string | null } | null
): AuthoritativeActiveStop {
  const stops = trip?.stops || [];
  const statusUpper = (trip?.status || '').toUpperCase();
  const ws = trip?.driver_workflow_state || null;
  const sortedStops = [...stops].sort((a, b) => a.stop_sequence - b.stop_sequence);

  if (statusUpper === 'COMPLETED' || statusUpper === 'INVOICED' || ws === 'COMPLETED') {
    return {
      activeStop: null,
      activeStopId: null,
      activeStopSequence: null,
      currentLegIndex: sortedStops.some((s) => (s.leg_index ?? 0) === 1) ? 1 : 0,
      nextStop: null,
      nextStopId: null,
      isOutboundCompleted: true,
      isReturnAllowedToStart: true,
      isTripCompleted: true,
      effectiveWorkflowState: 'COMPLETED',
    };
  }

  if (sortedStops.length === 0) {
    return {
      activeStop: null,
      activeStopId: null,
      activeStopSequence: null,
      currentLegIndex: 0,
      nextStop: null,
      nextStopId: null,
      isOutboundCompleted: false,
      isReturnAllowedToStart: false,
      isTripCompleted: false,
      effectiveWorkflowState: ws || (['IN_TRANSIT', 'DISPATCHED', 'ACTIVE'].includes(statusUpper) ? 'AT_PICKUP' : 'SCHEDULED'),
    };
  }

  const outboundStops = sortedStops.filter((s) => (s.leg_index ?? 0) === 0);
  const returnStops = sortedStops.filter((s) => (s.leg_index ?? 0) === 1);
  const isRound = returnStops.length > 0 || (trip ? isRoundTrip(trip) : false);

  const outboundDelivery = outboundStops.filter((s) => s.stop_type === 'Dropoff').pop() ||
    (outboundStops.length > 0 ? outboundStops[outboundStops.length - 1] : null);

  const isOutboundCompleted = Boolean(
    outboundDelivery && (outboundDelivery.actual_departure != null || outboundDelivery.actual_arrival != null)
  );

  const isReturnAllowedToStart = isRound ? isOutboundCompleted : false;

  // Find active stop: first stop that has not departed yet
  let activeIdx = sortedStops.findIndex((s) => !s.actual_departure);

  if (activeIdx === -1) {
    return {
      activeStop: null,
      activeStopId: null,
      activeStopSequence: null,
      currentLegIndex: returnStops.length > 0 ? 1 : 0,
      nextStop: null,
      nextStopId: null,
      isOutboundCompleted: true,
      isReturnAllowedToStart: true,
      isTripCompleted: true,
      effectiveWorkflowState: 'COMPLETED',
    };
  }

  let activeStop = sortedStops[activeIdx];
  const activeLeg = activeStop.leg_index ?? 0;

  // STRICT RETURN START GUARD:
  // If active stop is on return leg (leg 1), but outbound delivery has NOT arrived,
  // return leg CANNOT be active. The active stop must remain the outbound delivery stop.
  if (activeLeg === 1 && !isOutboundCompleted && outboundDelivery) {
    activeStop = outboundDelivery;
    activeIdx = sortedStops.findIndex((s) => s.id === outboundDelivery.id);
  }

  const nextStop = activeIdx + 1 < sortedStops.length ? sortedStops[activeIdx + 1] : null;

  return {
    activeStop,
    activeStopId: activeStop?.id || null,
    activeStopSequence: activeStop?.stop_sequence || null,
    currentLegIndex: activeStop?.leg_index ?? 0,
    nextStop,
    nextStopId: nextStop?.id || null,
    isOutboundCompleted,
    isReturnAllowedToStart,
    isTripCompleted: false,
    effectiveWorkflowState: getEffectiveWorkflowState(trip as any),
  };
}
