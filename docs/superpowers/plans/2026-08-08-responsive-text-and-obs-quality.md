# Responsive Text and OBS Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep main-panel text visually stable at supported window sizes, guarantee complete desktop/OBS thank-you content through proportional fitting, and add four OBS resolution presets with runtime viewport detection.

**Architecture:** Add a small browser/CommonJS-compatible layout utility that owns fit-scale and OBS-tier calculations. The overlay and in-app preview render an unscaled content layer inside a separately transformed fit layer, then use `ResizeObserver` to recalculate after content, font, or viewport changes. The main panel gains responsive CSS and an informational OBS quality selector; the OBS renderer still derives its effective tier from its real viewport.

**Tech Stack:** Electron 37, plain HTML/CSS/JavaScript, Node.js built-in test runner, `ResizeObserver`, localhost SSE overlay.

## Global Constraints

- The OBS URL remains exactly `http://127.0.0.1:17321/overlay`.
- Presets are 720P `1280 × 720`, 1080P `1920 × 1080`, 2K `2560 × 1440`, and 4K `3840 × 2160`.
- Quality affects rendering pixels and asset sizing only; animation, shadows, blur, and timing remain identical.
- User-configured image and text sizes are maxima: fitting may shrink content but never enlarge it.
- Full thank-you text must remain present; do not truncate or clamp lines.
- Desktop visual/audio switches and existing OBS output behavior must remain intact.
- Do not add runtime dependencies.

---

### Task 1: Pure responsive-layout calculations

**Files:**
- Create: `src/renderer/layout-utils.js`
- Create: `test/layout-utils.test.cjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `fitScale(contentWidth, contentHeight, viewportWidth, viewportHeight, padding = 24): number`
- Produces: `detectObsQuality(width, height): { key: string, label: string, width: number, height: number }`
- Produces: `OBS_QUALITY_PRESETS: readonly preset[]`
- Exposes the same API through `module.exports` in Node and `window.LayoutUtils` in the renderer.

- [ ] **Step 1: Add failing tests for proportional fitting**

Test literal outcomes for fully fitting content (`1`), width-limited content (`0.5`), height-limited content (`0.5`), combined limits, zero/invalid dimensions (`1`), padding, and the invariant `0 < scale <= 1`.

- [ ] **Step 2: Run the fit tests and verify RED**

Run: `node --test test/layout-utils.test.cjs`

Expected: FAIL because `src/renderer/layout-utils.js` does not exist.

- [ ] **Step 3: Implement the minimum fit calculation**

Normalize finite positive dimensions, subtract twice the non-negative padding from the viewport, and return `Math.min(1, availableWidth / contentWidth, availableHeight / contentHeight)` with a safe fallback of `1`.

- [ ] **Step 4: Run the fit tests and verify GREEN**

Run: `node --test test/layout-utils.test.cjs`

Expected: all fit tests PASS.

- [ ] **Step 5: Add failing table tests for OBS tier detection**

Use hand-derived expectations for `1280×720 → 720p`, `1920×1080 → 1080p`, `2560×1440 → 2k`, `3840×2160 → 4k`, below-720P fallback, between-tier selection, ultrawide/portrait conservative selection, and above-4K capping.

- [ ] **Step 6: Run the tier tests and verify RED**

Run: `node --test test/layout-utils.test.cjs`

Expected: FAIL because `detectObsQuality` and presets are absent.

- [ ] **Step 7: Implement preset detection and add the test script**

Choose the highest preset whose width and height both fit inside the actual viewport; fall back to 720P and cap at 4K. Add `"test": "node --test test/*.test.cjs"` to `package.json`.

- [ ] **Step 8: Run the complete utility suite**

Run: `npm test`

Expected: all tests PASS with zero failures.

### Task 2: Overlay content fitting shared by desktop and OBS

**Files:**
- Modify: `src/renderer/overlay.html`
- Modify: `src/renderer/overlay.js`
- Consume: `src/renderer/layout-utils.js`
- Test: `test/layout-utils.test.cjs`

**Interfaces:**
- Consumes: `LayoutUtils.fitScale(...)`
- Consumes: `LayoutUtils.detectObsQuality(...)`
- Produces: overlay DOM layers `.fit-layer > .animation-layer` and document attribute `data-obs-quality`.

- [ ] **Step 1: Add a failing regression test for padding-sensitive fitting**

Add a literal case proving `900×650` content in a `900×650` viewport with 24px padding scales below `1`, catching any implementation that ignores safe edges.

- [ ] **Step 2: Run the regression test and verify RED**

Temporarily exercise the currently unsupported padding expectation and confirm the exact mismatch.

- [ ] **Step 3: Load the utility and split transform responsibilities**

Load `layout-utils.js` before `overlay.js`. Render `.fit-layer` for centering/scaling and `.animation-layer` for enter/exit transforms so animation never overwrites fitting.

- [ ] **Step 4: Recalculate after render and resize**

Measure the unscaled layer with `getBoundingClientRect()`, apply the returned scale through a CSS custom property, use `ResizeObserver` on the root, and recalculate after `document.fonts.ready`. Keep the layer hidden until the first completed fit.

- [ ] **Step 5: Detect OBS quality without changing desktop behavior**

When `window.daxie` is absent, call `detectObsQuality(innerWidth, innerHeight)` on load/resize, set `document.documentElement.dataset.obsQuality`, and use the preset only as the renderer's pixel/asset baseline. Do not change effects or timing.

- [ ] **Step 6: Run unit and syntax tests**

Run: `npm test`

Run: `node --check src/renderer/overlay.js`

Expected: all commands exit `0`.

### Task 3: Make the in-app preview use the same fitting model

**Files:**
- Modify: `src/renderer/index.html`
- Modify: `src/renderer/app.js`
- Consume: `src/renderer/layout-utils.js`

**Interfaces:**
- Consumes: `LayoutUtils.fitScale(...)`
- Produces: preview layers `.preview-fit-layer > .preview-content` that recalculate on configuration and container changes.

- [ ] **Step 1: Add the shared script to the main page**

Load `layout-utils.js` before `app.js` so preview logic uses the tested implementation.

- [ ] **Step 2: Replace preview-only size clamping with real proportional fitting**

Render configured image size and font size without hard-coded `230px`/`72px` caps, measure the content, and scale the outer preview layer with the same safe-edge calculation used by the overlay.

- [ ] **Step 3: Observe preview size changes**

Attach one `ResizeObserver` to `#stylePreview`, recalculate after every preview render, and wait for available fonts before the final measurement.

- [ ] **Step 4: Run syntax and utility tests**

Run: `node --check src/renderer/app.js`

Run: `npm test`

Expected: both commands exit `0`.

### Task 4: Main-panel typography and OBS preset controls

**Files:**
- Modify: `src/renderer/index.html`
- Modify: `src/renderer/app.js`
- Modify: `src/renderer/styles.css`

**Interfaces:**
- Consumes: `LayoutUtils.OBS_QUALITY_PRESETS`
- Produces: `#obsQuality`, `#obsResolution`, and the existing `#copyObs` behavior.

- [ ] **Step 1: Add OBS controls and interaction behavior**

Add a quality selector defaulting to 1080P and a read-only resolution display. On selection, display exactly `1280 × 720`, `1920 × 1080`, `2560 × 1440`, or `3840 × 2160`. Keep `#copyObs` copying only the unchanged URL.

- [ ] **Step 2: Add content-aware responsive CSS**

Use `minmax(0, 1fr)` for card grids, prevent button/title/nav/status short text from breaking with `white-space: nowrap`, allow `.row` and OBS controls to wrap by whole controls, give flex/grid children `min-width: 0`, and switch two-column cards to one column before text becomes cramped.

- [ ] **Step 3: Make narrow layouts intentional**

Stack overlay option help text on its own row, preserve readable button widths, and ensure long hints/paths use safe wrapping without horizontal page overflow.

- [ ] **Step 4: Update the in-app usage instructions**

Document: choose a preset, copy the one OBS URL, create a browser source, and manually enter the displayed width and height. State that the page detects actual source dimensions automatically.

- [ ] **Step 5: Run syntax and unit checks**

Run: `node --check src/renderer/app.js`

Run: `npm test`

Expected: all commands exit `0`.

### Task 5: Rendered QA, regression verification, and portable build

**Files:**
- Modify: `package.json` (version `1.0.9` → `1.0.10`)
- Verify: `src/renderer/index.html`
- Verify: `src/renderer/overlay.html`
- Output: `release/Unia答谢助手-1.0.10-便携版.exe`

**Interfaces:**
- Consumes all prior tasks.
- Produces the verified portable release artifact.

- [ ] **Step 1: Start the Electron app and identify the target flows**

Main flow: app loads → resize through minimum/default/wide sizes → controls remain readable and usable.

Overlay flow: `/overlay` loads → inject test gift/SC → resize across target dimensions → complete content remains inside all four edges.

- [ ] **Step 2: Validate with the in-app Browser**

Check `http://127.0.0.1:17321/overlay` at `320×240`, `1280×720`, `1920×1080`, `2560×1440`, and `3840×2160`, plus one wide-short and one narrow-tall viewport. Verify page identity, meaningful DOM, no error overlay, console health, screenshots, and content bounds after a test event.

- [ ] **Step 3: Exercise panel interactions**

Verify all four selector values update the displayed resolution and that “复制” leaves the URL unchanged. Inspect the main Electron window at minimum/default/wide widths for broken words, overlaps, clipping, and horizontal scroll.

- [ ] **Step 4: Run full verification**

Run: `npm test`

Run: `node --check src/main.cjs`

Run: `node --check src/preload.cjs`

Run: `node --check src/renderer/app.js`

Run: `node --check src/renderer/overlay.js`

Expected: every command exits `0` and tests report zero failures.

- [ ] **Step 5: Build and smoke-test the portable release**

Run: `npm run build:portable`

Confirm the signed artifact exists and is larger than 50 MB, place only version `1.0.10` in `release`, launch it, verify `/api/state` and `/overlay`, then terminate all temporary `Unia答谢助手` processes and confirm port `17321` has no listener.

