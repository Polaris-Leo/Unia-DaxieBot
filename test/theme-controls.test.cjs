const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeTheme, applyTheme } = require('../src/renderer/app/theme-controls.js');
const fs = require('node:fs');
const path = require('node:path');

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

test('emphasized controls keep readable white text in the light theme', () => {
  const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'styles.css'), 'utf8');
  assert.match(css, /\.primary,.primary\.danger,.preview-tabs button\.active,.preview-bg button\.active\{color:#fff\}/);
});
