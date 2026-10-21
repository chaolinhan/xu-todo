# Recurring Tasks Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add calendar-based recurring tasks and make a task's reminder default to its due time.

**Architecture:** Store a normalized recurrence rule on each task and calculate the next occurrence with pure calendar functions. Completing a recurring task preserves the completed instance and creates one future instance, while UI and persistence continue using the existing application adapters.

**Tech Stack:** React 19, TypeScript, IndexedDB, Vitest

---

### Task 1: Recurrence domain model

**Files:**
- Modify: `src/types.ts`
- Create: `src/lib/recurrence.ts`
- Test: `src/lib/recurrence.test.ts`

**Steps:** Add normalized recurrence types; write failing tests for daily, weekdays, weekly, monthly, yearly and custom intervals; implement calendar advancement and missed-period skipping; run `npm test` and expect all recurrence tests to pass.

### Task 2: Completion lifecycle

**Files:**
- Modify: `src/App.tsx`
- Test: `src/lib/recurrence.test.ts`

**Steps:** Write tests for cloning the next task and preserving reminder offset; implement instance generation and series linkage; integrate completion and undo; run all unit tests and expect them to pass.

### Task 3: Task editor controls

**Files:**
- Modify: `src/components/TaskEditor.tsx`
- Modify: `src/components/TaskList.tsx`
- Modify: `src/styles.css`

**Steps:** Add recurrence presets and custom intervals, automatically link a new reminder to due time, display recurrence metadata in task rows, and visually verify the desktop and mobile editors.

### Task 4: Compatibility and documentation

**Files:**
- Modify: `src/lib/backup.ts`
- Modify: `README.md`
- Modify: `docs/plans/2026-09-11-local-todo-design.md`

**Steps:** Validate optional recurrence fields during backup import, document behavior and limitations, run `npm test`, `npm run typecheck`, `npm run build`, inspect the production UI, and commit the complete feature.
