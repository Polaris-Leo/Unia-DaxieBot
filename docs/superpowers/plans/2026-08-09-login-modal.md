# Login Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move QR authentication into an in-page modal opened from the signed-out sidebar account area.

**Architecture:** Add a small renderer controller that owns modal presentation and exposes explicit open, close, loading, QR, failure, and success states. Keep network calls and polling in `app.js`, but route every visual transition through the controller and stop polling whenever the modal closes.

**Tech Stack:** Electron renderer, DOM APIs, Node.js test runner, HTML/CSS

## Global Constraints

- Preserve existing authentication IPC APIs.
- Remove the QR card from the live page and leave room configuration full-width.
- Do not change overlay or OBS behavior.

---

### Task 1: Login modal controller

**Files:**
- Create: `src/renderer/app/login-modal.js`
- Create: `test/login-modal.test.cjs`

**Interfaces:**
- Produces: `createLoginModal(document, callbacks)` returning `open()`, `close()`, `showLoading()`, `showQr(image, text)`, `showFailure(message)`, and `showSuccess()`.

- [ ] Write tests for open/close accessibility state, QR rendering, failure retry state, and timer-cleanup callback.
- [ ] Run `node --test --test-isolation=none test/login-modal.test.cjs` and confirm failure because the module is missing.
- [ ] Implement the minimal UMD controller and rerun the focused test until green.

### Task 2: Migrate authentication UI

**Files:**
- Modify: `src/renderer/index.html`
- Modify: `src/renderer/styles.css`
- Modify: `src/renderer/app.js`

**Interfaces:**
- Consumes: `createLoginModal(document, { onOpen, onClose, onRetry })`.
- Produces: Sidebar login entry and QR modal behavior backed by existing `createQr()` and `pollQr()` preload APIs.

- [ ] Add modal markup and load `app/login-modal.js` before `app.js`.
- [ ] Remove the live-page login card and render a sidebar login button when unauthenticated.
- [ ] Refactor QR generation and polling to update the controller; stop polling on close, failure, expiry, logout, and success.
- [ ] Add modal styling for both light and dark themes, focus-visible controls, and reduced motion.
- [ ] Run the focused test, `npm test`, syntax checks, and `git diff --check`.
- [ ] Verify the real Electron page visually and confirm no QA process remains.
- [ ] Commit the implementation.
