const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream/promises');
const { PROXY_PREFIX } = require('./release-client.cjs');

function validatePortableAsset(asset) {
  if (!asset || asset.type !== 'portable' || !/-portable\.exe$/i.test(asset.name) || !(asset.size > 0)) return false;
  try {
    const url = new URL(asset.downloadUrl);
    return url.protocol === 'https:' && url.hostname === 'github.com' && url.pathname.startsWith('/Polaris-Leo/Unia-DaxieBot/releases/download/');
  } catch { return false; }
}

function portableDownloadUrl(asset, source) {
  return source === 'proxy' ? `${PROXY_PREFIX}${asset.downloadUrl}` : asset.downloadUrl;
}

function createPortableDownloader({ axios, dialog, shell, app, emitProgress = () => {} }) {
  let controller = null;
  async function download(asset, source, parentWindow) {
    if (controller) throw new Error('已有下载任务正在进行');
    if (!validatePortableAsset(asset)) throw new Error('便携版附件无效');
    const picked = await dialog.showSaveDialog(parentWindow, { title: '保存便携版更新', defaultPath: asset.name, filters: [{ name: 'Windows 程序', extensions: ['exe'] }] });
    if (picked.canceled || !picked.filePath) return { cancelled: true };
    const finalPath = picked.filePath.toLowerCase().endsWith('.exe') ? picked.filePath : `${picked.filePath}.exe`;
    const partPath = `${finalPath}.part`;
    controller = new AbortController();
    let transferred = 0;
    const started = Date.now();
    try {
      fs.rmSync(partPath, { force: true });
      const response = await axios.get(portableDownloadUrl(asset, source), { responseType: 'stream', timeout: 30000, signal: controller.signal, maxRedirects: 8 });
      response.data.on('data', chunk => {
        transferred += chunk.length;
        const elapsed = Math.max(1, Date.now() - started);
        emitProgress({ phase: 'downloading', percent: Math.min(100, transferred / asset.size * 100), transferred, total: asset.size, bytesPerSecond: transferred * 1000 / elapsed, filePath: finalPath });
      });
      await pipeline(response.data, fs.createWriteStream(partPath));
      if (transferred !== asset.size) throw new Error(`下载大小不匹配：${transferred}/${asset.size}`);
      fs.rmSync(finalPath, { force: true });
      fs.renameSync(partPath, finalPath);
      emitProgress({ phase: 'launching', percent: 100, transferred, total: asset.size, filePath: finalPath });
      const openError = await shell.openPath(finalPath);
      if (openError) throw new Error(`无法启动更新程序：${openError}`);
      emitProgress({ phase: 'complete', percent: 100, transferred, total: asset.size, filePath: finalPath });
      app.quit();
      return { filePath: finalPath };
    } catch (error) {
      fs.rmSync(partPath, { force: true });
      emitProgress({ phase: controller.signal.aborted ? 'cancelled' : 'error', message: error.message, filePath: finalPath });
      throw error;
    } finally { controller = null; }
  }
  function cancel() { controller?.abort(); }
  return { download, cancel, dispose: cancel };
}

module.exports = { validatePortableAsset, portableDownloadUrl, createPortableDownloader };
