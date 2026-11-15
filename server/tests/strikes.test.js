import test from 'node:test';
import assert from 'node:assert/strict';
import { User } from '../src/models/User.js';
import { requireGoodStanding } from '../src/middleware/auth.js';

test('citizen with 0 strikes has active good standing', () => {
  const u = new User({ name: 'Alice', email: 'alice@test.com', passwordHash: 'hash', role: 'citizen' });
  const status = u.getRestrictionStatus();
  assert.equal(status.isRestricted, false);
  assert.equal(status.status, 'active');
  assert.equal(status.strikes, 0);
});

test('citizen with 1 strike has warned status but is NOT restricted', () => {
  const u = new User({ name: 'Bob', email: 'bob@test.com', passwordHash: 'hash', role: 'citizen', strikes: 1, status: 'warned' });
  const status = u.getRestrictionStatus();
  assert.equal(status.isRestricted, false);
  assert.equal(status.status, 'warned');
  assert.equal(status.strikes, 1);
});

test('citizen with 2 strikes and active future cooldown is suspended and restricted', () => {
  const future = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  const u = new User({
    name: 'Charlie',
    email: 'charlie@test.com',
    passwordHash: 'hash',
    role: 'citizen',
    strikes: 2,
    status: 'suspended',
    suspendedUntil: future,
  });
  const status = u.getRestrictionStatus();
  assert.equal(status.isRestricted, true);
  assert.equal(status.status, 'suspended');
  assert.equal(status.strikes, 2);
  assert.ok(status.suspendedUntil);
});

test('citizen with 2 strikes whose cooldown expired is restored to non-restricted warned standing', () => {
  const past = new Date(Date.now() - 3600 * 1000);
  const u = new User({
    name: 'Dave',
    email: 'dave@test.com',
    passwordHash: 'hash',
    role: 'citizen',
    strikes: 2,
    status: 'suspended',
    suspendedUntil: past,
  });
  const status = u.getRestrictionStatus();
  assert.equal(status.isRestricted, false);
  assert.equal(status.status, 'warned');
});

test('citizen with 3+ strikes is banned and restricted indefinitely, and strikes clamp to 3', () => {
  const u = new User({
    name: 'Eve',
    email: 'eve@test.com',
    passwordHash: 'hash',
    role: 'citizen',
    strikes: 4,
    status: 'banned',
  });
  const status = u.getRestrictionStatus();
  assert.equal(status.isRestricted, true);
  assert.equal(status.status, 'banned');
  assert.equal(status.strikes, 3);
  const pub = u.toPublic();
  assert.equal(pub.strikes, 3);
});

test('manually blocked user is restricted regardless of strikes', () => {
  const u = new User({
    name: 'Frank',
    email: 'frank@test.com',
    passwordHash: 'hash',
    role: 'citizen',
    strikes: 0,
    isBlocked: true,
    blockReason: 'Spamming system',
  });
  const status = u.getRestrictionStatus();
  assert.equal(status.isRestricted, true);
  assert.equal(status.status, 'banned');
  assert.match(status.reason, /Spamming system/);
});

test('requireGoodStanding passes for active citizen and blocks restricted citizen', () => {
  const activeUser = new User({ name: 'Active', email: 'a@test.com', passwordHash: 'h', role: 'citizen' });
  let nextCalled = false;
  requireGoodStanding({ user: activeUser }, {}, (err) => {
    assert.equal(err, undefined);
    nextCalled = true;
  });
  assert.equal(nextCalled, true);

  const bannedUser = new User({ name: 'Banned', email: 'b@test.com', passwordHash: 'h', role: 'citizen', strikes: 3, status: 'banned' });
  let blockedErr = null;
  requireGoodStanding({ user: bannedUser }, {}, (err) => {
    blockedErr = err;
  });
  assert.ok(blockedErr);
  assert.equal(blockedErr.status, 403);
});
