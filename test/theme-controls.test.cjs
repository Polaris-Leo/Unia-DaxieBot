const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeTheme, applyTheme } = require('../src/renderer/app/theme-controls.js');

test('normalizeTheme defaults missing and invalid values to light', () => {
  assert.equal(normalizeTheme(), 'light');
  assert.equal(normalizeTheme('system'), 'light');
});

test('normalizeTheme preserves the supported dark theme', () => {
  assert.equal(normalizeTheme('dark'), 'dark');
});

test('applyTheme updates the document theme and selection state', () => {
  const buttons = [
    { dataset: { themeChoice: 'light' }, setAttribute(name, value) { this[name] = value; } },
    { dataset: { themeChoice: 'dark' }, setAttribute(name, value) { this[name] = value; } }
  ];
  const document = {
    documentElement: { dataset: {} },
    querySelectorAll: () => buttons
  };

  assert.equal(applyTheme(document, 'dark'), 'dark');
  assert.equal(document.documentElement.dataset.theme, 'dark');
  assert.equal(buttons[0]['aria-pressed'], 'false');
  assert.equal(buttons[1]['aria-pressed'], 'true');
});
