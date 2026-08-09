const { app, BrowserWindow, ipcMain, dialog, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const axios = require('axios');
const QRCode = require('qrcode');
const fontkit = require('fontkit');
const StyleUtils = require('./renderer/style-utils.js');
const { normalizeRegistryFontNames } = require('./font-registry.cjs');
const { parseCookies, normalizeGift } = require('./main/bilibili-utils.cjs');
const { mime } = require('./main/http-utils.cjs');
const { KeepLiveWS, getRoomid } = require('bilibili-live-ws');

protocol.registerSchemesAsPrivileged([{ scheme: 'asset', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126 Safari/537.36';
let mainWindow;
let overlayWindow;
let live;
let reconnectTimer;
let liveGeneration = 0;
let reconnectAttempts = 0;
let localServer;
let overlayEditing = false;
let boundsSaveTimer;
let overlayResize = null;
const browserClients = new Set();
const LOCAL_PORT = 17321;
let dataFile;
let fontsDir;
let systemFontsCache;
let state = {
  authenticated: false,
  user: null,
  cookies: {},
  roomId: '',
  connected: false,
  connecting: false,
  connectionDesired: false,
  overlayVisible: false,
  desktopVisualEnabled: true,
  desktopAudioEnabled: true,
  importedFonts: [],
  overlayBounds: { width: 900, height: 650 },
  status: '请扫码登录',
  config: {
    minPrice: 9.9, ignoreFree: true, blindboxCalcOriginal: false,
    template: '感谢 {sender} 的 {gift} × {count}（{price} 元）',
    blindboxTemplate: '感谢 {sender} 的 {blindbox_name} × {count}，开出 {gift}（{price} 元）',
    guardTemplate: '感谢 {sender} 开通 {gift} × {count}',
    scTemplate: '感谢 {sender} 的醒目留言（{price} 元）：{content}',
    imagePath: '', audioPath: '', audioEnabled: true,
    fontFamily: 'Microsoft YaHei', fontSourceId: '', fontSize: 48, fontColor: '#ffffff', fontWeight: '700',
    strokeEnabled: true, strokeWidth: 2, strokeColor: '#171923', highlightKeywords: true, highlightColor: '#ff7eb6',
    bubbleEnabled: true, bubbleStyle: 'rounded', bubbleOpacity: 53, bubbleGradientEnabled: true, bubbleColor: '#121420', bubbleColorSecondary: '#121420', bubbleColorStart: 'rgba(18,20,32,.2)', bubbleColorEnd: 'rgba(18,20,32,.86)',
    imageSize: 300, stayDuration: 5, animationDuration: 0.7
  }
};

const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) app.quit();
app.on('second-instance', () => {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
});

function publicState() {
  const { cookies, ...safe } = state;
  return { ...safe, importedFonts: (safe.importedFonts || []).map(publicFont) };
}
function save() {
  fs.mkdirSync(path.dirname(dataFile), { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(state, null, 2));
}
function fontFile(record) {
  if (!record || !/^[a-f0-9]{64}$/.test(record.id) || !['ttf','otf','woff','woff2'].includes(record.format)) return '';
  const file = path.join(fontsDir, `${record.id}.${record.format}`);
  return path.dirname(file) === fontsDir ? file : '';
}
function publicFont(record) {
  return { ...record, assetUrl: `asset://font/${record.id}`, obsUrl: `/font/${record.id}` };
}
function listSystemFonts() {
  if (systemFontsCache) return systemFontsCache;
  const script = `[Console]::OutputEncoding=[Text.UTF8Encoding]::new($false);$keys=@('HKLM:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts','HKCU:\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Fonts');$names=foreach($key in $keys){if(Test-Path $key){(Get-ItemProperty $key).PSObject.Properties|Where-Object{$_.MemberType -eq 'NoteProperty' -and $_.Name -notlike 'PS*'}|ForEach-Object{$_.Name}}};ConvertTo-Json @($names) -Compress`;
  let registryNames=[];
  try {
    const encoded=Buffer.from(script,'utf16le').toString('base64');
    const output=execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-EncodedCommand',encoded],{encoding:'utf8',windowsHide:true});
    registryNames=JSON.parse(output.replace(/^\uFEFF/,'').trim()||'[]');
  } catch {}
  systemFontsCache = normalizeRegistryFontNames(['Microsoft YaHei','SimSun','SimHei','Arial','Segoe UI',...registryNames]);
  return systemFontsCache;
}
function fontList() {
  return { systemFonts: listSystemFonts(), importedFonts: (state.importedFonts || []).map(publicFont) };
}
function broadcast() {
  const safe = publicState();
  for (const win of [mainWindow, overlayWindow]) if (win && !win.isDestroyed()) win.webContents.send('state', safe);
  sendBrowserEvent('state', safe);
}
function sendBrowserEvent(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of browserClients) { try { client.write(payload); } catch { browserClients.delete(client); } }
}
function setStatus(status, connected = state.connected) {
  state.status = status; state.connected = connected; save(); broadcast();
}
function cookieHeader() { return Object.entries(state.cookies).map(([k,v]) => `${k}=${v}`).join('; '); }
function parseCookiesLegacy(headers) {
  const result = {};
  for (const row of headers || []) {
    const pair = row.split(';', 1)[0];
    const at = pair.indexOf('=');
    if (at > 0) result[pair.slice(0, at)] = pair.slice(at + 1);
  }
  return result;
}
async function getWbiKey() {
  const response = await axios.get('https://api.bilibili.com/x/web-interface/nav', {
    headers: { Cookie: cookieHeader(), 'User-Agent': UA, Referer: 'https://www.bilibili.com/' }, timeout: 10000
  });
  const wbi = response.data?.data?.wbi_img;
  if (!wbi) throw new Error('无法获取 WBI 登录密钥，请重新扫码登录');
  const img = wbi.img_url.split('/').pop().split('.')[0];
  const sub = wbi.sub_url.split('/').pop().split('.')[0];
  const source = img + sub;
  const index = [46,47,18,2,53,8,23,32,15,50,10,31,58,3,45,35,27,43,5,49,33,9,42,19,29,28,14,39,12,38,41,13];
  return index.map(i => source[i] || '').join('');
}
async function getDanmuConfig(roomId) {
  const key = await getWbiKey();
  const params = { id: roomId, type: 0, wts: String(Math.floor(Date.now() / 1000)) };
  const sorted = Object.keys(params).sort().reduce((out, name) => {
    out[name] = String(params[name]).replace(/[!'()*]/g, ''); return out;
  }, {});
  const query = new URLSearchParams(sorted).toString();
  params.w_rid = crypto.createHash('md5').update(query + key).digest('hex');
  const response = await axios.get('https://api.live.bilibili.com/xlive/web-room/v1/index/getDanmuInfo', {
    params,
    headers: { Cookie: cookieHeader(), 'User-Agent': UA, Referer: `https://live.bilibili.com/${roomId}`, Origin: 'https://live.bilibili.com' },
    timeout: 10000
  });
  if (response.data.code !== 0) throw new Error(`获取弹幕服务器失败：${response.data.message || response.data.code}`);
  const data = response.data.data;
  if (!data?.token || !data.host_list?.length) throw new Error('B 站未返回可用的弹幕服务器，请重新扫码登录');
  const host = data.host_list.find(item => item.wss_port) || data.host_list[0];
  return { key: data.token, address: `wss://${host.host}:${host.wss_port || 443}/sub` };
}
async function getUser() {
  const res = await axios.get('https://api.bilibili.com/x/web-interface/nav', { headers: { Cookie: cookieHeader(), 'User-Agent': UA, Referer: 'https://www.bilibili.com/' }, timeout: 10000 });
  if (res.data.code !== 0 || !res.data.data?.isLogin) throw new Error('登录状态无效');
  const u = res.data.data;
  return { uid: u.mid, name: u.uname, face: u.face };
}
function normalizeGiftLegacy(raw) {
  const cmd = String(raw.cmd || '').split(':')[0];
  const d = raw.data || {};
  if (cmd === 'SEND_GIFT') {
    const blind = d.blind_gift || d.blindGift || null;
    const count = Number(d.num || 1);
    const unitPrice = blind && !state.config.blindboxCalcOriginal ? Number(blind.original_gift_price || d.price || 0) : Number(d.price || 0);
    return { type: blind ? 'blindbox' : 'gift', sender: d.uname || d.user_info?.uname || '观众', face: d.face || d.user_info?.face || '', gift: blind?.gift_name || d.giftName || '礼物', blindboxName: d.giftName || '盲盒', count, price: unitPrice * count / 1000, coinType: d.coin_type || d.coinType || 'gold' };
  }
  if (cmd === 'GUARD_BUY') return { type: 'guard', sender: d.username || d.uname || '观众', face: d.face || '', gift: d.gift_name || ['总督','提督','舰长'][Number(d.guard_level || 3) - 1] || '大航海', count: Number(d.num || 1), price: Number(d.price || 0) * Number(d.num || 1) / 1000 };
  if (cmd === 'SUPER_CHAT_MESSAGE') return { type: 'sc', sender: d.user_info?.uname || d.uname || '观众', face: d.user_info?.face || '', gift: '醒目留言', count: 1, price: Number(d.price || 0), content: d.message || '' };
  return null;
}
function dispatchGift(gift) {
  if (!gift) return;
  if (state.config.ignoreFree && gift.type === 'gift' && (gift.coinType !== 'gold' || gift.price <= 0)) return;
  if (!['guard'].includes(gift.type) && gift.price < Number(state.config.minPrice || 0)) return;
  if (state.overlayVisible && overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.webContents.send('gift', gift);
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('gift', gift);
  sendBrowserEvent('gift', gift);
}
async function disconnectLive(update = true) {
  clearTimeout(reconnectTimer); reconnectTimer = null;
  liveGeneration += 1;
  if (live) { try { live.close(); } catch {} live = null; }
  state.connected = false; state.connecting = false; state.connectionDesired = false;
  if (update) setStatus('未连接直播间', false);
}
function scheduleLiveReconnect(roomId, generation) {
  clearTimeout(reconnectTimer);
  if (!state.connectionDesired || generation !== liveGeneration) return;
  const delay = Math.min(30000, 4000 * Math.max(1, ++reconnectAttempts));
  reconnectTimer = setTimeout(() => {
    if (!state.connectionDesired || generation !== liveGeneration || state.connected) return;
    openLiveConnection(roomId, true).catch(() => {});
  }, delay);
}
async function openLiveConnection(clean, reconnecting = false) {
  const generation = ++liveGeneration;
  clearTimeout(reconnectTimer); reconnectTimer = null;
  if (live) { try { live.close(); } catch {} live = null; }
  state.connected = false; state.connecting = true;
  setStatus(reconnecting ? `正在重新连接直播间 ${clean}…` : `正在连接直播间 ${clean}…`, false);
  let longId;
  let conf;
  try {
    longId = await getRoomid(Number(clean));
    conf = await getDanmuConfig(longId);
  } catch (error) {
    if (generation !== liveGeneration) return publicState();
    state.connecting = false;
    setStatus(`连接失败：${error.message}${state.connectionDesired ? '，将自动重试' : ''}`, false);
    scheduleLiveReconnect(clean, generation);
    throw error;
  }
  if (generation !== liveGeneration || !state.connectionDesired) return publicState();
  const opts = { key: conf.key, address: conf.address, uid: Number(state.cookies.DedeUserID || state.user?.uid || 0), buvid: state.cookies.buvid3 || '' };
  live = new KeepLiveWS(longId, opts);
  live.interval = 3000;
  live.on('live', () => {
    if (generation !== liveGeneration || !state.connectionDesired) return;
    clearTimeout(reconnectTimer); reconnectTimer = null; reconnectAttempts = 0;
    state.connecting = false;
    setStatus(`已连接直播间 ${clean}`, true);
  });
  live.on('msg', dispatchGiftFromMessage);
  live.on('error', err => {
    if (generation !== liveGeneration || !state.connectionDesired) return;
    state.connected = false; state.connecting = true;
    setStatus(`连接波动：${err?.message || '网络异常'}，正在自动重连…`, false);
    scheduleLiveReconnect(clean, generation);
  });
  live.on('close', () => {
    if (generation !== liveGeneration || !state.connectionDesired) return;
    state.connected = false; state.connecting = true;
    setStatus('连接中断，正在自动重连…', false);
    scheduleLiveReconnect(clean, generation);
  });
  reconnectTimer = setTimeout(() => {
    if (generation === liveGeneration && state.connectionDesired && !state.connected) openLiveConnection(clean, true).catch(() => {});
  }, 20000);
  return publicState();
}
async function connectLive(roomId) {
  if (!state.authenticated) throw new Error('请先扫码登录');
  const clean = String(roomId || '').trim();
  if (!/^\d+$/.test(clean)) throw new Error('请输入正确的数字直播间号');
  await disconnectLive(false);
  state.roomId = clean; state.connectionDesired = true; state.connecting = true;
  save(); broadcast();
  return openLiveConnection(clean, false);
}
function dispatchGiftFromMessage(raw) { dispatchGift(normalizeGift(raw, state.config)); }
function createWindows() {
  const appIcon = path.join(__dirname, '..', 'Unia-Icon.png');
  mainWindow = new BrowserWindow({ width: 1180, height: 800, minWidth: 920, minHeight: 650, backgroundColor: '#0c0d14', title: 'Unia答谢助手', icon: appIcon, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false } });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  const savedBounds = state.overlayBounds || { width: 900, height: 650 };
  overlayWindow = new BrowserWindow({ x: savedBounds.x, y: savedBounds.y, width: Math.max(320, savedBounds.width || 900), height: Math.max(240, savedBounds.height || 650), minWidth: 320, minHeight: 240, transparent: true, frame: false, resizable: true, alwaysOnTop: true, skipTaskbar: true, show: state.overlayVisible, hasShadow: false, icon: appIcon, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false } });
  overlayWindow.setIgnoreMouseEvents(true);
  overlayWindow.loadFile(path.join(__dirname, 'renderer', 'overlay.html'));
  const persistBounds = () => {
    clearTimeout(boundsSaveTimer);
    boundsSaveTimer = setTimeout(() => {
      if (!overlayWindow || overlayWindow.isDestroyed()) return;
      state.overlayBounds = overlayWindow.getBounds(); save(); broadcast();
    }, 250);
  };
  overlayWindow.on('move', persistBounds);
  overlayWindow.on('resize', persistBounds);
  overlayWindow.on('closed', () => { overlayWindow = null; });
}
function mimeLegacy(file) {
  return ({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.gif':'image/gif','.mp3':'audio/mpeg','.wav':'audio/wav','.ogg':'audio/ogg','.m4a':'audio/mp4','.ttf':'font/ttf','.otf':'font/otf','.woff':'font/woff','.woff2':'font/woff2'})[path.extname(file).toLowerCase()] || 'application/octet-stream';
}
function startLocalServer() {
  const rendererDir = path.join(__dirname, 'renderer');
  localServer = http.createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${LOCAL_PORT}`);
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (url.pathname === '/api/state') { res.setHeader('Content-Type','application/json; charset=utf-8'); return res.end(JSON.stringify(publicState())); }
    if (url.pathname === '/events') {
      res.writeHead(200, {'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive','Access-Control-Allow-Origin':'*'});
      res.write(`event: state\ndata: ${JSON.stringify(publicState())}\n\n`); browserClients.add(res);
      req.on('close', () => browserClients.delete(res)); return;
    }
    if (url.pathname === '/asset') {
      const file = url.searchParams.get('path') || '';
      if (!path.isAbsolute(file) || !fs.existsSync(file)) { res.writeHead(404); return res.end('Not found'); }
      res.setHeader('Content-Type', mime(file)); return fs.createReadStream(file).pipe(res);
    }
    if (url.pathname.startsWith('/font/')) {
      const record = state.importedFonts.find(font => font.id === url.pathname.slice('/font/'.length));
      const managedFile = fontFile(record);
      if (!managedFile || !fs.existsSync(managedFile)) { res.writeHead(404); return res.end('Not found'); }
      res.setHeader('Content-Type', mime(managedFile)); return fs.createReadStream(managedFile).pipe(res);
    }
    const files = {'/overlay':'overlay.html','/overlay.html':'overlay.html','/overlay.js':'overlay.js','/layout-utils.js':'layout-utils.js','/style-utils.js':'style-utils.js'};
    const name = files[url.pathname];
    if (!name) { res.writeHead(404); return res.end('Not found'); }
    const file = path.join(rendererDir, name); res.setHeader('Content-Type', mime(file)); fs.createReadStream(file).pipe(res);
  });
  localServer.on('error', err => {
    state.status = `OBS 本地接口启动失败：${err.message}`;
    save(); broadcast();
  });
  localServer.listen(LOCAL_PORT, '127.0.0.1', () => {
    if (String(state.status).startsWith('OBS 本地接口启动失败')) {
      state.status = state.connected
        ? `已连接直播间 ${state.roomId}`
        : state.authenticated
          ? '登录成功，请连接直播间'
          : '请扫码登录';
      save(); broadcast();
    }
  });
}

app.whenReady().then(() => {
  if (!gotSingleInstanceLock) return;
  dataFile = path.join(app.getPath('userData'), 'settings.json');
  fontsDir = path.join(app.getPath('userData'), 'fonts');
  fs.mkdirSync(fontsDir, { recursive: true });
  try { const old = JSON.parse(fs.readFileSync(dataFile, 'utf8').replace(/^\uFEFF/, '')); state = { ...state, ...old, importedFonts: Array.isArray(old.importedFonts) ? old.importedFonts : [], config: StyleUtils.normalizeStyleConfig({ ...state.config, ...(old.config || {}) }), connected: false }; } catch { state.config = StyleUtils.normalizeStyleConfig(state.config); }
  if (!state.overlayDefaultApplied) {
    state.overlayVisible = false;
    state.overlayDefaultApplied = true;
    save();
  }
  protocol.handle('asset', request => {
    const parsed = new URL(request.url);
    if (parsed.hostname === 'font') {
      const record = state.importedFonts.find(font => font.id === parsed.pathname.slice(1));
      const managedFile = fontFile(record);
      if (!managedFile || !fs.existsSync(managedFile)) return new Response('Not found', { status: 404 });
      return net.fetch(require('url').pathToFileURL(managedFile).toString());
    }
    const filePath = parsed.searchParams.get('path') || '';
    if (!path.isAbsolute(filePath) || !fs.existsSync(filePath)) return new Response('Not found', { status: 404 });
    return net.fetch(require('url').pathToFileURL(filePath).toString());
  });
  createWindows();
  startLocalServer();
  if (state.authenticated && state.roomId) connectLive(state.roomId).catch(e => setStatus(e.message, false));
});
app.on('window-all-closed', () => { disconnectLive(false); localServer?.close(); app.quit(); });

ipcMain.handle('state:get', () => publicState());
ipcMain.handle('auth:create-qr', async () => {
  const res = await axios.get('https://passport.bilibili.com/x/passport-login/web/qrcode/generate', { headers: { 'User-Agent': UA, Referer: 'https://www.bilibili.com/' }, timeout: 10000 });
  if (res.data.code !== 0) throw new Error(res.data.message || '二维码生成失败');
  const { url, qrcode_key } = res.data.data;
  return { key: qrcode_key, image: await QRCode.toDataURL(url, { width: 280, margin: 2 }) };
});
ipcMain.handle('auth:poll-qr', async (_e, key) => {
  const res = await axios.get('https://passport.bilibili.com/x/passport-login/web/qrcode/poll', { params: { qrcode_key: key }, headers: { 'User-Agent': UA, Referer: 'https://www.bilibili.com/' }, timeout: 10000 });
  const result = res.data.data;
  if (result.code === 0) {
    state.cookies = parseCookies(res.headers['set-cookie']);
    try {
      const finger = await axios.get('https://api.bilibili.com/x/frontend/finger/spi', { headers: { Cookie: cookieHeader(), 'User-Agent': UA, Referer: 'https://www.bilibili.com/' }, timeout: 7000 });
      if (finger.data.code === 0) { state.cookies.buvid3 = finger.data.data.b_3; state.cookies.buvid4 = finger.data.data.b_4; }
    } catch {}
    state.user = await getUser(); state.authenticated = true; state.status = '登录成功，请连接直播间'; save(); broadcast();
  }
  return { code: result.code, message: result.message || '' };
});
ipcMain.handle('auth:logout', async () => { await disconnectLive(false); state.authenticated = false; state.user = null; state.cookies = {}; state.status = '请扫码登录'; save(); broadcast(); return publicState(); });
ipcMain.handle('live:connect', (_e, id) => connectLive(id));
ipcMain.handle('live:disconnect', async () => { await disconnectLive(); return publicState(); });
ipcMain.handle('config:save', (_e, config) => { state.config = StyleUtils.normalizeStyleConfig({ ...state.config, ...config }); save(); broadcast(); return state.config; });
ipcMain.handle('fonts:list', () => fontList());
ipcMain.handle('fonts:import', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties:['openFile'], filters:[{ name:'字体文件', extensions:['ttf','otf','woff','woff2'] }] });
  if (result.canceled) return null;
  const source = result.filePaths[0];
  if (!StyleUtils.isSupportedFontExtension(source)) throw new Error('仅支持 TTF、OTF、WOFF 和 WOFF2 字体');
  const buffer = fs.readFileSync(source);
  if (!buffer.length) throw new Error('字体文件为空');
  const id = crypto.createHash('sha256').update(buffer).digest('hex');
  const existing = state.importedFonts.find(font => font.id === id);
  if (existing) return publicFont(existing);
  let parsed;
  try { parsed = fontkit.create(buffer); } catch { throw new Error('字体文件损坏或格式不受支持'); }
  const family = String(parsed.familyName || parsed.fullName || parsed.postscriptName || '').trim();
  if (!family) throw new Error('无法读取字体内部名称');
  const format = path.extname(source).slice(1).toLowerCase();
  const record = { id, family, displayName: family, format, cssFamily: `UniaImported_${id.slice(0,16)}` };
  const destination = fontFile(record);
  fs.copyFileSync(source, destination);
  state.importedFonts.push(record);
  save(); broadcast();
  return publicFont(record);
});
ipcMain.handle('asset:choose', async (_e, kind) => {
  const filters = kind === 'audio' ? [{ name: '音频', extensions: ['mp3','wav','ogg','m4a'] }] : [{ name: '图片', extensions: ['png','jpg','jpeg','webp','gif'] }];
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'], filters });
  return result.canceled ? '' : result.filePaths[0];
});
ipcMain.handle('overlay:set-visible', (_e, visible) => { state.overlayVisible = !!visible; if (overlayWindow) { if (visible) overlayWindow.showInactive(); else { overlayEditing = false; overlayWindow.setIgnoreMouseEvents(true); overlayWindow.webContents.send('overlay-editing', false); overlayWindow.hide(); } } save(); broadcast(); return state.overlayVisible; });
ipcMain.handle('overlay:set-options', (_e, options) => {
  if (typeof options?.visual === 'boolean') state.desktopVisualEnabled = options.visual;
  if (typeof options?.audio === 'boolean') state.desktopAudioEnabled = options.audio;
  save(); broadcast();
  return { visual: state.desktopVisualEnabled, audio: state.desktopAudioEnabled };
});
ipcMain.handle('overlay:set-editing', (_e, editing) => {
  overlayEditing = !!editing;
  if (!overlayWindow || overlayWindow.isDestroyed()) return overlayEditing;
  if (overlayEditing) {
    state.overlayVisible = true;
    overlayWindow.show(); overlayWindow.focus(); overlayWindow.setIgnoreMouseEvents(false);
  } else {
    overlayWindow.setIgnoreMouseEvents(true);
    mainWindow?.show(); mainWindow?.focus();
  }
  overlayWindow.webContents.send('overlay-editing', overlayEditing);
  save(); broadcast(); return overlayEditing;
});
ipcMain.handle('overlay:reset-bounds', () => {
  if (!overlayWindow || overlayWindow.isDestroyed()) return false;
  overlayWindow.setBounds({ x: 100, y: 100, width: 900, height: 650 });
  state.overlayBounds = overlayWindow.getBounds(); save(); broadcast(); return true;
});
ipcMain.on('overlay:resize-begin', (_e, data) => {
  if (!overlayEditing || !overlayWindow || overlayWindow.isDestroyed()) return;
  overlayResize = { direction: data.direction, startX: data.x, startY: data.y, bounds: overlayWindow.getBounds() };
});
ipcMain.on('overlay:resize-update', (_e, data) => {
  if (!overlayResize || !overlayWindow || overlayWindow.isDestroyed()) return;
  const { direction, startX, startY, bounds } = overlayResize;
  const dx = data.x - startX, dy = data.y - startY;
  let { x, y, width, height } = bounds;
  if (direction.includes('e')) width = Math.max(320, bounds.width + dx);
  if (direction.includes('s')) height = Math.max(240, bounds.height + dy);
  if (direction.includes('w')) { width = Math.max(320, bounds.width - dx); x = bounds.x + bounds.width - width; }
  if (direction.includes('n')) { height = Math.max(240, bounds.height - dy); y = bounds.y + bounds.height - height; }
  overlayWindow.setBounds({ x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) });
});
ipcMain.on('overlay:resize-end', () => { overlayResize = null; });
ipcMain.handle('overlay:test', (_e, kind) => {
  const samples = { gift: { type:'gift',sender:'测试观众',face:'',gift:'小花花',count:10,price:10,coinType:'gold' }, blindbox:{type:'blindbox',sender:'盲盒欧皇',face:'',gift:'浪漫城堡',blindboxName:'心动盲盒',count:1,price:2233}, guard:{type:'guard',sender:'大航海家',face:'',gift:'舰长',count:1,price:138}, sc:{type:'sc',sender:'醒目留言用户',face:'',gift:'醒目留言',count:1,price:30,content:'主播加油！'} };
  dispatchGift(samples[kind] || samples.gift); return true;
});
