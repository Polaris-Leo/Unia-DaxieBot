# Window Menu and Live Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove Electron's native application menu and stack the live-room configuration below QR login.

**Architecture:** Keep application behavior unchanged and make two narrow presentation changes: clear the application menu in the main process and change the live-page HTML container from the shared two-column grid to a dedicated single-column stack. Verify the framework and markup configuration through an actual Electron window check rather than brittle source-text assertions.

**Tech Stack:** Electron, HTML, CSS, Node.js test runner

## Global Constraints

- Preserve the internal page header, connection status, sidebar navigation, overlay, and OBS behavior.
- Do not add dependencies or change version numbers.

---

### Task 1: Remove native menu and stack live controls

**Files:**
- Modify: `src/main.cjs`
- Modify: `src/renderer/index.html`
- Modify: `src/renderer/styles.css`

**Interfaces:**
- Consumes: Electron `Menu.setApplicationMenu(null)` and existing `#live` markup.
- Produces: A menu-free main window and `.live-stack` single-column layout.

- [ ] **Step 1: Implement the minimal configuration changes**

Import `Menu` from Electron, call `Menu.setApplicationMenu(null)` before creating windows, replace `grid two live-grid` with `grid live-stack`, and define `.live-stack{grid-template-columns:minmax(0,1fr)}`.

- [ ] **Step 2: Verify through an Electron window check**

Launch the application with an isolated user-data directory. Confirm `BrowserWindow.isMenuBarVisible()` is false and use `webContents.executeJavaScript` to confirm the login card precedes the room card and both occupy a single column.

- [ ] **Step 3: Verify the full suite**

Run: `npm test`

Run: `node --check src/main.cjs && node --check src/renderer/app.js`

Expected: all commands exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/main.cjs src/renderer/index.html src/renderer/styles.css docs/superpowers/plans/2026-08-09-window-menu-live-layout.md
git commit -m "feat: simplify window and live control layout"
```
