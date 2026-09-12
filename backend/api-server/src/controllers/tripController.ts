import { Request, Response } from 'express';
import { prisma } from '../db';
import { generateRefId } from '../utils/refId';
import { createDriverNotification, notifyOperatorsOfDelay } from './notificationController';
import { Prisma, TripStatus, StopType, DriverStatus, AssetStatus, AssignmentEntityType } from '@prisma/client';
import { logger } from '../utils/logger';
import { isValidTransition, completeTripAndInvoice, stampStopTransition, type DelayDetection } from '../services/tripLifecycle';
import { findRateForLane, findPricingRuleForLane, findQuotationForLane } from '../services/rateLookup';
import { resolveLocation } from './locationController';
import { resolveVehicleLocation, resolveVehicleLocationsForTrips } from '../services/locationResolver';
import { parseOptionalFloat, getValidUuid } from '../utils/uuid';
import { buildSearchAnd } from '../utils/search';
import { getCompanyLegalName } from './settingsController';
import { computeTripChargesTotal } from '../utils/tripFinancials';
import { validateTripDrivers, TripDriverInput, validateTripSchedule } from '../services/tripValidationService';
import { recordAssignmentEvent } from '../services/fleetDispatchService';

/** Fields the trip ledger search bar looks at. */
const TRIP_SEARCH_FIELDS = [
  'ref_id',
  'customer.name',
  'driver.first_name',
  'driver.last_name',
  'driver.ref_id',
  'vehicle.plate_number',
  'vehicle.ref_id',
  'thirdPartyProvider.name',
  'third_party_driver_name',
  'third_party_vehicle_plate',
  'quotation.name',
  'stops[].location_name',
  'stops[].location_address',
  'stops[].location.code',
  'stops[].location.name',
  'stops[].location.city',
  'stops[].location.address',
];

const isUuid = (val: any): boolean =>
  typeof val === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

const normaliseName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * Resolves what coordinates a bulk-imported trip's origin/destination TEXT
 * ("Riyadh") should actually get, using the customer-scoped Location records.
 */
const resolveStopCoords = async (
  placeText: string,
  customerId: string
): Promise<{ lat: number | null; lng: number | null; address: string | null; name: string; locationId: string | null } | null> => {
  const needle = placeText.trim().toLowerCase();
  if (!needle) return null;

  const locationMatch = await prisma.location.findFirst({
    where: {
      customerId,
      deletedAt: null,
      OR: [
        { name: { equals: placeText.trim(), mode: 'insensitive' } },
        { code: { equals: placeText.trim(), mode: 'insensitive' } },
        { slug: { equals: placeText.trim().toLowerCase(), mode: 'insensitive' } },
      ],
    },
  });

  if (locationMatch) {
    return {
      lat: locationMatch.lat,
      lng: locationMatch.lng,
      address: locationMatch.address || `${placeText.trim()}, Saudi Arabia`,
      name: placeText.trim(),
      locationId: locationMatch.id,
    };
  }

  return {
    lat: null,
    lng: null,
    address: `${placeText.trim()}, Saudi Arabia`,
    name: placeText.trim(),
    locationId: null,
  };
};

/**
 * Matches a bulk-imported "driver_name" cell against Driver.first_name/
 * last_name, without assuming how the sheet's name maps onto those two
 * columns. A strict "first word = first_name, rest = last_name" split
 * breaks the moment a driver record was itself entered with the whole name
 * in first_name (common for single-word names, or when Drivers were
 * onboarded from a sheet that never split them) -- exactly the case that
 * made every row of a real import fail even though the driver existed.
 * Tries, in order: the literal split, the full name against first_name
 * alone, and the full name against first_name+last_name concatenated.
 */
export function normalizeDriverName(rawName: string): string {
  if (!rawName) return '';
  let s = rawName
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ');

  const tokens = s.split(' ').map((t) => {
    if (['mohd', 'mhd', 'md', 'mohammed', 'mohammad', 'muhammed', 'muhammad'].includes(t)) {
      return 'muhammad';
    }
    return t;
  });

  return tokens.join(' ').trim();
}

const findDriverByFullName = async (rawName: string) => {
  if (!rawName || !rawName.trim()) return null;

  const rawClean = rawName.trim();
  const normalizedInput = normalizeDriverName(rawClean);
  const inputTokens = normalizedInput.split(' ').filter(Boolean);

  const activeDrivers = await prisma.driver.findMany({
    where: { deletedAt: null },
    select: { id: true, first_name: true, last_name: true, phone_primary: true },
  });

  if (activeDrivers.length === 0) return null;

  // Tier 1: Exact case-insensitive match on full concatenated name or first_name
  for (const d of activeDrivers) {
    const fn = (d.first_name || '').trim();
    const ln = (d.last_name || '').trim();
    const full = `${fn} ${ln}`.trim();

    if (full.toLowerCase() === rawClean.toLowerCase()) return d;
    if (fn.toLowerCase() === rawClean.toLowerCase() && !ln) return d;
  }

  // Tier 2: Normalized prefix match (e.g. MOHD IQBAL <-> MUHAMMAD IQBAL)
  for (const d of activeDrivers) {
    const fn = (d.first_name || '').trim();
    const ln = (d.last_name || '').trim();
    const normalizedDriverFull = normalizeDriverName(`${fn} ${ln}`);
    const normalizedDriverFirst = normalizeDriverName(fn);

    if (normalizedDriverFull === normalizedInput) return d;
    if (normalizedDriverFirst === normalizedInput) return d;
  }

  // Tier 3: Token set & substring matching for single or multi-word names
  const candidates: Array<{ driver: typeof activeDrivers[0]; score: number }> = [];

  for (const d of activeDrivers) {
    const fn = (d.first_name || '').trim();
    const ln = (d.last_name || '').trim();
    const driverFullNorm = normalizeDriverName(`${fn} ${ln}`);
    const driverTokens = driverFullNorm.split(' ').filter(Boolean);

    const matchedTokensCount = inputTokens.filter((it) =>
      driverTokens.some((dt) => dt === it || dt.includes(it) || it.includes(dt))
    ).length;

    if (matchedTokensCount > 0 && matchedTokensCount === inputTokens.length) {
      let score = matchedTokensCount * 10;
      if (normalizeDriverName(fn) === normalizedInput) score += 20;
      if (driverTokens.includes(inputTokens[0])) score += 5;
      candidates.push({ driver: d, score });
    }
  }

  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].driver;
  }

  // Tier 4: Loose Substring match on any driver token
  for (const d of activeDrivers) {
    const fn = (d.first_name || '').trim();
    const ln = (d.last_name || '').trim();
    const normFull = normalizeDriverName(`${fn} ${ln}`);
    if (normFull.includes(normalizedInput) || normalizedInput.includes(normFull)) {
      return d;
    }
  }

  return null;
};

export async function resolveTripId(idOrRef: string, tx: Prisma.TransactionClient | typeof prisma = prisma): Promise<string | null> {
  if (!idOrRef || typeof idOrRef !== 'string') return null;
  if (isUuid(idOrRef)) return idOrRef;
  const trip = await tx.trip.findFirst({
    where: {
      OR: [
        { ref_id: idOrRef },
        { ref_id: { equals: idOrRef, mode: 'insensitive' } },
      ],
      deletedAt: null,
    },
    select: { id: true },
  });
  return trip?.id || null;
}

/**
 * Notify a driver they've been assigned a trip. Notifications target the driver
 * directly (Notification.driverId). Call after the assignment transaction commits.
 */
async function notifyDriverAssigned(
  driverId: string,
  trip: { id: string; ref_id: string | null },
) {
  try {
    await createDriverNotification(
      driverId,
      'Trip Assignment',
      `You've been assigned trip ${trip.ref_id ?? ''}. Open the app to start.`.replace('  ', ' '),
      'Trip',
      'Trip',
      trip.id,
    );
  } catch (err) {
    logger.error({ err }, 'Failed to send driver assignment notification');
  }
}

export const getTrips = async (req: Request, res: Response) => {
  try {
    const { status, driver_id, vehicle_id, customer_id, rate_card_id, search, date_filter, start_date, end_date, page = '1', per_page = '20' } = req.query;

    const pageNumber = parseInt(page as string);
    const limit = parseInt(per_page as string);
    const skip = (pageNumber - 1) * limit;

    const whereClause: Prisma.TripWhereInput = { deletedAt: null };
    if (status) {
      if (typeof status === 'string' && status.includes(',')) {
        whereClause.status = { in: status.split(',') as TripStatus[] };
      } else if (Array.isArray(status)) {
        whereClause.status = { in: status as TripStatus[] };
      } else {
        whereClause.status = status as TripStatus;
      }
    }
    if (driver_id) whereClause.driverId = driver_id as string;
    if (vehicle_id) whereClause.vehicleId = vehicle_id as string;
    if (customer_id) whereClause.customerId = customer_id as string;
    if (rate_card_id || req.query.pricing_rule_id || req.query.quotation_id) whereClause.quotationId = ((req.query.quotation_id || req.query.pricing_rule_id || rate_card_id) as string);
    const searchAnd = buildSearchAnd(search, TRIP_SEARCH_FIELDS) as Prisma.TripWhereInput[];

    let startDateObj: Date | undefined;
    let endDateObj: Date | undefined;
    const now = new Date();

    if (date_filter === 'Today') {
      startDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    } else if (date_filter === '3Days' || date_filter === 'ThreeDays') {
      startDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      endDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 23, 59, 59, 999);
    } else if (date_filter === 'Yesterday') {
      startDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      endDateObj = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
    } else if (date_filter === 'ThisWeek') {
      const day = now.getDay();
      const diffToSun = now.getDate() - day;
      startDateObj = new Date(now.getFullYear(), now.getMonth(), diffToSun, 0, 0, 0, 0);
      endDateObj = new Date(now.getFullYear(), now.getMonth(), diffToSun + 6, 23, 59, 59, 999);
    } else if (date_filter === 'ThisMonth') {
      startDateObj = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDateObj = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else {
      if (start_date) {
        startDateObj = new Date(start_date as string);
        if (typeof start_date === 'string' && start_date.length <= 10) {
          startDateObj.setHours(0, 0, 0, 0);
        }
      }
      if (end_date) {
        endDateObj = new Date(end_date as string);
        if (typeof end_date === 'string' && end_date.length <= 10) {
          endDateObj.setHours(23, 59, 59, 999);
        }
      }
    }

    if (startDateObj || endDateObj) {
      const dateConditions: Prisma.TripWhereInput[] = [];
      if (startDateObj) {
        dateConditions.push({
          OR: [
            { planned_start: { gte: startDateObj } },
            { AND: [{ planned_start: null }, { createdAt: { gte: startDateObj } }] }
          ]
        });
      }
      if (endDateObj) {
        dateConditions.push({
          OR: [
            { planned_start: { lte: endDateObj } },
            { AND: [{ planned_start: null }, { createdAt: { lte: endDateObj } }] }
          ]
        });
      }
      if (dateConditions.length > 0) {
        whereClause.AND = dateConditions;
      }
    }

    // Search conditions live in AND alongside the date window — one entry per
    // typed word, so every word has to match something on the trip.
    if (searchAnd.length > 0) {
      whereClause.AND = [
        ...(Array.isArray(whereClause.AND) ? whereClause.AND : whereClause.AND ? [whereClause.AND] : []),
        ...searchAnd,
      ];
    }

    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: [{ createdAt: 'desc' }],
        include: {
          driver: {
            select: {
              id: true,
              ref_id: true,
              first_name: true,
              last_name: true,
              deletedAt: true,
            }
          },
          vehicle: {
            select: {
              id: true,
              ref_id: true,
              plate_number: true,
              last_lat: true,
              last_lng: true,
              last_speed_kph: true,
              last_heading: true,
              last_status: true,
              last_seen_at: true,
              icces_device_id: true,
              deletedAt: true,
            }
          },
          customer: {
            select: {
              id: true,
              name: true,
            }
          },
          quotation: {
            select: {
              id: true,
              name: true,
              rate: true,
            }
          },
          thirdPartyProvider: {
            select: {
              id: true,
              name: true,
            }
          },
          stops: {
            orderBy: { stop_sequence: 'asc' },
            select: {
              id: true,
              tripId: true,
              stop_sequence: true,
              stop_type: true,
              location_lat: true,
              location_lng: true,
              location_name: true,
              location_address: true,
              locationId: true,
              planned_arrival: true,
              actual_arrival: true,
              actual_departure: true,
              delay_reason: true,
              location: {
                select: {
                  id: true,
                  name: true,
                  address: true,
                  lat: true,
                  lng: true,
                  code: true,
                }
              }
            }
          },
          charges: true,
        }
      }),
      prisma.trip.count({ where: whereClause })
    ]);

    // Map quotation to rateCard for backward compatibility with frontend, and attach resolved_location for vehicle
    let vehicleLocationsMap = new Map();
    try {
      vehicleLocationsMap = await resolveVehicleLocationsForTrips(trips, prisma);
    } catch (e) {
      logger.warn({ err: e }, 'Failed to batch resolve vehicle locations for trips');
    }

    const mappedTrips = trips.map((t) => {
      const resolvedLocation = t.vehicle ? (vehicleLocationsMap.get(t.id) || null) : null;
      return {
        ...t,
        vehicle: t.vehicle
          ? {
              ...t.vehicle,
              resolved_location: resolvedLocation,
            }
          : null,
        rateCard: (t as any).quotation
          ? {
              id: (t as any).quotation.id,
              name: (t as any).quotation.name,
              base_price: Number((t as any).quotation.rate),
            }
          : null,
      };
    });

    res.json({
      success: true,
      data: mappedTrips,
      meta: {
        page: pageNumber,
        per_page: limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to fetch trips');
    res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error?.message || 'Failed to fetch trips',
        stack: error?.stack,
        details: String(error)
      }
    });
  }
};

export const getTripById = async (req: Request, res: Response) => {
  try {
    const idOrRef = req.params.id as string;
    const whereClause: Prisma.TripWhereInput = isUuid(idOrRef)
      ? { id: idOrRef, deletedAt: null }
      : {
          OR: [
            { ref_id: idOrRef },
            { ref_id: { equals: idOrRef, mode: 'insensitive' } },
          ],
          deletedAt: null,
        };

    const trip = await prisma.trip.findFirst({
      where: whereClause,
      include: {
        financials: true,
        driver: true,
        vehicle: true,
        customer: true,
        thirdPartyProvider: true,
        assignmentEvents: {
          orderBy: { changedAt: 'desc' },
        },
        charges: true,
        stops: { orderBy: { stop_sequence: 'asc' }, include: { location: true } }
      }
    });

    if (!trip) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } });
    }

    // Map quotation to rateCard for backward compatibility with frontend
    const mappedRateCard = (trip as any).quotation ? {
      id: (trip as any).quotation.id,
      name: (trip as any).quotation.name,
      route_origin: (trip as any).quotation.stops?.[0]?.location_name || (trip as any).quotation.stops?.[0]?.location?.name || '',
      route_destination: (trip as any).quotation.stops?.[(trip as any).quotation.stops.length - 1]?.location_name || (trip as any).quotation.stops?.[(trip as any).quotation.stops.length - 1]?.location?.name || '',
      base_price: Number((trip as any).quotation.rate),
      currency: (trip as any).quotation.currency,
      vehicle_type: (trip as any).quotation.vehicle_class,
      rate_category: (trip as any).quotation.line_type,
      billing_type: (trip as any).quotation.billing_type,
      driver_payout: (trip as any).quotation.driver_payout ? Number((trip as any).quotation.driver_payout) : null
    } : null;

    let resolvedLocation = null;
    if (trip.vehicle) {
      resolvedLocation = await resolveVehicleLocation(trip.vehicle, prisma);
    }

    const chargesTotal = ((trip as any).charges || []).reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);
    const perTripBilling = Number((trip as any).financials?.applied_rate ?? trip.billing_amount ?? trip.applied_rate ?? (trip as any).quotation?.rate ?? 0);
    const totalAmount = perTripBilling + chargesTotal;
    const paidAmount = Number((trip as any).paid_amount || 0);
    const balanceDue = totalAmount - paidAmount;

    const baseDriverPayout = trip.is_third_party
      ? Number(trip.third_party_cost ?? 0)
      : Number(trip.driver_charge ?? (trip as any).quotation?.driver_payout ?? 0);
    const totalDriverPayout = baseDriverPayout;
    const balanceMargin = totalAmount - totalDriverPayout;
    const marginPercent = totalAmount > 0 ? Number(((balanceMargin / totalAmount) * 100).toFixed(1)) : 0;

    const tripData = {
      ...trip,
      paid_amount: paidAmount,
      balance_due: balanceDue,
      total_amount: totalAmount,
      charges_total: chargesTotal,
      per_trip_billing: perTripBilling,
      driver_charge: totalDriverPayout,
      balance_margin: balanceMargin,
      margin_percent: marginPercent,
      vehicle: trip.vehicle
        ? {
            ...trip.vehicle,
            resolved_location: resolvedLocation,
          }
        : null,
      rateCard: mappedRateCard,
    };

    res.json({ success: true, data: tripData });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch trip by id');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch trip' } });
  }
};

export const createTrip = async (req: Request, res: Response) => {
  try {
    const {
      customer_id,
      driver_id,
      vehicle_id,
      planned_start,
      planned_end,
      billing_amount,
      trip_charges,
      stops,
      rate_card_id,
      vehicle_type,
      rate_category,
      billing_type,
      status: requestedStatus,
      dispatch_now,
      is_third_party,
      third_party_provider_id,
      third_party_driver_name,
      third_party_driver_phone,
      third_party_vehicle_plate,
      third_party_vehicle_type,
      third_party_cost,
    } = req.body;

    const createdBy = isUuid((req as any).user?.id) ? (req as any).user.id : null;
    const parsedPlannedStart = (planned_start && !isNaN(Date.parse(planned_start)))
      ? new Date(planned_start)
      : null;
    const parsedPlannedEnd = (planned_end && !isNaN(Date.parse(planned_end)))
      ? new Date(planned_end)
      : null;

    // Validate schedule invariant: planned_start < planned_end and stop chronology
    const scheduleValidation = validateTripSchedule(parsedPlannedStart, parsedPlannedEnd, stops);
    if (!scheduleValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: scheduleValidation.error || 'Drop-off date and time must be strictly later than start date and time',
        },
      });
    }

    // Determine target status:
    // If explicitly requested as 'Dispatched' or dispatch_now is true (and both driver+vehicle present):
    //   Sets status = TripStatus.Dispatched, claims driver & vehicle to OnTrip.
    // Otherwise:
    //   Creates in TripStatus.Draft (Scheduled). Driver/vehicle assignments are recorded on the trip manifest
    //   without locking driver/vehicle to OnTrip until actively dispatched.
    const isDispatchingNow = false;
    let targetStatus = requestedStatus || TripStatus.Scheduled;

    // Past-time trips can NEVER be Scheduled:
    // If planned_start is past current time, initial status must be Delayed
    if (parsedPlannedStart) {
      const now = new Date();
      const diffMs = now.getTime() - parsedPlannedStart.getTime();
      if (diffMs >= 0) {
        if (!requestedStatus || requestedStatus === TripStatus.Scheduled || requestedStatus === TripStatus.Draft || (requestedStatus as string) === 'Scheduled') {
          targetStatus = TripStatus.Delayed;
        }
      }
    }

    const carrierName = await getCompanyLegalName();


    let trip;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      try {
        const ref_id = await generateRefId('TRP', () =>
          prisma.trip.findMany({ select: { ref_id: true } }));

        trip = await prisma.$transaction(async (tx) => {
          const customer = await tx.customer.findFirst({ where: { id: customer_id, deletedAt: null } });
          if (!customer) {
            throw new Error('CUSTOMER_NOT_FOUND');
          }

          // Driver and vehicle are optional — dispatchers can create the trip
          // now and assign either later via dispatchTrip.
          if (driver_id) {
            const driver = await tx.driver.findFirst({ where: { id: driver_id, deletedAt: null } });
            if (!driver) {
              throw new Error('DRIVER_NOT_FOUND');
            }

            // Only claim the driver to OnTrip if we are actively dispatching right now
            if (isDispatchingNow) {
              const driverClaim = await tx.driver.updateMany({
                where: { id: driver_id, status: 'Available' },
                data: { status: 'OnTrip' },
              });
              if (driverClaim.count === 0) {
                throw new Error('DRIVER_UNAVAILABLE');
              }
            }
          }

          if (vehicle_id) {
            const vehicle = await tx.vehicle.findFirst({ where: { id: vehicle_id, deletedAt: null } });
            if (!vehicle) {
              throw new Error('VEHICLE_NOT_FOUND');
            }

            // Block the trip if the vehicle has maintenance scheduled on the planned trip date
            if (parsedPlannedStart) {
              const maintenanceConflict = await tx.maintenanceRecord.findFirst({
                where: {
                  vehicleId: vehicle_id,
                  deletedAt: null,
                  status: { in: ['Scheduled', 'In_Progress', 'In Progress'] },
                  start_date: { lte: parsedPlannedStart },
                  OR: [
                    { end_date: null },
                    { end_date: { gte: parsedPlannedStart } },
                  ],
                },
                select: { start_date: true, end_date: true, workshop_name: true },
              });
              if (maintenanceConflict) {
                throw new Error('VEHICLE_ON_MAINTENANCE');
              }
            }

            // Only claim the vehicle to OnTrip if we are actively dispatching right now
            if (isDispatchingNow) {
              const vehicleClaim = await tx.vehicle.updateMany({
                where: { id: vehicle_id, status: 'Available' },
                data: { status: 'OnTrip' },
              });
              if (vehicleClaim.count === 0) {
                throw new Error('VEHICLE_UNAVAILABLE');
              }
            }
          }

          // The lane this trip runs, taken from the stops.
          const rawStops: any[] = Array.isArray(stops) ? stops : [];
          const resolvedStops = await Promise.all(
            rawStops.map(async (stop: any) => {
              const stopName = String(stop.location_name ?? '').trim();
              let locId = stop.location_id || null;
              if (locId) {
                const loc = await resolveLocation(tx, { id: locId, customerId: customer_id }, createdBy);
                if (loc) locId = loc.id;
              } else if (stopName) {
                try {
                  const loc = await resolveLocation(
                    tx,
                    {
                      customerId: customer_id,
                      name: stopName,
                      address: String(stop.location_address ?? '').trim() || null,
                      lat: parseOptionalFloat(stop.lat),
                      lng: parseOptionalFloat(stop.lng),
                    },
                    createdBy
                  );
                  if (loc) locId = loc.id;
                } catch (e) {
                  logger.warn({ err: e }, 'Failed to resolve location for trip stop');
                }
              }
              return { ...stop, location_id: locId };
            })
          );

          const originLocationId =
            resolvedStops.find((s) => s.stop_type === 'Pickup')?.location_id ?? resolvedStops[0]?.location_id ?? null;
          const destinationLocationId =
            [...resolvedStops].reverse().find((s) => s.stop_type === 'Dropoff')?.location_id ??
            resolvedStops[resolvedStops.length - 1]?.location_id ??
            null;

          const targetQuotationId = req.body.quotation_id || req.body.pricing_rule_id || rate_card_id;
          let appliedQuotation = null;
          if (targetQuotationId) {
            appliedQuotation = await tx.quotation.findFirst({
              where: { id: targetQuotationId, customerId: customer_id, deletedAt: null },
            });
            if (!appliedQuotation) {
              throw new Error('CROSS_CUSTOMER_QUOTATION_MISMATCH: Quotation belongs to a different customer.');
            }
          }

          if (!appliedQuotation) {
            const { quotation } = await findQuotationForLane(tx, {
              customerId: customer_id,
              originLocationId,
              destinationLocationId,
              ...(vehicle_type !== undefined ? { vehicleType: vehicle_type } : {}),
              ...(rate_category !== undefined ? { lineType: rate_category } : {}),
              ...(billing_type !== undefined ? { billingType: billing_type } : {}),
            });
            appliedQuotation = quotation;
          }

          const finalVehicleType = vehicle_type !== undefined ? vehicle_type : (appliedQuotation?.source_vehicle_label ?? appliedQuotation?.vehicle_class ?? null);
          const finalRateCategory = rate_category !== undefined ? rate_category : (appliedQuotation?.line_type ?? null);
          const finalBillingType = billing_type !== undefined ? billing_type : (appliedQuotation?.billing_type ?? null);

          let defaultBilling: number | null = null;
          if (billing_amount !== undefined && billing_amount !== null && !isNaN(Number(billing_amount))) {
            defaultBilling = Number(billing_amount);
          } else if (appliedQuotation) {
            const isMonthlyCard = (appliedQuotation.billing_type || '').toLowerCase().includes('monthly') || (appliedQuotation.line_type || '').toLowerCase().includes('monthly');
            defaultBilling = isMonthlyCard ? Math.round((Number(appliedQuotation.rate) / 30) * 100) / 100 : Number(appliedQuotation.rate);
          }

          const rawTripCharges = trip_charges ?? req.body.driver_payout ?? req.body.driver_charge;
          const finalTripCharges = (rawTripCharges !== undefined && rawTripCharges !== null && !isNaN(Number(rawTripCharges)))
            ? Number(rawTripCharges)
            : (appliedQuotation?.driver_payout ? Number(appliedQuotation.driver_payout) : 0);

          const updateQuotationPayout = req.body.update_quotation_driver_payout === true || req.body.update_quotation_payout === true;
          if (updateQuotationPayout && appliedQuotation) {
            const oldPayout = appliedQuotation.driver_payout != null ? Number(appliedQuotation.driver_payout) : null;
            if (oldPayout !== finalTripCharges) {
              await tx.quotation.update({
                where: { id: appliedQuotation.id },
                data: { driver_payout: finalTripCharges, updated_by: createdBy },
              });

              try {
                const userObj = createdBy ? await tx.user.findFirst({ where: { id: createdBy }, select: { name: true, username: true } }) : null;
                const userName = userObj ? (userObj.name || userObj.username) : ((req as any).user?.name || (req as any).user?.username || null);

                await tx.quotationHistory.create({
                  data: {
                    quotationId: appliedQuotation.id,
                    old_driver_payout: oldPayout,
                    new_driver_payout: finalTripCharges,
                    changed_by: userName,
                    changed_by_user_id: createdBy,
                    changed_by_name: userName,
                    reason: req.body.change_reason || 'Updated driver payout during trip creation',
                    source: 'TRIP_CREATION',
                  },
                });
              } catch (hErr) {
                logger.warn({ err: hErr }, 'Failed to record quotation history for driver payout update during trip creation');
              }
            }
          }

          return tx.trip.create({
            data: {
              ref_id,
              customerId: customer_id,
              ...(driver_id ? { driverId: driver_id } : {}),
              ...(vehicle_id ? { vehicleId: vehicle_id } : {}),
              planned_start: parsedPlannedStart,
              planned_end: parsedPlannedEnd,
              status: targetStatus,
              carrier_name: carrierName,
              ...(createdBy ? { created_by: createdBy } : {}),
              financials: {
                create: {
                  quotationId: appliedQuotation ? appliedQuotation.id : null,
                  quotation_line_type: appliedQuotation ? (appliedQuotation.line_type || null) : (finalRateCategory || null),
                  quotation_billing_type: appliedQuotation ? (appliedQuotation.billing_type || null) : (finalBillingType || null),
                  quotation_pricing_basis: appliedQuotation ? (appliedQuotation.pricing_basis || null) : null,
                  applied_rate: appliedQuotation ? (appliedQuotation.rate != null ? Number(appliedQuotation.rate) : null) : (defaultBilling != null ? defaultBilling : null),
                  quotation_vehicle_class: appliedQuotation ? (appliedQuotation.vehicle_class || null) : null,
                  quotation_source_vehicle_label: appliedQuotation ? (appliedQuotation.source_vehicle_label || null) : (finalVehicleType || null),
                },
              },
              ...(appliedQuotation ? {
                quotationId: appliedQuotation.id,
                quotation_line_type: appliedQuotation.line_type || null,
                quotation_billing_type: appliedQuotation.billing_type || null,
                quotation_pricing_basis: appliedQuotation.pricing_basis || null,
                applied_rate: appliedQuotation.rate != null ? Number(appliedQuotation.rate) : null,
                quotation_vehicle_class: appliedQuotation.vehicle_class || null,
                quotation_source_vehicle_label: appliedQuotation.source_vehicle_label || null,
              } : {
                ...(finalRateCategory ? { quotation_line_type: finalRateCategory } : {}),
                ...(finalBillingType ? { quotation_billing_type: finalBillingType } : {}),
                ...(finalVehicleType ? { quotation_source_vehicle_label: finalVehicleType } : {}),
              }),
              ...(finalVehicleType !== null ? { vehicle_type: finalVehicleType } : {}),
              ...(finalRateCategory !== null ? { rate_category: finalRateCategory } : {}),
              ...(finalBillingType !== null ? { billing_type: finalBillingType } : {}),
              ...(defaultBilling !== null ? { billing_amount: defaultBilling } : {}),
              driver_charge: finalTripCharges,
              is_third_party: is_third_party === true,
              ...(is_third_party ? {
                thirdPartyProviderId: third_party_provider_id || null,
                third_party_driver_name: third_party_driver_name || null,
                third_party_driver_phone: third_party_driver_phone || null,
                third_party_vehicle_plate: third_party_vehicle_plate || null,
                third_party_vehicle_type: third_party_vehicle_type || null,
                third_party_cost: third_party_cost ? Number(third_party_cost) : 0,
              } : {}),
              stops: {
                create: resolvedStops.map((stop: any, index: number) => {
                  const rawLat = parseOptionalFloat(stop.lat);
                  const rawLng = parseOptionalFloat(stop.lng);
                  const isValidCoord = rawLat != null && rawLng != null && (rawLat !== 0 || rawLng !== 0) && rawLat >= -90 && rawLat <= 90 && rawLng >= -180 && rawLng <= 180;
                  const latVal = isValidCoord ? rawLat : null;
                  const lngVal = isValidCoord ? rawLng : null;
                  const precisionVal = stop.coordinate_precision || stop.location_coordinate_precision || (latVal == null || lngVal == null ? 'UNKNOWN' : 'APPROXIMATE');
                  let stopPlannedArrival: Date | null = null;
                  if (stop.planned_arrival && !isNaN(Date.parse(stop.planned_arrival))) {
                    stopPlannedArrival = new Date(stop.planned_arrival);
                  } else if (index === 0 && parsedPlannedStart) {
                    stopPlannedArrival = parsedPlannedStart;
                  } else if (index === resolvedStops.length - 1 && parsedPlannedEnd) {
                    stopPlannedArrival = parsedPlannedEnd;
                  }
                  return {
                    stop_sequence: index + 1,
                    stop_type: stop.stop_type as StopType,
                    location_lat: latVal,
                    location_lng: lngVal,
                    location_coordinate_precision: precisionVal,
                    location_name: String(stop.location_name ?? '').trim() || null,
                    location_address: String(stop.location_address ?? '').trim() || null,
                    locationId: stop.location_id || null,
                    planned_arrival: stopPlannedArrival,
                  };
                }),
              }
            },
            include: {
              stops: { orderBy: { stop_sequence: 'asc' }, include: { location: true } },
              thirdPartyProvider: true,
              customer: true,
              driver: true,
              vehicle: true,
              quotation: true,
            }
          });
        });

        break;
      } catch (err: any) {
        if (err.code === 'P2002' && attempts < maxAttempts) {
          logger.warn({ err }, `Unique constraint collision on ref_id. Retrying attempt ${attempts + 1}...`);
          continue;
        }
        throw err;
      }
    }

    if (!trip) {
      throw new Error('FAILED_TO_CREATE_TRIP');
    }

    // Notify driver asynchronously only if actively dispatched now
    if (driver_id && isDispatchingNow) {
      await notifyDriverAssigned(driver_id, trip);
    }

    res.status(201).json({ success: true, data: trip });
  } catch (error: any) {
    logger.error({ err: error, body: req.body }, 'Failed to create trip');
    if (
      error.message === 'CUSTOMER_NOT_FOUND' ||
      error.message === 'DRIVER_NOT_FOUND' ||
      error.message === 'VEHICLE_NOT_FOUND' ||
      error.message === 'DRIVER_UNAVAILABLE' ||
      error.message === 'VEHICLE_UNAVAILABLE' ||
      error.message === 'VEHICLE_ON_MAINTENANCE'
    ) {
      return res.status(400).json({ success: false, error: { code: 'CONFLICT', message: error.message } });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Failed to create trip' } });
  }
};

/** One trip per CSV row, matched to existing customers/drivers/vehicles by
 *  name/plate (the sheet can't know internal ids). Rows are independent —
 *  a bad row is reported and skipped rather than failing the whole import. */
function parseFullTripStops(originStr: string, destinationStr: string) {
  const stopsList: Array<{ stop_sequence: number; stop_type: 'Pickup' | 'Dropoff'; location_name: string }> = [];
  let seq = 1;

  const originClean = originStr.trim();
  if (originClean) {
    stopsList.push({ stop_sequence: seq++, stop_type: 'Pickup', location_name: originClean });
  }

  let outboundStr = destinationStr.trim();
  let returnStr = '';

  if (destinationStr.includes('[RETURN:')) {
    const parts = destinationStr.split(/\[RETURN:\s*/i);
    outboundStr = parts[0].trim();
    returnStr = parts[1].replace(']', '').trim();
  }

  const splitChain = (str: string) => str.split(/\s*(?:→|->|-->)\s*/).map(s => s.trim()).filter(Boolean);

  const outboundItems = splitChain(outboundStr);
  outboundItems.forEach((item) => {
    stopsList.push({ stop_sequence: seq++, stop_type: 'Dropoff', location_name: item });
  });

  if (returnStr) {
    const returnItems = splitChain(returnStr);
    if (returnItems.length > 0) {
      stopsList.push({ stop_sequence: seq++, stop_type: 'Pickup', location_name: returnItems[0] });
      returnItems.slice(1).forEach((item) => {
        stopsList.push({ stop_sequence: seq++, stop_type: 'Dropoff', location_name: item });
      });
    }
  }

  return stopsList;
}

function parseDestinationAndStops(destinationStr: string): { destinationName: string; returnDestinationName: string | null } {
  if (destinationStr.includes('[RETURN:')) {
    const parts = destinationStr.split('[RETURN:');
    const destinationName = parts[0].trim();
    const returnContent = parts[1].replace(']', '').trim();
    return { destinationName, returnDestinationName: returnContent };
  }
  return { destinationName: destinationStr, returnDestinationName: null };
}

export const bulkImportTrips = async (req: Request, res: Response) => {
  try {
    const { rows } = req.body as {
      rows: Array<{
        customer_id?: string;
        customer_name?: string;
        driver_id?: string;
        driver_name?: string;
        vehicle_id?: string;
        vehicle_plate?: string;
        planned_start?: string;
        planned_end?: string;
        rate_category?: string;
        vehicle_type?: string;
        billing_type?: string;
        billing_amount?: number;
        trip_charges?: number;
        origin?: string;
        destination?: string;
        status?: TripStatus;
        is_third_party?: boolean;
        third_party_provider_id?: string;
        third_party_provider_name?: string;
        third_party_driver_name?: string;
        third_party_driver_phone?: string;
        third_party_vehicle_plate?: string;
        third_party_vehicle_type?: string;
        third_party_cost?: number;
      }>;
    };
    const createdBy = isUuid((req as any).user?.id) ? (req as any).user.id : null;

    const results: Array<{ row: number; success: boolean; ref_id?: string; created_id?: string; error?: string }> = [];
    let carrierName = 'MERCON Operations Ltd.';
    try {
      carrierName = await getCompanyLegalName();
    } catch (err) {
      carrierName = 'MERCON Operations Ltd.';
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        let customer: any = null;
        if (row.customer_id) {
          customer = await prisma.customer.findFirst({
            where: { id: row.customer_id, deletedAt: null },
          });
        } else if (row.customer_name && row.customer_name.trim()) {
          customer = await prisma.customer.findFirst({
            where: { name: { equals: row.customer_name.trim(), mode: 'insensitive' }, deletedAt: null },
          });
        }
        if (!customer) throw new Error(`Customer "${row.customer_name || row.customer_id}" not found`);

        let driverId: string | undefined;
        let vehicleId: string | undefined;
        let thirdPartyProviderId: string | undefined;

        if (row.is_third_party) {
          if (row.third_party_provider_id) {
            const provider = await prisma.thirdPartyProvider.findFirst({
              where: { id: row.third_party_provider_id, deletedAt: null },
            });
            if (provider) thirdPartyProviderId = provider.id;
          } else if (row.third_party_provider_name && row.third_party_provider_name.trim()) {
            const provider = await prisma.thirdPartyProvider.findFirst({
              where: { name: { equals: row.third_party_provider_name.trim(), mode: 'insensitive' }, deletedAt: null },
            });
            if (provider) thirdPartyProviderId = provider.id;
          }
        } else {
          if (row.driver_id) {
            const driver = await prisma.driver.findFirst({
              where: { id: row.driver_id, deletedAt: null },
            });
            if (!driver) throw new Error('Driver not found');
            driverId = driver.id;
          } else if (row.driver_name && row.driver_name.trim()) {
            const driver = await findDriverByFullName(row.driver_name);
            if (driver) {
              driverId = driver.id;
            }
          }

          if (row.vehicle_id) {
            const vehicle = await prisma.vehicle.findFirst({
              where: { id: row.vehicle_id, deletedAt: null },
            });
            if (!vehicle) throw new Error('Vehicle not found');
            vehicleId = vehicle.id;
          } else if (row.vehicle_plate && row.vehicle_plate.trim()) {
            const rawPlate = row.vehicle_plate.trim();
            const cleanPlate = rawPlate.replace(/[\s-]/g, '').toLowerCase();

            const vehicles = await prisma.vehicle.findMany({
              where: { deletedAt: null },
              select: { id: true, plate_number: true },
            });

            const matchedVehicle = vehicles.find((v) => {
              const vClean = (v.plate_number || '').replace(/[\s-]/g, '').toLowerCase();
              return vClean === cleanPlate || (v.plate_number || '').toLowerCase() === rawPlate.toLowerCase();
            });

            if (!matchedVehicle) throw new Error(`Vehicle "${row.vehicle_plate}" not found`);
            vehicleId = matchedVehicle.id;

            // CROSS-VERIFY WITH VEHICLE PLATE IF DRIVER IS UNRESOLVED OR UNMATCHED BY NAME
            if (!driverId) {
              const assignedDriver = await prisma.driver.findFirst({
                where: { assignedVehicleId: matchedVehicle.id, deletedAt: null },
              });
              if (assignedDriver) {
                driverId = assignedDriver.id;
              }
            }
          }

          if (!driverId && row.driver_name && row.driver_name.trim()) {
            // Log notice if driver remains unassigned after name & plate lookup
          }
        }

        const parsedPlannedStart = (row.planned_start && !isNaN(Date.parse(row.planned_start)))
          ? new Date(row.planned_start)
          : null;

        const parsedPlannedEnd = (row.planned_end && !isNaN(Date.parse(row.planned_end)))
          ? new Date(row.planned_end)
          : null;

        const scheduleCheck = validateTripSchedule(parsedPlannedStart, parsedPlannedEnd);
        if (!scheduleCheck.isValid) {
          throw new Error(scheduleCheck.error || 'Drop-off date and time must be strictly later than start date and time');
        }

        const isDispatched = row.is_third_party
          ? Boolean(thirdPartyProviderId || row.third_party_vehicle_plate)
          : Boolean(driverId && vehicleId);
        let targetStatus = row.status || TripStatus.Scheduled;

        // Past-time trips can NEVER be Scheduled:
        // If planned_start is past current time, initial status must be Delayed
        if (parsedPlannedStart) {
          const now = new Date();
          const diffMs = now.getTime() - parsedPlannedStart.getTime();
          if (diffMs >= 0) {
            if (!row.status || row.status === TripStatus.Scheduled || row.status === TripStatus.Draft || (row.status as string) === 'Scheduled') {
              targetStatus = TripStatus.Delayed;
            }
          }
        }


        const ref_id = await generateRefId('TRP', () =>
          prisma.trip.findMany({ select: { ref_id: true } }));

        const parsedDest = parseDestinationAndStops(row.destination || '');
        const originCoords = row.origin ? await resolveStopCoords(row.origin, customer.id) : null;
        const destinationCoords = parsedDest.destinationName ? await resolveStopCoords(parsedDest.destinationName, customer.id) : null;
        const returnDestinationCoords = parsedDest.returnDestinationName ? await resolveStopCoords(parsedDest.returnDestinationName, customer.id) : null;
        
        const thirdPartyCostVal = row.third_party_cost !== undefined && row.third_party_cost !== null && !isNaN(Number(row.third_party_cost))
          ? Number(row.third_party_cost)
          : undefined;

        const parsedStops = (row.origin || row.destination)
          ? parseFullTripStops(row.origin || '', row.destination || '')
          : [];

        const resolvedImportStops = await Promise.all(
          parsedStops.map(async (st, idx, arr) => {
            const coords = await resolveStopCoords(st.location_name, customer.id);
            let latVal = coords?.lat ?? null;
            let lngVal = coords?.lng ?? null;
            // Enforce invariant: (0, 0) is never legitimate; unknown coordinates are strictly NULL
            if (latVal === 0 && lngVal === 0) {
              latVal = null;
              lngVal = null;
            }
            return {
              stop_sequence: st.stop_sequence,
              stop_type: st.stop_type as any,
              location_name: st.location_name,
              location_address: coords?.address ?? null,
              locationId: coords?.locationId ?? null,
              location_lat: latVal,
              location_lng: lngVal,
              planned_arrival: idx === 0 ? parsedPlannedStart : (idx === arr.length - 1 ? parsedPlannedEnd : null),
            };
          })
        );

        const trip = await prisma.$transaction(async (tx) => {
          return tx.trip.create({
            data: {
              ref_id,
              customerId: customer.id,
              ...(driverId ? { driverId } : {}),
              ...(vehicleId ? { vehicleId } : {}),
              is_third_party: Boolean(row.is_third_party),
              ...(row.is_third_party ? {
                thirdPartyProviderId: thirdPartyProviderId || null,
                third_party_driver_name: row.third_party_driver_name?.trim() || null,
                third_party_driver_phone: row.third_party_driver_phone?.trim() || null,
                third_party_vehicle_plate: row.third_party_vehicle_plate?.trim() || null,
                third_party_vehicle_type: row.third_party_vehicle_type || row.vehicle_type || null,
                third_party_cost: thirdPartyCostVal || 0,
              } : {}),
              planned_start: parsedPlannedStart,
              planned_end: parsedPlannedEnd,
              status: targetStatus,
              ...(row.rate_category ? { rate_category: row.rate_category, quotation_line_type: row.rate_category } : {}),
              ...(row.vehicle_type ? { vehicle_type: row.vehicle_type, quotation_source_vehicle_label: row.vehicle_type } : {}),
              ...(row.billing_type ? { billing_type: row.billing_type, quotation_billing_type: row.billing_type } : {}),
              ...(row.billing_amount !== undefined && row.billing_amount !== null && !isNaN(Number(row.billing_amount))
                ? { billing_amount: Number(row.billing_amount) }
                : {}),
              ...(((row as any).driver_charge !== undefined || (row as any).trip_charges !== undefined) && !isNaN(Number((row as any).driver_charge ?? (row as any).trip_charges))
                ? { driver_charge: Number((row as any).driver_charge ?? (row as any).trip_charges) }
                : (thirdPartyCostVal !== undefined ? { driver_charge: thirdPartyCostVal } : {})),
              ...(createdBy ? { created_by: createdBy } : {}),
              carrier_name: carrierName,
              ...(resolvedImportStops.length > 0 ? {
                stops: {
                  create: resolvedImportStops,
                }
              } : {})
            },
          });
        });

        if (driverId && targetStatus === TripStatus.Scheduled) {
          try {
            await notifyDriverAssigned(driverId, trip);
          } catch (e) {
            // Notification failure shouldn't abort trip creation
          }
        }

        results.push({ row: i + 1, success: true, ref_id: trip.ref_id ?? undefined, created_id: trip.id });
      } catch (err: any) {
        results.push({ row: i + 1, success: false, error: err.message || 'Failed to import row' });
      }
    }

    const imported = results.filter(r => r.success).length;
    res.status(200).json({
      success: true,
      data: { results, imported, failed: results.length - imported },
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to bulk import trips');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to import trips' } });
  }
};

export const updateTripStatus = async (req: Request, res: Response) => {
  try {
    let status = req.body.status;
    if (status === 'AtPickup') status = TripStatus.Loading;
    if (status === 'Dispatched') status = TripStatus.Scheduled;
    if (status === 'AtDelivery') status = TripStatus.InTransit;

    const rawId = req.params.id as string;
    const tripId = isUuid(rawId) ? rawId : (await resolveTripId(rawId));
    if (!tripId) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } });
    }

    if (!Object.values(TripStatus).includes(status)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid status' } });
    }

    let delay: DelayDetection | null = null;
    let shouldNotifyDriver = false;
    let driverToNotify: string | null = null;

    const trip = await prisma.$transaction(async (tx) => {
      const current = await tx.trip.findUnique({ where: { id: tripId } });
      if (!current) throw new Error('NOT_FOUND');
      if (!isValidTransition(current.status, status)) throw new Error('INVALID_TRANSITION');

      // Moving to active operational status (Scheduled, Loading, InTransit, Delayed):
      // Update driver & vehicle status to OnTrip without failing if already assigned
      if (status === TripStatus.Scheduled || status === TripStatus.Loading || status === TripStatus.InTransit || status === TripStatus.Delayed) {
        if (current.driverId) {
          await tx.driver.update({
            where: { id: current.driverId },
            data: { status: DriverStatus.OnTrip },
          });
          shouldNotifyDriver = true;
          driverToNotify = current.driverId;
        }
        if (current.vehicleId) {
          await tx.vehicle.update({
            where: { id: current.vehicleId },
            data: { status: AssetStatus.OnTrip },
          });
        }
      }

      // Reverting back to Draft: release driver and vehicle back to Available
      if (status === TripStatus.Draft && current.status !== TripStatus.Draft) {
        if (current.driverId) {
          await tx.driver.update({ where: { id: current.driverId }, data: { status: DriverStatus.Available } });
        }
        if (current.vehicleId) {
          await tx.vehicle.update({ where: { id: current.vehicleId }, data: { status: AssetStatus.Available } });
        }
      }

      // Completing a trip always goes through the shared helper so every
      // path that can complete a trip also generates its invoice.
      if (status === TripStatus.Completed) {
        return completeTripAndInvoice(tx, tripId, (req as any).user?.id);
      }

      const updateData: any = { status: status as TripStatus, updated_by: (req as any).user?.id };
      if (status === 'InTransit') updateData.actual_start = new Date();

      const updated = await tx.trip.update({ where: { id: tripId }, data: updateData });

      delay = await stampStopTransition(tx, tripId, status as TripStatus);

      // Leaving the trip permanently via Cancelled must release the
      // driver/vehicle back to Available — otherwise they stay stuck on
      // "OnTrip" with no trip left to free them.
      if (status === TripStatus.Cancelled) {
        if (updated.driverId) {
          await tx.driver.update({ where: { id: updated.driverId }, data: { status: DriverStatus.Available } });
        }
        if (updated.vehicleId) {
          await tx.vehicle.update({ where: { id: updated.vehicleId }, data: { status: AssetStatus.Available } });
        }
      }

      return updated;
    });

    // Notify driver if trip was dispatched
    if (shouldNotifyDriver && driverToNotify) {
      await notifyDriverAssigned(driverToNotify, trip);
    }

    // Alerted only once the transaction has committed, so operators are never
    // told about a delay on a trip update that then rolled back.
    if (delay) await notifyOperatorsOfDelay(delay);

    res.json({ success: true, data: trip });
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } });
    }
    if (error.message === 'INVALID_TRANSITION') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TRANSITION', message: 'That status change is not allowed from the trip\'s current state' } });
    }
    if (error.message === 'MISSING_ASSIGNMENT') {
      return res.status(400).json({ success: false, error: { code: 'MISSING_ASSIGNMENT', message: 'Assign a driver and vehicle before dispatching this trip' } });
    }
    if (error.message === 'DRIVER_UNAVAILABLE' || error.message === 'VEHICLE_UNAVAILABLE') {
      return res.status(400).json({ success: false, error: { code: 'CONFLICT', message: error.message } });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update trip status' } });
  }
};


// ==========================================
// PHASE 1: DISPATCH & ASSIGNMENT
// ==========================================

export const dispatchTrip = async (req: Request, res: Response) => {
  try {
    const { driver_id, vehicle_id } = req.body;
    const rawId = req.params.id as string;
    const tripId = isUuid(rawId) ? rawId : (await resolveTripId(rawId));
    if (!tripId) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } });
    }

    if (!driver_id && !vehicle_id) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'driver_id or vehicle_id required' } });
    }

    // Run in a transaction to ensure atomic state updates. driver_id/vehicle_id
    // are independently optional — a trip created with "assign later" can have
    // just one filled in here, and the other assigned in a later call.
    const result = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findFirst({ where: { id: tripId, deletedAt: null } });
      if (!trip) {
        throw new Error('NOT_FOUND');
      }

      // Atomically claim the driver/vehicle — see createTrip for why this
      // must be a conditional UPDATE rather than SELECT-then-UPDATE.
      if (driver_id && driver_id !== trip.driverId) {
        const driverClaim = await tx.driver.updateMany({
          where: { id: driver_id, status: 'Available' },
          data: { status: 'OnTrip' },
        });
        if (driverClaim.count === 0) {
          throw new Error('DRIVER_UNAVAILABLE');
        }
        if (trip.driverId) {
          await tx.driver.update({
            where: { id: trip.driverId },
            data: { status: 'Available' },
          });
        }
      }

      if (vehicle_id && vehicle_id !== trip.vehicleId) {
        const vehicleClaim = await tx.vehicle.updateMany({
          where: { id: vehicle_id, status: 'Available' },
          data: { status: 'OnTrip' },
        });
        if (vehicleClaim.count === 0) {
          throw new Error('VEHICLE_UNAVAILABLE');
        }
        if (trip.vehicleId) {
          await tx.vehicle.update({
            where: { id: trip.vehicleId },
            data: { status: 'Available' },
          });
        }
      }

      const finalDriverId = driver_id || trip.driverId;
      const finalVehicleId = vehicle_id || trip.vehicleId;

      const updatedTrip = await tx.trip.update({
        where: { id: tripId },
        data: {
          ...(driver_id ? { driverId: driver_id } : {}),
          ...(vehicle_id ? { vehicleId: vehicle_id } : {}),
          // Only moves out of Draft once both a driver and a vehicle are on
          // the trip — a single-sided assignment leaves it in Draft.
          ...(finalDriverId && finalVehicleId ? { status: 'Scheduled' as const } : {}),
          updated_by: (req as any).user?.id
        }
      });

      return updatedTrip;
    });

    // Notify the driver after the dispatch commits.
    if (driver_id) await notifyDriverAssigned(driver_id, result);

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } });
    }
    if (error.message === 'DRIVER_UNAVAILABLE' || error.message === 'VEHICLE_UNAVAILABLE') {
      return res.status(400).json({ success: false, error: { code: 'CONFLICT', message: error.message } });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to dispatch trip' } });
  }
};

export const replaceDriver = async (req: Request, res: Response) => {
  try {
    const { new_driver_id, reason } = req.body;
    const rawId = req.params.id as string;
    const tripId = isUuid(rawId) ? rawId : (await resolveTripId(rawId));
    if (!tripId) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } });
    }

    if (!new_driver_id) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'new_driver_id required' } });
    }

    const result = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({ where: { id: tripId } });
      if (!trip || !trip.driverId) throw new Error('TRIP_OR_DRIVER_NOT_FOUND');

      const oldDriverId = trip.driverId;

      // Atomically claim the new driver if trip status is active
      if (trip.status === 'InTransit' || trip.status === 'Loading' || trip.status === 'Delayed') {
        const claim = await tx.driver.updateMany({
          where: { id: new_driver_id, status: 'Available' },
          data: { status: 'OnTrip' },
        });
        if (claim.count === 0) throw new Error('NEW_DRIVER_UNAVAILABLE');

        // Free old driver
        await tx.driver.update({ where: { id: oldDriverId }, data: { status: 'Available' } });
      }

      const now = new Date();

      // 3. Log TripAssignmentEvent audit record
      const changeReason = reason || 'Driver replaced by dispatcher';
      await tx.tripAssignmentEvent.create({
        data: {
          tripId,
          entityType: AssignmentEntityType.DRIVER,
          fromId: oldDriverId,
          toId: new_driver_id,
          reason: changeReason,
          changedBy: (req as any).user?.id || null,
          changedAt: now,
        },
      });

      // 4. Update Trip summary fields & legacy driverId pointer
      const updatedTrip = await tx.trip.update({
        where: { id: tripId },
        data: {
          driverId: new_driver_id,
          is_contingency_dispatch: true,
          original_driver_id: trip.original_driver_id || oldDriverId,
          contingency_reason: changeReason,
          updated_by: (req as any).user?.id,
        },
        include: {
          tripDrivers: { include: { driver: true } },
          assignmentEvents: true,
        },
      });

      return updatedTrip;
    });

    // Notify the newly-assigned driver after the swap commits.
    await notifyDriverAssigned(new_driver_id, result);

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (['TRIP_OR_DRIVER_NOT_FOUND', 'NEW_DRIVER_UNAVAILABLE'].includes(error.message)) {
      return res.status(400).json({ success: false, error: { code: 'CONFLICT', message: error.message } });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to replace driver' } });
  }
};

// ==========================================
// PHASE 2: DRIVER WORKFLOW
// ==========================================

export const pickupArrive = async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id as string;
    const tripId = isUuid(rawId) ? rawId : (await resolveTripId(rawId));
    if (!tripId) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } });

    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } });
    if (!isValidTransition(trip.status, TripStatus.Loading)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TRANSITION', message: 'That status change is not allowed from the trip\'s current state' } });
    }

    // Stop clock and trip status move together: a committed arrival time on a
    // trip that never reached Loading (or the reverse) is exactly the kind of
    // split the delay report cannot interpret afterwards.
    let delay: DelayDetection | null = null;
    const updatedTrip = await prisma.$transaction(async (tx) => {
      const updated = await tx.trip.update({
        where: { id: tripId },
        data: { status: 'Loading', updated_by: (req as any).user?.id }
      });
      delay = await stampStopTransition(tx, tripId, TripStatus.Loading);
      return updated;
    });

    if (delay) await notifyOperatorsOfDelay(delay);

    res.json({ success: true, data: updatedTrip });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to record pickup arrival' } });
  }
};

export const pickupVerify = async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id as string;
    const tripId = isUuid(rawId) ? rawId : (await resolveTripId(rawId));
    if (!tripId) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } });

    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } });
    if (!isValidTransition(trip.status, TripStatus.InTransit)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TRANSITION', message: 'That status change is not allowed from the trip\'s current state' } });
    }

    const updatedTrip = await prisma.$transaction(async (tx) => {
      const updated = await tx.trip.update({
        where: { id: tripId },
        data: {
          status: 'InTransit',
          actual_start: new Date(),
          updated_by: (req as any).user?.id
        }
      });
      // Leaving pickup closes the loading window that started at AtPickup.
      await stampStopTransition(tx, tripId, TripStatus.InTransit);
      return updated;
    });

    res.json({ success: true, data: updatedTrip });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to verify pickup' } });
  }
};

export const deliveryVerify = async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id as string;
    const tripId = isUuid(rawId) ? rawId : (await resolveTripId(rawId));
    if (!tripId) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } });

    const result = await prisma.$transaction(async (tx) => {
      const current = await tx.trip.findUnique({ where: { id: tripId } });
      if (!current) throw new Error('NOT_FOUND');
      if (!isValidTransition(current.status, TripStatus.Completed)) throw new Error('INVALID_TRANSITION');

      return completeTripAndInvoice(tx, tripId, (req as any).user?.id);
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } });
    }
    if (error.message === 'INVALID_TRANSITION') {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TRANSITION', message: 'That status change is not allowed from the trip\'s current state' } });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to verify delivery' } });
  }
};

/**
 * Record why a stop was reached late. Operator-only by design: drivers already
 * report the cause in the WhatsApp group, and the office is better placed to
 * classify it than a driver working a phone in a cab.
 *
 * Re-logging is allowed — a first guess ("Traffic") often turns out to be
 * something else once the driver is actually reached, and a wrong reason left
 * frozen in place would quietly skew the report it feeds.
 */
export const logStopDelay = async (req: Request, res: Response) => {
  try {
    const { id: rawTripId, stopId } = req.params as { id: string; stopId: string };
    const tripId = isUuid(rawTripId) ? rawTripId : (await resolveTripId(rawTripId));
    if (!tripId) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } });
    }
    const { delay_reason, delay_note } = req.body;

    const stop = await prisma.tripStop.findFirst({
      where: { id: stopId, tripId, deletedAt: null },
    });
    if (!stop) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Stop not found on this trip' } });
    }
    // Nothing to explain about a stop the driver has not reached yet, and
    // allowing it would put reasons on trips that are still running fine.
    if (!stop.actual_arrival) {
      return res.status(400).json({ success: false, error: { code: 'NOT_ARRIVED', message: 'This stop has no recorded arrival yet' } });
    }

    const updated = await prisma.tripStop.update({
      where: { id: stopId },
      data: {
        delay_reason,
        delay_note: String(delay_note ?? '').trim() || null,
        delay_logged_by: (req as any).user?.id ?? null,
        delay_logged_at: new Date(),
      },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error({ err: error }, 'Failed to log stop delay reason');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to log delay reason' } });
  }
};


/**
 * Correct where a stop actually is — its label, its full address, the lane
 * endpoint it belongs to, and its coordinates.
 *
 * This did not exist: once a trip was created, a wrong address was wrong
 * forever, and the driver kept being sent to it. Correcting it mid-trip is the
 * whole point, so in-flight trips are editable.
 *
 * Timestamps are never touched. Moving a pin does not un-arrive a driver, and
 * the delay report reads arrival/departure, which stay exactly as recorded.
 */
export const updateTripStop = async (req: Request, res: Response) => {
  try {
    const { id: rawTripId, stopId } = req.params as { id: string; stopId: string };
    const tripId = isUuid(rawTripId) ? rawTripId : (await resolveTripId(rawTripId));
    if (!tripId) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } });
    }
    const { location_name, location_address, location_id, lat, lng } = req.body;

    const trip = await prisma.trip.findFirst({
      where: { id: tripId, deletedAt: null },
      select: { id: true, status: true },
    });
    if (!trip) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } });
    }

    // A finished trip is a record of what happened. Rewriting the address after
    // the fact would change where the delivery is reported to have gone, and
    // its invoice is already priced off that lane.
    const FROZEN: TripStatus[] = [TripStatus.Completed, TripStatus.Invoiced, TripStatus.Cancelled];
    if (FROZEN.includes(trip.status)) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'TRIP_CLOSED',
          message: `This trip is ${trip.status.toLowerCase()} — its stops can no longer be changed.`,
        },
      });
    }

    const stop = await prisma.tripStop.findFirst({
      where: { id: stopId, tripId, deletedAt: null },
    });
    if (!stop) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Stop not found on this trip' } });
    }

    if (location_id) {
      const location = await prisma.location.findFirst({ where: { id: location_id, deletedAt: null } });
      if (!location) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'That location no longer exists' } });
      }
    }

    let latVal: number | null | undefined = undefined;
    let lngVal: number | null | undefined = undefined;
    if (lat !== undefined) {
      latVal = lat != null && !isNaN(Number(lat)) ? Number(lat) : null;
    }
    if (lng !== undefined) {
      lngVal = lng != null && !isNaN(Number(lng)) ? Number(lng) : null;
    }
    if (latVal === 0 && lngVal === 0) {
      latVal = null;
      lngVal = null;
    }

    const updated = await prisma.tripStop.update({
      where: { id: stopId },
      data: {
        ...(location_name !== undefined ? { location_name: String(location_name).trim() || null } : {}),
        ...(location_address !== undefined ? { location_address: String(location_address).trim() || null } : {}),
        ...(location_id !== undefined ? { locationId: location_id || null } : {}),
        ...(latVal !== undefined ? { location_lat: latVal } : {}),
        ...(lngVal !== undefined ? { location_lng: lngVal } : {}),
        updated_by: (req as any).user?.id ?? null,
      },
      include: { location: { select: { id: true, name: true, address: true, code: true } } },
    });

    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error({ err: error }, 'Failed to update trip stop');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update this stop' } });
  }
};


/** Trip statuses where the assigned driver/vehicle are actively held as `OnTrip`. */
const IN_FLIGHT_STATUSES: TripStatus[] = [
  TripStatus.Scheduled, TripStatus.Loading, TripStatus.InTransit, TripStatus.Delayed,
];

export const bulkDeleteTrips = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No IDs provided' } });
    }

    await prisma.$transaction(async (tx) => {
      // Deleting an in-flight trip must release its driver/vehicle back to Available
      const trips = await tx.trip.findMany({
        where: { id: { in: ids }, status: { in: IN_FLIGHT_STATUSES } },
        select: { driverId: true, vehicleId: true },
      });

      // Clear child dependencies before deleting trips
      await tx.tripStop.deleteMany({ where: { tripId: { in: ids } } });
      await tx.tripLocation.deleteMany({ where: { tripId: { in: ids } } });
      await tx.tripCharge.deleteMany({ where: { tripId: { in: ids } } });
      await tx.tripAssignmentEvent.deleteMany({ where: { tripId: { in: ids } } });

      await tx.trip.deleteMany({
        where: { id: { in: ids } }
      });

      const driverIds = [...new Set(trips.map((t) => t.driverId).filter((id): id is string => !!id))];
      const vehicleIds = [...new Set(trips.map((t) => t.vehicleId).filter((id): id is string => !!id))];

      if (driverIds.length) {
        await tx.driver.updateMany({ where: { id: { in: driverIds } }, data: { status: DriverStatus.Available } });
      }
      if (vehicleIds.length) {
        await tx.vehicle.updateMany({ where: { id: { in: vehicleIds } }, data: { status: AssetStatus.Available } });
      }
    });

    res.json({ success: true, data: { message: `Successfully permanently deleted ${ids.length} trips` } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: `Failed to bulk delete trips` } });
  }
};

export const bulkUpdateTripStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { ids, status } = req.body;

    if (!Array.isArray(ids) || ids.length === 0 || !status) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'IDs and status are required' } });
    }
    if (!Object.values(TripStatus).includes(status)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid status' } });
    }

    const { updated, skipped } = await prisma.$transaction(async (tx) => {
      const trips = await tx.trip.findMany({
        where: { id: { in: ids }, deletedAt: null },
        select: { id: true, status: true, driverId: true, vehicleId: true },
      });

      const validIds = trips.filter((t) => isValidTransition(t.status, status)).map((t) => t.id);
      const skippedCount = trips.length - validIds.length;

      if (validIds.length === 0) return { updated: 0, skipped: skippedCount };

      // Completing a trip always goes through the shared helper so bulk
      // completion also generates invoices, same as the single-trip path.
      if (status === TripStatus.Completed) {
        for (const id of validIds) {
          await completeTripAndInvoice(tx, id, userId);
        }
        return { updated: validIds.length, skipped: skippedCount };
      }

      await tx.trip.updateMany({
        where: { id: { in: validIds } },
        data: { status: status as TripStatus, updated_by: userId },
      });

      // Same release rule as the single-trip update: Cancelled frees the
      // driver/vehicle back to Available.
      if (status === TripStatus.Cancelled) {
        const affected = trips.filter((t) => validIds.includes(t.id));
        const driverIds = [...new Set(affected.map((t) => t.driverId).filter((id): id is string => !!id))];
        const vehicleIds = [...new Set(affected.map((t) => t.vehicleId).filter((id): id is string => !!id))];
        if (driverIds.length) {
          await tx.driver.updateMany({ where: { id: { in: driverIds } }, data: { status: DriverStatus.Available } });
        }
        if (vehicleIds.length) {
          await tx.vehicle.updateMany({ where: { id: { in: vehicleIds } }, data: { status: AssetStatus.Available } });
        }
      }

      return { updated: validIds.length, skipped: skippedCount };
    });

    res.json({
      success: true,
      data: {
        message: skipped > 0
          ? `Updated ${updated} trip(s); skipped ${skipped} with an invalid status transition`
          : `Successfully updated ${updated} trips`,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: `Failed to bulk update trips` } });
  }
};

/**
 * Get all completed trips pending post-trip financial settlement / waiting-labor check
 */
export const getUnsettledCompletedTrips = async (req: Request, res: Response) => {
  try {
    const trips = await prisma.trip.findMany({
      where: {
        deletedAt: null,
        status: { in: [TripStatus.Completed, TripStatus.Invoiced] },
        is_post_trip_settled: false,
      },
      include: {
        customer: true,
        driver: true,
        vehicle: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: trips,
      count: trips.length,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch unsettled completed trips');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch unsettled trips' } });
  }
};

/**
 * Update post-trip financial fields (itemised charges, Trip Charges, Carrier)
 * and automatically update linked Invoice total.
 *
 * `charges`, when sent, REPLACES the trip's entire itemised charge list —
 * the settlement UI always submits the full set it's showing, not a diff, so
 * delete-then-recreate is simpler and safer than trying to reconcile which
 * lines changed. Omitting `charges` entirely leaves the existing lines alone
 * (e.g. a request that only updates carrier_name).
 */
export const updateTripFinancials = async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id as string;
    const tripId = isUuid(rawId) ? rawId : (await resolveTripId(rawId));
    if (!tripId) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } });
    }
    const {
      charges,
      trip_charges,
      billing_amount,
      carrier_name,
      is_post_trip_settled = true,
    } = req.body;

    if (charges !== undefined && !Array.isArray(charges)) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: '"charges" must be an array' } });
    }

    const result = await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({
        where: { id: tripId, deletedAt: null },
      });

      if (!trip) throw new Error('NOT_FOUND');

      // Auto-fill the driver payout only when the caller didn't send one:
      // MERCON's own driver pulls the lane's agreed payout off the rate card;
      // a third-party job pulls the subcontractor cost already on the trip.
      // Either way it stays a suggestion, not a lock — an explicit value in
      // the request always wins, and the settlement form can still override
      // it before submitting.
      // trip.trip_charges / third_party_cost / quotation.driver_payout are all
      // Decimal at runtime — normalised to number here so this stays a plain
      // number through every branch below (Prisma accepts a number for a
      // Decimal field write, so nothing is lost storing it back as one).
      let nextTripCharges = Number(trip.driver_charge);
      const inputCharges = req.body.driver_charge !== undefined ? req.body.driver_charge : trip_charges;
      if (inputCharges !== undefined) {
        nextTripCharges = parseOptionalFloat(inputCharges) ?? 0;
      } else if (trip.is_third_party) {
        if (trip.third_party_cost !== null && trip.third_party_cost !== undefined) {
          nextTripCharges = Number(trip.third_party_cost);
        }
      }

      if (charges !== undefined) {
        await tx.tripCharge.deleteMany({ where: { tripId: trip.id } });
        if (charges.length > 0) {
          for (const c of charges) {
            const quantity = parseOptionalFloat(c.quantity) ?? 1;
            const rate = parseOptionalFloat(c.rate) ?? 0;
            const chargeType = String(c.charge_type || '').trim() || 'Charge';
            const unitVal = c.unit ? String(c.unit).trim() || null : null;
            let ruleId = getValidUuid(c.surchargeRuleId) || null;

            if (!ruleId && c.save_as_rule && trip.customerId) {
              const existingRule = await tx.surchargeRule.findFirst({
                where: {
                  customerId: trip.customerId,
                  charge_type: chargeType,
                  rate,
                  unit: unitVal,
                  deletedAt: null,
                },
              });
              if (existingRule) {
                ruleId = existingRule.id;
              } else {
                const createdRule = await tx.surchargeRule.create({
                  data: {
                    customerId: trip.customerId,
                    quotationId: trip.quotationId || null,
                    charge_type: chargeType,
                    unit: unitVal,
                    rate,
                    currency: 'SAR',
                    is_active: true,
                    created_by: (req as any).user?.id,
                  },
                });
                ruleId = createdRule.id;
              }
            }

            await tx.tripCharge.create({
              data: {
                tripId: trip.id,
                surchargeRuleId: ruleId,
                charge_type: chargeType,
                unit: unitVal,
                rate,
                quantity,
                amount: parseOptionalFloat(c.amount) ?? quantity * rate,
                created_by: (req as any).user?.id,
              },
            });
          }
        }
      }

      const updatedTrip = await tx.trip.update({
        where: { id: tripId },
        data: {
          driver_charge: nextTripCharges,
          billing_amount: billing_amount !== undefined ? (parseOptionalFloat(billing_amount) ?? 0) : trip.billing_amount,
          carrier_name: carrier_name !== undefined ? carrier_name : trip.carrier_name,
          is_post_trip_settled: Boolean(is_post_trip_settled),
          updated_by: (req as any).user?.id,
        },
        include: { customer: true, driver: true, vehicle: true, charges: true },
      });

      return updatedTrip;
    });

    res.json({ success: true, data: result });
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trip not found' } });
    }
    logger.error({ err: error }, 'Failed to update trip financials');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update trip financials' } });
  }
};


/* ─── Monthly board ───────────────────────────────────────────────────────
 *
 * A month of work seen the way it is actually sold: "this company gets N trips
 * this month", with a driver and a truck assigned per day. The trip ledger
 * answers "what is running right now" — it is paginated, sorted by status and
 * flat, so it cannot answer "who is covering ARKAN on the 14th" without the
 * operator scrolling and mentally regrouping. This returns the whole month in
 * one response, already grouped customer → day, so the page never pages.
 *
 * A trip's day is its planned_start, falling back to createdAt when the trip
 * was created without one — the same rule getTrips' date filter uses, so the
 * ledger and this board can never disagree about which month a trip is in.
 */

/** A month of trips is bounded work; this only guards against a runaway query. */
const MONTHLY_BOARD_TRIP_CAP = 5000;

/** Local YYYY-MM-DD — never toISOString(), which shifts the date across UTC. */
const toDayKey = (d: Date | string | null | undefined): string => {
  if (!d) return '1970-01-01';
  const dateObj = d instanceof Date ? d : new Date(d);
  if (isNaN(dateObj.getTime())) return '1970-01-01';
  return `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
};

/**
 * The month the board is showing. Accepts `YYYY-MM`; anything else (including
 * a missing param) falls back to the current month rather than erroring, since
 * the page opens with no month chosen.
 */
function resolveMonth(raw: unknown): { month: string; start: Date; end: Date } {
  const now = new Date();
  let year = now.getFullYear();
  let monthIndex = now.getMonth();

  if (typeof raw === 'string') {
    const match = /^(\d{4})-(\d{2})$/.exec(raw.trim());
    if (match) {
      const parsedYear = Number(match[1]);
      const parsedMonth = Number(match[2]);
      if (parsedYear >= 2000 && parsedYear <= 2100 && parsedMonth >= 1 && parsedMonth <= 12) {
        year = parsedYear;
        monthIndex = parsedMonth - 1;
      }
    }
  }

  return {
    month: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
    start: new Date(year, monthIndex, 1, 0, 0, 0, 0),
    end: new Date(year, monthIndex + 1, 0, 23, 59, 59, 999),
  };
}

export const getMonthlyTripBoard = async (req: Request, res: Response) => {
  try {
    const {
      month: monthParam,
      customer_id,
      driver_id,
      vehicle_id,
      status,
      rate_category,
      vehicle_type,
      billing_type,
      search,
    } = req.query;

    const { month, start, end } = resolveMonth(monthParam);

    const whereClause: Prisma.TripWhereInput = {
      deletedAt: null,
      AND: [
        {
          OR: [
            { planned_start: { gte: start, lte: end } },
            { AND: [{ planned_start: null }, { createdAt: { gte: start, lte: end } }] },
          ],
        },
        ...(buildSearchAnd(search, TRIP_SEARCH_FIELDS) as Prisma.TripWhereInput[]),
      ],
    };

    if (customer_id && isUuid(customer_id)) whereClause.customerId = customer_id as string;
    if (driver_id && isUuid(driver_id)) whereClause.driverId = driver_id as string;
    if (vehicle_id && isUuid(vehicle_id)) whereClause.vehicleId = vehicle_id as string;
    if (typeof status === 'string' && status.trim()) {
      const values = status.split(',').map((s) => s.trim()).filter(Boolean) as TripStatus[];
      whereClause.status = values.length > 1 ? { in: values } : values[0];
    }
    // The tier/category a trip was booked under is copied onto the trip at
    // creation, but older trips predate those columns and only carry it on
    // their rate card — so match either place, otherwise filtering by
    if (typeof rate_category === 'string' && rate_category.trim()) {
      const value = rate_category.trim();
      (whereClause.AND as Prisma.TripWhereInput[]).push({
        OR: [{ rate_category: value }, { AND: [{ rate_category: null }, { quotation: { line_type: value } }] }],
      });
    }
    if (typeof vehicle_type === 'string' && vehicle_type.trim()) {
      const value = vehicle_type.trim();
      (whereClause.AND as Prisma.TripWhereInput[]).push({
        OR: [{ vehicle_type: value }, { AND: [{ vehicle_type: null }, { quotation: { OR: [{ source_vehicle_label: value }, { vehicle_class: value }] } }] }],
      });
    }
    if (typeof billing_type === 'string' && billing_type.trim()) {
      const value = billing_type.trim();
      (whereClause.AND as Prisma.TripWhereInput[]).push({
        OR: [{ billing_type: value }, { AND: [{ billing_type: null }, { quotation: { billing_type: value } }] }],
      });
    }

    const trips = await prisma.trip.findMany({
      where: whereClause,
      take: MONTHLY_BOARD_TRIP_CAP,
      orderBy: [{ planned_start: 'asc' }, { createdAt: 'asc' }],
      include: {
        financials: true,
        customer: { select: { id: true, name: true, contact_phone: true, logo_url: true } },
        driver: { select: { id: true, ref_id: true, first_name: true, last_name: true, phone_primary: true, avatar_url: true, deletedAt: true } },
        vehicle: { select: { id: true, ref_id: true, plate_number: true, asset_type: true, deletedAt: true } },
        quotation: {
          select: {
            id: true, name: true, rate: true, currency: true,
            source_vehicle_label: true, vehicle_class: true, line_type: true, billing_type: true, pricing_basis: true,
          },
        },
        stops: {
          where: { deletedAt: null },
          orderBy: { stop_sequence: 'asc' },
          select: {
            stop_sequence: true, stop_type: true, location_name: true,
            planned_arrival: true, actual_arrival: true,
            location: { select: { id: true, name: true, code: true } },
          },
        },
      },
    });

    type BoardTrip = ReturnType<typeof toBoardTrip>;

    function toBoardTrip(trip: (typeof trips)[number]) {
      const pickup = trip.stops.find((s) => s.stop_type === StopType.Pickup) ?? trip.stops[0] ?? null;
      const dropoff = [...trip.stops].reverse().find((s) => s.stop_type === StopType.Dropoff) ?? null;
      const day = trip.planned_start ?? trip.createdAt;

      return {
        id: trip.id,
        ref_id: trip.ref_id,
        status: trip.status,
        date: toDayKey(day),
        planned_start: trip.planned_start,
        planned_end: trip.planned_end,
        actual_start: trip.actual_start,
        actual_end: trip.actual_end,
        date_is_inferred: trip.planned_start === null,
        driver: trip.driver
          ? {
              id: trip.driver.id,
              ref_id: trip.driver.ref_id,
              name: `${trip.driver.first_name} ${trip.driver.last_name}`.trim(),
              phone_primary: trip.driver.phone_primary,
              avatar_url: trip.driver.avatar_url,
            }
          : null,
        vehicle: trip.vehicle,
        vehicle_type: trip.vehicle_type ?? trip.quotation?.source_vehicle_label ?? trip.quotation?.vehicle_class ?? null,
        rate_category: trip.rate_category ?? trip.quotation?.line_type ?? null,
        billing_type: trip.billing_type ?? trip.quotation?.billing_type ?? null,
        financials: trip.financials ? {
          id: trip.financials.id,
          tripId: trip.financials.tripId,
          quotationId: trip.financials.quotationId,
          applied_rate: trip.financials.applied_rate != null ? Number(trip.financials.applied_rate) : null,
          quotation_line_type: trip.financials.quotation_line_type,
          quotation_billing_type: trip.financials.quotation_billing_type,
          quotation_pricing_basis: trip.financials.quotation_pricing_basis,
          quotation_vehicle_class: trip.financials.quotation_vehicle_class,
          quotation_source_vehicle_label: trip.financials.quotation_source_vehicle_label,
        } : null,
        quotation_line_type: trip.financials?.quotation_line_type ?? trip.quotation_line_type ?? trip.quotation?.line_type ?? trip.rate_category ?? null,
        quotation_billing_type: trip.financials?.quotation_billing_type ?? trip.quotation_billing_type ?? trip.quotation?.billing_type ?? trip.billing_type ?? null,
        quotation_pricing_basis: trip.financials?.quotation_pricing_basis ?? trip.quotation_pricing_basis ?? trip.quotation?.pricing_basis ?? null,
        applied_rate: trip.financials?.applied_rate != null ? Number(trip.financials.applied_rate) : (trip.applied_rate != null ? Number(trip.applied_rate) : (trip.quotation?.rate != null ? Number(trip.quotation.rate) : null)),
        quotation_vehicle_class: trip.financials?.quotation_vehicle_class ?? trip.quotation_vehicle_class ?? trip.quotation?.vehicle_class ?? null,
        quotation_source_vehicle_label: trip.financials?.quotation_source_vehicle_label ?? trip.quotation_source_vehicle_label ?? trip.quotation?.source_vehicle_label ?? trip.vehicle_type ?? null,
        billing_amount: trip.billing_amount != null ? Number(trip.billing_amount) : (Number((trip as any).driver_charge ?? (trip as any).trip_charges) || null),
        driver_charge: trip.driver_charge != null ? Number(trip.driver_charge) : 0,
        trip_charges: trip.driver_charge != null ? Number(trip.driver_charge) : 0,
        currency: trip.quotation?.currency ?? 'SAR',
        quotationId: trip.quotationId,
        quotation: trip.quotation
          ? { id: trip.quotation.id, name: trip.quotation.name, rate: Number(trip.quotation.rate), line_type: trip.quotation.line_type, billing_type: trip.quotation.billing_type, pricing_basis: trip.quotation.pricing_basis }
          : null,
        rate_card: trip.quotation
          ? { id: trip.quotation.id, name: trip.quotation.name, base_price: trip.quotation.rate, rate: trip.quotation.rate }
          : null,
        origin: pickup?.location?.code ? `${pickup.location.code} — ${pickup.location.name}` : (pickup?.location?.name ?? pickup?.location_name ?? null),
        destination: dropoff?.location?.code ? `${dropoff.location.code} — ${dropoff.location.name}` : (dropoff?.location?.name ?? dropoff?.location_name ?? null),
      };
    }

    interface CompanyGroup {
      customer: { id: string; name: string; contact_phone: string; logo_url?: string | null };
      trips: BoardTrip[];
      drivers: Map<string, { id: string; name: string; ref_id: string | null; trips: number }>;
      vehicles: Map<string, { id: string; plate_number: string; trips: number }>;
      categories: Map<string, number>;
    }

    const companies = new Map<string, CompanyGroup>();
    const allDrivers = new Set<string>();
    const allVehicles = new Set<string>();
    const byStatus: Record<string, number> = {};
    let totalBilled = 0;
    let unassigned = 0;

    for (const trip of trips) {
      const boardTrip = toBoardTrip(trip);
      const custId = trip.customerId || 'unassigned';
      const custObj = trip.customer || {
        id: custId,
        name: 'Unassigned Customer',
        contact_phone: '',
        avatar_url: null,
        logo_url: null,
      };

      let group = companies.get(custId);
      if (!group) {
        group = {
          customer: custObj,
          trips: [],
          drivers: new Map(),
          vehicles: new Map(),
          categories: new Map(),
        };
        companies.set(custId, group);
      }

      group.trips.push(boardTrip);

      if (boardTrip.driver) {
        const existing = group.drivers.get(boardTrip.driver.id);
        if (existing) existing.trips += 1;
        else group.drivers.set(boardTrip.driver.id, {
          id: boardTrip.driver.id,
          name: boardTrip.driver.name,
          ref_id: boardTrip.driver.ref_id,
          trips: 1,
        });
        allDrivers.add(boardTrip.driver.id);
      }

      if (boardTrip.vehicle) {
        const existing = group.vehicles.get(boardTrip.vehicle.id);
        if (existing) existing.trips += 1;
        else group.vehicles.set(boardTrip.vehicle.id, {
          id: boardTrip.vehicle.id,
          plate_number: boardTrip.vehicle.plate_number,
          trips: 1,
        });
        allVehicles.add(boardTrip.vehicle.id);
      }

      const category = boardTrip.rate_category ?? 'Uncategorised';
      group.categories.set(category, (group.categories.get(category) ?? 0) + 1);

      byStatus[trip.status] = (byStatus[trip.status] ?? 0) + 1;
      totalBilled += boardTrip.billing_amount ?? 0;
      // A monthly commitment is only covered once both a driver and a truck
      // are on the day — either one missing is a gap the operator must fill.
      if (!boardTrip.driver || !boardTrip.vehicle) unassigned += 1;
    }

    const payload = [...companies.values()]
      .map((group) => {
        const days = new Map<string, BoardTrip[]>();
        for (const trip of group.trips) {
          const bucket = days.get(trip.date);
          if (bucket) bucket.push(trip);
          else days.set(trip.date, [trip]);
        }

        return {
          customer: group.customer,
          total_trips: group.trips.length,
          total_billed: group.trips.reduce((sum, t) => sum + (t.billing_amount ?? 0), 0),
          unassigned_trips: group.trips.filter((t) => !t.driver || !t.vehicle).length,
          drivers: [...group.drivers.values()].sort((a, b) => b.trips - a.trips),
          vehicles: [...group.vehicles.values()].sort((a, b) => b.trips - a.trips),
          categories: [...group.categories.entries()]
            .map(([name, count]) => ({ name, trips: count }))
            .sort((a, b) => b.trips - a.trips),
          days: [...days.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, dayTrips]) => ({ date, trips: dayTrips })),
        };
      })
      // Busiest company first — that's the one the month is really about.
      .sort((a, b) => b.total_trips - a.total_trips || (a.customer?.name || '').localeCompare(b.customer?.name || ''));

    res.json({
      success: true,
      data: {
        month,
        start: start.toISOString(),
        end: end.toISOString(),
        summary: {
          total_trips: trips.length,
          companies: companies.size,
          drivers_used: allDrivers.size,
          vehicles_used: allVehicles.size,
          total_billed: totalBilled,
          unassigned_trips: unassigned,
          by_status: byStatus,
          truncated: trips.length === MONTHLY_BOARD_TRIP_CAP,
        },
        companies: payload,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to build the monthly trip board');
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to load the monthly trip board' },
    });
  }
};
