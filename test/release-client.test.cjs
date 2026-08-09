const test = require('node:test');
const assert = require('node:assert/strict');
const { sourceUrl, normalizeRelease } = require('../src/main/update/release-client.cjs');

test('sourceUrl prefixes proxy exactly once', () => {
  const official = 'https://api.github.com/repos/Polaris-Leo/Unia-DaxieBot/releases/latest';
  assert.equal(sourceUrl('proxy', official), `https://gh-proxy.com/${official}`);
  assert.equal(sourceUrl('proxy', `https://gh-proxy.com/${official}`), `https://gh-proxy.com/${official}`);
});

test('normalizeRelease keeps trusted program assets', () => {
  const base = 'https://github.com/Polaris-Leo/Unia-DaxieBot/releases/download/v1.0.2/';
  const result = normalizeRelease({ tag_name: 'v1.0.2', name: 'Release', draft: false, prerelease: false, html_url: 'https://github.com/Polaris-Leo/Unia-DaxieBot/releases/tag/v1.0.2', assets: [
    { id: 1, name: 'Unia-DaxieBot-1.0.2-Setup.exe', size: 10, browser_download_url: `${base}Unia-DaxieBot-1.0.2-Setup.exe` },
    { id: 2, name: 'Unia-DaxieBot-1.0.2-Portable.exe', size: 8, browser_download_url: `${base}Unia-DaxieBot-1.0.2-Portable.exe` },
    { id: 3, name: 'source.zip', size: 4, browser_download_url: `${base}source.zip` }
  ] }, '1.0.1');
  assert.deepEqual(result.assets.map(asset => asset.type), ['installed', 'portable']);
  assert.equal(result.updateAvailable, true);
});
