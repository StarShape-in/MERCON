import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { resolveDriverPayout } from '../utils/tripFinancials';

describe('resolveDriverPayout', () => {
  it('an explicit requested payout always wins, even over a third-party subcontract cost', () => {
    const result = resolveDriverPayout({
      currentDriverPayout: 500,
      isThirdParty: true,
      subcontractCost: 900,
      requestedPayoutRaw: 750,
    });
    assert.equal(result, 750);
  });

  it('an explicit requested payout of 0 still wins over the current payout', () => {
    const result = resolveDriverPayout({
      currentDriverPayout: 500,
      isThirdParty: false,
      subcontractCost: null,
      requestedPayoutRaw: 0,
    });
    assert.equal(result, 0);
  });

  it('an explicit but unparseable requested payout falls back to 0, not the current payout', () => {
    const result = resolveDriverPayout({
      currentDriverPayout: 500,
      isThirdParty: false,
      subcontractCost: null,
      requestedPayoutRaw: 'not-a-number',
    });
    assert.equal(result, 0);
  });

  it('a third-party trip with no explicit value uses the subcontract cost', () => {
    const result = resolveDriverPayout({
      currentDriverPayout: 500,
      isThirdParty: true,
      subcontractCost: 900,
      requestedPayoutRaw: undefined,
    });
    assert.equal(result, 900);
  });

  it('a third-party trip with no subcontract cost falls back to the current payout', () => {
    const result = resolveDriverPayout({
      currentDriverPayout: 500,
      isThirdParty: true,
      subcontractCost: null,
      requestedPayoutRaw: undefined,
    });
    assert.equal(result, 500);
  });

  it('a non-third-party trip with no explicit value keeps the current payout', () => {
    const result = resolveDriverPayout({
      currentDriverPayout: 500,
      isThirdParty: false,
      subcontractCost: undefined,
      requestedPayoutRaw: undefined,
    });
    assert.equal(result, 500);
  });

  it('accepts a Prisma Decimal-like value (toNumber()) for currentDriverPayout and subcontractCost', () => {
    const decimal = (n: number) => ({ toNumber: () => n });
    const fromCurrent = resolveDriverPayout({
      currentDriverPayout: decimal(321),
      isThirdParty: false,
      subcontractCost: undefined,
      requestedPayoutRaw: undefined,
    });
    assert.equal(fromCurrent, 321);

    const fromSubcontract = resolveDriverPayout({
      currentDriverPayout: 0,
      isThirdParty: true,
      subcontractCost: decimal(654),
      requestedPayoutRaw: undefined,
    });
    assert.equal(fromSubcontract, 654);
  });

  it('a missing current payout with no other input resolves to 0', () => {
    const result = resolveDriverPayout({
      currentDriverPayout: undefined,
      isThirdParty: false,
      subcontractCost: undefined,
      requestedPayoutRaw: undefined,
    });
    assert.equal(result, 0);
  });
});
