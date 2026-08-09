const { normalizeVersion, compareVersions } = require('./version.cjs');

const API_URL = 'https://api.github.com/repos/Polaris-Leo/Unia-DaxieBot/releases/latest';
const PROXY_PREFIX = 'https://gh-proxy.com/';

function sourceUrl(source, officialUrl) {
  if (source !== 'proxy') return officialUrl;
  return officialUrl.startsWith(PROXY_PREFIX) ? officialUrl : `${PROXY_PREFIX}${officialUrl}`;
}

function trustedAsset(asset) {
  try {
    const url = new URL(asset.browser_download_url);
    return url.protocol === 'https:' && url.hostname === 'github.com' && url.pathname.startsWith('/Polaris-Leo/Unia-DaxieBot/releases/download/') && /\.exe$/i.test(asset.name);
  } catch { return false; }
}

function normalizeRelease(payload, currentVersion) {
  if (!payload || payload.draft || payload.prerelease) throw new Error('未找到可用的正式版本');
  const latestVersion = normalizeVersion(payload.tag_name);
  if (!latestVersion) throw new Error('Release 版本号无效');
  const assets = (payload.assets || []).filter(trustedAsset).map(asset => ({
    id: asset.id, name: asset.name, size: Number(asset.size || 0),
    type: /-portable\.exe$/i.test(asset.name) ? 'portable' : /-setup\.exe$/i.test(asset.name) ? 'installed' : 'other',
    downloadUrl: asset.browser_download_url
  })).filter(asset => asset.type !== 'other');
  return { currentVersion, latestVersion, updateAvailable: compareVersions(latestVersion, currentVersion) > 0, title: payload.name || payload.tag_name, publishedAt: payload.published_at || '', pageUrl: payload.html_url || '', assets };
}

function createReleaseClient({ axios, currentVersion }) {
  return { async check(source = 'official') {
    const response = await axios.get(sourceUrl(source, API_URL), { timeout: 15000, headers: { 'User-Agent': 'Unia-DaxieBot-Updater', Accept: 'application/vnd.github+json' } });
    return normalizeRelease(response.data, currentVersion);
  } };
}

module.exports = { API_URL, PROXY_PREFIX, sourceUrl, normalizeRelease, createReleaseClient };
