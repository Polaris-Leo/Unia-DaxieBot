const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeVersion, compareVersions } = require('../src/main/update/version.cjs');

test('compareVersions handles v-prefixed semver', () => assert.equal(compareVersions('v1.0.2', '1.0.1'), 1));
test('normalizeVersion rejects malformed versions', () => assert.equal(normalizeVersion('release-new'), null));
