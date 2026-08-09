const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCookies, normalizeGift } = require('../src/main/bilibili-utils.cjs');

test('parseCookies reads all set-cookie headers', () => {
  assert.deepEqual(parseCookies(['a=1; Path=/', 'b=2; HttpOnly']), { a: '1', b: '2' });
});

test('normalizeGift converts a paid gift', () => {
  const gift = normalizeGift({ cmd: 'SEND_GIFT', data: { uname: 'Unia', giftName: '辣条', num: 2, price: 1000, coin_type: 'gold' } }, {});
  assert.deepEqual(gift, { type: 'gift', sender: 'Unia', face: '', gift: '辣条', blindboxName: '辣条', count: 2, price: 2, coinType: 'gold' });
});
