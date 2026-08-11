import { Request, Response } from 'express';
import { prisma } from '../index';
import { resolveLocation } from './locationController';
import { findRateForLane, rateCardInclude } from '../services/rateLookup';
import { getValidUuid } from '../utils/uuid';
import { logger } from '../utils/logger';
import { vehicleTypeField, rateCategoryField } from '../schemas';

/**
 * Validates a submitted vehicle_type/rate_category pair against the known
 * list (VEHICLE_TYPES/RATE_CATEGORIES in @mercon/shared-types). Throws
 * VALIDATION_ERROR with a message naming the bad field so the form can show
 * it, rather than silently storing a typo that then never matches a trip.
 */
const parseTierFields = (body: any) => {
  const vehicleType = vehicleTypeField.safeParse(body.vehicle_type);
  if (!vehicleType.success) {
    const err: any = new Error(`"${body.vehicle_type}" isn't a known vehicle type`);
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  const rateCategory = rateCategoryField.safeParse(body.rate_category);
  if (!rateCategory.success) {
    const err: any = new Error(`"${body.rate_category}" isn't a known rate category`);
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  return { vehicleType: vehicleType.data ?? null, rateCategory: rateCategory.data ?? null };
};

/**
 * Rate cards price a lane (origin → destination) for exactly one customer —
 * every quote in these carriers' contracts is customer-specific, so there is
 * no all-customers "standard" rate. The matching rule itself lives in
 * services/rateLookup.ts because trip creation and invoicing need the same one.
 */

/**
 * Turn whatever the client sent into a pair of Location rows, creating places
 * that don't exist yet. Accepts either ids (picked from the list) or names
 * (typed on the fly in the trip wizard), and still understands the old
 * route_origin/route_destination text so existing callers keep working.
 */
const resolveLane = async (tx: any, body: any, userId?: string | null) => {
  const origin = await resolveLocation(
    tx,
    {
      id: body.origin_location_id ?? null,
      name: body.origin_name ?? body.route_origin ?? null,
      lat: body.origin_lat ?? null,
      lng: body.origin_lng ?? null,
    },
    userId
  );

  const destination = await resolveLocation(
    tx,
    {
      id: body.destination_location_id ?? null,
      name: body.destination_name ?? body.route_destination ?? null,
      lat: body.destination_lat ?? null,
      lng: body.destination_lng ?? null,
    },
    userId
  );

  return { origin, destination };
};

// A lane's price is only ambiguous when everything that could distinguish two
// quotes for it (vehicle type, rate category) also matches — a customer can
// have both a "Trip" rate and a "Monthly" rate for the same origin/destination,
// or a different price per vehicle tier, without one clashing with the other.
const laneAlreadyPriced = async (
  tx: any,
  params: {
    customerId: string;
    originLocationId: string;
    destinationLocationId: string;
    vehicleType?: string | null;
    rateCategory?: string | null;
    exceptId?: string;
  }
) =>
  tx.rateCard.findFirst({
    where: {
      deletedAt: null,
      customerId: params.customerId,
      originLocationId: params.originLocationId,
      destinationLocationId: params.destinationLocationId,
      vehicle_type: params.vehicleType ?? null,
      rate_category: params.rateCategory ?? null,
      ...(params.exceptId ? { id: { not: params.exceptId } } : {}),
    },
    include: rateCardInclude,
  });

export const createRateCard = async (req: Request, res: Response) => {
  try {
    const { name, base_price, currency, customerId, is_active, via_location } = req.body;
    const userId = getValidUuid((req as any).user?.id);

    const price = Number(base_price);
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Enter a base price greater than 0' } });
    }

    const normalisedCustomerId = getValidUuid(customerId);
    if (!normalisedCustomerId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Choose which customer this rate is for' } });
    }

    const { vehicleType, rateCategory } = parseTierFields(req.body);

    const rateCard = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({ where: { id: normalisedCustomerId, deletedAt: null } });
      if (!customer) throw new Error('CUSTOMER_NOT_FOUND');

      // Same origin/destination is a legitimate lane, not a mistake — carriers
      // quote within-city local delivery ("INSIDE JEDDAH" → "INSIDE JEDDAH")
      // as its own priced lane, same place on both ends.
      const { origin, destination } = await resolveLane(tx, req.body, userId);
      if (!origin || !destination) {
        throw new Error('LANE_INCOMPLETE');
      }

      const normalisedVehicleType = vehicleType ?? null;
      const normalisedRateCategory = rateCategory ?? null;

      const clash = await laneAlreadyPriced(tx, {
        customerId: normalisedCustomerId,
        originLocationId: origin.id,
        destinationLocationId: destination.id,
        vehicleType: normalisedVehicleType,
        rateCategory: normalisedRateCategory,
      });
      if (clash) {
        const err: any = new Error('LANE_DUPLICATE');
        err.clash = clash;
        throw err;
      }

      return tx.rateCard.create({
        data: {
          // A lane already reads as its own name; only make one up when the
          // user didn't bother, so the list never shows a blank title.
          name: String(name || '').trim() || `${origin.name} → ${destination.name}`,
          route_origin: origin.name,
          route_destination: destination.name,
          originLocationId: origin.id,
          destinationLocationId: destination.id,
          base_price: price,
          currency: currency || 'SAR',
          customerId: normalisedCustomerId,
          is_active: is_active ?? true,
          vehicle_type: normalisedVehicleType,
          rate_category: normalisedRateCategory,
          via_location: via_location ? String(via_location).trim() || null : null,
          created_by: userId,
        },
        include: rateCardInclude,
      });
    });

    res.status(201).json({ success: true, data: rateCard });
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to create rate card');
    if (error.code === 'VALIDATION_ERROR') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message } });
    }
    if (error.message === 'LANE_INCOMPLETE') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Pick both an origin and a destination' } });
    }
    if (error.message === 'LANE_DUPLICATE') {
      const clash = error.clash;
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE',
          message: `${clash?.customer?.name || 'This customer'} already has a rate for ${clash?.route_origin} → ${clash?.route_destination}. Edit that one instead.`,
        },
      });
    }
    if (error.message === 'LOCATION_NOT_FOUND') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'That location no longer exists' } });
    }
    if (error.message === 'CUSTOMER_NOT_FOUND') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'That customer no longer exists' } });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Failed to create rate card' } });
  }
};

export const getRateCards = async (req: Request, res: Response) => {
  try {
    const {
      customerId,
      active_only,
      origin_location_id,
      destination_location_id,
    } = req.query;

    const whereClause: any = { deletedAt: null };
    if (active_only === 'true') whereClause.is_active = true;
    if (origin_location_id) whereClause.originLocationId = origin_location_id as string;
    if (destination_location_id) whereClause.destinationLocationId = destination_location_id as string;
    if (customerId) whereClause.customerId = customerId as string;

    const rateCards = await prisma.rateCard.findMany({
      where: whereClause,
      include: rateCardInclude,
      orderBy: [{ route_origin: 'asc' }, { route_destination: 'asc' }, { createdAt: 'desc' }],
    });

    res.json({ success: true, data: rateCards });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch rate cards' } });
  }
};

/**
 * What should this trip cost? Called live by the trip wizard as the dispatcher
 * picks a customer and a lane, and by createTrip when no price was typed.
 */
export const lookupRateCard = async (req: Request, res: Response) => {
  try {
    const { customer_id, origin_location_id, destination_location_id, vehicle_type, rate_category } = req.query;

    const { rateCard, source } = await findRateForLane(prisma, {
      customerId: (customer_id as string) || null,
      originLocationId: (origin_location_id as string) || null,
      destinationLocationId: (destination_location_id as string) || null,
      // Only filter on tier/category when the caller actually sent one —
      // omitted query params stay `undefined` here, which findRateForLane
      // treats as "any tier", not "empty tier".
      ...(vehicle_type !== undefined ? { vehicleType: (vehicle_type as string) || null } : {}),
      ...(rate_category !== undefined ? { rateCategory: (rate_category as string) || null } : {}),
    });

    res.json({ success: true, data: { rate_card: rateCard, source } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to look up rate' } });
  }
};

/**
 * Copy one lane's price onto a set of customers as their own override.
 * Customers that already have a rate for the lane are reported back untouched
 * rather than overwritten — silently replacing a negotiated price would be the
 * worst possible behaviour here.
 */
export const assignRateCardToCustomers = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { customer_ids } = req.body;
    const userId = getValidUuid((req as any).user?.id);

    if (!Array.isArray(customer_ids) || customer_ids.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Select at least one customer' } });
    }

    const source = await prisma.rateCard.findFirst({
      where: { id: id as string, deletedAt: null },
      include: rateCardInclude,
    });
    if (!source) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Rate card not found' } });
    }
    if (!source.originLocationId || !source.destinationLocationId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'This rate card has no linked origin/destination yet — edit it and pick both first.' },
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const created: any[] = [];
      const skipped: { customerId: string; customerName: string }[] = [];

      for (const customerId of customer_ids) {
        const customer = await tx.customer.findFirst({ where: { id: customerId, deletedAt: null } });
        if (!customer) continue;

        const existing = await laneAlreadyPriced(tx, {
          customerId,
          originLocationId: source.originLocationId!,
          destinationLocationId: source.destinationLocationId!,
          vehicleType: source.vehicle_type,
          rateCategory: source.rate_category,
        });
        if (existing) {
          skipped.push({ customerId, customerName: customer.name });
          continue;
        }

        created.push(
          await tx.rateCard.create({
            data: {
              name: `${customer.name} — ${source.route_origin} → ${source.route_destination}`,
              route_origin: source.route_origin,
              route_destination: source.route_destination,
              originLocationId: source.originLocationId,
              destinationLocationId: source.destinationLocationId,
              base_price: source.base_price,
              currency: source.currency,
              customerId,
              is_active: true,
              vehicle_type: source.vehicle_type,
              rate_category: source.rate_category,
              via_location: source.via_location,
              created_by: userId,
            },
            include: rateCardInclude,
          })
        );
      }

      return { created, skipped };
    });

    res.status(201).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to assign rate card' } });
  }
};

export const getRateCardById = async (req: Request, res: Response) => {
  try {
    const rateCard = await prisma.rateCard.findFirst({
      where: { id: req.params.id as string, deletedAt: null },
      include: rateCardInclude,
    });
    if (!rateCard) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'RateCard not found' } });
    }
    res.json({ success: true, data: rateCard });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch rate card' } });
  }
};

export const updateRateCard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, base_price, currency, customerId, is_active, via_location } = req.body;
    const userId = getValidUuid((req as any).user?.id);

    if (base_price !== undefined) {
      const price = Number(base_price);
      if (isNaN(price) || price <= 0) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Enter a base price greater than 0' } });
      }
    }

    // Only re-validate/apply when the caller actually sent the field — a
    // partial update (e.g. just is_active) must not blank out an existing tier.
    const { vehicleType: sentVehicleType, rateCategory: sentRateCategory } = parseTierFields(req.body);

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.rateCard.findFirst({ where: { id: id as string, deletedAt: null } });
      if (!existing) throw new Error('NOT_FOUND');

      // Only re-resolve the lane when the caller actually sent one; a partial
      // update (e.g. just is_active) must not blank out the endpoints.
      const laneSent =
        req.body.origin_location_id !== undefined ||
        req.body.destination_location_id !== undefined ||
        req.body.origin_name !== undefined ||
        req.body.destination_name !== undefined ||
        req.body.route_origin !== undefined ||
        req.body.route_destination !== undefined;

      let originId = existing.originLocationId;
      let destinationId = existing.destinationLocationId;
      let originName = existing.route_origin;
      let destinationName = existing.route_destination;

      if (laneSent) {
        const { origin, destination } = await resolveLane(tx, req.body, userId);
        if (!origin || !destination) throw new Error('LANE_INCOMPLETE');
        originId = origin.id;
        destinationId = destination.id;
        originName = origin.name;
        destinationName = destination.name;
      }

      const normalisedCustomerId = customerId === undefined ? existing.customerId : getValidUuid(customerId);
      if (!normalisedCustomerId) throw new Error('CUSTOMER_REQUIRED');
      const normalisedVehicleType = req.body.vehicle_type === undefined ? existing.vehicle_type : sentVehicleType;
      const normalisedRateCategory = req.body.rate_category === undefined ? existing.rate_category : sentRateCategory;

      if (originId && destinationId) {
        const clash = await laneAlreadyPriced(tx, {
          customerId: normalisedCustomerId,
          originLocationId: originId,
          destinationLocationId: destinationId,
          vehicleType: normalisedVehicleType,
          rateCategory: normalisedRateCategory,
          exceptId: existing.id,
        });
        if (clash) {
          const err: any = new Error('LANE_DUPLICATE');
          err.clash = clash;
          throw err;
        }
      }

      return tx.rateCard.update({
        where: { id: id as string },
        data: {
          ...(name !== undefined ? { name: String(name).trim() || `${originName} → ${destinationName}` } : {}),
          route_origin: originName,
          route_destination: destinationName,
          originLocationId: originId,
          destinationLocationId: destinationId,
          ...(base_price !== undefined ? { base_price: Number(base_price) } : {}),
          ...(currency !== undefined ? { currency } : {}),
          ...(customerId !== undefined ? { customerId: normalisedCustomerId } : {}),
          ...(is_active !== undefined ? { is_active } : {}),
          ...(req.body.vehicle_type !== undefined ? { vehicle_type: normalisedVehicleType } : {}),
          ...(req.body.rate_category !== undefined ? { rate_category: normalisedRateCategory } : {}),
          ...(via_location !== undefined ? { via_location: String(via_location || '').trim() || null } : {}),
          updated_by: userId,
          version: existing.version + 1,
        },
        include: rateCardInclude,
      });
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    if (error.code === 'VALIDATION_ERROR') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message } });
    }
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'RateCard not found' } });
    }
    if (error.message === 'CUSTOMER_REQUIRED') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Choose which customer this rate is for' } });
    }
    if (error.message === 'LANE_INCOMPLETE') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Pick both an origin and a destination' } });
    }
    if (error.message === 'LANE_DUPLICATE') {
      const clash = error.clash;
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE',
          message: `${clash?.customer?.name || 'This customer'} already has a rate for ${clash?.route_origin} → ${clash?.route_destination}.`,
        },
      });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update rate card' } });
  }
};

export const deleteRateCard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getValidUuid((req as any).user?.id);

    await prisma.rateCard.update({
      where: { id: id as string },
      data: { deletedAt: new Date(), deleted_by: userId, is_active: false }
    });
    res.json({ success: true, message: 'RateCard deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
};


export const bulkDeleteRateCards = async (req: Request, res: Response) => {
  try {
    const userId = getValidUuid((req as any).user?.id);
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No IDs provided' } });
    }

    await prisma.rateCard.updateMany({
      where: { id: { in: ids } },
      data: {
        deletedAt: new Date(),
        is_active: false,
        deleted_by: userId
      }
    });
    res.json({ success: true, data: { message: `Successfully deleted ${ids.length} ratecards` } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: `Failed to bulk delete ratecards` } });
  }
};

/**
 * Import a flat rate sheet: one row per lane × vehicle-type combination,
 * grouped by customer and rate category ("Trip/Round Trip", "Monthly",
 * "Surcharge", ...). Mirrors bulkImportCustomers — parsed client-side, posted
 * as JSON, one row failing doesn't stop the rest.
 *
 * The customer must already exist (matched by name, case-insensitive); rate
 * cards don't have enough info to create one (Customer.contact_phone is
 * required and isn't part of this sheet), so a missing customer fails that
 * row with a message pointing at the Customers import instead of guessing.
 *
 * "Surcharge" rows (labour charge, per-stop fee, ...) aren't a lane — Origin
 * carries the description instead, and no Location rows are resolved/created
 * for them.
 */
export const bulkImportRateCards = async (req: Request, res: Response) => {
  try {
    const rows: Record<string, any>[] = req.body.rows || [];
    const userId = getValidUuid((req as any).user?.id);
    const results: any[] = [];

    // A real sheet repeats the same handful of customers and locations across
    // hundreds of rows (this import was built for a 652-row workbook with 7
    // customers) — looking each one up fresh every row turned a few thousand
    // sequential DB round trips, which is what blew past the client's request
    // timeout. Both are stable for the life of one import call.
    const customerCache = new Map<string, any>();
    const findCustomer = async (name: string) => {
      const key = name.toLowerCase();
      if (customerCache.has(key)) return customerCache.get(key);
      const customer = await prisma.customer.findFirst({
        where: { deletedAt: null, name: { equals: name, mode: 'insensitive' } },
      });
      customerCache.set(key, customer);
      return customer;
    };

    const locationCache = new Map<string, any>();
    const findOrCreateLocation = async (tx: any, name: string) => {
      const key = name.trim().toLowerCase();
      if (locationCache.has(key)) return locationCache.get(key);
      const location = await resolveLocation(tx, { name }, userId);
      locationCache.set(key, location);
      return location;
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;

      const customerName = String(row.customer_name || '').trim();
      const originText = String(row.origin || '').trim();
      const destinationText = String(row.destination || '').trim();
      const viaText = String(row.via || '').trim();
      const vehicleType = String(row.vehicle_type || '').trim();
      const rateCategory = String(row.rate_category || '').trim();
      const currency = String(row.currency || '').trim() || 'SAR';
      const isSurcharge = rateCategory.toLowerCase() === 'surcharge';
      const label = [customerName, rateCategory || null, originText, isSurcharge ? null : destinationText]
        .filter(Boolean)
        .join(' — ') || `Row ${rowNumber}`;

      try {
        if (!customerName) {
          results.push({ row: rowNumber, success: false, label, error: 'Customer is missing' });
          continue;
        }
        if (!originText) {
          results.push({ row: rowNumber, success: false, label, error: isSurcharge ? 'Description is missing' : 'Origin is missing' });
          continue;
        }
        if (!isSurcharge && !destinationText) {
          results.push({ row: rowNumber, success: false, label, error: 'Destination is missing' });
          continue;
        }

        if (vehicleType && !vehicleTypeField.safeParse(vehicleType).success) {
          results.push({ row: rowNumber, success: false, label, error: `"${vehicleType}" isn't a known vehicle type` });
          continue;
        }
        if (rateCategory && !rateCategoryField.safeParse(rateCategory).success) {
          results.push({ row: rowNumber, success: false, label, error: `"${rateCategory}" isn't a known rate category` });
          continue;
        }

        const price = Number(row.price);
        if (isNaN(price) || price <= 0) {
          results.push({ row: rowNumber, success: false, label, error: 'Price is missing or not a number greater than 0' });
          continue;
        }

        const customer = await findCustomer(customerName);
        if (!customer) {
          results.push({
            row: rowNumber,
            success: false,
            label,
            error: `Customer "${customerName}" doesn't exist yet — import it on the Customers page first.`,
          });
          continue;
        }

        const action = await prisma.$transaction(async (tx) => {
          let originId: string | null = null;
          let destinationId: string | null = null;
          let routeOrigin = originText;
          let routeDestination = destinationText;

          if (!isSurcharge) {
            const origin = await findOrCreateLocation(tx, originText);
            const destination = await findOrCreateLocation(tx, destinationText);
            if (!origin || !destination) throw new Error('LANE_INCOMPLETE');
            originId = origin.id;
            destinationId = destination.id;
            routeOrigin = origin.name;
            routeDestination = destination.name;
          }

          const data = {
            name: isSurcharge
              ? `${customer.name} — ${originText}`
              : `${customer.name} — ${routeOrigin} → ${routeDestination}${vehicleType ? ` (${vehicleType})` : ''}`,
            route_origin: routeOrigin,
            route_destination: isSurcharge ? (destinationText || 'Surcharge') : routeDestination,
            originLocationId: originId,
            destinationLocationId: destinationId,
            base_price: price,
            currency,
            customerId: customer.id,
            is_active: true,
            vehicle_type: vehicleType || null,
            rate_category: rateCategory || null,
            via_location: viaText || null,
          };

          const existing = await tx.rateCard.findFirst({
            where: {
              deletedAt: null,
              customerId: customer.id,
              originLocationId: originId,
              destinationLocationId: destinationId,
              vehicle_type: vehicleType || null,
              rate_category: rateCategory || null,
              ...(isSurcharge ? { route_origin: originText } : {}),
            },
          });

          if (existing) {
            await tx.rateCard.update({
              where: { id: existing.id },
              data: { ...data, updated_by: userId, version: existing.version + 1 },
            });
            return 'updated';
          }

          await tx.rateCard.create({ data: { ...data, created_by: userId } });
          return 'created';
        });

        results.push({ row: rowNumber, success: true, label, action });
      } catch (err: any) {
        const message =
          err.message === 'LANE_INCOMPLETE' ? 'Could not resolve the origin/destination' :
          err.message || 'Could not import this rate';
        results.push({ row: rowNumber, success: false, label, error: message });
      }
    }

    const created = results.filter((r) => r.success && r.action === 'created').length;
    const updated = results.filter((r) => r.success && r.action === 'updated').length;
    const failed = results.filter((r) => !r.success).length;

    res.json({ success: true, data: { total: rows.length, created, updated, failed, results } });
  } catch (error) {
    logger.error({ err: error }, 'Failed to import rate cards');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to import rate cards' } });
  }
};
