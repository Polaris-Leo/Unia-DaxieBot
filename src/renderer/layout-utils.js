(function exposeLayoutUtils(globalScope) {
  const OBS_QUALITY_PRESETS = Object.freeze([
    Object.freeze({ key: '720p', label: '720P', width: 1280, height: 720 }),
    Object.freeze({ key: '1080p', label: '1080P', width: 1920, height: 1080 }),
    Object.freeze({ key: '2k', label: '2K', width: 2560, height: 1440 }),
    Object.freeze({ key: '4k', label: '4K', width: 3840, height: 2160 })
  ]);

  function fitScale(contentWidth, contentHeight, viewportWidth, viewportHeight, padding = 24) {
    const measurements = [contentWidth, contentHeight, viewportWidth, viewportHeight].map(Number);
    if (measurements.some(value => !Number.isFinite(value) || value <= 0)) return 1;
    const safePadding = Number.isFinite(Number(padding)) ? Math.max(0, Number(padding)) : 0;
    const availableWidth = measurements[2] - safePadding * 2;
    const availableHeight = measurements[3] - safePadding * 2;
    if (availableWidth <= 0 || availableHeight <= 0) return 1;
    return Math.min(1, availableWidth / measurements[0], availableHeight / measurements[1]);
  }

  function obsViewportScale(width, height) {
    const actualWidth = Number(width);
    const actualHeight = Number(height);
    if (!Number.isFinite(actualWidth) || !Number.isFinite(actualHeight) || actualWidth <= 0 || actualHeight <= 0) return 1;
    return Math.min(actualWidth / 1280, actualHeight / 720);
  }

  function detectObsQuality(width, height) {
    const actualWidth = Number(width);
    const actualHeight = Number(height);
    if (!Number.isFinite(actualWidth) || !Number.isFinite(actualHeight) || actualWidth <= 0 || actualHeight <= 0) return OBS_QUALITY_PRESETS[0];
    let detected = OBS_QUALITY_PRESETS[0];
    for (const preset of OBS_QUALITY_PRESETS) {
      if (actualWidth >= preset.width && actualHeight >= preset.height) detected = preset;
    }
    return detected;
  }

  const api = { fitScale, obsViewportScale, detectObsQuality, OBS_QUALITY_PRESETS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (globalScope) globalScope.LayoutUtils = api;
})(typeof window !== 'undefined' ? window : globalThis);
