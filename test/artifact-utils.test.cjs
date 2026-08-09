const test = require('node:test');
const assert = require('node:assert/strict');
const { isPortableArtifact } = require('../scripts/artifact-utils.cjs');

test('isPortableArtifact accepts the release filename', () => {
  assert.equal(isPortableArtifact('Unia-DaxieBot-1.0.1-Portable.exe'), true);
  assert.equal(isPortableArtifact('builder-debug.yml'), false);
});
