import { Request, Response } from 'express';
import { prisma } from '../index';
import { getValidUuid } from '../utils/uuid';
import { logger } from '../utils/logger';

const surchargeRuleInclude = {
  customer: { select: { id: true, name: true } },
  rateCard: { select: { id: true, name: true, route_origin: true, route_destination: true } },
} as const;

export const createSurchargeRule = async (req: Request, res: Response) => {
  try {
    const { customerId, rateCardId, charge_type, unit, vehicle_type, rate, currency, is_active } = req.body;
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

    const normalisedRateCardId = rateCardId ? getValidUuid(rateCardId) : null;

    const created = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findFirst({ where: { id: normalisedCustomerId, deletedAt: null } });
      if (!customer) throw new Error('CUSTOMER_NOT_FOUND');

      if (normalisedRateCardId) {
        const rateCard = await tx.rateCard.findFirst({ where: { id: normalisedRateCardId, deletedAt: null } });
        if (!rateCard) throw new Error('RATE_CARD_NOT_FOUND');
        if (rateCard.customerId !== normalisedCustomerId) throw new Error('RATE_CARD_CUSTOMER_MISMATCH');
      }

      return tx.surchargeRule.create({
        data: {
          customerId: normalisedCustomerId,
          rateCardId: normalisedRateCardId,
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
    const { customerId, rateCardId, active_only } = req.query;

    const normalisedCustomerId = customerId ? getValidUuid(customerId as string) : null;
    if (customerId && !normalisedCustomerId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid customer' } });
    }

    const whereClause: any = { deletedAt: null };
    if (normalisedCustomerId) whereClause.customerId = normalisedCustomerId;
    if (active_only === 'true') whereClause.is_active = true;

    if (rateCardId) {
      const normalisedRateCardId = getValidUuid(rateCardId as string);
      if (!normalisedRateCardId) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid rate card' } });
      }
      whereClause.OR = [{ rateCardId: normalisedRateCardId }, { rateCardId: null }];
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
    const { customerId, rateCardId, charge_type, unit, vehicle_type, rate, currency, is_active } = req.body;
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

      let normalisedRateCardId = existing.rateCardId;
      if (rateCardId !== undefined) {
        normalisedRateCardId = rateCardId ? getValidUuid(rateCardId) : null;
        if (normalisedRateCardId) {
          const rateCard = await tx.rateCard.findFirst({ where: { id: normalisedRateCardId, deletedAt: null } });
          if (!rateCard) throw new Error('RATE_CARD_NOT_FOUND');
          if (rateCard.customerId !== normalisedCustomerId) throw new Error('RATE_CARD_CUSTOMER_MISMATCH');
        }
      }

      return tx.surchargeRule.update({
        where: { id: id as string },
        data: {
          ...(customerId !== undefined ? { customerId: normalisedCustomerId } : {}),
          ...(rateCardId !== undefined ? { rateCardId: normalisedRateCardId } : {}),
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
    const userId = getValidUuid((req as any).user?.id);

    await prisma.surchargeRule.update({
      where: { id: id as string },
      data: { deletedAt: new Date(), deleted_by: userId, is_active: false },
    });
    res.json({ success: true, message: 'Surcharge rule deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Failed to delete surcharge rule' } });
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
