(function (root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) Object.assign(root.DaxieApp ||= {}, api);
})(typeof window !== 'undefined' ? window : null, function () {
  function formatBytes(bytes) { const value = Number(bytes || 0); if (!value) return '0 B'; if (value < 1024) return `${value} B`; if (value < 1048576) return `${(value / 1024).toFixed(1)} KB`; return `${(value / 1048576).toFixed(1)} MB`; }
  function selectVisibleAssets(release) { if (!release?.updateAvailable) return []; if (release.runtimeType === 'development') return release.assets || []; return (release.assets || []).filter(asset => asset.type === release.runtimeType); }
  function installUpdateControls(document, api) {
    const byId = id => document.getElementById(id), status = byId('updateStatus'), list = byId('updateAssets'), progress = byId('updateProgress'), check = byId('checkUpdates'), install = byId('installUpdate');
    const setStatus = (text, tone = '') => { status.textContent = text; status.dataset.tone = tone; };
    function setChecking(active) { check.disabled = active; check.classList.toggle('is-loading', active); check.querySelector('span').textContent = active ? '正在检查…' : '检查更新'; }
    function renderAssets(release) {
      list.innerHTML = '';
      for (const asset of selectVisibleAssets(release)) {
        const row = document.createElement('div'); row.className = 'update-asset';
        const info = document.createElement('div'); info.className = 'update-file'; info.innerHTML = `<strong>${asset.type === 'installed' ? '安装版增量更新' : '便携版更新'}</strong><small>${asset.name} · ${formatBytes(asset.size)}</small>`;
        const button = document.createElement('button'); button.className = 'update-download'; button.textContent = asset.type === 'installed' ? '下载增量更新' : '选择位置并下载';
        button.onclick = async () => { button.disabled = true; try { if (asset.type === 'portable') await api.downloadPortable(asset.id); else { await api.checkInstalledUpdate(); await api.downloadInstalled(); } } catch (error) { setStatus(error.message, 'error'); button.disabled = false; } };
        row.append(info, button); list.append(row);
      }
    }
    check.onclick = async () => {
      setChecking(true); list.innerHTML = ''; install.hidden = true; progress.hidden = true; setStatus('优先通过 gh-proxy.com 检查…');
      try { const release = await api.checkUpdates(); if (!release.updateAvailable) { setStatus(`当前已是最新版本 ${release.currentVersion}`, 'success'); check.classList.add('is-current'); } else { check.classList.remove('is-current'); setStatus(`发现新版本 ${release.latestVersion} · ${release.source === 'proxy' ? '加速源' : '官方源'}`); renderAssets(release); } }
      catch (error) { check.classList.remove('is-current'); setStatus(error.message, 'error'); }
      finally { setChecking(false); }
    };
    install.onclick = () => api.installDownloadedUpdate();
    api.onUpdateProgress(info => {
      if (Number.isFinite(info.percent)) { progress.hidden = false; progress.value = info.percent; }
      if (info.phase === 'downloaded') { install.hidden = false; setStatus('更新已下载，点击立即安装', 'success'); }
      else if (info.phase === 'fallback') setStatus(info.message);
      else if (info.message) setStatus(info.message, 'error');
      else if (info.phase === 'downloading') setStatus(`正在下载 ${Number(info.percent || 0).toFixed(1)}% · ${formatBytes(info.transferred)}/${formatBytes(info.total)}`);
    });
  }
  return { formatBytes, selectVisibleAssets, installUpdateControls };
});
