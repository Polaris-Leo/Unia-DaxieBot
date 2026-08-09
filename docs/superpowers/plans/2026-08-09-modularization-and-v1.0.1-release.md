# Unia 答谢助手模块化与 v1.0.1 发布 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Electron 应用按业务职责拆分为可测试模块，更新到 `1.0.1`，构建两种 Windows EXE，并在公开 GitHub 仓库的 `v1.0.1` Release 中发布。

**Architecture:** `src/main.cjs` 作为主进程组合根，通过工厂函数装配状态、认证、直播、字体、窗口、OBS 服务和 IPC 模块；`src/renderer/app.js` 作为浏览器端初始化入口，通过无打包器的 CommonJS/全局模块拆分现有界面逻辑。所有外部接口、状态格式和 OBS URL 保持兼容。

**Tech Stack:** Electron 37、Node.js CommonJS、原生 DOM、Node test runner、electron-builder、Git、GitHub CLI。

## Global Constraints

- 应用版本必须在 `package.json` 和 `package-lock.json` 中统一为 `1.0.1`。
- 不引入 TypeScript、前端框架或新的运行时依赖。
- 保持 `window.daxie` preload API、`settings.json` 格式、Electron `userData` 目录、端口 `17321` 和 `/overlay` 路径兼容。
- `release/` 保持在 `.gitignore` 中；EXE 只上传到 GitHub Release，不提交到源码历史。
- GitHub 目标是公开仓库 `Unia-DaxieBot`、默认分支 `main`、正式 Release `v1.0.1`。

---

### Task 1: 建立可回溯基线

**Files:**
- Track: `.gitignore`, `README.md`, `Unia-Icon.png`, `package.json`, `package-lock.json`, `scripts/`, `src/`, `test/`, existing `docs/`

**Interfaces:**
- Consumes: 当前未跟踪的完整项目文件。
- Produces: 重构前可回退的 Git 基线和完整测试结果。

- [ ] **Step 1: 检查忽略规则和待提交范围**

Run: `git status --short && git check-ignore release node_modules`
Expected: `release` 与 `node_modules` 均被忽略，源码、测试、文档和清单文件显示为未跟踪。

- [ ] **Step 2: 运行重构前测试**

Run: `npm test`
Expected: 所有现有 Node 测试通过，失败数为 0。

- [ ] **Step 3: 检查现有入口语法**

Run: `node --check src/main.cjs; node --check src/preload.cjs; node --check src/renderer/app.js; node --check src/renderer/overlay.js`
Expected: 四条命令退出码均为 0。

- [ ] **Step 4: 提交完整基线**

Run: `git add .gitignore README.md Unia-Icon.png package.json package-lock.json scripts src test docs && git commit -m "chore: import Unia Daxie Bot source"`
Expected: 提交成功，`git status --short` 无输出。

### Task 2: 抽取共享状态与纯逻辑

**Files:**
- Create: `src/main/state-store.cjs`
- Create: `src/main/bilibili-utils.cjs`
- Create: `src/main/http-utils.cjs`
- Create: `test/state-store.test.cjs`
- Create: `test/bilibili-utils.test.cjs`
- Create: `test/http-utils.test.cjs`
- Modify: `src/main.cjs`

**Interfaces:**
- Produces: `createStateStore({ dataFile, initialState, normalizeConfig, onBroadcast })`，返回 `{ getState, publicState, patch, updateConfig, save }`；`parseCookies(headers)`；`normalizeGift(raw)`；`mime(file)`。
- Consumes: Node `fs`、现有 `StyleUtils.normalizeStyleConfig`、当前状态默认值和礼物字段规则。

- [ ] **Step 1: 为状态边界写失败测试**

```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { createStateStore } = require('../src/main/state-store.cjs');

test('publicState excludes private cookies', () => {
  const store = createStateStore({ initialState: { cookies: { SESSDATA: 'secret' }, status: 'ready' } });
  assert.equal(store.publicState().cookies, undefined);
  assert.equal(store.publicState().status, 'ready');
});
```

- [ ] **Step 2: 为 Cookie、礼物和 MIME 写失败测试**

```js
test('parseCookies reads all set-cookie headers', () => {
  assert.deepEqual(parseCookies(['a=1; Path=/', 'b=2; HttpOnly']), { a: '1', b: '2' });
});
test('mime recognizes renderer assets', () => {
  assert.equal(mime('app.js'), 'text/javascript; charset=utf-8');
  assert.equal(mime('styles.css'), 'text/css; charset=utf-8');
});
```

- [ ] **Step 3: 验证测试因模块尚不存在而失败**

Run: `node --test --test-isolation=none test/state-store.test.cjs test/bilibili-utils.test.cjs test/http-utils.test.cjs`
Expected: FAIL，错误包含 `Cannot find module`。

- [ ] **Step 4: 实现最小纯逻辑模块并替换入口内联函数**

`state-store.cjs` 负责单一状态对象和磁盘保存；`bilibili-utils.cjs` 原样迁移 Cookie 与礼物规范化规则；`http-utils.cjs` 原样迁移扩展名到 Content-Type 的映射。`src/main.cjs` 从新模块导入，不保留重复实现。

- [ ] **Step 5: 运行新增与完整测试**

Run: `npm test`
Expected: 新增测试和原测试全部 PASS。

- [ ] **Step 6: 提交纯逻辑拆分**

Run: `git add src/main.cjs src/main test && git commit -m "refactor: extract main process utilities"`
Expected: 提交成功。

### Task 3: 拆分主进程服务

**Files:**
- Create: `src/main/auth-service.cjs`
- Create: `src/main/live-service.cjs`
- Create: `src/main/font-service.cjs`
- Create: `src/main/window-service.cjs`
- Create: `src/main/obs-server.cjs`
- Create: `src/main/ipc-handlers.cjs`
- Create: `test/live-service.test.cjs`
- Modify: `src/main.cjs`

**Interfaces:**
- Produces: `createAuthService(deps)`、`createLiveService(deps)`、`createFontService(deps)`、`createWindowService(deps)`、`createObsServer(deps)`、`registerIpcHandlers(deps)`。
- Consumes: Task 2 的状态存储与纯逻辑函数，以及 Electron、axios、QRCode、fontkit、bilibili-live-ws 等现有依赖。

- [ ] **Step 1: 写直播连接代次和重连清理的失败测试**

```js
test('manual disconnect cancels a scheduled reconnect', async () => {
  const timers = createFakeTimers();
  const service = createLiveService({ setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout, ...fakeDeps });
  service.scheduleReconnect('123');
  await service.disconnect();
  assert.equal(timers.pendingCount(), 0);
});
```

- [ ] **Step 2: 验证测试因服务模块尚不存在而失败**

Run: `node --test --test-isolation=none test/live-service.test.cjs`
Expected: FAIL，错误包含 `Cannot find module`。

- [ ] **Step 3: 逐个迁移服务并显式注入依赖**

每个工厂只持有本职责的可变资源：直播服务持有 WebSocket、重连计时器和连接代次；窗口服务持有两个 BrowserWindow、编辑状态和缩放会话；OBS 服务持有 HTTP server 与 SSE 客户端集合；字体服务持有字体目录与系统字体缓存。`ipc-handlers.cjs` 只注册通道并调用服务公开方法。

- [ ] **Step 4: 将 `src/main.cjs` 收敛为组合根**

入口仅设置 `dataFile`/`fontsDir`、创建 store 与服务、处理 `whenReady`/`window-all-closed`/`second-instance`，并在退出时依次断开直播和关闭 OBS 服务。

- [ ] **Step 5: 运行测试与主进程语法检查**

Run: `npm test; Get-ChildItem src/main -Filter *.cjs | ForEach-Object { node --check $_.FullName }; node --check src/main.cjs`
Expected: 测试全部 PASS，所有语法检查退出码为 0。

- [ ] **Step 6: 提交主进程服务拆分**

Run: `git add src/main.cjs src/main test/live-service.test.cjs && git commit -m "refactor: modularize main process services"`
Expected: 提交成功。

### Task 4: 拆分渲染进程控制器

**Files:**
- Create: `src/renderer/app/dom.js`
- Create: `src/renderer/app/state-view.js`
- Create: `src/renderer/app/auth-controls.js`
- Create: `src/renderer/app/config-controls.js`
- Create: `src/renderer/app/font-controls.js`
- Create: `src/renderer/app/style-preview.js`
- Create: `src/renderer/app/overlay-controls.js`
- Create: `test/config-controls.test.cjs`
- Modify: `src/renderer/app.js`
- Modify: `src/renderer/index.html`

**Interfaces:**
- Produces: `window.DaxieApp` 命名空间下的 `collectConfig(document)`、`createStateView(deps)`、`createAuthControls(deps)`、`createFontControls(deps)`、`createStylePreview(deps)` 和 `createOverlayControls(deps)`。
- Consumes: 现有 DOM id、`window.daxie`、`StyleUtils` 与 `LayoutUtils`。

- [ ] **Step 1: 写表单配置采集的失败测试**

```js
test('collectConfig converts numeric and boolean controls', () => {
  const document = fakeDocument({ fontSize: { value: '42' }, audioEnabled: { checked: true } });
  const config = collectConfig(document);
  assert.equal(config.fontSize, 42);
  assert.equal(config.audioEnabled, true);
});
```

- [ ] **Step 2: 验证测试因模块尚不存在而失败**

Run: `node --test --test-isolation=none test/config-controls.test.cjs`
Expected: FAIL，错误包含 `Cannot find module`。

- [ ] **Step 3: 实现模块并保持无打包器加载顺序**

每个文件使用兼容浏览器与 Node 测试的包装：`const api = {...}; if (typeof module !== 'undefined') module.exports = api; if (typeof window !== 'undefined') Object.assign(window.DaxieApp ||= {}, api);`。`index.html` 按依赖顺序加载模块，最后加载 `app.js`。

- [ ] **Step 4: 将 `app.js` 收敛为初始化入口**

入口创建共享 UI 状态、安装控制器、订阅 `onState`/`onGift`，并发起 `getState()` 与 `listFonts()`；不保留业务函数实现。

- [ ] **Step 5: 运行测试和浏览器脚本语法检查**

Run: `npm test; Get-ChildItem src/renderer/app -Filter *.js | ForEach-Object { node --check $_.FullName }; node --check src/renderer/app.js`
Expected: 测试全部 PASS，语法检查全部成功。

- [ ] **Step 6: 提交渲染进程拆分**

Run: `git add src/renderer/app.js src/renderer/app src/renderer/index.html test/config-controls.test.cjs && git commit -m "refactor: modularize renderer controllers"`
Expected: 提交成功。

### Task 5: 更新版本和发布元数据

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `README.md`

**Interfaces:**
- Produces: 版本 `1.0.1` 和清晰区分安装版/便携版的文件名与说明。
- Consumes: electron-builder 的 `nsis.artifactName` 与 `portable.artifactName` 配置。

- [ ] **Step 1: 写清单版本断言并确认当前失败**

Run: `node -e "const p=require('./package.json'); const l=require('./package-lock.json'); if(p.version!=='1.0.1'||l.version!=='1.0.1'||l.packages[''].version!=='1.0.1') process.exit(1)"`
Expected: 退出码 1，因为当前版本为 `1.0.14`。

- [ ] **Step 2: 更新三个版本字段和构建文件名**

在 `package.json` 中设置 `version: "1.0.1"`，设置 NSIS 文件名 `Unia答谢助手-${version}-安装版.${ext}`，设置 portable 文件名 `Unia答谢助手-${version}-便携版.${ext}`；同步锁文件根版本字段。README 增加 GitHub Release 下载说明。

- [ ] **Step 3: 验证版本断言与配置 JSON**

Run: `node -e "const p=require('./package.json'); const l=require('./package-lock.json'); if(p.version!=='1.0.1'||l.version!=='1.0.1'||l.packages[''].version!=='1.0.1') process.exit(1); console.log(p.version)"`
Expected: 输出 `1.0.1`，退出码 0。

- [ ] **Step 4: 提交版本更新**

Run: `git add package.json package-lock.json README.md && git commit -m "chore: prepare v1.0.1 release"`
Expected: 提交成功。

### Task 6: 完整验证并构建两种 EXE

**Files:**
- Generate ignored: `release/*.exe`

**Interfaces:**
- Produces: `Unia答谢助手-1.0.1-安装版.exe` 与 `Unia答谢助手-1.0.1-便携版.exe`。
- Consumes: Task 2–5 的源码、测试和 electron-builder 配置。

- [ ] **Step 1: 运行完整自动测试与语法检查**

Run: `npm test; node --check src/main.cjs; node --check src/preload.cjs; Get-ChildItem src/main -Filter *.cjs | ForEach-Object { node --check $_.FullName }; Get-ChildItem src/renderer/app -Filter *.js | ForEach-Object { node --check $_.FullName }`
Expected: 测试失败数为 0，语法检查全部退出码 0。

- [ ] **Step 2: 构建安装版**

Run: `npm run build`
Expected: electron-builder 退出码 0，`release/Unia答谢助手-1.0.1-安装版.exe` 存在。

- [ ] **Step 3: 构建便携版**

Run: `npm run build:portable`
Expected: 脚本退出码 0，`release/Unia答谢助手-1.0.1-便携版.exe` 存在。

- [ ] **Step 4: 核对产物和 Git 清洁度**

Run: `Get-Item 'release/Unia答谢助手-1.0.1-安装版.exe','release/Unia答谢助手-1.0.1-便携版.exe' | Select-Object Name,Length; git status --short`
Expected: 两个文件长度均大于 0，构建产物不出现在 Git 状态中。

### Task 7: 创建公开仓库并发布 GitHub Release

**Files:**
- External: GitHub repository `Unia-DaxieBot`
- External: Git tag and Release `v1.0.1`

**Interfaces:**
- Produces: 公开源码仓库、推送后的 `main`、带两个 EXE 的正式 Release。
- Consumes: 清洁且已验证的本地 Git 历史和 Task 6 产物。

- [ ] **Step 1: 检查 CLI 身份和仓库名是否可用**

Run: `gh --version; gh auth status; gh repo view Unia-DaxieBot`
Expected: CLI 已安装且已认证；最后一条命令报告仓库不存在。若仓库已存在，先检查所有者和内容，避免覆盖。

- [ ] **Step 2: 创建公开仓库并推送 main**

Run: `gh repo create Unia-DaxieBot --public --source . --remote origin --push`
Expected: 仓库创建成功，`origin` 指向新仓库，`main` 已跟踪远端。

- [ ] **Step 3: 创建并推送标签**

Run: `git tag -a v1.0.1 -m "Unia Daxie Bot v1.0.1"; git push origin v1.0.1`
Expected: 本地和远端标签均指向已验证提交。

- [ ] **Step 4: 创建正式 Release 并上传两个附件**

Run: `gh release create v1.0.1 'release/Unia答谢助手-1.0.1-安装版.exe' 'release/Unia答谢助手-1.0.1-便携版.exe' --title 'Unia 答谢助手 v1.0.1' --notes '此版本完成主进程与渲染进程模块化拆分，保持现有配置、浮层和 OBS 接口兼容。安装版适合常规安装，便携版可直接运行。' --latest`
Expected: 创建非草稿、非预发布的公开 Release，并返回 URL。

- [ ] **Step 5: 远端验证仓库和附件**

Run: `gh repo view --json nameWithOwner,visibility,defaultBranchRef,url; gh release view v1.0.1 --json url,isDraft,isPrerelease,assets`
Expected: `visibility` 为 `PUBLIC`，默认分支为 `main`，Release 非草稿/非预发布，`assets` 恰好包含安装版和便携版两个非空 EXE。

- [ ] **Step 6: 最终核对**

Run: `git status -sb; git log --oneline --decorate -8`
Expected: 工作树清洁，`main` 与 `origin/main` 同步，`v1.0.1` 位于最新发布提交。
