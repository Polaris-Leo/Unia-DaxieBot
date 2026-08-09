const test = require('node:test');
const assert = require('node:assert/strict');
const { formatBytes } = require('../src/renderer/app/update-controls.js');

test('formatBytes formats release sizes', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(1048576), '1.0 MB');
});
