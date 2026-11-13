import test from 'node:test';
import assert from 'node:assert/strict';
import { complaintTemplate, disputeTemplate } from '../src/services/letters.js';

test('complaint template contains key facts', () => {
  const t = complaintTemplate({ department: 'PWD', category: 'Pothole', priority: 8, severity: 'high', lat: 11.34, lng: 77.71, description: 'Big hole' });
  assert.match(t, /To The Officer In Charge/);
  assert.match(t, /Big hole/);
});
test('dispute template asks for inspection without accusing', () => {
  const t = disputeTemplate({ tender: { department: 'PWD', tenderId: 'T-1', title: 'Road', contractor: 'ACME', warranty: '3y' }, category: 'Other', description: 'Cracks', userName: 'A' });
  assert.match(t, /inspection/i);
  assert.doesNotMatch(t, /corrupt|fraud|steal/i);
});
