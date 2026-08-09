function providerOptions(source) {
  return source === 'proxy'
    ? { provider: 'generic', url: 'https://gh-proxy.com/https://github.com/Polaris-Leo/Unia-DaxieBot/releases/latest/download/' }
    : { provider: 'github', owner: 'Polaris-Leo', repo: 'Unia-DaxieBot' };
}

function createInstalledUpdater({ NsisUpdater, emitProgress = () => {} }) {
  let updater = null;
  let source = 'official';
  function dispose() { updater?.removeAllListeners(); updater = null; }
  function make(nextSource) {
    dispose();
    source = nextSource === 'proxy' ? 'proxy' : 'official';
    updater = new NsisUpdater(providerOptions(source));
    updater.autoDownload = false;
    updater.autoInstallOnAppQuit = false;
    updater.disableDifferentialDownload = false;
    updater.on('checking-for-update', () => emitProgress({ phase: 'checking', kind: 'installed' }));
    updater.on('update-available', info => emitProgress({ phase: 'available', kind: 'installed', version: info.version }));
    updater.on('update-not-available', info => emitProgress({ phase: 'current', kind: 'installed', version: info.version }));
    updater.on('download-progress', progress => emitProgress({ phase: 'downloading', kind: 'installed', percent: progress.percent, transferred: progress.transferred, total: progress.total, bytesPerSecond: progress.bytesPerSecond }));
    updater.on('update-downloaded', info => emitProgress({ phase: 'downloaded', kind: 'installed', version: info.version }));
    updater.on('error', error => emitProgress({ phase: 'error', kind: 'installed', source, message: error.message }));
    return updater;
  }
  return {
    async check(nextSource = 'official') { return make(nextSource).checkForUpdates(); },
    async download() { if (!updater) throw new Error('请先检查更新'); return updater.downloadUpdate(); },
    install() { if (!updater) throw new Error('尚未下载更新'); updater.quitAndInstall(false, true); },
    cancel() { updater?.cancellationToken?.cancel(); },
    dispose
  };
}

module.exports = { providerOptions, createInstalledUpdater };
