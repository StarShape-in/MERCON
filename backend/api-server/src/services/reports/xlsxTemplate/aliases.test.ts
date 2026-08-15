import { test } from 'node:test';
import assert from 'node:assert/strict';
import { suggestField } from './aliases';

// Regression coverage for a reported bug: a real customer template ("IMILE
// VEHICLE RENTAL DETAILS OF MAY 2026") had its title banner misread as 12
// duplicate headers (a separate merged-cell bug in inspect.ts), and because
// the banner text contains the word "vehicle", the old raw-substring fuzzy
// match in suggestField resolved every single one of them to vehicle_plate.
// These cases lock in the fix so it can't silently regress.

test('suggestField does not false-positive on short aliases appearing inside unrelated words', () => {
  // "to" (destination) must not match inside "ton" — old behavior matched.
  assert.equal(suggestField('10 TON'), null);
  assert.equal(suggestField('05Ton'), null);
  assert.equal(suggestField('03Ton'), null);

  // "no" (serial) must not match a header where it's one word among several
  // unrelated ones — old behavior matched via raw substring.
  assert.equal(suggestField('NO OF Vehicles'), null);
  assert.equal(suggestField('Not Active'), null);
});

test('suggestField prefers the more specific alias across fields, not the first field with any hit', () => {
  // "vehicle" alone (vehicle_plate) is a weaker match than the two-word
  // phrase "vehicle type" (vehicle_type) — old behavior always returned
  // vehicle_plate here since it's earlier in TRIP_FIELD_ALIASES declaration
  // order and "vehicle" is a substring of the header.
  assert.equal(suggestField('Type of vehicle'), 'vehicle_type');
});

test('suggestField still resolves clean, unambiguous headers correctly', () => {
  assert.equal(suggestField('Plate'), 'vehicle_plate');
  assert.equal(suggestField('DATE'), 'date');
  assert.equal(suggestField('DESTINATION'), 'destination');
  assert.equal(suggestField('CHARGES'), 'billing_amount');
  assert.equal(suggestField('Vehicle No'), 'vehicle_plate'); // exact alias match
});

test('a banner sentence containing a generic word does not match at all (word-count too skewed)', () => {
  // The actual banner text that triggered the bug — even though it contains
  // the standalone word "vehicle", the overlap ratio against any single-word
  // or two-word alias is far below the acceptance threshold once the header
  // has 7 unrelated words.
  assert.equal(suggestField('IMILE VEHICLE RENTAL DETAILS OF MAY 2026'), null);
});
