# GitHub Release 手动更新设计

## 目标

为 Unia 答谢助手增加应用内“检查更新”功能，从公开仓库 `Polaris-Leo/Unia-DaxieBot` 的正式 GitHub Release 获取版本与程序附件。用户可在 GitHub 官方源和 `https://gh-proxy.com/` 加速源之间切换。便携版支持选择保存位置、完整下载并自动启动；安装版使用 NSIS 差分更新以减少后续版本的下载量。

## 版本和兼容边界

功能版本设为 `1.0.2`。已发布的 `1.0.1` 未集成 `electron-updater`，因此从 `1.0.1` 首次升级到 `1.0.2` 时只能完整下载安装包或便携版。从安装版 `1.0.2` 升级到后续版本时，才使用 blockmap 差分下载；便携版始终完整下载。

## 用户界面

在“使用说明”页面增加“检查更新”卡片，包含：

- 当前版本、最新正式版本和发布日期。
- `GitHub 官方源` 与 `gh-proxy.com 加速源` 单选线路。
- “检查更新”按钮和可切换线路重试的错误提示。
- Release 中允许下载的 Windows EXE 列表，显示名称、类型和大小。
- 安装版的“下载并安装”按钮。
- 便携版的“选择位置并下载”按钮。
- 下载百分比、速度、已下载量、总大小和当前阶段。

只有用户点击按钮后才检查或下载，不在后台自动下载。

## Release 查询和数据边界

主进程提供更新服务，渲染进程不直接访问网络或文件系统。官方列表地址为 `https://api.github.com/repos/Polaris-Leo/Unia-DaxieBot/releases/latest`；加速列表地址为 `https://gh-proxy.com/https://api.github.com/repos/Polaris-Leo/Unia-DaxieBot/releases/latest`。只接受满足以下条件的数据：

- Release 不是草稿或预发布。
- 标签能规范化为合法 SemVer。
- 附件 URL 使用 HTTPS，主机和路径属于目标 GitHub 仓库。
- 程序附件扩展名为 `.exe`，并按 `-Setup.exe` 和 `-Portable.exe` 区分类型。

更新服务返回经过规范化的数据，不向渲染端暴露任意下载能力。

## 便携版下载

用户选择便携版后，主进程打开保存对话框并建议 Release 中的原文件名。下载写入目标目录中的同名 `.part` 文件，持续通过 IPC 推送进度。完成后验证响应状态、实际字节数与 Release `size` 一致，再原子改名为正式 EXE。失败或取消时删除 `.part`，不覆盖已有完整文件。

官方线路直接请求 GitHub 附件 URL；加速线路请求 `https://gh-proxy.com/` 加原始 GitHub URL。下载完成后通过 Electron `shell.openPath()` 启动新 EXE；启动成功后退出当前应用。路径只来自保存对话框返回值，附件只来自已验证的 Release 列表。

## 安装版差分更新

新增运行时依赖 `electron-updater`，通过 `NsisUpdater` 实现手动检查、手动下载和 `quitAndInstall()`。设置 `autoDownload = false`、`disableDifferentialDownload = false`。下载进度和 updater 状态转换为统一 IPC 事件。

官方线路使用 GitHub provider。加速线路使用 Generic provider，更新元数据基址指向 gh-proxy 加速后的 GitHub Release 下载路径，使 `latest.yml`、安装包和 blockmap 保持同一线路。若加速源不支持 Range 请求、旧 blockmap 或差分请求失败，服务返回可识别错误，界面提示切换官方源；不静默下载完整安装包。

安装版下载完成后按钮变为“立即安装”，由用户再次确认后执行 `quitAndInstall()`。未安装版本不会改变本地程序。

## 发布产物

electron-builder 配置增加 GitHub publish 元数据和 NSIS 自动更新支持。每个从 `1.0.2` 起的正式 Release 必须上传：

- `Unia-DaxieBot-<version>-Setup.exe`
- `Unia-DaxieBot-<version>-Setup.exe.blockmap`
- `latest.yml`
- `Unia-DaxieBot-<version>-Portable.exe`

构建脚本保留上述元数据，发布验证必须检查四类文件都存在且非空。

## 模块与接口

- `src/main/update/release-client.cjs`：线路 URL、GitHub Release 查询和响应规范化。
- `src/main/update/version.cjs`：SemVer 解析与比较。
- `src/main/update/portable-downloader.cjs`：保存对话框、流式下载、校验、启动和清理。
- `src/main/update/installed-updater.cjs`：`NsisUpdater` 生命周期和差分更新。
- `src/main/update/ipc.cjs`：注册检查、下载、安装、取消及进度事件。
- `src/renderer/app/update-controls.js`：更新卡片状态、线路选择、附件展示和操作按钮。

preload 只公开固定操作：`checkUpdates(source)`、`downloadPortable(asset, source)`、`downloadInstalled(source)`、`installDownloadedUpdate()`、`cancelUpdate()` 和 `onUpdateProgress(callback)`。

## 错误处理和安全

- 网络错误、超时、GitHub 限流、无 Release、无匹配附件分别显示明确中文信息。
- 同一时刻只允许一个下载任务；重复点击返回“已有下载任务”。
- 所有重定向后的 URL 仍需满足 HTTPS，且最终文件只写到用户确认的位置或 electron-updater 管理目录。
- 应用退出时取消便携版请求并关闭文件句柄。
- 启动 EXE 失败时保留已下载文件并显示其路径，当前程序不退出。

## 测试与完成标准

使用 Node test runner 按红—绿—重构覆盖：版本比较、Release 规范化、双线路 URL、附件过滤、大小格式化、便携版临时文件清理、并发下载保护和 updater 状态映射。运行完整测试、语法检查、安装版与便携版构建。功能分支验证通过后合并到 `main` 并推送。创建 `v1.0.2` Release 时验证四类更新产物全部上传，安装版从 `1.0.2` 到下一测试版本的差分更新另作为后续发布验收项目。
