import { Prisma } from '@prisma/client';

/**
 * The one rule for "what does this lane cost for this customer".
 *
 * Every quotation belongs to exactly one customer — there is no all-customers
 * "standard" rate to fall back to, so a lane with no quotation for this customer
 * simply has no price yet.
 */

export const quotationInclude = {
  customer: { select: { id: true, name: true } },
  stops: {
    include: {
      location: { select: { id: true, name: true, lat: true, lng: true } },
    },
    orderBy: { sequence: 'asc' as const },
  },
};

/**
 * @deprecated Legacy compatibility alias. Use `quotationInclude` instead.
 * TODO: Remove when legacy rate-cards references are fully deprecated.
 */
export const pricingRuleInclude = quotationInclude;

/**
 * @deprecated Legacy compatibility alias. Use `quotationInclude` instead.
 * TODO: Remove when legacy rate-cards references are fully deprecated.
 */
export const rateCardInclude = quotationInclude;

/** Accepts the PrismaClient or a transaction client — both expose `quotation`. */
type QuotationClient = Pick<Prisma.TransactionClient, 'quotation'>;

export type RateSource = 'customer' | null;

export const findQuotationForLane = async (
  tx: QuotationClient,
  params: {
    customerId?: string | null;
    originLocationId?: string | null;
    destinationLocationId?: string | null;
    vehicleType?: string | null;
    vehicleClass?: string | null;
    sourceVehicleLabel?: string | null;
    rateCategory?: string | null;
    lineType?: string | null;
    billingType?: string | null;
  }
): Promise<{ quotation: any | null; pricingRule: any | null; rateCard: any | null; source: RateSource }> => {
  const { customerId, originLocationId, destinationLocationId } = params;
  const lineType = params.lineType || params.rateCategory;
  const vehicleClass = params.vehicleClass;
  const sourceVehicleLabel = params.sourceVehicleLabel || params.vehicleType;
  const billingType = params.billingType;

  if (!customerId) {
    return { quotation: null, pricingRule: null, rateCard: null, source: null };
  }

  const whereClause: Prisma.QuotationWhereInput = {
    customerId,
    is_active: true,
    deletedAt: null,
  };

  if (lineType && lineType.trim()) {
    whereClause.line_type = lineType.trim();
  }
  if (billingType && billingType.trim()) {
    whereClause.billing_type = billingType.trim();
  }
  if (vehicleClass !== undefined && vehicleClass !== null) {
    whereClause.vehicle_class = vehicleClass;
  } else if (sourceVehicleLabel !== undefined && sourceVehicleLabel !== null) {
    whereClause.source_vehicle_label = sourceVehicleLabel;
  }

  if (originLocationId && destinationLocationId) {
    whereClause.AND = [
      { stops: { some: { locationId: originLocationId, sequence: 1 } } },
      { stops: { some: { locationId: destinationLocationId } } },
    ];
  }

  const q = await tx.quotation.findFirst({
    where: whereClause,
    include: quotationInclude,
    orderBy: { updatedAt: 'desc' },
  });

  return q ? { quotation: q, pricingRule: q, rateCard: q, source: 'customer' } : { quotation: null, pricingRule: null, rateCard: null, source: null };
};

/**
 * @deprecated Legacy compatibility alias. Use `findQuotationForLane` instead.
 * TODO: Remove when legacy rate-cards references are fully deprecated.
 */
export const findPricingRuleForLane = findQuotationForLane;

/**
 * @deprecated Legacy compatibility alias. Use `findQuotationForLane` instead.
 * TODO: Remove when legacy rate-cards references are fully deprecated.
 */
export const findRateForLane = findQuotationForLane;
