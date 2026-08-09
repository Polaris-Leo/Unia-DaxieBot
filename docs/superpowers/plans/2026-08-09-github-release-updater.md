# GitHub Release 手动更新 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增加 GitHub Release 检查、官方/加速双线路、便携版指定位置下载启动，以及安装版 NSIS 手动差分更新，并以 `1.0.2` 发布。

**Architecture:** 主进程中的 update 子系统负责可信 Release 数据、下载和 NsisUpdater，preload 暴露固定 IPC，渲染端控制器只管理显示和用户操作。便携版走受控流式下载，安装版走 electron-updater 差分协议。

**Tech Stack:** Electron 37.10.3、Node.js CommonJS、axios、electron-updater、electron-builder、Node test runner、GitHub Releases。

## Global Constraints

- 功能版本必须为 `1.0.2`。
- 仓库固定为 `Polaris-Leo/Unia-DaxieBot`，只接受正式 Release 中的 HTTPS EXE。
- 官方源和 `https://gh-proxy.com/` 加速源均由用户明确选择，不静默切换。
- 便携版始终完整下载；安装版从 `1.0.2` 之后使用差分更新。
- Release 必须包含 Setup EXE、Setup blockmap、`latest.yml` 和 Portable EXE。
- 所有生产逻辑先写失败测试，再实现最小代码。

---

### Task 1: 版本和 Release 数据模块

**Files:**
- Create: `src/main/update/version.cjs`
- Create: `src/main/update/release-client.cjs`
- Create: `test/update-version.test.cjs`
- Create: `test/release-client.test.cjs`

**Interfaces:**
- Produces: `normalizeVersion(value)`、`compareVersions(left, right)`、`sourceUrl(source, officialUrl)`、`normalizeRelease(payload)`、`createReleaseClient({ axios, currentVersion })`。
- Consumes: GitHub latest Release JSON 和来源值 `official|proxy`。

- [ ] **Step 1: 写版本比较与 URL 的失败测试**

```js
test('compareVersions handles v-prefixed semver', () => {
  assert.equal(compareVersions('v1.0.2', '1.0.1'), 1);
});
test('sourceUrl prefixes proxy exactly once', () => {
  assert.equal(sourceUrl('proxy', 'https://api.github.com/repos/Polaris-Leo/Unia-DaxieBot/releases/latest'), 'https://gh-proxy.com/https://api.github.com/repos/Polaris-Leo/Unia-DaxieBot/releases/latest');
});
```

- [ ] **Step 2: 写 Release 过滤的失败测试**

构造包含 Setup、Portable、ZIP、其他仓库 URL 和预发布标记的 JSON；断言只保留两个可信 EXE，并正确标记 `installed`/`portable`。

- [ ] **Step 3: 验证 RED**

Run: `node --test --test-isolation=none test/update-version.test.cjs test/release-client.test.cjs`
Expected: FAIL，模块不存在。

- [ ] **Step 4: 实现纯逻辑和客户端**

Release 客户端使用 15 秒超时和固定 User-Agent；返回 `{ currentVersion, latestVersion, updateAvailable, title, publishedAt, pageUrl, assets }`，附件字段只含 `{ id, name, size, type, downloadUrl }`。

- [ ] **Step 5: 验证 GREEN 并提交**

Run: `npm test`
Expected: 全部 PASS。

Run: `git add src/main/update test/update-version.test.cjs test/release-client.test.cjs && git commit -m "feat: add trusted GitHub release client"`

### Task 2: 便携版下载器

**Files:**
- Create: `src/main/update/portable-downloader.cjs`
- Create: `test/portable-downloader.test.cjs`

**Interfaces:**
- Produces: `createPortableDownloader({ axios, dialog, shell, app, fs, emitProgress })`，方法 `{ download(asset, source), cancel(), dispose() }`。
- Consumes: Task 1 已规范化且 `type === 'portable'` 的附件。

- [ ] **Step 1: 写失败测试**

覆盖 `.part` 写入后改名、响应字节数不符时清理、并发下载拒绝、代理 URL 拼接、`shell.openPath()` 返回错误时不退出应用。

- [ ] **Step 2: 验证 RED**

Run: `node --test --test-isolation=none test/portable-downloader.test.cjs`
Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现流式下载状态机**

状态固定为 `idle|choosing|downloading|launching|complete|error|cancelled`；每个进度事件含 `{ phase, percent, transferred, total, bytesPerSecond, filePath }`。只在启动成功后调用 `app.quit()`。

- [ ] **Step 4: 验证 GREEN 并提交**

Run: `npm test`
Expected: 全部 PASS。

Run: `git add src/main/update/portable-downloader.cjs test/portable-downloader.test.cjs && git commit -m "feat: download portable updates safely"`

### Task 3: 安装版差分更新器

**Files:**
- Create: `src/main/update/installed-updater.cjs`
- Create: `test/installed-updater.test.cjs`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**
- Produces: `createInstalledUpdater({ NsisUpdater, app, emitProgress })`，方法 `{ check(source), download(), install(), cancel(), dispose() }`。
- Consumes: electron-updater `NsisUpdater` 事件和 `official|proxy` 来源。

- [ ] **Step 1: 写状态映射失败测试**

使用可发事件的 fake updater，断言 `checking-for-update`、`update-available`、`download-progress`、`update-downloaded` 和 `error` 映射为稳定 IPC 数据；断言 `autoDownload === false`、`disableDifferentialDownload === false`。

- [ ] **Step 2: 验证 RED**

Run: `node --test --test-isolation=none test/installed-updater.test.cjs`
Expected: FAIL，模块不存在。

- [ ] **Step 3: 添加精确依赖并实现 updater**

安装与锁定当前兼容的 `electron-updater`。官方 provider 指向 GitHub；代理 provider 使用 Generic URL。加速差分失败时抛出带 `PROXY_DIFFERENTIAL_FAILED` 代码的错误，不自动改为完整下载。

- [ ] **Step 4: 验证 GREEN 并提交**

Run: `npm test`
Expected: 全部 PASS。

Run: `git add src/main/update/installed-updater.cjs test/installed-updater.test.cjs package.json package-lock.json && git commit -m "feat: add manual NSIS differential updater"`

### Task 4: IPC、preload 和更新界面

**Files:**
- Create: `src/main/update/ipc.cjs`
- Create: `src/renderer/app/update-controls.js`
- Create: `test/update-controls.test.cjs`
- Modify: `src/main.cjs`
- Modify: `src/preload.cjs`
- Modify: `src/renderer/index.html`
- Modify: `src/renderer/app.js`
- Modify: `src/renderer/styles.css`

**Interfaces:**
- Produces: IPC `update:check`、`update:download-portable`、`update:download-installed`、`update:install`、`update:cancel`、事件 `update:progress`。
- Consumes: Tasks 1–3 服务和规范化数据。

- [ ] **Step 1: 写更新控制器失败测试**

测试大小格式化、安装版/便携版按钮文案、无更新状态和代理失败切换提示。

- [ ] **Step 2: 验证 RED**

Run: `node --test --test-isolation=none test/update-controls.test.cjs`
Expected: FAIL，模块不存在。

- [ ] **Step 3: 注册固定 IPC 和 preload API**

主进程只按已缓存的可信附件 ID 启动下载，不接受渲染端传入任意 URL。退出时调用两个 updater 的 `dispose()`。

- [ ] **Step 4: 实现更新卡片和进度界面**

在 about 页面渲染当前/最新版本、线路单选、附件列表、操作按钮和 `<progress>`；加载 `update-controls.js` 后由 `app.js` 安装控制器。

- [ ] **Step 5: 验证 GREEN、语法和提交**

Run: `npm test; node --check src/main.cjs; node --check src/preload.cjs; node --check src/renderer/app/update-controls.js`
Expected: 全部 PASS。

Run: `git add src/main.cjs src/main/update/ipc.cjs src/preload.cjs src/renderer test/update-controls.test.cjs && git commit -m "feat: add in-app update controls"`

### Task 5: 版本与发布配置

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `scripts/build-portable.cjs`
- Modify: `README.md`

**Interfaces:**
- Produces: `1.0.2` 和 Setup EXE/blockmap、`latest.yml`、Portable EXE 四类产物。
- Consumes: electron-builder GitHub publish 配置。

- [ ] **Step 1: 运行版本失败断言**

Run: `node -e "if(require('./package.json').version!=='1.0.2') process.exit(1)"`
Expected: 退出码 1。

- [ ] **Step 2: 更新版本和 publish 配置**

设置 `version: 1.0.2`，增加 `{ provider: 'github', owner: 'Polaris-Leo', repo: 'Unia-DaxieBot' }`；构建脚本只清理 portable 临时目录，不删除安装版更新元数据。

- [ ] **Step 3: 更新文档并提交**

README 说明双线路、首次完整升级、后续差分更新和便携版保存行为。

Run: `git add package.json package-lock.json scripts/build-portable.cjs README.md && git commit -m "chore: prepare v1.0.2 updater release"`

### Task 6: 验证、构建、合并和发布

**Files:**
- Generate ignored: `release/Unia-DaxieBot-1.0.2-*`, `release/latest.yml`
- External: GitHub `main` and Release `v1.0.2`

**Interfaces:**
- Produces: 合并后的 `main` 和完整更新 Release。
- Consumes: Tasks 1–5 的绿色功能分支。

- [ ] **Step 1: 完整验证**

Run: `npm test; node --check src/main.cjs; node --check src/preload.cjs; Get-ChildItem src/main/update -Filter *.cjs | ForEach-Object { node --check $_.FullName }; Get-ChildItem src/renderer/app -Filter *.js | ForEach-Object { node --check $_.FullName }`
Expected: 测试失败数 0，全部语法检查成功。

- [ ] **Step 2: 构建安装版与便携版**

Run: `npm run build; npm run build:portable`
Expected: 两条命令退出码 0。

- [ ] **Step 3: 校验四类产物**

Run: `Get-Item release/Unia-DaxieBot-1.0.2-Setup.exe,release/Unia-DaxieBot-1.0.2-Setup.exe.blockmap,release/latest.yml,release/Unia-DaxieBot-1.0.2-Portable.exe | Select-Object Name,Length`
Expected: 四个文件均存在且长度大于 0。

- [ ] **Step 4: 合并并推送**

在 `main` 上执行 `git merge --ff-only agent/github-release-updater`，重新运行 `npm test`，然后 `git push origin main`。

- [ ] **Step 5: 创建正式 Release**

创建并推送标签 `v1.0.2`，用 `gh release create` 上传四个产物，设为 latest、非草稿、非预发布。

- [ ] **Step 6: 远端验收**

Run: `gh release view v1.0.2 --repo Polaris-Leo/Unia-DaxieBot --json url,isDraft,isPrerelease,assets`
Expected: 四个规定附件均为 `uploaded`，Release 正式公开。
