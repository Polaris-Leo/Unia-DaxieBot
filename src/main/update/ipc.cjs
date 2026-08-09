const { filterAssetsForRuntime, withAutomaticSource } = require('./runtime.cjs');

function registerUpdateIpc({ ipcMain, getWindow, releaseClient, portableDownloader, installedUpdater, runtimeType }) {
  let latest = null;
  const send = payload => { const win = getWindow(); if (win && !win.isDestroyed()) win.webContents.send('update:progress', payload); };
  ipcMain.handle('update:check', async () => {
    const checked = await withAutomaticSource(source => releaseClient.check(source));
    latest = { ...checked.value, source: checked.source, runtimeType, assets: filterAssetsForRuntime(checked.value.assets, runtimeType) };
    return latest;
  });
  ipcMain.handle('update:download-portable', async (_event, assetId) => {
    if (runtimeType !== 'portable') throw new Error('当前不是便携版');
    const asset = latest?.assets.find(item => String(item.id) === String(assetId) && item.type === 'portable');
    if (!latest?.updateAvailable || !asset) throw new Error('请发现新版本后再下载');
    return portableDownloader.download(asset, getWindow());
  });
  ipcMain.handle('update:check-installed', () => { if (runtimeType !== 'installed') throw new Error('当前不是安装版'); return installedUpdater.check(); });
  ipcMain.handle('update:download-installed', () => { if (runtimeType !== 'installed' || !latest?.updateAvailable) throw new Error('当前没有可安装的新版本'); return installedUpdater.download(); });
  ipcMain.handle('update:install', () => { if (runtimeType !== 'installed') throw new Error('当前不是安装版'); return installedUpdater.install(); });
  ipcMain.handle('update:cancel', () => { portableDownloader.cancel(); installedUpdater.cancel(); return true; });
  return { send, dispose() { portableDownloader.dispose(); installedUpdater.dispose(); } };
}
module.exports = { registerUpdateIpc };
