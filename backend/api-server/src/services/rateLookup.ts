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
    // Tonnage tier / booking-type filters. `undefined` means "caller doesn't
    // know/care" — matches any card for the lane, same as before this field
    // existed. `null` means "match only cards with no tier set" — the
    // "applies regardless" case. A string filters to that exact tier. Passing
    // these is what lets a lane with several tiers (6 TON vs 10 TON, one-way
    // vs round trip) resolve to the *right* card instead of "whichever was
    // updated most recently", which used to ignore both dimensions entirely.
    vehicleType?: string | null;
    rateCategory?: string | null;
  }
): Promise<{ rateCard: any | null; source: RateSource }> => {
  const { customerId, originLocationId, destinationLocationId, vehicleType, rateCategory } = params;

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
      ...(vehicleType !== undefined ? { vehicle_type: vehicleType } : {}),
      ...(rateCategory !== undefined ? { rate_category: rateCategory } : {}),
    },
    include: rateCardInclude,
    orderBy: { updatedAt: 'desc' },
  });

  return customerCard ? { rateCard: customerCard, source: 'customer' } : { rateCard: null, source: null };
};
