# Font and Bubble Style Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add selectable system/imported fonts, persistent font-file import, a stroke toggle, and four configurable single/gradient bubble styles shared by preview, desktop overlay, and OBS.

**Architecture:** Keep pure migration, color, bubble-style, and font-record logic in a renderer/CommonJS-compatible utility with Node tests. The Electron main process owns Windows font discovery, font parsing/copying, persistence, and restricted localhost font delivery. Renderers consume public font records and one shared style builder so all three output surfaces remain consistent.

**Tech Stack:** Electron 37, Node.js built-in test runner, plain HTML/CSS/JavaScript, `fontkit` (pure JavaScript font metadata parsing).

## Global Constraints

- Support `.ttf`, `.otf`, `.woff`, and `.woff2`.
- Imported files are copied to Electron user data under `fonts/` and keyed by SHA-256.
- OBS must never receive an arbitrary local filesystem path for a font.
- Bubble presets are `rounded`, `pill`, `card`, and `glass`.
- `bubbleOpacity` is `0–100`; it affects only the background.
- Disabling stroke must render `0 transparent` without discarding saved width/color.
- Existing font, stroke, and bubble configuration must migrate without silently changing appearance.
- No native module that requires local compilation may be added.

---

### Task 1: Tested style and migration utilities

**Files:**
- Create: `src/renderer/style-utils.js`
- Create: `test/style-utils.test.cjs`
- Modify: `package.json`

**Interfaces:**
- `normalizeStyleConfig(config): config`
- `hexToRgba(hex, opacity): string`
- `bubblePresentation(config): { background, borderRadius, padding, border, boxShadow, backdropFilter }`
- `fontCssFamily(config, importedFonts): string`
- `isSupportedFontExtension(path): boolean`

- [ ] Write failing tests for old stroke/bubble migration, color conversion, four presets, single/gradient backgrounds, font-family mapping, and four extensions.
- [ ] Run `npm test` and verify failures are caused by the missing utility.
- [ ] Implement the minimum pure functions with literal preset values.
- [ ] Run `npm test` and verify all old and new tests pass.

### Task 2: Font discovery, import, persistence, and secure delivery

**Files:**
- Modify: `src/main.cjs`
- Modify: `src/preload.cjs`
- Modify: `package.json`, `package-lock.json`

**Interfaces:**
- IPC `fonts:list` returns `{ systemFonts: string[], importedFonts: FontRecord[] }`.
- IPC `fonts:import` returns the selected/imported `FontRecord` or `null`.
- `FontRecord` contains `{ id, family, displayName, format, assetUrl, obsUrl }` and no arbitrary source path.

- [ ] Install `fontkit` and confirm it does not introduce a native rebuild dependency.
- [ ] Enumerate Windows font display names from installed-font registry keys, remove suffix annotations, sort and deduplicate.
- [ ] Import through a restricted file dialog; validate extension and non-empty file; hash content; parse internal family name; copy once to `userData/fonts/<hash>.<ext>`.
- [ ] Persist private font paths separately from public renderer records and migrate missing `importedFonts` to an empty list.
- [ ] Add an `asset://font/<id>` handler and `/font/<id>` localhost handler that resolve IDs only within the managed fonts directory.
- [ ] Expose list/import calls in preload and run syntax/unit tests.

### Task 3: Shared font and bubble rendering

**Files:**
- Modify: `src/renderer/index.html`
- Modify: `src/renderer/overlay.html`
- Modify: `src/renderer/app.js`
- Modify: `src/renderer/overlay.js`
- Modify: `src/renderer/styles.css`

**Interfaces:**
- Both pages load `style-utils.js` before their renderer script.
- Both surfaces create `@font-face` rules from public imported-font records.
- Both surfaces consume `bubblePresentation` and `fontCssFamily`.

- [ ] Load the tested style utility on main and overlay pages.
- [ ] Register imported fonts dynamically and refit content after `FontFace.load()`/`document.fonts.ready`.
- [ ] Replace hard-coded bubble gradients and stroke application in preview and overlay with shared computed presentation.
- [ ] Preserve overall content fitting and animations while applying preset radius, padding, border, shadow, and blur.
- [ ] Run all tests and renderer syntax checks.

### Task 4: Main-panel controls and interaction states

**Files:**
- Modify: `src/renderer/index.html`
- Modify: `src/renderer/app.js`
- Modify: `src/renderer/styles.css`

**Interfaces:**
- Controls: `fontFamily`, `fontSourceId`, `importFont`, `strokeEnabled`, `bubbleStyle`, `bubbleOpacity`, `bubbleGradientEnabled`, `bubbleColor`, `bubbleColorSecondary`.

- [ ] Replace free-text font input with grouped select and import button; refresh and select the imported font after success.
- [ ] Add stroke toggle and disable width/color controls when off.
- [ ] Add bubble preset selector, opacity slider/output, gradient toggle, primary color, and conditionally visible secondary color.
- [ ] Disable all bubble detail controls when the bubble master switch is off.
- [ ] Keep every new control in real-time preview and persisted config collection.
- [ ] Verify responsive wrapping at the minimum main-window width.

### Task 5: QA, migration smoke test, and portable release

**Files:**
- Modify: `package.json` version `1.0.10` → `1.0.11`
- Output: `release/Unia答谢助手-1.0.11-便携版.exe`

- [ ] Run `npm test` and all `node --check` commands.
- [ ] Start the development app and verify old settings migrate to equivalent stroke/bubble appearance.
- [ ] Exercise system-font selection, a real valid imported font, duplicate import, and persistence after restart.
- [ ] Verify four presets, opacity 0/100, single/gradient, and stroke on/off in main preview and localhost overlay.
- [ ] Check long SC fitting at 720P, 1080P, 2K, 4K, and `320×240`.
- [ ] Build 1.0.11, keep only the latest portable EXE in `release`, smoke-test `/api/state`, `/overlay`, and managed font delivery, then stop all processes and confirm port `17321` is free.

