import test from 'node:test';
import assert from 'node:assert/strict';

function buildMobileTripWhereClause(driverId: string | undefined, idStr: string) {
  if (!driverId) {
    return { error: 'Driver not authenticated', status: 403 as const };
  }
  return {
    where: {
      driverId,
      OR: [
        { id: idStr },
        { ref_id: idStr }
      ],
      deletedAt: null
    }
  };
}

test('Mobile Trip Details Business Logic Unit Tests', async (t) => {
  await t.test('1. Unauthenticated request without driver_id is rejected with 403', () => {
    const res = buildMobileTripWhereClause(undefined, 'trip-123');
    assert.equal(res.status, 403);
    assert.equal('error' in res ? res.error : '', 'Driver not authenticated');
  });

  await t.test('2. Authenticated request incorporates driverId into trip query for UUID lookup', () => {
    const res = buildMobileTripWhereClause('driver-uuid-1', '550e8400-e29b-41d4-a716-446655440000');
    assert.equal('where' in res, true);
    if ('where' in res && res.where) {
      assert.equal(res.where.driverId, 'driver-uuid-1');
      assert.deepEqual(res.where.OR, [
        { id: '550e8400-e29b-41d4-a716-446655440000' },
        { ref_id: '550e8400-e29b-41d4-a716-446655440000' }
      ]);
    }
  });

  await t.test('3. Authenticated request incorporates driverId into trip query for ref_id lookup', () => {
    const res = buildMobileTripWhereClause('driver-uuid-1', 'TRP-1002');
    assert.equal('where' in res, true);
    if ('where' in res && res.where) {
      assert.equal(res.where.driverId, 'driver-uuid-1');
      assert.deepEqual(res.where.OR, [
        { id: 'TRP-1002' },
        { ref_id: 'TRP-1002' }
      ]);
    }
  });
});
