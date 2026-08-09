const test = require('node:test');
const assert = require('node:assert/strict');
const { fitScale, obsViewportScale, detectObsQuality, OBS_QUALITY_PRESETS } = require('../src/renderer/layout-utils.js');

test('fitScale leaves content at its configured size when it fits', () => {
  assert.equal(fitScale(400, 200, 1000, 600, 0), 1);
});

test('fitScale shrinks proportionally when width is the limiting dimension', () => {
  assert.equal(fitScale(800, 200, 400, 600, 0), 0.5);
});

test('fitScale shrinks proportionally when height is the limiting dimension', () => {
  assert.equal(fitScale(200, 800, 600, 400, 0), 0.5);
});

test('fitScale uses the tighter of width and height constraints', () => {
  assert.equal(fitScale(1000, 1000, 800, 500, 0), 0.5);
});

test('fitScale reserves safe padding on every edge', () => {
  assert.equal(fitScale(900, 650, 900, 650, 24), 602 / 650);
});

test('fitScale returns a safe scale for invalid measurements', () => {
  assert.equal(fitScale(0, 100, 500, 500), 1);
  assert.equal(fitScale(100, 100, Number.NaN, 500), 1);
  assert.equal(fitScale(100, 100, 20, 20, 24), 1);
});

test('fitScale never enlarges configured content', () => {
  const scale = fitScale(10, 10, 5000, 5000, 0);
  assert.ok(scale > 0 && scale <= 1);
});

test('obsViewportScale scales standard OBS resolutions from a 720P baseline', () => {
  assert.equal(obsViewportScale(1280, 720), 1);
  assert.equal(obsViewportScale(1920, 1080), 1.5);
  assert.equal(obsViewportScale(2560, 1440), 2);
  assert.equal(obsViewportScale(3840, 2160), 3);
});

test('obsViewportScale uses the tighter axis for non-standard aspect ratios', () => {
  assert.equal(obsViewportScale(1920, 720), 1);
  assert.equal(obsViewportScale(1280, 1080), 1);
});

test('obsViewportScale returns a safe scale for invalid viewport measurements', () => {
  assert.equal(obsViewportScale(0, 720), 1);
  assert.equal(obsViewportScale(1280, Number.NaN), 1);
});

test('detectObsQuality recognizes all four standard OBS resolutions', () => {
  assert.equal(detectObsQuality(1280, 720).key, '720p');
  assert.equal(detectObsQuality(1920, 1080).key, '1080p');
  assert.equal(detectObsQuality(2560, 1440).key, '2k');
  assert.equal(detectObsQuality(3840, 2160).key, '4k');
});

test('detectObsQuality chooses the highest preset fully supported by both dimensions', () => {
  assert.equal(detectObsQuality(1600, 900).key, '720p');
  assert.equal(detectObsQuality(3000, 1600).key, '2k');
  assert.equal(detectObsQuality(4000, 2000).key, '2k');
  assert.equal(detectObsQuality(1200, 2000).key, '720p');
});

test('detectObsQuality falls back below 720P and caps above 4K', () => {
  assert.equal(detectObsQuality(640, 360).key, '720p');
  assert.equal(detectObsQuality(7680, 4320).key, '4k');
  assert.equal(detectObsQuality(0, Number.NaN).key, '720p');
});

test('OBS quality presets expose the exact labels and dimensions shown in the panel', () => {
  assert.deepEqual(OBS_QUALITY_PRESETS, [
    { key: '720p', label: '720P', width: 1280, height: 720 },
    { key: '1080p', label: '1080P', width: 1920, height: 1080 },
    { key: '2k', label: '2K', width: 2560, height: 1440 },
    { key: '4k', label: '4K', width: 3840, height: 2160 }
  ]);
});
