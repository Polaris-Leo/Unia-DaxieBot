let state;
let pollTimer;
let previewType = 'gift';
let editingOverlay = false;
let previewObserver;
let fontCatalog = { systemFonts: [], importedFonts: [] };
const $ = id => document.getElementById(id);
const configIds = ['imagePath','audioPath','audioEnabled','imageSize','fontSize','stayDuration','animationDuration','fontColor','highlightColor','strokeEnabled','strokeColor','strokeWidth','fontFamily','fontWeight','highlightKeywords','bubbleEnabled','bubbleStyle','bubbleOpacity','bubbleGradientEnabled','bubbleColor','bubbleColorSecondary','minPrice','ignoreFree','blindboxCalcOriginal','template','blindboxTemplate','guardTemplate','scTemplate'];
const pageInfo = {live:['直播控制','扫码登录并连接一个 B 站直播间'],display:['答谢样式','设置桌面浮窗的素材、文字和动效'],rules:['礼物规则','决定哪些礼物触发答谢以及显示文案'],about:['使用说明','独立桌面版的快速使用指南'],settings:['设置','调整应用外观并管理程序更新']};

function toast(text) {
  const element = $('toast');
  element.textContent = text;
  element.classList.add('show');
  setTimeout(() => element.classList.remove('show'), 2200);
}

function render(nextState) {
  state = nextState;
  window.DaxieApp.applyTheme(document, state.appearance?.theme);
  if ($('appVersion')) $('appVersion').textContent = `v${state.appVersion || '—'}`;
  $('status').textContent = state.status;
  $('dot').classList.toggle('on', state.connected);
  $('roomId').value = state.roomId || '';
  $('overlayToggle').checked = state.overlayVisible;
  $('desktopVisualToggle').checked = state.desktopVisualEnabled !== false;
  $('desktopAudioToggle').checked = state.desktopAudioEnabled !== false;
  $('overlayOptions').classList.toggle('disabled', !state.overlayVisible);
  fontCatalog.importedFonts = state.importedFonts || fontCatalog.importedFonts;
  registerImportedFonts();
  rebuildFontOptions(state.config);
  const connectionActive = Boolean(state.connectionDesired || state.connecting || state.connected);
  $('connectBtn').textContent = connectionActive ? '断开' : '连接';
  $('connectBtn').classList.toggle('danger', connectionActive);
  $('roomId').readOnly = connectionActive;
  const account = $('account');
  account.innerHTML = state.authenticated
    ? `<div>${state.user?.face ? `<img src="${state.user.face}">` : ''}<b>${state.user?.name || '已登录'}</b></div><button id="logout">退出登录</button>`
    : '<span class="muted">尚未登录</span>';
  if ($('logout')) $('logout').onclick = logout;
  for (const id of configIds) {
    const element = $(id);
    if (!element) continue;
    if (id === 'fontFamily') continue;
    const value = state.config[id];
    if (element.type === 'checkbox') element.checked = Boolean(value);
    else element.value = value ?? '';
  }
  updateOutputs();
  updateStyleControlStates();
  renderStylePreview();
  if (state.authenticated && !document.querySelector('#qrArea img')) $('qrArea').innerHTML = '<div class="waiting"><b>扫码登录成功</b><p>可连接直播间开始答谢</p></div>';
}

function updateOutputs() {
  $('imageSizeOut').textContent = `${$('imageSize').value}px`;
  $('fontSizeOut').textContent = `${$('fontSize').value}px`;
  if ($('bubbleOpacityOut')) $('bubbleOpacityOut').textContent = `${$('bubbleOpacity').value}%`;
}

function styleText(style) {
  return Object.entries(style).map(([key,value]) => `${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}:${value}`).join(';');
}

function registerImportedFonts() {
  let element = $('importedFontFaces');
  if (!element) { element = document.createElement('style'); element.id = 'importedFontFaces'; document.head.appendChild(element); }
  const formatNames = {ttf:'truetype',otf:'opentype',woff:'woff',woff2:'woff2'};
  element.textContent = fontCatalog.importedFonts.map(font => `@font-face{font-family:"${font.cssFamily}";src:url("${font.assetUrl}") format("${formatNames[font.format] || font.format}");font-display:swap}`).join('\n');
  document.fonts?.ready.then(fitStylePreview);
}

function rebuildFontOptions(config = collectConfig()) {
  const select = $('fontFamily');
  if (!select || select.tagName !== 'SELECT') return;
  const sourceId = config.fontSourceId || $('fontSourceId')?.value || '';
  const family = config.fontFamily || 'Microsoft YaHei';
  const systems = [...new Set(fontCatalog.systemFonts || [])];
  if (!sourceId && family && !systems.includes(family)) systems.push(family);
  const systemOptions = systems.sort((a,b) => a.localeCompare(b,'zh-CN')).map(name => `<option value="system:${encodeURIComponent(name)}" data-family="${name.replace(/"/g,'&quot;')}" data-source="">${name}</option>`).join('');
  const importedOptions = fontCatalog.importedFonts.map(font => `<option value="import:${font.id}" data-family="${font.family.replace(/"/g,'&quot;')}" data-source="${font.id}">${font.displayName}</option>`).join('');
  select.innerHTML = `<optgroup label="Windows 系统字体">${systemOptions}</optgroup>${importedOptions ? `<optgroup label="已导入字体">${importedOptions}</optgroup>` : ''}`;
  const wanted = sourceId ? `import:${sourceId}` : `system:${encodeURIComponent(family)}`;
  if ([...select.options].some(option => option.value === wanted)) select.value = wanted;
  $('fontSourceId').value = select.selectedOptions[0]?.dataset.source || '';
}

function updateStyleControlStates() {
  const strokeOn = $('strokeEnabled').checked;
  $('strokeColor').disabled = !strokeOn; $('strokeWidth').disabled = !strokeOn;
  const bubbleOn = $('bubbleEnabled').checked;
  for (const id of ['bubbleStyle','bubbleOpacity','bubbleGradientEnabled','bubbleColor','bubbleColorSecondary']) $(id).disabled = !bubbleOn;
  $('bubbleSecondaryWrap').hidden = !$('bubbleGradientEnabled').checked;
  $('bubbleControls').classList.toggle('disabled-controls', !bubbleOn);
}

function installAdvancedStyleControls() {
  const fontLabel = $('fontFamily').closest('label');
  fontLabel.innerHTML = '字体<div class="row font-row"><select id="fontFamily"></select><button id="importFont" type="button">导入字体</button></div><input id="fontSourceId" type="hidden">';
  const colorGrid = $('strokeColor').closest('.grid.compact');
  colorGrid.insertAdjacentHTML('beforebegin','<label class="check"><input id="strokeEnabled" type="checkbox">启用字体描边</label>');
  const bubbleMaster = $('bubbleEnabled').closest('label');
  bubbleMaster.insertAdjacentHTML('afterend','<div id="bubbleControls" class="bubble-controls"><label>气泡样式<select id="bubbleStyle"><option value="rounded">圆角</option><option value="pill">胶囊</option><option value="card">卡片</option><option value="glass">玻璃</option></select></label><label>气泡透明度 <output id="bubbleOpacityOut"></output><input id="bubbleOpacity" type="range" min="0" max="100" step="1"></label><label class="check"><input id="bubbleGradientEnabled" type="checkbox">使用渐变色</label><div class="grid two compact"><label>气泡颜色<input id="bubbleColor" type="color"></label><label id="bubbleSecondaryWrap">渐变颜色<input id="bubbleColorSecondary" type="color"></label></div></div>');
  $('fontFamily').onchange = () => { $('fontSourceId').value = $('fontFamily').selectedOptions[0]?.dataset.source || ''; renderStylePreview(); };
  $('importFont').onclick = async () => {
    try {
      const imported = await window.daxie.importFont();
      if (!imported) return;
      fontCatalog = await window.daxie.listFonts();
      registerImportedFonts(); rebuildFontOptions({fontSourceId:imported.id,fontFamily:imported.family});
      $('fontFamily').value = `import:${imported.id}`; $('fontSourceId').value = imported.id;
      renderStylePreview(); toast(`已导入字体：${imported.displayName}`);
    } catch (error) { toast(error.message); }
  };
}

function installStylePreview() {
  $('display').insertAdjacentHTML('afterbegin', `<article class="card preview-card"><div class="preview-head"><div><h2>实时预览</h2><p class="hint">修改下方任意样式会立即更新，无需先保存。</p></div><div class="preview-tabs"><button class="active" data-preview="gift">礼物</button><button data-preview="blindbox">盲盒</button><button data-preview="guard">上舰</button><button data-preview="sc">SC</button></div></div><div id="stylePreview" class="style-preview checkerboard"></div><div class="preview-bg"><span>预览背景</span><button class="active" data-bg="checkerboard">透明</button><button data-bg="dark">深色</button><button data-bg="light">浅色</button><button id="replayPreview">重播动画</button></div></article>`);
  previewObserver = new ResizeObserver(fitStylePreview);
  previewObserver.observe($('stylePreview'));
}

function previewAsset(file) {
  return file ? `asset://local/?path=${encodeURIComponent(file)}` : '';
}

function previewText(config, type) {
  const samples = {gift:{sender:'测试观众',gift:'小花花',count:10,price:'10'},blindbox:{sender:'盲盒欧皇',gift:'浪漫城堡',blindbox_name:'心动盲盒',count:1,price:'2233'},guard:{sender:'大航海家',gift:'舰长',count:1,price:'138'},sc:{sender:'醒目留言用户',gift:'醒目留言',count:1,price:'30',content:'主播加油！'}};
  const keys = {gift:'template',blindbox:'blindboxTemplate',guard:'guardTemplate',sc:'scTemplate'};
  let text = config[keys[type]] || '';
  for (const [key, raw] of Object.entries(samples[type])) {
    const value = String(raw).replace(/[&<>]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[char]));
    text = text.split(`{${key}}`).join(config.highlightKeywords && ['sender','gift','blindbox_name'].includes(key) ? `<span style="color:${config.highlightColor}">${value}</span>` : value);
  }
  return text;
}

function fitStylePreview() {
  const box = $('stylePreview');
  const layer = box?.querySelector('.preview-fit-layer');
  const content = layer?.querySelector('.preview-content');
  if (!box || !layer || !content) return;
  layer.style.setProperty('--preview-scale', '1');
  const scale = window.LayoutUtils.fitScale(content.offsetWidth, content.offsetHeight, box.clientWidth, box.clientHeight, 20);
  layer.style.setProperty('--preview-scale', String(scale));
  layer.classList.add('ready');
}

function renderStylePreview() {
  const box = $('stylePreview');
  if (!box) return;
  const config = window.StyleUtils.normalizeStyleConfig(collectConfig());
  const bubble = window.StyleUtils.bubblePresentation(config);
  const fontFamily = window.StyleUtils.fontCssFamily(config, fontCatalog.importedFonts);
  const image = config.imagePath
    ? `<img src="${previewAsset(config.imagePath)}" style="width:${config.imageSize}px;height:${config.imageSize}px">`
    : `<div class="preview-placeholder" style="width:${config.imageSize}px;height:${config.imageSize}px">谢</div>`;
  const stroke = config.strokeEnabled ? `${config.strokeWidth}px ${config.strokeColor}` : '0 transparent';
  box.innerHTML = `<div class="preview-fit-layer"><div class="preview-content" style="--preview-duration:${config.animationDuration}s">${image}<div class="preview-message" style="font-family:${fontFamily.replace(/"/g,'&quot;')};font-size:${config.fontSize}px;font-weight:${config.fontWeight};color:${config.fontColor};-webkit-text-stroke:${stroke};${styleText(bubble)}">${previewText(config, previewType)}</div></div></div>`;
  const imageElement = box.querySelector('img');
  if (imageElement && !imageElement.complete) imageElement.addEventListener('load', fitStylePreview, { once: true });
  requestAnimationFrame(fitStylePreview);
  document.fonts?.ready.then(fitStylePreview);
}

async function makeQr() {
  clearInterval(pollTimer);
  $('qrArea').innerHTML = '<div class="waiting"><b>正在生成二维码…</b></div>';
  try {
    const qr = await window.daxie.createQr();
    $('qrArea').innerHTML = `<div class="waiting"><img src="${qr.image}"><p id="qrStatus">请使用哔哩哔哩 App 扫码</p></div>`;
    pollTimer = setInterval(async () => {
      try {
        const result = await window.daxie.pollQr(qr.key);
        const text = {86101:'等待扫码',86090:'已扫码，请在手机上确认',86038:'二维码已过期'}[result.code] || result.message;
        if ($('qrStatus')) $('qrStatus').textContent = text;
        if (result.code === 0) { clearInterval(pollTimer); $('qrArea').innerHTML = '<div class="waiting"><b>登录成功</b><p>二维码已关闭，可以连接直播间</p></div>'; toast('登录成功'); }
        if (result.code === 86038) clearInterval(pollTimer);
      } catch (error) { if ($('qrStatus')) $('qrStatus').textContent = error.message; }
    }, 1800);
  } catch (error) {
    $('qrArea').innerHTML = '<button id="qrBtn" class="primary">重新生成</button>';
    $('qrBtn').onclick = makeQr;
    toast(error.message);
  }
}

async function logout() {
  clearInterval(pollTimer);
  render(await window.daxie.logout());
  $('qrArea').innerHTML = '<button id="qrBtn" class="primary">生成登录二维码</button>';
  $('qrBtn').onclick = makeQr;
}

function collectConfigLegacy() {
  const config = {};
  for (const id of configIds) {
    const element = $(id);
    if (id === 'fontFamily') {
      config.fontFamily = element.selectedOptions[0]?.dataset.family || 'Microsoft YaHei';
      config.fontSourceId = element.selectedOptions[0]?.dataset.source || '';
      continue;
    }
    if (element.type === 'checkbox') config[id] = element.checked;
    else if (element.type === 'number' || element.type === 'range') config[id] = Number(element.value);
    else config[id] = element.value;
  }
  return config;
}

const collectConfig = () => window.DaxieApp.collectConfig(document, configIds);

async function saveConfig() {
  await window.daxie.saveConfig(window.DaxieApp.collectConfig(document, configIds));
  toast('配置已保存');
}

function installOverlayTools() {
  $('overlayTools').innerHTML = '<div class="overlay-options" id="overlayOptions"><label class="check"><input id="desktopVisualToggle" type="checkbox">画面</label><label class="check"><input id="desktopAudioToggle" type="checkbox">声音</label><small>可分别开关，仅影响桌面浮窗；OBS 浏览器源不受影响。</small></div><div class="row overlay-actions"><button id="editOverlay">调整位置与大小</button><button id="resetOverlay">重置位置与大小</button></div><p class="hint">拖动浮窗内部可移动位置；拖动粉色边框或四个圆形角标可改变大小；完成后点击“完成调整”恢复鼠标穿透。</p>';
  $('editOverlay').onclick = async () => {
    editingOverlay = !editingOverlay;
    await window.daxie.setOverlayEditing(editingOverlay);
    $('editOverlay').textContent = editingOverlay ? '完成调整' : '调整位置与大小';
    if (editingOverlay) { $('overlayToggle').checked = true; toast('请在浮窗上拖动位置、边框或四角'); }
  };
  $('resetOverlay').onclick = async () => { await window.daxie.resetOverlayBounds(); toast('浮窗位置与大小已重置'); };
  $('desktopVisualToggle').onchange = event => window.daxie.setOverlayOptions({ visual: event.target.checked });
  $('desktopAudioToggle').onchange = event => window.daxie.setOverlayOptions({ audio: event.target.checked });
}

function installObsQuality() {
  const select = $('obsQuality');
  select.innerHTML = window.LayoutUtils.OBS_QUALITY_PRESETS.map(preset => `<option value="${preset.key}">${preset.label}</option>`).join('');
  select.value = '1080p';
  const update = () => {
    const preset = window.LayoutUtils.OBS_QUALITY_PRESETS.find(item => item.key === select.value);
    $('obsResolution').value = `${preset.width} × ${preset.height}`;
  };
  select.onchange = update;
  update();
}

installAdvancedStyleControls();
installStylePreview();
installOverlayTools();
installObsQuality();

document.querySelectorAll('nav button').forEach(button => button.onclick = () => {
  document.querySelectorAll('nav button,.page').forEach(element => element.classList.remove('active'));
  button.classList.add('active');
  $(button.dataset.page).classList.add('active');
  [$('title').textContent, $('subtitle').textContent] = pageInfo[button.dataset.page];
});

$('qrBtn').onclick = makeQr;
$('connectBtn').onclick = async () => {
  try {
    if (state?.connectionDesired || state?.connecting || state?.connected) { await window.daxie.disconnect(); toast('已断开直播间'); }
    else { await window.daxie.connect($('roomId').value); toast('已开始连接直播间'); }
  } catch (error) { toast(error.message); }
};
$('overlayToggle').onchange = event => window.daxie.setOverlay(event.target.checked);
$('copyObs').onclick = () => navigator.clipboard.writeText($('obsUrl').value).then(() => toast('OBS 地址已复制'));
document.querySelectorAll('[data-test]').forEach(button => button.onclick = () => window.daxie.testGift(button.dataset.test));
document.querySelectorAll('[data-pick]').forEach(button => button.onclick = async () => { const file = await window.daxie.chooseAsset(button.dataset.pick); if (file) { $(`${button.dataset.pick}Path`).value = file; saveConfig(); } });
document.querySelectorAll('.save').forEach(button => button.onclick = saveConfig);
$('imageSize').oninput = $('fontSize').oninput = updateOutputs;
for (const id of configIds) $(id)?.addEventListener('input', () => { updateOutputs(); updateStyleControlStates(); renderStylePreview(); });
document.querySelectorAll('[data-preview]').forEach(button => button.onclick = () => { document.querySelectorAll('[data-preview]').forEach(item => item.classList.remove('active')); button.classList.add('active'); previewType = button.dataset.preview; renderStylePreview(); });
document.querySelectorAll('[data-bg]').forEach(button => button.onclick = () => { document.querySelectorAll('[data-bg]').forEach(item => item.classList.remove('active')); button.classList.add('active'); $('stylePreview').className = `style-preview ${button.dataset.bg}`; });
$('replayPreview').onclick = renderStylePreview;
window.daxie.onState(render);
window.daxie.onGift(gift => toast(`已加入答谢：${gift.sender} · ${gift.gift}`));
window.daxie.getState().then(render);
window.daxie.listFonts().then(catalog => { fontCatalog = catalog; registerImportedFonts(); rebuildFontOptions(state?.config); });
window.DaxieApp.installUpdateControls(document, window.daxie);
window.DaxieApp.installThemeControls(document, window.daxie);
document.querySelector('.version-card a').onclick = event => { event.preventDefault(); window.open(event.currentTarget.href, '_blank', 'noopener'); };
