const test = require('node:test');
const assert = require('node:assert/strict');
const { createLoginModal } = require('../src/renderer/app/login-modal.js');

function fixture() {
  const elements = Object.fromEntries(['loginModal','loginModalBody','loginModalStatus','loginModalRetry','loginModalClose'].map(id => [id, {
    id, hidden: false, textContent: '', innerHTML: '', attributes: {},
    setAttribute(name, value) { this.attributes[name] = value; }
  }]));
  elements.loginModal.hidden = true;
  elements.loginModalRetry.hidden = true;
  const classes = new Set();
  const document = {
    body: { classList: { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value) } },
    getElementById: id => elements[id]
  };
  return { document, elements };
}

test('open and close expose the modal and run lifecycle callbacks', () => {
  const { document, elements } = fixture();
  let opened = 0, closed = 0;
  const modal = createLoginModal(document, { onOpen: () => opened++, onClose: () => closed++ });

  modal.open();
  assert.equal(elements.loginModal.hidden, false);
  assert.equal(elements.loginModal.attributes['aria-hidden'], 'false');
  assert.equal(document.body.classList.contains('modal-open'), true);
  assert.equal(opened, 1);

  modal.close();
  assert.equal(elements.loginModal.hidden, true);
  assert.equal(elements.loginModal.attributes['aria-hidden'], 'true');
  assert.equal(document.body.classList.contains('modal-open'), false);
  assert.equal(closed, 1);
});

test('showQr renders the QR image and scanning status', () => {
  const { document, elements } = fixture();
  const modal = createLoginModal(document, {});

  modal.showQr('data:image/png;base64,abc', '等待扫码');

  assert.match(elements.loginModalBody.innerHTML, /data:image\/png;base64,abc/);
  assert.equal(elements.loginModalStatus.textContent, '等待扫码');
  assert.equal(elements.loginModalRetry.hidden, true);

  modal.setStatus('已扫码，请在手机上确认');
  assert.equal(elements.loginModalStatus.textContent, '已扫码，请在手机上确认');
  assert.match(elements.loginModalBody.innerHTML, /data:image\/png;base64,abc/);
});

test('failure keeps the modal open and offers retry', () => {
  const { document, elements } = fixture();
  let retries = 0;
  const modal = createLoginModal(document, { onRetry: () => retries++ });
  modal.open();

  modal.showFailure('二维码已过期');
  assert.equal(elements.loginModal.hidden, false);
  assert.equal(elements.loginModalStatus.textContent, '二维码已过期');
  assert.equal(elements.loginModalRetry.hidden, false);

  elements.loginModalRetry.onclick();
  assert.equal(retries, 1);
});
