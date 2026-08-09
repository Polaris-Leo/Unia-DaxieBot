function createShutdown({ disconnectLive, disposeUpdates, closeServer, destroyOverlay, quit }) {
  let promise = null;
  return function shutdown() {
    if (promise) return promise;
    promise = (async () => {
      await disconnectLive();
      disposeUpdates();
      closeServer();
      destroyOverlay();
      quit();
    })();
    return promise;
  };
}
module.exports = { createShutdown };
