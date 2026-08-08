import { Prisma } from '@prisma/client';

/**
 * The one rule for "what does this lane cost for this customer".
 *
 * A rate card with no customer is the STANDARD price for that lane and applies
 * to everyone; a card WITH a customer overrides the standard one for that
 * customer only. So the order is always: the customer's card for the lane →
 * the standard card for the lane → nothing.
 *
 * It lives in a service rather than in rateCardController because trip
 * creation, invoicing and the rate-card API all need it, and importing a
 * controller from tripLifecycle would pull in `index.ts` (and the express app)
 * at module load. When these three each had their own rule, the invoice could
 * quote a price the dispatcher was never shown at dispatch.
 */

export const rateCardInclude = {
  customer: { select: { id: true, name: true } },
  originLocation: { select: { id: true, name: true, lat: true, lng: true } },
  destinationLocation: { select: { id: true, name: true, lat: true, lng: true } },
};

/** Accepts the PrismaClient or a transaction client — both expose `rateCard`. */
type RateCardClient = Pick<Prisma.TransactionClient, 'rateCard'>;

export type RateSource = 'customer' | 'standard' | null;

export const findRateForLane = async (
  tx: RateCardClient,
  params: {
    customerId?: string | null;
    originLocationId?: string | null;
    destinationLocationId?: string | null;
  }
): Promise<{ rateCard: any | null; source: RateSource }> => {
  const { customerId, originLocationId, destinationLocationId } = params;

  // A lane needs both ends to be priceable. Returning null here is what makes
  // the wizard show "no rate for this lane yet" instead of falling through to
  // an unrelated card, which is what the old `includes()` matching did.
  if (!originLocationId || !destinationLocationId) {
    return { rateCard: null, source: null };
  }

  const lane = {
    originLocationId,
    destinationLocationId,
    is_active: true,
    deletedAt: null,
  };

  if (customerId) {
    const customerCard = await tx.rateCard.findFirst({
      where: { ...lane, customerId },
      include: rateCardInclude,
      orderBy: { updatedAt: 'desc' },
    });
    if (customerCard) return { rateCard: customerCard, source: 'customer' };
  }

  const standardCard = await tx.rateCard.findFirst({
    where: { ...lane, customerId: null },
    include: rateCardInclude,
    orderBy: { updatedAt: 'desc' },
  });
  if (standardCard) return { rateCard: standardCard, source: 'standard' };

  return { rateCard: null, source: null };
};
