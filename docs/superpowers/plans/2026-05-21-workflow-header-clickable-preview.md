# Workflow header + clickable mini preview — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the workflow header across edit/read-only modes via a single `CanvasHeader` component, drop the standalone «Открыть workflow» button, and turn the campaign-screen mini preview into a clickable element that navigates to the workflow.

**Architecture:** Bottom-up, in three thin slices. (1) Extend `CanvasHeader` with a `mode` prop (`"edit" | "read-only"`) plus an optional `onBack` — the only structural addition is an `ArrowLeft` ghost button to the left of the title and a fixed «Просмотр workflow» subtitle when in read-only. (2) Make `WorkflowMiniPreview` optionally clickable by wrapping its inner `<div>` (which keeps `pointer-events-none` so xyflow doesn't swallow the click) in a `<button>` when an `onClick` prop is supplied. (3) Re-wire `workflow-section.tsx` and `campaign-screen.tsx` to use the new shapes and delete the now-redundant `ReadOnlyWorkflowHeader` component plus the «Открыть workflow» button.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4, motion v12 (`motion/react`), lucide-react icons, vitest for pure-function tests.

**Spec:** `docs/superpowers/specs/2026-05-21-workflow-header-clickable-preview-design.md`
**Worktree / branch:** `.worktrees/workflow-header-clickable-preview` / `feature/workflow-header-clickable-preview`

---

## File Structure

**Modify:**
- `src/sections/campaigns/canvas-header.tsx` — add `mode` and `onBack` props; render `ArrowLeft` ghost button to the left of the title when `mode === "read-only"`; swap `signalLine` subtitle for a static «Просмотр workflow» label in read-only.
- `src/sections/campaigns/workflow-mini-preview.tsx` — add optional `onClick` prop; when supplied, render the existing graph inside a `<button>` so the preview becomes interactive while clicks on graph nodes are still suppressed.
- `src/sections/campaigns/workflow-section.tsx` — delete the local `ReadOnlyWorkflowHeader` component; always render `CanvasHeader` and pass `mode`/`onBack` derived from `view.launched`; remove the now-unused `ArrowLeft` import.
- `src/sections/campaigns/campaign-screen.tsx` — remove the «Открыть workflow →» button and the surrounding flex wrapper; pass `onClick={openWorkflow}` straight into `WorkflowMiniPreview`; drop the now-unused `ArrowRight`/`Button` imports if nothing else uses them in this file (keep `Button` because Block 4 «Перейти в статистику» still uses it; drop only the icons that are no longer referenced).

**No new files.** No pure-function modules are introduced — this block is composed entirely of visual-only changes to existing React components, so verification relies on manual smoke testing against the spec's acceptance criteria.

---

## Task 0: Create worktree and verify baseline

**Files:** none (setup)

- [ ] **Step 1: Create the worktree and feature branch off `main`**

Run from the repository root (`/home/user/afina-ai-first`):

```bash
git worktree add .worktrees/workflow-header-clickable-preview -b feature/workflow-header-clickable-preview main
cd .worktrees/workflow-header-clickable-preview
npm install
```

- [ ] **Step 2: Confirm baseline is green before touching anything**

```bash
npm test
npm run lint
```

Expected: both commands exit 0. If either fails on `main`, stop and surface the failure to the user — do not start the feature work on a red baseline.

**All subsequent steps execute inside `.worktrees/workflow-header-clickable-preview/`.** Never `cd` back to the main checkout for edits; concurrent agents may be working there.

---

## Task 1: Extend `CanvasHeader` with `mode` and `onBack` props

**Files:**
- Modify: `src/sections/campaigns/canvas-header.tsx`

This task changes the component API without changing any caller yet — all existing call sites omit the new props, so `mode` defaults to `"edit"` and the visible behavior is unchanged. We verify by running the full test+lint suite (the file has no dedicated unit tests; behavior is verified visually in Task 3).

- [ ] **Step 1: Add `ArrowLeft` to the lucide-react import**

In `src/sections/campaigns/canvas-header.tsx`, replace the existing icon import line:

```tsx
import { ChevronDown, Pencil } from "lucide-react";
```

with:

```tsx
import { ArrowLeft, ChevronDown, Pencil } from "lucide-react";
```

- [ ] **Step 2: Extend `CanvasHeaderProps` with `mode` and `onBack`**

Find the `interface CanvasHeaderProps { ... }` block (currently lines 33-47). Replace it in full with:

```tsx
interface CanvasHeaderProps {
  campaign: Campaign;
  signal: Signal | null;
  onRename: (name: string) => void;
  onSaveDraft: () => void;
  onLaunch: () => void;
  onSchedule: (iso: string) => void;
  onPause: () => void;
  onResume: () => void;
  onDuplicate: () => void;
  onGoToStats: () => void;
  onCancelSchedule: () => void;
  toast?: CanvasHeaderToast | null;
  onDismissToast?: () => void;
  /**
   * Visual mode of the header.
   * - "edit" (default) — full editable canvas header used while a campaign
   *   is a draft; no back arrow, signal line as subtitle.
   * - "read-only" — used when the workflow is opened in launched/preview
   *   mode. Adds a large «Back» arrow to the left of the title and replaces
   *   the signal-line subtitle with a static «Просмотр workflow» label.
   *   Pencil-edit of the campaign name and the right-side action buttons
   *   are preserved — renaming a launched campaign is allowed.
   */
  mode?: "edit" | "read-only";
  /**
   * Required when `mode === "read-only"`. Invoked when the user clicks the
   * back arrow. Ignored in edit mode.
   */
  onBack?: () => void;
}
```

- [ ] **Step 3: Destructure the new props and derive the read-only flag**

Find the function signature (currently lines 94-108):

```tsx
export function CanvasHeader({
  campaign,
  signal,
  onRename,
  onSaveDraft,
  onLaunch,
  onSchedule,
  onPause,
  onResume,
  onDuplicate,
  onGoToStats,
  onCancelSchedule,
  toast,
  onDismissToast,
}: CanvasHeaderProps) {
```

Replace with:

```tsx
export function CanvasHeader({
  campaign,
  signal,
  onRename,
  onSaveDraft,
  onLaunch,
  onSchedule,
  onPause,
  onResume,
  onDuplicate,
  onGoToStats,
  onCancelSchedule,
  toast,
  onDismissToast,
  mode = "edit",
  onBack,
}: CanvasHeaderProps) {
  const isReadOnly = mode === "read-only";
```

(Only the closing `) {` line gains the `const isReadOnly = ...;` line directly underneath. Keep every existing line below it intact for now.)

- [ ] **Step 4: Wrap the title column in a row that hosts the back arrow**

Find the outer flex container (currently line 155):

```tsx
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
```

Replace **only those two lines** with:

```tsx
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {isReadOnly && onBack && (
            <Button
              variant="ghost"
              size="icon-lg"
              onClick={onBack}
              aria-label="Назад"
              className="shrink-0"
            >
              <ArrowLeft className="size-5" />
            </Button>
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
```

This introduces a new wrapper `<div>` with `items-start gap-3` that holds the back arrow plus the existing title column. The arrow is rendered only when both `isReadOnly` is true and a non-undefined `onBack` was supplied. `size="icon-lg"` resolves to `size-9` (36×36) per the existing button-variant catalogue, and `size-5` (20px) on the icon matches the spec's «крупная стрелка».

- [ ] **Step 5: Close the new wrapper `<div>` after the title block**

Locate the closing tag of the title column (currently around line 196):

```tsx
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={campaign.status} />
            <span className="text-xs text-muted-foreground">
              {statusDescription(campaign)}
            </span>
          </div>
        </div>
```

Replace it with:

```tsx
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <StatusBadge status={campaign.status} />
            <span className="text-xs text-muted-foreground">
              {statusDescription(campaign)}
            </span>
          </div>
          </div>
        </div>
```

(One extra `</div>` immediately after the existing `</div>` closes the wrapper added in Step 4. Indentation matches the spec's two-space ambient style.)

- [ ] **Step 6: Replace the subtitle line with mode-aware rendering**

Find the subtitle `<p>` block (currently lines 181-189):

```tsx
          <p
            className={
              signal
                ? "text-xs text-muted-foreground"
                : "text-xs font-medium text-destructive"
            }
          >
            {signalLine}
          </p>
```

Replace with:

```tsx
          {isReadOnly ? (
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Просмотр workflow
            </p>
          ) : (
            <p
              className={
                signal
                  ? "text-xs text-muted-foreground"
                  : "text-xs font-medium text-destructive"
              }
            >
              {signalLine}
            </p>
          )}
```

The «Просмотр workflow» label keeps the same `text-xs` baseline as the signal line so the header height stays constant between modes; `uppercase tracking-widest` echoes the visual rhythm of the old `· workflow · просмотр` strip without bringing the old layout back.

- [ ] **Step 7: Run tests and lint to confirm no regressions**

```bash
npm test
npm run lint
```

Expected: both pass. There are no dedicated tests for `CanvasHeader`; vitest passes because no existing test imports the file. ESLint will flag unused imports — make sure `ArrowLeft` is referenced (it is, in the new arrow button) and that there are no stray prop names.

- [ ] **Step 8: Commit**

```bash
git add src/sections/campaigns/canvas-header.tsx
git commit -m "feat(canvas-header): add read-only mode with back arrow and «Просмотр workflow» subtitle"
```

---

## Task 2: Make `WorkflowMiniPreview` clickable when `onClick` is supplied

**Files:**
- Modify: `src/sections/campaigns/workflow-mini-preview.tsx`

The internal `pointer-events-none` `<div>` is preserved as-is so xyflow's pane/node handlers never receive the click. When `onClick` is omitted, the component renders exactly as today (defensive: any future caller that wants a non-interactive preview still works).

- [ ] **Step 1: Replace `src/sections/campaigns/workflow-mini-preview.tsx` in full**

Overwrite the file with:

```tsx
"use client";

import { useMemo } from "react";
import { WorkflowGraph } from "@/sections/campaigns/workflow-graph";
import { createTemplate } from "@/state/workflow-templates";
import { createBaseNodes, createBaseEdges } from "@/types/workflow";
import type { SignalType } from "@/state/app-state";

interface WorkflowMiniPreviewProps {
  signalType?: SignalType;
  /**
   * When supplied, the mini preview is rendered as a real `<button>` and
   * invokes this handler on click / Enter / Space. When omitted the preview
   * stays non-interactive (used in places where the surrounding card already
   * provides navigation).
   */
  onClick?: () => void;
}

/**
 * Mini-rendering of a campaign's workflow graph. Reuses the full
 * WorkflowGraph component but wraps it in a small container with
 * pointer-events disabled on the graph itself so xyflow pan/zoom/node-select
 * never fires from clicks on the preview. When an `onClick` is supplied the
 * outer container becomes a real button — the click is captured before it
 * reaches the (still pointer-events-none) graph.
 */
export function WorkflowMiniPreview({
  signalType,
  onClick,
}: WorkflowMiniPreviewProps) {
  const graph = useMemo(() => {
    if (signalType) {
      const t = createTemplate(signalType);
      return { nodes: t.nodes, edges: t.edges };
    }
    return { nodes: createBaseNodes(), edges: createBaseEdges() };
  }, [signalType]);

  const innerGraph = (
    <div
      className="pointer-events-none relative h-32 w-full overflow-hidden rounded-lg border border-border bg-card"
      aria-hidden
    >
      <WorkflowGraph nodes={graph.nodes} edges={graph.edges} compact />
    </div>
  );

  if (!onClick) {
    return innerGraph;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Открыть workflow"
      className="group block w-full rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 [&>div]:transition-colors [&:hover>div]:border-foreground/30"
    >
      {innerGraph}
    </button>
  );
}
```

Notes on the Tailwind classes used in the `<button>`:

- `block w-full` — the button fills the parent column so the graph rendering area is unchanged from today.
- `rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50` — keyboard focus surfaces a ring matching the project's existing `focus-visible:ring-ring/50` pattern (see `src/sections/campaigns/schedule-campaign-dialog.tsx:113`).
- `[&>div]:transition-colors [&:hover>div]:border-foreground/30` — on hover the inner graph's border (`border-border` baseline) brightens to `foreground/30`, matching the «hover на mini preview → бордер подсвечивается» spec line. We target the inner div via a Tailwind arbitrary descendant selector instead of moving the border onto the button itself, because the rounded-lg overflow-hidden box is what crops the xyflow render.

- [ ] **Step 2: Run tests and lint**

```bash
npm test
npm run lint
```

Expected: both pass. No callers have been updated yet — the existing call from `campaign-screen.tsx` omits `onClick`, so it falls through the early-return branch and behaviour is byte-for-byte identical to before.

- [ ] **Step 3: Commit**

```bash
git add src/sections/campaigns/workflow-mini-preview.tsx
git commit -m "feat(workflow-mini-preview): accept optional onClick to render as a button"
```

---

## Task 3: Wire `WorkflowSection` to use `CanvasHeader` for both modes

**Files:**
- Modify: `src/sections/campaigns/workflow-section.tsx`

This task deletes the local `ReadOnlyWorkflowHeader` component (lines 352-371 in the current file) and reroutes the launched branch through `CanvasHeader` with `mode="read-only"`.

- [ ] **Step 1: Drop the `ArrowLeft` icon import — it's no longer used in this file**

Find the lucide import line (currently line 5):

```tsx
import { ArrowLeft, X } from "lucide-react";
```

Replace with:

```tsx
import { X } from "lucide-react";
```

- [ ] **Step 2: Replace the conditional header render with a single `CanvasHeader` call**

Find the conditional block (currently lines 256-279):

```tsx
      {view.launched ? (
        <ReadOnlyWorkflowHeader
          campaignName={currentCampaign.name}
          onBack={() =>
            dispatch({ type: "campaign_opened", id: currentCampaign.id })
          }
        />
      ) : (
        <CanvasHeader
          campaign={currentCampaign}
          signal={currentSignal}
          onRename={handleRename}
          onSaveDraft={handleSaveDraft}
          onLaunch={handleLaunch}
          onSchedule={handleSchedule}
          onPause={handlePause}
          onResume={handleResume}
          onDuplicate={handleDuplicate}
          onGoToStats={handleGoToStats}
          onCancelSchedule={handleCancelSchedule}
          toast={toast}
          onDismissToast={dismissToast}
        />
      )}
```

Replace with:

```tsx
      <CanvasHeader
        campaign={currentCampaign}
        signal={currentSignal}
        onRename={handleRename}
        onSaveDraft={handleSaveDraft}
        onLaunch={handleLaunch}
        onSchedule={handleSchedule}
        onPause={handlePause}
        onResume={handleResume}
        onDuplicate={handleDuplicate}
        onGoToStats={handleGoToStats}
        onCancelSchedule={handleCancelSchedule}
        toast={toast}
        onDismissToast={dismissToast}
        mode={view.launched ? "read-only" : "edit"}
        onBack={
          view.launched
            ? () =>
                dispatch({ type: "campaign_opened", id: currentCampaign.id })
            : undefined
        }
      />
```

`campaign_opened` is the existing action that returns to the campaign screen (`src/state/app-state.ts:183` and the reducer case around `src/state/app-state.ts:357`) — no state changes are needed.

- [ ] **Step 3: Delete the local `ReadOnlyWorkflowHeader` component definition**

Find the component at the bottom of the file (currently lines 352-371):

```tsx
function ReadOnlyWorkflowHeader({
  campaignName,
  onBack,
}: {
  campaignName: string;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-8 py-4">
      <Button variant="ghost" size="sm" onClick={onBack} aria-label="Назад">
        <ArrowLeft className="h-4 w-4" />
        Назад
      </Button>
      <span className="text-sm font-medium text-foreground">{campaignName}</span>
      <span className="text-xs uppercase tracking-widest text-muted-foreground">
        · workflow · просмотр
      </span>
    </div>
  );
}
```

Delete this entire block (the function and the preceding blank line). The file should now end with the closing `}` of `WorkflowSection`'s return statement.

- [ ] **Step 4: Verify `Button` import is still warranted**

`Button` is no longer referenced inside `WorkflowSection` itself (the toast UI uses an inline `<button>`). Check:

```bash
grep -n "Button" src/sections/campaigns/workflow-section.tsx
```

Expected: only the import line shows up. If that's the case, remove the now-unused import. Find line 7:

```tsx
import { Button } from "@/components/ui/button";
```

Delete this line.

- [ ] **Step 5: Run tests and lint**

```bash
npm test
npm run lint
```

Expected: both pass. ESLint catches unused imports — if `Button` or `ArrowLeft` is still referenced anywhere you missed, lint will surface it; fix and retry.

- [ ] **Step 6: Commit**

```bash
git add src/sections/campaigns/workflow-section.tsx
git commit -m "refactor(workflow-section): render CanvasHeader for both edit and read-only modes"
```

---

## Task 4: Replace «Открыть workflow» button with clickable mini preview

**Files:**
- Modify: `src/sections/campaigns/campaign-screen.tsx`

- [ ] **Step 1: Replace the workflow block markup**

Find the workflow section block (currently lines 46-59):

```tsx
        {/* Block 2 — workflow mini preview */}
        <section className="rounded-xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Workflow
          </p>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <WorkflowMiniPreview signalType={signalType} />
            </div>
            <Button variant="outline" onClick={openWorkflow}>
              Открыть workflow →
            </Button>
          </div>
        </section>
```

Replace with:

```tsx
        {/* Block 2 — workflow mini preview (clickable, opens workflow view) */}
        <section className="rounded-xl border border-border bg-card p-5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Workflow
          </p>
          <WorkflowMiniPreview signalType={signalType} onClick={openWorkflow} />
        </section>
```

`openWorkflow` already exists in this component (currently lines 24-31) and dispatches `open_workflow` with `launched: true`, so the navigation behaviour matches the deleted button exactly.

- [ ] **Step 2: Verify the `ArrowRight` and `Button` imports are still needed**

Run:

```bash
grep -n "ArrowRight\|Button" src/sections/campaigns/campaign-screen.tsx
```

Expected: both symbols remain referenced by Block 4 (the «Перейти в статистику» Button with the trailing `ArrowRight` icon). **Leave both imports in place.** Only delete an import if grep shows no usage outside the import line itself.

- [ ] **Step 3: Run tests and lint**

```bash
npm test
npm run lint
```

Expected: both pass. If lint flags `Button` or `ArrowRight` as unused, double-check Block 4 is still present and using them.

- [ ] **Step 4: Commit**

```bash
git add src/sections/campaigns/campaign-screen.tsx
git commit -m "feat(campaign-screen): replace «Открыть workflow» button with clickable mini preview"
```

---

## Task 5: Manual verification of the full Block-C surface

**Files:** none — visual/UX verification.

Run the dev server on a non-default port so the main checkout can keep `next dev` on 3000 (per AGENTS.md):

```bash
npm run dev -- -p 3001
```

Wait for the «ready» log line, then open `http://localhost:3001` in a browser. Use the dev preset toggle (top-left dev panel) to load a state with at least one **launched** campaign and one **draft** campaign.

- [ ] **Step 1: Launched campaign — mini preview is clickable and navigates to read-only workflow**

  1. From the «Кампании» list, click a launched campaign card → land on `CampaignScreen` (Block 1 header, Block 2 workflow card, Block 3 providers).
  2. Confirm the «Открыть workflow →» Button is **gone** — only the Workflow card with its mini graph is visible.
  3. Hover the mini preview → cursor turns to a pointer, the inner card border brightens (border colour shifts from `border` to `foreground/30`).
  4. Click the mini preview → the workflow opens in read-only mode.

  Expected: workflow loads with the new `CanvasHeader` shape — large `ArrowLeft` ghost button on the very left, campaign name with hover-pencil to its right, «Просмотр workflow» subtitle directly under the name, `StatusBadge` + status description on the row below, and the right-hand action cluster («Посмотреть статистику», «Приостановить» / «Возобновить» / «Дублировать» depending on `campaign.status`).

- [ ] **Step 2: Back arrow returns to the campaign screen**

  Still in read-only workflow view, click the large `ArrowLeft` button → state returns to `CampaignScreen`. Verify the URL/section stays «Кампании» and the workflow is no longer shown.

- [ ] **Step 3: Pencil-edit works in read-only**

  Re-enter the launched workflow via the mini preview. Hover the campaign name → the small `Pencil` icon fades in. Click the title → input appears prefilled with the current name. Edit to a new value, press Enter. Expected: header updates immediately, back-navigate to the campaign screen, and the new name shows in Block 1 of `CampaignScreen` too (driven by the `campaign_renamed` reducer).

- [ ] **Step 4: Edit (draft) mode is unchanged**

  Open a **draft** campaign → click any element that opens its workflow in edit mode (e.g. the existing entry point from the campaigns list, not the launched preview).

  Expected:
  - **No** back arrow on the left.
  - Subtitle is the live `signalLine` (`<signal type> · <count> · от <date>`), not «Просмотр workflow».
  - Right-hand actions remain «Сохранить черновик» / «Запустить» (with the `ButtonGroup` chevron) — i.e. the previous edit-mode header is byte-for-byte the same as before this change.

- [ ] **Step 5: Keyboard accessibility**

  On the campaign screen, press Tab repeatedly. The mini preview should receive focus (visible focus-visible ring around the rounded outer container). Press Enter → workflow opens in read-only mode. Press Tab again on the workflow header — focus reaches the `ArrowLeft` button first (it's the new leftmost interactive element) before the title button. Press Enter on the focused arrow → returns to campaign screen.

- [ ] **Step 6: Edge case — paused/scheduled launched campaign**

  Switch to a preset that has a `paused` or `scheduled` campaign and open its workflow. Expected: read-only header still shows «Просмотр workflow» and the back arrow, and the right-hand button cluster matches the status branch in `CanvasHeader` (e.g. paused → «Посмотреть статистику» + «Дублировать» + «Возобновить»). The new behaviour is uniform regardless of status — only the action cluster on the right varies, as it already does in edit mode.

- [ ] **Step 7: If any of Steps 1-6 misbehave**

  Fix the issue first, then commit the fix as a new commit (do **not** amend prior commits — per AGENTS.md, hook failures or behavioural regressions warrant a NEW commit). After fixing, re-run:

  ```bash
  npm test
  npm run lint
  ```

  Then re-do the affected manual step.

- [ ] **Step 8: Stop the dev server**

  Foreground the shell running `npm run dev`, press Ctrl-C. Confirm the process exits cleanly.

---

## Task 6: Final cross-check against the acceptance criteria

**Files:** none.

- [ ] **Step 1: Walk through the spec's acceptance list and tick each box mentally**

The spec §5 lists six criteria. Re-verify each against the current behaviour (this is a paper checkpoint, not a re-test — only re-run dev if something is uncertain):

1. *Миниатюра workflow кликабельна, открывает экран просмотра.* — Task 2 + Task 4.
2. *Кнопка «Открыть workflow» удалена.* — Task 4 step 1.
3. *Шапка нередактируемого workflow визуально соответствует шапке редактируемого: тот же компонент CanvasHeader.* — Task 1 + Task 3.
4. *Кнопка «Назад» = крупная стрелка слева от заголовка (видна только в read-only).* — Task 1 step 4 (`size="icon-lg"`, `<ArrowLeft className="size-5" />`, gated on `isReadOnly && onBack`).
5. *Под заголовком в read-only — подпись «Просмотр workflow».* — Task 1 step 6.
6. *Pencil-edit названия доступен и в read-only.* — Pencil-edit lives on the title `<button>` (Task 1 leaves that block untouched), and `mode="read-only"` does not touch the edit flow, so renaming a launched campaign still dispatches `campaign_renamed`.

If any of the six is not actually behaving as expected, drop back to Task 5 / the relevant earlier task and fix before continuing.

- [ ] **Step 2: Confirm no `ReadOnlyWorkflowHeader` references remain**

```bash
grep -rn "ReadOnlyWorkflowHeader" src/
```

Expected: zero hits. The grep also surfaces any stale documentation or test references; clean those up if present (none expected in this codebase as of writing — the symbol was local to `workflow-section.tsx`).

- [ ] **Step 3: Confirm the «Открыть workflow» string is gone**

```bash
grep -rn "Открыть workflow" src/
```

Expected: zero hits.

- [ ] **Step 4: Final `npm test` + `npm run lint`**

```bash
npm test
npm run lint
```

Expected: both green.

- [ ] **Step 5: Summarise the branch state for the user**

Report back:

- Worktree path: `.worktrees/workflow-header-clickable-preview`
- Branch: `feature/workflow-header-clickable-preview`
- Commit count on the branch (`git log --oneline main..HEAD | wc -l` — expected 4 from Tasks 1-4, plus any hot-fixes from Task 5).
- Whether all six acceptance criteria are satisfied.
- Mention that worktree cleanup (`git worktree remove`, branch delete, PR/merge) is the user's call per AGENTS.md.
