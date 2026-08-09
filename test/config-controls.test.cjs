const test = require('node:test');
const assert = require('node:assert/strict');
const { collectConfig } = require('../src/renderer/app/config-controls.js');

test('collectConfig converts number and checkbox controls', () => {
  const controls = {
    fontSize: { type: 'number', value: '42' },
    audioEnabled: { type: 'checkbox', checked: true }
  };
  const document = { getElementById: id => controls[id] };
  assert.deepEqual(collectConfig(document, ['fontSize', 'audioEnabled']), { fontSize: 42, audioEnabled: true });
});

test('collectConfig reads font metadata', () => {
  const option = { dataset: { family: 'Unia Font', source: 'abc' } };
  const document = { getElementById: () => ({ selectedOptions: [option] }) };
  assert.deepEqual(collectConfig(document, ['fontFamily']), { fontFamily: 'Unia Font', fontSourceId: 'abc' });
});
