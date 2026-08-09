# 浅色主题与设置页 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 默认启用浅色主面板主题，增加可持久化主题设置页，并把更新功能迁移到设置页后发布 v1.0.4。

**Architecture:** 主进程状态保存 `appearance.theme`；渲染端主题控制器将状态映射到根元素 data attribute；CSS 用语义变量覆盖主面板，浮窗与 OBS 保持独立。

**Tech Stack:** Electron、CommonJS、原生 DOM/CSS、Node test runner、electron-builder。

## Global Constraints

- 默认主题为 `light`，合法值仅 `light|dark`。
- 主题只影响主面板，不影响桌面浮窗和 OBS。
- 更新功能完整迁移到设置页。
- 版本为 `1.0.4`，发布四类更新产物。

### Task 1: 主题纯逻辑与持久化

**Files:** Create `src/renderer/app/theme-controls.js`, `test/theme-controls.test.cjs`; modify `src/main.cjs`, `src/preload.cjs`.

- [ ] 写主题规范化、默认浅色和状态应用失败测试。
- [ ] 验证 RED。
- [ ] 实现主题控制器和 `appearance:set-theme` IPC。
- [ ] 验证 GREEN 和完整测试。

### Task 2: 设置页与双主题视觉

**Files:** Modify `src/renderer/index.html`, `src/renderer/app.js`, `src/renderer/styles.css`.

- [ ] 新增设置导航和外观/更新/版本卡片。
- [ ] 从使用说明移除更新卡片并迁移到设置页。
- [ ] 将颜色替换为语义变量，定义默认浅色和深色覆盖。
- [ ] 实现主题选项选中态、键盘操作和即时切换。
- [ ] 运行脚本语法、DOM 结构与完整测试。

### Task 3: 版本、构建与发布

**Files:** Modify `package.json`, `package-lock.json`; generate ignored release artifacts.

- [ ] 更新版本为 `1.0.4`。
- [ ] 运行完整测试和语法检查。
- [ ] 实际启动 Electron，验证默认浅色、切换深色和设置页更新区域。
- [ ] 构建 Setup、blockmap、latest.yml 和 Portable。
- [ ] 提交分支、快进合并 main、推送并创建 v1.0.4 Release。
