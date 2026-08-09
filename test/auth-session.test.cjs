const test = require('node:test');
const assert = require('node:assert/strict');
const { createAuthSession } = require('../src/main/auth-session.cjs');

test('starting or invalidating a session makes older tokens stale', () => {
  const sessions = createAuthSession();
  const first = sessions.begin();
  assert.equal(sessions.isActive(first), true);

  const second = sessions.begin();
  assert.equal(sessions.isActive(first), false);
  assert.equal(sessions.isActive(second), true);

  sessions.invalidate();
  assert.equal(sessions.isActive(second), false);
});
