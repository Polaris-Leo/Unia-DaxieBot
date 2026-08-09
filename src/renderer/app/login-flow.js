(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) Object.assign(root.DaxieApp ||= {}, api);
})(typeof window !== 'undefined' ? window : null, function () {
  function createLoginFlow({ createQr, pollQr, view, onSuccess, onStop, schedule = setTimeout, cancelSchedule = clearTimeout, interval = 1800 }) {
    let session = 0;
    let scheduledPoll;

    function stop() {
      session += 1;
      if (scheduledPoll !== undefined) cancelSchedule(scheduledPoll);
      scheduledPoll = undefined;
      onStop?.();
    }

    async function poll(sessionId, key, authSession) {
      if (sessionId !== session) return;
      try {
        const result = await pollQr(key, authSession);
        if (sessionId !== session) return;
        const text = { 86101:'等待扫码', 86090:'已扫码，请在手机上确认', 86038:'二维码已过期' }[result.code] || result.message || '';
        if (result.code === 0) {
          view.showSuccess();
          onSuccess?.();
          return;
        }
        if (result.code === 86038) {
          view.showFailure(text);
          return;
        }
        view.setStatus(text);
        scheduledPoll = schedule(() => { scheduledPoll = undefined; void poll(sessionId, key, authSession); }, interval);
      } catch (error) {
        if (sessionId === session) view.showFailure(error.message || '登录失败，请重试');
      }
    }

    async function start() {
      stop();
      const sessionId = session;
      view.showLoading();
      try {
        const qr = await createQr();
        if (sessionId !== session) return;
        view.showQr(qr.image);
        void poll(sessionId, qr.key, qr.session);
      } catch (error) {
        if (sessionId === session) view.showFailure(error.message || '二维码生成失败，请重试');
      }
    }

    return { start, stop };
  }

  return { createLoginFlow };
});
