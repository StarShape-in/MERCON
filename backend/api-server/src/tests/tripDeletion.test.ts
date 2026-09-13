import test from 'node:test';
import assert from 'node:assert/strict';
import { isFinanciallyProtectedTrip } from '../controllers/tripController';

test('Financial Protection Unit Tests', async (t) => {
  await t.test('1. Draft trip is not financially protected', () => {
    const trip = { status: 'Draft', is_post_trip_settled: false, paid_amount: 0 };
    assert.equal(isFinanciallyProtectedTrip(trip), false);
  });

  await t.test('2. Scheduled trip is not financially protected', () => {
    const trip = { status: 'Scheduled', is_post_trip_settled: false, paid_amount: 0 };
    assert.equal(isFinanciallyProtectedTrip(trip), false);
  });

  await t.test('3. Operational InTransit trip is not financially protected', () => {
    const trip = { status: 'InTransit', is_post_trip_settled: false, paid_amount: 0 };
    assert.equal(isFinanciallyProtectedTrip(trip), false);
  });

  await t.test('4. Invoiced trip IS financially protected', () => {
    const trip = { status: 'Invoiced', is_post_trip_settled: false, paid_amount: 0 };
    assert.equal(isFinanciallyProtectedTrip(trip), true);
  });

  await t.test('5. Paid trip IS financially protected', () => {
    const trip = { status: 'Completed', is_post_trip_settled: false, paid_amount: 500 };
    assert.equal(isFinanciallyProtectedTrip(trip), true);
  });

  await t.test('6. Post-trip settled trip IS financially protected', () => {
    const trip = { status: 'Completed', is_post_trip_settled: true, paid_amount: 0 };
    assert.equal(isFinanciallyProtectedTrip(trip), true);
  });

  await t.test('7. Mixed array correctly identifies protected vs eligible trips', () => {
    const trips = [
      { id: '1', status: 'Draft' },
      { id: '2', status: 'Scheduled' },
      { id: '3', status: 'InTransit' },
      { id: '4', status: 'Invoiced' },
      { id: '5', status: 'Completed', is_post_trip_settled: true },
      { id: '6', status: 'Completed', paid_amount: 250 },
    ];

    const eligible = trips.filter(t => !isFinanciallyProtectedTrip(t));
    const protectedList = trips.filter(t => isFinanciallyProtectedTrip(t));

    assert.equal(eligible.length, 3);
    assert.equal(protectedList.length, 3);
    assert.deepEqual(eligible.map(e => e.id), ['1', '2', '3']);
    assert.deepEqual(protectedList.map(p => p.id), ['4', '5', '6']);
  });
});
