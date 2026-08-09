let state;
const queue = [];
let running = false;
let activeFitLayer = null;
const root = document.getElementById('root');

function styleText(style) {
  return Object.entries(style).map(([key,value]) => `${key.replace(/[A-Z]/g, letter => `-${letter.toLowerCase()}`)}:${value}`).join(';');
}

function registerImportedFonts(nextState) {
  let element = document.getElementById('importedFontFaces');
  if (!element) { element = document.createElement('style'); element.id = 'importedFontFaces'; document.head.appendChild(element); }
  const formats = {ttf:'truetype',otf:'opentype',woff:'woff',woff2:'woff2'};
  element.textContent = (nextState.importedFonts || []).map(font => `@font-face{font-family:"${font.cssFamily}";src:url("${window.daxie ? font.assetUrl : font.obsUrl}") format("${formats[font.format] || font.format}");font-display:swap}`).join('\n');
  document.fonts?.ready.then(fitActiveContent);
}

function setState(nextState) {
  state = nextState;
  registerImportedFonts(nextState);
}

function updateObsQuality() {
  if (window.daxie) return;
  const preset = window.LayoutUtils.detectObsQuality(window.innerWidth, window.innerHeight);
  document.documentElement.dataset.obsQuality = preset.key;
  document.documentElement.style.setProperty('--obs-width', String(preset.width));
  document.documentElement.style.setProperty('--obs-height', String(preset.height));
}

function fitActiveContent() {
  if (!activeFitLayer || !activeFitLayer.isConnected) return;
  const content = activeFitLayer.querySelector('.animation-layer');
  if (!content) return;
  activeFitLayer.style.setProperty('--fit-scale', '1');
  const viewportScale = window.daxie ? 1 : window.LayoutUtils.obsViewportScale(root.clientWidth, root.clientHeight);
  const overflowScale = window.LayoutUtils.fitScale(content.offsetWidth * viewportScale, content.offsetHeight * viewportScale, root.clientWidth, root.clientHeight, 24);
  activeFitLayer.style.setProperty('--fit-scale', String(viewportScale * overflowScale));
  activeFitLayer.classList.add('ready');
}

const resizeObserver = new ResizeObserver(() => {
  updateObsQuality();
  fitActiveContent();
});
resizeObserver.observe(root);
window.addEventListener('resize', updateObsQuality);
document.fonts?.ready.then(fitActiveContent);
updateObsQuality();

if (window.daxie) {
  const style = document.createElement('style');
  style.textContent = `body.overlay-editing{background:rgba(20,22,34,.55);outline:3px dashed #ff7eb6;outline-offset:-3px;-webkit-app-region:drag}body.overlay-editing:before{content:"拖动窗口内部移动位置";position:fixed;left:50%;top:14px;transform:translateX(-50%);padding:8px 14px;border-radius:20px;background:#171923;color:#fff;font:14px Microsoft YaHei;z-index:9998;white-space:nowrap;box-shadow:0 4px 20px #0008}.resize-guide{display:none;position:fixed;inset:0;z-index:9999;pointer-events:none;-webkit-app-region:no-drag}.overlay-editing .resize-guide{display:block}.resize-guide:after{content:"拖动粉色边框或四角调整大小 · 最小 320×240";position:absolute;left:50%;bottom:16px;transform:translateX(-50%);padding:7px 13px;border-radius:18px;background:#171923;color:#fff;font:13px Microsoft YaHei;white-space:nowrap}.resize-handle{position:absolute;pointer-events:auto;-webkit-app-region:no-drag;background:transparent}.resize-handle.n,.resize-handle.s{left:16px;right:16px;height:14px;cursor:ns-resize}.resize-handle.n{top:0}.resize-handle.s{bottom:0}.resize-handle.e,.resize-handle.w{top:16px;bottom:16px;width:14px;cursor:ew-resize}.resize-handle.e{right:0}.resize-handle.w{left:0}.resize-handle.ne,.resize-handle.nw,.resize-handle.se,.resize-handle.sw{width:26px;height:26px;background:#ff7eb6;border:3px solid white;border-radius:50%;box-shadow:0 2px 10px #0008}.resize-handle.ne{right:0;top:0;cursor:nesw-resize}.resize-handle.nw{left:0;top:0;cursor:nwse-resize}.resize-handle.se{right:0;bottom:0;cursor:nwse-resize}.resize-handle.sw{left:0;bottom:0;cursor:nesw-resize}`;
  document.head.appendChild(style);
  const guide = document.createElement('div');
  guide.className = 'resize-guide';
  for (const direction of ['n','ne','e','se','s','sw','w','nw']) {
    const handle = document.createElement('div');
    handle.className = `resize-handle ${direction}`;
    handle.title = `拖动调整${direction.toUpperCase()}方向大小`;
    handle.addEventListener('mousedown', event => {
      event.preventDefault(); event.stopPropagation();
      window.daxie.beginOverlayResize(direction, event.screenX, event.screenY);
    });
    guide.appendChild(handle);
  }
  document.body.appendChild(guide);
  document.addEventListener('mousemove', event => { if (event.buttons === 1) window.daxie.updateOverlayResize(event.screenX, event.screenY); });
  document.addEventListener('mouseup', () => window.daxie.endOverlayResize());
  window.daxie.onOverlayEditing(editing => document.body.classList.toggle('overlay-editing', editing));
}

if (window.daxie) {
  window.daxie.onState(setState);
  window.daxie.getState().then(setState);
  window.daxie.onGift(gift => { queue.push(gift); run(); });
} else {
  fetch('/api/state').then(response => response.json()).then(setState);
  const events = new EventSource('/events');
  events.addEventListener('state', event => { setState(JSON.parse(event.data)); });
  events.addEventListener('gift', event => { queue.push(JSON.parse(event.data)); run(); });
}

const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function message(gift, config) {
  const key = {gift:'template', blindbox:'blindboxTemplate', guard:'guardTemplate', sc:'scTemplate'}[gift.type] || 'template';
  let text = config[key];
  const values = {sender:gift.sender,gift:gift.gift,count:gift.count,price:Number(gift.price||0).toFixed(1).replace(/\.0$/,''),blindbox_name:gift.blindboxName||gift.gift,content:gift.content||''};
  for (const [name, value] of Object.entries(values)) {
    const safe = esc(value);
    text = text.split(`{${name}}`).join(config.highlightKeywords && ['sender','gift','blindbox_name'].includes(name) ? `<span class="highlight">${safe}</span>` : safe);
  }
  return text;
}

function asset(file) {
  if (!file) return '';
  return window.daxie ? `asset://local/?path=${encodeURIComponent(file)}` : `/asset?path=${encodeURIComponent(file)}`;
}

async function run() {
  if (running || !queue.length || !state) return;
  running = true;
  const gift = queue.shift();
  const config = window.StyleUtils.normalizeStyleConfig(state.config);
  const bubble = window.StyleUtils.bubblePresentation(config);
  const fontFamily = window.StyleUtils.fontCssFamily(config, state.importedFonts || []);
  const desktop = Boolean(window.daxie);
  const showVisual = !desktop || state.desktopVisualEnabled !== false;
  const playAudio = !desktop || state.desktopAudioEnabled !== false;
  const image = config.imagePath || gift.face;
  const visual = image
    ? `<img class="visual" src="${asset(image.startsWith('http') ? '' : image) || esc(image)}" style="width:${config.imageSize}px;height:${config.imageSize}px">`
    : `<div class="visual placeholder" style="width:${config.imageSize}px;height:${config.imageSize}px">谢</div>`;
  if (showVisual) {
    const stroke = config.strokeEnabled ? `${config.strokeWidth}px ${config.strokeColor}` : '0 transparent';
    root.innerHTML = `<div class="fit-layer"><div class="animation-layer" style="--duration:${config.animationDuration}s;--highlight:${config.highlightColor}">${visual}<div class="message" style="font-family:${fontFamily.replace(/"/g,'&quot;')};font-size:${config.fontSize}px;font-weight:${config.fontWeight};color:${config.fontColor};-webkit-text-stroke:${stroke};${styleText(bubble)}">${message(gift, config)}</div></div></div>`;
    activeFitLayer = root.firstElementChild;
    const imageElement = activeFitLayer.querySelector('img');
    if (imageElement && !imageElement.complete) imageElement.addEventListener('load', fitActiveContent, { once: true });
    requestAnimationFrame(fitActiveContent);
  }
  if (playAudio && config.audioEnabled && config.audioPath) {
    try { new Audio(asset(config.audioPath)).play(); } catch {}
  }
  await new Promise(resolve => setTimeout(resolve, showVisual ? Number(config.stayDuration) * 1000 : 100));
  root.querySelector('.animation-layer')?.classList.add('out');
  await new Promise(resolve => setTimeout(resolve, showVisual ? Number(config.animationDuration) * 1000 : 0));
  root.innerHTML = '';
  activeFitLayer = null;
  running = false;
  run();
}
