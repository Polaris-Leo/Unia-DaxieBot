const test = require('node:test');
const assert = require('node:assert/strict');
const { formatBytes, selectVisibleAssets } = require('../src/renderer/app/update-controls.js');

test('formatBytes formats release sizes', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(1048576), '1.0 MB');
});

test('selectVisibleAssets hides actions without a newer version', () => {
  assert.deepEqual(selectVisibleAssets({ updateAvailable: false, runtimeType: 'portable', assets: [{ type: 'portable' }] }), []);
});

test('selectVisibleAssets keeps only the active runtime package', () => {
  const assets = [{ type: 'installed' }, { type: 'portable' }];
  assert.deepEqual(selectVisibleAssets({ updateAvailable: true, runtimeType: 'installed', assets }), [{ type: 'installed' }]);
  assert.deepEqual(selectVisibleAssets({ updateAvailable: true, runtimeType: 'portable', assets }), [{ type: 'portable' }]);
});
