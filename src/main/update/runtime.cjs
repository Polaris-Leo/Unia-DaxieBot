function detectRuntimeType(app, env = process.env) {
  if (!app.isPackaged) return 'development';
  return env.PORTABLE_EXECUTABLE_FILE ? 'portable' : 'installed';
}

function filterAssetsForRuntime(assets, runtimeType) {
  if (runtimeType === 'development') return assets || [];
  return (assets || []).filter(asset => asset.type === runtimeType);
}

async function withAutomaticSource(operation) {
  let proxyError;
  try { return { value: await operation('proxy'), source: 'proxy' }; }
  catch (error) { proxyError = error; }
  try { return { value: await operation('official'), source: 'official' }; }
  catch (officialError) {
    const error = new Error(`加速源失败：${proxyError.message}；官方源失败：${officialError.message}`);
    error.cause = officialError;
    throw error;
  }
}

module.exports = { detectRuntimeType, filterAssetsForRuntime, withAutomaticSource };
