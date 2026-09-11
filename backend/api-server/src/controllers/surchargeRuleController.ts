import { Request, Response } from 'express';
import { prisma } from '../db';
import { getValidUuid } from '../utils/uuid';
import { logger } from '../utils/logger';

const surchargeRuleInclude = {
  customer: { select: { id: true, name: true } },
  quotation: { select: { id: true, name: true } },
} as const;

export const createSurchargeRule = async (req: Request, res: Response) => {
  try {
    const { customerId, quotationId, quotation_id, rateCardId, charge_type, unit, vehicle_type, rate, currency, is_active } = req.body;
    const targetQuotationId = quotationId || quotation_id || rateCardId;
    const userId = getValidUuid((req as any).user?.id);

    const normalisedCustomerId = getValidUuid(customerId);
    if (!normalisedCustomerId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Choose which customer this fee is for' } });
    }

    const chargeType = String(charge_type || '').trim();
    if (!chargeType) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Enter a charge type, e.g. "Additional Stop"' } });
    }

    const numericRate = Number(rate);
    if (isNaN(numericRate) || numericRate <= 0) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Enter a rate greater than 0' } });
    }

    const normalisedRateCardId = targetQuotationId ? getValidUuid(targetQuotationId) : null;

    const created = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({ where: { id: normalisedCustomerId, deletedAt: null } });
      if (!customer) throw new Error('CUSTOMER_NOT_FOUND');

      if (normalisedRateCardId) {
        const quotation = await tx.quotation.findFirst({ where: { id: normalisedRateCardId, deletedAt: null } });
        if (!quotation) throw new Error('RATE_CARD_NOT_FOUND');
        if (quotation.customerId !== normalisedCustomerId) throw new Error('RATE_CARD_CUSTOMER_MISMATCH');
      }

      return tx.surchargeRule.create({
        data: {
          customerId: normalisedCustomerId,
          quotationId: normalisedRateCardId,
          charge_type: chargeType,
          unit: unit ? String(unit).trim() || null : null,
          vehicle_type: vehicle_type ? String(vehicle_type).trim() || null : null,
          rate: numericRate,
          currency: currency || 'SAR',
          is_active: is_active ?? true,
          created_by: userId,
        },
        include: surchargeRuleInclude,
      });
    });

    res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    logger.error({ err: error }, 'Failed to create surcharge rule');
    if (error.message === 'CUSTOMER_NOT_FOUND') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'That customer no longer exists' } });
    }
    if (error.message === 'RATE_CARD_NOT_FOUND') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'That rate card no longer exists' } });
    }
    if (error.message === 'RATE_CARD_CUSTOMER_MISMATCH') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'That rate card belongs to a different customer' } });
    }
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to create surcharge rule' } });
  }
};

/**
 * Lists a customer's fee schedule. When rateCardId is also given, returns
 * only the rules that would actually apply to that lane: ones scoped to it
 * specifically, plus the customer's any-lane rules — the same OR the
 * settlement flow and the rate card details page both need.
 */
export const getSurchargeRules = async (req: Request, res: Response) => {
  try {
    const { customerId, quotationId, quotation_id, rateCardId, active_only } = req.query;
    const targetQuotationId = (quotationId || quotation_id || rateCardId) as string | undefined;

    const normalisedCustomerId = customerId ? getValidUuid(customerId as string) : null;
    if (customerId && !normalisedCustomerId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid customer' } });
    }

    const whereClause: any = { deletedAt: null };
    if (normalisedCustomerId) whereClause.customerId = normalisedCustomerId;
    if (active_only === 'true') whereClause.is_active = true;

    if (targetQuotationId) {
      const normalisedRateCardId = getValidUuid(targetQuotationId);
      if (!normalisedRateCardId) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid quotation' } });
      }
      whereClause.OR = [{ quotationId: normalisedRateCardId }, { quotationId: null }];
    }

    const rules = await prisma.surchargeRule.findMany({
      where: whereClause,
      include: surchargeRuleInclude,
      orderBy: [{ charge_type: 'asc' }, { createdAt: 'desc' }],
    });

    res.json({ success: true, data: rules });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch surcharge rules');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch surcharge rules' } });
  }
};

export const getSurchargeRuleById = async (req: Request, res: Response) => {
  try {
    const rule = await prisma.surchargeRule.findFirst({
      where: { id: req.params.id as string, deletedAt: null },
      include: surchargeRuleInclude,
    });
    if (!rule) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Surcharge rule not found' } });
    }
    res.json({ success: true, data: rule });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch surcharge rule' } });
  }
};

export const updateSurchargeRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { customerId, quotationId, quotation_id, rateCardId, charge_type, unit, vehicle_type, rate, currency, is_active } = req.body;
    const targetQuotationId = quotationId ?? quotation_id ?? rateCardId;
    const userId = getValidUuid((req as any).user?.id);

    if (rate !== undefined) {
      const numericRate = Number(rate);
      if (isNaN(numericRate) || numericRate <= 0) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Enter a rate greater than 0' } });
      }
    }
    if (charge_type !== undefined && !String(charge_type).trim()) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Charge type cannot be empty' } });
    }

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.surchargeRule.findFirst({ where: { id: id as string, deletedAt: null } });
      if (!existing) throw new Error('NOT_FOUND');

      const normalisedCustomerId = customerId === undefined ? existing.customerId : getValidUuid(customerId);
      if (!normalisedCustomerId) throw new Error('CUSTOMER_REQUIRED');

      let normalisedRateCardId = existing.quotationId;
      if (targetQuotationId !== undefined) {
        normalisedRateCardId = targetQuotationId ? getValidUuid(targetQuotationId) : null;
        if (normalisedRateCardId) {
          const quotation = await tx.quotation.findFirst({ where: { id: normalisedRateCardId, deletedAt: null } });
          if (!quotation) throw new Error('RATE_CARD_NOT_FOUND');
          if (quotation.customerId !== normalisedCustomerId) throw new Error('RATE_CARD_CUSTOMER_MISMATCH');
        }
      }

      return tx.surchargeRule.update({
        where: { id: id as string },
        data: {
          ...(customerId !== undefined ? { customerId: normalisedCustomerId } : {}),
          ...(targetQuotationId !== undefined ? { quotationId: normalisedRateCardId } : {}),
          ...(charge_type !== undefined ? { charge_type: String(charge_type).trim() } : {}),
          ...(unit !== undefined ? { unit: unit ? String(unit).trim() || null : null } : {}),
          ...(vehicle_type !== undefined ? { vehicle_type: vehicle_type ? String(vehicle_type).trim() || null : null } : {}),
          ...(rate !== undefined ? { rate: Number(rate) } : {}),
          ...(currency !== undefined ? { currency } : {}),
          ...(is_active !== undefined ? { is_active } : {}),
          updated_by: userId,
          version: existing.version + 1,
        },
        include: surchargeRuleInclude,
      });
    });

    res.json({ success: true, data: updated });
  } catch (error: any) {
    if (error.message === 'NOT_FOUND') {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Surcharge rule not found' } });
    }
    if (error.message === 'CUSTOMER_REQUIRED') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Choose which customer this fee is for' } });
    }
    if (error.message === 'RATE_CARD_NOT_FOUND') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'That rate card no longer exists' } });
    }
    if (error.message === 'RATE_CARD_CUSTOMER_MISMATCH') {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'That rate card belongs to a different customer' } });
    }
    logger.error({ err: error }, 'Failed to update surcharge rule');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to update surcharge rule' } });
  }
};

export const deleteSurchargeRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.$transaction([
      prisma.tripCharge.updateMany({ where: { surchargeRuleId: id as string }, data: { surchargeRuleId: null } }),
      prisma.surchargeRule.delete({ where: { id: id as string } })
    ]);
    res.json({ success: true, message: 'Surcharge rule permanently deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete surcharge rule' } });
  }
};

/**
 * Bulk-import a fee schedule — parsed client-side from an .xlsx, posted as
 * JSON, same contract as the other entities' /import routes.
 *
 * The customer must already exist (matched by name, case-insensitive), same
 * reasoning as bulkImportRateCards: this sheet has no way to create one.
 * rate_card is optional and matched by "origin -> destination" against that
 * customer's own lanes when given; omitted means the fee applies to every
 * lane the customer books, which is how most real fee schedules are quoted.
 */
export const bulkImportSurchargeRules = async (req: Request, res: Response) => {
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

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;

      const customerName = String(row.customer_name || '').trim();
      const chargeType = String(row.charge_type || '').trim();
      const unit = String(row.unit || '').trim();
      const vehicleType = String(row.vehicle_type || '').trim();
      const laneText = String(row.applies_to || '').trim();
      const label = [customerName, chargeType, vehicleType || null].filter(Boolean).join(' — ') || `Row ${rowNumber}`;

      try {
        if (!customerName) {
          results.push({ row: rowNumber, success: false, label, error: 'Customer is missing' });
          continue;
        }
        if (!chargeType) {
          results.push({ row: rowNumber, success: false, label, error: 'Charge type is missing' });
          continue;
        }
        const rate = Number(row.rate);
        if (isNaN(rate) || rate <= 0) {
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

        let rateCardId: string | null = null;
        if (laneText) {
          const [originText, destText] = laneText.split('->').map((s) => s.trim());
          if (originText && destText) {
            const matchedRule = await prisma.quotation.findFirst({
              where: {
                deletedAt: null,
                customerId: customer.id,
                stops: {
                  some: { location: { name: { equals: originText, mode: 'insensitive' } } },
                },
              },
            });
            if (matchedRule) rateCardId = matchedRule.id;
          }
        }

        const currency = String(row.currency || '').trim() || 'SAR';
        const data = {
          customerId: customer.id,
          quotationId: rateCardId,
          charge_type: chargeType,
          unit: unit || null,
          vehicle_type: vehicleType || null,
          rate,
          currency,
          is_active: true,
        };

        const existing = await prisma.surchargeRule.findFirst({
          where: {
            deletedAt: null,
            customerId: customer.id,
            quotationId: rateCardId,
            charge_type: { equals: chargeType, mode: 'insensitive' },
            vehicle_type: vehicleType || null,
          },
        });

        if (existing) {
          await prisma.surchargeRule.update({
            where: { id: existing.id },
            data: { ...data, updated_by: userId, version: existing.version + 1 },
          });
          results.push({ row: rowNumber, success: true, label, action: 'updated' });
        } else {
          await prisma.surchargeRule.create({ data: { ...data, created_by: userId } });
          results.push({ row: rowNumber, success: true, label, action: 'created' });
        }
      } catch (err: any) {
        results.push({ row: rowNumber, success: false, label, error: err.message || 'Failed to import this row' });
      }
    }

    const created = results.filter((r) => r.success && r.action === 'created').length;
    const updated = results.filter((r) => r.success && r.action === 'updated').length;
    const failed = results.filter((r) => !r.success).length;

    res.json({ success: true, data: { total: rows.length, created, updated, failed, results } });
  } catch (error) {
    logger.error({ err: error }, 'Failed to import surcharge rules');
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to import surcharge rules' } });
  }
};

/**
 * Distinct charge_type values already in use, optionally scoped to one
 * customer. Backs the frontend's ChargeTypeCombobox: a value typed here once
 * becomes a selectable suggestion everywhere afterward, without needing a
 * separate table of "known" charge types.
 */
export const getDistinctChargeTypes = async (req: Request, res: Response) => {
  try {
    const { customerId } = req.query;
    const normalisedCustomerId = customerId ? getValidUuid(customerId as string) : null;

    const whereClause: any = { deletedAt: null };
    if (normalisedCustomerId) whereClause.customerId = normalisedCustomerId;

    const rows = await prisma.surchargeRule.findMany({
      where: whereClause,
      select: { charge_type: true },
      distinct: ['charge_type'],
      orderBy: { charge_type: 'asc' },
    });

    res.json({ success: true, data: rows.map((r) => r.charge_type) });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to fetch charge types' } });
  }
};
