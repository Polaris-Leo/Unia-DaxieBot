const test = require('node:test');
const assert = require('node:assert/strict');
const { providerOptions } = require('../src/main/update/installed-updater.cjs');

test('providerOptions configures official GitHub source', () => {
  assert.deepEqual(providerOptions('official'), { provider: 'github', owner: 'Polaris-Leo', repo: 'Unia-DaxieBot' });
});

test('providerOptions configures proxy generic source', () => {
  assert.deepEqual(providerOptions('proxy'), { provider: 'generic', url: 'https://gh-proxy.com/https://github.com/Polaris-Leo/Unia-DaxieBot/releases/latest/download/' });
});
