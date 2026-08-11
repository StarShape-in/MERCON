import { Prisma } from '@prisma/client';

/**
 * The one rule for "what does this lane cost for this customer".
 *
 * Every rate card belongs to exactly one customer — there is no all-customers
 * "standard" rate to fall back to, so a lane with no card for this customer
 * simply has no price yet.
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

export type RateSource = 'customer' | null;

export const findRateForLane = async (
  tx: RateCardClient,
  params: {
    customerId?: string | null;
    originLocationId?: string | null;
    destinationLocationId?: string | null;
  }
): Promise<{ rateCard: any | null; source: RateSource }> => {
  const { customerId, originLocationId, destinationLocationId } = params;

  // A lane needs both ends and a customer to be priceable. Returning null here
  // is what makes the wizard show "no rate for this lane yet" instead of
  // falling through to an unrelated card.
  if (!customerId || !originLocationId || !destinationLocationId) {
    return { rateCard: null, source: null };
  }

  const customerCard = await tx.rateCard.findFirst({
    where: {
      customerId,
      originLocationId,
      destinationLocationId,
      is_active: true,
      deletedAt: null,
    },
    include: rateCardInclude,
    orderBy: { updatedAt: 'desc' },
  });

  return customerCard ? { rateCard: customerCard, source: 'customer' } : { rateCard: null, source: null };
};
