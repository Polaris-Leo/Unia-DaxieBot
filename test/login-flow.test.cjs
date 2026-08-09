const test = require('node:test');
const assert = require('node:assert/strict');
const { createLoginFlow } = require('../src/renderer/app/login-flow.js');

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test('stop invalidates a pending QR creation result', async () => {
  const qr = deferred();
  const events = [];
  let cancellations = 0;
  const flow = createLoginFlow({
    createQr: () => qr.promise,
    pollQr: () => { throw new Error('must not poll'); },
    onStop: () => cancellations++,
    view: { showLoading:()=>events.push('loading'),showQr:()=>events.push('qr'),setStatus:()=>{},showFailure:()=>{},showSuccess:()=>{} }
  });

  const starting = flow.start();
  flow.stop();
  qr.resolve({ key:'old', image:'old-image' });
  await starting;

  assert.deepEqual(events, ['loading']);
  assert.equal(cancellations, 2);
});

test('polling is serialized and stale responses are ignored after stop', async () => {
  const firstPoll = deferred();
  const events = [];
  let polls = 0, scheduled;
  const flow = createLoginFlow({
    createQr: async () => ({ key:'key', image:'image' }),
    pollQr: () => { polls++; return firstPoll.promise; },
    schedule: callback => { scheduled = callback; return 1; },
    cancelSchedule: () => {},
    view: { showLoading:()=>{},showQr:()=>{},setStatus:text=>events.push(text),showFailure:text=>events.push(text),showSuccess:()=>events.push('success') }
  });

  await flow.start();
  assert.equal(polls, 1);
  assert.equal(scheduled, undefined);
  flow.stop();
  firstPoll.resolve({ code:0 });
  await new Promise(resolve => setImmediate(resolve));

  assert.deepEqual(events, []);
});

test('a waiting response schedules exactly one next poll', async () => {
  let scheduled, polls = 0;
  const flow = createLoginFlow({
    createQr: async () => ({ key:'key', image:'image' }),
    pollQr: async () => { polls++; return { code:86101 }; },
    schedule: callback => { scheduled = callback; return 1; },
    cancelSchedule: () => {},
    view: { showLoading:()=>{},showQr:()=>{},setStatus:()=>{},showFailure:()=>{},showSuccess:()=>{} }
  });

  await flow.start();
  assert.equal(polls, 1);
  assert.equal(typeof scheduled, 'function');
  scheduled();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(polls, 2);
});
