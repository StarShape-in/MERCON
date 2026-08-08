import { Request, Response } from 'express';
import { prisma } from '../index';
import { resolveLocation } from './locationController';
import { findRateForLane, rateCardInclude } from '../services/rateLookup';

/**
 * Rate cards price a lane (origin → destination).
 *
 * A card with no customer is the STANDARD price for that lane and applies to
 * everyone. A card WITH a customer overrides the standard one for that customer
 * only. The matching rule itself lives in services/rateLookup.ts because trip
 * creation and invoicing need the same one.
 */

/**
 * Turn whatever the client sent into a pair of Location rows, creating places
 * that don't exist yet. Accepts either ids (picked from the list) or names
 * (typed on the fly in the trip wizard), and still understands the old
 * route_origin/route_destination text so existing callers keep working.
 */
const resolveLane = async (tx: any, body: any, userId?: string) => {
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

const laneAlreadyPriced = async (
  tx: any,
  params: { customerId: string | null; originLocationId: string; destinationLocationId: string; exceptId?: string }
) =>
  tx.rateCard.findFirst({
    where: {
      deletedAt: null,
      customerId: params.customerId,
      originLocationId: params.originLocationId,
      destinationLocationId: params.destinationLocationId,
      ...(params.exceptId ? { id: { not: params.exceptId } } : {}),
    },
    include: rateCardInclude,
  });

export const createRateCard = async (req: Request, res: Response) => {
  try {
    const { name, base_price, currency, customerId, is_active } = req.body;
    const userId = (req as any).user?.id;

    const price = Number(base_price);
    if (isNaN(price) || price <= 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Enter a base price greater than 0' } });
    }

    const rateCard = await prisma.$transaction(async (tx) => {
      const { origin, destination } = await resolveLane(tx, req.body, userId);
      if (!origin || !destination) {
        throw new Error('LANE_INCOMPLETE');
      }
      if (origin.id === destination.id) {
        throw new Error('LANE_SAME_ENDPOINTS');
      }

      const normalisedCustomerId = customerId || null;

      const clash = await laneAlreadyPriced(tx, {
        customerId: normalisedCustomerId,
        originLocationId: origin.id,
        destinationLocationId: destination.id,
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
          created_by: userId,
        },
        include: rateCardInclude,
      });
    });

    res.status(201).json({ success: true, data: rateCard });
  } catch (error: any) {
    if (error.message === 'LANE_INCOMPLETE') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Pick both an origin and a destination' } });
    }
    if (error.message === 'LANE_SAME_ENDPOINTS') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Origin and destination must be different places' } });
    }
    if (error.message === 'LANE_DUPLICATE') {
      const clash = error.clash;
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE',
          message: clash?.customerId
            ? `${clash.customer?.name || 'This customer'} already has a rate for ${clash.route_origin} → ${clash.route_destination}. Edit that one instead.`
            : `A standard rate for ${clash?.route_origin} → ${clash?.route_destination} already exists. Edit that one instead.`,
        },
      });
    }
    if (error.message === 'LOCATION_NOT_FOUND') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'That location no longer exists' } });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create rate card' } });
  }
};

export const getRateCards = async (req: Request, res: Response) => {
  try {
    const {
      customerId,
      active_only,
      scope,
      include_standard,
      origin_location_id,
      destination_location_id,
    } = req.query;

    const whereClause: any = { deletedAt: null };
    if (active_only === 'true') whereClause.is_active = true;
    if (origin_location_id) whereClause.originLocationId = origin_location_id as string;
    if (destination_location_id) whereClause.destinationLocationId = destination_location_id as string;

    if (scope === 'standard') {
      whereClause.customerId = null;
    } else if (customerId) {
      // A customer's effective price list is their own overrides plus the
      // standard lanes they fall back to, so the customer page asks for both.
      whereClause[include_standard === 'true' ? 'OR' : 'customerId'] =
        include_standard === 'true'
          ? [{ customerId: customerId as string }, { customerId: null }]
          : (customerId as string);
    }

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
    const { customer_id, origin_location_id, destination_location_id } = req.query;

    const { rateCard, source } = await findRateForLane(prisma, {
      customerId: (customer_id as string) || null,
      originLocationId: (origin_location_id as string) || null,
      destinationLocationId: (destination_location_id as string) || null,
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
    const userId = (req as any).user?.id;

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
    const { name, base_price, currency, customerId, is_active } = req.body;
    const userId = (req as any).user?.id;

    if (base_price !== undefined) {
      const price = Number(base_price);
      if (isNaN(price) || price <= 0) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Enter a base price greater than 0' } });
      }
    }

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
        if (origin.id === destination.id) throw new Error('LANE_SAME_ENDPOINTS');
        originId = origin.id;
        destinationId = destination.id;
        originName = origin.name;
        destinationName = destination.name;
      }

      const normalisedCustomerId = customerId === undefined ? existing.customerId : customerId || null;

      if (originId && destinationId) {
        const clash = await laneAlreadyPriced(tx, {
          customerId: normalisedCustomerId,
          originLocationId: originId,
          destinationLocationId: destinationId,
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
          updated_by: userId,
          version: existing.version + 1,
        },
        include: rateCardInclude,
      });
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'RateCard not found' } });
    }
    if (error.message === 'LANE_INCOMPLETE') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Pick both an origin and a destination' } });
    }
    if (error.message === 'LANE_SAME_ENDPOINTS') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Origin and destination must be different places' } });
    }
    if (error.message === 'LANE_DUPLICATE') {
      const clash = error.clash;
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE',
          message: clash?.customerId
            ? `${clash.customer?.name || 'This customer'} already has a rate for ${clash.route_origin} → ${clash.route_destination}.`
            : `A standard rate for ${clash?.route_origin} → ${clash?.route_destination} already exists.`,
        },
      });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update rate card' } });
  }
};

export const deleteRateCard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    await prisma.rateCard.update({
      where: { id: id as string },
      data: { deletedAt: new Date(), deleted_by: userId as string, is_active: false }
    });
    res.json({ success: true, message: 'RateCard deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
};


export const bulkDeleteRateCards = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
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
