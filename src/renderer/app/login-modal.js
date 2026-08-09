(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) Object.assign(root.DaxieApp ||= {}, api);
})(typeof window !== 'undefined' ? window : null, function () {
  function createLoginModal(document, callbacks = {}) {
    const modal = document.getElementById('loginModal');
    const body = document.getElementById('loginModalBody');
    const status = document.getElementById('loginModalStatus');
    const retry = document.getElementById('loginModalRetry');
    const closeButton = document.getElementById('loginModalClose');

    function open() {
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('modal-open');
      callbacks.onOpen?.();
    }

    function close() {
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('modal-open');
      callbacks.onClose?.();
    }

    function showLoading() {
      body.innerHTML = '<div class="login-spinner" aria-hidden="true"></div>';
      status.textContent = '正在生成登录二维码…';
      retry.hidden = true;
    }

    function showQr(image, text = '请使用哔哩哔哩 App 扫码') {
      body.innerHTML = `<img src="${image}" alt="哔哩哔哩登录二维码">`;
      status.textContent = text;
      retry.hidden = true;
    }

    function showFailure(message) {
      body.innerHTML = '<div class="login-error-icon" aria-hidden="true">!</div>';
      status.textContent = message;
      retry.hidden = false;
    }

    function setStatus(message) {
      status.textContent = message;
    }

    function showSuccess() {
      body.innerHTML = '<div class="login-success-icon" aria-hidden="true">✓</div>';
      status.textContent = '登录成功';
      retry.hidden = true;
    }

    retry.onclick = () => callbacks.onRetry?.();
    closeButton.onclick = close;
    modal.onclick = event => { if (event.target === modal) close(); };
    document.addEventListener?.('keydown', event => { if (event.key === 'Escape' && !modal.hidden) close(); });

    return { open, close, showLoading, showQr, setStatus, showFailure, showSuccess };
  }

  return { createLoginModal };
});
