import test from 'node:test';
import assert from 'node:assert/strict';
import { healthScore, healthLabel } from '../src/services/health.js';

test('no open issues -> 100', () => assert.equal(healthScore({}), 100));
test('penalties apply to open issues only and clamp at 0', () => {
  assert.equal(healthScore({ openCritical: 1, openHigh: 1, openOther: 2 }), 100 - 15 - 8 - 4);
  assert.equal(healthScore({ openCritical: 20 }), 0);
});
test('labels', () => {
  assert.equal(healthLabel(95), 'Excellent');
  assert.equal(healthLabel(10), 'Critical');
});
