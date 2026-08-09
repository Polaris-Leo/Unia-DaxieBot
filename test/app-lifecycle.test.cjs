const test = require('node:test');
const assert = require('node:assert/strict');
const { createShutdown } = require('../src/main/app-lifecycle.cjs');

test('shutdown releases resources only once', async () => {
  const calls = [];
  const shutdown = createShutdown({ disconnectLive: async () => calls.push('live'), disposeUpdates: () => calls.push('updates'), closeServer: () => calls.push('server'), destroyOverlay: () => calls.push('overlay'), quit: () => calls.push('quit') });
  await Promise.all([shutdown(), shutdown()]);
  assert.deepEqual(calls, ['live', 'updates', 'server', 'overlay', 'quit']);
});
