# 更新界面、自动线路与可靠退出 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 优化更新按钮，自动选择更新源，按运行形态和新版本状态显示唯一下载操作，并确保关闭主面板后进程完整退出。

**Architecture:** 主进程提供运行形态和代理优先/官方回退策略，渲染端成为纯状态视图；独立生命周期模块提供幂等 shutdown，由主窗口关闭和应用退出共同调用。

**Tech Stack:** Electron、CommonJS、原生 DOM/CSS、Node test runner。

## Global Constraints

- 默认 `gh-proxy.com`，失败后自动重试 GitHub 官方源一次。
- 用户界面不显示线路选择控件。
- 安装版只显示增量更新，便携版只显示便携版下载。
- 没有新版本时不显示任何下载操作。
- 关闭主面板必须终止应用进程和本地端口。

### Task 1: 运行形态与自动线路

**Files:** Create `src/main/update/runtime.cjs`, modify update services and IPC, add tests.

- [ ] 写 `detectRuntimeType`、代理优先回退和附件过滤失败测试。
- [ ] 运行测试确认因接口缺失失败。
- [ ] 实现 `development|installed|portable` 检测及 `proxy → official` 策略。
- [ ] 让检查和下载 IPC 不再接收来源，并返回实际来源。
- [ ] 运行完整测试。

### Task 2: 更新卡片状态与视觉

**Files:** Modify `src/renderer/app/update-controls.js`, `index.html`, `styles.css`, tests.

- [ ] 写无新版、安装版和便携版唯一操作的失败测试。
- [ ] 删除线路单选，按 `runtimeType` 渲染唯一按钮。
- [ ] 实现渐变按钮、加载图标、成功状态、焦点环和 reduced-motion。
- [ ] 运行测试与语法检查。

### Task 3: 幂等退出生命周期

**Files:** Create `src/main/app-lifecycle.cjs`, modify `src/main.cjs`, add test.

- [ ] 写重复调用只清理一次的失败测试。
- [ ] 实现 `createShutdown`，顺序释放直播、updater、服务器和浮窗。
- [ ] 主窗口 `close`、`before-quit`、`window-all-closed` 复用 shutdown。
- [ ] 运行完整测试和 Electron 启停验证。

### Task 4: 构建、合并与推送

- [ ] 运行完整测试及全部新增文件语法检查。
- [ ] 构建安装版和便携版。
- [ ] 提交功能分支，快进合并到 `main`。
- [ ] 合并后再跑测试并推送 `origin/main`。
