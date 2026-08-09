const test = require('node:test');
const assert = require('node:assert/strict');
const { detectRuntimeType, filterAssetsForRuntime, withAutomaticSource } = require('../src/main/update/runtime.cjs');

test('detectRuntimeType distinguishes development, portable and installed', () => {
  assert.equal(detectRuntimeType({ isPackaged: false }, {}), 'development');
  assert.equal(detectRuntimeType({ isPackaged: true }, { PORTABLE_EXECUTABLE_FILE: 'app.exe' }), 'portable');
  assert.equal(detectRuntimeType({ isPackaged: true }, {}), 'installed');
});

test('filterAssetsForRuntime keeps only the current package type', () => {
  const assets = [{ type: 'installed' }, { type: 'portable' }];
  assert.deepEqual(filterAssetsForRuntime(assets, 'installed'), [{ type: 'installed' }]);
  assert.deepEqual(filterAssetsForRuntime(assets, 'portable'), [{ type: 'portable' }]);
});

test('withAutomaticSource falls back from proxy to official', async () => {
  const attempts = [];
  const result = await withAutomaticSource(async source => { attempts.push(source); if (source === 'proxy') throw new Error('proxy down'); return 'ok'; });
  assert.deepEqual(attempts, ['proxy', 'official']);
  assert.deepEqual(result, { value: 'ok', source: 'official' });
});
