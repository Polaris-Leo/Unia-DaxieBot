function providerOptions(source) { return source === 'proxy' ? { provider: 'generic', url: 'https://gh-proxy.com/https://github.com/Polaris-Leo/Unia-DaxieBot/releases/latest/download/' } : { provider: 'github', owner: 'Polaris-Leo', repo: 'Unia-DaxieBot' }; }
function createInstalledUpdater({ NsisUpdater, emitProgress = () => {} }) {
  let updater = null, source = 'proxy';
  function dispose() { updater?.removeAllListeners(); updater = null; }
  function make(nextSource) {
    dispose(); source = nextSource; updater = new NsisUpdater(providerOptions(source)); updater.autoDownload = false; updater.autoInstallOnAppQuit = false; updater.disableDifferentialDownload = false;
    updater.on('checking-for-update', () => emitProgress({ phase: 'checking', kind: 'installed', source }));
    updater.on('update-available', info => emitProgress({ phase: 'available', kind: 'installed', source, version: info.version }));
    updater.on('update-not-available', info => emitProgress({ phase: 'current', kind: 'installed', source, version: info.version }));
    updater.on('download-progress', p => emitProgress({ phase: 'downloading', kind: 'installed', source, percent: p.percent, transferred: p.transferred, total: p.total, bytesPerSecond: p.bytesPerSecond }));
    updater.on('update-downloaded', info => emitProgress({ phase: 'downloaded', kind: 'installed', source, version: info.version }));
    updater.on('error', error => emitProgress({ phase: 'error', kind: 'installed', source, message: error.message })); return updater;
  }
  async function check() { try { return { result: await make('proxy').checkForUpdates(), source }; } catch { emitProgress({ phase: 'fallback', source: 'official', message: '加速源不可用，正在切换官方源' }); return { result: await make('official').checkForUpdates(), source }; } }
  async function download() { if (!updater) throw new Error('请先检查更新'); try { return await updater.downloadUpdate(); } catch (error) { if (source !== 'proxy') throw error; emitProgress({ phase: 'fallback', source: 'official', message: '加速源下载失败，正在切换官方源' }); await make('official').checkForUpdates(); return updater.downloadUpdate(); } }
  return { check, download, install() { if (!updater) throw new Error('尚未下载更新'); updater.quitAndInstall(false, true); }, cancel() { updater?.cancellationToken?.cancel(); }, dispose };
}
module.exports = { providerOptions, createInstalledUpdater };
