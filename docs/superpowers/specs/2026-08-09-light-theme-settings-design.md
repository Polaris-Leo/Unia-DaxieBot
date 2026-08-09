# 浅色主题与设置页设计

## 目标

为程序主面板增加浅色与深色主题，默认使用浅色；新增独立“设置”页面，将主题切换和应用更新迁移到该页面。桌面答谢浮窗与 OBS 浏览器源保持现有透明画面和用户配置，不参与程序主题切换。

## 页面结构

侧边导航在“使用说明”之后增加“设置”。“使用说明”页面只保留操作文档；现有更新卡片完整迁移到设置页。

设置页包含三个卡片：

1. 外观：浅色和深色两个可点击主题选项，展示小型色板、名称和说明，当前选项有清晰选中状态。
2. 应用更新：保留自动优先 gh-proxy、失败回退 GitHub 官方源的检查和下载功能。
3. 版本信息：显示当前应用版本、仓库名称和可点击 GitHub 仓库入口。

## 主题模型与持久化

应用公开状态新增 `appearance: { theme: 'light' | 'dark' }`。默认状态为 `light`；旧版 `settings.json` 缺少该字段时补为 `light`。新增 IPC `appearance:set-theme`，只接受 `light` 或 `dark`，保存后广播状态。preload 公开 `setTheme(theme)`。

渲染进程在第一份状态到达时设置 `document.documentElement.dataset.theme`，并在后续广播中保持同步。为降低初始闪烁，HTML 在脚本运行前声明 `data-theme="light"`。用户点击主题后立即调用 IPC 并应用返回状态。

## CSS 架构

使用语义 CSS 变量维护两套颜色。基础变量包括：

- `--page-bg`、`--sidebar-bg`、`--card-bg`、`--input-bg`
- `--text`、`--text-muted`、`--text-subtle`
- `--border`、`--border-strong`、`--shadow`
- `--accent`、`--accent-secondary`、`--success`、`--danger`

浅色主题使用米白灰页面、纯白卡片、深灰正文、柔和灰边框和低强度阴影；深色主题保持当前黑灰底色。品牌粉紫渐变在两种主题中保持一致。按钮、导航、账户卡片、连接状态、表单、二维码区、预览容器、Toast、更新卡片和设置选项全部改用语义变量。

预览画布自身的 checkerboard、dark、light 三种背景继续使用固定视觉颜色，以准确预览直播效果，不随应用主题变化。`overlay.html`、`overlay.js` 和 OBS 静态资源不读取 `appearance`。

## 可访问性与交互

主题选项可使用键盘聚焦和激活，具有 `aria-pressed` 状态。浅色模式正文、次级文字、边框和粉紫按钮保持可读对比。焦点环在两种背景上均清晰可见。保留 `prefers-reduced-motion` 行为。

## 模块

- 新增 `src/renderer/app/theme-controls.js`：主题规范化、应用和设置页控制器。
- 修改 `src/main.cjs`：默认 appearance、主题 IPC。
- 修改 `src/preload.cjs`：公开固定主题设置调用。
- 修改 `src/renderer/index.html`：设置页和导航。
- 修改 `src/renderer/styles.css`：语义变量和双主题规则。
- 修改 `src/renderer/app.js`：页面标题、状态应用和设置控制器初始化。

## 测试与发布

使用 Node test runner 按红—绿—重构覆盖主题规范化、默认浅色、只接受合法主题、状态同步和设置选项选中状态。运行完整测试、所有脚本语法检查、实际 Electron 主面板冒烟和安装版/便携版构建。

版本更新为 `1.0.4`。功能分支验证通过后快进合并到 `main` 并推送；创建正式 `v1.0.4` Release，包含 Setup EXE、Setup blockmap、`latest.yml` 和 Portable EXE。
