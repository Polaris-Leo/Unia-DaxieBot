const fs = require('fs');
const { pipeline } = require('stream/promises');
const { PROXY_PREFIX } = require('./release-client.cjs');

function validatePortableAsset(asset) {
  if (!asset || asset.type !== 'portable' || !/-portable\.exe$/i.test(asset.name) || !(asset.size > 0)) return false;
  try { const url = new URL(asset.downloadUrl); return url.protocol === 'https:' && url.hostname === 'github.com' && url.pathname.startsWith('/Polaris-Leo/Unia-DaxieBot/releases/download/'); }
  catch { return false; }
}
function portableDownloadUrl(asset, source) { return source === 'proxy' ? `${PROXY_PREFIX}${asset.downloadUrl}` : asset.downloadUrl; }

function createPortableDownloader({ axios, dialog, shell, app, emitProgress = () => {} }) {
  let controller = null;
  async function download(asset, parentWindow) {
    if (controller) throw new Error('已有下载任务正在进行');
    if (!validatePortableAsset(asset)) throw new Error('便携版附件无效');
    const picked = await dialog.showSaveDialog(parentWindow, { title: '保存便携版更新', defaultPath: asset.name, filters: [{ name: 'Windows 程序', extensions: ['exe'] }] });
    if (picked.canceled || !picked.filePath) return { cancelled: true };
    const finalPath = picked.filePath.toLowerCase().endsWith('.exe') ? picked.filePath : `${picked.filePath}.exe`;
    const partPath = `${finalPath}.part`;
    controller = new AbortController();
    try {
      let usedSource;
      let lastError;
      for (const source of ['proxy', 'official']) {
        let transferred = 0; const started = Date.now(); fs.rmSync(partPath, { force: true });
        try {
          emitProgress({ phase: 'connecting', source, filePath: finalPath });
          const response = await axios.get(portableDownloadUrl(asset, source), { responseType: 'stream', timeout: 30000, signal: controller.signal, maxRedirects: 8 });
          response.data.on('data', chunk => { transferred += chunk.length; const elapsed = Math.max(1, Date.now() - started); emitProgress({ phase: 'downloading', source, percent: Math.min(100, transferred / asset.size * 100), transferred, total: asset.size, bytesPerSecond: transferred * 1000 / elapsed, filePath: finalPath }); });
          await pipeline(response.data, fs.createWriteStream(partPath));
          if (transferred !== asset.size) throw new Error(`下载大小不匹配：${transferred}/${asset.size}`);
          usedSource = source; break;
        } catch (error) { fs.rmSync(partPath, { force: true }); lastError = error; if (controller.signal.aborted || source === 'official') throw error; emitProgress({ phase: 'fallback', source: 'official', message: '加速源不可用，正在切换官方源' }); }
      }
      fs.rmSync(finalPath, { force: true }); fs.renameSync(partPath, finalPath);
      emitProgress({ phase: 'launching', source: usedSource, percent: 100, total: asset.size, transferred: asset.size, filePath: finalPath });
      const openError = await shell.openPath(finalPath); if (openError) throw new Error(`无法启动更新程序：${openError}`);
      emitProgress({ phase: 'complete', source: usedSource, percent: 100, total: asset.size, transferred: asset.size, filePath: finalPath }); app.quit(); return { filePath: finalPath, source: usedSource };
    } catch (error) { fs.rmSync(partPath, { force: true }); emitProgress({ phase: controller.signal.aborted ? 'cancelled' : 'error', message: error.message, filePath: finalPath }); throw error; }
    finally { controller = null; }
  }
  function cancel() { controller?.abort(); }
  return { download, cancel, dispose: cancel };
}
module.exports = { validatePortableAsset, portableDownloadUrl, createPortableDownloader };
