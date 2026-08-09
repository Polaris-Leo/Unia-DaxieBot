# Panel Brand Icon Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the software panel sidebar's letter `U` badge with the existing `Unia-Icon.png` application icon while preserving layout and a text fallback.

**Architecture:** Keep the current 40×40 brand badge as a fallback container and place the application image over its `U` text. The image uses `object-fit: cover`, so successful loading shows the icon and failed loading naturally reveals the existing fallback.

**Tech Stack:** Electron, HTML, CSS, Node.js built-in test runner

## Global Constraints

- Keep the brand icon area at exactly `40×40`.
- Use the project-root `Unia-Icon.png` without adding an asset.
- Preserve the existing sidebar and brand-text layout.
- Change only the software panel brand area.

---

### Task 1: Panel brand icon

**Files:**
- Create: `test/panel-brand.test.cjs`
- Modify: `src/renderer/index.html`
- Modify: `src/renderer/styles.css`

**Interfaces:**
- Consumes: `../../Unia-Icon.png` relative to `src/renderer/index.html`.
- Produces: `.brand-icon` containing fallback text and `.brand-icon img` containing the application icon.

- [ ] **Step 1: Write the failing structural test**

Read `index.html` and `styles.css` as UTF-8. Assert that the brand element contains `class="brand-icon"`, an image whose source is `../../Unia-Icon.png`, a meaningful Chinese alt value, `width:40px`, `height:40px`, `object-fit:cover`, and rounded corners.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test --test-isolation=none test/panel-brand.test.cjs`

Expected: FAIL because the panel still contains only the letter `U` and has no image.

- [ ] **Step 3: Implement the minimum HTML and CSS change**

Change the badge to `<span class="brand-icon">U<img src="../../Unia-Icon.png" alt="Unia 应用图标"></span>`. Keep the current span dimensions and place the image over the fallback using full-size positioning, `object-fit: cover`, and the existing rounded shape.

- [ ] **Step 4: Run focused and full tests**

Run the focused test, then `npm test` and `node --check src/renderer/app.js`.

Expected: the new test and all existing tests pass; syntax check exits 0.

### Task 2: Rendered panel verification

**Files:**
- No persistent files.

**Interfaces:**
- Consumes: the updated panel page.
- Produces: evidence that the loaded image is visible at 40×40 without changing the adjacent brand layout.

- [ ] **Step 1: Launch the development application**

Open the panel in a hidden QA instance and inspect `.brand-icon img` after page load.

- [ ] **Step 2: Verify rendered measurements**

Confirm the image is loaded (`naturalWidth > 0`), its rendered box is `40×40`, `object-fit` is `cover`, and the brand text remains beside it without overlap.

- [ ] **Step 3: Stop the QA instance**

Close Electron and confirm no development process or listener on port 17321 remains.

### Task 3: Version and portable release

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `release/Unia答谢助手-1.0.14-便携版.exe`

**Interfaces:**
- Consumes: verified panel UI.
- Produces: verified 1.0.14 portable executable.

- [ ] **Step 1: Bump version to 1.0.14**

Update the root version fields in both package manifests.

- [ ] **Step 2: Build and validate the artifact**

Run `npm run build:portable`, require the executable to exceed 50 MB, place only the new version in `release`, and remove `.build-portable`.

- [ ] **Step 3: Smoke-test the portable build**

Start the executable, verify `/api/state` succeeds and `/overlay` returns HTTP 200, then stop the app and confirm port 17321 is free.

- [ ] **Step 4: Run final verification**

Run all tests and syntax checks again; verify the release file exists and no QA files, processes, listeners, or temporary build directory remain.
