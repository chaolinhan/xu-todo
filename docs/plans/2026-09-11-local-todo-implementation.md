# Local Todo Web App Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a polished, responsive, offline-first local todo PWA that can later be wrapped by Tauri without rewriting its domain logic.

**Architecture:** A React and TypeScript application owns the domain model and UI. Storage and reminders sit behind small adapters, using IndexedDB and browser notifications in the web build and allowing future Tauri implementations.

**Tech Stack:** React 19, TypeScript, Vite, IndexedDB, Service Worker, Vitest, Testing Library

---

### Task 1: Project foundation and domain model

**Files:**
- Create: `package.json`
- Create: `src/types.ts`
- Create: `src/lib/task-utils.ts`
- Test: `src/lib/task-utils.test.ts`

**Steps:** Define the versioned domain model, implement deterministic view filtering and date grouping, write unit tests for each view, then run `npm test` and expect all tests to pass.

### Task 2: Local persistence and reminders

**Files:**
- Create: `src/lib/repository.ts`
- Create: `src/lib/reminders.ts`
- Create: `src/lib/backup.ts`

**Steps:** Implement an IndexedDB repository, browser reminder adapter and validated JSON backup import/export. Verify persistence after a page reload and verify malformed imports are rejected without replacing existing data.

### Task 3: Responsive application UI

**Files:**
- Create: `src/App.tsx`
- Create: `src/components/TaskEditor.tsx`
- Create: `src/components/Sidebar.tsx`
- Create: `src/components/TaskList.tsx`
- Create: `src/styles.css`

**Steps:** Build navigation, task list, task editor, collection creation, search, mobile navigation and accessible interaction states. Verify creation, editing, completion, undo and deletion in a browser.

### Task 4: Offline installation surface

**Files:**
- Create: `public/manifest.webmanifest`
- Create: `public/sw.js`
- Create: `public/icon.svg`
- Modify: `src/main.tsx`

**Steps:** Add the manifest, installable metadata and runtime-caching service worker. Build and serve production output, load once online, switch the browser offline and verify the app reloads with saved data.

### Task 5: Release verification and documentation

**Files:**
- Create: `README.md`

**Steps:** Run `npm test`, `npm run typecheck` and `npm run build`; visually inspect desktop and narrow layouts; document setup, local-data behavior, reminder limitations, backup behavior and the future Tauri boundary.
