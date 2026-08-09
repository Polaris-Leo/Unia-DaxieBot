const test = require('node:test');
const assert = require('node:assert/strict');
const { validatePortableAsset, portableDownloadUrl } = require('../src/main/update/portable-downloader.cjs');

test('validatePortableAsset accepts only normalized portable executables', () => {
  assert.equal(validatePortableAsset({ type: 'portable', name: 'Unia-DaxieBot-1.0.2-Portable.exe', size: 10, downloadUrl: 'https://github.com/Polaris-Leo/Unia-DaxieBot/releases/download/v1.0.2/Unia-DaxieBot-1.0.2-Portable.exe' }), true);
  assert.equal(validatePortableAsset({ type: 'installed', name: 'bad.exe' }), false);
});

test('portableDownloadUrl supports explicit proxy source', () => {
  const url = 'https://github.com/Polaris-Leo/Unia-DaxieBot/releases/download/v1.0.2/a.exe';
  assert.equal(portableDownloadUrl({ downloadUrl: url }, 'proxy'), `https://gh-proxy.com/${url}`);
});
