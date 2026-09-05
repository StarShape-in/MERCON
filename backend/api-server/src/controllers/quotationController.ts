import { Request, Response } from 'express';
import { prisma } from '../db';
import { resolveLocation } from './locationController';
import { findQuotationForLane, quotationInclude } from '../services/rateLookup';
import { getValidUuid } from '../utils/uuid';
import { logger } from '../utils/logger';
import { vehicleTypeField, rateCategoryField, billingTypeField } from '../schemas';

/**
 * Normalises tier fields from request body.
 */
const parseTierFields = (body: any) => {
  const vehicleType = vehicleTypeField.safeParse(body.vehicle_type ?? body.source_vehicle_label);
  const rateCategory = rateCategoryField.safeParse(body.rate_category ?? body.line_type);
  const billingType = billingTypeField.safeParse(body.billing_type);
  return {
    vehicleType: vehicleType.success ? vehicleType.data ?? null : null,
    rateCategory: rateCategory.success ? rateCategory.data ?? null : null,
    billingType: billingType.success ? billingType.data ?? null : null,
    vehicleClass: body.vehicle_class ? String(body.vehicle_class).trim() || null : null,
    pricingBasis: body.pricing_basis ? String(body.pricing_basis).trim() || null : null,
    validFrom: body.valid_from ? new Date(body.valid_from) : null,
    validTo: body.valid_to ? new Date(body.valid_to) : null,
    sourceType: body.source_type ? String(body.source_type).trim() || null : null,
    sourceReference: body.source_reference ? String(body.source_reference).trim() || null : null,
  };
};

const resolveLane = async (tx: any, body: any, userId?: string | null) => {
  const custId = body.customerId ?? body.customer_id ?? null;
  const origin = await resolveLocation(
    tx,
    {
      customerId: custId,
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
      customerId: custId,
      id: body.destination_location_id ?? null,
      name: body.destination_name ?? body.route_destination ?? null,
      lat: body.destination_lat ?? null,
      lng: body.destination_lng ?? null,
    },
    userId
  );

  return { origin, destination };
};

const MAX_SAFE_DECIMAL = 999999999.99;

const parseDecimalSafe = (val: any): number | null => {
  if (val === null || val === undefined || val === '' || val === 'null' || val === 'NULL') return null;
  const n = Number(val);
  if (isNaN(n) || !isFinite(n) || n < 0 || n > MAX_SAFE_DECIMAL) return null;
  return n;
};

export const createQuotation = async (req: Request, res: Response) => {
  try {
    const { name, base_price, rate, driver_payout, driver_charge, default_trip_charge, currency, customerId, is_active, via_location } = req.body;
    const userId = getValidUuid((req as any).user?.id);

    const price = parseDecimalSafe(rate ?? base_price);
    if (price === null || price <= 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Enter a valid rate between 0 and 999,999,999' } });
    }

    const rawPayout = driver_payout ?? driver_charge ?? default_trip_charge;
    const payoutVal = parseDecimalSafe(rawPayout);

    const normalisedCustomerId = getValidUuid(customerId);
    if (!normalisedCustomerId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Choose which customer this quotation is for' } });
    }

    const { vehicleType, rateCategory, billingType, vehicleClass, pricingBasis, validFrom, validTo, sourceType, sourceReference } = parseTierFields(req.body);

    const quotation = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({ where: { id: normalisedCustomerId, deletedAt: null } });
      if (!customer) throw new Error('CUSTOMER_NOT_FOUND');

      const { origin, destination } = await resolveLane(tx, req.body, userId);

      let stopData: Array<{ sequence: number; locationId: string | null; stop_type: 'Pickup' | 'Dropoff' | 'Rest' | 'Refuel'; source_label?: string | null }> = [];
      if (Array.isArray(req.body.stops) && req.body.stops.length > 0) {
        stopData = await Promise.all(req.body.stops.map(async (s: any, idx: number) => {
          const rawLocId = s.locationId || s.location_id || null;
          let validLocId: string | null = null;
          if (rawLocId) {
            const loc = await resolveLocation(tx, { id: rawLocId, customerId: normalisedCustomerId }, userId);
            validLocId = loc ? loc.id : null;
          }
          return {
            sequence: s.sequence ?? idx + 1,
            locationId: validLocId,
            stop_type: s.stop_type || (idx === 0 ? 'Pickup' : idx === req.body.stops.length - 1 ? 'Dropoff' : 'Rest'),
            source_label: s.source_label || s.location_name || null,
          };
        }));
      } else if (origin && destination) {
        stopData = [
          { sequence: 1, locationId: origin.id, stop_type: 'Pickup', source_label: origin.name },
          ...(via_location ? [{ sequence: 2, locationId: null, stop_type: 'Rest' as const, source_label: String(via_location).trim() }] : []),
          { sequence: via_location ? 3 : 2, locationId: destination.id, stop_type: 'Dropoff', source_label: destination.name },
        ];
      }

      const quotationName = String(name || '').trim() || (origin && destination ? `${origin.name} → ${destination.name}` : 'Quotation');

      const newQuotation = await tx.quotation.create({
        data: {
          name: quotationName,
          rate: price,
          driver_payout: payoutVal,
          currency: currency || 'SAR',
          customerId: normalisedCustomerId,
          is_active: is_active ?? true,
          line_type: rateCategory,
          billing_type: billingType,
          pricing_basis: pricingBasis,
          vehicle_class: vehicleClass,
          source_vehicle_label: vehicleType,
          valid_from: validFrom,
          valid_to: validTo,
          source_type: sourceType || 'MANUAL',
          source_reference: sourceReference,
          created_by: userId,
          stops: {
            create: stopData,
          },
        },
        include: quotationInclude,
      });

      try {
        const userObj = userId ? await tx.user.findFirst({ where: { id: userId }, select: { name: true, username: true } }) : null;
        const userName = userObj ? (userObj.name || userObj.username) : ((req as any).user?.name || (req as any).user?.username || null);

        await tx.quotationHistory.create({
          data: {
            quotationId: newQuotation.id,
            old_rate: null,
            new_rate: price,
            changed_by: userName,
            changed_by_user_id: userId || null,
            changed_by_name: userName,
            reason: req.body.reason || req.body.change_reason || 'Initial Quotation creation',
            source: req.body.source || 'QUOTATION_MODULE',
            trip_id: req.body.trip_id || null,
          },
        });
      } catch (historyErr: any) {
        logger.warn({ err: historyErr }, 'Could not record QuotationHistory entry — quotation created successfully');
      }

      return newQuotation;
    });

    res.status(201).json({ success: true, data: quotation });
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to create quotation');
    if (error.code === 'VALIDATION_ERROR') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message } });
    }
    if (error.message === 'CUSTOMER_NOT_FOUND') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'That customer no longer exists' } });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Failed to create quotation' } });
  }
};

export const getQuotations = async (req: Request, res: Response) => {
  try {
    const {
      customerId,
      active_only,
      status,
      vehicle_type,
      rate_category,
      line_type,
      billing_type,
      search,
      page,
      per_page,
    } = req.query;

    const whereClause: any = { deletedAt: null };
    if (active_only === 'true' || status === 'active') {
      whereClause.is_active = true;
    } else if (status === 'inactive') {
      whereClause.is_active = false;
    }

    const targetCustomerId = (customerId || req.query.customer_id) as string;
    if (targetCustomerId) whereClause.customerId = targetCustomerId;
    if (vehicle_type) whereClause.OR = [{ source_vehicle_label: vehicle_type as string }, { vehicle_class: vehicle_type as string }];
    if (line_type || rate_category) whereClause.line_type = (line_type || rate_category) as string;
    if (billing_type) whereClause.billing_type = billing_type as string;

    if (search && typeof search === 'string' && search.trim()) {
      const term = search.trim();
      whereClause.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { line_type: { contains: term, mode: 'insensitive' } },
        { billing_type: { contains: term, mode: 'insensitive' } },
        { source_vehicle_label: { contains: term, mode: 'insensitive' } },
        { vehicle_class: { contains: term, mode: 'insensitive' } },
        { customer: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const isPaginated = page !== undefined || (per_page !== undefined && per_page !== 'all');
    const pageNumber = Math.max(1, parseInt((page as string) || '1', 10));
    const limit = Math.max(1, parseInt((per_page as string) || '10', 10));
    const skip = (pageNumber - 1) * limit;

    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where: whereClause,
        include: quotationInclude,
        ...(isPaginated ? { skip, take: limit } : {}),
        orderBy: [{ createdAt: 'desc' }],
      }),
      prisma.quotation.count({ where: whereClause }),
    ]);

    res.json({
      success: true,
      data: quotations,
      meta: {
        page: isPaginated ? pageNumber : 1,
        per_page: isPaginated ? limit : total,
        total,
        total_pages: isPaginated ? Math.ceil(total / limit) : 1,
      },
    });
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to fetch quotations');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch quotations' } });
  }
};

export const lookupQuotation = async (req: Request, res: Response) => {
  try {
    const { customer_id, origin_location_id, destination_location_id, vehicle_type, rate_category, line_type, billing_type } = req.query;

    const { quotation, source } = await findQuotationForLane(prisma, {
      customerId: (customer_id as string) || null,
      originLocationId: (origin_location_id as string) || null,
      destinationLocationId: (destination_location_id as string) || null,
      ...(vehicle_type !== undefined ? { vehicleType: (vehicle_type as string) || null } : {}),
      ...(line_type !== undefined || rate_category !== undefined ? { lineType: ((line_type || rate_category) as string) || null } : {}),
      ...(billing_type !== undefined ? { billingType: (billing_type as string) || null } : {}),
    });

    res.json({ success: true, data: { quotation, rate_card: quotation, pricing_rule: quotation, source } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to look up quotation rate' } });
  }
};

export const getQuotationById = async (req: Request, res: Response) => {
  try {
    const quotation = await prisma.quotation.findFirst({
      where: { id: req.params.id as string, deletedAt: null },
      include: quotationInclude,
    });
    if (!quotation) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Quotation not found' } });
    }
    res.json({ success: true, data: quotation });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch quotation' } });
  }
};

export const updateQuotation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, base_price, rate, driver_payout, driver_charge, default_trip_charge, currency, customerId, is_active } = req.body;
    const userId = getValidUuid((req as any).user?.id);

    const priceVal = rate ?? base_price;
    if (priceVal !== undefined) {
      const price = parseDecimalSafe(priceVal);
      if (price === null || price <= 0) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Enter a valid rate between 0 and 999,999,999' } });
      }
    }

    const rawPayout = driver_payout ?? driver_charge ?? default_trip_charge;
    const payoutVal = rawPayout !== undefined ? parseDecimalSafe(rawPayout) : undefined;

    const { vehicleType: sentVehicleType, rateCategory: sentRateCategory, billingType: sentBillingType, vehicleClass: sentVehicleClass, pricingBasis: sentPricingBasis, validFrom: sentValidFrom, validTo: sentValidTo, sourceType: sentSourceType, sourceReference: sentSourceReference } = parseTierFields(req.body);

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.quotation.findFirst({ where: { id: id as string, deletedAt: null } });
      if (!existing) throw new Error('NOT_FOUND');

      const normalisedCustomerId = customerId === undefined ? existing.customerId : getValidUuid(customerId);
      if (!normalisedCustomerId) throw new Error('CUSTOMER_REQUIRED');

      const newRate = priceVal !== undefined ? Number(priceVal) : Number(existing.rate);
      const oldRate = Number(existing.rate);
      const priceChanged = priceVal !== undefined && oldRate !== newRate;

      const updatedQuotation = await tx.quotation.update({
        where: { id: id as string },
        data: {
          ...(name !== undefined ? { name: String(name).trim() } : {}),
          ...(priceVal !== undefined ? { rate: newRate } : {}),
          ...(payoutVal !== undefined ? { driver_payout: payoutVal } : {}),
          ...(currency !== undefined ? { currency } : {}),
          ...(customerId !== undefined ? { customerId: normalisedCustomerId } : {}),
          ...(is_active !== undefined ? { is_active } : {}),
          ...(sentRateCategory !== null ? { line_type: sentRateCategory } : {}),
          ...(sentBillingType !== null ? { billing_type: sentBillingType } : {}),
          ...(sentPricingBasis !== null ? { pricing_basis: sentPricingBasis } : {}),
          ...(sentVehicleClass !== null ? { vehicle_class: sentVehicleClass } : {}),
          ...(sentVehicleType !== null ? { source_vehicle_label: sentVehicleType } : {}),
          ...(sentValidFrom !== null ? { valid_from: sentValidFrom } : {}),
          ...(sentValidTo !== null ? { valid_to: sentValidTo } : {}),
          ...(sentSourceType !== null ? { source_type: sentSourceType } : {}),
          ...(sentSourceReference !== null ? { source_reference: sentSourceReference } : {}),
          updated_by: userId,
          version: existing.version + 1,
        },
        include: quotationInclude,
      });

      if (priceChanged) {
        const userObj = userId ? await tx.user.findFirst({ where: { id: userId }, select: { name: true, username: true } }) : null;
        const userName = userObj ? (userObj.name || userObj.username) : ((req as any).user?.name || (req as any).user?.username || null);

        await tx.quotationHistory.create({
          data: {
            quotationId: updatedQuotation.id,
            old_rate: oldRate,
            new_rate: newRate,
            changed_by: userName,
            changed_by_user_id: userId || null,
            changed_by_name: userName,
            reason: req.body.reason || req.body.change_reason || 'Quotation rate updated',
            source: req.body.source || 'QUOTATION_MODULE',
            trip_id: req.body.trip_id || null,
          },
        });
      }

      return updatedQuotation;
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    if (error.code === 'VALIDATION_ERROR') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message } });
    }
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Quotation not found' } });
    }
    if (error.message === 'CUSTOMER_REQUIRED') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Choose which customer this quotation is for' } });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update quotation' } });
  }
};

export const deleteQuotation = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = getValidUuid((req as any).user?.id);

    await prisma.quotation.update({
      where: { id: id as string },
      data: { deletedAt: new Date(), deleted_by: userId, is_active: false }
    });
    res.json({ success: true, message: 'Quotation deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Internal server error' } });
  }
};

export const bulkDeleteQuotations = async (req: Request, res: Response) => {
  try {
    const userId = getValidUuid((req as any).user?.id);
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'No IDs provided' } });
    }

    await prisma.quotation.updateMany({
      where: { id: { in: ids } },
      data: {
        deletedAt: new Date(),
        is_active: false,
        deleted_by: userId
      }
    });
    res.json({ success: true, data: { message: `Successfully deleted ${ids.length} quotations` } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: `Failed to bulk delete quotations` } });
  }
};

export const bulkImportQuotations = async (req: Request, res: Response) => {
  try {
    const rows: Record<string, any>[] = req.body.rows || [];
    const userId = getValidUuid((req as any).user?.id);
    const results: any[] = [];

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
      const rateCategory = String(row.rate_category || row.line_type || '').trim();
      const billingType = String(row.billing_type || '').trim();
      const currency = String(row.currency || '').trim() || 'SAR';
      const label = [customerName, rateCategory || null, originText, destinationText].filter(Boolean).join(' — ') || `Row ${rowNumber}`;

      try {
        if (!customerName) {
          results.push({ row: rowNumber, success: false, label, error: 'Customer is missing' });
          continue;
        }

        const price = Number(row.rate ?? row.price ?? row.base_price);
        if (isNaN(price) || price <= 0) {
          results.push({ row: rowNumber, success: false, label, error: 'Rate is missing or not a number greater than 0' });
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
          if (originText) {
            const originLoc = await findOrCreateLocation(tx, originText);
            originId = originLoc?.id || null;
          }
          if (destinationText) {
            const destLoc = await findOrCreateLocation(tx, destinationText);
            destinationId = destLoc?.id || null;
          }

          const lineTypeMapped =
            rateCategory.toLowerCase().includes('single') ? 'SINGLE_TRIP' :
            rateCategory.toLowerCase().includes('round') ? 'ROUND_TRIP' :
            rateCategory.toLowerCase().includes('10') ? '10_HRS' :
            rateCategory.toLowerCase().includes('12') ? '12_HRS' : rateCategory || 'SINGLE_TRIP';

          const billingTypeMapped = billingType.toLowerCase().includes('monthly') ? 'MONTHLY' : 'EXTRA';

          const data = {
            name: `${customer.name} — ${originText || 'General'} → ${destinationText || 'General'}${vehicleType ? ` (${vehicleType})` : ''}`,
            rate: price,
            currency,
            customerId: customer.id,
            is_active: true,
            line_type: lineTypeMapped,
            billing_type: billingTypeMapped,
            source_vehicle_label: vehicleType || null,
            source_type: 'IMPORT',
          };

          const existing = await tx.quotation.findFirst({
            where: {
              deletedAt: null,
              customerId: customer.id,
              line_type: lineTypeMapped,
              billing_type: billingTypeMapped,
              source_vehicle_label: vehicleType || null,
            },
          });

          if (existing) {
            await tx.quotation.update({
              where: { id: existing.id },
              data: { ...data, updated_by: userId, version: existing.version + 1 },
            });
            return 'updated';
          }

          const createdQuotation = await tx.quotation.create({ data: { ...data, created_by: userId } });
          if (originId || destinationId || viaText) {
            const stopsToCreate = [
              ...(originId ? [{ quotationId: createdQuotation.id, sequence: 1, locationId: originId, stop_type: 'Pickup' as const, source_label: originText }] : []),
              ...(viaText ? [{ quotationId: createdQuotation.id, sequence: 2, locationId: null, stop_type: 'Rest' as const, source_label: viaText }] : []),
              ...(destinationId ? [{ quotationId: createdQuotation.id, sequence: viaText ? 3 : 2, locationId: destinationId, stop_type: 'Dropoff' as const, source_label: destinationText }] : []),
            ];
            if (stopsToCreate.length > 0) {
              await tx.quotationStop.createMany({ data: stopsToCreate });
            }
          }
          return 'created';
        });

        results.push({ row: rowNumber, success: true, label, action });
      } catch (err: any) {
        results.push({ row: rowNumber, success: false, label, error: err.message || 'Could not import this quotation' });
      }
    }

    const created = results.filter((r) => r.success && r.action === 'created').length;
    const updated = results.filter((r) => r.success && r.action === 'updated').length;
    const failed = results.filter((r) => !r.success).length;

    res.json({ success: true, data: { total: rows.length, created, updated, failed, results } });
  } catch (error: any) {
    logger.error({ err: error }, 'Bulk import failed');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: error.message || 'Bulk import failed' } });
  }
};

export const getQuotationHistory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const history = await prisma.quotationHistory.findMany({
      where: { quotationId: id as string },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: history });
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to fetch quotation history');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch quotation history' } });
  }
};

/** Backward compatibility exported aliases for legacy callers */
export const createRateCard = createQuotation;
export const getRateCards = getQuotations;
export const lookupRateCard = lookupQuotation;
export const getRateCardById = getQuotationById;
export const updateRateCard = updateQuotation;
export const deleteRateCard = deleteQuotation;
export const bulkDeleteRateCards = bulkDeleteQuotations;
export const bulkImportRateCards = bulkImportQuotations;
export const getRateCardHistory = getQuotationHistory;
