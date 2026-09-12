import { MobileTrip, TripStop, stopLabel, stopAddress, isRoundTrip } from './trips';

export interface TimelineStop {
  id: string;
  typeUrdu: string;
  typeEn: string;
  name: string;
  address: string | null;
  iconType: 'House' | 'MapPin' | 'Route';
  isIntermediate?: boolean;
  isReturnStop?: boolean;
  legIndex?: number; // 0 = Outbound, 1 = Return
  stopSequence?: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Split a location chain like "Riyadh → Al-Hofuf → Abha" into individual names. */
function splitChain(str: string): string[] {
  if (!str || !str.trim()) return [];
  return str
    .split(/\s*(?:→|->|-->)\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Does this string look like a location chain (contains arrow separators)? */
function isChain(str: string): boolean {
  return /→|->|-->/.test(str);
}

/**
 * Extract the best single-line label for a TripStop, preferring
 * location_name → location.name → location_address.
 */
function rawStopName(s: TripStop): string {
  return stopLabel(s) || 'Location';
}

/**
 * Expand DB stop records into a flat list of location name strings.
 * If a stop's name contains arrow chains (e.g. "AL BAHA → AL ABHA"),
 * split it into individual entries. Also strips [RETURN:…] markers.
 */
function expandStops(stops: TripStop[]): string[] {
  const names: string[] = [];
  for (const s of stops) {
    const raw = rawStopName(s);
    // Strip [RETURN:…] suffix — handled separately
    const cleaned = raw.replace(/\s*\[RETURN:.*?\]/gi, '').trim();
    if (isChain(cleaned)) {
      // Stop name IS a location chain → expand each segment
      names.push(...splitChain(cleaned));
    } else if (cleaned) {
      names.push(cleaned);
    }
  }
  return names;
}

/**
 * Find the [RETURN:…] string embedded in any stop's location_name,
 * or in trip.destination.
 */
function extractReturnChain(trip: MobileTrip): string {
  // Check trip.destination first
  if (trip.destination?.includes('[RETURN:')) {
    const m = trip.destination.match(/\[RETURN:\s*(.*?)\s*\]/i);
    if (m?.[1]) return m[1].trim();
  }
  // Check each stop's location_name
  for (const s of trip.stops ?? []) {
    const raw = s.location_name || s.location?.name || '';
    if (raw.includes('[RETURN:')) {
      const m = raw.match(/\[RETURN:\s*(.*?)\s*\]/i);
      if (m?.[1]) return m[1].trim();
    }
  }
  return '';
}

// ─── 6-Node Builder ──────────────────────────────────────────────────────────

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

  // ── Outbound Leg ─────────────────────────────────────────────────────────
  const [pickup, ...outboundRest] = outboundNodes;

  if (pickup) {
    result.push(node('pickup', 'Pickup', 'پک اپ', pickup, 'House', { legIndex: 0 }));
  }

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
          name, 'Route',
          { legIndex: 0, isIntermediate: true },
        ),
      );
    });
    result.push(node('outbound-delivery', 'Delivery', 'ڈلیوری', outboundDelivery, 'MapPin', { legIndex: 0 }));
  } else if (outboundRest.length === 1) {
    outboundDelivery = outboundRest[0];
    result.push(node('outbound-delivery', 'Delivery', 'ڈلیوری', outboundDelivery, 'MapPin', { legIndex: 0 }));
  }

  // ── Return Leg ───────────────────────────────────────────────────────────
  if (returnNodes.length > 0) {
    let sanitizedReturnNodes = [...returnNodes];

    // In a round trip, Return Loading MUST start at the location where outbound delivery completed.
    if (outboundDelivery) {
      const outDelivNorm = outboundDelivery.toLowerCase().trim();
      const retStartNorm = sanitizedReturnNodes[0]?.toLowerCase().trim();

      if (retStartNorm !== outDelivNorm) {
        const matchIdx = sanitizedReturnNodes.findIndex((n) => n.toLowerCase().trim() === outDelivNorm);
        const finalDest = sanitizedReturnNodes[sanitizedReturnNodes.length - 1];

        if (matchIdx !== -1) {
          // If the delivery destination was listed later in the return chain (e.g. forward-copied stops),
          // extract the intermediate nodes and reverse them so they properly flow from delivery back to origin.
          const rawIntermediates = sanitizedReturnNodes.filter(
            (n, i) => i !== matchIdx && i !== sanitizedReturnNodes.length - 1
          );
          rawIntermediates.reverse();
          sanitizedReturnNodes = [outboundDelivery, ...rawIntermediates, finalDest];
        } else {
          // If return loading point was missing or mismatched, anchor return loading to outbound delivery
          sanitizedReturnNodes = [outboundDelivery, ...sanitizedReturnNodes];
        }
      }
    }

    const [returnPickup, ...returnRest] = sanitizedReturnNodes;
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
            name, 'Route',
            { legIndex: 1, isIntermediate: true, isReturnStop: true },
          ),
        );
      });
      result.push(node('return-delivery', 'Return Delivery', 'واپسی ڈلیوری', returnDelivery, 'MapPin', { legIndex: 1 }));
    } else if (returnRest.length === 1) {
      result.push(node('return-delivery', 'Return Delivery', 'واپسی ڈلیوری', returnRest[0], 'MapPin', { legIndex: 1 }));
    }
  }

  // ── Attach DB address info where names match ─────────────────────────────
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

// ─── Main Export ─────────────────────────────────────────────────────────────

/**
 * Parses any MobileTrip into a flat ordered list of 6 TimelineStop nodes
 * for round trips, or 2–3 nodes for one-way trips.
 *
 * Key insight: stop location_name can contain arrow-chains like
 * "AL BAHA → AL ABHA" — these are expanded into individual nodes.
 * The [RETURN:…] marker (in destination or stop name) identifies the return leg.
 *
 * Strategy order:
 * 1. Expand DB stops + use [RETURN:] chain from destination/stop name
 * 2. Expand DB stops + detect second Pickup for return leg split
 * 3. trip.origin + trip.destination string parsing
 * 4. Plain DB stops (2-stop simple trips)
 */
export function parseTripRouteNodes(trip: MobileTrip | null): TimelineStop[] {
  if (!trip) return [];

  const dbStops = trip.stops ?? [];
  const isRound = isRoundTrip(trip);

  // ── Strategy 1: Expand DB stops + [RETURN:] chain ────────────────────────
  const returnChain = extractReturnChain(trip);
  if (dbStops.length > 0) {
    const expandedNames = expandStops(dbStops);
    // De-duplicate consecutive identical names
    const deduped = expandedNames.filter((n, i) => i === 0 || n !== expandedNames[i - 1]);

    if (returnChain) {
      const returnNodes = splitChain(returnChain);
      if (deduped.length >= 2 && returnNodes.length >= 1) {
        return buildTimeline(deduped, returnNodes, dbStops);
      }
    }

    // ── Strategy 2: Split at second Pickup for return leg ─────────────────
    const returnStartIdx = dbStops.findIndex((s, idx) => idx > 0 && s.stop_type === 'Pickup');
    if (returnStartIdx !== -1) {
      const outboundExpanded = expandStops(dbStops.slice(0, returnStartIdx));
      const returnExpanded = expandStops(dbStops.slice(returnStartIdx));
      const outDe = outboundExpanded.filter((n, i) => i === 0 || n !== outboundExpanded[i - 1]);
      const retDe = returnExpanded.filter((n, i) => i === 0 || n !== returnExpanded[i - 1]);
      if (outDe.length >= 2) {
        return buildTimeline(outDe, retDe, dbStops);
      }
    }

    // ── Strategy 3: Explicit DB Stops Order (NO REVERSING) ─────────────
    const first = deduped[0]?.toLowerCase().trim();
    const last = deduped[deduped.length - 1]?.toLowerCase().trim();
    const isCircular = first && last && first === last && deduped.length >= 3;

    if (isCircular || isRound) {
      // Outbound: everything up to (but not including) the final duplicate if circular
      const outboundNodes = isCircular ? deduped.slice(0, -1) : deduped;

      let returnNodes: string[] = [];
      if (isCircular) {
        // Strictly preserve the assigned sequence order
        const intermediates = outboundNodes.slice(1, -1);
        returnNodes = [outboundNodes[outboundNodes.length - 1], ...intermediates, outboundNodes[0]];
      } else if (isRound) {
        if (deduped.length > 2) {
          const outboundIntermediates = deduped.slice(1, -1);
          returnNodes = [deduped[deduped.length - 1], ...outboundIntermediates, deduped[0]];
        } else if (deduped.length >= 2) {
          returnNodes = [deduped[deduped.length - 1], deduped[0]];
        }
      }

      if (outboundNodes.length >= 2 && returnNodes.length > 0) {
        return buildTimeline(outboundNodes, returnNodes, dbStops);
      }
    }

    // ── Strategy 4: Simple expanded outbound only ─────────────────────────
    if (deduped.length >= 2) {
      return buildTimeline(deduped, [], dbStops);
    }
  }


  // ── Strategy 4: trip.origin + trip.destination string parsing ────────────
  const destStr = trip.destination || '';
  const originStr = trip.origin?.trim() || '';

  if (destStr.includes('[RETURN:')) {
    const bracketMatch = destStr.match(/^(.*?)\s*\[RETURN:\s*(.*?)\s*\]$/i);
    const outboundStr = bracketMatch ? bracketMatch[1].trim() : destStr.split(/\[RETURN:/i)[0].trim();
    const returnStr = bracketMatch
      ? bracketMatch[2].trim()
      : (destStr.split(/\[RETURN:/i)[1]?.replace(/\]$/, '').trim() ?? '');
    const outboundChain = originStr ? `${originStr} → ${outboundStr}` : outboundStr;
    const outboundNodes = splitChain(outboundChain);
    const returnNodes = splitChain(returnStr);
    if (outboundNodes.length >= 2) {
      return buildTimeline(outboundNodes, returnNodes, dbStops);
    }
  }

  if (originStr || destStr) {
    const destClean = destStr.replace(/\[.*?\]/g, '').trim();
    const fullChain = originStr
      ? (destClean ? `${originStr} → ${destClean}` : originStr)
      : destClean;
    const outboundNodes = splitChain(fullChain);
    let returnNodes: string[] = [];
    if (isRound && outboundNodes.length >= 2) {
      returnNodes = [outboundNodes[outboundNodes.length - 1], outboundNodes[0]];
    }
    if (outboundNodes.length >= 2) {
      return buildTimeline(outboundNodes, returnNodes, dbStops);
    }
  }

  // ── Fallback ─────────────────────────────────────────────────────────────
  if (dbStops.length >= 2) {
    const names = dbStops.map(rawStopName);
    const returnStartIdx = dbStops.findIndex((s, idx) => idx > 0 && s.stop_type === 'Pickup');
    const outbound = returnStartIdx !== -1 ? names.slice(0, returnStartIdx) : names;
    const ret = returnStartIdx !== -1
      ? names.slice(returnStartIdx)
      : (isRound ? [names[names.length - 1], names[0]] : []);
    return buildTimeline(outbound, ret, dbStops);
  }

  return [];
}

// ─── Convenience filters ─────────────────────────────────────────────────────

export function getIntermediateStops(trip: MobileTrip | null): TimelineStop[] {
  return parseTripRouteNodes(trip).filter((s) => s.isIntermediate);
}

export function getOutboundIntermediateStops(trip: MobileTrip | null): TimelineStop[] {
  return parseTripRouteNodes(trip).filter((s) => s.isIntermediate && !s.isReturnStop);
}

export function getReturnIntermediateStops(trip: MobileTrip | null): TimelineStop[] {
  return parseTripRouteNodes(trip).filter((s) => s.isIntermediate && s.isReturnStop);
}
