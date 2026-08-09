function registerUpdateIpc({ ipcMain, getWindow, releaseClient, portableDownloader, installedUpdater }) {
  let latest = null;
  const send = payload => {
    const win = getWindow();
    if (win && !win.isDestroyed()) win.webContents.send('update:progress', payload);
  };
  ipcMain.handle('update:check', async (_event, source) => { latest = await releaseClient.check(source); return latest; });
  ipcMain.handle('update:download-portable', async (_event, assetId, source) => {
    const asset = latest?.assets.find(item => String(item.id) === String(assetId) && item.type === 'portable');
    if (!asset) throw new Error('请重新检查更新后再下载');
    return portableDownloader.download(asset, source, getWindow());
  });
  ipcMain.handle('update:check-installed', (_event, source) => installedUpdater.check(source));
  ipcMain.handle('update:download-installed', () => installedUpdater.download());
  ipcMain.handle('update:install', () => installedUpdater.install());
  ipcMain.handle('update:cancel', () => { portableDownloader.cancel(); installedUpdater.cancel(); return true; });
  return { send, dispose() { portableDownloader.dispose(); installedUpdater.dispose(); } };
}

module.exports = { registerUpdateIpc };
