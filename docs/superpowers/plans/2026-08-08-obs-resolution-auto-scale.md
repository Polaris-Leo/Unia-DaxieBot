# OBS Resolution Auto-Scale Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make OBS browser-source thank-you visuals scale proportionally from a 1280×720 baseline through 4K while preserving overflow protection and desktop-overlay behavior.

**Architecture:** Add a pure viewport-to-baseline scale helper to the existing layout utility module. In the overlay renderer, apply that multiplier only in browser-source mode and combine it with the existing fit-to-viewport calculation; Electron desktop mode continues using a multiplier of 1.

**Tech Stack:** Electron, browser JavaScript, CSS transforms, Node.js built-in test runner

## Global Constraints

- Use 1280×720 as the OBS design baseline.
- Standard OBS scales are 720P = 1, 1080P = 1.5, 2K = 2, and 4K = 3.
- Non-standard aspect ratios use the smaller width/height ratio.
- Preserve overflow protection and do not enlarge the desktop overlay.
- Add no new user setting or dependency.

---

### Task 1: Viewport scale utility

**Files:**
- Modify: `test/layout-utils.test.cjs`
- Modify: `src/renderer/layout-utils.js`

**Interfaces:**
- Consumes: numeric viewport width and height.
- Produces: `obsViewportScale(width, height): number` exported through `LayoutUtils`.

- [ ] **Step 1: Write the failing tests**

Add assertions that `obsViewportScale(1280,720)`, `(1920,1080)`, `(2560,1440)`, and `(3840,2160)` return `1`, `1.5`, `2`, and `3`; assert `(1920,720)` returns `1`; assert invalid measurements return `1`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --test-isolation=none test/layout-utils.test.cjs`

Expected: FAIL because `obsViewportScale` is not exported.

- [ ] **Step 3: Implement the minimal helper**

Compute `Math.min(width / 1280, height / 720)` for positive finite values and return `1` for invalid values. Export it with the existing utility API.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test --test-isolation=none test/layout-utils.test.cjs`

Expected: all layout utility tests pass.

### Task 2: OBS-only scaling integration

**Files:**
- Modify: `src/renderer/overlay.js`

**Interfaces:**
- Consumes: `LayoutUtils.obsViewportScale(root.clientWidth, root.clientHeight)` and the existing `fitScale`.
- Produces: `--fit-scale` containing the resolution-aware final transform scale.

- [ ] **Step 1: Integrate the scale without changing desktop behavior**

In `fitActiveContent`, select a baseline multiplier of `1` when `window.daxie` exists, otherwise use `obsViewportScale`. Measure overflow against content dimensions multiplied by that baseline, then set the final scale to `baseline × overflowScale`.

- [ ] **Step 2: Run full tests and syntax checks**

Run: `npm test`, `node --check src/renderer/layout-utils.js`, and `node --check src/renderer/overlay.js`.

Expected: all tests pass and both syntax checks exit 0.

### Task 3: Product verification and release

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `release/Unia答谢助手-1.0.13-便携版.exe`

**Interfaces:**
- Consumes: completed renderer implementation.
- Produces: verified 1.0.13 portable executable.

- [ ] **Step 1: Verify browser behavior**

Start the development app and inspect the OBS page at 1280×720 and 3840×2160. Confirm computed final scale changes from 1 to 3 for fitting sample content and remains bounded for oversized content.

- [ ] **Step 2: Bump version to 1.0.13 and build**

Update both package manifests, run `npm run build:portable`, validate the generated executable exceeds 50 MB, and move it into `release`.

- [ ] **Step 3: Smoke-test and clean up**

Start the portable executable, verify `/api/state` and `/overlay` respond successfully, stop all test processes, and confirm port 17321 has no listener.

- [ ] **Step 4: Run final verification**

Run the complete test suite and syntax checks again, then report the release artifact path, test count, HTTP results, and process/port cleanup state.
