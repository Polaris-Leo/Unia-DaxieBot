const test = require('node:test');
const assert = require('node:assert/strict');
const { createStateStore } = require('../src/main/state-store.cjs');

test('publicState excludes private cookies', () => {
  const store = createStateStore({ initialState: { cookies: { SESSDATA: 'secret' }, status: 'ready', importedFonts: [] } });
  assert.equal(store.publicState().cookies, undefined);
  assert.equal(store.publicState().status, 'ready');
});

test('patch changes state and broadcasts the public value', () => {
  let broadcastValue;
  const store = createStateStore({ initialState: { cookies: {}, status: 'idle' }, onBroadcast: value => { broadcastValue = value; } });
  store.patch({ status: 'ready' });
  assert.equal(store.getState().status, 'ready');
  assert.equal(broadcastValue.status, 'ready');
});
