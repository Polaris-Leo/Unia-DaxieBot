(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) Object.assign(root.DaxieApp ||= {}, api);
})(typeof window !== 'undefined' ? window : null, function () {
  function formatBytes(bytes) {
    const value = Number(bytes || 0);
    if (!value) return '0 B';
    if (value < 1024) return `${value} B`;
    if (value < 1048576) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / 1048576).toFixed(1)} MB`;
  }
  function installUpdateControls(document, api) {
    const byId = id => document.getElementById(id);
    const status = byId('updateStatus'), list = byId('updateAssets'), progress = byId('updateProgress');
    let release = null;
    const source = () => document.querySelector('input[name="updateSource"]:checked')?.value || 'proxy';
    const setStatus = text => { status.textContent = text; };
    function renderAssets() {
      list.innerHTML = '';
      for (const asset of release.assets) {
        const row = document.createElement('div'); row.className = 'update-asset';
        const label = document.createElement('span'); label.textContent = `${asset.type === 'installed' ? '安装版' : '便携版'} · ${formatBytes(asset.size)}`;
        const button = document.createElement('button'); button.textContent = asset.type === 'installed' ? '下载增量更新' : '选择位置并下载';
        button.onclick = async () => { try { if (asset.type === 'portable') await api.downloadPortable(asset.id, source()); else { await api.checkInstalledUpdate(source()); await api.downloadInstalled(); } } catch (error) { setStatus(error.message); } };
        row.append(label, button); list.append(row);
      }
    }
    byId('checkUpdates').onclick = async () => { setStatus('正在检查更新…'); list.innerHTML = ''; try { release = await api.checkUpdates(source()); setStatus(release.updateAvailable ? `发现新版本 ${release.latestVersion}` : `当前已是最新版本 ${release.currentVersion}`); renderAssets(); } catch (error) { setStatus(`${error.message}；可切换线路后重试`); } };
    byId('installUpdate').onclick = () => api.installDownloadedUpdate();
    api.onUpdateProgress(info => {
      if (Number.isFinite(info.percent)) { progress.hidden = false; progress.value = info.percent; }
      if (info.phase === 'downloaded') { byId('installUpdate').hidden = false; setStatus('更新已下载，点击立即安装'); }
      else if (info.message) setStatus(info.message);
      else if (info.phase === 'downloading') setStatus(`正在下载 ${Number(info.percent || 0).toFixed(1)}% · ${formatBytes(info.transferred)}/${formatBytes(info.total)}`);
    });
  }
  return { formatBytes, installUpdateControls };
});
