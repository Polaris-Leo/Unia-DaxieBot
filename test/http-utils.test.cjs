const test = require('node:test');
const assert = require('node:assert/strict');
const { mime } = require('../src/main/http-utils.cjs');

test('mime recognizes renderer assets', () => {
  assert.equal(mime('app.js'), 'text/javascript; charset=utf-8');
  assert.equal(mime('styles.css'), 'text/css; charset=utf-8');
});
