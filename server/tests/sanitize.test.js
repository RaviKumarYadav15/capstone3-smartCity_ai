import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeIssueReport, sanitizeTenderBreakdown, sanitizePrediction } from '../src/utils/sanitize.js';

test('AI issue output is clamped to a known shape', () => {
  const r = sanitizeIssueReport({ category: '<script>', severity: 'BANANA', priority: '99', description: 'x'.repeat(9999) });
  assert.equal(r.isValid, true);
  assert.equal(r.category, 'other');
  assert.equal(r.severity, 'medium');
  assert.equal(r.priority, 10);
  assert.equal(r.description.length, 500);
  assert.equal(r.department, 'Municipal Corporation');
});

test('rejects non-civic image with descriptive reason', () => {
  const r = sanitizeIssueReport({ isValid: false, rejectionReason: 'Photo shows a domestic cat, not an infrastructure issue.' });
  assert.equal(r.isValid, false);
  assert.match(r.rejectionReason, /domestic cat/);
});

test('tender breakdown sums to the budget and recomputes shares', () => {
  const r = sanitizeTenderBreakdown({ table: [{ component: 'A', amount: 70, share: '999%' }, { component: 'B', amount: 20 }, { component: 'C', amount: 15 }] }, 1000);
  assert.equal(r.table.reduce((s, x) => s + x.amount, 0), 1000);
  assert.ok(!r.table.some((x) => x.share === '999%'));
  assert.equal(r.estimate, true);
});

test('empty or invalid breakdown returns null', () => {
  assert.equal(sanitizeTenderBreakdown({ table: [] }, 1000), null);
  assert.equal(sanitizeTenderBreakdown({ table: [{ component: 'A', amount: 5 }] }, 0), null);
});

test('prediction enums fall back safely', () => {
  const p = sanitizePrediction({ trend: 'explode', risk_level: 'extreme' });
  assert.equal(p.trend, 'stable');
  assert.equal(p.riskLevel, 'medium');
});
